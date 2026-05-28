#!/usr/bin/env node
// Generates PWA icons using pure Node.js (no deps required)
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

function crc32(buf) {
  if (!crc32.table) {
    crc32.table = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crc32.table[i] = c
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = crc32.table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])))
  return Buffer.concat([len, typeBytes, data, crcBuf])
}

function createIcon(size) {
  // Colors
  const BG = [9, 9, 11]        // zinc-950 #09090b
  const FG = [250, 250, 250]   // white-ish

  // Draw pixel-by-pixel
  const pixels = Buffer.alloc(size * size * 3)
  const cx = size / 2
  const cy = size / 2
  const outerR = size * 0.40
  const strokeW = size * 0.045
  const dotR = size * 0.065
  const spacing = size * 0.22

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let [r, g, b] = BG
      const dx = x - cx, dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      // Outer ring
      if (Math.abs(dist - outerR) <= strokeW) {
        ;[r, g, b] = FG
      }

      // Three dots in a row
      const dots = [cx - spacing, cx, cx + spacing]
      for (const dotX of dots) {
        const ddx = x - dotX, ddy = y - cy
        if (Math.sqrt(ddx * ddx + ddy * ddy) <= dotR) {
          ;[r, g, b] = FG
        }
      }

      const off = (y * size + x) * 3
      pixels[off] = r
      pixels[off + 1] = g
      pixels[off + 2] = b
    }
  }

  // Build PNG raw data (filter byte 0 = None per row)
  const rowBytes = 1 + size * 3
  const raw = Buffer.alloc(rowBytes * size)
  for (let y = 0; y < size; y++) {
    raw[y * rowBytes] = 0
    pixels.copy(raw, y * rowBytes + 1, y * size * 3, (y + 1) * size * 3)
  }

  const compressed = zlib.deflateSync(raw, { level: 9 })

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))])
}

const publicDir = path.resolve(__dirname, '..', 'public')
fs.mkdirSync(publicDir, { recursive: true })

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), createIcon(192))
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), createIcon(512))
console.log('✓ Icons generated: icon-192.png, icon-512.png')
