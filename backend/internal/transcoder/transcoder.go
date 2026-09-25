package transcoder

import (
	"bytes"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"

	"github.com/google/uuid"
)

// IsAvailable sistemde ffmpeg binary'sinin bulunup bulunmadığını kontrol eder.
func IsAvailable() bool {
	_, err := exec.LookPath("ffmpeg")
	return err == nil
}

// LogStatus FFmpeg sistem durumunu loglar.
func LogStatus() {
	if IsAvailable() {
		log.Println("🎬 [Transcoder] FFmpeg sistemi hazır ve aktif.")
	} else {
		log.Println("⚠️ [Transcoder] FFmpeg sistemde bulunamadı, medya dönüştürme devre dışı.")
	}
}

// ConvertAudioToMP3 gelen herhangi bir ses dosyasını (WebM Opus, OGG, WAV, M4A vb.)
// iOS ve Android dahil tüm tarayıcılarla %100 uyumlu standart MP3 formatına dönüştürür.
// Her işlem için benzersiz UUID temp dosyası kullanılır, race condition oluşmaz.
func ConvertAudioToMP3(inputPath string) (string, float64, error) {
	if !IsAvailable() {
		return "", 0, fmt.Errorf("ffmpeg sistemde yüklü değil")
	}

	outputPath := filepath.Join(os.TempDir(), fmt.Sprintf("aura_audio_%s.mp3", uuid.New().String()))

	// -y: Üzerine yaz, -i: Girdi, -vn: Video yok, -acodec libmp3lame: MP3 codec,
	// -b:a 128k: 128kbps ses kalitesi, -ar 44100: 44.1kHz, -ac 2: Stereo
	cmd := exec.Command("ffmpeg",
		"-y",
		"-i", inputPath,
		"-vn",
		"-acodec", "libmp3lame",
		"-b:a", "128k",
		"-ar", "44100",
		"-ac", "2",
		outputPath,
	)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		_ = os.Remove(outputPath)
		return "", 0, fmt.Errorf("ses mp3 formatına dönüştürülemedi: %w (stderr: %s)", err, stderr.String())
	}

	// ffmpeg stderr çıktısından süre bilgisini çıkar
	duration := extractDurationFromStderr(stderr.String())

	return outputPath, duration, nil
}

// ConvertVideoToUniversalMP4 gelen videoyu (WebM, MOV, AVI, MKV vb.)
// iOS WebKit ve Android Chrome'un sorunsuz oynatabileceği H.264 Baseline + AAC MP4 formatına dönüştürür.
// -movflags +faststart ile 'moov' atomu dosyanın başına alınır (iOS anında akış için zorunludur).
// Eşzamanlı işlemlerde çakışma olmaması için benzersiz UUID temp dosyası kullanılır.
func ConvertVideoToUniversalMP4(inputPath string) (string, error) {
	if !IsAvailable() {
		return "", fmt.Errorf("ffmpeg sistemde yüklü değil")
	}

	outputPath := filepath.Join(os.TempDir(), fmt.Sprintf("aura_video_%s.mp4", uuid.New().String()))

	// Eğer dosya zaten mp4 ise ve sadece streamable (faststart) yapılması gerekiyorsa
	// önce hızlı remuxing dene:
	remuxCmd := exec.Command("ffmpeg",
		"-y",
		"-i", inputPath,
		"-c", "copy",
		"-movflags", "+faststart",
		outputPath,
	)
	if err := remuxCmd.Run(); err == nil {
		// Başarılı remuxing, video zaten uyumlu
		return outputPath, nil
	}

	// Tam transcode: H.264 Baseline + yuv420p (iOS WebKit zorunluluğu) + AAC
	cmd := exec.Command("ffmpeg",
		"-y",
		"-i", inputPath,
		"-c:v", "libx264",
		"-profile:v", "baseline",
		"-level", "3.0",
		"-pix_fmt", "yuv420p",
		"-preset", "fast",
		"-crf", "23",
		"-c:a", "aac",
		"-b:a", "128k",
		"-ar", "44100",
		"-ac", "2",
		"-movflags", "+faststart",
		outputPath,
	)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		_ = os.Remove(outputPath)
		return "", fmt.Errorf("video evrensel mp4 formatına dönüştürülemedi: %w (stderr: %s)", err, stderr.String())
	}

	return outputPath, nil
}

// ConvertImageToJPEG iOS HEIC/HEIF veya desteklenmeyen formatları evrensel JPEG'e çevirir.
func ConvertImageToJPEG(inputPath string) (string, error) {
	if !IsAvailable() {
		return "", fmt.Errorf("ffmpeg sistemde yüklü değil")
	}

	outputPath := filepath.Join(os.TempDir(), fmt.Sprintf("aura_img_%s.jpg", uuid.New().String()))

	cmd := exec.Command("ffmpeg",
		"-y",
		"-i", inputPath,
		"-frames:v", "1",
		"-q:v", "2",
		outputPath,
	)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		_ = os.Remove(outputPath)
		return "", fmt.Errorf("görsel jpeg formatına dönüştürülemedi: %w (stderr: %s)", err, stderr.String())
	}

	return outputPath, nil
}

// extractDurationFromStderr ffmpeg stderr çıktısındaki Duration: HH:MM:SS.ms bilgisini saniyeye çevirir.
func extractDurationFromStderr(stderr string) float64 {
	re := regexp.MustCompile(`Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)`)
	matches := re.FindStringSubmatch(stderr)
	if len(matches) < 4 {
		return 0
	}

	hours, _ := strconv.ParseFloat(matches[1], 64)
	minutes, _ := strconv.ParseFloat(matches[2], 64)
	seconds, _ := strconv.ParseFloat(matches[3], 64)

	return (hours * 3600) + (minutes * 60) + seconds
}
