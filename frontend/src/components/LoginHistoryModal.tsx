import React, { useState, useEffect } from 'react';
import { X, History, Monitor, MapPin, CheckCircle, XCircle, Clock, Globe, AlertCircle } from 'lucide-react';
import Modal from './Modal';
import loginHistoryService, { LoginHistory } from '../services/loginHistoryService';

interface LoginHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginHistoryModal: React.FC<LoginHistoryModalProps> = ({ isOpen, onClose }) => {
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadLoginHistory();
    }
  }, [isOpen]);

  const loadLoginHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await loginHistoryService.getMyHistory(10, 0);
      setLoginHistory(data);
    } catch (error: any) {
      console.error('Error loading login history:', error);
      setError(error.message || 'Không thể tải lịch sử đăng nhập');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getDeviceDisplay = (device?: string) => {
    return device || 'Unknown';
  };

  const getBrowserDisplay = (browser?: string) => {
    return browser || 'Unknown';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <History className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Lịch sử đăng nhập</h2>
                <p className="text-blue-100 text-sm">Lịch sử đăng nhập gần đây của tài khoản</p>
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
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
              <p className="text-red-600 text-center">{error}</p>
              <button
                onClick={loadLoginHistory}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Thử lại
              </button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : loginHistory.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Chưa có lịch sử đăng nhập</p>
            </div>
          ) : (
            <div className="space-y-4">
              {loginHistory.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      {/* Status and Time */}
                      <div className="flex items-center space-x-3">
                        {item.status === 'success' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        <span className={`text-sm font-medium ${
                          item.status === 'success' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.status === 'success' ? 'Đăng nhập thành công' : 'Đăng nhập thất bại'}
                        </span>
                      </div>

                      {/* Time */}
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{formatDateTime(item.loginAt)}</span>
                      </div>

                      {/* Device and Browser */}
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Monitor className="w-4 h-4" />
                        <span>{getDeviceDisplay(item.device)} • {getBrowserDisplay(item.browser)}</span>
                      </div>

                      {/* IP Address */}
                      {item.ipAddress && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Globe className="w-4 h-4" />
                          <span>{item.ipAddress}</span>
                        </div>
                      )}

                      {/* Location */}
                      {item.location && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{item.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-2xl">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Hiển thị {loginHistory.length} lần đăng nhập gần nhất
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default LoginHistoryModal;

