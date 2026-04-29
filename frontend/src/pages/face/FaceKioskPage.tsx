import React, { useRef, useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import faceAttendanceService, { VerifyResult } from '../../services/faceAttendanceService';
import { loadFaceMesh } from '../../utils/loadFaceMesh';

// MediaPipe FaceMesh — loaded via dynamic script injection (không dùng ES import vì Vite/WASM conflict)
// Không dùng ES import vì WASM conflict với Vite bundler
/* eslint-disable @typescript-eslint/no-explicit-any */
type FaceMeshInstance = any;
type NLM = { x: number; y: number; z: number };

type KioskState = 'loading' | 'waiting' | 'processing' | 'result' | 'error';
type FacePos    = 'none' | 'centered' | 'offcenter' | 'multiface';

const CENTER_ZONE       = 0.30;
const MAX_YAW           = 0.25;
const MAX_PITCH         = 0.28;
const MIN_FACE_AREA     = 0.04;
const QUALITY_GATE      = 5;     // cần 5 frame liên tiếp (~0.5s) thay vì 8

// ── MediaPipe FaceMesh landmark indices ──────────────────────────────────────
// Left eye contour
const L_EYE = [33, 160, 158, 133, 153, 144];
// Right eye contour
const R_EYE = [362, 385, 387, 263, 373, 380];
// Nose tip
const NOSE_TIP = 1;
// Mouth outer contour (12 pts)
const MOUTH = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375];
// EAR: left top/bot lid, inner/outer corner
const L_EAR_TOP = 159, L_EAR_BOT = 145, L_EAR_IN = 33, L_EAR_OUT = 133;
// EAR: right top/bot lid, inner/outer corner
const R_EAR_TOP = 386, R_EAR_BOT = 374, R_EAR_IN = 362, R_EAR_OUT = 263;

interface ResultDisplay {
  type: 'success' | 'info' | 'error' | 'warning';
  title: string;
  employee?: string;
  subtitle?: string;
  time?: string;
}

const RESULT_DISPLAY_MS = 4000;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

// Standby / power-save
const IDLE_SLOW_MS   = 30_000;
const IDLE_DIM_MS    = 60_000;
const DETECT_FAST_MS = 100;
const DETECT_SLOW_MS = 500;
const CAPTURE_SIZE   = 480;  // tăng từ 256 để AI có nhiều chi tiết hơn
const FACE_CROP_PADDING = 0.30;

/** Tính yaw/pitch từ MediaPipe 468-point landmarks (coords normalized 0-1). */
function computeKioskPose(lms: NLM[], vw: number, vh: number): { yaw: number; pitch: number } {
  const avgPx = (idxs: number[]) => {
    const x = idxs.reduce((s, i) => s + lms[i].x * vw, 0) / idxs.length;
    const y = idxs.reduce((s, i) => s + lms[i].y * vh, 0) / idxs.length;
    return { x, y };
  };
  const leftEye   = avgPx(L_EYE);
  const rightEye  = avgPx(R_EYE);
  const noseTip   = { x: lms[NOSE_TIP].x * vw, y: lms[NOSE_TIP].y * vh };
  const eyeCenter = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 };
  const eyeWidth  = Math.abs(rightEye.x - leftEye.x);
  if (eyeWidth < 10) return { yaw: 0, pitch: 0 };
  const yaw = -(noseTip.x - eyeCenter.x) / eyeWidth;
  const mouthCenterY = MOUTH.reduce((s, i) => s + lms[i].y * vh, 0) / MOUTH.length;
  const eyeToNose   = noseTip.y - eyeCenter.y;
  const noseToMouth = mouthCenterY - noseTip.y;
  const totalV      = eyeToNose + noseToMouth;
  const pitch = totalV > 0 ? (eyeToNose - noseToMouth) / totalV : 0;
  return { yaw, pitch };
}

const actionConfig: Record<string, { title: string; type: 'success' | 'info' | 'error' | 'warning' }> = {
  CHECK_IN:         { title: 'Check-in thành công ✅', type: 'success' },
  CHECK_OUT:        { title: 'Check-out thành công 👋', type: 'success' },
  ALREADY_RECORDED: { title: 'Đã điểm danh hôm nay ℹ️', type: 'info' },
  NO_MATCH:         { title: 'Vui lòng thử lại', type: 'error' },
  COOLDOWN:         { title: 'Vui lòng chờ ⏳', type: 'warning' },
};

const FaceKioskPage: React.FC = () => {
  const videoRef       = useRef<HTMLVideoElement>(null);
  const overlayRef     = useRef<HTMLCanvasElement>(null);
  const captureRef     = useRef<HTMLCanvasElement>(null);
  const rafRef         = useRef<number>(0);
  const resetTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processing     = useRef(false);
  const lastFaceAt     = useRef<number>(Date.now());
  const detectInterval = useRef<number>(DETECT_FAST_MS);
  const currentFaceBox = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const faceMeshRef    = useRef<FaceMeshInstance | null>(null);
  // Bridge: onResults callback → drawLoop
  const latestDet      = useRef<{ lms: NLM[]; box: { x: number; y: number; width: number; height: number }; score: number; faceCount: number } | null>(null);
  const audioCtxRef    = useRef<AudioContext | null>(null);

  // Quality gate
  const qualityBuffer  = useRef<{ frame: string; score: number }[]>([]);

  // Liveness hints
  const lastEye        = useRef<{ leftEAR: number; rightEAR: number } | null>(null);
  const lastFaceBox    = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const blinks         = useRef<number>(0);
  const hasMoved       = useRef<boolean>(false);

  const [kioskState, setKioskState]     = useState<KioskState>('loading');
  const [result, setResult]             = useState<ResultDisplay | null>(null);
  const [cameraError, setCameraError]   = useState('');
  const [currentTime, setCurrentTime]   = useState(new Date());
  const [facePos, setFacePos]           = useState<FacePos>('none');
  const [dimmed, setDimmed]             = useState(false);
  const [qualityCount, setQualityCount] = useState(0);
  const [statusHint, setStatusHint]     = useState('');

  const kioskConfig = faceAttendanceService.getKioskConfig();
  const isLocalDev  = import.meta.env.DEV || LOCAL_HOSTS.has(window.location.hostname);

  // ── Web Audio beep ────────────────────────────────────────────────────────
  const playBeep = useCallback((type: 'success' | 'error' | 'warning' | 'info') => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const configs = {
        success: { freq: 880, duration: 0.18, vol: 0.25 },
        error:   { freq: 220, duration: 0.40, vol: 0.30 },
        warning: { freq: 440, duration: 0.25, vol: 0.20 },
        info:    { freq: 660, duration: 0.15, vol: 0.15 },
      };
      const { freq, duration, vol } = configs[type];
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch { /* AudioContext blocked by browser policy — ignore */ }
  }, []);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const captureFrame = useCallback((): string | null => {
    const video  = videoRef.current;
    const canvas = captureRef.current;
    if (!video || !canvas || video.readyState < 2) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    const faceBox = currentFaceBox.current;
    if (faceBox) {
      // Crop vuông — lấy cạnh lớn hơn (thường là height) làm kích thước chuẩn
      // để tránh méo mặt khi ép vào canvas vuông CAPTURE_SIZE×CAPTURE_SIZE
      const side   = Math.max(faceBox.width, faceBox.height);
      const padded = side * (1 + FACE_CROP_PADDING * 2);
      const cx     = faceBox.x + faceBox.width  / 2;
      const cy     = faceBox.y + faceBox.height / 2;
      const sx = Math.max(0, Math.round(cx - padded / 2));
      const sy = Math.max(0, Math.round(cy - padded / 2));
      const sw = Math.min(vw - sx, Math.round(padded));
      const sh = Math.min(vh - sy, Math.round(padded));
      canvas.width  = CAPTURE_SIZE;
      canvas.height = CAPTURE_SIZE;
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, CAPTURE_SIZE, CAPTURE_SIZE);
    } else {
      // Không có face box — crop trung tâm vuông từ video
      const side = Math.min(vw, vh);
      const sx = Math.round((vw - side) / 2);
      const sy = Math.round((vh - side) / 2);
      canvas.width  = CAPTURE_SIZE;
      canvas.height = CAPTURE_SIZE;
      ctx.drawImage(video, sx, sy, side, side, 0, 0, CAPTURE_SIZE, CAPTURE_SIZE);
    }
    return canvas.toDataURL('image/jpeg', 0.90).split(',')[1]; // tăng từ 0.72 → 0.90
  }, []);

  const resetQualityGate = useCallback(() => {
    qualityBuffer.current = [];
    setQualityCount(0);
  }, []);

  const showResult = useCallback((res: VerifyResult) => {
    const hasValidAction = !!res.action && !!actionConfig[res.action];
    const isFailed = res.matched === false || !hasValidAction || res.action === 'NO_MATCH';
    const cfg = isFailed
      ? { title: 'Vui lòng thử lại', type: 'error' as const }
      : actionConfig[res.action as keyof typeof actionConfig];
    const emp = res.employee;
    const nameLine = emp
      ? emp.department ? `${emp.fullName} — ${emp.department}` : emp.fullName
      : res.message;

    // Subtitle: đi muộn hoặc cooldown message
    let subtitle: string | undefined;
    if (res.action === 'CHECK_IN' && res.lateMinutes && res.lateMinutes > 0) {
      subtitle = `Đi muộn ${res.lateMinutes} phút`;
    } else if (res.action === 'COOLDOWN') {
      subtitle = res.message;
    }

    playBeep(cfg.type);
    setResult({ type: cfg.type, title: cfg.title, employee: nameLine, subtitle, time: new Date().toLocaleTimeString('vi-VN') });
    setKioskState('result');
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      setResult(null);
      setKioskState('waiting');
      processing.current = false;
    }, RESULT_DISPLAY_MS);
  }, [playBeep]);

  const doScan = useCallback(async (bestImage: string, frames: string[]) => {
    if (processing.current) return;
    processing.current = true;
    setKioskState('processing');
    setStatusHint('');
    blinks.current   = 0;
    hasMoved.current = false;
    lastEye.current  = null;
    lastFaceBox.current = null;
    try {
      const res = kioskConfig.deviceKey
        ? await faceAttendanceService.kioskVerify(bestImage, frames, kioskConfig.deviceKey, kioskConfig.deviceId)
        : isLocalDev
          ? await faceAttendanceService.kioskVerifyDev(bestImage, frames)
          : (() => { throw new Error('Thiết bị chưa được cấu hình device key'); })();
      if (res.data) {
        if (res.data.topK?.length) {
          console.group('[face-attendance] TopK matches');
          console.table(res.data.topK.map(item => ({
            rank: item.rank, employeeCode: item.employeeCode, fullName: item.fullName,
            confidence: item.confidence, minDistance: item.minDistance, voteCount: item.voteCount, score: item.score,
          })));
          console.groupEnd();
        }
        showResult(res.data);
      } else {
        processing.current = false;
        setKioskState('waiting');
      }
    } catch (error) {
      processing.current = false;
      setKioskState('waiting');
      setCameraError(error instanceof Error ? error.message : 'Kiosk verify thất bại');
    }
  }, [showResult, isLocalDev, kioskConfig.deviceId, kioskConfig.deviceKey]);

  // ─── Detection loop ──────────────────────────────────────────────────────────
  const drawLoop = useCallback(async () => {
    const video   = videoRef.current;
    const overlay = overlayRef.current;

    if (!video || !overlay || video.readyState < 2 || !video.videoWidth) {
      rafRef.current = window.setTimeout(drawLoop, DETECT_FAST_MS);
      return;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (overlay.width !== vw || overlay.height !== vh) {
      overlay.width  = vw;
      overlay.height = vh;
    }

    const ctx = overlay.getContext('2d');
    if (!ctx) { rafRef.current = window.setTimeout(drawLoop, detectInterval.current); return; }

    // Gửi frame vào FaceMesh — kết quả nhận trong onResults callback (latestDet)
    if (faceMeshRef.current) {
      await faceMeshRef.current.send({ image: video });
    }

    ctx.clearRect(0, 0, vw, vh);
    const now = Date.now();
    const detection = latestDet.current;

    // ── Multi-face reject ─────────────────────────────────────────────────
    if (detection && detection.faceCount > 1) {
      lastFaceAt.current    = now;
      detectInterval.current = DETECT_FAST_MS;
      setDimmed(false);
      setFacePos('multiface');
      if (!processing.current) resetQualityGate();

      // Vẽ cảnh báo
      ctx.fillStyle = 'rgba(239,68,68,0.25)';
      ctx.fillRect(0, 0, vw, vh);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(4, 4, vw - 8, vh - 8);
      rafRef.current = window.setTimeout(drawLoop, detectInterval.current);
      return;
    }

    if (detection) {
      const { lms, box, score: detScore } = detection;

      const faceCx = box.x + box.width  / 2;
      const faceCy = box.y + box.height / 2;
      const isCentered = Math.abs(faceCx / vw - 0.5) < CENTER_ZONE
                      && Math.abs(faceCy / vh - 0.5) < CENTER_ZONE;
      const faceAreaRatio = (box.width * box.height) / (vw * vh);

      lastFaceAt.current    = now;
      detectInterval.current = DETECT_FAST_MS;
      setDimmed(false);
      setFacePos(isCentered ? 'centered' : 'offcenter');
      currentFaceBox.current = box;

      // ── Pose + EAR ──────────────────────────────────────────────────────
      const computeEAR = (ti: number, bi: number, ini: number, outi: number) => {
        const top = { x: lms[ti].x * vw, y: lms[ti].y * vh };
        const bot = { x: lms[bi].x * vw, y: lms[bi].y * vh };
        const inn = { x: lms[ini].x * vw, y: lms[ini].y * vh };
        const out = { x: lms[outi].x * vw, y: lms[outi].y * vh };
        const vert  = Math.hypot(top.y - bot.y, top.x - bot.x);
        const horiz = Math.hypot(out.x - inn.x, out.y - inn.y);
        return horiz > 0 ? vert / (2 * horiz) : 0;
      };
      const leftEAR  = computeEAR(L_EAR_TOP, L_EAR_BOT, L_EAR_IN, L_EAR_OUT);
      const rightEAR = computeEAR(R_EAR_TOP, R_EAR_BOT, R_EAR_IN, R_EAR_OUT);
      if (lastEye.current) {
        const prevEAR = (lastEye.current.leftEAR + lastEye.current.rightEAR) / 2;
        if (prevEAR < 0.20 && (leftEAR + rightEAR) / 2 > 0.25) blinks.current++;
      }
      lastEye.current = { leftEAR, rightEAR };

      if (lastFaceBox.current) {
        const mdx = Math.abs(box.x - lastFaceBox.current.x);
        const mdy = Math.abs(box.y - lastFaceBox.current.y);
        const mdw = Math.abs(box.width - lastFaceBox.current.width);
        if (mdx > box.width * 0.10 || mdy > box.height * 0.10 || mdw > box.width * 0.10)
          hasMoved.current = true;
      }
      lastFaceBox.current = box;

      const { yaw, pitch } = computeKioskPose(lms, vw, vh);
      const isFacingStraight = Math.abs(yaw) <= MAX_YAW && Math.abs(pitch) <= MAX_PITCH;
      // ────────────────────────────────────────────────────────────────────

      // ── Quality gate ─────────────────────────────────────────────────────
      const isGoodFrame = isCentered && isFacingStraight
        && detScore >= 0.3  // proxy score — inter-eye distance based
        && faceAreaRatio >= MIN_FACE_AREA;

      if (isGoodFrame && !processing.current) {
        const frame = captureFrame();
        if (frame) {
          qualityBuffer.current.push({ frame, score: detScore });
          const count = qualityBuffer.current.length;
          setQualityCount(count);
          setStatusHint(`Giữ nguyên... (${count}/${QUALITY_GATE})`);
          if (count >= QUALITY_GATE) {
            const buf  = qualityBuffer.current;
            const best = buf.reduce((a, b) => b.score > a.score ? b : a);
            const frames = buf.map(f => f.frame);
            qualityBuffer.current = [];
            setQualityCount(0);
            doScan(best.frame, frames);
          }
        }
      } else if (!processing.current) {
        if (qualityBuffer.current.length > 0) resetQualityGate();
        if (!isCentered)           setStatusHint('Di chuyển vào giữa màn hình');
        else if (!isFacingStraight) setStatusHint('Nhìn thẳng vào camera');
        else if (faceAreaRatio < MIN_FACE_AREA) setStatusHint('Lại gần camera hơn');
        else setStatusHint('Giữ nguyên để xác minh...');
      }
      // ────────────────────────────────────────────────────────────────────

      const color = isGoodFrame ? '#22d3ee' : '#f59e0b';

      // 4-corner marker
      const cornerLen = Math.max(8, Math.min(box.width, box.height) * 0.10);
      const drawCorner = (x: number, y: number, sx: 1 | -1, sy: 1 | -1) => {
        ctx.beginPath();
        ctx.moveTo(x, y + sy * cornerLen);
        ctx.lineTo(x, y);
        ctx.lineTo(x + sx * cornerLen, y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      };
      drawCorner(box.x,             box.y,              1,  1);
      drawCorner(box.x + box.width, box.y,             -1,  1);
      drawCorner(box.x,             box.y + box.height,  1, -1);
      drawCorner(box.x + box.width, box.y + box.height, -1, -1);

      // 468 landmark dots
      lms.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x * vw, pt.y * vh, 1.0, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });

    } else {
      setFacePos('none');
      currentFaceBox.current = null;
      lastEye.current        = null;
      lastFaceBox.current    = null;
      blinks.current         = 0;
      hasMoved.current       = false;
      if (!processing.current) {
        resetQualityGate();
        setStatusHint('');
      }
      const idleMs = now - lastFaceAt.current;
      if (idleMs > IDLE_SLOW_MS) detectInterval.current = DETECT_SLOW_MS;
      if (idleMs > IDLE_DIM_MS)  setDimmed(true);
    }

    rafRef.current = window.setTimeout(drawLoop, detectInterval.current);
  }, [captureFrame, doScan, resetQualityGate]);

  // ─── Init: FaceMesh + Camera ─────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    const init = async () => {
      // ── Bước 1: Khởi tạo FaceMesh ─────────────────────────────────────────
      let mesh: FaceMeshInstance | null = null;
      try {
        const FaceMeshCtor = await loadFaceMesh();
        mesh = new FaceMeshCtor({
          locateFile: (file: string) => `/mediapipe/${file}`,
        });
        mesh.setOptions({
          maxNumFaces: 4,
          refineLandmarks: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        mesh.onResults((results: any) => {
          const allFaces = results.multiFaceLandmarks ?? [];
          const faceCount = allFaces.length;
          const lmList = allFaces[0];
          if (!lmList || lmList.length === 0) {
            latestDet.current = null;
            return;
          }
          const lms = lmList as NLM[];
          const video = videoRef.current;
          const vw = video?.videoWidth ?? 640;
          const vh = video?.videoHeight ?? 480;

          const xs = lms.map(p => p.x * vw);
          const ys = lms.map(p => p.y * vh);
          const bx = Math.min(...xs), by = Math.min(...ys);
          const bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by;

          const eyeW = Math.abs(lms[263].x * vw - lms[33].x * vw);
          const score = Math.min(eyeW / (vw * 0.10), 1.0);

          latestDet.current = { lms, box: { x: bx, y: by, width: bw, height: bh }, score, faceCount };
        });
        // FaceMesh is ready after construction + setOptions + onResults
        // No explicit initialize() call needed
      } catch (modelErr) {
        const errMsg = modelErr instanceof Error ? `${modelErr.name}: ${modelErr.message}` : String(modelErr);
        console.error('[FaceKiosk] FaceMesh init failed:', modelErr);
        (window as any).__kioskLastError = { stage: 'model', msg: errMsg, ts: Date.now() };
        mesh?.close();
        if (active) setCameraError(`Không thể tải model nhận diện: ${errMsg}`);
        return;
      }

      if (!active) { mesh.close(); return; }
      faceMeshRef.current = mesh;

      if (!kioskConfig.deviceKey && !isLocalDev) {
        setCameraError('Thiết bị chưa được cấu hình device key cho kiosk production.');
        return;
      }

      // ── Bước 2: Khởi động camera ──────────────────────────────────────────
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        setKioskState('waiting');
        rafRef.current = window.setTimeout(drawLoop, DETECT_FAST_MS);
      } catch (camErr) {
        const errMsg = camErr instanceof Error ? `${camErr.name}: ${camErr.message}` : String(camErr);
        console.error('[FaceKiosk] Camera init failed:', camErr);
        (window as any).__kioskLastError = { stage: 'camera', msg: errMsg, ts: Date.now() };
        if (active) setCameraError(`Không thể truy cập camera: ${errMsg}`);
      }
    };

    init();

    return () => {
      active = false;
      clearTimeout(rafRef.current);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      faceMeshRef.current?.close();
      if (videoRef.current?.srcObject)
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    };
  }, [drawLoop, isLocalDev, kioskConfig.deviceKey]);

  const overlayBg: Record<string, string> = {
    success: 'bg-green-500', info: 'bg-blue-500', error: 'bg-red-500', warning: 'bg-amber-500',
  };
  const overlayIcon: Record<string, React.ReactNode> = {
    success: <CheckCircle className="w-24 h-24 text-white" />,
    info:    <AlertCircle className="w-24 h-24 text-white" />,
    error:   <XCircle    className="w-24 h-24 text-white" />,
    warning: <AlertCircle className="w-24 h-24 text-white" />,
  };

  return (
    <div className="fixed inset-0 bg-black select-none overflow-hidden">

      {/* Standby overlay — hiện sau 1 phút không thấy mặt */}
      {dimmed && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center transition-opacity duration-[2000ms]">
          <div className="flex flex-col items-center gap-6 opacity-40">
            <div
              className="border-2 border-white/60 border-dashed rounded-full animate-pulse"
              style={{ width: 'min(220px, 30vw)', height: 'min(280px, 38vh)' }}
            />
            <p className="text-white text-xl font-light tracking-widest uppercase">Chế độ chờ</p>
            <p className="text-white/50 text-sm">{currentTime.toLocaleTimeString('vi-VN')}</p>
          </div>
        </div>
      )}

      {/* Camera */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        muted playsInline autoPlay
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Overlay canvas */}
      <canvas
        ref={overlayRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Hidden capture canvas */}
      <canvas ref={captureRef} className="hidden" />

      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-8 py-5"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)' }}
      >
        <div className="text-white drop-shadow">
          <p className="text-2xl font-bold tracking-widest uppercase">Chấm Công Khuôn Mặt</p>
          <p className="text-white/60 text-sm mt-0.5">Đứng trước camera để điểm danh tự động</p>
        </div>
        <div className="text-right text-white drop-shadow">
          <p className="text-5xl font-mono font-bold tabular-nums leading-none">
            {currentTime.toLocaleTimeString('vi-VN')}
          </p>
          <p className="text-white/60 text-sm mt-1">
            {currentTime.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Face guide oval */}
      {kioskState === 'waiting' && facePos === 'none' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="flex flex-col items-center">
            <div
              className="border-2 border-white/50 border-dashed rounded-full animate-pulse"
              style={{ width: 'min(320px, 40vw)', height: 'min(420px, 55vh)' }}
            />
            <p className="mt-4 text-white/70 text-base font-medium tracking-wide drop-shadow">
              Đặt khuôn mặt vào khung
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {kioskState === 'loading' && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-white text-lg font-medium">Đang tải model nhận diện...</p>
        </div>
      )}

      {/* Processing */}
      {kioskState === 'processing' && (
        <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center z-20">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-white text-xl font-semibold drop-shadow">Đang nhận diện...</p>
        </div>
      )}

      {/* Camera error */}
      {cameraError && (
        <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center z-20 p-8 text-center">
          <AlertCircle className="w-20 h-20 text-red-400 mb-6" />
          <p className="text-white text-xl">{cameraError}</p>
        </div>
      )}

      {/* Status bar */}
      {!cameraError && kioskState === 'waiting' && (
        <div
          className="absolute bottom-0 left-0 right-0 z-10 flex flex-col justify-center items-center pb-8 pt-16 gap-3"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }}
        >
          {facePos === 'none' && (
            <div className="flex items-center gap-3 bg-black/50 backdrop-blur-sm px-5 py-2.5 rounded-full border border-white/10">
              <span className="w-2.5 h-2.5 rounded-full animate-pulse bg-yellow-400" />
              <span className="text-sm font-medium text-yellow-200">Chưa phát hiện khuôn mặt</span>
            </div>
          )}
          {facePos === 'multiface' && (
            <div className="flex items-center gap-3 bg-black/50 backdrop-blur-sm px-5 py-2.5 rounded-full border border-red-400/60">
              <span className="w-2.5 h-2.5 rounded-full animate-pulse bg-red-400" />
              <span className="text-sm font-medium text-red-300">Chỉ 1 người trước camera</span>
            </div>
          )}
          {facePos === 'offcenter' && (
            <div className="flex items-center gap-3 bg-black/50 backdrop-blur-sm px-5 py-2.5 rounded-full border border-orange-400/40">
              <span className="w-2.5 h-2.5 rounded-full animate-pulse bg-orange-400" />
              <span className="text-sm font-medium text-orange-300">{statusHint || 'Di chuyển vào giữa màn hình'}</span>
            </div>
          )}
          {facePos === 'centered' && (
            <>
              <div className={`flex items-center gap-3 bg-black/50 backdrop-blur-sm px-5 py-2.5 rounded-full border ${qualityCount > 0 ? 'border-cyan-400/60' : 'border-blue-400/40'}`}>
                <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${qualityCount > 0 ? 'bg-cyan-400' : 'bg-blue-400'}`} />
                <span className={`text-sm font-medium ${qualityCount > 0 ? 'text-cyan-200' : 'text-blue-200'}`}>
                  {statusHint || 'Giữ nguyên để xác minh...'}
                </span>
              </div>
              {qualityCount > 0 && (
                <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 rounded-full transition-all duration-100"
                    style={{ width: `${(qualityCount / QUALITY_GATE) * 100}%` }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Result overlay */}
      {kioskState === 'result' && result && (
        <div className={`absolute inset-0 z-30 flex flex-col items-center justify-center ${overlayBg[result.type]} bg-opacity-90 backdrop-blur-sm`}>
          {overlayIcon[result.type]}
          <h2 className="text-5xl font-bold text-white mt-6 text-center px-8 drop-shadow-lg">{result.title}</h2>
          {result.employee && (
            <p className="text-3xl text-white/90 mt-4 font-semibold text-center drop-shadow">{result.employee}</p>
          )}
          {result.subtitle && (
            <p className="text-2xl text-white/80 mt-2 font-medium text-center drop-shadow">{result.subtitle}</p>
          )}
          {result.time && (
            <p className="text-white/60 mt-6 flex items-center gap-2 text-xl">
              <Clock className="w-6 h-6" /> {result.time}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default FaceKioskPage;
