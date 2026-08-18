#!/usr/bin/env node
// Raster factory-map.pdf to PNG/WebP for FactoryOverview
// Tries mutool (mupdf-tools) first, falls back to pdfjs + @napi-rs/canvas if available
import { existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public', 'factory');
const pdfPath = join(publicDir, 'factory-map.pdf');
const pngPath = join(publicDir, 'factory-map.png');
const png2xPath = join(publicDir, 'factory-map@2x.png');
const webpPath = join(publicDir, 'factory-map.webp');

if (!existsSync(pdfPath)) {
  console.log('[raster] factory-map.pdf not found, skipping');
  process.exit(0);
}

mkdirSync(publicDir, { recursive: true });

function tryMutool() {
  try {
    execSync('which mutool', { stdio: 'ignore' });
  } catch {
    return false;
  }
  try {
    // 300dpi for print quality, 144dpi for 1x, 288dpi for 2x
    execSync(`mutool draw -o "${pngPath}" -r 144 "${pdfPath}" 1`, { stdio: 'inherit' });
    execSync(`mutool draw -o "${png2xPath}" -r 288 "${pdfPath}" 1`, { stdio: 'inherit' });
    // Try webp via mutool if available, else skip
    try {
      execSync(`mutool draw -o "${webpPath}" -r 144 -F png "${pdfPath}" 1 && cwebp -q 85 "${pngPath}" -o "${webpPath}" 2>/dev/null || true`, { stdio: 'ignore' });
    } catch {}
    console.log('[raster] mutool success');
    return true;
  } catch (e) {
    console.warn('[raster] mutool failed:', e.message);
    return false;
  }
}

function tryPdfJs() {
  try {
    // Try pdf-raster (Rust) if installed
    const pdfRaster = require('pdf-raster');
    console.log('[raster] trying pdf-raster');
    return false; // not yet implemented, requires async
  } catch {}
  return false;
}

if (!tryMutool() && !tryPdfJs()) {
  console.log('[raster] no raster tool available, using PDF directly (frontend will fallback to iframe)');
  // Ensure at least the PDF exists — frontend will use it as fallback
}
