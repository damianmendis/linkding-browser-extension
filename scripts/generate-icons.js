/**
 * Generate simple placeholder icons as PNG files using Canvas API in Node.
 * Usage: node scripts/generate-icons.js
 * Requires: npm install canvas (if not available, icons can be supplied manually)
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];
const outDir = path.join(__dirname, '../public/assets');
fs.mkdirSync(outDir, { recursive: true });

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#2563eb';
  const r = size * 0.15;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  // Bookmark icon (simplified)
  ctx.fillStyle = '#ffffff';
  const bx = size * 0.25;
  const by = size * 0.18;
  const bw = size * 0.5;
  const bh = size * 0.66;
  const notchH = size * 0.18;

  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + bw, by);
  ctx.lineTo(bx + bw, by + bh);
  ctx.lineTo(bx + bw / 2, by + bh - notchH);
  ctx.lineTo(bx, by + bh);
  ctx.closePath();
  ctx.fill();

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), buffer);
  console.log(`Generated icon-${size}.png`);
}
