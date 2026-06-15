import { useState } from 'react';
import { Check, MessageSquare } from 'lucide-react';
import { ModalForm, selectCls, textareaCls } from './ModalForm';
import { MaintenancePlanItemLog } from '../services/maintenancePlanService';
import { useEmployeesForAssignment } from '../hooks/useEmployeesForAssignment';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  itemId: string;
  month: number;
  timesPerMonth: number;
  logs: MaintenancePlanItemLog[];
  noiDung: string;
  tenThietBi: string;
  nguoiLap: string;
  onToggle: (planId: string, itemId: string, month: number, lanThu: number, nguoiThucHien?: string) => void;
  onUpdateNote: (logId: string, data: { ghiChu?: string; nguoiThucHien?: string }) => void;
}

const MaintenanceLogModal = ({
  isOpen, onClose, planId, itemId, month, timesPerMonth,
  logs, noiDung, tenThietBi, nguoiLap, onToggle, onUpdateNote,
}: Props) => {
  const occurrences = Array.from({ length: timesPerMonth }, (_, i) => i + 1);

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      title={`Tháng ${month} — ${tenThietBi}`}
      titleIcon={<MessageSquare className="w-5 h-5" />}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Người lập KH: <span className="font-medium text-gray-700">{nguoiLap}</span></span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Đóng
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
          {noiDung}
        </div>

        <div className="space-y-3">
          {occurrences.map((lanThu) => (
            <OccurrenceRow
              key={lanThu}
              planId={planId}
              itemId={itemId}
              month={month}
              lanThu={lanThu}
              showLabel={timesPerMonth > 1}
              log={logs.find((l) => l.lanThu === lanThu)}
              onToggle={onToggle}
              onUpdateNote={onUpdateNote}
            />
          ))}
        </div>
      </div>
    </ModalForm>
  );
};

interface OccurrenceRowProps {
  planId: string;
  itemId: string;
  month: number;
  lanThu: number;
  showLabel: boolean;
  log: MaintenancePlanItemLog | undefined;
  onToggle: (planId: string, itemId: string, month: number, lanThu: number, nguoiThucHien?: string) => void;
  onUpdateNote: (logId: string, data: { ghiChu?: string; nguoiThucHien?: string }) => void;
}

const OccurrenceRow = ({ planId, itemId, month, lanThu, showLabel, log, onToggle, onUpdateNote }: OccurrenceRowProps) => {
  const checked = log?.hoanThanh ?? false;
  const [nguoiTH, setNguoiTH] = useState(log?.nguoiThucHien ?? '');
  const [note, setNote] = useState(log?.ghiChu ?? '');
  const [dirtyNote, setDirtyNote] = useState(false);
  const [dirtyNguoi, setDirtyNguoi] = useState(false);

  const { data: employees = [] } = useEmployeesForAssignment();

  const handleNoteChange = (value: string) => {
    setNote(value);
    setDirtyNote(value !== (log?.ghiChu ?? ''));
  };

  const handleNguoiChange = (value: string) => {
    setNguoiTH(value);
    setDirtyNguoi(value !== (log?.nguoiThucHien ?? ''));
  };

  const handleSave = () => {
    if (!log) return;
    const data: { ghiChu?: string; nguoiThucHien?: string } = {};
    if (dirtyNote) data.ghiChu = note;
    if (dirtyNguoi) data.nguoiThucHien = nguoiTH;
    if (Object.keys(data).length > 0) {
      onUpdateNote(log.id, data);
      setDirtyNote(false);
      setDirtyNguoi(false);
    }
  };

  const handleToggle = () => {
    onToggle(planId, itemId, month, lanThu, nguoiTH || undefined);
  };

  const hasDirty = dirtyNote || dirtyNguoi;

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          className={`w-6 h-6 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
            checked
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
        >
          {checked && <Check className="w-3.5 h-3.5" />}
        </button>
        <span className="text-sm font-medium text-gray-700">
          {showLabel ? `Lần ${lanThu}` : 'Hoàn thành'}
        </span>
        {checked && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Đã hoàn thành</span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Người thực hiện</label>
          <select
            value={nguoiTH}
            onChange={(e) => handleNguoiChange(e.target.value)}
            className={selectCls() + ' !py-1.5 !text-xs'}
          >
            <option value="">-- Chọn nhân viên --</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.name}>
                {emp.name} {emp.department ? `(${emp.department})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Ngày thực hiện</label>
          <p className="text-sm text-gray-700 pt-1.5">
            {log?.ngayThucHien ? new Date(log.ngayThucHien).toLocaleDateString('vi-VN') : '—'}
          </p>
        </div>
      </div>

      {log && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Ghi chú</label>
          <textarea
            value={note}
            onChange={(e) => handleNoteChange(e.target.value)}
            rows={2}
            placeholder="Nhập ghi chú..."
            className={textareaCls()}
          />
        </div>
      )}

      {!log && (
        <p className="text-xs text-gray-400 italic">Chọn người thực hiện rồi tick hoàn thành</p>
      )}

      {hasDirty && log && (
        <button
          onClick={handleSave}
          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          Lưu thay đổi
        </button>
      )}
    </div>
  );
};

export default MaintenanceLogModal;
