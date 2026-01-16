import React, { useState, useEffect } from 'react';
import { X, MessageSquare, AlertTriangle, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';
import { privateFeedbackService, PrivateFeedback, FeedbackStatus } from '../services/privateFeedbackService';

interface FeedbackListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackListModal: React.FC<FeedbackListModalProps> = ({ isOpen, onClose }) => {
  const [feedbacks, setFeedbacks] = useState<PrivateFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'GOP_Y' | 'NEU_KHO_KHAN'>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<PrivateFeedback | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadFeedbacks();
    }
  }, [isOpen, activeTab]);

  const loadFeedbacks = async () => {
    try {
      setLoading(true);
      const response = await privateFeedbackService.getAll({
        page: 1,
        limit: 100,
        type: activeTab === 'all' ? undefined : activeTab
      });
      setFeedbacks(response.data);
    } catch (error) {
      console.error('Error loading feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: FeedbackStatus) => {
    const statusConfig = {
      PENDING: { label: 'Chờ xử lý', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      IN_PROGRESS: { label: 'Đang xử lý', color: 'bg-blue-100 text-blue-800', icon: Clock },
      RESOLVED: { label: 'Đã giải quyết', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      REJECTED: { label: 'Từ chối', color: 'bg-red-100 text-red-800', icon: XCircle }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const getTypeBadge = (type: 'GOP_Y' | 'NEU_KHO_KHAN') => {
    if (type === 'GOP_Y') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
          <MessageSquare className="w-3 h-3 mr-1" />
          Góp ý
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Khó khăn
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Danh sách Góp ý & Khó khăn</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setActiveTab('GOP_Y')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'GOP_Y'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Góp ý
          </button>
          <button
            onClick={() => setActiveTab('NEU_KHO_KHAN')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'NEU_KHO_KHAN'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Khó khăn
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Chưa có dữ liệu</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getTypeBadge(feedback.type)}
                      {getStatusBadge(feedback.status)}
                    </div>
                    <span className="text-sm text-gray-500">{feedback.code}</span>
                  </div>

                  <div className="mb-3">
                    <p className="text-gray-900 font-medium mb-1">
                      {feedback.user ? `${feedback.user.firstName} ${feedback.user.lastName}` : 'N/A'}
                    </p>
                    <p className="text-gray-700 text-sm line-clamp-2">{feedback.content}</p>
                  </div>

                  {feedback.type === 'GOP_Y' && feedback.purpose && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-gray-500">Mục đích: </span>
                      <span className="text-xs text-gray-700">{feedback.purpose}</span>
                    </div>
                  )}

                  {feedback.type === 'NEU_KHO_KHAN' && feedback.solution && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-gray-500">Giải pháp: </span>
                      <span className="text-xs text-gray-700">{feedback.solution}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      {new Date(feedback.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                    <button
                      onClick={() => setSelectedFeedback(feedback)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Chi tiết
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Chi tiết</h3>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã</label>
                <p className="text-gray-900">{selectedFeedback.code}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
                {getTypeBadge(selectedFeedback.type)}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                {getStatusBadge(selectedFeedback.status)}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Người gửi</label>
                <p className="text-gray-900">
                  {selectedFeedback.user ? `${selectedFeedback.user.firstName} ${selectedFeedback.user.lastName}` : 'N/A'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung</label>
                <p className="text-gray-900 whitespace-pre-wrap">{selectedFeedback.content}</p>
              </div>

              {selectedFeedback.type === 'GOP_Y' && selectedFeedback.purpose && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mục đích</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedFeedback.purpose}</p>
                </div>
              )}

              {selectedFeedback.type === 'NEU_KHO_KHAN' && selectedFeedback.solution && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giải pháp đề xuất</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedFeedback.solution}</p>
                </div>
              )}

              {selectedFeedback.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedFeedback.notes}</p>
                </div>
              )}

              {selectedFeedback.response && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-blue-900 mb-1">Phản hồi</label>
                  <p className="text-blue-800 whitespace-pre-wrap">{selectedFeedback.response}</p>
                  {selectedFeedback.respondedAt && (
                    <p className="text-xs text-blue-600 mt-2">
                      {new Date(selectedFeedback.respondedAt).toLocaleString('vi-VN')}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày tạo</label>
                <p className="text-gray-900">{new Date(selectedFeedback.createdAt).toLocaleString('vi-VN')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackListModal;

