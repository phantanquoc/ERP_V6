import React, { useRef, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw, ToggleLeft, ToggleRight, User, Loader2 } from 'lucide-react';
import * as faceapi from 'face-api.js';
import faceAttendanceService, { EmployeeFaceProfile } from '../../services/faceAttendanceService';

// ─── Pose definitions ────────────────────────────────────────────────────────
const POSES = [
  { label: 'Chính diện',    emoji: '😐',  hint: 'Nhìn thẳng vào camera',              arrow: null },
  { label: 'Xoay trái',     emoji: '⬅️',  hint: 'Xoay mặt sang trái nhẹ (~30°)',       arrow: 'left' },
  { label: 'Xoay phải',     emoji: '➡️',  hint: 'Xoay mặt sang phải nhẹ (~30°)',       arrow: 'right' },
  { label: 'Ngẩng lên',     emoji: '⬆️',  hint: 'Ngẩng đầu lên nhẹ (~20°)',            arrow: 'up' },
  { label: 'Cúi xuống',     emoji: '⬇️',  hint: 'Cúi đầu xuống nhẹ (~20°)',            arrow: 'down' },
  { label: 'Mỉm cười',      emoji: '😊',  hint: 'Nhìn thẳng và mỉm cười tự nhiên',     arrow: null },
];

const STABLE_MS   = 900;   // thời gian mặt phải giữ ổn định trước khi chụp
const COOLDOWN_MS = 1200;  // thời gian chờ sau khi chụp trước lần tiếp theo
const MIN_SCORE   = 0.55;  // ngưỡng face-api score tối thiểu
const OVAL_PAD_X  = 0.18;  // kích thước oval (% chiều rộng frame)
const OVAL_PAD_Y  = 0.06;

// ─── Types ────────────────────────────────────────────────────────────────────
type EnrollState = 'idle' | 'capturing' | 'submitting' | 'done' | 'error';
type OvalState   = 'waiting' | 'detecting' | 'stable' | 'flash';

const FaceAdminPage: React.FC = () => {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const captureRef = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const loopRef    = useRef<number | null>(null);
  const stableRef  = useRef<number | null>(null);   // timestamp khi bắt đầu stable
  const cooldownRef= useRef<number>(0);             // timestamp cooldown kết thúc
  const modelsRef  = useRef(false);

  const [employees,     setEmployees]     = useState<EmployeeFaceProfile[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [selected,      setSelected]      = useState<EmployeeFaceProfile | null>(null);
  const [cameraOn,      setCameraOn]      = useState(false);
  const [capturedImages,setCapturedImages]= useState<string[]>([]);
  const [currentPose,   setCurrentPose]   = useState(0);
  const [enrollState,   setEnrollState]   = useState<EnrollState>('idle');
  const [enrollMsg,     setEnrollMsg]     = useState('');
  const [enrollMode,    setEnrollMode]    = useState<'new' | 'variation'>('new');
  const [ovalState,     setOvalState]     = useState<OvalState>('waiting');
  const [modelsLoaded,  setModelsLoaded]  = useState(false);
  const [stableProgress,setStableProgress]= useState(0); // 0–100

  // Refs mirroring state for use in RAF loop
  const capturedImagesRef = useRef<string[]>([]);
  const currentPoseRef    = useRef(0);
  const captureActiveRef  = useRef(false);

  // ─── Load face-api models ──────────────────────────────────────────────────
  useEffect(() => {
    if (modelsRef.current) return;
    modelsRef.current = true;
    faceapi.nets.tinyFaceDetector.loadFromUri('/models').then(() => {
      setModelsLoaded(true);
    }).catch(console.error);
  }, []);

  // ─── Employee list ─────────────────────────────────────────────────────────
  const loadEmployees = useCallback(async () => {
    try { setLoading(true); const r = await faceAttendanceService.listProfiles(); setEmployees(r.data || []); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  // ─── Set video srcObject after render ────────────────────────────────────
  useEffect(() => {
    if (cameraOn && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [cameraOn]);

  // ─── Camera helpers ────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (loopRef.current) { cancelAnimationFrame(loopRef.current); loopRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    captureActiveRef.current = false;
    setCameraOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      streamRef.current = stream;
      capturedImagesRef.current = [];
      currentPoseRef.current    = 0;
      captureActiveRef.current  = true;
      setCapturedImages([]);
      setCurrentPose(0);
      setEnrollMsg('');
      setOvalState('waiting');
      setStableProgress(0);
      stableRef.current  = null;
      cooldownRef.current= 0;
      setEnrollState('capturing');
      setCameraOn(true);
    } catch (e) {
      alert('Không thể mở camera: ' + (e as Error).message);
    }
  }, []);

  // ─── Face detection loop ───────────────────────────────────────────────────
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = captureRef.current;
    if (!video || !canvas || video.readyState < 2) return null;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
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
      // All poses done
      captureActiveRef.current = false;
      stopCamera();
      setEnrollState('idle');
    }
  }, [captureFrame, stopCamera]);

  // Draw oval on overlay canvas
  const drawOverlay = useCallback((
    ow: number, oh: number,
    detected: boolean, inOval: boolean, progress: number, state: OvalState,
    box?: { x: number; y: number; width: number; height: number },
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

    // Darken outside oval
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, ow, oh);
    ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
    ctx.clip('evenodd');
    ctx.fillStyle = 'rgba(0,0,0,0.50)';
    ctx.fillRect(0, 0, ow, oh);
    ctx.restore();

    // Oval border
    let color = '#ffffff66';
    let lineW  = 2;
    if (state === 'flash') { color = '#22c55e'; lineW = 5; }
    else if (state === 'stable') { color = '#22c55e'; lineW = 4; }
    else if (inOval && detected) { color = '#facc15'; lineW = 3; }

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth   = lineW;
    ctx.stroke();

    // Progress arc (stable countdown)
    if (state === 'stable' && progress > 0) {
      const start = -Math.PI / 2;
      const end   = start + (progress / 100) * 2 * Math.PI;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx + 5, ry + 5, 0, start, end);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth   = 4;
      ctx.stroke();
    }

    // Face bounding box (debug aid — subtle)
    if (box && detected) {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth   = 1;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
    }
  }, []);

  useEffect(() => {
    if (!cameraOn || !captureActiveRef.current) return;

    const detect = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !captureActiveRef.current) {
        loopRef.current = requestAnimationFrame(detect);
        return;
      }

      const vw = video.videoWidth  || 640;
      const vh = video.videoHeight || 480;

      // After cooldown, try detect
      const now = Date.now();
      if (now < cooldownRef.current) {
        drawOverlay(vw, vh, false, false, 0, 'waiting');
        loopRef.current = requestAnimationFrame(detect);
        return;
      }

      let detected = false;
      let inOval   = false;
      let box: { x: number; y: number; width: number; height: number } | undefined;

      try {
        const result = await faceapi.detectSingleFace(
          video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: MIN_SCORE })
        );

        if (result) {
          detected = true;
          const b = result.box;
          // Mirror X (video is CSS-flipped, so detection box X is mirrored)
          const mirroredX = vw - b.x - b.width;
          box = { x: mirroredX, y: b.y, width: b.width, height: b.height };

          // Check face center is inside oval
          const faceCx = mirroredX + b.width  / 2;
          const faceCy = b.y      + b.height / 2;
          const ovalCx = vw / 2;
          const ovalCy = vh / 2;
          const rx = vw * (0.5 - OVAL_PAD_X);
          const ry = vh * (0.5 - OVAL_PAD_Y);
          const dx = (faceCx - ovalCx) / rx;
          const dy = (faceCy - ovalCy) / ry;
          inOval = (dx * dx + dy * dy) <= 1.0;
        }
      } catch { /* ignore */ }

      if (detected && inOval) {
        if (!stableRef.current) stableRef.current = Date.now();
        const elapsed  = Date.now() - stableRef.current;
        const progress = Math.min(100, (elapsed / STABLE_MS) * 100);
        setStableProgress(progress);

        if (elapsed >= STABLE_MS) {
          // Auto capture!
          drawOverlay(vw, vh, true, true, 100, 'flash', box);
          setOvalState('flash');
          doAutoCapture();
          loopRef.current = requestAnimationFrame(detect);
          return;
        }
        setOvalState('stable');
        drawOverlay(vw, vh, true, true, progress, 'stable', box);
      } else {
        stableRef.current = null;
        setStableProgress(0);
        setOvalState(detected ? 'detecting' : 'waiting');
        drawOverlay(vw, vh, detected, inOval, 0, detected ? 'detecting' : 'waiting', box);
      }

      loopRef.current = requestAnimationFrame(detect);
    };

    loopRef.current = requestAnimationFrame(detect);
    return () => {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, [cameraOn, drawOverlay, doAutoCapture]);

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

  // Auto-submit when all poses captured
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

  // ─── Oval status message ───────────────────────────────────────────────────
  const ovalMsg = (() => {
    if (!cameraOn) return '';
    if (ovalState === 'flash')     return '✓ Đã chụp!';
    if (ovalState === 'stable')    return 'Giữ nguyên...';
    if (ovalState === 'detecting') return 'Di chuyển mặt vào khung';
    return 'Đưa mặt vào khung oval';
  })();

  const pose = POSES[Math.min(currentPose, POSES.length - 1)];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-2xl">🪪</span> Đăng ký khuôn mặt nhân viên
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Chọn nhân viên → hệ thống tự chụp {POSES.length} góc mặt</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* ── Employee list ─────────────────────────────────────────── */}
          <div className="lg:col-span-2 bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="p-3 border-b border-gray-800 flex gap-2">
              <input
                type="text"
                placeholder="Tìm theo tên / mã NV..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
              />
              <button onClick={loadEmployees} className="text-gray-500 hover:text-blue-400 transition-colors px-1">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: '75vh' }}>
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
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-800 last:border-0 transition-all ${
                      selected?.employeeId === emp.employeeId
                        ? 'bg-blue-900/40 border-l-2 border-l-blue-500'
                        : 'hover:bg-gray-800/60'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-white truncate">{emp.fullName}</p>
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
                        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">Chưa đăng ký</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Enroll panel ──────────────────────────────────────────── */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {!selected ? (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 flex flex-col items-center justify-center h-96 text-gray-600">
                <User className="w-20 h-20 mb-3 opacity-10" />
                <p className="text-lg">Chọn nhân viên từ danh sách</p>
              </div>
            ) : (
              <>
                {/* Employee info */}
                <div className="bg-gray-900 rounded-2xl border border-gray-800 px-5 py-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold">{selected.fullName}</h2>
                    <p className="text-sm text-gray-400">{selected.employeeCode} · {selected.email}</p>
                    {selected.faceProfile && (
                      <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Đã đăng ký {selected.faceProfile.imageCount} ảnh —{' '}
                        {selected.faceProfile.isActive ? 'Đang hoạt động' : 'Đã vô hiệu'}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {selected.faceProfile && enrollState === 'idle' && !cameraOn && (
                      <button
                        onClick={() => { setEnrollMode('variation'); startCamera(); }}
                        className="text-xs px-3 py-1.5 bg-amber-600/20 text-amber-400 border border-amber-600/40 rounded-lg hover:bg-amber-600/30 transition"
                      >
                        👓 Thêm biến thể
                      </button>
                    )}
                    {(cameraOn || capturedImages.length > 0) && (
                      <button onClick={resetEnroll} className="text-xs px-3 py-1.5 bg-red-600/20 text-red-400 border border-red-600/40 rounded-lg hover:bg-red-600/30 transition flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Làm lại
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Camera + auto-capture UI ───────────────────────── */}
                {enrollState === 'capturing' && (
                  <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                    {/* Pose instruction */}
                    <div className="px-5 pt-4 pb-3 flex items-center gap-3">
                      <span className="text-4xl">{pose.emoji}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-white">
                          Góc {currentPose + 1}/{POSES.length}: <span className="text-blue-400">{pose.label}</span>
                        </p>
                        <p className="text-sm text-gray-400">{pose.hint}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${
                        ovalState === 'flash'    ? 'bg-green-900/50 text-green-400 border-green-700' :
                        ovalState === 'stable'   ? 'bg-yellow-900/50 text-yellow-400 border-yellow-700 animate-pulse' :
                        ovalState === 'detecting'? 'bg-blue-900/50 text-blue-400 border-blue-700' :
                                                   'bg-gray-800 text-gray-400 border-gray-700'
                      }`}>{ovalMsg}</span>
                    </div>

                    {/* Camera view with oval overlay */}
                    <div className="relative bg-black mx-4 mb-3 rounded-xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
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
                      {/* Flash effect */}
                      {ovalState === 'flash' && (
                        <div className="absolute inset-0 bg-white opacity-40 pointer-events-none rounded-xl animate-ping" />
                      )}
                      {/* Models loading indicator */}
                      {!modelsLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-300">Đang tải model nhận diện...</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Progress dots */}
                    <div className="px-5 pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">Tiến độ chụp</span>
                        <span className="text-xs text-gray-400">{capturedImages.length}/{POSES.length}</span>
                      </div>
                      <div className="flex gap-1.5">
                        {POSES.map((p, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                              i < capturedImages.length ? 'bg-green-500' :
                              i === currentPose        ? 'bg-blue-500 animate-pulse' :
                                                         'bg-gray-700'
                            }`} />
                            <span className="text-[10px] text-gray-600">{p.emoji}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Idle: start button ─────────────────────────────── */}
                {enrollState === 'idle' && capturedImages.length === 0 && (
                  <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 text-center">
                    {enrollMode === 'variation' && (
                      <div className="mb-4 p-3 bg-amber-900/30 border border-amber-700/40 rounded-xl text-sm text-amber-300 flex items-center gap-2">
                        <span>👓</span> Chế độ <strong>thêm biến thể</strong> — ảnh cũ được giữ lại.
                      </div>
                    )}
                    {/* Pose preview */}
                    <div className="flex justify-center gap-4 mb-6 flex-wrap">
                      {POSES.map((p, i) => (
                        <div key={i} className="flex flex-col items-center gap-1 text-gray-500">
                          <span className="text-2xl">{p.emoji}</span>
                          <span className="text-[10px]">{p.label}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-gray-400 text-sm mb-5">
                      Hệ thống sẽ <strong className="text-white">tự động chụp</strong> khi nhận diện mặt đúng góc trong khung oval.
                    </p>
                    <button
                      onClick={startCamera}
                      disabled={!modelsLoaded}
                      className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto transition"
                    >
                      {modelsLoaded ? '📷 Bắt đầu đăng ký' : <><Loader2 className="w-4 h-4 animate-spin" /> Đang tải model...</>}
                    </button>
                  </div>
                )}

                {/* ── Submitting ─────────────────────────────────────── */}
                {enrollState === 'submitting' && (
                  <div className="bg-gray-900 rounded-2xl border border-gray-800 p-10 text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-300">Đang xử lý & lưu embedding khuôn mặt...</p>
                  </div>
                )}

                {/* ── Done / Error ───────────────────────────────────── */}
                {(enrollState === 'done' || enrollState === 'error') && enrollMsg && (
                  <div className={`rounded-2xl p-5 flex items-start gap-3 ${
                    enrollState === 'done'
                      ? 'bg-green-900/30 border border-green-700/50 text-green-300'
                      : 'bg-red-900/30 border border-red-700/50 text-red-300'
                  }`}>
                    {enrollState === 'done'
                      ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-green-400" />
                      : <XCircle    className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />}
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
    </div>
  );
};

export default FaceAdminPage;
