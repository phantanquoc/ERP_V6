import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import faceAttendanceService, { VerifyResult } from '../../services/faceAttendanceService';

type KioskState = 'idle' | 'scanning' | 'processing' | 'result';

interface ResultDisplay {
  type: 'success' | 'error' | 'info';
  title: string;
  subtitle: string;
  employee?: string;
  time?: string;
}

const SCAN_INTERVAL_MS = 3000; // auto-scan every 3s
const RESULT_DISPLAY_MS = 4000; // show result for 4s

const actionLabel: Record<string, { title: string; type: 'success' | 'error' | 'info' }> = {
  CHECK_IN: { title: '✅ Điểm danh vào', type: 'success' },
  CHECK_OUT: { title: '👋 Điểm danh ra', type: 'success' },
  ALREADY_RECORDED: { title: 'ℹ️ Đã điểm danh hôm nay', type: 'info' },
  NO_MATCH: { title: '❌ Không nhận ra', type: 'error' },
};

const FaceKioskPage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [kioskState, setKioskState] = useState<KioskState>('idle');
  const [result, setResult] = useState<ResultDisplay | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
        setError('');
      }
    } catch (e) {
      setError('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.');
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [startCamera]);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
  }, []);

  const showResult = useCallback((res: VerifyResult) => {
    const action = actionLabel[res.action] ?? { title: res.action, type: 'info' as const };
    setResult({
      type: action.type,
      title: action.title,
      subtitle: res.message,
      employee: res.employee ? `${res.employee.fullName} (${res.employee.employeeCode})` : undefined,
      time: new Date().toLocaleTimeString('vi-VN'),
    });
    setKioskState('result');

    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    resultTimerRef.current = setTimeout(() => {
      setResult(null);
      setKioskState('scanning');
    }, RESULT_DISPLAY_MS);
  }, []);

  const doScan = useCallback(async () => {
    if (kioskState === 'processing') return;
    const image = captureFrame();
    if (!image) return;

    setKioskState('processing');
    try {
      const res = await faceAttendanceService.kioskVerifyDev(image);
      if (res.data) showResult(res.data);
    } catch (e) {
      // silently skip failed scans (e.g. no face detected)
    } finally {
      if (kioskState !== 'result') setKioskState('scanning');
    }
  }, [kioskState, captureFrame, showResult]);

  // Start/stop auto-scan
  const startScanning = useCallback(() => {
    setKioskState('scanning');
    intervalRef.current = setInterval(doScan, SCAN_INTERVAL_MS);
  }, [doScan]);

  const stopScanning = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setKioskState('idle');
  }, []);

  // Restart interval when doScan changes (avoids stale closure)
  useEffect(() => {
    if (kioskState === 'scanning' && cameraReady) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(doScan, SCAN_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [doScan, kioskState, cameraReady]);

  useEffect(() => {
    return () => {
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, []);

  const resultColors: Record<string, string> = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  const resultIcons: Record<string, React.ReactNode> = {
    success: <CheckCircle className="w-20 h-20 text-white" />,
    error: <XCircle className="w-20 h-20 text-white" />,
    info: <AlertCircle className="w-20 h-20 text-white" />,
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Clock */}
      <div className="absolute top-6 right-8 text-white text-right z-10">
        <div className="text-4xl font-mono font-bold">{currentTime.toLocaleTimeString('vi-VN')}</div>
        <div className="text-lg text-gray-300">{currentTime.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>

      {/* Title */}
      <div className="absolute top-6 left-8 text-white z-10">
        <div className="text-2xl font-bold flex items-center gap-2">
          <Camera className="w-7 h-7 text-blue-400" />
          Chấm công khuôn mặt
        </div>
        <div className="text-gray-400 text-sm mt-1">Nhìn thẳng vào camera để điểm danh</div>
      </div>

      {/* Camera feed */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-700"
        style={{ width: 'min(640px, 90vw)', aspectRatio: '4/3' }}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          style={{ transform: 'scaleX(-1)' }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Scanning overlay */}
        {kioskState === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-8 border-2 border-blue-400 rounded-2xl opacity-70 animate-pulse" />
            <div className="absolute bottom-4 left-0 right-0 text-center text-blue-300 text-sm font-medium">
              🔍 Đang nhận diện...
            </div>
          </div>
        )}

        {kioskState === 'processing' && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="flex flex-col items-center text-white">
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-lg font-medium">Đang xử lý...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center text-white p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
            <p className="text-lg font-medium">{error}</p>
            <button onClick={startCamera} className="mt-4 px-4 py-2 bg-blue-600 rounded-lg text-sm hover:bg-blue-700">
              Thử lại
            </button>
          </div>
        )}
      </div>

      {/* Control buttons */}
      {cameraReady && !error && (
        <div className="mt-6 flex gap-4">
          {kioskState === 'idle' && (
            <button
              onClick={startScanning}
              className="px-8 py-3 bg-blue-600 text-white rounded-full text-lg font-semibold hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              <Camera className="w-5 h-5" /> Bắt đầu điểm danh
            </button>
          )}
          {(kioskState === 'scanning' || kioskState === 'processing') && (
            <button
              onClick={stopScanning}
              className="px-8 py-3 bg-gray-600 text-white rounded-full text-lg font-semibold hover:bg-gray-700 flex items-center gap-2 transition-colors"
            >
              Dừng
            </button>
          )}
        </div>
      )}

      {/* Result overlay */}
      {result && kioskState === 'result' && (
        <div className={`absolute inset-0 ${resultColors[result.type]} bg-opacity-90 flex flex-col items-center justify-center z-20 transition-all duration-300`}>
          {resultIcons[result.type]}
          <h2 className="text-4xl font-bold text-white mt-4">{result.title}</h2>
          {result.employee && (
            <p className="text-2xl text-white/90 mt-2 font-medium">{result.employee}</p>
          )}
          <p className="text-white/80 mt-2 text-lg">{result.subtitle}</p>
          {result.time && (
            <p className="text-white/60 mt-4 flex items-center gap-2">
              <Clock className="w-4 h-4" /> {result.time}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default FaceKioskPage;
