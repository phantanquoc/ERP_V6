import React, { useRef, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw, ToggleLeft, ToggleRight, User, Loader2, ScanFace, Contact, Glasses, Camera, Play, ImageIcon, X, Activity, AlertTriangle } from 'lucide-react';
import faceAttendanceService, { EmployeeFaceProfile, FaceProfileImage, FaceProfileStats } from '../../services/faceAttendanceService';
import { SERVER_BASE_URL } from '../../config/api';
import { loadFaceMesh } from '../../utils/loadFaceMesh';
import { useAuth } from '../../contexts/AuthContext';
import { isAdmin } from '../../utils/permissions';

// MediaPipe FaceMesh — loaded via dynamic script injection
/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Pose definitions ──────────────────────────────────────────────────────────
const POSES = [
  { label: 'Chính diện',  emoji: '😐', hint: 'Nhìn thẳng vào camera',              arrow: null },
  { label: 'Xoay trái',    emoji: '⬅️', hint: 'Xoay mặt sang trái nhẹ (~30°)',       arrow: 'left' },
  { label: 'Xoay phải',  emoji: '➡️', hint: 'Xoay mặt sang phải nhẹ (~30°)',       arrow: 'right' },
  { label: 'Ngẩng lên',  emoji: '⬆️', hint: 'Ngẩng đầu lên nhẹ (~20°)',            arrow: 'up' },
  { label: 'Cúi xuống',  emoji: '⬇️', hint: 'Cúi đầu xuống nhẹ (~20°)',            arrow: 'down' },
  { label: 'Há miệng ra',   emoji: '😊', hint: 'Nhìn thẳng và mở miệng ra',     arrow: null },
];

const STABLE_MS   = 900;
const COOLDOWN_MS = 1200;
const OVAL_PAD_X  = 0.18;
const OVAL_PAD_Y  = 0.06;

// Ngưỡng góc mặt
const YAW_FRONT  = 0.15;
const YAW_SIDE   = 0.22;
const PITCH_UP   = -0.13;
const PITCH_DOWN =  0.13;
const SMILE_MIN  =  0.18;

// ── MediaPipe FaceMesh landmark indices ──────────────────────────────────────
const L_EYE   = [33, 160, 158, 133, 153, 144];
const R_EYE   = [362, 385, 387, 263, 373, 380];
const NOSE_TIP = 1;
const MOUTH   = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375];
const MOUTH_L = 61, MOUTH_R = 291;
const LIP_TOP = 13, LIP_BOT = 14;

// Normalized landmark type
type NLM = { x: number; y: number; z: number };

// ─── Pose metrics ─────────────────────────────────────────────────────────────
interface PoseMetrics {
  yaw:    number;
  pitch:  number;
  smile:  number;
  inOval: boolean;
}

function computePoseMetrics(
  lms: NLM[], vw: number, vh: number
): PoseMetrics {
  const avgPx = (idxs: number[]) => {
    const x = idxs.reduce((s, i) => s + lms[i].x * vw, 0) / idxs.length;
    const y = idxs.reduce((s, i) => s + lms[i].y * vh, 0) / idxs.length;
    return { x, y };
  };
  const leftEye   = avgPx(L_EYE);
  const rightEye  = avgPx(R_EYE);
  const eyeCenter = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 };
  const eyeWidth  = Math.abs(rightEye.x - leftEye.x);

  const noseTip = { x: lms[NOSE_TIP].x * vw, y: lms[NOSE_TIP].y * vh };
  const mouthL  = { x: lms[MOUTH_L].x * vw, y: lms[MOUTH_L].y * vh };
  const mouthR  = { x: lms[MOUTH_R].x * vw, y: lms[MOUTH_R].y * vh };
  const lipTop   = { x: lms[LIP_TOP].x * vw, y: lms[LIP_TOP].y * vh };
  const lipBot   = { x: lms[LIP_BOT].x * vw, y: lms[LIP_BOT].y * vh };
  const mouthCenterY = MOUTH.reduce((s, i) => s + lms[i].y * vh, 0) / MOUTH.length;

  // Yaw: negated for CSS-mirrored video
  const yaw = eyeWidth > 0 ? -(noseTip.x - eyeCenter.x) / eyeWidth : 0;

  const eyeToNose   = noseTip.y - eyeCenter.y;
  const noseToMouth = mouthCenterY - noseTip.y;
  const totalV      = eyeToNose + noseToMouth;
  const pitch       = totalV > 0 ? (eyeToNose - noseToMouth) / totalV : 0;

  const mouthW = Math.abs(mouthR.x - mouthL.x);
  const mouthH = Math.abs(lipBot.y - lipTop.y);
  const smile  = mouthW > 0 ? mouthH / mouthW : 0;

  // Oval check — use raw (unmirrored) x for math, mirror for display in drawOverlay
  const faceCx = noseTip.x;
  const faceCy = eyeCenter.y + (mouthCenterY - eyeCenter.y) * 0.45;
  const rx = vw * (0.5 - OVAL_PAD_X);
  const ry = vh * (0.5 - OVAL_PAD_Y);
  const dx = (faceCx - vw / 2) / rx;
  const dy = (faceCy - vh / 2) / ry;
  const inOval = (dx * dx + dy * dy) <= 1.0;

  return { yaw, pitch, smile, inOval };
}

function checkPoseMatch(poseIdx: number, m: PoseMetrics): { ok: boolean; hint: string } {
  const { yaw, pitch, smile } = m;
  switch (poseIdx) {
    case 0:
      if (Math.abs(yaw) > YAW_FRONT + 0.08)
        return { ok: false, hint: yaw > 0 ? 'Xoay sang trái thêm' : 'Xoay sang phải thêm' };
      if (pitch < PITCH_UP - 0.05)
        return { ok: false, hint: 'Hạ đầu xuống nhẹ' };
      if (pitch > PITCH_DOWN + 0.05)
        return { ok: false, hint: 'Ngẩng đầu lên nhẹ' };
      return { ok: true, hint: '✓ Tốt! Giữ nguyên...' };

    case 1:
      if (yaw > -YAW_SIDE)
        return { ok: false, hint: 'Xoay mặt sang trái thêm' };
      return { ok: true, hint: '✓ Đúng góc! Giữ nguyên...' };

    case 2:
      if (yaw < YAW_SIDE)
        return { ok: false, hint: 'Xoay mặt sang phải thêm' };
      return { ok: true, hint: '✓ Đúng góc! Giữ nguyên...' };

    case 3:
      if (pitch > PITCH_UP)
        return { ok: false, hint: 'Ngẩng đầu lên thêm' };
      return { ok: true, hint: '✓ Đúng góc! Giữ nguyên...' };

    case 4:
      if (pitch < PITCH_DOWN)
        return { ok: false, hint: 'Cúi đầu xuống thêm' };
      return { ok: true, hint: '✓ Đúng góc! Giữ nguyên...' };

    case 5:
      if (smile < SMILE_MIN)
        return { ok: false, hint: 'Mỉm cười to hơn nhé 😄' };
      if (Math.abs(yaw) > YAW_FRONT + 0.12)
        return { ok: false, hint: 'Nhìn thẳng vào camera khi cười' };
      return { ok: true, hint: '✓ Nụ cười đẹp! Giữ nguyên...' };

    default:
      return { ok: true, hint: '✓ Tốt!' };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
type EnrollState = 'idle' | 'capturing' | 'submitting' | 'done' | 'error';
type OvalState   = 'waiting' | 'detecting' | 'wrong-pose' | 'stable' | 'flash';

function flagLabel(flag: string): string {
  const map: Record<string, string> = {
    empty: 'Chưa có ảnh nào',
    quality_inflation_stale: 'Tất cả slot đã > 90 ngày — gallery quá cũ, nên re-enroll',
    legacy_no_quality: '>50% ảnh chưa đo chất lượng (legacy) — sẽ được thay dần khi user chấm mới',
    hour_skew: '>60% ảnh cùng khoảng giờ — gallery bị lệch theo thời điểm chấm phổ biến',
    high_rejection_rate: 'Adaptive từ chối nhiều hơn accept — có thể do drift hoặc ánh sáng thay đổi',
  };
  return map[flag] ?? flag;
}

const StatBlock: React.FC<{ title: string; items: { label: string; value: number; color: string }[]; total: number }> = ({ title, items, total }) => (
  <div>
    <p className="text-xs font-semibold text-gray-700 mb-2">{title}</p>
    <div className="space-y-1">
      {items.map(it => {
        const pct = total > 0 ? (it.value / total) * 100 : 0;
        return (
          <div key={it.label} className="flex items-center gap-2 text-xs">
            <span className="w-32 text-gray-600 shrink-0">{it.label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className={`h-full ${it.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-14 text-right font-mono text-gray-700">{it.value} ({pct.toFixed(0)}%)</span>
          </div>
        );
      })}
    </div>
  </div>
);

const FaceAdminPage: React.FC = () => {
  const { user } = useAuth();
  const videoRef    = useRef<HTMLVideoElement>(null);
  const overlayRef  = useRef<HTMLCanvasElement>(null);
  const captureRef  = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const loopRef     = useRef<number | null>(null);
  const stableRef   = useRef<number | null>(null);
  const cooldownRef = useRef<number>(0);
  const scanStartedRef = useRef(false);
  const faceMeshRef = useRef<any | null>(null);
  const latestLms   = useRef<NLM[] | null>(null);

  const [employees,      setEmployees]      = useState<EmployeeFaceProfile[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [selected,       setSelected]       = useState<EmployeeFaceProfile | null>(null);
  const [cameraOn,       setCameraOn]       = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [currentPose,    setCurrentPose]    = useState(0);
  const [enrollState,    setEnrollState]    = useState<EnrollState>('idle');
  const [enrollMsg,      setEnrollMsg]      = useState('');
  const [enrollMode,     setEnrollMode]     = useState<'new' | 'variation'>('new');
  const [ovalState,      setOvalState]      = useState<OvalState>('waiting');
  const [_stableProgress,  setStableProgress] = useState(0);
  const [poseFeedback,    setPoseFeedback]    = useState('');
  const [showKioskMenu,   setShowKioskMenu]   = useState(false);

  // Gallery modal state
  const [galleryOpen,     setGalleryOpen]     = useState(false);
  const [galleryLoading,  setGalleryLoading]  = useState(false);
  const [galleryImages,   setGalleryImages]   = useState<FaceProfileImage[]>([]);
  const [galleryError,    setGalleryError]    = useState<string | null>(null);
  const [previewIndex,    setPreviewIndex]    = useState<number | null>(null);
  const [galleryMissing,  setGalleryMissing]  = useState(0);
  const [brokenImages,    setBrokenImages]    = useState<Set<string>>(new Set());

  // Health stats modal
  const [statsOpen,       setStatsOpen]       = useState(false);
  const [statsLoading,    setStatsLoading]    = useState(false);
  const [statsData,       setStatsData]       = useState<FaceProfileStats | null>(null);
  const [statsError,      setStatsError]      = useState<string | null>(null);

  const capturedImagesRef = useRef<string[]>([]);
  const currentPoseRef  = useRef(0);
  const currentFaceBox  = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  // ─── Employee list ─────────────────────────────────────────────────────────
  const loadEmployees = useCallback(async () => {
    try { setLoading(true); const r = await faceAttendanceService.listProfiles(); setEmployees(r.data || []); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  // ─── Gallery — xem thumbnail ảnh gốc ─────────────────────────────────────
  const openGallery = useCallback(async (employeeId: string) => {
    setGalleryOpen(true);
    setGalleryLoading(true);
    setGalleryError(null);
    setGalleryImages([]);
    setGalleryMissing(0);
    setBrokenImages(new Set());
    setPreviewIndex(null);
    try {
      const r = await faceAttendanceService.listProfileImages(employeeId);
      setGalleryImages(r.data?.images || []);
      setGalleryMissing(r.data?.missingFileCount || 0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không tải được ảnh';
      setGalleryError(msg);
    } finally {
      setGalleryLoading(false);
    }
  }, []);

  const closeGallery = useCallback(() => {
    setGalleryOpen(false);
    setPreviewIndex(null);
  }, []);

  const openStats = useCallback(async (employeeId: string) => {
    setStatsOpen(true);
    setStatsLoading(true);
    setStatsError(null);
    setStatsData(null);
    try {
      const r = await faceAttendanceService.getProfileStats(employeeId);
      setStatsData(r.data ?? null);
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : 'Không tải được stats');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const closeStats = useCallback(() => { setStatsOpen(false); }, []);

  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  // ─── Gắn stream vào video element sau khi cameraOn ────────────────────────
  useEffect(() => {
    if (cameraOn && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [cameraOn]);

  // ─── Camera helpers ─────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (loopRef.current) { cancelAnimationFrame(loopRef.current); loopRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    latestLms.current  = null;
    setCameraOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      streamRef.current = stream;
      capturedImagesRef.current = [];
      currentPoseRef.current     = 0;
      scanStartedRef.current     = false;
      setCapturedImages([]);
      setCurrentPose(0);
      setEnrollMsg('');
      setOvalState('waiting');
      setStableProgress(0);
      stableRef.current  = null;
      cooldownRef.current = 0;
      setEnrollState('capturing');
      setCameraOn(true);
    } catch (e) {
      alert('Không thể mở camera: ' + (e as Error).message);
    }
  }, []);

  // ─── FaceMesh init (sau khi camera bật) ──────────────────────────────────
  const initFaceMesh = useCallback(async () => {
    const FaceMeshCtor = await loadFaceMesh();
    const mesh = new FaceMeshCtor({
      locateFile: (file: string) => `/mediapipe/${file}`,
    });
    mesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    mesh.onResults((results: any) => {
      latestLms.current = (results.multiFaceLandmarks?.[0] as NLM[]) ?? null;
    });
    faceMeshRef.current = mesh;
    return mesh.initialize();
  }, []);

  // ─── Capture helpers ──────────────────────────────────────────────────────
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = captureRef.current;
    if (!video || !canvas || video.readyState < 2) return null;
    const vw = video.videoWidth  || 640;
    const vh = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const faceBox = currentFaceBox.current;
    if (faceBox) {
      // Crop vuông theo face box + 30% padding — nhất quán với kiosk
      const side   = Math.max(faceBox.width, faceBox.height);
      const padded = side * 1.60; // 30% padding each side
      const cx     = faceBox.x + faceBox.width  / 2;
      const cy     = faceBox.y + faceBox.height / 2;
      const sx = Math.max(0, Math.round(cx - padded / 2));
      const sy = Math.max(0, Math.round(cy - padded / 2));
      const sw = Math.min(vw - sx, Math.round(padded));
      const sh = Math.min(vh - sy, Math.round(padded));
      canvas.width  = 480;
      canvas.height = 480;
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 480, 480);
    } else {
      // Fallback: crop vuông trung tâm
      const side = Math.min(vw, vh);
      const sx   = Math.round((vw - side) / 2);
      const sy   = Math.round((vh - side) / 2);
      canvas.width  = 480;
      canvas.height = 480;
      ctx.drawImage(video, sx, sy, side, side, 0, 0, 480, 480);
    }
    return canvas.toDataURL('image/jpeg', 0.90).split(',')[1];
  }, []);

  const doAutoCapture = useCallback(() => {
    const b64 = captureFrame();
    if (!b64) return;
    const newImages = [...capturedImagesRef.current, b64];
    capturedImagesRef.current = newImages;
    setCapturedImages([...newImages]);
    setOvalState('flash');
    setTimeout(() => setOvalState('waiting'), 300);
    const nextPose = newImages.length;
    if (nextPose < POSES.length) {
      currentPoseRef.current = nextPose;
      setCurrentPose(nextPose);
      stableRef.current   = null;
      cooldownRef.current = Date.now() + COOLDOWN_MS;
      setStableProgress(0);
    } else {
      captureActiveRef.current = false;
      stopCamera();
      setEnrollState('idle');
    }
  }, [captureFrame, stopCamera]);

  const captureActiveRef = useRef(false);

  // ─── Draw oval overlay ─────────────────────────────────────────────────────
  const drawOverlay = useCallback((
    ow: number, oh: number,
    detected: boolean, _inOval: boolean, progress: number, state: OvalState,
    boxMirrored?: { x: number; y: number; width: number; height: number },
  ) => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width  = ow;
    canvas.height = oh;
    ctx.clearRect(0, 0, ow, oh);

    const cx = ow / 2;
    const cy = oh / 2;
    const rx = ow * (0.5 - OVAL_PAD_X);
    const ry = oh * (0.5 - OVAL_PAD_Y);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, ow, oh);
    ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
    ctx.clip('evenodd');
    ctx.fillStyle = 'rgba(0,0,0,0.50)';
    ctx.fillRect(0, 0, ow, oh);
    ctx.restore();

    let color = '#ffffff66', lineW = 2;
    if (state === 'flash')        { color = '#22c55e'; lineW = 5; }
    else if (state === 'stable') { color = '#22c55e'; lineW = 4; }
    else if (state === 'wrong-pose') { color = '#f97316'; lineW = 3; }
    else if (state === 'detecting')  { color = '#facc15'; lineW = 3; }

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth   = lineW;
    ctx.stroke();

    if (state === 'stable' && progress > 0) {
      const start = -Math.PI / 2;
      const end   = start + (progress / 100) * 2 * Math.PI;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx + 5, ry + 5, 0, start, end);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth   = 4;
      ctx.stroke();
    }

    if (boxMirrored && detected) {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth   = 1;
      ctx.strokeRect(boxMirrored.x, boxMirrored.y, boxMirrored.width, boxMirrored.height);
    }
  }, []);

  // ─── Detection loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!cameraOn) return;
    let _closed = false;

    const detect = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        loopRef.current = requestAnimationFrame(detect);
        return;
      }

      const vw = video.videoWidth  || 640;
      const vh = video.videoHeight || 480;

      // Chỉ vẽ oval guide khi chưa bắt đầu scan
      if (!scanStartedRef.current) {
        drawOverlay(vw, vh, false, false, 0, 'waiting');
        loopRef.current = requestAnimationFrame(detect);
        return;
      }

      // Cooldown: chờ sau khi chụp
      if (Date.now() < cooldownRef.current) {
        drawOverlay(vw, vh, false, false, 0, 'waiting');
        loopRef.current = requestAnimationFrame(detect);
        return;
      }

      let ovalSt: OvalState = 'waiting';
      let feedback = '';
      let boxMirrored: { x: number; y: number; width: number; height: number } | undefined;
      let poseOk = false;

      // Gửi frame vào FaceMesh
      if (faceMeshRef.current) {
        await faceMeshRef.current.send({ image: video });
      }

      const lms = latestLms.current;
      if (lms && lms.length > 0) {
        // Tính bounding box từ landmarks (raw coords)
        const xs = lms.map(p => p.x * vw);
        const ys = lms.map(p => p.y * vh);
        const rawX = Math.min(...xs), rawY = Math.min(...ys);
        const bw = Math.max(...xs) - rawX, bh = Math.max(...ys) - rawY;
        // Save raw face box for captureFrame crop
        currentFaceBox.current = { x: rawX, y: rawY, width: bw, height: bh };
        // Mirror X cho overlay (video bị CSS scaleX(-1))
        const mirroredX = vw - rawX - bw;
        boxMirrored = { x: mirroredX, y: rawY, width: bw, height: bh };

        // Pose metrics
        const metrics = computePoseMetrics(lms, vw, vh);

        if (!metrics.inOval) {
          ovalSt   = 'detecting';
          feedback = 'Đưa mặt vào khung oval';
        } else {
          const check = checkPoseMatch(currentPoseRef.current, metrics);
          poseOk    = check.ok;
          feedback  = check.hint;
          ovalSt    = check.ok ? 'stable' : 'wrong-pose';
        }
      }

      if (poseOk) {
        if (!stableRef.current) stableRef.current = Date.now();
        const elapsed  = Date.now() - stableRef.current;
        const progress = Math.min(100, (elapsed / STABLE_MS) * 100);
        setStableProgress(progress);

        const requiredStableMs = STABLE_MS;
        if (elapsed >= requiredStableMs) {
          drawOverlay(vw, vh, true, true, 100, 'flash', boxMirrored);
          setOvalState('flash');
          setPoseFeedback('✓ Chụp!');
          doAutoCapture();
          loopRef.current = requestAnimationFrame(detect);
          return;
        }
        drawOverlay(vw, vh, true, true, progress, 'stable', boxMirrored);
      } else {
        stableRef.current = null;
        setStableProgress(0);
        drawOverlay(vw, vh, !!boxMirrored, false, 0, ovalSt, boxMirrored);
      }

      setOvalState(ovalSt);
      setPoseFeedback(feedback);
      loopRef.current = requestAnimationFrame(detect);
    };

    loopRef.current = requestAnimationFrame(detect);
    return () => {
      closed = true;
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
      faceMeshRef.current?.close();
    };
  }, [cameraOn, drawOverlay, doAutoCapture]);

  // ─── Camera on effect: init FaceMesh sau khi video element ready ─────────────
  useEffect(() => {
    if (!cameraOn || !videoRef.current) return;
    let active = true;

    const go = async () => {
      try {
        await initFaceMesh();
      } catch (e) {
        console.error('FaceMesh init failed:', e);
      }
      if (!active || !videoRef.current) return;
    };
    go();

    return () => { active = false; };
  }, [cameraOn, initFaceMesh]);

  // ─── Enroll submit ─────────────────────────────────────────────────────────
  const handleEnroll = useCallback(async () => {
    if (!selected || capturedImagesRef.current.length < POSES.length) return;
    setEnrollState('submitting');
    try {
      if (enrollMode === 'variation') {
        const res = await faceAttendanceService.enrollVariation(selected.employeeId, capturedImagesRef.current);
        setEnrollMsg(`Đã thêm ${res.data?.addedCount} biến thể (tổng ${res.data?.totalCount}) cho ${selected.fullName}!`);
      } else {
        await faceAttendanceService.enrollFace(selected.employeeId, capturedImagesRef.current);
        setEnrollMsg(`Đã đăng ký khuôn mặt thành công cho ${selected.fullName}!`);
      }
      setEnrollState('done');
      capturedImagesRef.current = [];
      setCapturedImages([]);
      await loadEmployees();
    } catch (e: any) {
      setEnrollState('error');
      setEnrollMsg(e?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    }
  }, [selected, enrollMode, loadEmployees]);

  useEffect(() => {
    if (capturedImages.length === POSES.length && enrollState === 'idle') {
      handleEnroll();
    }
  }, [capturedImages.length, enrollState, handleEnroll]);

  // ─── Misc helpers ──────────────────────────────────────────────────────────
  const resetEnroll = () => {
    stopCamera();
    capturedImagesRef.current = [];
    currentPoseRef.current    = 0;
    setCapturedImages([]);
    setCurrentPose(0);
    setEnrollState('idle');
    setEnrollMsg('');
    setEnrollMode('new');
    setOvalState('waiting');
    setStableProgress(0);
    setPoseFeedback('');
    scanStartedRef.current = false;
  };

  const startScanning = () => {
    captureActiveRef.current = true;
    scanStartedRef.current = true;
    stableRef.current   = null;
    cooldownRef.current = 0;
  };

  const selectEmployee = (emp: EmployeeFaceProfile) => {
    resetEnroll();
    setSelected(emp);
  };

  const handleToggle = async (emp: EmployeeFaceProfile) => {
    if (!emp.faceProfile) return;
    try { await faceAttendanceService.toggleProfile(emp.faceProfile.id); await loadEmployees(); }
    catch { /* ignore */ }
  };

  const filtered = employees.filter(e =>
    e.fullName.toLowerCase().includes(search.toLowerCase()) ||
    e.employeeCode.toLowerCase().includes(search.toLowerCase())
  );

  const ovalMsg = (() => {
    if (!cameraOn) return '';
    if (ovalState === 'flash')     return '📸 Đã chụp!';
    if (poseFeedback)              return poseFeedback;
    return 'Đưa mặt vào khung oval';
  })();

  const pose = POSES[Math.min(currentPose, POSES.length - 1)];

  return (
    <>
      <div className="space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="mb-4 sm:mb-5">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Contact className="w-7 h-7 text-blue-600" /> Đăng ký khuôn mặt nhân viên
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Chọn nhân viên → hệ thống tự chụp {POSES.length} góc mặt</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* ── Employee list ────────────────────────────────────────────── */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-3 border-b border-gray-200 flex gap-2">
              <input
                type="text"
                placeholder="Tìm theo tên / mã NV..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
              />
              <button onClick={loadEmployees} className="text-gray-500 hover:text-blue-600 transition-colors px-1">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[55vh] lg:max-h-[75vh]">
              {loading ? (
                <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Không tìm thấy nhân viên</div>
              ) : (
                filtered.map(emp => (
                  <div
                    key={emp.employeeId}
                    onClick={() => selectEmployee(emp)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-200 last:border-0 transition-all ${
                      selected?.employeeId === emp.employeeId
                        ? 'bg-blue-50 border-l-2 border-l-blue-600'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{emp.fullName}</p>
                      <p className="text-xs text-gray-500">{emp.employeeCode}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {emp.faceProfile ? (
                        <button
                          onClick={e => { e.stopPropagation(); handleToggle(emp); }}
                          className="flex items-center gap-1 text-xs"
                        >
                          {emp.faceProfile.isActive
                            ? <><ToggleRight className="w-5 h-5 text-green-500" /><span className="text-green-400">Bật</span></>
                            : <><ToggleLeft  className="w-5 h-5 text-gray-500" /><span className="text-gray-500">Tắt</span></>}
                        </button>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Chưa đăng ký</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Enroll panel ─────────────────────────────────────────────── */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {!selected ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center h-96 text-gray-500">
                <User className="w-20 h-20 mb-3 text-gray-300" />
                <p className="text-lg">Chọn nhân viên từ danh sách</p>
              </div>
            ) : (
              <>
                {/* Employee info */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selected.fullName}</h2>
                    <p className="text-sm text-gray-500">{selected.employeeCode} · {selected.email}</p>
                    {selected.faceProfile && (
                      <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        <button
                          type="button"
                          onClick={() => openGallery(selected.employeeId)}
                          className="underline decoration-dotted underline-offset-2 hover:text-green-800"
                          title="Xem ảnh gốc đã đăng ký"
                        >
                          Đã đăng ký {selected.faceProfile.imageCount} ảnh
                        </button>
                        <span>—</span>
                        <span>{selected.faceProfile.isActive ? 'Đang hoạt động' : 'Đã vô hiệu'}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected.faceProfile && (
                      <button
                        onClick={() => openGallery(selected.employeeId)}
                        className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition flex items-center gap-1"
                      >
                        <ImageIcon className="w-3 h-3" /> Xem ảnh
                      </button>
                    )}
                    {selected.faceProfile && (
                      <button
                        onClick={() => openStats(selected.employeeId)}
                        className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition flex items-center gap-1"
                      >
                        <Activity className="w-3 h-3" /> Health
                      </button>
                    )}
                    {selected.faceProfile && enrollState === 'idle' && !cameraOn && (
                      <button
                        onClick={() => { setEnrollMode('variation'); startCamera(); }}
                        className="text-xs px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition flex items-center gap-1"
                      >
                        <Glasses className="w-3 h-3" /> Thêm biến thể
                      </button>
                    )}
                    {(cameraOn || capturedImages.length > 0) && (
                      <button onClick={resetEnroll} className="text-xs px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Làm lại
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Camera + auto-capture ─────────────────────────────────── */}
                {enrollState === 'capturing' && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Pose instruction */}
                    <div className="px-4 sm:px-5 pt-4 pb-3 flex flex-col sm:flex-row sm:items-center gap-3">
                      <span className="text-4xl">{pose.emoji}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          Góc {currentPose + 1}/{POSES.length}: <span className="text-blue-600">{pose.label}</span>
                        </p>
                        <p className="text-sm text-gray-500">{pose.hint}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium transition-all ${
                        ovalState === 'flash'      ? 'bg-green-50 text-green-700 border-green-200' :
                        ovalState === 'stable'     ? 'bg-yellow-50 text-yellow-700 border-yellow-200 animate-pulse' :
                        ovalState === 'wrong-pose' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        ovalState === 'detecting'  ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                     'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>{ovalMsg}</span>
                    </div>

                    {/* Camera view */}
                    <div className="relative bg-black mx-3 sm:mx-4 mb-3 rounded-xl overflow-hidden max-h-[60vh]" style={{ aspectRatio: '4/3' }}>
                      <video
                        ref={videoRef} muted playsInline autoPlay
                        className="w-full h-full object-cover"
                        style={{ transform: 'scaleX(-1)' }}
                      />
                      <canvas
                        ref={overlayRef}
                        className="absolute inset-0 w-full h-full"
                        style={{ transform: 'scaleX(-1)' }}
                      />
                      {ovalState === 'flash' && (
                        <div className="absolute inset-0 bg-white opacity-40 pointer-events-none rounded-xl animate-ping" />
                      )}
                    </div>

                    {/* Progress dots */}
                    <div className="px-4 sm:px-5 pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-600">Tiến độ chụp</span>
                        <span className="text-xs text-gray-500">{capturedImages.length}/{POSES.length}</span>
                      </div>
                      <div className="flex gap-1.5">
                        {POSES.map((p, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                              i < capturedImages.length ? 'bg-green-500' :
                              i === currentPose        ? 'bg-blue-500 animate-pulse' :
                                                         'bg-gray-200'
                            }`} />
                            <span className="text-[10px] text-gray-500">{p.emoji}</span>
                          </div>
                        ))}
                      </div>

                      {/* Start scanning button */}
                      {!scanStartedRef.current && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <button
                            onClick={startScanning}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            <Play className="w-4 h-4" /> Bắt đầu quét
                          </button>
                          <p className="text-xs text-gray-500 text-center mt-2">
                            Canh mặt vào giữa khung hình, sau đó nhấn để tự động chụp
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Idle: start button ─────────────────────────────────────── */}
                {enrollState === 'idle' && capturedImages.length === 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                    {enrollMode === 'variation' && (
                      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-center gap-2">
                        <Glasses className="w-4 h-4 shrink-0" /> Chế độ <strong>thêm biến thể</strong> — ảnh cũ được giữ lại.
                      </div>
                    )}
                    <div className="flex justify-center gap-4 mb-6 flex-wrap">
                      {POSES.map((p, i) => (
                        <div key={i} className="flex flex-col items-center gap-1 text-gray-600">
                          <span className="text-2xl">{p.emoji}</span>
                          <span className="text-[10px]">{p.label}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-gray-600 text-sm mb-5">
                      Hệ thống sẽ <strong className="text-gray-900">tự động chụp</strong> khi nhận diện mặt đúng góc trong khung oval.
                    </p>
                    <button
                      onClick={startCamera}
                      className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 flex items-center gap-2 mx-auto transition"
                    >
                      <Camera className="w-4 h-4" /> Bắt đầu đăng ký
                    </button>
                  </div>
                )}

                {/* ── Submitting ────────────────────────────────────────────── */}
                {enrollState === 'submitting' && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-700">Đang xử lý & lưu embedding khuôn mặt...</p>
                  </div>
                )}

                {/* ── Done / Error ───────────────────────────────────────────── */}
                {(enrollState === 'done' || enrollState === 'error') && enrollMsg && (
                  <div className={`rounded-xl p-5 flex items-start gap-3 ${
                    enrollState === 'done'
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    {enrollState === 'done'
                      ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-green-600" />
                      : <XCircle    className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />}
                    <div>
                      <p className="font-medium">{enrollMsg}</p>
                      <button onClick={resetEnroll} className="text-sm underline mt-2 opacity-70 hover:opacity-100">
                        {enrollState === 'done' ? 'Đăng ký cho nhân viên khác' : 'Thử lại'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <canvas ref={captureRef} className="hidden" />

      {/* Floating button — Tiến hành chấm công (admin only) */}
      {user && isAdmin(user.department) && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
          {showKioskMenu && (
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
              <button
                onClick={async () => {
                  setShowKioskMenu(false);
                  try {
                    const res = await faceAttendanceService.createKioskSession();
                    const key = res.data?.key;
                    if (key) window.open(`/diemdanh/nhanvien?key=${key}`, '_blank');
                  } catch (e) {
                    alert('Không thể tạo phiên chấm công: ' + (e as Error).message);
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-sm font-medium text-gray-700 transition-colors"
              >
                <ScanFace className="w-4 h-4 text-blue-600" />
                <div>
                  <p>Chấm công V1</p>
                  <p className="text-xs text-gray-400 font-normal">Có xác minh chớp mắt</p>
                </div>
              </button>
              <div className="border-t border-gray-100" />
              <button
                onClick={async () => {
                  setShowKioskMenu(false);
                  try {
                    const res = await faceAttendanceService.createKioskSession();
                    const key = res.data?.key;
                    if (key) window.open(`/diemdanh/nhanvien-v2?key=${key}`, '_blank');
                  } catch (e) {
                    alert('Không thể tạo phiên chấm công: ' + (e as Error).message);
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-sm font-medium text-gray-700 transition-colors"
              >
                <ScanFace className="w-4 h-4 text-green-600" />
                <div>
                  <p>Chấm công V2</p>
                  <p className="text-xs text-gray-400 font-normal">Nhận diện nhanh, không cần chớp mắt</p>
                </div>
              </button>
              <div className="border-t border-gray-100" />
              <button
                onClick={async () => {
                  setShowKioskMenu(false);
                  try {
                    const res = await faceAttendanceService.createKioskSession();
                    const key = res.data?.key;
                    if (key) window.open(`/diemdanh/nhanvien-v3?key=${key}`, '_blank');
                  } catch (e) {
                    alert('Không thể tạo phiên chấm công: ' + (e as Error).message);
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-sm font-medium text-gray-700 transition-colors"
              >
                <ScanFace className="w-4 h-4 text-cyan-600" />
                <div>
                  <p>Chấm công V3</p>
                  <p className="text-xs text-gray-400 font-normal">Instant — đưa mặt vào là chấm ngay</p>
                </div>
              </button>
            </div>
          )}
          <button
            onClick={() => setShowKioskMenu(prev => !prev)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-full shadow-lg shadow-blue-600/30 transition-all hover:scale-105 font-medium"
          >
            <ScanFace className="w-5 h-5" />
            Tiến hành chấm công
          </button>
        </div>
      )}

      {galleryOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeGallery}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2 flex-wrap">
                <ImageIcon className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-semibold text-gray-900">
                  Ảnh đã đăng ký{selected ? ` — ${selected.fullName}` : ''}
                </h3>
                {!galleryLoading && (
                  <span className="text-xs text-gray-500">({galleryImages.length} ảnh)</span>
                )}
                {!galleryLoading && galleryMissing > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded" title="Embedding vẫn hoạt động, chỉ mất file ảnh gốc">
                    ⚠ {galleryMissing} ảnh không có file
                  </span>
                )}
              </div>
              <button
                onClick={closeGallery}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {galleryLoading ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p className="text-sm">Đang tải ảnh…</p>
                </div>
              ) : galleryError ? (
                <div className="flex flex-col items-center justify-center h-64 text-red-600">
                  <XCircle className="w-8 h-8 mb-2" />
                  <p className="text-sm">{galleryError}</p>
                </div>
              ) : galleryImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <ImageIcon className="w-10 h-10 mb-2" />
                  <p className="text-sm">Chưa có ảnh nào</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {galleryImages.map((img, idx) => {
                    const isBroken = brokenImages.has(img.id);
                    return (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => !isBroken && setPreviewIndex(idx)}
                        disabled={isBroken}
                        className={`group relative aspect-square rounded-lg overflow-hidden border transition ${
                          isBroken
                            ? 'bg-red-50 border-red-200 cursor-not-allowed'
                            : 'bg-gray-100 border-gray-200 hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300'
                        }`}
                        title={isBroken ? 'File không đọc được' : new Date(img.createdAt).toLocaleString('vi-VN')}
                      >
                        {isBroken ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-red-500 text-xs gap-1 p-2">
                            <XCircle className="w-6 h-6" />
                            <span>File lỗi</span>
                          </div>
                        ) : (
                          <img
                            src={`${SERVER_BASE_URL}${img.imagePath}`}
                            alt={`Ảnh #${idx + 1}`}
                            loading="lazy"
                            onError={() => setBrokenImages(prev => new Set(prev).add(img.id))}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        )}
                        <span className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 bg-black/60 text-white rounded">
                          #{idx + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {statsOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeStats}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-semibold text-gray-900">
                  Gallery health{statsData ? ` — ${statsData.fullName}` : ''}
                </h3>
              </div>
              <button onClick={closeStats} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {statsLoading ? (
                <div className="flex items-center justify-center h-40 text-gray-500"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Đang tải...</div>
              ) : statsError ? (
                <div className="text-center text-red-600 py-8">{statsError}</div>
              ) : statsData ? (
                <div className="space-y-4">
                  {statsData.flags.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="text-xs">
                        <p className="font-medium text-amber-800">Cần chú ý:</p>
                        <ul className="mt-1 text-amber-700 space-y-0.5">
                          {statsData.flags.map(f => <li key={f}>• {flagLabel(f)}</li>)}
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-2xl font-bold text-gray-900">{statsData.totals.total}</p>
                      <p className="text-xs text-gray-500">Tổng embedding</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <p className="text-2xl font-bold text-emerald-700">{statsData.totals.enrolled}</p>
                      <p className="text-xs text-emerald-600">Ảnh gốc admin đăng ký</p>
                    </div>
                    <div className="bg-cyan-50 rounded-lg p-3">
                      <p className="text-2xl font-bold text-cyan-700">{statsData.totals.adaptive}/{statsData.totals.cap}</p>
                      <p className="text-xs text-cyan-600">Adaptive (auto học)</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-2xl font-bold text-purple-700">{statsData.adaptiveEvents30d.replaced ?? 0}</p>
                      <p className="text-xs text-purple-600">Đã replace (30 ngày)</p>
                    </div>
                  </div>

                  <StatBlock title="Chất lượng ảnh (quality score)" items={[
                    { label: 'Cao (≥0.7)', value: statsData.qualityDistribution.high, color: 'bg-emerald-500' },
                    { label: 'Trung bình (0.5-0.7)', value: statsData.qualityDistribution.mid, color: 'bg-amber-500' },
                    { label: 'Thấp (<0.5)', value: statsData.qualityDistribution.low, color: 'bg-red-500' },
                    { label: 'Chưa đo (legacy)', value: statsData.qualityDistribution.unknown, color: 'bg-gray-400' },
                  ]} total={statsData.totals.total} />

                  <StatBlock title="Tuổi ảnh (từ lần rotate gần nhất)" items={[
                    { label: '< 7 ngày', value: statsData.ageDistribution.fresh, color: 'bg-emerald-500' },
                    { label: '7-30 ngày', value: statsData.ageDistribution.recent, color: 'bg-cyan-500' },
                    { label: '30-90 ngày', value: statsData.ageDistribution.mid, color: 'bg-amber-500' },
                    { label: '> 90 ngày', value: statsData.ageDistribution.old, color: 'bg-red-500' },
                  ]} total={statsData.totals.total} />

                  <StatBlock title="Phân bố giờ chấm công đã học" items={
                    Object.entries(statsData.hourCoverage).map(([bucket, count], i) => ({
                      label: `${bucket}h`, value: count as number,
                      color: ['bg-indigo-500', 'bg-blue-500', 'bg-cyan-500', 'bg-teal-500'][i],
                    }))
                  } total={statsData.totals.total} />

                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-2">Sự kiện adaptive (30 ngày qua)</p>
                    <div className="flex gap-4 text-xs">
                      <span className="text-emerald-700">✓ Inserted: {statsData.adaptiveEvents30d.inserted ?? 0}</span>
                      <span className="text-cyan-700">↻ Replaced: {statsData.adaptiveEvents30d.replaced ?? 0}</span>
                      <span className="text-gray-600">✗ Rejected: {statsData.adaptiveEvents30d.rejected ?? 0}</span>
                    </div>
                  </div>

                  {statsData.recentEvents.length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer font-medium text-gray-700">Lịch sử event gần nhất ({statsData.recentEvents.length})</summary>
                      <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                        {statsData.recentEvents.map((e, i) => (
                          <div key={i} className="flex gap-2 text-gray-600">
                            <span className={
                              e.eventType === 'inserted' ? 'text-emerald-600' :
                              e.eventType === 'replaced' ? 'text-cyan-600' : 'text-gray-500'
                            }>{e.eventType}</span>
                            <span>{e.reason ?? '-'}</span>
                            <span className="ml-auto">{new Date(e.createdAt).toLocaleString('vi-VN')}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {galleryOpen && previewIndex !== null && galleryImages[previewIndex] && (
        <div
          className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewIndex(null)}
        >
          <button
            onClick={() => setPreviewIndex(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            aria-label="Đóng preview"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-5xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img
              src={`${SERVER_BASE_URL}${galleryImages[previewIndex].imagePath}`}
              alt={`Preview ${previewIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <p className="text-center text-white/70 text-xs mt-2">
              #{previewIndex + 1} / {galleryImages.length} · {new Date(galleryImages[previewIndex].createdAt).toLocaleString('vi-VN')}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default FaceAdminPage;
