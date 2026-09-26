// confetti.ts - Sıfır harici paket bağımlılıklı, hafif ve 60fps reaksiyon konfeti efekti

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  scale: number;
  rotation: number;
  rotationSpeed: number;
  color?: string;
  emoji?: string;
}

export function triggerReactionConfetti(emoji: string, clientX?: number, clientY?: number) {
  if (typeof window === "undefined") return;

  // Reduced motion kontrolü
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "99999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    document.body.removeChild(canvas);
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);

  const startX = clientX ?? window.innerWidth / 2;
  const startY = clientY ?? window.innerHeight / 2;

  const colors = ["#ec4899", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
  const particles: ConfettiParticle[] = [];
  const particleCount = 28;

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5);
    const speed = 3 + Math.random() * 6;
    const isEmojiParticle = i % 4 === 0;

    particles.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2.5,
      alpha: 1,
      scale: isEmojiParticle ? 16 + Math.random() * 8 : 4 + Math.random() * 4,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
      emoji: isEmojiParticle ? emoji : undefined,
    });
  }

  let animationFrameId: number;
  const startTime = performance.now();
  const maxDuration = 1000; // ms

  function animate(now: number) {
    const elapsed = now - startTime;
    if (elapsed > maxDuration) {
      if (canvas.parentNode) {
        document.body.removeChild(canvas);
      }
      return;
    }

    ctx?.clearRect(0, 0, window.innerWidth, window.innerHeight);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.18; // Yerçekimi
      p.vx *= 0.96; // Sürtünme
      p.rotation += p.rotationSpeed;
      p.alpha = Math.max(0, 1 - elapsed / maxDuration);

      if (!ctx) return;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.emoji) {
        ctx.font = `${p.scale}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.emoji, 0, 0);
      } else if (p.color) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.scale, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    animationFrameId = requestAnimationFrame(animate);
  }

  animationFrameId = requestAnimationFrame(animate);
}
