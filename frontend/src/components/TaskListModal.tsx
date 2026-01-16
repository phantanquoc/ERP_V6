import React, { useState, useEffect } from 'react';
import { X, Target, Users, Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { taskService, Task, TaskPriority } from '../services/taskService';

interface TaskListModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

const TaskListModal: React.FC<TaskListModalProps> = ({ isOpen, onClose, isAdmin = false }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (isOpen) {
      loadTasks();
    }
  }, [isOpen, currentPage, isAdmin]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const params: any = { page: currentPage, limit: 10 };
      // If admin, load all tasks; otherwise load only user's tasks
      const response = isAdmin
        ? await taskService.getAllTasks(params)
        : await taskService.getMyTasks(params);
      setTasks(response.data);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    const badges = {
      [TaskPriority.KHAN_CAP]: { label: 'Khẩn cấp', class: 'bg-red-100 text-red-700' },
      [TaskPriority.CAO]: { label: 'Cao', class: 'bg-orange-100 text-orange-700' },
      [TaskPriority.TRUNG_BINH]: { label: 'Trung bình', class: 'bg-yellow-100 text-yellow-700' },
      [TaskPriority.THAP]: { label: 'Thấp', class: 'bg-gray-100 text-gray-700' },
    };
    return badges[priority] || badges[TaskPriority.TRUNG_BINH];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">
              {isAdmin ? 'Danh sách nhiệm vụ (Tất cả)' : 'Danh sách nhiệm vụ'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Đang tải...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Không có nhiệm vụ nào</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => {
                const priorityBadge = getPriorityBadge(task.mucDoUuTien);

                return (
                  <div
                    key={task.id}
                    className="border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-shadow bg-white"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${priorityBadge.class}`}>
                            {priorityBadge.label}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{task.noiDung}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-600" />
                            <span>
                              <strong>Người giao:</strong> {task.nguoiGiao ? `${task.nguoiGiao.firstName} ${task.nguoiGiao.lastName}` : 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-green-600" />
                            <span>
                              <strong>Hạn:</strong> {new Date(task.thoiHanHoanThanh).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-600" />
                            <span>
                              <strong>Ngày giao:</strong> {new Date(task.ngayGiao).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                          {task.nguoiNhan && task.nguoiNhan.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-orange-600" />
                              <span>
                                <strong>Người nhận:</strong> {task.nguoiNhan.length} người
                              </span>
                            </div>
                          )}
                        </div>
                        {task.ghiChu && (
                          <div className="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                            <p className="text-sm text-gray-700">
                              <strong className="text-yellow-700">Ghi chú:</strong> {task.ghiChu}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && tasks.length > 0 && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trang trước
              </button>
              <span className="text-sm text-gray-600">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trang sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskListModal;

