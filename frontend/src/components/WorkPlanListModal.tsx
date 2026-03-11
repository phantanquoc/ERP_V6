import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText, Eye, Clock, User, Users, Flag, AlertCircle, Download } from 'lucide-react';
import { workPlanService, WorkPlan, WorkPlanPriority, WorkPlanStatus } from '../services/workPlanService';
import Modal from './Modal';

interface WorkPlanListModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

const WorkPlanListModal: React.FC<WorkPlanListModalProps> = ({ isOpen, onClose, isAdmin = false }) => {
  const [plans, setPlans] = useState<WorkPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [viewPlan, setViewPlan] = useState<WorkPlan | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    if (isOpen) loadPlans();
  }, [isOpen, currentPage]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = isAdmin
        ? await workPlanService.getAllWorkPlans(currentPage, itemsPerPage)
        : await workPlanService.getMyWorkPlans(currentPage, itemsPerPage);
      setPlans(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalItems(response.pagination?.total || response.data?.length || 0);
    } catch (error) {
      console.error('Error loading work plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority: WorkPlanPriority) => {
    const badges: Record<string, { label: string; class: string }> = {
      [WorkPlanPriority.KHAN_CAP]: { label: 'Khẩn cấp', class: 'bg-red-100 text-red-700' },
      [WorkPlanPriority.CAO]: { label: 'Cao', class: 'bg-orange-100 text-orange-700' },
      [WorkPlanPriority.TRUNG_BINH]: { label: 'Trung bình', class: 'bg-yellow-100 text-yellow-700' },
      [WorkPlanPriority.THAP]: { label: 'Thấp', class: 'bg-gray-100 text-gray-700' },
    };
    return badges[priority] || badges[WorkPlanPriority.TRUNG_BINH];
  };

  const getStatusBadge = (status: WorkPlanStatus) => {
    const badges: Record<string, { label: string; class: string }> = {
      [WorkPlanStatus.CHUA_BAT_DAU]: { label: 'Chưa bắt đầu', class: 'bg-gray-100 text-gray-700' },
      [WorkPlanStatus.DANG_THUC_HIEN]: { label: 'Đang thực hiện', class: 'bg-blue-100 text-blue-700' },
      [WorkPlanStatus.HOAN_THANH]: { label: 'Hoàn thành', class: 'bg-green-100 text-green-700' },
      [WorkPlanStatus.HUY]: { label: 'Hủy', class: 'bg-red-100 text-red-700' },
    };
    return badges[status] || badges[WorkPlanStatus.CHUA_BAT_DAU];
  };

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Danh sách kế hoạch công việc</h2>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-x-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Đang tải...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Không có kế hoạch nào</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">STT</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiêu đề</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người tạo</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người thực hiện</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày bắt đầu</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày kết thúc</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ưu tiên</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {plans.map((plan, index) => {
                  const priorityBadge = getPriorityBadge(plan.mucDoUuTien);
                  const statusBadge = getStatusBadge(plan.trangThai);
                  return (
                    <tr key={plan.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-sm text-gray-900">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td className="px-3 py-3 text-sm text-gray-900 max-w-[200px]">
                        <div className="line-clamp-2" title={plan.tieuDe}>{plan.tieuDe}</div>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900">
                        {plan.nguoiTao ? `${plan.nguoiTao.firstName} ${plan.nguoiTao.lastName}` : 'N/A'}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900">
                        {plan.nguoiThucHien && plan.nguoiThucHien.length > 0 ? (
                          <div className="max-w-[120px]">
                            <span className="text-purple-600 font-medium">{plan.nguoiThucHien.length} người</span>
                            <div className="text-xs text-gray-500 truncate" title={plan.nguoiThucHien.map((n: any) => `${n.firstName} ${n.lastName}`).join(', ')}>
                              {plan.nguoiThucHien.map((n: any) => `${n.firstName} ${n.lastName}`).join(', ')}
                            </div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900">{new Date(plan.ngayBatDau).toLocaleDateString('vi-VN')}</td>
                      <td className="px-3 py-3 text-sm text-gray-900">{new Date(plan.ngayKetThuc).toLocaleDateString('vi-VN')}</td>
                      <td className="px-3 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityBadge.class}`}>{priorityBadge.label}</span>
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusBadge.class}`}>{statusBadge.label}</span>
                      </td>
                      <td className="px-3 py-3 text-sm">
                        {plan.files && plan.files.length > 0 ? plan.files.map((file, i) => (
                          <a key={i} href={`http://localhost:5000${file}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:underline text-xs">
                            <FileText className="w-3 h-3" /><span className="truncate max-w-[80px]">{file.split('/').pop()}</span>
                          </a>
                        )) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-3 py-3 text-sm text-center">
                        <button
                          onClick={() => setViewPlan(plan)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-purple-600 hover:bg-purple-50 rounded-lg transition-colors font-medium"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Xem</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!loading && plans.length > 0 && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Hiển thị {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems} mục
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">Trước</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                  .map((page, idx, arr) => (
                    <React.Fragment key={page}>
                      {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1 text-gray-400">...</span>}
                      <button onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 text-sm rounded-md ${page === currentPage ? 'bg-purple-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}>{page}</button>
                    </React.Fragment>
                  ))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">Sau</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Detail Modal */}
    {viewPlan && (
      <Modal isOpen={true} onClose={() => setViewPlan(null)}>
        <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Chi tiết kế hoạch
              </h3>
              <button
                onClick={() => setViewPlan(null)}
                className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            <div className="space-y-5">
              {/* Tiêu đề */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Tiêu đề</label>
                <p className="text-lg font-semibold text-gray-900">{viewPlan.tieuDe}</p>
              </div>

              {/* Nội dung */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Nội dung</label>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap">
                  {viewPlan.noiDung || <span className="text-gray-400 italic">Không có nội dung</span>}
                </div>
              </div>

              {/* Grid 2 cột */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    <User className="w-3.5 h-3.5 inline mr-1" />Người tạo
                  </label>
                  <p className="text-sm text-gray-900">
                    {viewPlan.nguoiTao ? `${viewPlan.nguoiTao.firstName} ${viewPlan.nguoiTao.lastName}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    <Users className="w-3.5 h-3.5 inline mr-1" />Người thực hiện
                  </label>
                  {viewPlan.nguoiThucHien && viewPlan.nguoiThucHien.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {viewPlan.nguoiThucHien.map((n: any, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          {n.firstName} {n.lastName}
                        </span>
                      ))}
                    </div>
                  ) : <p className="text-sm text-gray-400">-</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    <Clock className="w-3.5 h-3.5 inline mr-1" />Ngày bắt đầu
                  </label>
                  <p className="text-sm text-gray-900">{new Date(viewPlan.ngayBatDau).toLocaleDateString('vi-VN')}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    <Clock className="w-3.5 h-3.5 inline mr-1" />Ngày kết thúc
                  </label>
                  <p className="text-sm text-gray-900">{new Date(viewPlan.ngayKetThuc).toLocaleDateString('vi-VN')}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    <Flag className="w-3.5 h-3.5 inline mr-1" />Mức độ ưu tiên
                  </label>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getPriorityBadge(viewPlan.mucDoUuTien).class}`}>
                    {getPriorityBadge(viewPlan.mucDoUuTien).label}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    <AlertCircle className="w-3.5 h-3.5 inline mr-1" />Trạng thái
                  </label>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadge(viewPlan.trangThai).class}`}>
                    {getStatusBadge(viewPlan.trangThai).label}
                  </span>
                </div>
              </div>

              {/* Ghi chú */}
              {viewPlan.ghiChu && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Ghi chú</label>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap">
                    {viewPlan.ghiChu}
                  </div>
                </div>
              )}

              {/* Files */}
              {viewPlan.files && viewPlan.files.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-2">File đính kèm</label>
                  <div className="space-y-2">
                    {viewPlan.files.map((file, i) => (
                      <a key={i} href={`http://localhost:5000${file}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm text-blue-600">
                        <Download className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{file.split('/').pop()}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="pt-3 border-t border-gray-200 flex flex-wrap gap-4 text-xs text-gray-400">
                <span>Tạo lúc: {new Date(viewPlan.createdAt).toLocaleString('vi-VN')}</span>
                <span>Cập nhật: {new Date(viewPlan.updatedAt).toLocaleString('vi-VN')}</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    )}
    </>
  );
};

export default WorkPlanListModal;

