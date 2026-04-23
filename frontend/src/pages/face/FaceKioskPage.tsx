import React, { useRef, useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import faceAttendanceService, { VerifyResult } from '../../services/faceAttendanceService';

type KioskState = 'waiting' | 'processing' | 'result' | 'error';

interface ResultDisplay {
  type: 'success' | 'info' | 'error';
  title: string;
  employee?: string;
  time?: string;
}

const SCAN_INTERVAL_MS = 1000;   // scan every 1s
const RESULT_DISPLAY_MS = 4000;  // show result 4s then auto-reset

const actionConfig: Record<string, { title: string; type: 'success' | 'info' | 'error' }> = {
  CHECK_IN:         { title: 'Check-in thành công ✅', type: 'success' },
  CHECK_OUT:        { title: 'Check-out thành công 👋', type: 'success' },
  ALREADY_RECORDED: { title: 'Đã điểm danh hôm nay ℹ️', type: 'info' },
  NO_MATCH:         { title: 'Không nhận ra khuôn mặt ❌', type: 'error' },
};

const FaceKioskPage: React.FC = () => {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const scanTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processing = useRef(false);

  const [kioskState, setKioskState]   = useState<KioskState>('waiting');
  const [result, setResult]           = useState<ResultDisplay | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Capture frame from video
  const captureFrame = useCallback((): string | null => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
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

  // Single scan attempt
  const doScan = useCallback(async () => {
    if (processing.current) return;
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

  // Start camera + auto-scan on mount
  useEffect(() => {
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        // Start continuous scan
        scanTimer.current = setInterval(doScan, SCAN_INTERVAL_MS);
      } catch (e) {
        setCameraError('Không thể mở camera. Kiểm tra quyền truy cập trình duyệt.');
      }
    };
    init();

    return () => {
      if (scanTimer.current)  clearInterval(scanTimer.current);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []); // run once on mount — doScan captured via ref logic

  // Keep interval's closure fresh when doScan changes
  useEffect(() => {
    if (!scanTimer.current) return;
    clearInterval(scanTimer.current);
    scanTimer.current = setInterval(doScan, SCAN_INTERVAL_MS);
  }, [doScan]);

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
    <div className="min-h-screen bg-gray-900 flex flex-col select-none overflow-hidden relative">

      {/* ── Top bar ─────────────────────────────────── */}
      <div className="flex items-center justify-between px-8 py-4 z-10">
        <div className="text-white">
          <p className="text-xl font-bold tracking-wide">CHẤM CÔNG KHUÔN MẶT</p>
          <p className="text-gray-400 text-sm">Đứng trước camera để điểm danh</p>
        </div>
        <div className="text-right text-white">
          <p className="text-4xl font-mono font-bold tabular-nums">
            {currentTime.toLocaleTimeString('vi-VN')}
          </p>
          <p className="text-gray-400 text-sm">
            {currentTime.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* ── Camera ──────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-8 pb-8">
        <div
          className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-700 bg-black"
          style={{ width: 'min(640px, 90vw)', aspectRatio: '4/3' }}
        >
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted playsInline
            style={{ transform: 'scaleX(-1)' }}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Face guide oval */}
          {kioskState === 'waiting' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="border-2 border-blue-400 border-dashed rounded-full opacity-60 animate-pulse"
                style={{ width: '55%', height: '80%' }}
              />
              <p className="absolute bottom-4 text-blue-300 text-sm font-medium">
                Đặt khuôn mặt vào khung
              </p>
            </div>
          )}

          {/* Processing spinner */}
          {kioskState === 'processing' && (
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
              <div className="w-14 h-14 border-4 border-white border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-white text-lg font-medium">Đang nhận diện...</p>
            </div>
          )}

          {/* Camera error */}
          {cameraError && (
            <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center p-8 text-center">
              <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
              <p className="text-white text-lg">{cameraError}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Status bar ──────────────────────────────── */}
      {!cameraError && kioskState === 'waiting' && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
          <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-full text-gray-400 text-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Camera đang hoạt động — đứng trước camera để điểm danh
          </div>
        </div>
      )}

      {/* ── Result overlay (full screen) ────────────── */}
      {kioskState === 'result' && result && (
        <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center ${overlayBg[result.type]} bg-opacity-95`}>
          {overlayIcon[result.type]}
          <h2 className="text-4xl font-bold text-white mt-5 text-center px-4">{result.title}</h2>
          {result.employee && (
            <p className="text-2xl text-white/90 mt-3 font-semibold text-center">{result.employee}</p>
          )}
          {result.time && (
            <p className="text-white/60 mt-4 flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5" /> {result.time}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default FaceKioskPage;
