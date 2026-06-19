import React, { useState, useEffect, useMemo } from 'react';
import DatePicker from './DatePicker';
import { CreateOvertimePlanData, OvertimePlan, OvertimePlanItemInput } from '../services/overtimePlanService';
import { TaskPriority } from '../services/taskService';
import { FileText, AlertCircle, Plus, Trash2 } from 'lucide-react';
import FileUpload from './FileUpload';
import { ModalForm, ModalFooter } from './ModalForm';
import { useAllEmployeesForAssignment } from '../hooks/useEmployeesForAssignment';
import { useWorkShifts } from '../hooks/useWorkShifts';
import { useCreateOvertimePlan, useUpdateOvertimePlan } from '../hooks/useOvertimePlans';

interface CreateOvertimePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: OvertimePlan | null;
}

interface Employee {
  _id: string;
  userId: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  department: string;
}

interface ItemRow {
  ngayTangCa: string;
  gioBatDau: string;
  gioKetThuc: string;
  workShiftId: string;
  nguoiThamGia: string[]; // employee IDs
  ghiChuItem: string;
}

const today = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

const parseHHmm = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const calcHours = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const diff = parseHHmm(end) - parseHHmm(start);
  return diff > 0 ? Math.round(diff / 60 * 100) / 100 : 0;
};

const emptyRow = (): ItemRow => ({
  ngayTangCa: today(),
  gioBatDau: '17:00',
  gioKetThuc: '19:00',
  workShiftId: '',
  nguoiThamGia: [],
  ghiChuItem: '',
});

const CreateOvertimePlanModal: React.FC<CreateOvertimePlanModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const isEditMode = !!initialData;

  const [noiDung, setNoiDung] = useState('');
  const [mucDoUuTien, setMucDoUuTien] = useState<string>(TaskPriority.TRUNG_BINH);
  const [ghiChu, setGhiChu] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()]);
  const [error, setError] = useState('');
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});

  // Employee picker state per row
  const [activeRowForPicker, setActiveRowForPicker] = useState<number | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string>('');

  const { data: employeeData, isLoading: loadingEmployees } = useAllEmployeesForAssignment();
  const employees = (employeeData?.employees ?? []) as Employee[];
  const departments = employeeData?.departments ?? [];

  const { data: workShifts = [] } = useWorkShifts(isOpen);

  const createMutation = useCreateOvertimePlan();
  const updateMutation = useUpdateOvertimePlan();
  const loading = createMutation.isPending || updateMutation.isPending;

  // Populate form in edit mode
  useEffect(() => {
    if (isOpen && initialData) {
      setNoiDung(initialData.noiDung || '');
      setMucDoUuTien(initialData.mucDoUuTien || TaskPriority.TRUNG_BINH);
      setGhiChu(initialData.ghiChu || '');
      setFiles([]);
      if (initialData.items && initialData.items.length > 0 && employees.length > 0) {
        const loadedRows: ItemRow[] = initialData.items.map(item => ({
          ngayTangCa: item.ngayTangCa ? item.ngayTangCa.split('T')[0] : today(),
          gioBatDau: item.gioBatDau || '17:00',
          gioKetThuc: item.gioKetThuc || '19:00',
          workShiftId: item.workShiftId || '',
          nguoiThamGia: item.nguoiThamGia
            ? employees.filter(emp => item.nguoiThamGia.some(p => p.id === emp.userId)).map(emp => emp._id)
            : [],
          ghiChuItem: item.ghiChuItem || '',
        }));
        setRows(loadedRows);
      } else if (initialData.items && initialData.items.length > 0) {
        // employees not yet loaded — set with userIds, will be reconciled below
        setRows(initialData.items.map(item => ({
          ngayTangCa: item.ngayTangCa ? item.ngayTangCa.split('T')[0] : today(),
          gioBatDau: item.gioBatDau || '17:00',
          gioKetThuc: item.gioKetThuc || '19:00',
          workShiftId: item.workShiftId || '',
          nguoiThamGia: [],
          ghiChuItem: item.ghiChuItem || '',
        })));
      }
    } else if (isOpen && !initialData) {
      resetForm();
    }
    setError('');
    setRowErrors({});
    setActiveRowForPicker(null);
  }, [isOpen, initialData?.id]);

  // Re-reconcile employee IDs once employees load in edit mode
  useEffect(() => {
    if (isOpen && isEditMode && initialData && employees.length > 0) {
      setRows(prev => prev.map((row, idx) => {
        const item = initialData.items?.[idx];
        if (!item) return row;
        if (row.nguoiThamGia.length > 0) return row; // already reconciled
        return {
          ...row,
          nguoiThamGia: item.nguoiThamGia
            ? employees.filter(emp => item.nguoiThamGia.some(p => p.id === emp.userId)).map(emp => emp._id)
            : [],
        };
      }));
    }
  }, [employees, isOpen, isEditMode]);

  const resetForm = () => {
    setNoiDung('');
    setMucDoUuTien(TaskPriority.TRUNG_BINH);
    setGhiChu('');
    setFiles([]);
    setRows([emptyRow()]);
    setError('');
    setRowErrors({});
    setActiveRowForPicker(null);
    setDepartmentFilter('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // ─── Row manipulation ────────────────────────────────────────────────────

  const addRow = () => setRows(prev => [...prev, emptyRow()]);

  const removeRow = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
    setRowErrors(prev => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const ki = parseInt(k);
        if (ki < idx) next[ki] = v;
        else if (ki > idx) next[ki - 1] = v;
      });
      return next;
    });
  };

  const updateRow = (idx: number, patch: Partial<ItemRow>) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
    // Clear row error when user edits
    if (rowErrors[idx]) setRowErrors(prev => { const n = { ...prev }; delete n[idx]; return n; });
  };

  const handleShiftChange = (idx: number, shiftId: string) => {
    const shift = workShifts.find(s => s.id === shiftId);
    updateRow(idx, {
      workShiftId: shiftId,
      ...(shift ? { gioBatDau: shift.startTime, gioKetThuc: shift.endTime } : {}),
    });
  };

  const toggleEmployee = (idx: number, empId: string) => {
    const row = rows[idx];
    const next = row.nguoiThamGia.includes(empId)
      ? row.nguoiThamGia.filter(id => id !== empId)
      : [...row.nguoiThamGia, empId];
    updateRow(idx, { nguoiThamGia: next });
  };

  // ─── Footer totals ────────────────────────────────────────────────────────

  const { totalSlotHours, totalManHours } = useMemo(() => {
    let slotH = 0;
    let manH = 0;
    rows.forEach(r => {
      const h = calcHours(r.gioBatDau, r.gioKetThuc);
      slotH += h;
      manH += h * r.nguoiThamGia.length;
    });
    return { totalSlotHours: Math.round(slotH * 100) / 100, totalManHours: Math.round(manH * 100) / 100 };
  }, [rows]);

  // ─── Validation ───────────────────────────────────────────────────────────

  const validate = (): boolean => {
    if (!noiDung.trim()) { setError('Vui lòng nhập nội dung công việc tăng ca'); return false; }
    if (rows.length === 0) { setError('Kế hoạch phải có ít nhất một dòng'); return false; }
    const errs: Record<number, string> = {};
    rows.forEach((row, idx) => {
      if (!row.ngayTangCa) { errs[idx] = 'Chưa chọn ngày'; return; }
      if (!row.gioBatDau || !row.gioKetThuc) { errs[idx] = 'Chưa đủ giờ bắt đầu/kết thúc'; return; }
      if (row.gioBatDau >= row.gioKetThuc) { errs[idx] = 'Giờ kết thúc phải sau giờ bắt đầu'; return; }
      if (row.nguoiThamGia.length === 0) { errs[idx] = 'Phải chọn ít nhất một người tham gia'; return; }
    });
    if (Object.keys(errs).length > 0) {
      setRowErrors(errs);
      setError('Vui lòng kiểm tra lại các dòng bị lỗi');
      return false;
    }
    return true;
  };

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    const items: OvertimePlanItemInput[] = rows.map(row => {
      // map employee IDs to employee IDs (nguoiThamGia on backend expects employee IDs)
      return {
        ngayTangCa: row.ngayTangCa,
        gioBatDau: row.gioBatDau,
        gioKetThuc: row.gioKetThuc,
        workShiftId: row.workShiftId || undefined,
        nguoiThamGia: row.nguoiThamGia,
        ghiChuItem: row.ghiChuItem || undefined,
      };
    });

    const payload: CreateOvertimePlanData = {
      items,
      noiDung,
      ghiChu: ghiChu || undefined,
      mucDoUuTien,
      files,
    };

    try {
      if (isEditMode && initialData) {
        await updateMutation.mutateAsync({ id: initialData.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onSuccess?.();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || (isEditMode ? 'Có lỗi xảy ra khi cập nhật kế hoạch' : 'Có lỗi xảy ra khi tạo kế hoạch tăng ca'));
    }
  };

  // ─── Employee name helper ─────────────────────────────────────────────────

  const getEmployeeNames = (empIds: string[]) =>
    employees.filter(e => empIds.includes(e._id)).map(e => `${e.lastName} ${e.firstName}`).join(', ');

  const filteredEmployees = useMemo(() => {
    if (departmentFilter) return employees.filter(e => e.department === departmentFilter);
    return employees;
  }, [employees, departmentFilter]);

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? 'Chỉnh sửa kế hoạch tăng ca' : 'Tạo kế hoạch tăng ca'}
      maxWidth="5xl"
      footer={
        <ModalFooter
          onClose={handleClose}
          onSubmit={() => (document.getElementById('create-overtime-plan-form') as HTMLFormElement)?.requestSubmit()}
          submitLabel={isEditMode ? 'Cập nhật kế hoạch' : 'Tạo kế hoạch tăng ca'}
          isLoading={loading}
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" id="create-overtime-plan-form">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Header fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center">
              <FileText className="w-4 h-4 mr-1.5" />
              Nội dung công việc tăng ca <span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
              value={noiDung}
              onChange={e => setNoiDung(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              placeholder="Mô tả chi tiết nội dung công việc tăng ca..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mức độ ưu tiên</label>
            <select
              value={mucDoUuTien}
              onChange={e => setMucDoUuTien(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value={TaskPriority.THAP}>Thấp</option>
              <option value={TaskPriority.TRUNG_BINH}>Trung bình</option>
              <option value={TaskPriority.CAO}>Cao</option>
              <option value={TaskPriority.KHAN_CAP}>Khẩn cấp</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ghi chú</label>
            <textarea
              value={ghiChu}
              onChange={e => setGhiChu(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              placeholder="Ghi chú thêm (nếu có)..."
            />
          </div>
        </div>

        {/* Items table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Các dòng tăng ca <span className="text-red-500 ml-1">*</span>
            </label>
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Thêm dòng
            </button>
          </div>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">Ngày</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">Ca làm việc</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap min-w-[160px]">Nhân sự</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">Giờ bắt đầu</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">Giờ kết thúc</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">Tổng giờ</th>
                  <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">Xóa</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {rows.map((row, idx) => (
                  <React.Fragment key={idx}>
                    <tr className={rowErrors[idx] ? 'bg-red-50' : 'hover:bg-gray-50'}>
                      {/* Ngày */}
                      <td className="px-3 py-2">
                        <DatePicker
                          value={row.ngayTangCa}
                          onChange={v => updateRow(idx, { ngayTangCa: v })}
                          placeholder="Chọn ngày"
                        />
                      </td>
                      {/* Ca làm việc */}
                      <td className="px-3 py-2">
                        <select
                          value={row.workShiftId}
                          onChange={e => handleShiftChange(idx, e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-sm min-w-[120px]"
                        >
                          <option value="">-- Không chọn --</option>
                          {workShifts.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.startTime}–{s.endTime})
                            </option>
                          ))}
                        </select>
                      </td>
                      {/* Nhân sự — inline picker toggle */}
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setActiveRowForPicker(activeRowForPicker === idx ? null : idx)}
                          className="w-full text-left px-2 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50 focus:ring-1 focus:ring-blue-500 min-w-[160px]"
                        >
                          {row.nguoiThamGia.length === 0
                            ? <span className="text-gray-400">Chọn nhân sự...</span>
                            : <span className="text-gray-800 font-medium">{row.nguoiThamGia.length} người</span>
                          }
                        </button>
                        {row.nguoiThamGia.length > 0 && (
                          <div className="mt-1 text-xs text-gray-500 truncate max-w-[200px]">{getEmployeeNames(row.nguoiThamGia)}</div>
                        )}
                      </td>
                      {/* Giờ bắt đầu */}
                      <td className="px-3 py-2">
                        <input
                          type="time"
                          value={row.gioBatDau}
                          onChange={e => updateRow(idx, { gioBatDau: e.target.value })}
                          className="px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-sm"
                        />
                      </td>
                      {/* Giờ kết thúc */}
                      <td className="px-3 py-2">
                        <input
                          type="time"
                          value={row.gioKetThuc}
                          onChange={e => updateRow(idx, { gioKetThuc: e.target.value })}
                          className="px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-sm"
                        />
                      </td>
                      {/* Tổng giờ */}
                      <td className="px-3 py-2 text-sm text-gray-700 font-medium whitespace-nowrap">
                        {calcHours(row.gioBatDau, row.gioKetThuc)}h
                      </td>
                      {/* Xóa */}
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          disabled={rows.length === 1}
                          className="p-1 text-red-500 hover:bg-red-50 rounded disabled:opacity-30 transition-colors"
                          title="Xóa dòng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    {/* Employee picker expanded row */}
                    {activeRowForPicker === idx && (
                      <tr>
                        <td colSpan={7} className="px-3 py-3 bg-blue-50 border-t border-blue-200">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <label className="text-xs font-medium text-gray-600">Lọc phòng ban:</label>
                              <select
                                value={departmentFilter}
                                onChange={e => setDepartmentFilter(e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="">Tất cả</option>
                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                              <button
                                type="button"
                                onClick={() => setActiveRowForPicker(null)}
                                className="ml-auto text-xs text-gray-500 hover:text-gray-700 underline"
                              >
                                Đóng
                              </button>
                            </div>
                            {loadingEmployees ? (
                              <p className="text-xs text-gray-500">Đang tải nhân viên...</p>
                            ) : (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-1 max-h-40 overflow-y-auto">
                                {filteredEmployees.map(emp => (
                                  <label key={emp._id} className="flex items-center gap-2 px-2 py-1.5 bg-white rounded border border-gray-200 cursor-pointer hover:border-blue-400 transition-colors text-xs">
                                    <input
                                      type="checkbox"
                                      checked={row.nguoiThamGia.includes(emp._id)}
                                      onChange={() => toggleEmployee(idx, emp._id)}
                                      className="w-3.5 h-3.5 text-blue-600 rounded"
                                    />
                                    <span className="truncate">
                                      <span className="font-medium">{emp.lastName} {emp.firstName}</span>
                                      <span className="text-gray-400 ml-1">({emp.employeeCode})</span>
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    {/* Row error */}
                    {rowErrors[idx] && (
                      <tr>
                        <td colSpan={7} className="px-3 py-1 bg-red-50">
                          <span className="text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Dòng {idx + 1}: {rowErrors[idx]}
                          </span>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
              {/* Footer totals */}
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300">
                  <td colSpan={5} className="px-3 py-2 text-right text-xs font-bold text-gray-600 uppercase">Tổng cộng</td>
                  <td className="px-3 py-2">
                    <div className="text-xs text-gray-700 font-medium whitespace-nowrap">
                      <span className="block">Slot: <strong>{totalSlotHours}h</strong></span>
                      <span className="block text-blue-700">Người-giờ: <strong>{totalManHours}h</strong></span>
                    </div>
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* File upload */}
        <FileUpload
          label="File kèm theo"
          files={files}
          onChange={setFiles}
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
        />
      </form>
    </ModalForm>
  );
};

export default CreateOvertimePlanModal;
