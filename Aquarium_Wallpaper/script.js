const canvas = document.getElementById("aquarium");
const ctx = canvas.getContext("2d");

let width = 0;
let height = 0;
let bubbles = [];
let plankton = [];
let lastTime = 0;

const bubbleCount = 80;
const planktonCount = 120;

const createBubble = () => {
  const radius = 6 + Math.random() * 26;
  return {
    x: Math.random() * width,
    y: height + Math.random() * height,
    radius,
    speed: 18 + Math.random() * 50,
    drift: (Math.random() - 0.5) * 20,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.4 + Math.random() * 1.2,
    opacity: 0.25 + Math.random() * 0.45,
  };
};

const createPlankton = () => ({
  x: Math.random() * width,
  y: Math.random() * height,
  size: 1 + Math.random() * 2,
  speed: 6 + Math.random() * 16,
  alpha: 0.12 + Math.random() * 0.2,
});

const resize = () => {
  width = window.innerWidth;
  height = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  bubbles = Array.from({ length: bubbleCount }, createBubble);
  plankton = Array.from({ length: planktonCount }, createPlankton);
};

const drawBackground = () => {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#0c3e7c");
  gradient.addColorStop(0.45, "#072b56");
  gradient.addColorStop(1, "#041b33");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 6; i += 1) {
    const x = (width / 5) * i - 80;
    const beamGradient = ctx.createLinearGradient(x, 0, x + 240, height);
    beamGradient.addColorStop(0, "rgba(120, 210, 255, 0)");
    beamGradient.addColorStop(0.4, "rgba(120, 210, 255, 0.25)");
    beamGradient.addColorStop(1, "rgba(120, 210, 255, 0)");
    ctx.fillStyle = beamGradient;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 200, 0);
    ctx.lineTo(x + 340, height);
    ctx.lineTo(x - 120, height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  const floorGradient = ctx.createLinearGradient(0, height * 0.65, 0, height);
  floorGradient.addColorStop(0, "rgba(10, 34, 52, 0)");
  floorGradient.addColorStop(0.35, "#06253d");
  floorGradient.addColorStop(1, "#031624");
  ctx.fillStyle = floorGradient;
  ctx.fillRect(0, height * 0.65, width, height * 0.35);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(12, 55, 68, 0.8)";
  ctx.beginPath();
  ctx.moveTo(0, height * 0.78);
  ctx.quadraticCurveTo(width * 0.2, height * 0.68, width * 0.4, height * 0.8);
  ctx.quadraticCurveTo(width * 0.6, height * 0.92, width * 0.9, height * 0.84);
  ctx.quadraticCurveTo(width, height * 0.8, width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const drawPlankton = (delta) => {
  ctx.save();
  ctx.fillStyle = "rgba(200, 240, 255, 0.35)";
  plankton.forEach((particle) => {
    particle.y -= particle.speed * delta;
    particle.x += Math.sin((particle.y / 40) + particle.size) * 0.2;
    if (particle.y < -10) {
      particle.y = height + Math.random() * 40;
      particle.x = Math.random() * width;
    }
    ctx.globalAlpha = particle.alpha;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
};

const drawBubble = (bubble, delta) => {
  bubble.y -= bubble.speed * delta;
  bubble.wobble += bubble.wobbleSpeed * delta;
  bubble.x += Math.sin(bubble.wobble) * 0.3 + bubble.drift * delta;

  if (bubble.y < -bubble.radius * 2) {
    bubble.y = height + Math.random() * height * 0.4;
    bubble.x = Math.random() * width;
  }
  if (bubble.x < -bubble.radius * 2) {
    bubble.x = width + bubble.radius * 2;
  } else if (bubble.x > width + bubble.radius * 2) {
    bubble.x = -bubble.radius * 2;
  }

  const gradient = ctx.createRadialGradient(
    bubble.x - bubble.radius * 0.4,
    bubble.y - bubble.radius * 0.4,
    bubble.radius * 0.2,
    bubble.x,
    bubble.y,
    bubble.radius
  );
  gradient.addColorStop(0, `rgba(255, 255, 255, ${bubble.opacity})`);
  gradient.addColorStop(0.4, `rgba(150, 220, 255, ${bubble.opacity * 0.45})`);
  gradient.addColorStop(1, "rgba(120, 200, 255, 0)");

  ctx.strokeStyle = `rgba(210, 245, 255, ${bubble.opacity})`;
  ctx.lineWidth = Math.max(1.2, bubble.radius * 0.08);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(
    bubble.x,
    bubble.y,
    bubble.radius * 1.05,
    bubble.radius,
    Math.sin(bubble.wobble) * 0.08,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.globalAlpha = bubble.opacity * 0.8;
  ctx.beginPath();
  ctx.arc(
    bubble.x - bubble.radius * 0.35,
    bubble.y - bubble.radius * 0.3,
    bubble.radius * 0.2,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.fill();
  ctx.restore();
};

const animate = (time) => {
  const delta = Math.min((time - lastTime) / 1000, 0.033) || 0.016;
  lastTime = time;

  drawBackground();
  drawPlankton(delta);
  bubbles.forEach((bubble) => drawBubble(bubble, delta));

  requestAnimationFrame(animate);
};

resize();
window.addEventListener("resize", resize);
requestAnimationFrame(animate);
