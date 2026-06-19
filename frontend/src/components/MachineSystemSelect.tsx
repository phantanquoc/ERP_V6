import { useMachineSystems } from '../hooks/useMachineSystemDetails';
import type { MachineStatus } from '../services/machineSystemService';

interface MachineSystemSelectProps {
  value: string;
  onChange: (id: string) => void;
  loaiHeThong?: string;
  khuVuc?: string;
  trangThai?: MachineStatus;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

const MachineSystemSelect = ({
  value,
  onChange,
  loaiHeThong,
  khuVuc,
  trangThai,
  disabled,
  placeholder = 'Chọn hệ thống máy',
  required,
  className = '',
}: MachineSystemSelectProps) => {
  const systemsQuery = useMachineSystems({
    page: 1,
    limit: 200,
    hoatDong: true,
    sortBy: 'maHeThong',
    sortOrder: 'asc',
    loaiHeThong: loaiHeThong as any,
    khuVuc,
  });

  const systems = (systemsQuery.data?.data ?? []).filter(
    (s) => !trangThai || s.trangThai === trangThai
  );

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || systemsQuery.isLoading}
      required={required}
      className={`rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 ${className}`}
    >
      <option value="">{systemsQuery.isLoading ? 'Đang tải...' : placeholder}</option>
      {systems.map((s) => (
        <option key={s.id} value={s.id}>
          {s.maHeThong} — {s.tenHeThong}
        </option>
      ))}
    </select>
  );
};

export default MachineSystemSelect;
