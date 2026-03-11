import React, { useState, useEffect } from 'react';
import { X, Target, Eye, Check, XCircle, FileText, ChevronLeft } from 'lucide-react';
import { taskService, Task, TaskPriority, TaskAcceptanceStatus } from '../services/taskService';
import { useAuth } from '../contexts/AuthContext';

interface TaskListModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

const TaskListModal: React.FC<TaskListModalProps> = ({ isOpen, onClose, isAdmin = false }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [acceptingTaskId, setAcceptingTaskId] = useState<string | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    if (isOpen) {
      loadTasks();
    }
  }, [isOpen, currentPage, isAdmin]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const params: any = { page: currentPage, limit: itemsPerPage };
      const response = isAdmin
        ? await taskService.getAllTasks(params)
        : await taskService.getMyTasks(params);
      setTasks(response.data);
      setTotalPages(response.totalPages);
      setTotalItems(response.total || response.data.length);
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

  const getAcceptanceStatusBadge = (status?: string) => {
    switch (status) {
      case TaskAcceptanceStatus.DA_TIEP_NHAN:
        return { label: 'Đã tiếp nhận', class: 'bg-green-100 text-green-700' };
      case TaskAcceptanceStatus.TU_CHOI:
        return { label: 'Từ chối', class: 'bg-red-100 text-red-700' };
      default:
        return { label: 'Chưa tiếp nhận', class: 'bg-gray-100 text-gray-500' };
    }
  };

  const getMyAcceptanceStatus = (task: Task): string | undefined => {
    if (!user?._id || !task.trangThaiTiepNhan) return undefined;
    return task.trangThaiTiepNhan[user._id];
  };

  // Get overall acceptance status with counts for list view
  const getOverallAcceptanceInfo = (task: Task): { label: string; class: string } => {
    const total = task.nguoiNhan?.length || 0;
    if (total === 0 || !task.trangThaiTiepNhan) {
      return { label: 'Chưa tiếp nhận', class: 'bg-gray-100 text-gray-500' };
    }
    const acceptedCount = task.nguoiNhan.filter(
      n => task.trangThaiTiepNhan?.[n.id] === TaskAcceptanceStatus.DA_TIEP_NHAN
    ).length;

    if (acceptedCount === 0) {
      return { label: 'Chưa tiếp nhận', class: 'bg-gray-100 text-gray-500' };
    }
    if (acceptedCount === total) {
      return { label: 'Đã tiếp nhận', class: 'bg-green-100 text-green-700' };
    }
    return { label: `${acceptedCount}/${total} đã tiếp nhận`, class: 'bg-yellow-100 text-yellow-700' };
  };

  const handleAcceptTask = async (taskId: string, status: TaskAcceptanceStatus) => {
    try {
      setAcceptingTaskId(taskId);
      await taskService.acceptTask(taskId, status);
      await loadTasks();
      if (selectedTask?.id === taskId) {
        const updated = tasks.find(t => t.id === taskId);
        if (updated) setSelectedTask(updated);
      }
    } catch (error) {
      console.error('Error accepting task:', error);
    } finally {
      setAcceptingTaskId(null);
    }
  };

  if (!isOpen) return null;

  // Detail view for a selected task
  const renderDetailView = () => {
    if (!selectedTask) return null;
    const priorityBadge = getPriorityBadge(selectedTask.mucDoUuTien);
    const myStatus = getMyAcceptanceStatus(selectedTask);
    const isRecipient = user?._id && selectedTask.nguoiNhanIds
      ? (selectedTask as any).nguoiNhanIds?.includes(user._id)
      : selectedTask.nguoiNhan?.some(n => n.id === user?._id);

    return (
      <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
        <button onClick={() => setSelectedTask(null)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 mb-4 text-sm">
          <ChevronLeft className="w-4 h-4" /> Quay lại danh sách
        </button>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Nội dung</label>
            <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedTask.noiDung}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Người giao</label>
              <p className="mt-1 text-sm text-gray-900">
                {selectedTask.nguoiGiao ? `${selectedTask.nguoiGiao.firstName} ${selectedTask.nguoiGiao.lastName}` : 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Ngày giao</label>
              <p className="mt-1 text-sm text-gray-900">{new Date(selectedTask.ngayGiao).toLocaleDateString('vi-VN')}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Hạn hoàn thành</label>
              <p className="mt-1 text-sm text-gray-900">{new Date(selectedTask.thoiHanHoanThanh).toLocaleDateString('vi-VN')}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Mức độ ưu tiên</label>
              <p className="mt-1">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityBadge.class}`}>{priorityBadge.label}</span>
              </p>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Người nhận</label>
            <div className="mt-1 space-y-1">
              {selectedTask.nguoiNhan?.map(n => {
                const status = selectedTask.trangThaiTiepNhan?.[n.id];
                const statusBadge = getAcceptanceStatusBadge(status);
                return (
                  <div key={n.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-900">{n.firstName} {n.lastName}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusBadge.class}`}>{statusBadge.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {selectedTask.ghiChu && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Ghi chú</label>
              <p className="mt-1 text-sm text-gray-700">{selectedTask.ghiChu}</p>
            </div>
          )}
          {selectedTask.files && selectedTask.files.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">File đính kèm</label>
              <div className="mt-1 space-y-1">
                {selectedTask.files.map((file, i) => {
                  const fileName = file.split('/').pop() || file;
                  return (
                    <a key={i} href={`http://localhost:5000${file}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline text-sm">
                      <FileText className="w-4 h-4" /> {fileName}
                    </a>
                  );
                })}
              </div>
            </div>
          )}
          {/* Accept/Reject buttons for recipients */}
          {!isAdmin && isRecipient && (!myStatus || myStatus === TaskAcceptanceStatus.CHUA_TIEP_NHAN) && (
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => handleAcceptTask(selectedTask.id, TaskAcceptanceStatus.DA_TIEP_NHAN)}
                disabled={acceptingTaskId === selectedTask.id}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                <Check className="w-4 h-4" /> Tiếp nhận
              </button>
              <button
                onClick={() => handleAcceptTask(selectedTask.id, TaskAcceptanceStatus.TU_CHOI)}
                disabled={acceptingTaskId === selectedTask.id}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
              >
                <XCircle className="w-4 h-4" /> Từ chối
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">
              {selectedTask ? 'Chi tiết nhiệm vụ' : (isAdmin ? 'Danh sách nhiệm vụ (Tất cả)' : 'Danh sách nhiệm vụ')}
            </h2>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {selectedTask ? renderDetailView() : (
          <>
            {/* Table Content */}
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
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tasks.map((task, index) => {
                      const priorityBadge = getPriorityBadge(task.mucDoUuTien);
                      const myStatus = getMyAcceptanceStatus(task);
                      const overallInfo = getOverallAcceptanceInfo(task);
                      const statusBadge = isAdmin ? overallInfo : getAcceptanceStatusBadge(myStatus);
                      const isRecipient = user?._id && task.nguoiNhan?.some(n => n.id === user._id);
                      const canAccept = !isAdmin && isRecipient && (!myStatus || myStatus === TaskAcceptanceStatus.CHUA_TIEP_NHAN);
                      return (
                        <tr key={task.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                            {(currentPage - 1) * itemsPerPage + index + 1}
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
                      <td className="px-3 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusBadge.class}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedTask(task)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canAccept && (
                            <>
                              <button
                                onClick={() => handleAcceptTask(task.id, TaskAcceptanceStatus.DA_TIEP_NHAN)}
                                disabled={acceptingTaskId === task.id}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
                                title="Tiếp nhận"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleAcceptTask(task.id, TaskAcceptanceStatus.TU_CHOI)}
                                disabled={acceptingTaskId === task.id}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                                title="Từ chối"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
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
              <span className="text-sm text-gray-600">
                Hiển thị {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems} mục
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Trước
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
                  .map((page, idx, arr) => (
                    <React.Fragment key={page}>
                      {idx > 0 && arr[idx - 1] !== page - 1 && (
                        <span className="px-1 text-gray-400">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 text-sm rounded-md ${
                          page === currentPage
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sau
                </button>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
};

export default TaskListModal;

