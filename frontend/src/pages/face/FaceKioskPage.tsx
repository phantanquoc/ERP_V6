import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import faceAttendanceService, { VerifyResult } from '../../services/faceAttendanceService';

type KioskState = 'loading' | 'waiting' | 'processing' | 'result' | 'error';

interface ResultDisplay {
  type: 'success' | 'info' | 'error';
  title: string;
  employee?: string;
  time?: string;
}

const SCAN_INTERVAL_MS = 1500;  // AI scan every 1.5s when face detected
const RESULT_DISPLAY_MS = 4000; // show result 4s then auto-reset
const MODELS_URL = '/models';

const actionConfig: Record<string, { title: string; type: 'success' | 'info' | 'error' }> = {
  CHECK_IN:         { title: 'Check-in thành công ✅', type: 'success' },
  CHECK_OUT:        { title: 'Check-out thành công 👋', type: 'success' },
  ALREADY_RECORDED: { title: 'Đã điểm danh hôm nay ℹ️', type: 'info' },
  NO_MATCH:         { title: 'Không nhận ra khuôn mặt ❌', type: 'error' },
};

const FaceKioskPage: React.FC = () => {
  const videoRef      = useRef<HTMLVideoElement>(null);
  const overlayRef    = useRef<HTMLCanvasElement>(null); // for drawing landmarks
  const captureRef    = useRef<HTMLCanvasElement>(null); // hidden, for AI capture
  const rafRef        = useRef<number>(0);
  const scanTimer     = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processing    = useRef(false);
  const faceDetected  = useRef(false);


  const [kioskState, setKioskState]   = useState<KioskState>('loading');
  const [result, setResult]           = useState<ResultDisplay | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasFace, setHasFace]         = useState(false);

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
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
  }, []);

  // Draw face landmarks on overlay canvas (realtime RAF loop)
  const drawLoop = useCallback(async () => {
    const video   = videoRef.current;
    const overlay = overlayRef.current;

    if (!video || !overlay || video.readyState < 2 || !video.videoWidth) {
      rafRef.current = requestAnimationFrame(drawLoop);
      return;
    }

    // Use video's NATURAL pixel dimensions — no resize needed, CSS stretches canvas
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (overlay.width !== vw || overlay.height !== vh) {
      overlay.width  = vw;
      overlay.height = vh;
    }

    const ctx = overlay.getContext('2d');
    if (!ctx) { rafRef.current = requestAnimationFrame(drawLoop); return; }

    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.45 }))
      .withFaceLandmarks(true);

    ctx.clearRect(0, 0, vw, vh);

    if (detections.length > 0) {
      faceDetected.current = true;
      setHasFace(true);

      detections.forEach(det => {
        const box = det.detection.box;

        // Bounding box
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth   = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // 68 landmark dots
        det.landmarks.positions.forEach(pt => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = '#00ff88';
          ctx.fill();
        });

        // Confidence label
        ctx.fillStyle = '#00ff88';
        ctx.font      = `bold ${Math.round(vw / 40)}px monospace`;
        ctx.fillText(
          `${(det.detection.score * 100).toFixed(0)}%`,
          box.x + 4,
          box.y > 20 ? box.y - 6 : box.y + 20
        );
      });
    } else {
      faceDetected.current = false;
      setHasFace(false);
    }

    rafRef.current = requestAnimationFrame(drawLoop);
  }, []);

  // Show result overlay and auto-reset
  const showResult = useCallback((res: VerifyResult) => {
    const cfg = actionConfig[res.action] ?? { title: res.action, type: 'info' as const };
    setResult({
      type: cfg.type,
      title: cfg.title,
      employee: res.employee
        ? `${res.employee.fullName} (${res.employee.employeeCode})`
        : undefined,
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

  // Single AI scan — only fires when faceDetected.current === true
  const doScan = useCallback(async () => {
    if (processing.current || !faceDetected.current) return;
    const image = captureFrame();
    if (!image) return;

    processing.current = true;
    setKioskState('processing');
    try {
      const res = await faceAttendanceService.kioskVerifyDev(image);
      if (res.data) {
        showResult(res.data);
      } else {
        processing.current = false;
        setKioskState('waiting');
      }
    } catch {
      processing.current = false;
      setKioskState('waiting');
    }
  }, [captureFrame, showResult]);

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

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        setKioskState('waiting');
        rafRef.current = requestAnimationFrame(drawLoop);
        scanTimer.current = setInterval(doScan, SCAN_INTERVAL_MS);
      } catch (e) {
        if (active) setCameraError('Không thể khởi động camera hoặc tải model nhận diện.');
      }
    };
    init();

    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
      if (scanTimer.current)  clearInterval(scanTimer.current);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      if (videoRef.current?.srcObject)
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    };
  }, [drawLoop, doScan]);

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
        className="absolute inset-0 w-full h-full pointer-events-none"
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
      {kioskState === 'waiting' && !hasFace && (
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
          <div className="flex items-center gap-3 bg-black/50 backdrop-blur-sm px-5 py-2.5 rounded-full border border-white/10">
            <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${hasFace ? 'bg-green-400' : 'bg-yellow-400'}`} />
            <span className={`text-sm font-medium ${hasFace ? 'text-green-300' : 'text-yellow-200'}`}>
              {hasFace ? 'Phát hiện khuôn mặt — đang xử lý...' : 'Chưa phát hiện khuôn mặt'}
            </span>
          </div>
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
