import React, { useMemo, useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Settings, Save } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import Modal from './Modal';
import ConfirmDeleteModal from './common/ConfirmDeleteModal';
import materialEvaluationService, { MaterialEvaluation, MaterialEvaluationDeleteInfo } from '../services/materialEvaluationService';
import materialEvaluationCriteriaService, { MaterialEvaluationCriteria } from '../services/materialEvaluationCriteriaService';
import systemOperationService from '../services/systemOperationService';
import DateTimePicker from './DateTimePicker';
import { parseNumberInput } from '../utils/numberInput';
import { getQuickTimesForShift, computeShiftDatetime } from '../utils/shiftTime';
import TableFilter, { FilterField } from './TableFilter';
import { useAuth } from '../contexts/AuthContext';
import { useProductionEmployees } from '../hooks/useProductionEmployees';
import { useRawMaterials } from '../hooks/useRawMaterials';
import { useLotsByProduct, lotsByProductKeys } from '../hooks/useLotsByProduct';
import { useKienByProductAndLot } from '../hooks/useKienByProductAndLot';
import { lotProductKeys } from '../services/lotProductService';
import { materialEvaluationKeys } from '../hooks/useProductionEntities';
import { warehouseIssueKeys } from '../hooks/useWarehouseIssues';
import { useDailyFrySchedule } from '../hooks/useDailyFrySchedule';
import { productionDayRange, getCurrentProductionDay } from '../utils/productionDay';
import toast from 'react-hot-toast';


interface MaterialEvaluationManagementProps {
  onCreateSystemOperation?: (maChien: string, thoiGianChien: string) => void;
  productionDay?: string;
}

const normalizeSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const MaterialEvaluationManagement: React.FC<MaterialEvaluationManagementProps> = ({ onCreateSystemOperation, productionDay: productionDayProp }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: productionEmployees = [], isLoading: loadingProductionEmployees } = useProductionEmployees();
  const [isNguoiThucHienOpen, setIsNguoiThucHienOpen] = useState(false);

  // Cascade dropdown state for create form
  const [productId, setProductId] = useState<string>('');
  const [lotId, setLotId] = useState<string>('');
  const [lotProductId, setLotProductId] = useState<string>('');
  const [khoiLuongError, setKhoiLuongError] = useState<string>('');

  const { data: rawMaterials = [], isLoading: loadingRawMaterials } = useRawMaterials();
  const { data: lots = [], isLoading: loadingLots } = useLotsByProduct(productId || null);
  const { data: kienList = [], isLoading: loadingKien } = useKienByProductAndLot(
    productId || null,
    lotId || null
  );

  const selectedKien = kienList.find(k => k.id === lotProductId) ?? null;

  // Daily schedule production day — prefer prop from parent, fallback to current
  const currentProductionDay = useMemo(() => productionDayProp || getCurrentProductionDay(), [productionDayProp]);

  const [evaluations, setEvaluations] = useState<MaterialEvaluation[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<MaterialEvaluation | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({ _search: '', maChien: '', tenHangHoa: '' });

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteInfo, setDeleteInfo] = useState<MaterialEvaluationDeleteInfo | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);


  const evaluationFilterFields: FilterField[] = [
    { key: 'maChien', label: 'Mã chiên', type: 'text' },
    { key: 'tenHangHoa', label: 'Mã hàng hóa', type: 'text' },
  ];

  // Criteria states
  const [criteria, setCriteria] = useState<MaterialEvaluationCriteria[]>([]);
  const [criteriaLoading, setCriteriaLoading] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState<MaterialEvaluationCriteria | null>(null);
  const [newCriteriaCode, setNewCriteriaCode] = useState<number>(0);
  const [newCriteriaDescription, setNewCriteriaDescription] = useState<string>('');

  const [formData, setFormData] = useState<Partial<MaterialEvaluation>>({
    maChien: '',
    thoiGianChien: '',
    tenHangHoa: '',
    soLoKien: '',
    khoiLuong: 0,
    soLanNgam: 0,
    nhietDoNuocTruocNgam: 0,
    nhietDoNuocSauVot: 0,
    thoiGianNgam: 0,
    brixNuocNgam: 0,
    danhGiaTruocNgam: '',
    danhGiaSauNgam: '',
    nguoiThucHien: '',
    ca: null,
  });

  // Daily schedule for batch code picker (depends on formData.ca)
  const { data: scheduledBatches = [] } = useDailyFrySchedule(
    currentProductionDay,
    formData.ca ? Number(formData.ca) : undefined,
  );

  // Full 16-batch schedule for the table — unlike scheduledBatches above this is
  // never narrowed by formData.ca, so picking a shift in the modal does not shrink
  // the table behind it.
  const { data: fullDaySchedule = [] } = useDailyFrySchedule(currentProductionDay);

  // Map maChien -> existing evaluation for the current production day (task 4.4)
  const existingByCode = useMemo(() => {
    const map = new Map<string, MaterialEvaluation>();
    for (const ev of evaluations) {
      map.set(ev.maChien, ev);
    }
    return map;
  }, [evaluations]);

  // Rows shown in the table: one per scheduled batch code for the production day,
  // whether or not a worker has entered data yet. A row with `evaluation: null` is a
  // placeholder — the batch is on the schedule but nothing has been recorded.
  // Legacy codes (MC-047 and similar, pre-cut-over) are not on the schedule, so any
  // evaluation whose code is absent from it is appended to avoid hiding real data.
  const scheduleRows = useMemo(() => {
    const rows = fullDaySchedule.map((batch) => ({
      code: batch.code,
      shift: batch.shift as number | null,
      startTime: batch.startTime as { hour: number; minute: number } | null,
      ngaySanXuat: batch.ngaySanXuat as string | null,
      isNextCalendarDay: batch.isNextCalendarDay,
      evaluation: existingByCode.get(batch.code) ?? null,
    }));

    const scheduledCodes = new Set(fullDaySchedule.map((b) => b.code));
    const offSchedule = evaluations
      .filter((ev) => !scheduledCodes.has(ev.maChien))
      .map((ev) => ({
        code: ev.maChien,
        shift: ev.ca ?? null,
        startTime: null as { hour: number; minute: number } | null,
        ngaySanXuat: null as string | null,
        isNextCalendarDay: false,
        evaluation: ev,
      }));

    return [...rows, ...offSchedule];
  }, [fullDaySchedule, existingByCode, evaluations]);

  const filteredProductionEmployees = useMemo(() => {
    const keyword = normalizeSearchText(formData.nguoiThucHien || '');

    if (!keyword) {
      return productionEmployees;
    }

    return productionEmployees.filter(employee => {
      const searchable = normalizeSearchText(`${employee.name} ${employee.employeeCode}`);
      return searchable.includes(keyword);
    });
  }, [formData.nguoiThucHien, productionEmployees]);

  const stockPreview = useMemo(() => {
    if (!selectedKien) return null;
    const current = selectedKien.soLuong;
    const exporting = parseFloat(String(formData.khoiLuong)) || 0;
    const remaining = current - exporting;
    const percentage = current > 0 ? (remaining / current) * 100 : 0;
    return { current, exporting, remaining, percentage };
  }, [selectedKien, formData.khoiLuong]);

  useEffect(() => {
    loadEvaluations();
    loadCriteria();
  }, [currentProductionDay]);


  const loadEvaluations = async () => {
    try {
      setLoading(true);
      setError('');
      // Filter by production day: 06:30 on that day to 06:30 next day
      const range = productionDayRange(currentProductionDay);
      const result = await materialEvaluationService.getAllMaterialEvaluations(1, 1000, {
        thoiGianChienFrom: range.from,
        thoiGianChienTo: range.to,
      });
      setEvaluations(result.data);
    } catch (err: any) {
      setError(err.message || 'Lỗi tải dữ liệu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCriteria = async () => {
    try {
      setCriteriaLoading(true);
      // Load criteria list and next code independently so one failure doesn't block the other
      const data = await materialEvaluationCriteriaService.getAllCriteria();
      setCriteria(data);

      try {
        const nextCode = await materialEvaluationCriteriaService.getNextCode();
        setNewCriteriaCode(nextCode);
      } catch {
        // Fallback: compute from loaded active criteria (includes soft-deleted gap risk,
        // but createCriteria will reactivate soft-deleted records gracefully)
        const maxCode = data.length > 0 ? Math.max(...data.map(c => c.code)) : 0;
        setNewCriteriaCode(maxCode + 1);
      }
    } catch (err: any) {
      console.error('Error loading criteria:', err);
    } finally {
      setCriteriaLoading(false);
    }
  };

  const handleSeedDefaultCriteria = async () => {
    try {
      setCriteriaLoading(true);
      await materialEvaluationCriteriaService.seedDefaultCriteria();
      await loadCriteria();
      alert('Đã tạo tiêu chí mặc định thành công!');
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Không thể tạo tiêu chí mặc định'));
    } finally {
      setCriteriaLoading(false);
    }
  };

  const handleAddCriteria = async () => {
    if (!newCriteriaDescription.trim()) {
      alert('Vui lòng nhập mô tả tiêu chí');
      return;
    }
    try {
      setCriteriaLoading(true);
      await materialEvaluationCriteriaService.createCriteria({
        code: newCriteriaCode,
        description: newCriteriaDescription.trim()
      });
      setNewCriteriaDescription('');
      await loadCriteria();
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Không thể thêm tiêu chí'));
    } finally {
      setCriteriaLoading(false);
    }
  };

  const handleUpdateCriteria = async (id: string, description: string) => {
    try {
      setCriteriaLoading(true);
      await materialEvaluationCriteriaService.updateCriteria(id, { description });
      setEditingCriteria(null);
      await loadCriteria();
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Không thể cập nhật tiêu chí'));
    } finally {
      setCriteriaLoading(false);
    }
  };

  const handleDeleteCriteria = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tiêu chí này?')) return;
    try {
      setCriteriaLoading(true);
      await materialEvaluationCriteriaService.deleteCriteria(id);
      await loadCriteria();
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Không thể xóa tiêu chí'));
    } finally {
      setCriteriaLoading(false);
    }
  };


  const formatDateTime = (datetime: string) => {
    if (!datetime) return '-';
    try {
      // Handle different datetime formats
      let date: Date;

      // Check if it's an ISO string (contains 'T' and possibly 'Z' or timezone)
      if (datetime.includes('T')) {
        date = new Date(datetime);
      } else if (datetime.includes('/')) {
        // Handle DD/MM/YYYY or DD/MM/YYYY HH:mm format
        const parts = datetime.split(' ');
        const dateParts = parts[0].split('/');
        if (dateParts.length === 3) {
          const [day, month, year] = dateParts;
          const timePart = parts[1] || '00:00';
          date = new Date(`${year}-${month}-${day}T${timePart}`);
        } else {
          return datetime;
        }
      } else {
        date = new Date(datetime);
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return datetime || '-';
      }

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes} ${day}/${month}/${year}`;
    } catch {
      return datetime || '-';
    }
  };



  const handleOpenModal = (evaluation?: MaterialEvaluation) => {
    if (evaluation) {
      setIsEditing(true);
      setSelectedEvaluation(evaluation);

      // Convert datetime to datetime-local format without timezone conversion
      let thoiGianChienLocal = '';
      if (evaluation.thoiGianChien) {
        const date = new Date(evaluation.thoiGianChien);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        thoiGianChienLocal = `${year}-${month}-${day}T${hours}:${minutes}`;
      }

      setFormData({
        ...evaluation,
        thoiGianChien: thoiGianChienLocal,
        ca: evaluation.ca ?? null,
      });
    } else {
      setIsEditing(false);
      setSelectedEvaluation(null);

      const nguoiThucHien = user
        ? `${user.lastName || ''} ${user.firstName || ''}`.trim()
        : '';

      // Batch code is now selected from schedule — no auto-generation
      setFormData({
        maChien: '',
        thoiGianChien: '',
        tenHangHoa: '',
        soLoKien: '',
        khoiLuong: 0,
        soLanNgam: 0,
        nhietDoNuocTruocNgam: 0,
        nhietDoNuocSauVot: 0,
        thoiGianNgam: 0,
        brixNuocNgam: 0,
        danhGiaTruocNgam: '',
        danhGiaSauNgam: '',
        nguoiThucHien,
        ca: null,
      });
    }
    setIsModalOpen(true);
  };

  /**
   * Open the create form for a scheduled batch that has no record yet, pre-filling
   * the code, shift and start time from the schedule so the worker only has to enter
   * the measurements. Mirrors handleOpenModal()'s create branch otherwise.
   */
  const handleOpenModalForScheduled = (row: {
    code: string;
    shift: number | null;
    startTime: { hour: number; minute: number } | null;
    ngaySanXuat: string | null;
    isNextCalendarDay: boolean;
  }) => {
    setIsEditing(false);
    setSelectedEvaluation(null);

    const nguoiThucHien = user
      ? `${user.lastName || ''} ${user.firstName || ''}`.trim()
      : '';

    // ngaySanXuat is the production day, which is NOT the calendar date for the
    // after-midnight batches (MC-13..MC-16 run 00:30–05:00 the next morning). Advance
    // the calendar date by one when isNextCalendarDay is set, otherwise MC-16 would
    // get 05:00 on the production day itself — before the 06:30 boundary, i.e. the
    // previous production day.
    let thoiGianChien = '';
    if (row.startTime && row.ngaySanXuat) {
      let dateStr = row.ngaySanXuat;
      if (row.isNextCalendarDay) {
        const d = new Date(`${row.ngaySanXuat}T12:00:00`);
        d.setDate(d.getDate() + 1);
        dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
      const hh = String(row.startTime.hour).padStart(2, '0');
      const mm = String(row.startTime.minute).padStart(2, '0');
      thoiGianChien = `${dateStr}T${hh}:${mm}`;
    }

    setFormData({
      maChien: row.code,
      thoiGianChien,
      tenHangHoa: '',
      soLoKien: '',
      khoiLuong: 0,
      soLanNgam: 0,
      nhietDoNuocTruocNgam: 0,
      nhietDoNuocSauVot: 0,
      thoiGianNgam: 0,
      brixNuocNgam: 0,
      danhGiaTruocNgam: '',
      danhGiaSauNgam: '',
      nguoiThucHien,
      ca: row.shift,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvaluation(null);
    setIsEditing(false);
    setIsNguoiThucHienOpen(false);
    setProductId('');
    setLotId('');
    setLotProductId('');
    setKhoiLuongError('');
  };

  const handleViewDetail = (evaluation: MaterialEvaluation) => {
    setSelectedEvaluation(evaluation);
    setIsViewModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['khoiLuong', 'soLanNgam', 'nhietDoNuocTruocNgam', 'nhietDoNuocSauVot', 'thoiGianNgam', 'brixNuocNgam'].includes(name)
        ? parseNumberInput(value)
        : value
    }));
  };

  const handleNguoiThucHienSelect = (value: string) => {
    if (!value) return;
    setFormData(prev => ({
      ...prev,
      nguoiThucHien: value,
    }));
    setIsNguoiThucHienOpen(false);
  };

  const handleDanhGiaToggle = (field: 'danhGiaTruocNgam' | 'danhGiaSauNgam', option: string) => {
    setFormData(prev => {
      const current = (prev[field] || '').split(',').map(s => s.trim()).filter(Boolean);
      const idx = current.indexOf(option);
      const updated = idx >= 0
        ? current.filter(s => s !== option)
        : [...current, option];
      return { ...prev, [field]: updated.join(', ') };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Block submit if quantity validation fails
    if (khoiLuongError) return;

    try {
      setLoading(true);
      setError('');

      // Convert datetime-local to ISO string for consistent timezone handling
      // Frontend datetime-local format: "2026-01-17T03:30"
      // We need to send it as ISO string so backend can parse it correctly
      const submitData = {
        ...formData,
        thoiGianChien: formData.thoiGianChien
          ? new Date(formData.thoiGianChien).toISOString()
          : '',
        // Include lotProductId when creating with warehouse link
        ...((!isEditing && lotProductId) ? { lotProductId } : {}),
      };

      if (isEditing && selectedEvaluation) {
        // Update existing evaluation
        await materialEvaluationService.updateMaterialEvaluation(selectedEvaluation.id, submitData);
      } else {
        // Create new evaluation
        await materialEvaluationService.createMaterialEvaluation(submitData);
        // Invalidate related caches so stock counts refresh elsewhere
        queryClient.invalidateQueries({ queryKey: materialEvaluationKeys.all });
        queryClient.invalidateQueries({ queryKey: lotProductKeys.lists() });
        queryClient.invalidateQueries({ queryKey: warehouseIssueKeys.lists() });
        if (productId) {
          queryClient.invalidateQueries({ queryKey: lotsByProductKeys.list(productId) });
        }
      }

      await loadEvaluations();
      handleCloseModal();
    } catch (err: any) {
      setError(err.message || 'Lỗi lưu dữ liệu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setError('');
      const info = await materialEvaluationService.getDeleteInfo(id);
      setDeleteInfo(info);
      setDeleteTargetId(id);
      setIsDeleteModalOpen(true);
    } catch (err: any) {
      setError(err.message || 'Lỗi lấy thông tin xóa');
      console.error(err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      setDeleteLoading(true);
      setError('');
      await materialEvaluationService.deleteMaterialEvaluation(deleteTargetId);
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
      setDeleteInfo(null);
      // Invalidate warehouse-related caches so refunded stock reflects immediately
      queryClient.invalidateQueries({ queryKey: materialEvaluationKeys.all });
      queryClient.invalidateQueries({ queryKey: lotProductKeys.lists() });
      queryClient.invalidateQueries({ queryKey: warehouseIssueKeys.lists() });
      await loadEvaluations();
      toast.success('Đã xóa mã chiên và hoàn tác dữ liệu liên quan');
    } catch (err: any) {
      setError(err.message || 'Lỗi xóa dữ liệu');
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCloseDeleteModal = () => {
    if (deleteLoading) return;
    setIsDeleteModalOpen(false);
    setDeleteTargetId(null);
    setDeleteInfo(null);
  };

  const handleCreateSystemOperation = async (evaluation: MaterialEvaluation) => {
    try {
      setLoading(true);
      setError('');

      // Tạo thông số vận hành cho tất cả máy đang hoạt động
      await systemOperationService.createBulkSystemOperations(
        evaluation.maChien,
        evaluation.thoiGianChien
      );

      // Chuyển sang tab thông số vận hành
      if (onCreateSystemOperation) {
        onCreateSystemOperation(evaluation.maChien, evaluation.thoiGianChien);
      }

      // Hiển thị thông báo thành công
      alert('Đã tạo thông số vận hành cho tất cả máy đang hoạt động thành công!');
    } catch (err: any) {
      setError(err.message || 'Lỗi tạo thông số vận hành');
      console.error(err);
      alert('Lỗi: ' + (err.message || 'Không thể tạo thông số vận hành'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Đánh giá nguyên liệu</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            disabled={loading}
          >
            <Plus className="w-4 h-4" />
            Thêm đánh giá
          </button>
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            disabled={loading}
          >
            <Settings className="w-4 h-4" />
            Cài đặt đánh giá
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <TableFilter
        filters={evaluationFilterFields}
        values={filterValues}
        onChange={setFilterValues}
        searchPlaceholder="Tìm kiếm mã chiên, tên hàng hóa..."
      />

      {/* Table — header row is pinned while scrolling down, STT + Mã chiên pinned while
          scrolling right, so the 16 columns stay readable without losing the batch code.
          The scroll container needs a bounded height for `sticky top-0` to have anything
          to stick to, hence max-h + overflow-auto instead of overflow-x-auto. */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {/* STT width is locked because the next pinned column offsets by it
                      (left-[44px]) — if the browser widened it the two would misalign.
                      border-collapse drops borders on sticky cells, so the divider on the
                      pinned edge and under the header row is drawn with box-shadow. */}
                  <th className="sticky top-0 left-0 z-30 w-[44px] min-w-[44px] max-w-[44px] bg-gray-100 px-2 py-2 text-center font-semibold text-gray-900 whitespace-nowrap shadow-[0_2px_0_0_#d1d5db]">STT</th>
                  <th className="sticky top-0 left-[44px] z-30 bg-gray-100 px-2 py-2 text-left font-semibold text-gray-900 whitespace-nowrap shadow-[2px_0_0_0_#d1d5db,0_2px_0_0_#d1d5db]">Mã chiên</th>
                  <th className="sticky top-0 z-20 bg-gray-100 shadow-[0_2px_0_0_#d1d5db] px-2 py-2 text-center font-semibold text-gray-900 border-r border-gray-200 whitespace-nowrap">Ca</th>
                  <th className="sticky top-0 z-20 bg-gray-100 shadow-[0_2px_0_0_#d1d5db] px-2 py-2 text-left font-semibold text-gray-900 border-r border-gray-200 whitespace-nowrap">Thời gian chiên</th>
                  <th className="sticky top-0 z-20 bg-gray-100 shadow-[0_2px_0_0_#d1d5db] px-2 py-2 text-left font-semibold text-gray-900 border-r border-gray-200 whitespace-nowrap">Mã hàng hóa</th>
                  <th className="sticky top-0 z-20 bg-gray-100 shadow-[0_2px_0_0_#d1d5db] px-2 py-2 text-left font-semibold text-gray-900 border-r border-gray-200 whitespace-nowrap">Số lô kiện</th>
                  <th className="sticky top-0 z-20 bg-gray-100 shadow-[0_2px_0_0_#d1d5db] px-2 py-2 text-center font-semibold text-gray-900 border-r border-gray-200 whitespace-nowrap">KL (Kg/tua)</th>
                  <th className="sticky top-0 z-20 bg-gray-100 shadow-[0_2px_0_0_#d1d5db] px-2 py-2 text-center font-semibold text-gray-900 border-r border-gray-200 whitespace-nowrap">Số lần ngâm</th>
                  <th className="sticky top-0 z-20 bg-gray-100 shadow-[0_2px_0_0_#d1d5db] px-2 py-2 text-center font-semibold text-gray-900 border-r border-gray-200 whitespace-nowrap">Nhiệt độ trước ngâm</th>
                  <th className="sticky top-0 z-20 bg-gray-100 shadow-[0_2px_0_0_#d1d5db] px-2 py-2 text-center font-semibold text-gray-900 border-r border-gray-200 whitespace-nowrap">Nhiệt độ sau vớt</th>
                  <th className="sticky top-0 z-20 bg-gray-100 shadow-[0_2px_0_0_#d1d5db] px-2 py-2 text-center font-semibold text-gray-900 border-r border-gray-200 whitespace-nowrap">TG ngâm (Phút)</th>
                  <th className="sticky top-0 z-20 bg-gray-100 shadow-[0_2px_0_0_#d1d5db] px-2 py-2 text-center font-semibold text-gray-900 border-r border-gray-200 whitespace-nowrap">Brix nước ngâm</th>
                  <th className="sticky top-0 z-20 bg-gray-100 shadow-[0_2px_0_0_#d1d5db] px-2 py-2 text-left font-semibold text-gray-900 border-r border-gray-200 whitespace-nowrap">ĐG trước ngâm</th>
                  <th className="sticky top-0 z-20 bg-gray-100 shadow-[0_2px_0_0_#d1d5db] px-2 py-2 text-left font-semibold text-gray-900 border-r border-gray-200 whitespace-nowrap">ĐG sau ngâm</th>
                  <th className="sticky top-0 z-20 bg-gray-100 shadow-[0_2px_0_0_#d1d5db] px-2 py-2 text-left font-semibold text-gray-900 border-r border-gray-200 whitespace-nowrap">Ghi chú</th>
                  <th className="sticky top-0 z-20 bg-gray-100 shadow-[0_2px_0_0_#d1d5db] px-2 py-2 text-center font-semibold text-gray-900 whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Filter over schedule rows, not raw evaluations: a placeholder row
                  // matches on its batch code so searching "MC-09" still finds the
                  // scheduled slot even when nothing has been entered for it.
                  const filteredRows = scheduleRows.filter(row => {
                    const ev = row.evaluation;
                    const search = (filterValues._search || '').toLowerCase();
                    const matchSearch = !search ||
                      row.code.toLowerCase().includes(search) ||
                      (ev?.tenHangHoa || '').toLowerCase().includes(search);
                    const matchMaChien = !filterValues.maChien || row.code.toLowerCase().includes(filterValues.maChien.toLowerCase());
                    const matchTenHangHoa = !filterValues.tenHangHoa || (ev?.tenHangHoa || '').toLowerCase().includes(filterValues.tenHangHoa.toLowerCase());
                    return matchSearch && matchMaChien && matchTenHangHoa;
                  });
                  if (loading) return (
                  <tr>
                    <td colSpan={16} className="px-3 py-4 sm:px-6 sm:py-8 text-center text-gray-500">Đang tải...</td>
                  </tr>
                );
                  if (filteredRows.length === 0) return (
                  <tr>
                    <td colSpan={16} className="px-3 py-4 sm:px-6 sm:py-8 text-center text-gray-500">Chưa có dữ liệu</td>
                  </tr>
                );
                  return filteredRows.map((row, index) => {
                    const evaluation = row.evaluation;

                    // Placeholder row: batch is on the day's schedule but no record yet.
                    if (!evaluation) {
                      const hh = String(row.startTime?.hour ?? 0).padStart(2, '0');
                      const mm = String(row.startTime?.minute ?? 0).padStart(2, '0');
                      return (
                        <tr
                          key={`empty-${row.code}`}
                          onClick={() => handleOpenModalForScheduled(row)}
                          className={`group border-b border-gray-200 hover:bg-blue-50 cursor-pointer transition-all ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}
                          title={`Chưa nhập — bấm để nhập dữ liệu cho ${row.code}`}
                        >
                          {/* Pinned columns carry their own background: a transparent
                              sticky cell would let the scrolling columns show through. */}
                          <td className={`sticky left-0 z-10 px-2 py-1.5 text-gray-400 border-r border-gray-200 text-center group-hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>{index + 1}</td>
                          <td className={`sticky left-[44px] z-10 px-2 py-1.5 font-semibold text-blue-400 border-r border-gray-200 whitespace-nowrap group-hover:bg-blue-50 shadow-[2px_0_0_0_#e5e7eb] ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>{row.code}</td>
                          {/* Shift comes from the schedule, so it is known even before
                              anyone enters data — show it instead of a dash. */}
                          <td className="px-2 py-1.5 text-gray-400 border-r border-gray-200 text-center whitespace-nowrap">{row.shift != null ? `Ca ${row.shift}` : '—'}</td>
                          <td className="px-2 py-1.5 text-gray-400 border-r border-gray-200 whitespace-nowrap">{hh}:{mm}</td>
                          {Array.from({ length: 11 }).map((_, i) => (
                            <td key={i} className="px-2 py-1.5 text-gray-300 border-r border-gray-200 text-center">—</td>
                          ))}
                          <td className="px-2 py-1.5">
                            <div className="flex items-center justify-center">
                              <span className="px-2 py-0.5 text-[11px] font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-full whitespace-nowrap">
                                Chưa nhập
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                  <tr
                    key={evaluation.id}
                    onClick={() => handleViewDetail(evaluation)}
                    className={`group border-b border-gray-200 hover:bg-blue-50 cursor-pointer transition-all ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className={`sticky left-0 z-10 px-2 py-1.5 text-gray-900 border-r border-gray-200 text-center group-hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>{index + 1}</td>
                    <td className={`sticky left-[44px] z-10 px-2 py-1.5 font-semibold text-blue-600 border-r border-gray-200 whitespace-nowrap group-hover:bg-blue-50 shadow-[2px_0_0_0_#e5e7eb] ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>{evaluation.maChien}</td>
                    {/* Fall back to the schedule's shift when the record has no ca —
                        legacy rows predate the field but their code still maps to a shift. */}
                    <td className="px-2 py-1.5 text-gray-700 border-r border-gray-200 text-center whitespace-nowrap">
                      {evaluation.ca != null ? `Ca ${evaluation.ca}` : (row.shift != null ? `Ca ${row.shift}` : '-')}
                    </td>
                    <td className="px-2 py-1.5 text-gray-700 border-r border-gray-200 whitespace-nowrap">{formatDateTime(evaluation.thoiGianChien)}</td>
                    <td className="px-2 py-1.5 text-gray-900 border-r border-gray-200">{evaluation.tenHangHoa}</td>
                    <td className="px-2 py-1.5 text-gray-900 border-r border-gray-200">{evaluation.soLoKien || '-'}</td>
                    <td className="px-2 py-1.5 text-gray-900 border-r border-gray-200 text-center">{evaluation.khoiLuong}</td>
                    <td className="px-2 py-1.5 text-gray-900 border-r border-gray-200 text-center">{evaluation.soLanNgam}</td>
                    <td className="px-2 py-1.5 text-gray-900 border-r border-gray-200 text-center">{evaluation.nhietDoNuocTruocNgam}</td>
                    <td className="px-2 py-1.5 text-gray-900 border-r border-gray-200 text-center">{evaluation.nhietDoNuocSauVot}</td>
                    <td className="px-2 py-1.5 text-gray-900 border-r border-gray-200 text-center">{evaluation.thoiGianNgam}</td>
                    <td className="px-2 py-1.5 text-gray-900 border-r border-gray-200 text-center">{evaluation.brixNuocNgam}</td>
                    <td className="px-2 py-1.5 text-gray-700 border-r border-gray-200 max-w-[120px] truncate" title={evaluation.danhGiaTruocNgam}>{evaluation.danhGiaTruocNgam || '-'}</td>
                    <td className="px-2 py-1.5 text-gray-700 border-r border-gray-200 max-w-[120px] truncate" title={evaluation.danhGiaSauNgam}>{evaluation.danhGiaSauNgam || '-'}</td>
                    <td className="px-2 py-1.5 text-gray-700 border-r border-gray-200 max-w-[100px] truncate" title={evaluation.ghiChu || ''}>{evaluation.ghiChu || '-'}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(evaluation); }}
                          className="p-1 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(evaluation.id); }}
                          className="p-1 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {onCreateSystemOperation && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCreateSystemOperation(evaluation); }}
                            className="p-1 text-purple-600 hover:bg-purple-100 rounded-md transition-colors"
                            title="Tạo thông số vận hành"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
      </div>
      {/* Progress summary — replaces pagination: the schedule is a fixed 16 rows per
          production day, so all of them are shown at once and what matters is how many
          have been filled in. */}
      {!loading && scheduleRows.length > 0 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <span className="text-sm text-gray-600">
            Đã nhập <span className="font-semibold text-gray-900">{scheduleRows.filter(r => r.evaluation).length}</span>
            {' / '}{scheduleRows.length} mã chiên
          </span>
          {scheduleRows.some(r => !r.evaluation) && (
            <span className="text-sm text-gray-500">
              Còn {scheduleRows.filter(r => !r.evaluation).length} mã chưa nhập
            </span>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} showBackdrop>
        <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 flex flex-col modal-viewport-h" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center px-3 py-2 sm:px-6 sm:py-4 border-b shrink-0">
              <h2 className="text-xl font-bold">
                {isEditing ? 'Chỉnh sửa đánh giá' : 'Thêm đánh giá mới'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6">

              {/* Section 1: Thông tin chung */}
              <div className="border-t border-gray-200 pt-4 mt-4 first:border-t-0 first:pt-0 first:mt-0">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Thông tin chung</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã chiên <span className="text-red-500">*</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="maChien"
                      value={formData.maChien}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <select
                      name="maChien"
                      value={formData.maChien}
                      onChange={(e) => {
                        const code = e.target.value;
                        const existing = existingByCode.get(code);
                        if (existing) {
                          // Task 4.4: Load existing record for editing instead of creating duplicate
                          setIsEditing(true);
                          setSelectedEvaluation(existing);
                          let thoiGianChienLocal = '';
                          if (existing.thoiGianChien) {
                            const date = new Date(existing.thoiGianChien);
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const hours = String(date.getHours()).padStart(2, '0');
                            const minutes = String(date.getMinutes()).padStart(2, '0');
                            thoiGianChienLocal = `${year}-${month}-${day}T${hours}:${minutes}`;
                          }
                          setFormData({
                            ...existing,
                            thoiGianChien: thoiGianChienLocal,
                            ca: existing.ca ?? null,
                          });
                          toast.success('Đã tải bản ghi hiện có để chỉnh sửa');
                        } else {
                          setFormData(prev => ({ ...prev, maChien: code }));
                        }
                      }}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">{!formData.ca ? '-- Chọn ca trước --' : '-- Chọn mã chiên --'}</option>
                      {scheduledBatches.map((batch) => (
                        <option key={batch.code} value={batch.code}>
                          {batch.code} ({String(batch.startTime.hour).padStart(2, '0')}:{String(batch.startTime.minute).padStart(2, '0')})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ca <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.ca ?? ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, ca: e.target.value ? parseInt(e.target.value) : null, maChien: '' }))}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Chọn ca</option>
                        <option value="1">Ca 1</option>
                        <option value="2">Ca 2</option>
                        <option value="3">Ca 3</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <DateTimePicker
                        label="Thời gian chiên"
                        value={formData.thoiGianChien || ''}
                        onChange={(datetime) => setFormData(prev => ({ ...prev, thoiGianChien: datetime }))}
                        required
                        placeholder="Chọn ngày và giờ chiên"
                        allowClear
                      />
                    </div>
                  </div>
                  {formData.ca != null && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500 mb-1 block">Chọn nhanh giờ chiên:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {getQuickTimesForShift(formData.ca).map((time) => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, thoiGianChien: computeShiftDatetime(formData.ca!, time) }))}
                            className="px-2.5 py-1 text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors"
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Người thực hiện in Section 1 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Người thực hiện <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="nguoiThucHien"
                      value={formData.nguoiThucHien}
                      onChange={(e) => {
                        handleInputChange(e);
                        setIsNguoiThucHienOpen(true);
                      }}
                      onFocus={() => setIsNguoiThucHienOpen(true)}
                      onBlur={() => window.setTimeout(() => setIsNguoiThucHienOpen(false), 120)}
                      required
                      autoComplete="off"
                      placeholder="Nhập hoặc chọn nhân viên sản xuất"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    {isNguoiThucHienOpen && (
                      <div className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                        {loadingProductionEmployees ? (
                          <div className="px-3 py-2 text-sm text-gray-500">Đang tải danh sách...</div>
                        ) : productionEmployees.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500">Không có nhân viên sản xuất</div>
                        ) : filteredProductionEmployees.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500">Không tìm thấy nhân viên phù hợp</div>
                        ) : (
                          filteredProductionEmployees.map(employee => (
                            <button
                              key={employee.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleNguoiThucHienSelect(employee.name);
                              }}
                              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50"
                            >
                              <span className="font-medium text-gray-900">{employee.name}</span>
                              <span className="ml-3 text-xs text-gray-500">{employee.employeeCode}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
                </div>
              </div>

              {/* Section 2: Nguyên liệu xuất từ kho */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Nguyên liệu xuất từ kho</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* ── Warehouse cascade (create only) or snapshot read-only (edit) ── */}
                {isEditing ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tên hàng hóa
                      </label>
                      <input
                        type="text"
                        value={formData.tenHangHoa ?? ''}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Số lô, Kiện
                      </label>
                      <input
                        type="text"
                        value={formData.soLoKien ?? ''}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                      />
                    </div>

                    {/* Khối lượng is hidden on edit — immutable after creation */}
                  </>
                ) : (
                  <>
                    {/* Select: Sản phẩm nguyên liệu */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sản phẩm nguyên liệu <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={productId}
                        onChange={(e) => {
                          setProductId(e.target.value);
                          setLotId('');
                          setLotProductId('');
                          setKhoiLuongError('');
                          setFormData(prev => ({ ...prev, tenHangHoa: '', soLoKien: '', khoiLuong: 0 }));
                        }}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">
                          {loadingRawMaterials ? 'Đang tải...' : '-- Chọn sản phẩm --'}
                        </option>
                        {rawMaterials.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.maSanPham} – {p.tenSanPham}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Select: Lô */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lô <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={lotId}
                        onChange={(e) => {
                          setLotId(e.target.value);
                          setLotProductId('');
                          setKhoiLuongError('');
                          setFormData(prev => ({ ...prev, soLoKien: '', khoiLuong: 0 }));
                        }}
                        required
                        disabled={!productId}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {!productId
                            ? '-- Chọn sản phẩm trước --'
                            : loadingLots
                            ? 'Đang tải...'
                            : lots.length === 0
                            ? 'Không có lô tồn kho'
                            : '-- Chọn lô --'}
                        </option>
                        {lots.map(l => (
                          <option key={l.id} value={l.id}>
                            {l.tenLo}{l.warehouse ? ` (${l.warehouse.tenKho})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Select: Kiện */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kiện <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={lotProductId}
                        onChange={(e) => {
                          const newKienId = e.target.value;
                          setLotProductId(newKienId);
                          setKhoiLuongError('');
                          const chosen = kienList.find(k => k.id === newKienId) ?? null;
                          if (chosen) {
                            const lot = lots.find(l => l.id === lotId);
                            const soLoKienLabel = `${lot?.tenLo ?? ''}-${newKienId.slice(-4)}`;
                            setFormData(prev => ({
                              ...prev,
                              tenHangHoa: chosen.internationalProduct?.tenSanPham ?? prev.tenHangHoa,
                              soLoKien: soLoKienLabel,
                              khoiLuong: 0,
                            }));
                          }
                        }}
                        required
                        disabled={!lotId}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {!lotId
                            ? '-- Chọn lô trước --'
                            : loadingKien
                            ? 'Đang tải...'
                            : kienList.length === 0
                            ? 'Không có kiện tồn kho'
                            : '-- Chọn kiện --'}
                        </option>
                        {kienList.map((k, idx) => (
                          <option key={k.id} value={k.id}>
                            Kiện {idx + 1} · Tồn {k.soLuong} {k.donViTinh}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Khối lượng xuất – bounded by selectedKien.soLuong – col-span-2 for preview */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Khối lượng xuất (kg) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        max={selectedKien?.soLuong ?? undefined}
                        name="khoiLuong"
                        value={formData.khoiLuong === 0 ? '' : formData.khoiLuong}
                        placeholder="0"
                        onChange={(e) => {
                          const val = parseNumberInput(e.target.value);
                          setFormData(prev => ({ ...prev, khoiLuong: val }));
                          if (selectedKien && val > selectedKien.soLuong) {
                            setKhoiLuongError(`Vượt quá tồn kho (${selectedKien.soLuong} kg)`);
                          } else {
                            setKhoiLuongError('');
                          }
                        }}
                        required
                        disabled={!lotProductId}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                          khoiLuongError ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {khoiLuongError && (
                        <p className="mt-1 text-xs text-red-600">{khoiLuongError}</p>
                      )}

                      {/* Real-time stock preview */}
                      {stockPreview && (
                        <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mt-2 space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tồn kiện hiện tại:</span>
                            <span className="font-medium">{stockPreview.current} {selectedKien!.donViTinh}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Khối lượng xuất:</span>
                            <span className="font-medium text-orange-600">-{stockPreview.exporting} {selectedKien!.donViTinh}</span>
                          </div>
                          <div className="border-t border-gray-200 pt-1.5">
                            <div className="flex justify-between mb-1">
                              <span className="text-gray-600">Còn lại sau xuất:</span>
                              <span className={`font-medium ${
                                stockPreview.percentage > 20
                                  ? 'text-green-600'
                                  : stockPreview.percentage > 5
                                  ? 'text-amber-600'
                                  : 'text-red-600'
                              }`}>
                                {stockPreview.remaining.toFixed(2)} {selectedKien!.donViTinh} ({Math.max(0, stockPreview.percentage).toFixed(0)}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-200 ${
                                  stockPreview.percentage > 20
                                    ? 'bg-green-500'
                                    : stockPreview.percentage > 5
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, stockPreview.percentage))}%` }}
                              />
                            </div>
                            {stockPreview.percentage <= 0 && (
                              <p className="mt-1 text-xs text-red-600 font-medium">Vượt quá tồn kho</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                </div>
              </div>

              {/* Section 3: Thông số chiên */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Thông số chiên</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số lần ngâm
                  </label>
                  <input
                    type="number"
                    min={0}
                    name="soLanNgam"
                    value={formData.soLanNgam === 0 ? '' : formData.soLanNgam}
                    placeholder="0"
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nhiệt độ nước trước ngâm (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    name="nhietDoNuocTruocNgam"
                    value={formData.nhietDoNuocTruocNgam === 0 ? '' : formData.nhietDoNuocTruocNgam}
                    placeholder="0"
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nhiệt độ nước sau vớt (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    name="nhietDoNuocSauVot"
                    value={formData.nhietDoNuocSauVot === 0 ? '' : formData.nhietDoNuocSauVot}
                    placeholder="0"
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thời gian ngâm (Phút)
                  </label>
                  <input
                    type="number"
                    min={0}
                    name="thoiGianNgam"
                    value={formData.thoiGianNgam === 0 ? '' : formData.thoiGianNgam}
                    placeholder="0"
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brix nước ngâm
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    name="brixNuocNgam"
                    value={formData.brixNuocNgam === 0 ? '' : formData.brixNuocNgam}
                    placeholder="0"
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                </div>
              </div>

              {/* Section 4: Đánh giá nguyên liệu */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Đánh giá nguyên liệu</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đánh giá trước ngâm
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 p-3 border border-gray-300 rounded-md bg-white">
                    {criteria.map(c => {
                      const selected = (formData.danhGiaTruocNgam || '').split(',').map(s => s.trim()).includes(String(c.code));
                      return (
                        <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => handleDanhGiaToggle('danhGiaTruocNgam', String(c.code))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{c.code}. {c.description}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đánh giá sau ngâm
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 p-3 border border-gray-300 rounded-md bg-white">
                    {criteria.map(c => {
                      const selected = (formData.danhGiaSauNgam || '').split(',').map(s => s.trim()).includes(String(c.code));
                      return (
                        <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => handleDanhGiaToggle('danhGiaSauNgam', String(c.code))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{c.code}. {c.description}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                </div>
              </div>

              {/* Section 5: File đính kèm */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">File đính kèm</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File đính kèm
                  </label>
                  <input
                    type="file"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Sticky footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 -mx-6 -mb-6 flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!!khoiLuongError}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEditing ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </Modal>

      {/* View Detail Modal */}
      <Modal isOpen={isViewModalOpen && !!selectedEvaluation} onClose={() => setIsViewModalOpen(false)} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 flex flex-col modal-viewport-h" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center px-3 py-2 sm:px-6 sm:py-4 border-b shrink-0">
              <h2 className="text-xl font-bold">Chi tiết đánh giá nguyên liệu</h2>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              {selectedEvaluation && (<>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã chiên</label>
                  <p className="text-sm text-gray-900">{selectedEvaluation.maChien}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian chiên</label>
                  <p className="text-sm text-gray-900">{formatDateTime(selectedEvaluation.thoiGianChien)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ca</label>
                  <p className="text-sm text-gray-900">{selectedEvaluation.ca != null ? `Ca ${selectedEvaluation.ca}` : '-'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên hàng hóa</label>
                  <p className="text-sm text-gray-900">{selectedEvaluation.tenHangHoa}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số lô, Kiện</label>
                  <p className="text-sm text-gray-900">{selectedEvaluation.soLoKien}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khối lượng (Kg)</label>
                  <p className="text-sm text-gray-900">{selectedEvaluation.khoiLuong}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số lần ngâm</label>
                  <p className="text-sm text-gray-900">{selectedEvaluation.soLanNgam}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhiệt độ nước trước ngâm</label>
                  <p className="text-sm text-gray-900">{selectedEvaluation.nhietDoNuocTruocNgam}°C</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhiệt độ nước sau vớt</label>
                  <p className="text-sm text-gray-900">{selectedEvaluation.nhietDoNuocSauVot}°C</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian ngâm (Phút)</label>
                  <p className="text-sm text-gray-900">{selectedEvaluation.thoiGianNgam}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brix nước ngâm</label>
                  <p className="text-sm text-gray-900">{selectedEvaluation.brixNuocNgam}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đánh giá trước ngâm</label>
                  {selectedEvaluation.danhGiaTruocNgam ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedEvaluation.danhGiaTruocNgam.split(',').map(s => s.trim()).filter(Boolean).map(tag => {
                        const code = parseInt(tag);
                        const criterion = !isNaN(code) ? criteria.find(c => c.code === code) : null;
                        const display = criterion ? `${code}. ${criterion.description}` : tag;
                        return (
                          <span key={tag} className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">{display}</span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900">-</p>
                  )}
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đánh giá sau ngâm</label>
                  {selectedEvaluation.danhGiaSauNgam ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedEvaluation.danhGiaSauNgam.split(',').map(s => s.trim()).filter(Boolean).map(tag => {
                        const code = parseInt(tag);
                        const criterion = !isNaN(code) ? criteria.find(c => c.code === code) : null;
                        const display = criterion ? `${code}. ${criterion.description}` : tag;
                        return (
                          <span key={tag} className="inline-block px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">{display}</span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900">-</p>
                  )}
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Người thực hiện</label>
                  <p className="text-sm text-gray-900">{selectedEvaluation.nguoiThucHien}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 shrink-0">
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setIsEditing(true);
                    setIsModalOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Chỉnh sửa
                </button>
              </div>
              </>)}
            </div>
          </div>
        </Modal>

      {/* Settings Modal */}
      <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} showBackdrop>
        <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full mx-4 flex flex-col modal-viewport-h" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center px-3 py-2 sm:px-6 sm:py-4 border-b shrink-0">
              <h2 className="text-xl font-bold">Cài đặt tiêu chí đánh giá nguyên liệu</h2>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              {/* Seed default button */}
              {criteria.length === 0 && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 mb-3">
                    Chưa có tiêu chí đánh giá nào. Bạn có thể tạo tiêu chí mặc định hoặc thêm tiêu chí mới.
                  </p>
                  <button
                    onClick={handleSeedDefaultCriteria}
                    disabled={criteriaLoading}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
                  >
                    Tạo tiêu chí mặc định
                  </button>
                </div>
              )}

              {/* Add new criteria form */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Thêm tiêu chí mới</h3>
                <div className="flex gap-3">
                  <div className="w-24">
                    <label className="block text-xs text-gray-600 mb-1">Mã số</label>
                    <input
                      type="number"
                      value={newCriteriaCode}
                      onChange={(e) => setNewCriteriaCode(parseNumberInput(e.target.value, false))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">Mô tả</label>
                    <input
                      type="text"
                      value={newCriteriaDescription}
                      onChange={(e) => setNewCriteriaDescription(e.target.value)}
                      placeholder="Nhập mô tả tiêu chí..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleAddCriteria}
                      disabled={criteriaLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Criteria list */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Danh sách tiêu chí ({criteria.length})</h3>
                {criteriaLoading ? (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : criteria.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Chưa có tiêu chí nào</p>
                ) : (
                  <div className="space-y-2">
                    {criteria.map((criterion) => (
                      <div
                        key={criterion.id}
                        className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <span className="w-12 text-center font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {criterion.code}
                        </span>
                        {editingCriteria?.id === criterion.id ? (
                          <input
                            type="text"
                            value={editingCriteria.description}
                            onChange={(e) => setEditingCriteria({ ...editingCriteria, description: e.target.value })}
                            className="flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm"
                            autoFocus
                          />
                        ) : (
                          <span className="flex-1 text-sm text-gray-700">{criterion.description}</span>
                        )}
                        <div className="flex gap-2">
                          {editingCriteria?.id === criterion.id ? (
                            <>
                              <button
                                onClick={() => handleUpdateCriteria(criterion.id, editingCriteria.description)}
                                className="p-1.5 text-green-600 hover:bg-green-100 rounded-md"
                                title="Lưu"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingCriteria(null)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md"
                                title="Hủy"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingCriteria(criterion)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md"
                                title="Sửa"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCriteria(criterion.id)}
                                className="p-1.5 text-red-600 hover:bg-red-100 rounded-md"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6 shrink-0">
                <button
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </Modal>

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa đánh giá vật liệu"
        message="Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa đánh giá này?"
        details={
          deleteInfo
            ? [
                ...(deleteInfo.systemOperationCount > 0
                  ? [`${deleteInfo.systemOperationCount} thông số vận hành hệ thống`]
                  : []),
                ...(deleteInfo.finishedProductCount > 0
                  ? [`${deleteInfo.finishedProductCount} thành phẩm đầu ra`]
                  : []),
                ...(deleteInfo.qualityEvaluationCount > 0
                  ? [`${deleteInfo.qualityEvaluationCount} đánh giá chất lượng`]
                  : []),
              ]
            : []
        }
        loading={deleteLoading}
      />
    </div>
  );
};

export default MaterialEvaluationManagement;
