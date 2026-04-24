/**
 * MiniFASNetV2 Anti-Spoofing Service
 *
 * Passive liveness detection: analyzes face texture to distinguish
 * real skin from printed photos, phone screens, and replays.
 * Model: 2.7_80x80_MiniFASNetV2 (1.7MB, ~15ms/inference)
 *
 * Label convention (from minivision-ai source):
 *   Class 0 = real face
 *   Class 1 = print attack
 *   Class 2 = replay attack
 */

import * as ort from 'onnxruntime-web';

const MODEL_PATH      = '/models/MiniFASNetV2.onnx';
const FACE_SCALE      = 2.7;   // expand bbox by this factor (matches model name "2.7_")
const INPUT_SIZE      = 80;    // model expects 80×80
const REAL_CLASS_IDX  = 0;     // class 0 = real face
const REAL_THRESHOLD  = 0.55;  // softmax score[0] must exceed this

// Module-level singleton — loaded once, reused
let _session: ort.InferenceSession | null = null;
let _loading = false;
let _loadPromise: Promise<ort.InferenceSession> | null = null;

export async function loadAntispoofModel(): Promise<ort.InferenceSession> {
  if (_session) return _session;
  if (_loading && _loadPromise) return _loadPromise;

  _loading = true;

  // Point ONNX Runtime WASM files to CDN
  // jsdelivr serves from node_modules, path must end with /
  ort.env.wasm.wasmPaths =
    'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

  _loadPromise = ort.InferenceSession.create(MODEL_PATH, {
    executionProviders: ['webgl', 'wasm'],
  }).then(session => {
    _session = session;
    return session;
  });

  return _loadPromise;
}

/**
 * Crop face region from canvas (expanded by FACE_SCALE), resize to 80×80,
 * run MiniFASNetV2 inference, return probability of being a real face (0–1).
 *
 * @param video - source video element (raw, unmirrored)
 * @param box   - face bounding box in raw frame coordinates
 * @returns     - real-face probability (0–1); higher = more likely real
 */
export async function checkLiveness(
  video: HTMLVideoElement,
  box: { x: number; y: number; width: number; height: number },
): Promise<number> {
  const session = await loadAntispoofModel();

  const vw = video.videoWidth  || 640;
  const vh = video.videoHeight || 480;

  // Expand bbox around face center by FACE_SCALE
  const cx   = box.x + box.width  / 2;
  const cy   = box.y + box.height / 2;
  const side = Math.max(box.width, box.height) * FACE_SCALE;
  const sx   = Math.max(0, cx - side / 2);
  const sy   = Math.max(0, cy - side / 2);
  const sw   = Math.min(side, vw - sx);
  const sh   = Math.min(side, vh - sy);

  // Draw cropped face region to 80×80 canvas
  const canvas = document.createElement('canvas');
  canvas.width  = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, INPUT_SIZE, INPUT_SIZE);

  const imageData = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
  const pixels    = imageData.data; // RGBA uint8

  // RGBA → Float32 NCHW [1, 3, 80, 80] with ImageNet normalization
  const mean = [0.485, 0.456, 0.406];
  const std  = [0.229, 0.224, 0.225];
  const hw   = INPUT_SIZE * INPUT_SIZE;
  const f32  = new Float32Array(3 * hw);

  for (let i = 0; i < hw; i++) {
    f32[i]        = (pixels[i * 4 + 0] / 255 - mean[0]) / std[0]; // R
    f32[hw + i]   = (pixels[i * 4 + 1] / 255 - mean[1]) / std[1]; // G
    f32[2 * hw + i] = (pixels[i * 4 + 2] / 255 - mean[2]) / std[2]; // B
  }

  const tensor  = new ort.Tensor('float32', f32, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const results = await session.run({ input: tensor });
  const raw     = results.output.data as Float32Array; // raw logits [3]

  // Softmax over 3 classes
  const maxLogit = Math.max(raw[0], raw[1], raw[2]);
  const exp      = [
    Math.exp(raw[0] - maxLogit),
    Math.exp(raw[1] - maxLogit),
    Math.exp(raw[2] - maxLogit),
  ];
  const sum    = exp[0] + exp[1] + exp[2];
  const scores = exp.map(e => e / sum);

  return scores[REAL_CLASS_IDX];
}

export { REAL_THRESHOLD };
