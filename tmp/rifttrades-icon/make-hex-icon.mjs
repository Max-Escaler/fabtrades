import sharp from "sharp";
import { writeFileSync } from "fs";

const SIZE = 1024;
const BG = [0x8f, 0x41, 0x11];
const FG = [0xe8, 0xbd, 0x8b];
const CX = 512;
const CY = 512;
const R = 410.5;
const STROKE = 22;

const src = await sharp("apps/mobile/assets/icon/app_icon.png")
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { data: sd, info } = src;
const { width: sw, height: sh } = info;

function get(x, y) {
  const i = (y * sw + x) * 4;
  return [sd[i], sd[i + 1], sd[i + 2]];
}

function letterAlpha(x, y) {
  const [r, g, b] = get(x, y);
  if (r > 240 && g > 240 && b > 240) return 0;
  const bg = [143, 65, 17];
  const lt = [232, 189, 139];
  const vx = lt[0] - bg[0];
  const vy = lt[1] - bg[1];
  const vz = lt[2] - bg[2];
  const wx = r - bg[0];
  const wy = g - bg[1];
  const wz = b - bg[2];
  const denom = vx * vx + vy * vy + vz * vz;
  let t = (wx * vx + wy * vy + wz * vz) / denom;
  t = Math.max(0, Math.min(1, t));
  if (t < 0.25 || r < 160 || b > r) return 0;
  return Math.round(Math.min(1, (t - 0.25) / 0.75) * 255);
}

function isCoreLetter(x, y) {
  const [r, g, b] = get(x, y);
  return r > 200 && g > 150 && b > 100 && b < 180 && r - b > 40;
}

// Ignore squircle corner AA (tan-ish fringe against white) by insetting.
const inset = 80;
let minX = sw,
  minY = sh,
  maxX = 0,
  maxY = 0,
  count = 0;
for (let y = inset; y < sh - inset; y++) {
  for (let x = inset; x < sw - inset; x++) {
    if (!isCoreLetter(x, y)) continue;
    count++;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
}

console.log("letter bounds", {
  minX,
  minY,
  maxX,
  maxY,
  count,
  w: maxX - minX + 1,
  h: maxY - minY + 1,
});

const pad = 8;
const left = Math.max(0, minX - pad);
const top = Math.max(0, minY - pad);
const width = Math.min(sw, maxX + pad + 1) - left;
const height = Math.min(sh, maxY + pad + 1) - top;
const letterRgba = Buffer.alloc(width * height * 4);

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const a = letterAlpha(left + x, top + y);
    const i = (y * width + x) * 4;
    letterRgba[i] = FG[0];
    letterRgba[i + 1] = FG[1];
    letterRgba[i + 2] = FG[2];
    letterRgba[i + 3] = a;
  }
}

const lettersPng = await sharp(letterRgba, {
  raw: { width, height, channels: 4 },
})
  .png()
  .toBuffer();

await sharp(lettersPng).toFile("tmp/rifttrades-icon/ft_letters.png");

// Fit letters inside hexagon similarly to RiftTrades RT (≈540 wide)
const maxLetterW = 540;
const maxLetterH = 420;
const scale = Math.min(maxLetterW / width, maxLetterH / height);
const targetW = Math.round(width * scale);
const targetH = Math.round(height * scale);
console.log("scaled letter size", { targetW, targetH, scale });

const verts = [];
for (let i = 0; i < 6; i++) {
  const ang = -Math.PI / 2 + (i * Math.PI) / 3;
  verts.push([CX + R * Math.cos(ang), CY + R * Math.sin(ang)]);
}
const points = verts.map((p) => p.map((v) => v.toFixed(2)).join(",")).join(" ");

const svg = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="rgb(${BG.join(",")})"/>
  <polygon points="${points}" fill="none" stroke="rgb(${FG.join(",")})" stroke-width="${STROKE}" stroke-linejoin="round"/>
</svg>`;

writeFileSync("tmp/rifttrades-icon/fab_hex.svg", svg);

const base = await sharp(Buffer.from(svg)).png().toBuffer();
const lettersResized = await sharp(lettersPng)
  .resize(targetW, targetH, { fit: "fill" })
  .toBuffer();

const leftComp = Math.round((SIZE - targetW) / 2);
const topComp = Math.round((SIZE - targetH) / 2);

const outPath = "tmp/rifttrades-icon/fab_hex_v1.png";
await sharp(base)
  .composite([{ input: lettersResized, left: leftComp, top: topComp }])
  .png()
  .toFile(outPath);

console.log("wrote", outPath, { leftComp, topComp });
