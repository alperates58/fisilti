package preview

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

type LinkMetadata struct {
	URL         string `json:"url"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Image       string `json:"image"`
	SiteName    string `json:"site_name"`
}

type PreviewService struct {
	rdb    *redis.Client
	client *http.Client
}

func NewPreviewService(rdb *redis.Client) *PreviewService {
	return &PreviewService{
		rdb: rdb,
		client: &http.Client{
			Timeout: 4 * time.Second,
		},
	}
}

var (
	titleTagRegex       = regexp.MustCompile(`(?i)<title[^>]*>(.*?)</title>`)
	ogTitleRegex        = regexp.MustCompile(`(?i)<meta\s+[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']|<meta\s+[^>]*content=["']([^"']*)["'][^>]*property=["']og:title["']`)
	ogDescRegex         = regexp.MustCompile(`(?i)<meta\s+[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']|<meta\s+[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["']`)
	metaDescRegex       = regexp.MustCompile(`(?i)<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["']|<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["']`)
	ogImageRegex        = regexp.MustCompile(`(?i)<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']|<meta\s+[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["']`)
	ogSiteNameRegex     = regexp.MustCompile(`(?i)<meta\s+[^>]*property=["']og:site_name["'][^>]*content=["']([^"']*)["']|<meta\s+[^>]*content=["']([^"']*)["'][^>]*property=["']og:site_name["']`)
)

func (s *PreviewService) GetLinkPreview(ctx context.Context, rawURL string) (*LinkMetadata, error) {
	parsedURL, err := url.Parse(rawURL)
	if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
		return nil, fmt.Errorf("gecersiz url: %s", rawURL)
	}

	// 1. Redis Önbellek Kontrolü
	urlHash := hashURL(rawURL)
	cacheKey := fmt.Sprintf("preview:%s", urlHash)
	if s.rdb != nil {
		cachedData, err := s.rdb.Get(ctx, cacheKey).Result()
		if err == nil && cachedData != "" {
			var meta LinkMetadata
			if json.Unmarshal([]byte(cachedData), &meta) == nil {
				return &meta, nil
			}
		}
	}

	// 2. HTTP İsteği Yap (HTML'in ilk 512KB'ını oku)
	req, err := http.NewRequestWithContext(ctx, "GET", rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; FisiltiBot/1.0)")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 400 {
		return nil, fmt.Errorf("sunucu hatasi: %d", resp.StatusCode)
	}

	// Yalnızca ilk 512KB'ı belleğe al (bellek şişmesini önle)
	bodyBytes, err := io.ReadAll(io.LimitReader(resp.Body, 512*1024))
	if err != nil {
		return nil, err
	}
	bodyStr := string(bodyBytes)

	meta := &LinkMetadata{
		URL:      rawURL,
		SiteName: parsedURL.Hostname(),
	}

	// Başlık Çıkar
	if matches := ogTitleRegex.FindStringSubmatch(bodyStr); len(matches) > 1 {
		meta.Title = cleanMeta(matches[1])
		if meta.Title == "" && len(matches) > 2 {
			meta.Title = cleanMeta(matches[2])
		}
	}
	if meta.Title == "" {
		if matches := titleTagRegex.FindStringSubmatch(bodyStr); len(matches) > 1 {
			meta.Title = cleanMeta(matches[1])
		}
	}

	// Açıklama Çıkar
	if matches := ogDescRegex.FindStringSubmatch(bodyStr); len(matches) > 1 {
		meta.Description = cleanMeta(matches[1])
		if meta.Description == "" && len(matches) > 2 {
			meta.Description = cleanMeta(matches[2])
		}
	}
	if meta.Description == "" {
		if matches := metaDescRegex.FindStringSubmatch(bodyStr); len(matches) > 1 {
			meta.Description = cleanMeta(matches[1])
			if meta.Description == "" && len(matches) > 2 {
				meta.Description = cleanMeta(matches[2])
			}
		}
	}

	// Görsel Çıkar
	if matches := ogImageRegex.FindStringSubmatch(bodyStr); len(matches) > 1 {
		img := cleanMeta(matches[1])
		if img == "" && len(matches) > 2 {
			img = cleanMeta(matches[2])
		}
		if img != "" {
			meta.Image = resolveURL(parsedURL, img)
		}
	}

	// Site Adı Çıkar
	if matches := ogSiteNameRegex.FindStringSubmatch(bodyStr); len(matches) > 1 {
		name := cleanMeta(matches[1])
		if name == "" && len(matches) > 2 {
			name = cleanMeta(matches[2])
		}
		if name != "" {
			meta.SiteName = name
		}
	}

	if meta.Title == "" && meta.Description == "" {
		return nil, fmt.Errorf("metadata bulunamadi")
	}

	// 3. Redis'e 24 saatliğine kaydet
	if s.rdb != nil {
		if data, err := json.Marshal(meta); err == nil {
			_ = s.rdb.Set(ctx, cacheKey, string(data), 24*time.Hour).Err()
		}
	}

	return meta, nil
}

func hashURL(u string) string {
	h := sha256.Sum256([]byte(u))
	return hex.EncodeToString(h[:])
}

func cleanMeta(s string) string {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, "\n", " ")
	s = strings.ReplaceAll(s, "\r", " ")
	for strings.Contains(s, "  ") {
		s = strings.ReplaceAll(s, "  ", " ")
	}
	return s
}

func resolveURL(base *url.URL, target string) string {
	targetURL, err := url.Parse(target)
	if err != nil {
		return target
	}
	return base.ResolveReference(targetURL).String()
}
