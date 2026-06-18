import React, { useRef, useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import faceAttendanceService, { VerifyResult } from '../../services/faceAttendanceService';
import { loadFaceMesh } from '../../utils/loadFaceMesh';
import { ScreenSpoofDetector } from '../../utils/screenSpoofDetector';

/* eslint-disable @typescript-eslint/no-explicit-any */
type FaceMeshInstance = any;
type NLM = { x: number; y: number; z: number };

type KioskState = 'loading' | 'waiting' | 'processing' | 'result' | 'error';
type FacePos    = 'none' | 'centered' | 'offcenter' | 'multiface';

const CENTER_ZONE       = 0.30;
const MAX_YAW           = 0.25;
const MAX_PITCH         = 0.28;
const MIN_FACE_AREA     = 0.04;
const STABLE_FRAMES     = 3;
const MIN_STABLE_MS     = 600;

const L_EYE = [33, 160, 158, 133, 153, 144];
const R_EYE = [362, 385, 387, 263, 373, 380];
const NOSE_TIP = 1;
const MOUTH = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375];

interface ResultDisplay {
  type: 'success' | 'info' | 'error' | 'warning';
  title: string;
  employee?: string;
  subtitle?: string;
  time?: string;
}

const RESULT_DISPLAY_MS       = 4000;
const RESULT_DISPLAY_ERROR_MS = 1500;

const PROCESSING_STEPS = [
  'Đang phân tích khuôn mặt...',
  'Đang đối chiếu danh tính...',
  'Đang ghi nhận chấm công...',
];
const PROCESSING_STEP_MS = 1200;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

const IDLE_SLOW_MS   = 30_000;
const IDLE_DIM_MS    = 60_000;
const IDLE_SLEEP_MS  = 120_000;
const DETECT_FAST_MS = 100;
const DETECT_SLOW_MS = 500;
const CAPTURE_SIZE   = 480;
const FACE_CROP_PADDING = 0.60;

const actionConfig: Record<string, { title: string; type: 'success' | 'info' | 'error' | 'warning' }> = {
  CHECK_IN:         { title: 'Check-in thành công', type: 'success' },
  CHECK_OUT:        { title: 'Check-out thành công', type: 'success' },
  ALREADY_RECORDED: { title: 'Đã điểm danh hôm nay', type: 'info' },
  NO_MATCH:         { title: 'Không nhận diện được', type: 'error' },
  COOLDOWN:         { title: 'Vui lòng chờ', type: 'warning' },
};

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

const FaceKioskPageV2: React.FC = () => {
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
  const latestDet      = useRef<{ lms: NLM[]; box: { x: number; y: number; width: number; height: number }; score: number; faceCount: number } | null>(null);
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const drawLoopRef    = useRef<() => void>(() => {});

  const qualityBuffer  = useRef<{ frame: string; score: number }[]>([]);
  const spoofDetector  = useRef<ScreenSpoofDetector>(new ScreenSpoofDetector());
  const stableStartRef = useRef<number>(0);

  const [kioskState, setKioskState]     = useState<KioskState>('loading');
  const [result, setResult]             = useState<ResultDisplay | null>(null);
  const [cameraError, setCameraError]   = useState('');
  const [currentTime, setCurrentTime]   = useState(new Date());
  const [facePos, setFacePos]           = useState<FacePos>('none');
  const [dimmed, setDimmed]             = useState(false);
  const [sleeping, setSleeping]         = useState(false);
  const [qualityCount, setQualityCount] = useState(0);
  const [statusHint, setStatusHint]     = useState('');
  const [spoofDetected, setSpoofDetected] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);

  const [accessGranted, setAccessGranted] = useState<boolean | null>(null);

  const kioskConfig = faceAttendanceService.getKioskConfig();
  const isLocalDev  = import.meta.env.DEV || LOCAL_HOSTS.has(window.location.hostname);

  useEffect(() => {
    if (isLocalDev) { setAccessGranted(true); return; }
    const { deviceKey } = kioskConfig;
    if (deviceKey) {
      faceAttendanceService.validateDeviceKey(deviceKey).then(valid => setAccessGranted(valid));
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const key = params.get('key');
    if (!key) { setAccessGranted(false); return; }
    faceAttendanceService.validateKioskSession(key).then(valid => setAccessGranted(valid));
  }, [isLocalDev]);

  // --- PLACEHOLDER_CALLBACKS ---

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
    } catch { /* AudioContext blocked */ }
  }, []);

  const speak = useCallback((text: string) => {
    try {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'vi-VN';
      utter.rate = 0.85;
      utter.volume = 1.0;
      window.speechSynthesis.speak(utter);
    } catch { /* Speech not supported */ }
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (kioskState !== 'processing') { setProcessingStep(0); return; }
    const t = setInterval(() => {
      setProcessingStep(s => (s + 1) % PROCESSING_STEPS.length);
    }, PROCESSING_STEP_MS);
    return () => clearInterval(t);
  }, [kioskState]);

  const enterSleep = useCallback(() => {
    clearTimeout(rafRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    latestDet.current = null;
    currentFaceBox.current = null;
    spoofDetector.current.reset();
    setSleeping(true);
    setDimmed(true);
    setFacePos('none');
    setStatusHint('');
    setQualityCount(0);
  }, []);

  const wakeUp = useCallback(async () => {
    if (!sleeping) return;
    setSleeping(false);
    setDimmed(false);
    lastFaceAt.current = Date.now();
    detectInterval.current = DETECT_FAST_MS;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setKioskState('waiting');
      rafRef.current = window.setTimeout(() => drawLoopRef.current(), DETECT_FAST_MS);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setCameraError(`Không thể bật lại camera: ${errMsg}`);
    }
  }, [sleeping]);

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
      const side = Math.min(vw, vh);
      const sx = Math.round((vw - side) / 2);
      const sy = Math.round((vh - side) / 2);
      canvas.width  = CAPTURE_SIZE;
      canvas.height = CAPTURE_SIZE;
      ctx.drawImage(video, sx, sy, side, side, 0, 0, CAPTURE_SIZE, CAPTURE_SIZE);
    }
    return canvas.toDataURL('image/jpeg', 0.90).split(',')[1];
  }, []);

  const resetQualityGate = useCallback(() => {
    qualityBuffer.current = [];
    stableStartRef.current = 0;
    setQualityCount(0);
  }, []);

  // --- PLACEHOLDER_SHOWRESULT ---

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

    let subtitle: string | undefined;
    if (res.action === 'CHECK_IN' && res.lateMinutes && res.lateMinutes > 0) {
      subtitle = `Đi muộn ${res.lateMinutes} phút`;
    } else if (res.action === 'COOLDOWN') {
      subtitle = res.message;
    }

    playBeep(cfg.type);
    if (res.action === 'CHECK_IN' && emp) speak(`${emp.fullName} đã chấm công vào`);
    else if (res.action === 'CHECK_OUT' && emp) speak(`${emp.fullName} đã chấm công ra`);
    setResult({ type: cfg.type, title: cfg.title, employee: nameLine, subtitle, time: new Date().toLocaleTimeString('vi-VN') });
    setKioskState('result');
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      setResult(null);
      setKioskState('waiting');
      processing.current = false;
    }, cfg.type === 'error' ? RESULT_DISPLAY_ERROR_MS : RESULT_DISPLAY_MS);
  }, [playBeep, speak]);

  const doScan = useCallback(async (bestImage: string, frames: string[]) => {
    if (processing.current) return;
    processing.current = true;
    setKioskState('processing');
    setStatusHint('');
    try {
      const res = kioskConfig.deviceKey
        ? await faceAttendanceService.kioskVerify(bestImage, frames, kioskConfig.deviceKey, kioskConfig.deviceId)
        : isLocalDev
          ? await faceAttendanceService.kioskVerifyDev(bestImage, frames)
          : (() => { throw new Error('Thiết bị chưa được cấu hình device key'); })();
      if (res.data) {
        if (res.data.topK?.length) {
          console.group('[face-kiosk-v2] TopK matches');
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

  // --- PLACEHOLDER_DRAWLOOP ---

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

    if (faceMeshRef.current) {
      await faceMeshRef.current.send({ image: video });
    }

    ctx.clearRect(0, 0, vw, vh);
    const now = Date.now();
    const detection = latestDet.current;

    // Multi-face reject
    if (detection && detection.faceCount > 1) {
      lastFaceAt.current    = now;
      detectInterval.current = DETECT_FAST_MS;
      setDimmed(false);
      setFacePos('multiface');
      if (!processing.current) resetQualityGate();
      ctx.fillStyle = 'rgba(239,68,68,0.25)';
      ctx.fillRect(0, 0, vw, vh);
      rafRef.current = window.setTimeout(drawLoop, detectInterval.current);
      return;
    }

    if (detection) {
      const { lms, box, score: detScore } = detection;

      // Screen spoof detection
      spoofDetector.current.addLandmarkSnapshot(lms, vw, vh);
      const spoofResult = spoofDetector.current.detect(video, box, vw, vh);
      setSpoofDetected(spoofResult.isSpoof);

      if (spoofResult.isSpoof && !processing.current) {
        resetQualityGate();
        setStatusHint('Phát hiện màn hình — vui lòng không dùng ảnh');
        setFacePos('centered');
        rafRef.current = window.setTimeout(drawLoop, detectInterval.current);
        return;
      }

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

      const { yaw, pitch } = computeKioskPose(lms, vw, vh);
      const isFacingStraight = Math.abs(yaw) <= MAX_YAW && Math.abs(pitch) <= MAX_PITCH;

      // Passive flow: collect frames when face is good, send when stable enough
      const isGoodFrame = isCentered && isFacingStraight
        && detScore >= 0.3
        && faceAreaRatio >= MIN_FACE_AREA;

      if (isGoodFrame && !processing.current) {
        if (stableStartRef.current === 0) stableStartRef.current = now;

        const frame = captureFrame();
        if (frame) {
          if (qualityBuffer.current.length < STABLE_FRAMES) {
            qualityBuffer.current.push({ frame, score: detScore });
          } else {
            qualityBuffer.current.shift();
            qualityBuffer.current.push({ frame, score: detScore });
          }
          const count = qualityBuffer.current.length;
          setQualityCount(count);

          const stableMs = now - stableStartRef.current;
          if (count >= STABLE_FRAMES && stableMs >= MIN_STABLE_MS) {
            const buf  = qualityBuffer.current;
            const best = buf.reduce((a, b) => b.score > a.score ? b : a);
            const frames = buf.map(f => f.frame);
            qualityBuffer.current = [];
            stableStartRef.current = 0;
            setQualityCount(0);
            spoofDetector.current.reset();
            doScan(best.frame, frames);
          } else {
            setStatusHint('Đang nhận diện...');
          }
        }
      } else if (!processing.current) {
        if (qualityBuffer.current.length > 0) resetQualityGate();
        if (!isCentered)            setStatusHint('Di chuyển vào giữa màn hình');
        else if (!isFacingStraight)  setStatusHint('Nhìn thẳng vào màn hình');
        else if (faceAreaRatio < MIN_FACE_AREA) setStatusHint('Lại gần camera hơn');
        else setStatusHint('Giữ nguyên...');
      }

      // Draw face corners
      const color = isGoodFrame ? '#22d3ee' : '#f59e0b';
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

      lms.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x * vw, pt.y * vh, 1.0, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });

    } else {
      setFacePos('none');
      currentFaceBox.current = null;
      spoofDetector.current.reset();
      setSpoofDetected(false);
      if (!processing.current) {
        resetQualityGate();
        setStatusHint('');
      }
      const idleMs = now - lastFaceAt.current;
      if (idleMs > IDLE_SLOW_MS) detectInterval.current = DETECT_SLOW_MS;
      if (idleMs > IDLE_DIM_MS)  setDimmed(true);
      if (idleMs > IDLE_SLEEP_MS) { enterSleep(); return; }
    }

    rafRef.current = window.setTimeout(drawLoop, detectInterval.current);
  }, [captureFrame, doScan, resetQualityGate, enterSleep]);

  drawLoopRef.current = drawLoop;

  // --- PLACEHOLDER_INIT ---

  useEffect(() => {
    if (accessGranted !== true) return;
    let active = true;

    const init = async () => {
      let mesh: FaceMeshInstance | null = null;
      try {
        const FaceMeshCtor = await loadFaceMesh();
        mesh = new FaceMeshCtor({
          locateFile: (file: string) => `/mediapipe/${file}`,
        });
        mesh.setOptions({
          maxNumFaces: 4,
          refineLandmarks: true,
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
      } catch (modelErr) {
        const errMsg = modelErr instanceof Error ? `${modelErr.name}: ${modelErr.message}` : String(modelErr);
        mesh?.close();
        if (active) setCameraError(`Không thể tải model nhận diện: ${errMsg}`);
        return;
      }

      if (!active) { mesh.close(); return; }
      faceMeshRef.current = mesh;

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
  }, [drawLoop, isLocalDev, kioskConfig.deviceKey, accessGranted]);

  // --- PLACEHOLDER_RENDER ---

  const overlayBg: Record<string, string> = {
    success: 'bg-green-500', info: 'bg-blue-500', error: 'bg-red-500', warning: 'bg-amber-500',
  };
  const overlayIcon: Record<string, React.ReactNode> = {
    success: <CheckCircle className="w-24 h-24 text-white" />,
    info:    <AlertCircle className="w-24 h-24 text-white" />,
    error:   <XCircle    className="w-24 h-24 text-white" />,
    warning: <AlertCircle className="w-24 h-24 text-white" />,
  };

  if (accessGranted === false) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center">
        <p className="text-white text-2xl font-semibold">Truy cập bị từ chối</p>
        <p className="text-white/60 text-sm mt-2">Thiết bị kiosk cần session key hợp lệ</p>
      </div>
    );
  }

  if (sleeping) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center cursor-pointer" onClick={wakeUp}>
        <div className="flex flex-col items-center gap-4 opacity-30">
          <div className="border-2 border-white/60 border-dashed rounded-full animate-pulse"
            style={{ width: 'min(180px, 25vw)', height: 'min(220px, 30vh)' }} />
          <p className="text-white text-lg font-light tracking-widest uppercase">Nhấn để bật lại</p>
          <p className="text-white/50 text-sm">{currentTime.toLocaleTimeString('vi-VN')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black select-none overflow-hidden">

      {dimmed && !sleeping && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center transition-opacity duration-[2000ms]">
          <div className="flex flex-col items-center gap-6 opacity-40">
            <div className="border-2 border-white/60 border-dashed rounded-full animate-pulse"
              style={{ width: 'min(220px, 30vw)', height: 'min(280px, 38vh)' }} />
            <p className="text-white text-xl font-light tracking-widest uppercase">Chế độ chờ</p>
            <p className="text-white/50 text-sm">{currentTime.toLocaleTimeString('vi-VN')}</p>
          </div>
        </div>
      )}

      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover"
        muted playsInline autoPlay style={{ transform: 'scaleX(-1)' }} />

      <canvas ref={overlayRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ transform: 'scaleX(-1)' }} />

      <canvas ref={captureRef} className="hidden" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-3 px-4 sm:px-6 md:px-8 py-3 sm:py-4 md:py-5"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        }}>
        <div className="flex items-center gap-3 sm:gap-4 text-white drop-shadow min-w-0">
          <img
            src="/abf-logo.png"
            alt="ABF — Healthy life with natural food"
            className="h-10 sm:h-12 md:h-14 w-auto object-contain shrink-0"
            style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}
          />
          <div className="border-l border-white/20 pl-3 sm:pl-4 min-w-0">
            <p className="text-base sm:text-xl md:text-2xl font-bold tracking-wider md:tracking-widest uppercase truncate">Chấm Công Khuôn Mặt</p>
            <p className="hidden sm:block text-white/60 text-xs md:text-sm mt-0.5 truncate">Đưa khuôn mặt vào camera để điểm danh</p>
          </div>
        </div>
        <div className="text-right text-white drop-shadow shrink-0">
          <p className="text-3xl sm:text-4xl md:text-5xl font-mono font-bold tabular-nums leading-none">
            {currentTime.toLocaleTimeString('vi-VN')}
          </p>
          <p className="text-white/60 text-xs md:text-sm mt-1">
            {currentTime.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Powered by Koola — subtle signature */}
      <div className="absolute z-20 flex items-center gap-1.5 text-white/45 pointer-events-none"
        style={{
          right: 'max(1.25rem, env(safe-area-inset-right))',
          bottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        }}>
        <span className="text-[10px] sm:text-[11px] font-light tracking-[0.25em] uppercase">Powered by</span>
        <img
          src="/koola-logo.png"
          alt="Koola"
          className="h-3.5 sm:h-4 w-auto object-contain"
          style={{ filter: 'brightness(0) invert(1) drop-shadow(0 1px 2px rgba(0,0,0,0.6))', opacity: 0.85 }}
        />
      </div>

      {/* Face guide */}
      {kioskState === 'waiting' && facePos === 'none' && !spoofDetected && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="flex flex-col items-center">
            <div className="border-2 border-white/50 border-dashed rounded-full animate-pulse"
              style={{ width: 'min(320px, 40vw)', height: 'min(420px, 55vh)' }} />
            <p className="mt-4 text-white/70 text-base font-medium tracking-wide drop-shadow">
              Đặt khuôn mặt vào khung
            </p>
          </div>
        </div>
      )}

      {/* Screen spoof warning */}
      {spoofDetected && kioskState === 'waiting' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
          <div className="bg-red-600/90 backdrop-blur-sm rounded-2xl px-8 py-6 flex flex-col items-center gap-4 shadow-2xl border border-red-400/40 animate-pulse">
            <AlertCircle className="w-16 h-16 text-white" />
            <p className="text-white text-2xl font-bold text-center">Phát hiện màn hình thiết bị</p>
            <p className="text-white/80 text-base text-center max-w-md">
              Vui lòng không sử dụng ảnh trên điện thoại để điểm danh.
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
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-6" />
          <p className="text-white text-xl font-semibold drop-shadow transition-opacity duration-300">
            {PROCESSING_STEPS[processingStep]}
          </p>
          <div className="flex gap-1.5 mt-4">
            {PROCESSING_STEPS.map((_, i) => (
              <span key={i} className={`w-2 h-2 rounded-full transition-colors duration-300 ${i <= processingStep ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </div>
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
        <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col justify-center items-center gap-3 pt-16"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
            paddingBottom: 'max(2rem, calc(env(safe-area-inset-bottom) + 1.75rem))',
          }}>
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
            <div className="flex items-center gap-3 bg-black/50 backdrop-blur-sm px-5 py-2.5 rounded-full border border-cyan-400/60">
              <span className="w-2.5 h-2.5 rounded-full animate-pulse bg-cyan-400" />
              <span className="text-sm font-medium text-cyan-200">{statusHint || 'Đang nhận diện...'}</span>
            </div>
          )}
          {qualityCount > 0 && (
            <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full transition-all duration-100"
                style={{ width: `${(qualityCount / STABLE_FRAMES) * 100}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Result overlay */}
      {kioskState === 'result' && result && (
        <div className={`absolute inset-0 z-30 flex flex-col items-center justify-center ${overlayBg[result.type]} bg-opacity-90 backdrop-blur-sm px-6`}>
          {overlayIcon[result.type]}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-6 text-center drop-shadow-lg">{result.title}</h2>
          {result.employee && (
            <p className="text-xl sm:text-2xl md:text-3xl text-white/90 mt-4 font-semibold text-center drop-shadow max-w-3xl">{result.employee}</p>
          )}
          {result.subtitle && (
            <p className="text-lg sm:text-xl md:text-2xl text-white/80 mt-2 font-medium text-center drop-shadow">{result.subtitle}</p>
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

export default FaceKioskPageV2;
