import { useState } from 'react';
import { ModalForm, ModalFooter, FormField, inputCls, selectCls, textareaCls } from './ModalForm';
import { useCreateMaintenanceRecord, useUpdateMaintenanceRecord, useGeneratedRecordCode } from '../hooks/useMaintenanceRecords';
import { useMachineSystemDetails } from '../hooks/useMachineSystemDetails';
import { useEmployeesForAssignment } from '../hooks/useEmployeesForAssignment';
import { MaintenanceRecord } from '../services/maintenanceRecordService';
import EmployeeCombobox from './common/EmployeeCombobox';
import EmployeeMultiCombobox from './common/EmployeeMultiCombobox';

interface Props {
  mode: 'create' | 'edit' | 'view';
  record: MaintenanceRecord | null;
  systems: any[];
  onClose: () => void;
  lockedMachineSystemId?: string;
}

const MaintenanceRecordForm = ({ mode, record, systems, onClose, lockedMachineSystemId }: Props) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  const [machineSystemId, setMachineSystemId] = useState(record?.machineSystemId ?? lockedMachineSystemId ?? '');
  const [machineSystemDetailId, setMachineSystemDetailId] = useState(record?.machineSystemDetailId ?? '');
  const [loai, setLoai] = useState(record?.loai ?? 'Bảo dưỡng');
  const [noiDung, setNoiDung] = useState(record?.noiDung ?? '');
  const [tinhTrangTruoc, setTinhTrangTruoc] = useState(record?.tinhTrangTruoc ?? '');
  const [tinhTrangSau, setTinhTrangSau] = useState(record?.tinhTrangSau ?? '');
  const [deXuat, setDeXuat] = useState(record?.deXuat ?? '');
  const [thoiGianThucHien, setThoiGianThucHien] = useState(record?.thoiGianThucHien ?? '');
  const [ngayThucHien, setNgayThucHien] = useState(
    record?.ngayThucHien ? record.ngayThucHien.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [nguoiThucHien, setNguoiThucHien] = useState(record?.nguoiThucHien ?? '');
  const [nguoiPhu, setNguoiPhu] = useState<string[]>(record?.nguoiPhu ?? []);
  const [file, setFile] = useState<File | undefined>();

  const { data: codeResponse } = useGeneratedRecordCode();
  const { data: detailsResponse } = useMachineSystemDetails({
    page: 1,
    limit: 500,
    machineSystemId: machineSystemId || undefined,
    hoatDong: true,
  });
  const { data: employees = [] } = useEmployeesForAssignment();

  const createRecord = useCreateMaintenanceRecord();
  const updateRecord = useUpdateMaintenanceRecord();

  const details = detailsResponse?.data ?? [];
  const generatedCode = codeResponse?.data?.code ?? '';

  const handleSubmit = async () => {
    if (!machineSystemId || !machineSystemDetailId || !noiDung || !tinhTrangTruoc || !tinhTrangSau || !nguoiThucHien) return;
    const payload = {
      machineSystemId,
      machineSystemDetailId,
      loai,
      noiDung,
      tinhTrangTruoc,
      tinhTrangSau,
      deXuat: deXuat || undefined,
      thoiGianThucHien: thoiGianThucHien || undefined,
      ngayThucHien,
      nguoiThucHien,
      nguoiPhu,
    };

    if (isEdit && record) {
      await updateRecord.mutateAsync({ id: record.id, data: payload, file });
    } else {
      await createRecord.mutateAsync({ data: payload, file });
    }
    onClose();
  };

  const title = mode === 'create' ? 'Tạo biên bản BD/SC' : mode === 'edit' ? 'Sửa biên bản' : `Chi tiết: ${record?.maBienBan}`;

  return (
    <ModalForm
      isOpen
      onClose={onClose}
      title={title}
      maxWidth="4xl"
      footer={isView ? undefined : (
        <ModalFooter
          onClose={onClose}
          onSubmit={handleSubmit}
          submitLabel={isEdit ? 'Cập nhật' : 'Lưu biên bản'}
          isLoading={createRecord.isPending || updateRecord.isPending}
        />
      )}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Mã biên bản">
            <input value={record?.maBienBan ?? generatedCode} readOnly className={inputCls() + ' bg-gray-50'} />
          </FormField>
          <FormField label="Loại" required>
            <select value={loai} onChange={(e) => setLoai(e.target.value)} disabled={isView} className={selectCls()}>
              <option value="Bảo dưỡng">Bảo dưỡng</option>
              <option value="Sửa chữa">Sửa chữa</option>
            </select>
          </FormField>
          <FormField label="Ngày thực hiện" required>
            <input type="date" value={ngayThucHien} onChange={(e) => setNgayThucHien(e.target.value)} disabled={isView} className={inputCls()} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Hệ thống" required>
            <select
              value={machineSystemId}
              onChange={(e) => { setMachineSystemId(e.target.value); setMachineSystemDetailId(''); }}
              disabled={isView || !!lockedMachineSystemId}
              className={selectCls()}
            >
              <option value="">-- Chọn hệ thống --</option>
              {systems.map((s: any) => (
                <option key={s.id} value={s.id}>{s.tenHeThong}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Thiết bị" required>
            <select value={machineSystemDetailId} onChange={(e) => setMachineSystemDetailId(e.target.value)} disabled={isView || !machineSystemId} className={selectCls()}>
              <option value="">-- Chọn thiết bị --</option>
              {details.map((d: any) => (
                <option key={d.id} value={d.id}>{d.tenChiTiet}</option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Nội dung bảo dưỡng/sửa chữa" required>
          <textarea value={noiDung} onChange={(e) => setNoiDung(e.target.value)} disabled={isView} rows={2} className={textareaCls()} />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Tình trạng trước kiểm tra" required>
            <textarea value={tinhTrangTruoc} onChange={(e) => setTinhTrangTruoc(e.target.value)} disabled={isView} rows={2} className={textareaCls()} />
          </FormField>
          <FormField label="Tình trạng sau kiểm tra" required>
            <textarea value={tinhTrangSau} onChange={(e) => setTinhTrangSau(e.target.value)} disabled={isView} rows={2} className={textareaCls()} />
          </FormField>
        </div>

        <FormField label="Đề xuất bảo dưỡng / sửa chữa">
          <textarea value={deXuat} onChange={(e) => setDeXuat(e.target.value)} disabled={isView} rows={2} className={textareaCls()} />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Thời gian thực hiện">
            <input value={thoiGianThucHien} onChange={(e) => setThoiGianThucHien(e.target.value)} disabled={isView} placeholder="VD: 10h30-11h00" className={inputCls()} />
          </FormField>
          <FormField label="Người thực hiện chính" required>
            {isView ? (
              <p className="text-sm text-gray-700 pt-1.5">{nguoiThucHien || '—'}</p>
            ) : (
              <EmployeeCombobox
                employees={employees}
                value={nguoiThucHien}
                onChange={setNguoiThucHien}
                placeholder="Tìm nhân viên..."
                disabled={isView}
              />
            )}
          </FormField>
          <FormField label="File đính kèm">
            {isView ? (
              record?.fileDinhKem ? (
                <a href={record.fileDinhKem} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">Xem file</a>
              ) : (
                <span className="text-sm text-gray-400">Không có</span>
              )
            ) : (
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0])}
                className="text-sm text-gray-600"
              />
            )}
          </FormField>
        </div>

        <FormField label="Người phụ (kiểm tra & thực hiện)">
          {isView ? (
            <p className="text-sm text-gray-700 pt-1.5">{nguoiPhu.length > 0 ? nguoiPhu.join(', ') : '—'}</p>
          ) : (
            <EmployeeMultiCombobox
              employees={employees}
              value={nguoiPhu}
              onChange={setNguoiPhu}
              placeholder="Tìm và thêm người phụ..."
              disabled={isView}
            />
          )}
        </FormField>
      </div>
    </ModalForm>
  );
};

export default MaintenanceRecordForm;
