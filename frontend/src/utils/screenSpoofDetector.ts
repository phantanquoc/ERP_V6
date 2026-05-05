/**
 * Client-side phone/tablet screen spoof detection — v2.
 *
 * Core insight: a real face is 3D. When someone holds their head naturally
 * there is always subtle micro-movement. On a real face this causes PROPORTION
 * CHANGES (parallax) — the nose shifts relative to the ears. On a flat photo
 * displayed on a phone screen, ALL landmarks translate uniformly, so facial
 * proportions are FROZEN.
 *
 * Signals (weight):
 *  1. 3D parallax variance  (35%) — facial proportions must vary naturally
 *  2. Screen border rect    (20%) — phone edges create sharp rect boundaries
 *  3. Texture (Laplacian)  (15%) — real skin has micro-detail, screens don't
 *  4. Screen flicker/PWM    (10%) — phone screens (especially OLED) flicker
 *  5. Specular highlight    (10%) — glass screens produce concentrated glare
 *  6. Color temp shift      (10%) — screens emit bluer light than ambient skin
 *
 * The detector needs MediaPipe landmarks for signal #1 (parallax).
 * Caller should call `addLandmarkSnapshot()` each frame alongside `detect()`.
 */

export interface SpoofResult {
  isSpoof: boolean;
  /** 0 → definitely real, 1 → definitely phone screen */
  score: number;
  reasons: string[];
}

// ── Thresholds ──────────────────────────────────────────────────────────────────

const ANALYSIS_W             = 160;
const ANALYSIS_H             = 120;

// Heavy pixel analysis runs every N frames
const HEAVY_INTERVAL         = 4;

// Parallax needs at least N landmark snapshots before scoring
const PARALLAX_MIN_SNAPSHOTS = 8;
// Sliding window size
const PARALLAX_WINDOW        = 14;

// Flicker history length (frames)
const FLICKER_HISTORY        = 20;

// ── Parallax thresholds ─────────────────────────────────────────────────────────
// Variance of proportions (normalised 0-1) below PROPORTION_VAR_MIN ⇒ flat surface
// A real face has natural micro-movement → variance around 0.00003–0.0004
// A flat phone screen → variance ≈ 0 (typically < 0.000005)
const PROPORTION_VAR_MIN     = 0.000008;

// ── Pixel-analysis thresholds ────────────────────────────────────────────────────
const BORDER_MARGIN          = 0.50;
const BORDER_EDGE_THRESH     = 0.22;
const TEXTURE_VAR_THRESH     = 80;
const SPECULAR_THRESH        = 0.07;
const COLOR_TEMP_THRESH      = 0.10;
const FLICKER_AMP_THRESH     = 0.12;

// ── Combined scoring ────────────────────────────────────────────────────────────
const SPOOF_THRESHOLD        = 0.42;
const SPOOF_CONFIRM_FRAMES   = 3;      // need 3 consecutive heavy detects to flag
const SPOOF_COOLDOWN_FRAMES  = 15;     // keep spoof flag N frames after last detection

// ── MediaPipe landmark indices ───────────────────────────────────────────────────
const LM_NOSE_TIP    = 1;
const LM_L_EYE_INNER = 133;
const LM_R_EYE_INNER = 362;
const LM_L_EYE_OUTER = 33;
const LM_R_EYE_OUTER = 263;
const LM_L_CHEEK     = 234;
const LM_R_CHEEK     = 454;
const LM_FOREHEAD    = 10;
const LM_CHIN        = 152;

// ── Pixel helpers ────────────────────────────────────────────────────────────────

function toGray(data: Uint8ClampedArray, len: number): Uint8ClampedArray {
  const g = new Uint8ClampedArray(len);
  for (let i = 0; i < len; i++) {
    g[i] = (data[i * 4] * 77 + data[i * 4 + 1] * 150 + data[i * 4 + 2] * 29) >> 8;
  }
  return g;
}

function lapVariance(gray: Uint8ClampedArray, w: number, h: number): number {
  let s = 0, s2 = 0, n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v = -4 * gray[i] + gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w];
      s += v; s2 += v * v; n++;
    }
  }
  if (n === 0) return 0;
  const m = s / n;
  return s2 / n - m * m;
}

function edgeRatio(gray: Uint8ClampedArray, w: number, h: number, threshold: number): number {
  let edges = 0, total = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = Math.abs(gray[i + 1] - gray[i - 1]);
      const gy = Math.abs(gray[i + w] - gray[i - w]);
      if (gx + gy > threshold) edges++;
      total++;
    }
  }
  return total > 0 ? edges / total : 0;
}

function avgRGB(
  data: Uint8ClampedArray, w: number,
  x0: number, y0: number, x1: number, y1: number,
): { r: number; g: number; b: number } {
  let sr = 0, sg = 0, sb = 0, n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const o = (y * w + x) * 4;
      sr += data[o]; sg += data[o + 1]; sb += data[o + 2]; n++;
    }
  }
  return n > 0 ? { r: sr / n, g: sg / n, b: sb / n } : { r: 0, g: 0, b: 0 };
}

function specularRatio(
  data: Uint8ClampedArray, w: number,
  x0: number, y0: number, x1: number, y1: number,
  lumThresh: number = 242,
): number {
  let bright = 0, total = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const o = (y * w + x) * 4;
      const lum = (data[o] * 77 + data[o + 1] * 150 + data[o + 2] * 29) >> 8;
      if (lum > lumThresh) bright++;
      total++;
    }
  }
  return total > 0 ? bright / total : 0;
}

// ── Landmark proportion computation ──────────────────────────────────────────────

interface ProportionSnapshot {
  /** inter-eye distance / face width (shoulder-to-shoulder at cheek level) */
  eyeSpanRatio: number;
  /** nose tip X relative to eye midpoint (horizontal parallax signal) */
  noseOffset: number;
  /** forehead-to-chin / face width (vertical proportion) */
  aspectRatio: number;
  /** (nose_to_left_cheek - nose_to_right_cheek) / face_width */
  cheekSymmetry: number;
}

function extractProportions(
  lms: { x: number; y: number; z: number }[],
  vw: number, vh: number,
): ProportionSnapshot {
  const noseTip = { x: lms[LM_NOSE_TIP].x * vw, y: lms[LM_NOSE_TIP].y * vh };
  const lEyeIn  = { x: lms[LM_L_EYE_INNER].x * vw, y: lms[LM_L_EYE_INNER].y * vh };
  const rEyeIn  = { x: lms[LM_R_EYE_INNER].x * vw, y: lms[LM_R_EYE_INNER].y * vh };
  const lCheek  = { x: lms[LM_L_CHEEK].x * vw, y: lms[LM_L_CHEEK].y * vh };
  const rCheek  = { x: lms[LM_R_CHEEK].x * vw, y: lms[LM_R_CHEEK].y * vh };
  const forehead = { x: lms[LM_FOREHEAD].x * vw, y: lms[LM_FOREHEAD].y * vh };
  const chin    = { x: lms[LM_CHIN].x * vw, y: lms[LM_CHIN].y * vh };

  const interEye = Math.hypot(rEyeIn.x - lEyeIn.x, rEyeIn.y - lEyeIn.y);
  const faceW    = Math.hypot(rCheek.x - lCheek.x, rCheek.y - lCheek.y);
  const eyeMidX = (lEyeIn.x + rEyeIn.x) / 2;

  const noseToLeft  = Math.hypot(noseTip.x - lCheek.x, noseTip.y - lCheek.y);
  const noseToRight = Math.hypot(noseTip.x - rCheek.x, noseTip.y - rCheek.y);

  return {
    eyeSpanRatio:  faceW > 1 ? interEye / faceW : 0.5,
    noseOffset:    faceW > 1 ? (noseTip.x - eyeMidX) / faceW : 0,
    aspectRatio:   faceW > 1 ? Math.hypot(chin.x - forehead.x, chin.y - forehead.y) / faceW : 1.3,
    cheekSymmetry: faceW > 1 ? (noseToLeft - noseToRight) / faceW : 0,
  };
}

/** Variance of an array of numbers. */
function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
}

// ── Detector ─────────────────────────────────────────────────────────────────────

export class ScreenSpoofDetector {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private frame = 0;
  private lastHeavy = 0;

  // Pixel-analysis state
  private brightnessHist: number[] = [];
  private prevScore = 0;
  private reasons: string[] = [];

  // Landmark parallax state
  private proportionHistory: ProportionSnapshot[] = [];

  // Cooldown / hysteresis
  private spoofConfirmCount = 0;
  private spoofCooldownFrames = 0;
  private lastIsSpoof = false;

  // Exposed signals (for logging / debug)
  private lastSignals: Record<string, number> = {};

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = ANALYSIS_W;
    this.canvas.height = ANALYSIS_H;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  }

  /**
   * Record a landmark snapshot for 3D parallax analysis.
   * Call this EVERY frame when face is detected, BEFORE calling detect().
   */
  addLandmarkSnapshot(
    lms: { x: number; y: number; z: number }[],
    vw: number, vh: number,
  ): void {
    const snap = extractProportions(lms, vw, vh);
    this.proportionHistory.push(snap);
    if (this.proportionHistory.length > PARALLAX_WINDOW) {
      this.proportionHistory.shift();
    }
  }

  /**
   * Analyse one video frame.
   */
  detect(
    video: HTMLVideoElement,
    faceBox: { x: number; y: number; width: number; height: number } | null,
    videoWidth: number,
    videoHeight: number,
  ): SpoofResult {
    const vw = videoWidth || 640;
    const vh = videoHeight || 480;
    const cw = ANALYSIS_W;
    const ch = ANALYSIS_H;
    const sx = vw / cw;
    const sy = vh / ch;

    this.ctx.drawImage(video, 0, 0, cw, ch);
    const imgData = this.ctx.getImageData(0, 0, cw, ch);
    const gray = toGray(imgData.data, cw * ch);

    // ── Brightness tracking (every frame) ────────────────────────────────
    let bx0: number, by0: number, bx1: number, by1: number;
    if (faceBox) {
      const fx = Math.max(0, Math.floor(faceBox.x / sx));
      const fy = Math.max(0, Math.floor(faceBox.y / sy));
      const fw = Math.floor(faceBox.width / sx);
      const fh = Math.floor(faceBox.height / sy);
      bx0 = fx; by0 = fy;
      bx1 = Math.min(cw, fx + fw); by1 = Math.min(ch, fy + fh);
    } else {
      bx0 = Math.floor(cw * 0.25); by0 = Math.floor(ch * 0.2);
      bx1 = Math.floor(cw * 0.75); by1 = Math.floor(ch * 0.8);
    }

    let bSum = 0, bN = 0;
    for (let y = by0; y < by1; y++) {
      for (let x = bx0; x < bx1; x++) {
        bSum += gray[y * cw + x]; bN++;
      }
    }
    const brightness = bN > 0 ? bSum / bN : 128;
    this.brightnessHist.push(brightness);
    if (this.brightnessHist.length > FLICKER_HISTORY) this.brightnessHist.shift();

    this.frame++;

    // ── 3D parallax analysis (every frame, needs N snapshots) ──────────────
    let parallaxScore = 0;
    let parallaxReason = '';
    if (this.proportionHistory.length >= PARALLAX_MIN_SNAPSHOTS) {
      const window = this.proportionHistory.slice(-PARALLAX_MIN_SNAPSHOTS);
      const varEye  = variance(window.map(s => s.eyeSpanRatio));
      const varNose = variance(window.map(s => s.noseOffset));
      const varAsp  = variance(window.map(s => s.aspectRatio));
      const varSym  = variance(window.map(s => s.cheekSymmetry));

      // Combined parallax: a real face always has micro-movement variance
      // A flat photo on a screen has rock-steady proportions
      const combinedVar = varEye + varNose + varAsp + varSym;

      // Real face: combinedVar typically 0.00002 – 0.001
      // Screen: combinedVar typically < 0.000005
      parallaxScore = Math.min(1, Math.max(0, 1 - combinedVar / PROPORTION_VAR_MIN));
      if (combinedVar < PROPORTION_VAR_MIN) {
        parallaxReason = 'flat_surface';
      }

      this.lastSignals.parallaxVar = combinedVar;
      this.lastSignals.parallaxScore = parallaxScore;
    }

    // ── Heavy pixel analysis (every HEAVY_INTERVAL frames) ────────────────
    if (this.frame - this.lastHeavy >= HEAVY_INTERVAL && faceBox) {
      this.lastHeavy = this.frame;
      this.heavyAnalysis(imgData.data, gray, cw, ch, faceBox, sx, sy);
    }

    // ── Combine signals ───────────────────────────────────────────────────
    const signals = this.lastSignals;
    const texNorm    = Math.max(0, 1 - (signals.texture || 100) / TEXTURE_VAR_THRESH);
    const flickNorm  = Math.min(1, (signals.flicker || 0) / FLICKER_AMP_THRESH);
    const borderVal  = signals.border || 0;
    const specNorm   = Math.min(1, (signals.specular || 0) / SPECULAR_THRESH);
    const colorNorm  = Math.min(1, (signals.colorShift || 0) / COLOR_TEMP_THRESH);

    // Parallax is the strongest signal — only use it when we have enough data
    const parallaxWeight = this.proportionHistory.length >= PARALLAX_MIN_SNAPSHOTS ? 0.35 : 0;
    const otherWeight = 1 - parallaxWeight;

    const score =
      parallaxWeight * parallaxScore +
      otherWeight * 0.30 * borderVal +
      otherWeight * 0.25 * texNorm +
      otherWeight * 0.20 * flickNorm +
      otherWeight * 0.15 * specNorm +
      otherWeight * 0.10 * colorNorm;

    // ── Hysteresis: require CONFIRM_FRAMES consecutive detections ─────────
    const reasons: string[] = [...this.reasons];
    if (parallaxReason) reasons.push(parallaxReason);

    if (score >= SPOOF_THRESHOLD) {
      this.spoofConfirmCount++;
    } else {
      this.spoofConfirmCount = Math.max(0, this.spoofConfirmCount - 1);
    }

    const rawIsSpoof = this.spoofConfirmCount >= SPOOF_CONFIRM_FRAMES;
    if (rawIsSpoof) {
      this.spoofCooldownFrames = SPOOF_COOLDOWN_FRAMES;
      this.lastIsSpoof = true;
    } else if (this.spoofCooldownFrames > 0) {
      this.spoofCooldownFrames--;
    } else {
      this.lastIsSpoof = false;
    }

    this.prevScore = score;

    return {
      isSpoof: this.lastIsSpoof,
      score,
      reasons: rawIsSpoof ? reasons : [],
    };
  }

  /** Reset all state when face is lost. */
  reset(): void {
    this.brightnessHist = [];
    this.proportionHistory = [];
    this.spoofConfirmCount = 0;
    this.spoofCooldownFrames = 0;
    this.lastIsSpoof = false;
    this.prevScore = 0;
    this.reasons = [];
    this.lastSignals = {};
    this.frame = 0;
    this.lastHeavy = 0;
  }

  // ── Heavy pixel analysis ───────────────────────────────────────────────────

  private heavyAnalysis(
    data: Uint8ClampedArray,
    gray: Uint8ClampedArray,
    cw: number, ch: number,
    faceBox: { x: number; y: number; width: number; height: number },
    sx: number, sy: number,
  ): void {
    const reasons: string[] = [];
    const signals: Record<string, number> = {};

    const fx = Math.max(1, Math.floor(faceBox.x / sx));
    const fy = Math.max(1, Math.floor(faceBox.y / sy));
    const fw = Math.floor(faceBox.width / sx);
    const fh = Math.floor(faceBox.height / sy);
    const fx1 = Math.min(cw - 1, fx + fw);
    const fy1 = Math.min(ch - 1, fy + fh);

    // Inner face region (60%) for texture & specular
    const m = 0.20;
    const tx0 = Math.max(1, Math.floor(fx + fw * m));
    const ty0 = Math.max(1, Math.floor(fy + fh * m));
    const tx1 = Math.min(cw - 1, Math.floor(fx1 - fw * m));
    const ty1 = Math.min(ch - 1, Math.floor(fy1 - fh * m));

    // ── A. Flicker / brightness oscillation ────────────────────────────────
    if (this.brightnessHist.length >= 8) {
      const flickAmp = this.computeFlicker();
      signals.flicker = flickAmp;
      if (flickAmp > FLICKER_AMP_THRESH) reasons.push('screen_flicker');
    }

    // ── B. Texture variance ────────────────────────────────────────────────
    if (tx1 > tx0 + 2 && ty1 > ty0 + 2) {
      const tw = tx1 - tx0;
      const th = ty1 - ty0;
      const subGray = new Uint8ClampedArray(tw * th);
      for (let y = ty0; y < ty1; y++) {
        for (let x = tx0; x < tx1; x++) {
          subGray[(y - ty0) * tw + (x - tx0)] = gray[y * cw + x];
        }
      }
      const texVar = lapVariance(subGray, tw, th);
      signals.texture = texVar;
      if (texVar < TEXTURE_VAR_THRESH) reasons.push('low_texture');
    }

    // ── C. Screen border rect detection ───────────────────────────────────
    const bx0 = Math.max(0, Math.floor(fx - fw * BORDER_MARGIN));
    const by0 = Math.max(0, Math.floor(fy - fh * BORDER_MARGIN));
    const bx1e = Math.min(cw, Math.floor(fx1 + fw * BORDER_MARGIN));
    const by1e = Math.min(ch, Math.floor(fy1 + fh * BORDER_MARGIN));

    const topEdge   = by0 < fy    ? edgeRatio(gray, cw, fx, by0, fx1, fy)    : 0;
    const botEdge   = fy1 < by1e  ? edgeRatio(gray, cw, fx, fy1, fx1, by1e) : 0;
    const leftEdge  = bx0 < fx    ? edgeRatio(gray, cw, bx0, fy, fx, fy1)   : 0;
    const rightEdge = fx1 < bx1e  ? edgeRatio(gray, cw, fx1, fy, bx1e, fy1) : 0;

    // Check if edges form a rect: strong on ≥ 2 opposite sides, face centre is brighter than surround
    const oppositePairs = [
      Math.min(topEdge, botEdge),
      Math.min(leftEdge, rightEdge),
    ];
    const rectScore = oppositePairs.filter(p => p > BORDER_EDGE_THRESH).length;
    const borderScore = rectScore >= 2 ? 0.7 + 0.3 * Math.min(1, rectScore / 2) : rectScore >= 1 ? 0.4 : 0;

    // Additional: face interior should be brighter than surround (screen emits light)
    if (tx1 > tx0 && ty1 > ty0) {
      const faceRGB = avgRGB(data, cw, tx0, ty0, tx1, ty1);
      const faceLum = (faceRGB.r * 77 + faceRGB.g * 150 + faceRGB.b * 29) / 256;
      const surround = avgRGB(data, cw, bx0, by0, bx1e, by1e);
      const surroundLum = (surround.r * 77 + surround.g * 150 + surround.b * 29) / 256;
      if (faceLum > surroundLum * 1.35 && borderScore > 0) {
        reasons.push('bright_rect_on_dark');
      }
    }

    signals.border = borderScore;
    if (borderScore > 0) reasons.push('screen_border');

    // ── D. Specular highlights ────────────────────────────────────────────
    if (tx1 > tx0 && ty1 > ty0) {
      const specRatio = specularRatio(data, cw, tx0, ty0, tx1, ty1);
      signals.specular = specRatio;
      if (specRatio > SPECULAR_THRESH) reasons.push('specular_highlight');
    }

    // ── E. Colour temperature shift ───────────────────────────────────────
    if (tx1 > tx0 && ty1 > ty0) {
      const faceRGB = avgRGB(data, cw, tx0, ty0, tx1, ty1);
      const periRGB = avgRGB(data, cw,
        Math.max(0, bx0), Math.max(0, by0),
        Math.min(cw, bx1e), Math.min(ch, by1e));
      const faceBlue = faceRGB.b / Math.max(1, faceRGB.r + faceRGB.g + faceRGB.b);
      const periBlue = periRGB.b / Math.max(1, periRGB.r + periRGB.g + periRGB.b);
      const blueShift = Math.max(0, faceBlue - periBlue);
      signals.colorShift = blueShift;
      if (blueShift > COLOR_TEMP_THRESH) reasons.push('color_blue_shift');
    }

    // Merge signals into lastSignals
    Object.assign(this.lastSignals, signals);
    this.reasons = reasons;
  }

  private computeFlicker(): number {
    const h = this.brightnessHist;
    if (h.length < 8) return 0;
    const n = h.length;
    const mean = h.reduce((a, b) => a + b, 0) / n;
    if (mean < 5) return 0;
    const halfWin = Math.max(2, Math.floor(n / 4));
    const detrended: number[] = [];
    for (let i = 0; i < n; i++) {
      let ms = 0, mc = 0;
      for (let j = Math.max(0, i - halfWin); j <= Math.min(n - 1, i + halfWin); j++) {
        ms += h[j]; mc++;
      }
      detrended.push(h[i] - ms / mc);
    }
    const dMin = Math.min(...detrended);
    const dMax = Math.max(...detrended);
    return (dMax - dMin) / mean;
  }
}