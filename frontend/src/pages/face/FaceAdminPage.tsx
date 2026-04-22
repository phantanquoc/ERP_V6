import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, UserCheck, UserX, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import faceAttendanceService, { FaceProfile } from '../../services/faceAttendanceService';

type EnrollStep = 'idle' | 'capturing' | 'submitting' | 'done' | 'error';

const FaceAdminPage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [profiles, setProfiles] = useState<FaceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<FaceProfile | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [enrollStep, setEnrollStep] = useState<EnrollStep>('idle');
  const [enrollMsg, setEnrollMsg] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [streamRef, setStreamRef] = useState<MediaStream | null>(null);

  // Load all employee face profiles
  const loadProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await faceAttendanceService.listProfiles();
      setProfiles(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => { streamRef?.getTracks().forEach(t => t.stop()); };
  }, [streamRef]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
      setStreamRef(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraOn(true);
    } catch (e) {
      alert('Không thể truy cập camera: ' + (e as Error).message);
    }
  };

  const stopCamera = () => {
    streamRef?.getTracks().forEach(t => t.stop());
    setStreamRef(null);
    setCameraOn(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    canvasRef.current.width = videoRef.current.videoWidth || 640;
    canvasRef.current.height = videoRef.current.videoHeight || 480;
    ctx.drawImage(videoRef.current, 0, 0);
    const b64 = canvasRef.current.toDataURL('image/jpeg', 0.9).split(',')[1];
    setCapturedImages(prev => [...prev, b64]);
  };

  const handleEnroll = async () => {
    if (!selectedEmployee || capturedImages.length === 0) return;
    setEnrollStep('submitting');
    setEnrollMsg('');
    try {
      await faceAttendanceService.enrollFace(selectedEmployee.employeeId, capturedImages);
      setEnrollStep('done');
      setEnrollMsg('Đăng ký khuôn mặt thành công!');
      setCapturedImages([]);
      stopCamera();
      await loadProfiles();
    } catch (e: any) {
      setEnrollStep('error');
      setEnrollMsg(e?.message || 'Có lỗi xảy ra khi đăng ký');
    }
  };

  const handleToggle = async (profile: FaceProfile) => {
    try {
      await faceAttendanceService.toggleProfile(profile.id);
      await loadProfiles();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectEmployee = (p: FaceProfile) => {
    setSelectedEmployee(p);
    setCapturedImages([]);
    setEnrollStep('idle');
    setEnrollMsg('');
    if (cameraOn) stopCamera();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <Camera className="w-8 h-8 text-blue-600 mr-3" />
            Quản lý chấm công khuôn mặt
          </h1>
          <p className="text-gray-600">Đăng ký và quản lý khuôn mặt nhân viên để chấm công tự động</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee list */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-700">Danh sách nhân viên</h2>
              <button onClick={loadProfiles} className="text-blue-500 hover:text-blue-700">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {loading ? (
              <div className="text-center py-8 text-gray-400">Đang tải...</div>
            ) : (
              <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                {profiles.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectEmployee(p)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-colors ${
                      selectedEmployee?.id === p.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-sm text-gray-800">{p.employee.fullName}</p>
                      <p className="text-xs text-gray-500">{p.employee.employeeCode}</p>
                      <p className="text-xs text-gray-400">{p.employee.department?.name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        (p._count?.images ?? 0) > 0
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {(p._count?.images ?? 0) > 0 ? `${p._count!.images} ảnh` : 'Chưa đăng ký'}
                      </span>
                      {(p._count?.images ?? 0) > 0 && (
                        <button
                          onClick={e => { e.stopPropagation(); handleToggle(p); }}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            p.isActive
                              ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                              : 'bg-red-100 text-red-600 hover:bg-green-100 hover:text-green-700'
                          }`}
                        >
                          {p.isActive ? 'Bật' : 'Tắt'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Enroll panel */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow p-6">
            {!selectedEmployee ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <UserCheck className="w-16 h-16 mb-4 opacity-30" />
                <p>Chọn nhân viên để đăng ký khuôn mặt</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedEmployee.employee.fullName}</h2>
                    <p className="text-sm text-gray-500">{selectedEmployee.employee.employeeCode} · {selectedEmployee.employee.department?.name}</p>
                  </div>
                  {(selectedEmployee._count?.images ?? 0) > 0 && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Đã đăng ký {selectedEmployee._count!.images} ảnh
                    </span>
                  )}
                </div>

                {/* Camera section */}
                <div className="mb-4">
                  <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3', maxHeight: '320px' }}>
                    <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                    {!cameraOn && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <button
                          onClick={startCamera}
                          className="bg-blue-600 text-white px-6 py-3 rounded-full flex items-center gap-2 hover:bg-blue-700 transition-colors"
                        >
                          <Camera className="w-5 h-5" /> Bật camera
                        </button>
                      </div>
                    )}
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Controls */}
                <div className="flex gap-3 mb-4 flex-wrap">
                  {cameraOn && (
                    <>
                      <button
                        onClick={capturePhoto}
                        disabled={capturedImages.length >= 5}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        Chụp ảnh ({capturedImages.length}/5)
                      </button>
                      <button
                        onClick={stopCamera}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
                      >
                        <UserX className="w-4 h-4" /> Tắt camera
                      </button>
                    </>
                  )}
                  {capturedImages.length > 0 && (
                    <>
                      <button
                        onClick={handleEnroll}
                        disabled={enrollStep === 'submitting'}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {enrollStep === 'submitting' ? 'Đang xử lý...' : 'Đăng ký khuôn mặt'}
                      </button>
                      <button
                        onClick={() => setCapturedImages([])}
                        className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" /> Xóa ảnh
                      </button>
                    </>
                  )}
                </div>

                {/* Captured thumbnails */}
                {capturedImages.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-4">
                    {capturedImages.map((img, i) => (
                      <img
                        key={i}
                        src={`data:image/jpeg;base64,${img}`}
                        className="w-16 h-16 object-cover rounded border border-gray-300"
                        alt={`Ảnh ${i + 1}`}
                      />
                    ))}
                  </div>
                )}

                {/* Status message */}
                {enrollMsg && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                    enrollStep === 'done' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {enrollStep === 'done'
                      ? <CheckCircle className="w-4 h-4" />
                      : <AlertCircle className="w-4 h-4" />
                    }
                    {enrollMsg}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceAdminPage;
