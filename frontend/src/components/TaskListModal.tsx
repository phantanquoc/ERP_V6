import React, { useState, useEffect } from 'react';
import { X, Target, Users, Calendar, AlertCircle, CheckCircle, Clock, FileText, Download } from 'lucide-react';
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
        <div className="p-6 overflow-x-auto max-h-[calc(90vh-200px)]">
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
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nội dung</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người giao</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người nhận</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày giao</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hạn hoàn thành</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ưu tiên</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ghi chú</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File đính kèm</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map((task, index) => {
                  const priorityBadge = getPriorityBadge(task.mucDoUuTien);
                  return (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                        {(currentPage - 1) * 10 + index + 1}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900 max-w-[200px]">
                        <div className="line-clamp-2" title={task.noiDung}>{task.noiDung}</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                        {task.nguoiGiao ? `${task.nguoiGiao.firstName} ${task.nguoiGiao.lastName}` : 'N/A'}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900">
                        {task.nguoiNhan && task.nguoiNhan.length > 0 ? (
                          <div className="max-w-[120px]">
                            <span className="text-blue-600 font-medium">{task.nguoiNhan.length} người</span>
                            <div className="text-xs text-gray-500 truncate" title={task.nguoiNhan.map(n => `${n.firstName} ${n.lastName}`).join(', ')}>
                              {task.nguoiNhan.map(n => `${n.firstName} ${n.lastName}`).join(', ')}
                            </div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                        {new Date(task.ngayGiao).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                        {new Date(task.thoiHanHoanThanh).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityBadge.class}`}>
                          {priorityBadge.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-500 max-w-[120px]">
                        <div className="truncate" title={task.ghiChu || ''}>
                          {task.ghiChu || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm">
                        {task.files && task.files.length > 0 ? (
                          <div className="space-y-1">
                            {task.files.map((file, fileIndex) => {
                              const fileName = file.split('/').pop() || file;
                              return (
                                <a
                                  key={fileIndex}
                                  href={`http://localhost:5000${file}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline text-xs"
                                  title={fileName}
                                >
                                  <FileText className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate max-w-[100px]">{fileName}</span>
                                </a>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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

