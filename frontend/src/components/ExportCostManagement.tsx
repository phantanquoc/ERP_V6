import React, { useState } from 'react';
import { Plus, Edit, Trash2, X, Download, DollarSign, Plane } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import ConfirmDialog from './common/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import exportCostService, { ExportCost, CreateExportCostInput, UpdateExportCostInput } from '../services/exportCostService';
import generalCostService, { GeneralCost, CreateGeneralCostInput, UpdateGeneralCostInput } from '../services/generalCostService';
import { parseNumberInput } from '../utils/numberInput';
import TableFilter, { FilterField } from './TableFilter';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { AuditLog } from '../services/auditLogService';
import UnitSelect from './common/UnitSelect';
import { useExportCosts, exportCostKeys } from '../hooks';
import { useQueryClient } from '@tanstack/react-query';

type CostType = 'export' | 'general';
type AnyCost = ExportCost | GeneralCost;

const EXPORT_ACTION_LABELS: Record<string, { label: string; className: string }> = {
  CREATE: { label: 'Tạo mới', className: 'bg-green-100 text-green-800' },
  UPDATE: { label: 'Cập nhật', className: 'bg-blue-100 text-blue-800' },
  DELETE: { label: 'Xóa', className: 'bg-red-100 text-red-800' },
};

const ExportAuditLogRow: React.FC<{ entry: AuditLog }> = ({ entry }) => {
  const [expanded, setExpanded] = React.useState(false);
  const chip = EXPORT_ACTION_LABELS[entry.action] ?? { label: entry.action, className: 'bg-gray-100 text-gray-800' };
  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50">
        <td className="px-3 py-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${chip.className}`}>{chip.label}</span>
        </td>
        <td className="px-3 py-2 text-gray-700 text-xs">{entry.actorId}</td>
        <td className="px-3 py-2 text-gray-500 text-xs">{entry.actorRole}</td>
        <td className="px-3 py-2 text-gray-500 text-xs">{new Date(entry.createdAt).toLocaleString('vi-VN')}</td>
        <td className="px-3 py-2">
          {(entry.before !== null || entry.after !== null) && (
            <button onClick={() => setExpanded(e => !e)} className="text-blue-600 hover:underline text-xs">
              {expanded ? 'Ẩn' : 'Chi tiết'}
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="px-3 pb-3 bg-gray-50">
            <div className="grid grid-cols-2 gap-2 mt-1">
              {entry.before !== null && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Trước</p>
                  <pre className="whitespace-pre-wrap text-xs font-mono text-gray-700 bg-white border rounded p-2 max-h-40 overflow-y-auto">
                    {JSON.stringify(entry.before, null, 2)}
                  </pre>
                </div>
              )}
              {entry.after !== null && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Sau</p>
                  <pre className="whitespace-pre-wrap text-xs font-mono text-gray-700 bg-white border rounded p-2 max-h-40 overflow-y-auto">
                    {JSON.stringify(entry.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const ExportCostManagement: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [costType, setCostType] = useState<CostType>('export');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({ _search: '', tenChiPhi: '', loaiChiPhi: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [detailItem, setDetailItem] = useState<AnyCost | null>(null);

  const filterFields: FilterField[] = [
    { key: 'tenChiPhi', label: 'Tên chi phí', type: 'text', placeholder: 'Lọc tên chi phí...' },
    { key: 'loaiChiPhi', label: 'Loại chi phí', type: 'text', placeholder: 'Lọc loại chi phí...' },
  ];
  const [showModal, setShowModal] = useState(false);
  const [editingCost, setEditingCost] = useState<AnyCost | null>(null);
  // Audit log tab state for edit modal (task 11.3)
  const [exportCostModalTab, setExportCostModalTab] = useState<'form' | 'audit'>('form');
  const [exportCostAuditPage, setExportCostAuditPage] = useState(1);
  const { data: exportCostAuditData } = useAuditLogs(
    { entityType: 'ExportCost', entityId: (editingCost as ExportCost)?.id ?? '', page: exportCostAuditPage, limit: 10 },
    !!(editingCost as ExportCost)?.id && exportCostModalTab === 'audit'
  );
  const [formData, setFormData] = useState<CreateExportCostInput>({
    tenChiPhi: '',
    loaiChiPhi: '',
    noiDung: '',
    donViTinh: '',
    giaThanhNgay: undefined,
    donViTien: 'VND',
    msnv: user?.employeeCode || '',
    tenNhanVien: user?.firstName && user?.lastName ? `${user.lastName} ${user.firstName}` : '',
  });

  // General costs: still use manual state (no hook yet)
  const [generalCosts, setGeneralCosts] = useState<GeneralCost[]>([]);
  const [generalLoading, setGeneralLoading] = useState(false);

  const isExport = costType === 'export';
  const label = isExport ? 'chi phí xuất khẩu' : 'chi phí chung';
  const Label = isExport ? 'Chi phí Xuất khẩu' : 'Chi phí Chung';

  // Export costs via TanStack Query hook
  const { data: exportCostData, isLoading: exportLoading } = useExportCosts({
    page: currentPage,
    limit,
    search: filterValues._search || undefined,
    loaiChiPhi: filterValues.loaiChiPhi || undefined,
  });

  const exportCosts = exportCostData?.data ?? [];
  const exportTotal = exportCostData?.pagination?.total ?? 0;
  const exportTotalPages = exportCostData?.pagination?.totalPages ?? 1;

  // Load general costs when that tab is active
  React.useEffect(() => {
    if (!isExport) {
      loadGeneralCosts();
    }
  }, [filterValues._search, isExport]);

  const loadGeneralCosts = async () => {
    try {
      setGeneralLoading(true);
      const response = await generalCostService.getAllGeneralCosts(1, 1000, filterValues._search || '');
      setGeneralCosts(response.data);
    } catch (error) {
      console.error('Error loading chi phí chung:', error);
      toast.error('Lỗi khi tải danh sách chi phí chung');
    } finally {
      setGeneralLoading(false);
    }
  };

  const loading = isExport ? exportLoading : generalLoading;
  const costs: AnyCost[] = isExport ? exportCosts : generalCosts;
  const totalItems = isExport ? exportTotal : generalCosts.length;
  const totalPages = isExport ? exportTotalPages : Math.ceil(generalCosts.length / limit);

  const handleOpenModal = (cost?: AnyCost) => {
    if (cost) {
      setEditingCost(cost);
      setFormData({
        tenChiPhi: cost.tenChiPhi,
        loaiChiPhi: cost.loaiChiPhi,
        noiDung: cost.noiDung || '',
        donViTinh: cost.donViTinh || '',
        giaThanhNgay: cost.giaThanhNgay || 0,
        donViTien: cost.donViTien || 'VND',
      });
    } else {
      setEditingCost(null);
      setFormData({
        tenChiPhi: '',
        loaiChiPhi: '',
        noiDung: '',
        donViTinh: '',
        giaThanhNgay: 0,
        donViTien: 'VND',
        msnv: user?.employeeCode || '',
        tenNhanVien: user?.firstName && user?.lastName ? `${user.lastName} ${user.firstName}` : '',
      });
    }
    setExportCostModalTab('form');
    setExportCostAuditPage(1);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCost(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tenChiPhi || !formData.loaiChiPhi) {
      toast.error('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }

    try {
      if (isExport) {
        if (editingCost) {
          await exportCostService.updateExportCost(editingCost.id, formData as UpdateExportCostInput);
        } else {
          await exportCostService.createExportCost(formData);
        }
      } else {
        if (editingCost) {
          await generalCostService.updateGeneralCost(editingCost.id, formData as UpdateGeneralCostInput);
        } else {
          await generalCostService.createGeneralCost(formData as CreateGeneralCostInput);
        }
      }
      toast.success(editingCost ? `Cập nhật ${label} thành công!` : `Tạo ${label} thành công!`);
      handleCloseModal();
      if (isExport) {
        queryClient.invalidateQueries({ queryKey: exportCostKeys.lists() });
      } else {
        loadGeneralCosts();
      }
    } catch (error) {
      console.error(`Error saving ${label}:`, error);
      toast.error(`Lỗi khi lưu ${label}`);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmMessage('Bạn có chắc chắn muốn xóa chi phí này?');
    setConfirmAction(() => async () => {
      setConfirmOpen(false);
      try {
        if (isExport) {
          await exportCostService.deleteExportCost(id);
        } else {
          await generalCostService.deleteGeneralCost(id);
        }
        toast.success(`Xóa ${label} thành công!`);
        if (isExport) {
          queryClient.invalidateQueries({ queryKey: exportCostKeys.lists() });
        } else {
          loadGeneralCosts();
        }
      } catch (error) {
        console.error(`Error deleting ${label}:`, error);
        toast.error(`Lỗi khi xóa ${label}`);
      }
    });
    setConfirmOpen(true);
  };

  const handleExportExcel = async () => {
    try {
      if (isExport) {
        await exportCostService.exportToExcel();
      } else {
        await generalCostService.exportToExcel();
      }
      toast.success('Xuất file Excel thành công!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Lỗi khi xuất file Excel');
    }
  };

  const handleSwitchCostType = (type: CostType) => {
    setCostType(type);
    setCurrentPage(1);
    setFilterValues({ _search: '', tenChiPhi: '', loaiChiPhi: '' });
  };

  return (
    <div className="space-y-4">
      {/* Cost Type Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => handleSwitchCostType('export')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium text-sm transition-colors ${
            costType === 'export'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Plane className="w-4 h-4" />
          Chi phí Xuất khẩu
        </button>
        <button
          onClick={() => handleSwitchCostType('general')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium text-sm transition-colors ${
            costType === 'general'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Chi phí Chung
        </button>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý {Label}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Xuất Excel
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Tạo {label}
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <TableFilter
        filters={filterFields}
        values={filterValues}
        onChange={(vals) => { setFilterValues(vals); setCurrentPage(1); }}
        searchPlaceholder="Tìm kiếm mã, tên, loại chi phí..."
      />

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mã chi phí</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tên chi phí</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Loại chi phí</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Đơn vị tính</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Giá thành/ngày</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Người tạo</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : costs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              costs.map((cost, index) => (
                <tr
                  key={cost.id}
                  onClick={() => setDetailItem(cost)}
                  className={`border-b border-gray-200 border-l-2 border-l-transparent hover:bg-blue-100 hover:border-l-blue-500 cursor-pointer transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-700">
                    {cost.maChiPhi}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {cost.tenChiPhi}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {cost.loaiChiPhi}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {cost.donViTinh || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {cost.giaThanhNgay ? `${new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(cost.giaThanhNgay)} ${cost.donViTien || 'VND'}` : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {cost.tenNhanVien || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenModal(cost)}
                        className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cost.id)}
                        className="p-1.5 rounded-md text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Server-side pagination + page-size selector */}
      {totalItems > 0 && (
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              Hiển thị {(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, totalItems)} / {totalItems} mục
            </span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setCurrentPage(1); }}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/trang</option>)}
            </select>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
                .map((page, idx, arr) => (
                  <React.Fragment key={page}>
                    {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1 text-gray-400">...</span>}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 text-sm rounded-md ${page === currentPage ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={showModal} onClose={handleCloseModal} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 shrink-0">
            <h3 className="text-xl font-bold text-gray-800">
              {editingCost ? `Chỉnh sửa ${label}` : `Tạo ${label}`}
            </h3>
            <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tab navigation — shown only when editing and ADMIN/DEPARTMENT_HEAD (task 11.3/11.4) */}
          {editingCost && (user?.role === 'ADMIN' || user?.role === 'DEPARTMENT_HEAD') && (
            <div className="flex border-b border-gray-200 px-6 shrink-0">
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${exportCostModalTab === 'form' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setExportCostModalTab('form')}
              >
                Thông tin
              </button>
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${exportCostModalTab === 'audit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setExportCostModalTab('audit')}
              >
                Lịch sử hoạt động
              </button>
            </div>
          )}

          {exportCostModalTab === 'audit' && editingCost ? (
            <div className="overflow-y-auto flex-1 p-6">
              {!exportCostAuditData?.data?.length ? (
                <p className="text-gray-500 text-sm text-center py-6">Chưa có hoạt động nào</p>
              ) : (
                <>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Hành động</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Người thực hiện</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Vai trò</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Thời gian</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {exportCostAuditData.data.map((entry) => (
                        <ExportAuditLogRow key={entry.id} entry={entry} />
                      ))}
                    </tbody>
                  </table>
                  {exportCostAuditData.pagination.totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-3">
                      <button type="button" disabled={exportCostAuditPage <= 1} onClick={() => setExportCostAuditPage(p => p - 1)} className="px-2 py-1 text-xs border rounded disabled:opacity-40">Trước</button>
                      <span className="text-xs self-center">{exportCostAuditPage}/{exportCostAuditData.pagination.totalPages}</span>
                      <button type="button" disabled={exportCostAuditPage >= exportCostAuditData.pagination.totalPages} onClick={() => setExportCostAuditPage(p => p + 1)} className="px-2 py-1 text-xs border rounded disabled:opacity-40">Sau</button>
                    </div>
                  )}
                </>
              )}
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Đóng</button>
              </div>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6">
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên chi phí <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.tenChiPhi}
                    onChange={(e) => setFormData({ ...formData, tenChiPhi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại chi phí <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.loaiChiPhi}
                    onChange={(e) => setFormData({ ...formData, loaiChiPhi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đơn vị tính
                  </label>
                  <UnitSelect
                    value={formData.donViTinh}
                    onChange={(val) => setFormData({ ...formData, donViTinh: val })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giá thành/ngày
                  </label>
                  <div className="grid grid-cols-[70%_30%] gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.giaThanhNgay || ''}
                      onChange={(e) => setFormData({ ...formData, giaThanhNgay: e.target.value ? parseNumberInput(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập giá thành/ngày"
                    />
                    <select
                      value={formData.donViTien || 'VND'}
                      onChange={(e) => setFormData({ ...formData, donViTien: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="VND">VND</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nội dung
                  </label>
                  <textarea
                    value={formData.noiDung}
                    onChange={(e) => setFormData({ ...formData, noiDung: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingCost ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
          </form>
          )}
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!detailItem} onClose={() => setDetailItem(null)} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-800">Chi tiết {label}</h3>
            <button onClick={() => setDetailItem(null)} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>
          {detailItem && (
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Mã chi phí:</span><p className="font-medium text-gray-900">{detailItem.maChiPhi}</p></div>
                <div><span className="text-gray-500">Tên chi phí:</span><p className="font-medium text-gray-900">{detailItem.tenChiPhi}</p></div>
                <div><span className="text-gray-500">Loại chi phí:</span><p className="font-medium text-gray-900">{detailItem.loaiChiPhi}</p></div>
                <div><span className="text-gray-500">Đơn vị tính:</span><p className="font-medium text-gray-900">{detailItem.donViTinh || '-'}</p></div>
                <div><span className="text-gray-500">Giá thành/ngày:</span><p className="font-medium text-gray-900">{detailItem.giaThanhNgay ? `${new Intl.NumberFormat('vi-VN').format(detailItem.giaThanhNgay)} ${detailItem.donViTien || 'VND'}` : '-'}</p></div>
                <div><span className="text-gray-500">Người tạo:</span><p className="font-medium text-gray-900">{detailItem.tenNhanVien || '-'}</p></div>
                {detailItem.noiDung && (
                  <div className="col-span-2"><span className="text-gray-500">Nội dung:</span><p className="font-medium text-gray-900">{detailItem.noiDung}</p></div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button onClick={() => setDetailItem(null)} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Đóng</button>
                <button
                  onClick={() => { setDetailItem(null); handleOpenModal(detailItem); }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Chỉnh sửa
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Xác nhận xóa"
        message={confirmMessage}
        onConfirm={() => confirmAction && confirmAction()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};

export default ExportCostManagement;

