import React, { useState, useEffect } from 'react';
import { X, Clock, MapPin, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Modal from './Modal';
import attendanceService from '@services/attendanceService';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  showBackdrop?: boolean;
}

const AttendanceModal: React.FC<AttendanceModalProps> = ({ isOpen, onClose, showBackdrop = false }) => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<string>('Đang lấy vị trí...');
  const [attendanceType, setAttendanceType] = useState<'checkin' | 'checkout'>('checkin');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update time every second
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // Check today's attendance status and set default type
  useEffect(() => {
    if (!isOpen || !user?.employeeId) return;

    const checkTodayAttendance = async () => {
      try {
        const todayRecord = await attendanceService.getTodayAttendance(user.employeeId!);

        // If already checked in today (has checkInTime but no checkOutTime), default to checkout
        if (todayRecord && todayRecord.checkInTime && !todayRecord.checkOutTime) {
          setAttendanceType('checkout');
        } else {
          // Otherwise default to checkin
          setAttendanceType('checkin');
        }
      } catch (error) {
        console.error('Error checking today attendance:', error);
        // Default to checkin on error
        setAttendanceType('checkin');
      }
    };

    checkTodayAttendance();
  }, [isOpen, user?.employeeId]);

  // Get user location
  useEffect(() => {
    if (!isOpen) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // In a real app, you would reverse geocode this
          setLocation(`${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
        },
        () => {
          setLocation('Không thể lấy vị trí');
        }
      );
    } else {
      setLocation('Trình duyệt không hỗ trợ định vị');
    }
  }, [isOpen]);

  // This is now handled by the Modal component

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Check if user has employeeId
      if (!user?.employeeId) {
        throw new Error('Không tìm thấy thông tin nhân viên. Vui lòng liên hệ quản trị viên.');
      }

      // Call the appropriate API based on attendance type
      if (attendanceType === 'checkin') {
        await attendanceService.checkIn(user.employeeId);
      } else {
        await attendanceService.checkOut(user.employeeId);
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        onClose();
        // Reset form
        setNote('');
        setAttendanceType('checkin');
      }, 2000);
    } catch (error: any) {
      console.error('Error submitting attendance:', error);
      setError(error?.response?.data?.message || error?.message || 'Có lỗi xảy ra khi chấm công');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showBackdrop={showBackdrop}>
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Chấm công</h2>
                  <p className="text-blue-100 text-sm">{user?.firstName} {user?.lastName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-blue-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {submitSuccess ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Chấm công thành công!
                </h3>
                <p className="text-gray-600">
                  Thời gian: {formatTime(currentTime)}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                )}
                {/* Current Time Display */}
                <div className="text-center bg-gray-50 rounded-xl p-4">
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {formatTime(currentTime)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatDate(currentTime)}
                  </div>
                </div>

                {/* Attendance Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Loại chấm công
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAttendanceType('checkin')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        attendanceType === 'checkin'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-lg font-semibold">Vào ca</div>
                        <div className="text-xs">Check In</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendanceType('checkout')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        attendanceType === 'checkout'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-lg font-semibold">Ra ca</div>
                        <div className="text-xs">Check Out</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vị trí
                  </label>
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{location}</span>
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ghi chú (tùy chọn)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Nhập ghi chú nếu có..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                    attendanceType === 'checkin'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang xử lý...</span>
                    </div>
                  ) : (
                    `${attendanceType === 'checkin' ? 'Chấm công vào' : 'Chấm công ra'}`
                  )}
                </button>
              </form>
            )}
          </div>
      </div>
    </Modal>
  );
};

export default AttendanceModal;
