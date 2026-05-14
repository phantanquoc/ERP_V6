import React, { useRef, useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import faceAttendanceService, { VerifyResult } from '../../services/faceAttendanceService';
import { loadFaceMesh } from '../../utils/loadFaceMesh';
import { ScreenSpoofDetector } from '../../utils/screenSpoofDetector';

/* eslint-disable @typescript-eslint/no-explicit-any */
type FaceMeshInstance = any;
type NLM = { x: number; y: number; z: number };

type KioskState = 'loading' | 'waiting' | 'challenge' | 'processing' | 'result' | 'error';
type FacePos    = 'none' | 'centered' | 'offcenter' | 'multiface';
type ChallengePhase = 'active' | 'done';

type ChallengeType = 'blink';

const CENTER_ZONE       = 0.30;
const MAX_YAW           = 0.25;
const MAX_PITCH         = 0.28;
const MIN_FACE_AREA     = 0.04;
const QUALITY_GATE      = 6;

const CHALLENGE_EAR_THRESHOLD   = 0.18;
const CHALLENGE_EAR_FRAMES      = 2;
const CHALLENGE_TIMEOUT_MS      = 8000;

const L_EYE = [33, 160, 158, 133, 153, 144];
const R_EYE = [362, 385, 387, 263, 373, 380];
const NOSE_TIP = 1;
const MOUTH = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375];

const CHALLENGE_LABELS: Record<ChallengeType, string> = {
  blink: 'CHỚP MẮT',
};

interface ResultDisplay {
  type: 'success' | 'info' | 'error' | 'warning';
  title: string;
  employee?: string;
  subtitle?: string;
  time?: string;
}

const RESULT_DISPLAY_MS = 4000;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

const IDLE_SLOW_MS   = 30_000;
const IDLE_DIM_MS    = 60_000;
const IDLE_SLEEP_MS  = 120_000; // 2 phút → tắt camera hoàn toàn
const DETECT_FAST_MS = 100;
const DETECT_SLOW_MS = 500;
const CAPTURE_SIZE   = 480;
const FACE_CROP_PADDING = 0.60;

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

function computeEAR(lms: NLM[]): { left: number; right: number } {
  const dist = (a: number, b: number) => Math.hypot(lms[a].x - lms[b].x, lms[a].y - lms[b].y);
  const leftEAR = (dist(160, 144) + dist(158, 153)) / (2 * dist(33, 133) || 1);
  const rightEAR = (dist(385, 380) + dist(387, 373)) / (2 * dist(362, 263) || 1);
  return { left: leftEAR, right: rightEAR };
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
  const latestDet      = useRef<{ lms: NLM[]; box: { x: number; y: number; width: number; height: number }; score: number; faceCount: number } | null>(null);
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const drawLoopRef    = useRef<() => void>(() => {});

  const qualityBuffer  = useRef<{ frame: string; score: number }[]>([]);
  const spoofDetector  = useRef<ScreenSpoofDetector>(new ScreenSpoofDetector());

  // Liveness challenge state
  const challengeRef       = useRef<ChallengeType | null>(null);
  const challengeStartRef  = useRef<number>(0);
  const challengePhaseRef  = useRef<ChallengePhase>('active');
  const blinkCountRef      = useRef(0);
  const prevEARDetected     = useRef(false);

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
  const [activeChallenge, setActiveChallenge] = useState<ChallengeType | null>(null);

  // ─── Kiosk session key validation ──────────────────────────────────────────
  const [accessGranted, setAccessGranted] = useState<boolean | null>(null); // null = checking

  const kioskConfig = faceAttendanceService.getKioskConfig();
  const isLocalDev  = import.meta.env.DEV || LOCAL_HOSTS.has(window.location.hostname);

  useEffect(() => {
    // Local dev: skip key validation
    if (isLocalDev) {
      setAccessGranted(true);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const key = params.get('key');
    if (!key) {
      setAccessGranted(false);
      return;
    }
    faceAttendanceService.validateKioskSession(key).then(valid => {
      setAccessGranted(valid);
    });
  }, [isLocalDev]);

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

  // ─── Sleep / Wake (tiết kiệm tài nguyên tablet) ──────────────────────────────
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
    setQualityCount(0);
  }, []);

  const startChallenge = useCallback(() => {
    challengeRef.current = 'blink';
    challengeStartRef.current = Date.now();
    challengePhaseRef.current = 'active';
    blinkCountRef.current = 0;
    prevEARDetected.current = false;
    setActiveChallenge('blink');
    setKioskState('challenge');
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
      challengeRef.current = null;
      challengePhaseRef.current = 'active';
      setActiveChallenge(null);
    }, RESULT_DISPLAY_MS);
  }, [playBeep, speak]);

  const doScan = useCallback(async (bestImage: string, frames: string[]) => {
    if (processing.current) return;
    processing.current = true;
    setKioskState('processing');
    setStatusHint('');
    setActiveChallenge(null);
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
        challengeRef.current = null;
        challengePhaseRef.current = 'active';
        setActiveChallenge(null);
      }
    } catch (error) {
      processing.current = false;
      setKioskState('waiting');
      setCameraError(error instanceof Error ? error.message : 'Kiosk verify thất bại');
      challengeRef.current = null;
      challengePhaseRef.current = 'active';
      setActiveChallenge(null);
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

      // ── Screen spoof detection ──────────────────────────────────────────
      spoofDetector.current.addLandmarkSnapshot(lms, vw, vh);
      const spoofResult = spoofDetector.current.detect(video, box, vw, vh);
      setSpoofDetected(spoofResult.isSpoof);

      if (spoofResult.isSpoof && !processing.current) {
        resetQualityGate();
        setStatusHint('Phát hiện màn hình — vui lòng không dùng ảnh trên điện thoại');
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

      // ── Liveness challenge detection ────────────────────────────────────
      if (challengeRef.current && challengePhaseRef.current === 'active' && !processing.current) {
        const ear = computeEAR(lms);
        const avgEAR = (ear.left + ear.right) / 2;
        const eyesClosed = avgEAR < CHALLENGE_EAR_THRESHOLD;
        if (eyesClosed && !prevEARDetected.current) {
          blinkCountRef.current++;
        }
        prevEARDetected.current = eyesClosed;
        const challengePassed = blinkCountRef.current >= 1;

        // Timeout: reset challenge if too long
        if (now - challengeStartRef.current > CHALLENGE_TIMEOUT_MS) {
          challengeRef.current = null;
          challengePhaseRef.current = 'active';
          setActiveChallenge(null);
          setKioskState('waiting');
          resetQualityGate();
        } else if (challengePassed) {
          challengePhaseRef.current = 'done';
          setActiveChallenge(null);
        }
      }

      // ── Quality gate (only when challenge is done or not yet started) ──
      const isGoodFrame = isCentered && isFacingStraight
        && detScore >= 0.3
        && faceAreaRatio >= MIN_FACE_AREA;

      const canCollectFrames = !processing.current && (
        challengePhaseRef.current === 'done' || !challengeRef.current
      );

      if (isGoodFrame && canCollectFrames) {
        const frame = captureFrame();
        if (frame) {
          if (qualityBuffer.current.length < QUALITY_GATE) {
            qualityBuffer.current.push({ frame, score: detScore });
          } else {
            qualityBuffer.current.shift();
            qualityBuffer.current.push({ frame, score: detScore });
          }
          const count = qualityBuffer.current.length;
          setQualityCount(count);

          if (count >= QUALITY_GATE) {
            if (challengePhaseRef.current === 'done') {
              // Challenge passed (blink) — scan with existing buffer
              const buf  = qualityBuffer.current;
              const best = buf.reduce((a, b) => b.score > a.score ? b : a);
              const frames = buf.map(f => f.frame);
              qualityBuffer.current = [];
              setQualityCount(0);
              challengeRef.current = null;
              challengePhaseRef.current = 'active';
              spoofDetector.current.reset();
              doScan(best.frame, frames);
            } else if (!challengeRef.current) {
              // No challenge yet — start one
              startChallenge();
            }
          } else {
            if (!challengeRef.current) {
              setStatusHint(`Giữ nguyên... (${count}/${QUALITY_GATE})`);
            }
          }
        }
      } else if (!processing.current && !challengeRef.current) {
        if (qualityBuffer.current.length > 0) resetQualityGate();
        if (!isCentered)            setStatusHint('Di chuyển vào giữa màn hình');
        else if (!isFacingStraight)  setStatusHint('Nhìn thẳng vào màn hình');
        else if (faceAreaRatio < MIN_FACE_AREA) setStatusHint('Lại gần camera hơn');
        else setStatusHint('Giữ nguyên...');
      }

      const color = challengeRef.current && challengePhaseRef.current === 'active'
        ? '#f59e0b'
        : isGoodFrame ? '#22d3ee' : '#f59e0b';

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
      // Reset challenge if face is lost
      if (challengeRef.current && challengePhaseRef.current !== 'done') {
        challengeRef.current = null;
        challengePhaseRef.current = 'active';
        setActiveChallenge(null);
        setKioskState('waiting');
      }
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
  }, [captureFrame, doScan, resetQualityGate, startChallenge, enterSleep]);

  drawLoopRef.current = drawLoop;

  // ─── Init: FaceMesh + Camera ─────────────────────────────────────────────────
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
  }, [accessGranted, drawLoop, isLocalDev, kioskConfig.deviceKey]);

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

      {/* Access denied / validating */}
      {accessGranted === null && (
        <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center z-50">
          <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-white text-lg">Đang xác thực phiên...</p>
        </div>
      )}
      {accessGranted === false && (
        <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center z-50 p-8 text-center">
          <XCircle className="w-20 h-20 text-red-400 mb-6" />
          <h2 className="text-white text-2xl font-bold mb-3">Truy cập bị từ chối</h2>
          <p className="text-gray-400 text-lg max-w-md">
            Phiên chấm công không hợp lệ hoặc đã hết hạn. Vui lòng liên hệ quản trị viên để mở lại trang chấm công.
          </p>
        </div>
      )}

      {/* Standby / Sleep overlay */}
      {dimmed && (
        <div
          className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center transition-opacity duration-[2000ms] cursor-pointer"
          onClick={sleeping ? wakeUp : undefined}
          onTouchStart={sleeping ? wakeUp : undefined}
        >
          <div className="flex flex-col items-center gap-6 opacity-40">
            <div
              className="border-2 border-white/60 border-dashed rounded-full animate-pulse"
              style={{ width: 'min(220px, 30vw)', height: 'min(280px, 38vh)' }}
            />
            <p className="text-white text-xl font-light tracking-widest uppercase">
              {sleeping ? 'Chạm để chấm công' : 'Chế độ chờ'}
            </p>
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
      {kioskState === 'waiting' && facePos === 'none' && !spoofDetected && (
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

      {/* Screen spoof warning */}
      {spoofDetected && kioskState === 'waiting' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
          <div className="bg-red-600/90 backdrop-blur-sm rounded-2xl px-8 py-6 flex flex-col items-center gap-4 shadow-2xl border border-red-400/40 animate-pulse">
            <AlertCircle className="w-16 h-16 text-white" />
            <p className="text-white text-2xl font-bold text-center">Phát hiện màn hình thiết bị</p>
            <p className="text-white/80 text-base text-center max-w-md">
              Vui lòng không sử dụng ảnh trên điện thoại hoặc máy tính bảng để điểm danh.
              Hãy đứng trực tiếp trước camera.
            </p>
          </div>
        </div>
      )}

      {/* Liveness challenge overlay */}
      {(kioskState === 'challenge' && activeChallenge) && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="relative" style={{ width: 'min(200px, 30vw)', height: 'min(200px, 30vw)' }}>
              <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_0_24px_rgba(250,204,21,0.7)]">
                <circle cx="100" cy="100" r="90" fill="rgba(0,0,0,0.6)" stroke="#facc15" strokeWidth="4" />
                <ellipse cx="100" cy="88" rx="45" ry="30" fill="none" stroke="#facc15" strokeWidth="5">
                  <animate attributeName="ry" values="30;3;30" dur="1.8s" repeatCount="indefinite" keyTimes="0;0.25;0.5" keySplines="0.4 0 0.2 1;0.4 0 0.2 1" calcMode="spline" />
                </ellipse>
                <circle cx="100" cy="88" r="14" fill="#facc15">
                  <animate attributeName="opacity" values="1;0;1" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="r" values="14;2;14" dur="1.8s" repeatCount="indefinite" keyTimes="0;0.25;0.5" keySplines="0.4 0 0.2 1;0.4 0 0.2 1" calcMode="spline" />
                </circle>
                <path d="M50 140 Q100 165 150 140" fill="none" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-4xl font-black text-yellow-300 text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-wider" style={{ fontSize: 'min(10vw, 48px)' }}>
              {CHALLENGE_LABELS.blink}
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
      {!cameraError && (kioskState === 'waiting' || kioskState === 'challenge') && (
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
              <div className={`flex items-center gap-3 bg-black/50 backdrop-blur-sm px-5 py-2.5 rounded-full border ${kioskState === 'challenge' ? 'border-amber-400/60' : qualityCount > 0 ? 'border-cyan-400/60' : 'border-blue-400/40'}`}>
                <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${kioskState === 'challenge' ? 'bg-amber-400' : qualityCount > 0 ? 'bg-cyan-400' : 'bg-blue-400'}`} />
                <span className={`text-sm font-medium ${kioskState === 'challenge' ? 'text-amber-200' : qualityCount > 0 ? 'text-cyan-200' : 'text-blue-200'}`}>
                  {statusHint || (kioskState === 'challenge' ? CHALLENGE_LABELS.blink : 'Nhìn thẳng vào màn hình')}
                </span>
              </div>
              {qualityCount > 0 && kioskState !== 'challenge' && (
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