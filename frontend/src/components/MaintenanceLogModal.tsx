import { useState, useEffect } from 'react';
import { Check, MessageSquare } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ModalForm, inputCls, textareaCls } from './ModalForm';
import { MaintenancePlanItemLog } from '../services/maintenancePlanService';
import maintenanceRecordService, { MaintenanceRecord } from '../services/maintenanceRecordService';
import { maintenanceRecordKeys } from '../hooks/useMaintenanceRecords';
import { useEmployeesForAssignment } from '../hooks/useEmployeesForAssignment';
import EmployeeCombobox from './common/EmployeeCombobox';
import EmployeeMultiCombobox from './common/EmployeeMultiCombobox';

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
  onToggle: (planId: string, itemId: string, month: number, lanThu: number, nguoiThucHien?: string, nguoiPhu?: string[], ngayThucHien?: string, recordData?: { tinhTrangTruoc?: string; tinhTrangSau?: string; deXuat?: string; thoiGianThucHien?: string; noiDung?: string }) => void;
  onUpdateNote: (logId: string, data: { ghiChu?: string; nguoiThucHien?: string; nguoiPhu?: string[]; ngayThucHien?: string; recordData?: { tinhTrangTruoc?: string; tinhTrangSau?: string; deXuat?: string; thoiGianThucHien?: string; noiDung?: string } }) => void;
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
      maxWidth="2xl"
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
          {noiDung || <span className="text-gray-400 italic">Chưa có nội dung bảo dưỡng</span>}
        </div>

        <div className="space-y-3">
          {occurrences.map((lanThu) => {
            const log = logs.find((l) => l.lanThu === lanThu);
            return (
            <OccurrenceRow
              key={`${lanThu}-${log?.id ?? 'new'}-${log?.hoanThanh ?? false}`}
              planId={planId}
              itemId={itemId}
              month={month}
              lanThu={lanThu}
              showLabel={timesPerMonth > 1}
              log={log}
              defaultNoiDung={noiDung}
              onToggle={onToggle}
              onUpdateNote={onUpdateNote}
            />
            );
          })}
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
  defaultNoiDung: string;
  onToggle: (planId: string, itemId: string, month: number, lanThu: number, nguoiThucHien?: string, nguoiPhu?: string[], ngayThucHien?: string, recordData?: { tinhTrangTruoc?: string; tinhTrangSau?: string; deXuat?: string; thoiGianThucHien?: string; noiDung?: string }) => void;
  onUpdateNote: (logId: string, data: { ghiChu?: string; nguoiThucHien?: string; nguoiPhu?: string[]; ngayThucHien?: string; recordData?: { tinhTrangTruoc?: string; tinhTrangSau?: string; deXuat?: string; thoiGianThucHien?: string; noiDung?: string } }) => void;
}

const OccurrenceRow = ({ planId, itemId, month, lanThu, showLabel, log, defaultNoiDung, onToggle, onUpdateNote }: OccurrenceRowProps) => {
  const checked = log?.hoanThanh ?? false;
  const queryClient = useQueryClient();
  const { data: employees = [] } = useEmployeesForAssignment();

  // Linked maintenance record (auto-generated when checked)
  const { data: linkedRecord } = useQuery({
    queryKey: [...maintenanceRecordKeys.lists(), 'byLog', log?.id ?? 'none'],
    queryFn: async () => {
      if (!log?.id) return null;
      const res: any = await maintenanceRecordService.getAll({ sourceLogId: log.id, limit: 1 } as any);
      const arr: MaintenanceRecord[] = res?.data ?? res ?? [];
      return (Array.isArray(arr) ? arr[0] : (res?.data?.[0] ?? null)) as MaintenanceRecord | null;
    },
    enabled: !!log?.id && checked,
  });

  // Editable fields
  const [nguoiTH, setNguoiTH] = useState(log?.nguoiThucHien ?? '');
  const [nguoiPhu, setNguoiPhu] = useState<string[]>(log?.nguoiPhu ?? []);
  const [ngayTH, setNgayTH] = useState(() => log?.ngayThucHien ? log.ngayThucHien.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState(log?.ghiChu ?? '');
  const [noiDung, setNoiDung] = useState(defaultNoiDung);
  const [tinhTrangTruoc, setTinhTrangTruoc] = useState('');
  const [tinhTrangSau, setTinhTrangSau] = useState('');
  const [deXuat, setDeXuat] = useState('');
  const [thoiGianTH, setThoiGianTH] = useState('');
  const [file, setFile] = useState<File | undefined>(undefined);

  // Sync from log / linked record
  useEffect(() => {
    setNguoiTH(log?.nguoiThucHien ?? '');
    setNguoiPhu(log?.nguoiPhu ?? []);
    setNote(log?.ghiChu ?? '');
    if (log?.ngayThucHien) setNgayTH(log.ngayThucHien.slice(0, 10));
  }, [log?.id, log?.nguoiThucHien, log?.ghiChu, log?.ngayThucHien]);

  useEffect(() => {
    // Keep noiDung in sync with plan item default until user edits
    setNoiDung(defaultNoiDung);
  }, [defaultNoiDung]);

  useEffect(() => {
    if (linkedRecord) {
      setTinhTrangTruoc(linkedRecord.tinhTrangTruoc === '(Chưa cập nhật)' ? '' : (linkedRecord.tinhTrangTruoc ?? ''));
      setTinhTrangSau(linkedRecord.tinhTrangSau === '(Chưa cập nhật)' ? '' : (linkedRecord.tinhTrangSau ?? ''));
      setDeXuat(linkedRecord.deXuat ?? '');
      setThoiGianTH(linkedRecord.thoiGianThucHien ?? '');
      if (linkedRecord.noiDung) setNoiDung(linkedRecord.noiDung);
      if (linkedRecord.ngayThucHien) setNgayTH(linkedRecord.ngayThucHien.slice(0, 10));
    } else if (!log) {
      setTinhTrangTruoc('');
      setTinhTrangSau('');
      setDeXuat('');
      setThoiGianTH('');
    }
  }, [linkedRecord]);

  const handleToggle = () => {
    if (!checked && !nguoiTH) return;
    if (checked) {
      if (!confirm('Bạn muốn hủy hoàn thành lần này? Biên bản liên kết sẽ bị xóa.')) return;
      onToggle(planId, itemId, month, lanThu, nguoiTH || undefined, nguoiPhu);
      return;
    }
    // Creating — forward record fields so auto-record is created with full info
    const rec: Record<string, string> = {};
    if (tinhTrangTruoc.trim()) rec.tinhTrangTruoc = tinhTrangTruoc.trim();
    if (tinhTrangSau.trim()) rec.tinhTrangSau = tinhTrangSau.trim();
    if (deXuat.trim()) rec.deXuat = deXuat.trim();
    if (thoiGianTH.trim()) rec.thoiGianThucHien = thoiGianTH.trim();
    if (noiDung.trim() && noiDung.trim() !== defaultNoiDung.trim()) rec.noiDung = noiDung.trim();
    onToggle(planId, itemId, month, lanThu, nguoiTH || undefined, nguoiPhu, ngayTH || undefined, Object.keys(rec).length ? rec as any : undefined);
  };

  const handleSave = async () => {
    if (!log) return;
    const data: { ghiChu?: string; nguoiThucHien?: string; nguoiPhu?: string[]; ngayThucHien?: string; recordData?: { tinhTrangTruoc?: string; tinhTrangSau?: string; deXuat?: string; thoiGianThucHien?: string; noiDung?: string } } = {};
    if (note !== (log.ghiChu ?? '')) data.ghiChu = note;
    if (nguoiTH !== (log.nguoiThucHien ?? '')) data.nguoiThucHien = nguoiTH;
    if (JSON.stringify(nguoiPhu) !== JSON.stringify(log.nguoiPhu ?? [])) data.nguoiPhu = nguoiPhu;
    const origNgay = log.ngayThucHien ? log.ngayThucHien.slice(0, 10) : '';
    if (ngayTH !== origNgay) data.ngayThucHien = ngayTH;

    // Record fields — only send if linked record exists (i.e. checked) or user filled them
    if (checked) {
      const rec: Record<string, string> = {};
      const origTT = linkedRecord?.tinhTrangTruoc === '(Chưa cập nhật)' ? '' : (linkedRecord?.tinhTrangTruoc ?? '');
      const origTS = linkedRecord?.tinhTrangSau === '(Chưa cập nhật)' ? '' : (linkedRecord?.tinhTrangSau ?? '');
      if (tinhTrangTruoc !== origTT) rec.tinhTrangTruoc = tinhTrangTruoc;
      if (tinhTrangSau !== origTS) rec.tinhTrangSau = tinhTrangSau;
      if (deXuat !== (linkedRecord?.deXuat ?? '')) rec.deXuat = deXuat;
      if (thoiGianTH !== (linkedRecord?.thoiGianThucHien ?? '')) rec.thoiGianThucHien = thoiGianTH;
      if (noiDung !== (linkedRecord?.noiDung ?? defaultNoiDung)) rec.noiDung = noiDung;
      if (Object.keys(rec).length) data.recordData = rec as any;
    }

    const hasChange = Object.keys(data).length > 0 || (data.recordData && Object.keys(data.recordData).length > 0);
    if (!hasChange && !file) return;

    // If file selected and linked record exists, upload via record update directly
    if (file && linkedRecord?.id) {
      try {
        await maintenanceRecordService.update(linkedRecord.id, {}, file);
        queryClient.invalidateQueries({ queryKey: maintenanceRecordKeys.lists() as any });
        if (linkedRecord?.id) queryClient.invalidateQueries({ queryKey: maintenanceRecordKeys.detail(linkedRecord.id) as any });
        setFile(undefined);
      } catch (e: any) {
        // let user see error but still try to save other fields
      }
    }

    if (hasChange) {
      onUpdateNote(log.id, data);
    }
  };

  const canToggle = checked || !!nguoiTH;
  const showRecordFields = true; // always show so user can pre-fill before ticking

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          disabled={!canToggle}
          className={`w-6 h-6 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
            checked
              ? 'bg-green-500 border-green-500 text-white'
              : canToggle
              ? 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              : 'border-gray-200 bg-gray-100 cursor-not-allowed'
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
        {linkedRecord?.maBienBan && (
          <span className="text-xs text-gray-500">· {linkedRecord.maBienBan}</span>
        )}
      </div>

      {/* Hàng 1: Người TH + Ngày + Thời gian */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Người thực hiện chính <span className="text-red-500">*</span></label>
          <EmployeeCombobox
            employees={employees}
            value={nguoiTH}
            onChange={setNguoiTH}
            placeholder="Tìm nhân viên..."
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Ngày thực hiện</label>
          <input type="date" value={ngayTH} onChange={(e) => setNgayTH(e.target.value)} className={inputCls()} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Thời gian thực hiện</label>
          <input value={thoiGianTH} onChange={(e) => setThoiGianTH(e.target.value)} placeholder="VD: 10h30-11h00" className={inputCls()} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Người phụ (kiểm tra &amp; thực hiện)</label>
        <EmployeeMultiCombobox
          employees={employees}
          value={nguoiPhu}
          onChange={setNguoiPhu}
          placeholder="Tìm và thêm người phụ..."
        />
      </div>

      {showRecordFields && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nội dung bảo dưỡng</label>
            <textarea value={noiDung} onChange={(e) => setNoiDung(e.target.value)} rows={2} className={textareaCls()} placeholder="Nội dung bảo dưỡng/sửa chữa..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tình trạng trước kiểm tra</label>
              <textarea value={tinhTrangTruoc} onChange={(e) => setTinhTrangTruoc(e.target.value)} rows={2} className={textareaCls()} placeholder="Mô tả tình trạng trước..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tình trạng sau kiểm tra</label>
              <textarea value={tinhTrangSau} onChange={(e) => setTinhTrangSau(e.target.value)} rows={2} className={textareaCls()} placeholder="Mô tả tình trạng sau..." />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Đề xuất bảo dưỡng / sửa chữa</label>
            <textarea value={deXuat} onChange={(e) => setDeXuat(e.target.value)} rows={2} className={textareaCls()} placeholder="Đề xuất (nếu có)..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Ghi chú</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Nhập ghi chú..."
                className={textareaCls()}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">File đính kèm</label>
              {linkedRecord?.fileDinhKem ? (
                <a href={linkedRecord.fileDinhKem} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline block pt-1">Xem file hiện tại</a>
              ) : (
                <span className="text-xs text-gray-400 block pt-1">Chưa có file</span>
              )}
              <input type="file" onChange={(e) => setFile(e.target.files?.[0])} className="mt-1 text-sm text-gray-600 w-full" />
              {file && <span className="text-xs text-gray-500">{file.name}</span>}
            </div>
          </div>
        </>
      )}

      {!checked && !log && (
        <p className="text-xs text-gray-400 italic">Điền thông tin rồi tick để hoàn thành — biên bản sẽ được tạo tự động với đầy đủ thông tin trên.</p>
      )}

      {log && (
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
