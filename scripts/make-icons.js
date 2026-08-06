'use strict';

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const CRC_TABLE = (function () {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let p = 0;
  for (let y = 0; y < height; y++) {
    raw[p++] = 0; // filter type: none
    for (let x = 0; x < width * 4; x++) {
      raw[p++] = rgba[y * width * 4 + x];
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const GLYPH = [
  '.###.',
  '...#.',
  '...#.',
  '..##.',
  '...#.',
  '...#.',
  '.###.'
];

function insideRoundedRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const qx = Math.max(x0 + r - x, 0, x - (x1 - r));
  const qy = Math.max(y0 + r - y, 0, y - (y1 - r));
  return qx * qx + qy * qy <= r * r;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function renderIcon(size) {
  const rgba = new Uint8Array(size * size * 4);
  const inset = Math.max(1, Math.round(size * 0.015));
  const x0 = inset;
  const y0 = inset;
  const x1 = size - inset;
  const y1 = size - inset;
  const radius = size * 0.22;

  const scale = Math.max(1, Math.round(size * 0.0625));
  const ox = Math.round((size - scale * 5) / 2);
  const oy = Math.round((size - scale * 7) / 2);

  const cells = [];
  for (let gy = 0; gy < 7; gy++) {
    for (let gx = 0; gx < 5; gx++) {
      if (GLYPH[gy][gx] === '.') continue;
      cells.push({
        x0: ox + gx * scale,
        y0: oy + gy * scale,
        x1: ox + (gx + 1) * scale,
        y1: oy + (gy + 1) * scale,
        r: scale * 0.25
      });
    }
  }

  function insideGlyph(px, py) {
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (insideRoundedRect(px, py, c.x0, c.y0, c.x1, c.y1, c.r)) return true;
    }
    return false;
  }

  const SS = 3;
  const n = SS * SS;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let aR = 0;
      let aG = 0;
      let aB = 0;
      let aA = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          if (!insideRoundedRect(px, py, x0, y0, x1, y1, radius)) continue;
          let cr;
          let cg;
          let cb;
          if (insideGlyph(px, py)) {
            cr = 255;
            cg = 255;
            cb = 255;
          } else {
            const t = (py - y0) / (y1 - y0);
            cr = Math.round(lerp(48, 26, t));
            cg = Math.round(lerp(54, 29, t));
            cb = Math.round(lerp(92, 50, t));
          }
          aR += cr;
          aG += cg;
          aB += cb;
          aA += 255;
        }
      }
      const idx = (y * size + x) * 4;
      if (aA > 0) {
        rgba[idx] = Math.round(aR / n);
        rgba[idx + 1] = Math.round(aG / n);
        rgba[idx + 2] = Math.round(aB / n);
        rgba[idx + 3] = Math.round(aA / n);
      } else {
        rgba[idx + 3] = 0;
      }
    }
  }
  return rgba;
}

const outDir = path.join(__dirname, '..', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

[512, 192, 180].forEach(function (size) {
  const rgba = renderIcon(size);
  const png = encodePNG(size, size, rgba);
  const file = path.join(outDir, 'icon-' + size + '.png');
  fs.writeFileSync(file, png);
  console.log('wrote ' + file + ' (' + png.length + ' bytes)');
});
