const cv = document.getElementById("c"), ctx = cv.getContext("2d");
let width, height, dpr;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = innerWidth;
  height = innerHeight;
  cv.width = width * dpr;
  cv.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener("resize", resize);
resize();

const BLUE_SHADES = ["#3b82f6", "#60a5fa", "#93c5fd", "#2563eb", "#bfdbfe", "#1d4ed8"];
const pick = () => BLUE_SHADES[(Math.random() * BLUE_SHADES.length) | 0];
const HEART_COUNT = 4400;
const heart = [];

for (let i = 0; i < HEART_COUNT; i++) {
  const t = Math.random() * Math.PI * 2;
  // Distribute particles through the heart so it reads as full, not just an outline.
  const s = Math.sqrt(Math.random());
  const hx = 16 * Math.pow(Math.sin(t), 3);
  const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
  heart.push({
    x: hx * s,
    y: hy * s,
    z: (Math.random() - 0.5) * (3 + 11 * Math.sqrt(1 - s * s)),
    size: Math.random() * 1.1 + 0.6,
    color: pick(),
    phase: Math.random() * 6.28
  });
}

const burstParticles = [];
const MAX_BURST_PARTICLES = 10000;

function addBurstParticle(particle) {
  if (burstParticles.length < MAX_BURST_PARTICLES) burstParticles.push(particle);
}

class Particle {
  constructor(x, y) {
    this.color = pick();
    this.reset(x, y);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.px = x;
    this.py = y;
    this.maxLife = 65 + Math.random() * 35;
    this.life = this.maxLife;
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
    const speed = 2 + Math.random() * 4;
    this.vx = Math.cos(a) * speed;
    this.vy = Math.sin(a) * speed;
    this.size = 0.7 + Math.random() * 0.6;
  }

  update() {
    this.px = this.x;
    this.py = this.y;
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.997;
    this.vy *= 0.997;
    this.life--;
  }

  draw() {
    ctx.globalAlpha = Math.max(this.life / this.maxLife, 0);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function spawnHeartBurst(x, y, count = 260, power = 1, spread = 0) {
  for (let i = 0; i < count && burstParticles.length < MAX_BURST_PARTICLES; i++) {
    const a = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * spread;
    const p = new Particle(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
    p.vx *= power;
    p.vy *= power;
    addBurstParticle(p);
  }
}

function spawnScreenBurst(x, y, count) {
  for (let i = 0; i < count && burstParticles.length < MAX_BURST_PARTICLES; i++) {
    const p = new Particle(x, y);
    const travelTime = 8 + Math.random() * 8;
    const targetX = Math.random() * width;
    const targetY = Math.random() * height;
    p.maxLife = p.life = travelTime;
    p.vx = (targetX - x) / travelTime;
    p.vy = (targetY - y) / travelTime;
    addBurstParticle(p);
  }
}

let dragging = false;
let lastX = 0, lastY = 0, moved = 0;
let pitch = 0, lastTap = 0;
let angle = 0, idleAngle = 0, idlePhase = 0, lastFrameTime = 0, messageTimer;
const msg = document.getElementById("msg");

function heartUnit() {
  return Math.min(width * 0.98 / 32, height * 0.88 / 40);
}

function heartCenterX() { return width / 2; }
function heartCenterY() { return height / 2; }
const HEART_Y_CENTER = 2.6;

function projectHeartPoint(x, y, z = 0) {
  const rotation = angle + idleAngle;
  const cosA = Math.cos(rotation), sinA = Math.sin(rotation);
  const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
  const rotatedX = x * cosA - z * sinA;
  const rotatedZ = x * sinA + z * cosA;
  const centeredY = y - HEART_Y_CENTER;
  const rotatedY = centeredY * cosP - rotatedZ * sinP;
  const depth = centeredY * sinP + rotatedZ * cosP;
  const perspective = 180 / (180 + depth);
  return {
    x: heartCenterX() + rotatedX * heartUnit() * perspective,
    y: heartCenterY() + rotatedY * heartUnit() * perspective
  };
}

function heartTip() {
  return projectHeartPoint(0, 17, 0);
}

function holeCenter() {
  return projectHeartPoint(0, 11, 0);
}

function hitHeart(px, py) {
  return Math.hypot(px - heartCenterX(), py - heartCenterY()) < 20 * heartUnit();
}

function showMessage() {
  if (msg.classList.contains("show")) return;
  clearTimeout(messageTimer);

  const burst = (count) => {
    const origin = holeCenter();
    spawnScreenBurst(origin.x, origin.y, count);
  };
  burst(4000);
  setTimeout(() => burst(3000), 90);
  setTimeout(() => burst(3000), 180);

  messageTimer = setTimeout(() => {
    msg.classList.add("show");
  }, 3000);
}

let messageTouchStartX = 0, messageTouchStartY = 0;
msg.addEventListener("pointerdown", e => {
  e.stopPropagation();
  messageTouchStartX = e.clientX;
  messageTouchStartY = e.clientY;
});
msg.addEventListener("pointerup", e => {
  e.stopPropagation();
  const distance = Math.hypot(e.clientX - messageTouchStartX, e.clientY - messageTouchStartY);
  if (distance < 10) msg.classList.remove("show");
});

addEventListener("pointerdown", e => {
  if (msg.classList.contains("show")) return;
  const onHeart = hitHeart(e.clientX, e.clientY);
  dragging = onHeart;
  lastX = e.clientX;
  lastY = e.clientY;
  moved = 0;
});

addEventListener("pointermove", e => {
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  moved += Math.abs(dx) + Math.abs(dy);
  if (!dragging) return;
  angle -= dx * 0.008;
  pitch += dy * 0.008;
});

function endDrag() {
  if (dragging) dragging = false;
  if (msg.classList.contains("show")) return;
  if (moved < 14) {
    const now = performance.now();
    if (lastTap && now - lastTap < 450) {
      showMessage();
      lastTap = 0;
    } else {
      lastTap = now;
    }
  } else {
    lastTap = 0;
  }
}

addEventListener("pointerup", endDrag);
addEventListener("pointercancel", endDrag);

function frame(time) {
  const delta = lastFrameTime ? Math.min(time - lastFrameTime, 32) : 16;
  lastFrameTime = time;
  if (!dragging) {
    idlePhase += delta * 0.001;
    idleAngle = Math.sin(idlePhase) * 0.7;
  }

  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  const cx = heartCenterX(), cy = heartCenterY();
  const unit = heartUnit();
  const hole = holeCenter();
  const holeRadius = Math.min(unit * 18, width * 0.49);
  const holeHeight = unit * 5.5;

  // Diffuse dark-to-blue glow with no bright rim, so the hole blends into space.
  ctx.save();
  ctx.translate(hole.x, hole.y);
  ctx.scale(1, holeHeight / holeRadius);
  const holeGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, holeRadius);
  holeGradient.addColorStop(0, "rgba(0,0,2,1)");
  holeGradient.addColorStop(0.4, "rgba(0,1,6,0.99)");
  holeGradient.addColorStop(0.62, "rgba(2,5,16,0.96)");
  holeGradient.addColorStop(0.78, "rgba(8,16,38,0.82)");
  holeGradient.addColorStop(0.91, "rgba(35,57,96,0.42)");
  holeGradient.addColorStop(1, "rgba(75,105,155,0)");
  ctx.fillStyle = holeGradient;
  ctx.beginPath();
  ctx.arc(0, 0, holeRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.globalCompositeOperation = "lighter";
  for (let i = burstParticles.length - 1; i >= 0; i--) {
    const particle = burstParticles[i];
    particle.update();
    particle.draw();
    if (particle.life <= 0) {
      burstParticles[i] = burstParticles[burstParticles.length - 1];
      burstParticles.pop();
    }
  }

  ctx.globalCompositeOperation = "source-over";
  const rotation = angle + idleAngle;
  const cosA = Math.cos(rotation), sinA = Math.sin(rotation);
  const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
  for (const point of heart) {
    const x = point.x * cosA - point.z * sinA;
    const z = point.x * sinA + point.z * cosA;
    const centeredY = point.y - HEART_Y_CENTER;
    const y = centeredY * cosP - z * sinP;
    const depth = centeredY * sinP + z * cosP;
    const perspective = 180 / (180 + depth);
    const shimmer = 0.65 + Math.sin(time / 350 + point.phase) * 0.25;
    ctx.globalAlpha = shimmer;
    ctx.fillStyle = point.color;
    ctx.beginPath();
    ctx.arc(cx + x * unit * perspective, cy + y * unit * perspective,
      Math.max(0.6, point.size * perspective), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
