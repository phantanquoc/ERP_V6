import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, CheckCircle, XCircle, RefreshCw, ToggleLeft, ToggleRight, User } from 'lucide-react';
import faceAttendanceService, { EmployeeFaceProfile } from '../../services/faceAttendanceService';

const POSES = [
  { label: 'Chính diện', emoji: '😐', hint: 'Nhìn thẳng vào camera' },
  { label: 'Xoay trái',  emoji: '⬅️', hint: 'Xoay mặt sang trái nhẹ (~30°)' },
  { label: 'Xoay phải',  emoji: '➡️', hint: 'Xoay mặt sang phải nhẹ (~30°)' },
  { label: 'Ngẩng lên',  emoji: '⬆️', hint: 'Ngẩng đầu nhẹ lên trên' },
  { label: 'Cúi xuống',  emoji: '⬇️', hint: 'Cúi đầu nhẹ xuống dưới' },
];

type EnrollState = 'idle' | 'capturing' | 'submitting' | 'done' | 'error';

const FaceAdminPage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [employees, setEmployees] = useState<EmployeeFaceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<EmployeeFaceProfile | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [currentPose, setCurrentPose] = useState(0);
  const [enrollState, setEnrollState] = useState<EnrollState>('idle');
  const [enrollMsg, setEnrollMsg] = useState('');

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const res = await faceAttendanceService.listProfiles();
      setEmployees(res.data || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  // Set srcObject AFTER React renders the <video> element
  useEffect(() => {
    if (cameraOn && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [cameraOn]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      streamRef.current = stream;
      setCapturedImages([]);
      setCurrentPose(0);
      setEnrollMsg('');
      setEnrollState('capturing'); // renders <video>, then useEffect fires
      setCameraOn(true);
    } catch (e) {
      alert('Không thể mở camera: ' + (e as Error).message);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOn(false);
    setEnrollState('idle');
  };

  const captureCurrentPose = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    canvasRef.current.width = videoRef.current.videoWidth || 640;
    canvasRef.current.height = videoRef.current.videoHeight || 480;
    ctx.drawImage(videoRef.current, 0, 0);
    const b64 = canvasRef.current.toDataURL('image/jpeg', 0.9).split(',')[1];

    const newImages = [...capturedImages, b64];
    setCapturedImages(newImages);

    if (newImages.length < POSES.length) {
      setCurrentPose(newImages.length);
    } else {
      // All 5 poses captured — stop camera and ready to submit
      stopCamera();
      setEnrollState('idle');
    }
  };

  const handleEnroll = async () => {
    if (!selected || capturedImages.length !== POSES.length) return;
    setEnrollState('submitting');
    try {
      await faceAttendanceService.enrollFace(selected.employeeId, capturedImages);
      setEnrollState('done');
      setEnrollMsg(`Đã đăng ký khuôn mặt thành công cho ${selected.fullName}!`);
      setCapturedImages([]);
      await loadEmployees();
    } catch (e: any) {
      setEnrollState('error');
      setEnrollMsg(e?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    }
  };

  const handleToggle = async (emp: EmployeeFaceProfile) => {
    if (!emp.faceProfile) return;
    try {
      await faceAttendanceService.toggleProfile(emp.faceProfile.id);
      await loadEmployees();
    } catch { /* ignore */ }
  };

  const selectEmployee = (emp: EmployeeFaceProfile) => {
    if (cameraOn) stopCamera();
    setSelected(emp);
    setCapturedImages([]);
    setCurrentPose(0);
    setEnrollState('idle');
    setEnrollMsg('');
  };

  const resetEnroll = () => {
    if (cameraOn) stopCamera();
    setCapturedImages([]);
    setCurrentPose(0);
    setEnrollState('idle');
    setEnrollMsg('');
  };

  const filtered = employees.filter(e =>
    e.fullName.toLowerCase().includes(search.toLowerCase()) ||
    e.employeeCode.toLowerCase().includes(search.toLowerCase())
  );

  const allCaptured = capturedImages.length === POSES.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-1 flex items-center gap-3">
            <Camera className="w-8 h-8 text-blue-600" />
            Đăng ký khuôn mặt nhân viên
          </h1>
          <p className="text-gray-500">Chọn nhân viên → chụp 5 góc mặt → Đăng ký</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── Employee list (left) ─────────────────────────── */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow">
            <div className="p-4 border-b flex items-center gap-2">
              <input
                type="text"
                placeholder="Tìm theo tên / mã NV..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button onClick={loadEmployees} className="text-gray-400 hover:text-blue-500 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: '70vh' }}>
              {loading ? (
                <div className="p-8 text-center text-gray-400">Đang tải...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-gray-400">Không tìm thấy nhân viên</div>
              ) : (
                filtered.map(emp => (
                  <div
                    key={emp.employeeId}
                    onClick={() => selectEmployee(emp)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b last:border-b-0 transition-colors ${
                      selected?.employeeId === emp.employeeId
                        ? 'bg-blue-50 border-l-4 border-l-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-800 truncate">{emp.fullName}</p>
                      <p className="text-xs text-gray-400">{emp.employeeCode}</p>
                    </div>
                    <div className="shrink-0">
                      {emp.faceProfile ? (
                        <button
                          onClick={e => { e.stopPropagation(); handleToggle(emp); }}
                          className="flex items-center gap-1 text-xs"
                          title={emp.faceProfile.isActive ? 'Đang bật — nhấn để tắt' : 'Đang tắt — nhấn để bật'}
                        >
                          {emp.faceProfile.isActive
                            ? <><ToggleRight className="w-5 h-5 text-green-500" /><span className="text-green-600">Bật</span></>
                            : <><ToggleLeft className="w-5 h-5 text-gray-400" /><span className="text-gray-400">Tắt</span></>
                          }
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Chưa đăng ký</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Enroll panel (right) ─────────────────────────── */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow p-6">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <User className="w-16 h-16 mb-3 opacity-20" />
                <p className="text-lg">Chọn nhân viên từ danh sách bên trái</p>
              </div>
            ) : (
              <>
                {/* Employee info header */}
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{selected.fullName}</h2>
                    <p className="text-sm text-gray-500">{selected.employeeCode} · {selected.email}</p>
                    {selected.faceProfile && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Đã đăng ký {selected.faceProfile.imageCount} ảnh —{' '}
                        {selected.faceProfile.isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
                      </p>
                    )}
                  </div>
                  {(capturedImages.length > 0 || cameraOn) && (
                    <button onClick={resetEnroll} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> Làm lại
                    </button>
                  )}
                </div>

                {/* ── STEP: Camera + Pose guide ── */}
                {enrollState === 'capturing' && (
                  <>
                    {/* Progress bar */}
                    <div className="flex gap-1 mb-3">
                      {POSES.map((p, i) => (
                        <div key={i} className={`flex-1 h-1.5 rounded-full ${
                          i < capturedImages.length ? 'bg-green-500' :
                          i === currentPose ? 'bg-blue-500 animate-pulse' : 'bg-gray-200'
                        }`} />
                      ))}
                    </div>

                    {/* Pose instruction */}
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg flex items-center gap-3">
                      <span className="text-3xl">{POSES[currentPose].emoji}</span>
                      <div>
                        <p className="font-semibold text-blue-800">
                          Góc {currentPose + 1}/5: {POSES[currentPose].label}
                        </p>
                        <p className="text-sm text-blue-600">{POSES[currentPose].hint}</p>
                      </div>
                    </div>

                    {/* Camera feed */}
                    <div className="relative bg-black rounded-xl overflow-hidden mb-3" style={{ aspectRatio: '4/3', maxHeight: '280px' }}>
                      <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay style={{ transform: 'scaleX(-1)' }} />
                      {/* Face guide overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="border-2 border-blue-400 border-dashed rounded-full opacity-50"
                          style={{ width: '55%', height: '80%' }} />
                      </div>
                    </div>

                    <button
                      onClick={captureCurrentPose}
                      className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      <Camera className="w-5 h-5" />
                      Chụp góc {POSES[currentPose].label}
                    </button>
                  </>
                )}

                {/* ── STEP: Idle / Start ── */}
                {enrollState === 'idle' && !allCaptured && (
                  <div className="text-center py-6">
                    <p className="text-gray-500 mb-4 text-sm">
                      Cần chụp <strong>5 góc</strong>: chính diện, trái, phải, ngẩng lên, cúi xuống
                    </p>
                    <div className="flex justify-center gap-3 mb-6 flex-wrap">
                      {POSES.map((p, i) => (
                        <div key={i} className="flex flex-col items-center text-xs text-gray-400">
                          <span className="text-2xl">{p.emoji}</span>
                          <span>{p.label}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={startCamera}
                      className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 flex items-center gap-2 mx-auto"
                    >
                      <Camera className="w-5 h-5" /> Mở camera bắt đầu chụp
                    </button>
                  </div>
                )}

                {/* ── STEP: All 5 captured, ready to submit ── */}
                {allCaptured && enrollState !== 'submitting' && enrollState !== 'done' && (
                  <>
                    <div className="flex gap-2 flex-wrap mb-4 justify-center">
                      {capturedImages.map((img, i) => (
                        <div key={i} className="text-center">
                          <img
                            src={`data:image/jpeg;base64,${img}`}
                            className="w-20 h-20 object-cover rounded-lg border-2 border-green-400"
                            alt={POSES[i].label}
                          />
                          <p className="text-xs text-gray-500 mt-1">{POSES[i].emoji} {POSES[i].label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={resetEnroll}
                        className="flex-1 py-3 border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 font-medium"
                      >
                        Chụp lại
                      </button>
                      <button
                        onClick={handleEnroll}
                        className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" /> Đăng ký khuôn mặt
                      </button>
                    </div>
                  </>
                )}

                {enrollState === 'submitting' && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    Đang xử lý & lưu embedding...
                  </div>
                )}

                {(enrollState === 'done' || enrollState === 'error') && enrollMsg && (
                  <div className={`flex items-start gap-3 p-4 rounded-xl ${
                    enrollState === 'done' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {enrollState === 'done' ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                    <div>
                      <p className="font-medium">{enrollMsg}</p>
                      {enrollState === 'done' && (
                        <button onClick={resetEnroll} className="text-sm underline mt-1 opacity-70 hover:opacity-100">
                          Đăng ký cho nhân viên khác
                        </button>
                      )}
                      {enrollState === 'error' && (
                        <button onClick={resetEnroll} className="text-sm underline mt-1 opacity-70 hover:opacity-100">
                          Thử lại
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceAdminPage;


