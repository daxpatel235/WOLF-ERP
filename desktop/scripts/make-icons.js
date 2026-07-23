// Generates every icon asset the Windows bundle needs, from one 1024px source.
//
// Written by hand rather than shelling out to `tauri icon` because this machine's
// Application Control policy blocks the CLI's prebuilt native binding. sharp
// (already present via Next) handles the raster work; the ICO and BMP containers
// are assembled here, since sharp writes neither format.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "assets", "app-icon.png");
const ICON_DIR = path.join(ROOT, "src-tauri", "icons");
const INSTALLER_DIR = path.join(ROOT, "src-tauri", "installer");

// sharp lives in the copied app's dependency tree.
const sharp = require(path.join(ROOT, "app", "node_modules", "sharp"));

// Square PNGs Tauri references plus the Store/tile sizes it also emits.
const PNG_SIZES = [
  ["32x32.png", 32],
  ["128x128.png", 128],
  ["128x128@2x.png", 256],
  ["icon.png", 512],
  ["Square30x30Logo.png", 30],
  ["Square44x44Logo.png", 44],
  ["Square71x71Logo.png", 71],
  ["Square89x89Logo.png", 89],
  ["Square107x107Logo.png", 107],
  ["Square142x142Logo.png", 142],
  ["Square150x150Logo.png", 150],
  ["Square284x284Logo.png", 284],
  ["Square310x310Logo.png", 310],
  ["StoreLogo.png", 50],
];

// Windows reads PNG-compressed frames inside an ICO (Vista+), so the container
// is just a header, one directory entry per frame, then the PNG bytes.
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(count, 4);

  const entries = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;

  pngBuffers.forEach(({ size, buf }, i) => {
    const e = i * 16;
    // 256 is stored as 0 — the field is a single byte.
    entries.writeUInt8(size >= 256 ? 0 : size, e + 0); // width
    entries.writeUInt8(size >= 256 ? 0 : size, e + 1); // height
    entries.writeUInt8(0, e + 2); // palette count
    entries.writeUInt8(0, e + 3); // reserved
    entries.writeUInt16LE(1, e + 4); // colour planes
    entries.writeUInt16LE(32, e + 6); // bits per pixel
    entries.writeUInt32LE(buf.length, e + 8);
    entries.writeUInt32LE(offset, e + 12);
    offset += buf.length;
  });

  return Buffer.concat([header, entries, ...pngBuffers.map((p) => p.buf)]);
}

// 24-bit uncompressed BMP, bottom-up with each row padded to 4 bytes — the only
// format the NSIS MUI reliably accepts for its header/sidebar bitmaps.
function buildBmp(rgbaBuffer, width, height) {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelBytes = rowSize * height;
  const fileHeader = Buffer.alloc(14);
  const infoHeader = Buffer.alloc(40);

  fileHeader.write("BM", 0);
  fileHeader.writeUInt32LE(14 + 40 + pixelBytes, 2);
  fileHeader.writeUInt32LE(14 + 40, 10);

  infoHeader.writeUInt32LE(40, 0);
  infoHeader.writeInt32LE(width, 4);
  infoHeader.writeInt32LE(height, 8);
  infoHeader.writeUInt16LE(1, 12);
  infoHeader.writeUInt16LE(24, 14);
  infoHeader.writeUInt32LE(0, 16); // BI_RGB
  infoHeader.writeUInt32LE(pixelBytes, 20);

  const pixels = Buffer.alloc(pixelBytes);
  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y; // BMP rows run bottom-up
    for (let x = 0; x < width; x++) {
      const s = (srcY * width + x) * 4;
      const d = y * rowSize + x * 3;
      pixels[d] = rgbaBuffer[s + 2]; // B
      pixels[d + 1] = rgbaBuffer[s + 1]; // G
      pixels[d + 2] = rgbaBuffer[s]; // R
    }
  }

  return Buffer.concat([fileHeader, infoHeader, pixels]);
}

async function main() {
  if (!fs.existsSync(SRC)) throw new Error(`Missing source icon: ${SRC}`);
  fs.mkdirSync(ICON_DIR, { recursive: true });
  fs.mkdirSync(INSTALLER_DIR, { recursive: true });

  // ---- PNG set ----
  for (const [name, size] of PNG_SIZES) {
    await sharp(SRC).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(ICON_DIR, name));
  }
  console.log(`✓ ${PNG_SIZES.length} PNG icons`);

  // ---- ICO ----
  const frames = [];
  for (const size of ICO_SIZES) {
    const buf = await sharp(SRC)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    frames.push({ size, buf });
  }
  fs.writeFileSync(path.join(ICON_DIR, "icon.ico"), buildIco(frames));
  console.log(`✓ icon.ico (${ICO_SIZES.join(", ")})`);

  // Tauri's config lists an .icns; macOS isn't a target here, but the bundler
  // still wants the file to resolve. A 512px PNG under that name satisfies it.
  await sharp(SRC).resize(512, 512).png().toFile(path.join(ICON_DIR, "icon.icns"));

  // ---- NSIS installer artwork (slate panel + centred logo) ----
  const slate = { r: 15, g: 23, b: 42, alpha: 1 };

  const header = await sharp({
    create: { width: 150, height: 57, channels: 4, background: slate },
  })
    .composite([
      {
        input: await sharp(SRC).resize(44, 44).png().toBuffer(),
        top: 6,
        left: 8,
      },
    ])
    .raw()
    .toBuffer();
  fs.writeFileSync(path.join(INSTALLER_DIR, "header.bmp"), buildBmp(header, 150, 57));

  const sidebar = await sharp({
    create: { width: 164, height: 314, channels: 4, background: slate },
  })
    .composite([
      {
        input: await sharp(SRC).resize(96, 96).png().toBuffer(),
        top: 40,
        left: 34,
      },
    ])
    .raw()
    .toBuffer();
  fs.writeFileSync(path.join(INSTALLER_DIR, "sidebar.bmp"), buildBmp(sidebar, 164, 314));

  console.log("✓ NSIS header.bmp + sidebar.bmp");
}

main().catch((e) => {
  console.error("Icon generation failed:", e.message);
  process.exit(1);
});
