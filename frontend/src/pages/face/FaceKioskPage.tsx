import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import faceAttendanceService, { VerifyResult } from '../../services/faceAttendanceService';

type KioskState = 'loading' | 'waiting' | 'processing' | 'result' | 'error';
type FacePos    = 'none' | 'centered' | 'offcenter';

// Face must be within this fraction of the frame center to trigger scan
const CENTER_ZONE = 0.30; // ±30% from center on each axis

interface ResultDisplay {
  type: 'success' | 'info' | 'error';
  title: string;
  employee?: string;
  time?: string;
}

const SCAN_INTERVAL_MS   = 1500;   // AI scan every 1.5s when face detected
const RESULT_DISPLAY_MS  = 4000;   // show result 4s then auto-reset
const MODELS_URL         = '/models';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

// Standby / power-save settings
const IDLE_SLOW_MS       = 30_000; // after 30s no face → slow detection (save CPU)
const IDLE_DIM_MS        = 120_000; // after 2min no face → dim screen
const DETECT_FAST_MS     = 100;    // ~10fps when active
const DETECT_SLOW_MS     = 500;    // ~2fps when idle (saves ~80% CPU)
const CAPTURE_FRAME_COUNT = 4;
const CAPTURE_FRAME_INTERVAL_MS = 90;
const CAPTURE_SIZE = 256;
const FACE_CROP_PADDING = 0.28;

const actionConfig: Record<string, { title: string; type: 'success' | 'info' | 'error' }> = {
  CHECK_IN:         { title: 'Check-in thành công ✅', type: 'success' },
  CHECK_OUT:        { title: 'Check-out thành công 👋', type: 'success' },
  ALREADY_RECORDED: { title: 'Đã điểm danh hôm nay ℹ️', type: 'info' },
  NO_MATCH:         { title: 'Vui lòng thử lại', type: 'error' },
};

const FaceKioskPage: React.FC = () => {
  const videoRef      = useRef<HTMLVideoElement>(null);
  const overlayRef    = useRef<HTMLCanvasElement>(null);
  const captureRef    = useRef<HTMLCanvasElement>(null);
  const rafRef        = useRef<number>(0);
  const scanTimer     = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processing    = useRef(false);
  const faceDetected  = useRef(false);
  const lastFaceAt    = useRef<number>(Date.now());
  const detectInterval= useRef<number>(DETECT_FAST_MS);
  // Liveness: blink detection + motion
  const lastEye       = useRef<{ leftEAR: number; rightEAR: number } | null>(null);
  const blinks        = useRef<number>(0); // blink count for liveness
  const hasMoved      = useRef<boolean>(false); // head/face moved
  const lastFaceBox   = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const currentFaceBox = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const [kioskState, setKioskState]   = useState<KioskState>('loading');
  const [result, setResult]           = useState<ResultDisplay | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [facePos, setFacePos]         = useState<FacePos>('none');
  const [dimmed, setDimmed]           = useState(false);
  const [livenessStatus, setLivenessStatus] = useState(''); // UI feedback

  const kioskConfig = faceAttendanceService.getKioskConfig();
  const isLocalDev = import.meta.env.DEV || LOCAL_HOSTS.has(window.location.hostname);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Capture frame for AI (from hidden canvas, no mirror flip)
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
      const padX = faceBox.width * FACE_CROP_PADDING;
      const padY = faceBox.height * FACE_CROP_PADDING;
      const sx = Math.max(0, Math.floor(faceBox.x - padX));
      const sy = Math.max(0, Math.floor(faceBox.y - padY));
      const sw = Math.min(vw - sx, Math.ceil(faceBox.width + padX * 2));
      const sh = Math.min(vh - sy, Math.ceil(faceBox.height + padY * 2));
      canvas.width = CAPTURE_SIZE;
      canvas.height = CAPTURE_SIZE;
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, CAPTURE_SIZE, CAPTURE_SIZE);
    } else {
      canvas.width = CAPTURE_SIZE;
      canvas.height = CAPTURE_SIZE;
      ctx.drawImage(video, 0, 0, vw, vh, 0, 0, CAPTURE_SIZE, CAPTURE_SIZE);
    }

    return canvas.toDataURL('image/jpeg', 0.72).split(',')[1];
  }, []);

  const captureFrames = useCallback(async (): Promise<string[]> => {
    const frames: string[] = [];
    for (let i = 0; i < CAPTURE_FRAME_COUNT; i += 1) {
      const frame = captureFrame();
      if (frame) frames.push(frame);
      if (i < CAPTURE_FRAME_COUNT - 1) {
        await new Promise(resolve => window.setTimeout(resolve, CAPTURE_FRAME_INTERVAL_MS));
      }
    }
    return frames;
  }, [captureFrame]);

  // Adaptive detection loop:
  // - Runs at DETECT_FAST_MS (~10fps) when active
  // - Drops to DETECT_SLOW_MS (~2fps) after IDLE_SLOW_MS of no face
  // - Dims screen after IDLE_DIM_MS of no face; brightens on face detected
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

    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.45 }))
      .withFaceLandmarks(true);

    ctx.clearRect(0, 0, vw, vh);

    const now = Date.now();

    if (detections.length > 0) {
      const det = detections[0];
      const box = det.detection.box;

      const faceCx = box.x + box.width  / 2;
      const faceCy = box.y + box.height / 2;
      const dx = Math.abs(faceCx / vw - 0.5);
      const dy = Math.abs(faceCy / vh - 0.5);
      const isCentered = dx < CENTER_ZONE && dy < CENTER_ZONE;

      // Face seen — reset idle timers, wake screen
      lastFaceAt.current = now;
      detectInterval.current = DETECT_FAST_MS;
      setDimmed(false);

      faceDetected.current = isCentered;
      setFacePos(isCentered ? 'centered' : 'offcenter');
      currentFaceBox.current = { x: box.x, y: box.y, width: box.width, height: box.height };

      // ── Simple liveness: blink + motion detection ──────────────────
      // Blink: EAR dip below 0.20 then recovery
      // Motion: face moved > 10% width
      if (det.landmarks) {
        const landmarks = det.landmarks.positions;
        
        // Compute EAR for both eyes
        const computeEAR = (topIdx: number, botIdx: number, inIdx: number, outIdx: number) => {
          const top = landmarks[topIdx];
          const bot = landmarks[botIdx];
          const inn = landmarks[inIdx];
          const out = landmarks[outIdx];
          
          const vert = Math.hypot(top.y - bot.y, top.x - bot.x);
          const horiz = Math.hypot(out.x - inn.x, out.y - inn.y);
          return vert / (2 * horiz);
        };
        
        // face-api.js landmark indices (68-point model):
        // left eye: 36-41, right eye: 42-47
        const leftEAR = computeEAR(37, 40, 36, 39);   // top, bot, inner, outer
        const rightEAR = computeEAR(43, 46, 42, 45);
        const currentEAR = (leftEAR + rightEAR) / 2;
        
        // Detect blink: EAR < 0.20 (closed), then recovery to > 0.25 (open)
        if (lastEye.current) {
          const prevEAR = (lastEye.current.leftEAR + lastEye.current.rightEAR) / 2;
          const wasClosed = prevEAR < 0.20;
          const isOpen = currentEAR > 0.25;
          if (wasClosed && isOpen) {
            blinks.current++;
            console.log('[kiosk] blink detected:', blinks.current);
          }
        }
        lastEye.current = { leftEAR, rightEAR };
        
        // Detect motion: face moved significantly
        if (lastFaceBox.current) {
          const dx = Math.abs(box.x - lastFaceBox.current.x);
          const dy = Math.abs(box.y - lastFaceBox.current.y);
          const dw = Math.abs(box.width - lastFaceBox.current.width);
          if (dx > box.width * 0.10 || dy > box.height * 0.10 || dw > box.width * 0.10) {
            hasMoved.current = true;
          }
        }
        lastFaceBox.current = { x: box.x, y: box.y, width: box.width, height: box.height };
        
        // Liveness OK: ≥1 blink OR significant motion
        const livenessOk = blinks.current >= 1 || hasMoved.current;
        setLivenessStatus(
          livenessOk
            ? `✓ Đã xác minh (blinks: ${blinks.current})`
            : `Vui lòng chớp mắt hoặc xoay đầu (blinks: ${blinks.current})`
        );
      }
      // ─────────────────────────────────────────────────────────────────────

      const color = isCentered ? '#22d3ee' : '#f59e0b';

      // 4-corner square marker only
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
      drawCorner(box.x, box.y, 1, 1);
      drawCorner(box.x + box.width, box.y, -1, 1);
      drawCorner(box.x, box.y + box.height, 1, -1);
      drawCorner(box.x + box.width, box.y + box.height, -1, -1);

      // Small landmark dots for face alignment
      det.landmarks.positions.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 1.1, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
    } else {
      faceDetected.current = false;
      setFacePos('none');
      currentFaceBox.current = null;
      // Reset liveness when face leaves frame
      lastEye.current     = null;
      lastFaceBox.current = null;
      blinks.current      = 0;
      hasMoved.current    = false;
      setLivenessStatus('');

      const idleMs = now - lastFaceAt.current;
      // Slow down detection when idle
      if (idleMs > IDLE_SLOW_MS) detectInterval.current = DETECT_SLOW_MS;
      // Dim screen when very idle
      if (idleMs > IDLE_DIM_MS) setDimmed(true);
    }

    rafRef.current = window.setTimeout(drawLoop, detectInterval.current);
  }, []);

  // Show result overlay and auto-reset
  const showResult = useCallback((res: VerifyResult) => {
    const hasValidAction = !!res.action && !!actionConfig[res.action];
    const isFailed = res.matched === false || !hasValidAction || res.action === 'NO_MATCH';
    const cfg = isFailed
      ? { title: 'Vui lòng thử lại', type: 'error' as const }
      : actionConfig[res.action as keyof typeof actionConfig];
    const emp = res.employee;
    const nameLine = emp
      ? emp.department
        ? `${emp.fullName} — ${emp.department}`
        : emp.fullName
      : res.message;
    setResult({
      type: cfg.type,
      title: cfg.title,
      employee: nameLine,
      time: new Date().toLocaleTimeString('vi-VN'),
    });
    setKioskState('result');

    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      setResult(null);
      setKioskState('waiting');
      processing.current = false;
    }, RESULT_DISPLAY_MS);
  }, []);

  // Single AI scan — only fires when face centered AND liveness confirmed
  const doScan = useCallback(async () => {
    const livenessOk = blinks.current >= 1 || hasMoved.current;
    if (processing.current || !faceDetected.current || !livenessOk) return;
    processing.current = true;
    setKioskState('processing');
    // Reset liveness for next person
    blinks.current      = 0;
    hasMoved.current    = false;
    lastEye.current     = null;
    lastFaceBox.current = null;
    setLivenessStatus('');
    try {
      const frames = await captureFrames();
      const image = frames[Math.floor(frames.length / 2)];
      if (!image) {
        processing.current = false;
        setKioskState('waiting');
        return;
      }
      const res = kioskConfig.deviceKey
        ? await faceAttendanceService.kioskVerify(image, frames, kioskConfig.deviceKey, kioskConfig.deviceId)
        : isLocalDev
          ? await faceAttendanceService.kioskVerifyDev(image, frames)
          : (() => { throw new Error('Thiết bị chưa được cấu hình device key'); })();
      if (res.data) {
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
  }, [captureFrames, showResult, isLocalDev, kioskConfig.deviceId, kioskConfig.deviceKey]);

  // Load models → start camera → start loops
  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        // Load face-api.js models
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_URL),
        ]);
        if (!active) return;

        if (!kioskConfig.deviceKey && !isLocalDev) {
          setCameraError('Thiết bị chưa được cấu hình device key cho kiosk production.');
          return;
        }

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
        scanTimer.current = setInterval(doScan, SCAN_INTERVAL_MS);
      } catch (e) {
        if (active) setCameraError('Không thể khởi động camera hoặc tải model nhận diện.');
      }
    };
    init();

    return () => {
      active = false;
      clearTimeout(rafRef.current);
      if (scanTimer.current)  clearInterval(scanTimer.current);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      if (videoRef.current?.srcObject)
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    };
  }, [drawLoop, doScan, isLocalDev, kioskConfig.deviceKey]);

  // ── Result overlay colors ──
  const overlayBg: Record<string, string> = {
    success: 'bg-green-500',
    info:    'bg-blue-500',
    error:   'bg-red-500',
  };
  const overlayIcon: Record<string, React.ReactNode> = {
    success: <CheckCircle className="w-24 h-24 text-white" />,
    info:    <AlertCircle className="w-24 h-24 text-white" />,
    error:   <XCircle    className="w-24 h-24 text-white" />,
  };

  return (
    <div className="fixed inset-0 bg-black select-none overflow-hidden">

      {/* ── Dim overlay — fades in after 2min no face, instant wake on face detected ── */}
      <div
        className="absolute inset-0 z-40 bg-black pointer-events-none transition-opacity duration-[3000ms]"
        style={{ opacity: dimmed ? 0.82 : 0 }}
      />

      {/* ── Camera: full screen ──────────────────────── */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        muted playsInline autoPlay
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Overlay canvas — landmarks (full screen, same flip) */}
      <canvas
        ref={overlayRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Hidden canvas for AI capture (no flip) */}
      <canvas ref={captureRef} className="hidden" />

      {/* ── Top overlay bar ─────────────────────────── */}
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

      {/* ── Face guide oval ─────────────────────────── */}
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

      {/* ── Loading models ───────────────────────────── */}
      {kioskState === 'loading' && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-white text-lg font-medium">Đang tải model nhận diện...</p>
        </div>
      )}

      {/* ── Processing spinner ───────────────────────── */}
      {kioskState === 'processing' && (
        <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center z-20">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-white text-xl font-semibold drop-shadow">Đang nhận diện...</p>
        </div>
      )}

      {/* ── Camera error ────────────────────────────── */}
      {cameraError && (
        <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center z-20 p-8 text-center">
          <AlertCircle className="w-20 h-20 text-red-400 mb-6" />
          <p className="text-white text-xl">{cameraError}</p>
        </div>
      )}

      {/* ── Status bar (bottom) ─────────────────────── */}
      {!cameraError && kioskState === 'waiting' && (
        <div
          className="absolute bottom-0 left-0 right-0 z-10 flex justify-center items-end pb-8 pt-16"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }}
        >
          {facePos === 'none' && (
            <div className="flex items-center gap-3 bg-black/50 backdrop-blur-sm px-5 py-2.5 rounded-full border border-white/10">
              <span className="w-2.5 h-2.5 rounded-full animate-pulse bg-yellow-400" />
              <span className="text-sm font-medium text-yellow-200">Chưa phát hiện khuôn mặt</span>
            </div>
          )}
          {facePos === 'offcenter' && (
            <div className="flex items-center gap-3 bg-black/50 backdrop-blur-sm px-5 py-2.5 rounded-full border border-orange-400/40">
              <span className="w-2.5 h-2.5 rounded-full animate-pulse bg-orange-400" />
              <span className="text-sm font-medium text-orange-300">Vui lòng di chuyển ra giữa màn hình</span>
            </div>
          )}
       {facePos === 'centered' && (
            <div className="flex items-center gap-3 bg-black/50 backdrop-blur-sm px-5 py-2.5 rounded-full border border-blue-400/40">
              <span className="w-2.5 h-2.5 rounded-full animate-pulse bg-blue-400" />
              <span className="text-sm font-medium text-blue-200">{livenessStatus || 'Vui lòng chớp mắt hoặc xoay đầu...'}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Result overlay (full screen) ────────────── */}
      {kioskState === 'result' && result && (
        <div className={`absolute inset-0 z-30 flex flex-col items-center justify-center ${overlayBg[result.type]} bg-opacity-90 backdrop-blur-sm`}>
          {overlayIcon[result.type]}
          <h2 className="text-5xl font-bold text-white mt-6 text-center px-8 drop-shadow-lg">{result.title}</h2>
          {result.employee && (
            <p className="text-3xl text-white/90 mt-4 font-semibold text-center drop-shadow">{result.employee}</p>
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
