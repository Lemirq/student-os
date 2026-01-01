import sharp from "sharp";
import { readFileSync } from "fs";
import { join } from "path";

const svgBuffer = readFileSync(join(process.cwd(), "public", "icon.svg"));

// Generate 192x192 icon
sharp(svgBuffer)
  .resize(192, 192)
  .png()
  .toFile(join(process.cwd(), "public", "icon-192.png"))
  .then(() => console.log("✅ Generated icon-192.png"))
  .catch((err) => console.error("Error generating icon-192.png:", err));

// Generate 512x512 icon
sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile(join(process.cwd(), "public", "icon-512.png"))
  .then(() => console.log("✅ Generated icon-512.png"))
  .catch((err) => console.error("Error generating icon-512.png:", err));

// Generate 180x180 Apple touch icon
sharp(svgBuffer)
  .resize(180, 180)
  .png()
  .toFile(join(process.cwd(), "public", "apple-touch-icon.png"))
  .then(() => console.log("✅ Generated apple-touch-icon.png"))
  .catch((err) => console.error("Error generating apple-touch-icon.png:", err));
