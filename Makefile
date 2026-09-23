.PHONY: dev build down logs ps clean

# Yerel ortamı başlatır
dev:
	docker compose up -d

# İmajları yeniden derleyip başlatır
build:
	docker compose up -d --build

# Tüm konteynerleri durdurur
down:
	docker compose down

# Logları canlı takip eder
logs:
	docker compose logs -f

# Çalışan servislerin durumunu gösterir
ps:
	docker compose ps

# Tüm volume ve container verilerini temizler
clean:
	docker compose down -v
