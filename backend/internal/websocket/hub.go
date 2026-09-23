package websocket

import (
	"context"
	"log"
	"sync"
	"time"

	"fisilti/internal/database"
	fisiltiredis "fisilti/internal/redis"
	"github.com/google/uuid"
)

type Hub struct {
	clients         map[*Client]bool
	userClients     map[uuid.UUID]map[*Client]bool
	register        chan *Client
	unregister      chan *Client
	broadcast       chan []byte
	mu              sync.RWMutex
	chatRepo        *database.ChatRepository
	userRepo        *database.UserRepository
	presenceService *fisiltiredis.PresenceService
	typingService   *fisiltiredis.TypingService
}

func NewHub(
	chatRepo *database.ChatRepository,
	userRepo *database.UserRepository,
	presenceService *fisiltiredis.PresenceService,
	typingService *fisiltiredis.TypingService,
) *Hub {
	return &Hub{
		clients:         make(map[*Client]bool),
		userClients:     make(map[uuid.UUID]map[*Client]bool),
		register:        make(chan *Client),
		unregister:      make(chan *Client),
		broadcast:       make(chan []byte),
		chatRepo:        chatRepo,
		userRepo:        userRepo,
		presenceService: presenceService,
		typingService:   typingService,
	}
}

func (h *Hub) RegisterClient(client *Client) {
	h.register <- client
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			if _, ok := h.userClients[client.userID]; !ok {
				h.userClients[client.userID] = make(map[*Client]bool)
			}
			isFirstConn := len(h.userClients[client.userID]) == 0
			h.userClients[client.userID][client] = true
			h.mu.Unlock()

			if isFirstConn {
				h.onUserOnline(client.userID)
			}

			// Kullanıcı bağlandığında, henüz teslim edilmemiş bekleyen mesajları ilet
			go h.deliverPendingMessages(client.userID)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			isLastConn := false
			if clients, ok := h.userClients[client.userID]; ok {
				delete(clients, client)
				if len(clients) == 0 {
					delete(h.userClients, client.userID)
					isLastConn = true
				}
			}
			h.mu.Unlock()

			if isLastConn {
				h.onUserOffline(client.userID)
			}

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) onUserOnline(userID uuid.UUID) {
	ctx := context.Background()
	_ = h.presenceService.SetUserOnline(ctx, userID)
	_ = h.userRepo.UpdateOnlineStatus(ctx, userID, 1)

	payload, _ := NewWSMessage("presence_update", PresenceUpdatePayload{
		UserID:     userID,
		Status:     1,
		LastSeenAt: time.Now(),
	})
	h.BroadcastToAll(payload)
	log.Printf("🟢 [Online] Kullanıcı bağlandı: %s", userID)
}

func (h *Hub) onUserOffline(userID uuid.UUID) {
	ctx := context.Background()
	_ = h.presenceService.SetUserOffline(ctx, userID)
	_ = h.userRepo.UpdateOnlineStatus(ctx, userID, 0)

	payload, _ := NewWSMessage("presence_update", PresenceUpdatePayload{
		UserID:     userID,
		Status:     0,
		LastSeenAt: time.Now(),
	})
	h.BroadcastToAll(payload)
	log.Printf("🔴 [Offline] Kullanıcı ayrıldı: %s", userID)
}

func (h *Hub) deliverPendingMessages(recipientID uuid.UUID) {
	ctx := context.Background()
	pending, err := h.chatRepo.GetUndeliveredMessagesForUser(ctx, recipientID)
	if err != nil || len(pending) == 0 {
		return
	}

	var messageIDs []uuid.UUID
	for _, m := range pending {
		messageIDs = append(messageIDs, m.ID)
		// Alıcının soketine mesajı push et
		msgPayload, _ := NewWSMessage("new_message", m.ToResponse(recipientID))
		h.SendToUser(recipientID, msgPayload)
	}

	// Teslim edildi olarak DB'de güncelle
	updatedIDs, deliveredAt, _ := h.chatRepo.MarkMessagesAsDelivered(ctx, recipientID, messageIDs)
	if len(updatedIDs) > 0 {
		deliveredPayload, _ := NewWSMessage("message_delivered", MessageDeliveredPayload{
			MessageIDs:  updatedIDs,
			DeliveredAt: deliveredAt,
		})
		h.BroadcastToActiveSenders(updatedIDs, deliveredPayload)
	}
}

func (h *Hub) SendToUser(userID uuid.UUID, message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if clients, ok := h.userClients[userID]; ok {
		for client := range clients {
			select {
			case client.send <- message:
			default:
			}
		}
	}
}

func (h *Hub) IsUserConnected(userID uuid.UUID) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.userClients[userID]) > 0
}

func (h *Hub) BroadcastToAll(message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for client := range h.clients {
		select {
		case client.send <- message:
		default:
		}
	}
}

func (h *Hub) BroadcastToActiveSenders(messageIDs []uuid.UUID, payload []byte) {
	// Teslim edilen mesajların gönderenlerine Çift Gri Tik basmak için
	h.BroadcastToAll(payload)
}
