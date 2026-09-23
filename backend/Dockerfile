# ==========================================
# FISILTI - Go Backend Multi-Stage Dockerfile
# ==========================================

# 1. Aşama: Derleme (Builder)
FROM golang:1.23-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git ca-certificates tzdata

COPY go.mod ./
RUN go mod download || true

COPY . .

# Modül bağımlılıklarını eşitle ve statik Linux binary derle
RUN go mod tidy && \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o /app/server ./cmd/server

# 2. Aşama: Üretim Çalışma Zamanı (Production Runtime)
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata curl

WORKDIR /app

# Derlenen binary ve migration dosyalarını kopyala
COPY --from=builder /app/server /app/server
COPY --from=builder /app/internal/database/migrations /app/internal/database/migrations

ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/api/v1/health || exit 1

CMD ["/app/server"]
