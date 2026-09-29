const canvas = document.querySelector("#matrix-rain");

const COLORS = ["#36ba01", "#009a22", "#36ba01"];
const GLYPHS = [
  ..."0123456789",
  ..."ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ",
  "⌁",
  "⌗",
  "⌬",
  "⍉",
  "⎔",
  "⟊",
  "⟟",
  "⋮",
  "≜",
  "¤",
  "※",
  "╳",
];

const randomBetween = (min, max) => Math.random() * (max - min) + min;
const randomInt = (min, max) => Math.floor(randomBetween(min, max + 1));
const randomItem = (items) => items[Math.floor(Math.random() * items.length)];

let context;
let animationFrame;
let spawnTimer;
let activeClump;
let width = 0;
let height = 0;
let pixelRatio = 1;

function resize() {
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context = canvas.getContext("2d");
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function createClump(now) {
  const columnCount = randomInt(11, 17);
  const fontSize = randomInt(13, 17);
  const columnGap = fontSize * randomBetween(0.78, 0.96);
  const clumpWidth = columnCount * columnGap;
  const sidePadding = Math.min(56, width * 0.08);
  const availableWidth = Math.max(width - clumpWidth - sidePadding * 2, 0);
  const startX = sidePadding + Math.random() * availableWidth;
  const startY = randomBetween(height * 0.08, height * 0.68);

  return {
    bornAt: now,
    duration: randomBetween(3600, 5200),
    fontSize,
    columns: Array.from({ length: columnCount }, (_, index) => ({
      x: startX + index * columnGap,
      offset: randomBetween(-fontSize * 2, fontSize * 2),
      speed: randomBetween(27, 46),
      trailLength: randomInt(2, 7),
      opacity: randomBetween(0.5, 0.72),
      color: randomItem(COLORS),
      glyphs: Array.from({ length: 7 }, () => randomItem(GLYPHS)),
      lastShuffle: 0,
    })),
    startY,
  };
}

function smoothStep(value) {
  return value * value * (3 - 2 * value);
}

function drawClump(now) {
  if (!activeClump || !context) return false;

  const elapsed = now - activeClump.bornAt;
  const progress = elapsed / activeClump.duration;
  if (progress >= 1) return false;

  const fadeIn = smoothStep(Math.min(progress / 0.16, 1));
  const fadeOut = smoothStep(Math.min((1 - progress) / 0.28, 1));
  const clumpOpacity = Math.min(fadeIn, fadeOut);

  context.save();
  context.font = `${activeClump.fontSize}px "Share Tech Mono", monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.shadowColor = "#00ff2b";
  context.shadowBlur = 7;

  activeClump.columns.forEach((column) => {
    if (now - column.lastShuffle > randomBetween(90, 190)) {
      column.glyphs[randomInt(0, column.trailLength - 1)] = randomItem(GLYPHS);
      column.lastShuffle = now;
    }

    const headY =
      activeClump.startY + column.offset + (elapsed / 1000) * column.speed;

    for (let row = 0; row < column.trailLength; row += 1) {
      const trailStrength = 1 - row / (column.trailLength + 0.7);
      context.globalAlpha = column.opacity * clumpOpacity * trailStrength;
      context.fillStyle = column.color;
      context.fillText(
        column.glyphs[row],
        column.x,
        headY - row * activeClump.fontSize * 1.08,
      );
    }
  });

  context.restore();
  return true;
}

function animate(now) {
  context.clearRect(0, 0, width, height);

  if (drawClump(now)) {
    animationFrame = requestAnimationFrame(animate);
    return;
  }

  activeClump = null;
  animationFrame = null;
  canvas.dataset.state = "idle";
  scheduleNextClump();
}

function showClump() {
  if (document.hidden || activeClump) {
    scheduleNextClump();
    return;
  }

  const now = performance.now();
  activeClump = createClump(now);
  canvas.dataset.state = "active";
  animationFrame = requestAnimationFrame(animate);
}

function scheduleNextClump() {
  clearTimeout(spawnTimer);
  spawnTimer = setTimeout(showClump, randomBetween(12000, 24000));
}

function stop() {
  clearTimeout(spawnTimer);
  cancelAnimationFrame(animationFrame);
  activeClump = null;
  animationFrame = null;
  canvas.dataset.state = "idle";
  context?.clearRect(0, 0, width, height);
}

resize();
canvas.dataset.state = "idle";
window.addEventListener("resize", resize);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stop();
  else scheduleNextClump();
});

document.fonts?.ready.finally(scheduleNextClump) ?? scheduleNextClump();
