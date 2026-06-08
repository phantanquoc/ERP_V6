import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useEmployeesForAssignment } from '../hooks/useEmployeesForAssignment';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  multiple?: boolean;
}

const splitNames = (value: string) => value ? value.split(',').map((s) => s.trim()).filter(Boolean) : [];
const joinNames = (names: string[]) => names.join(', ');

const EmployeePicker = ({ value, onChange, placeholder = 'Chọn nhân viên', className = '', multiple = false }: Props) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const { data: employees = [] } = useEmployeesForAssignment();

  const selected = useMemo(() => multiple ? splitNames(value) : [], [value, multiple]);

  const filtered = useMemo(() => {
    let list = employees;
    if (multiple) {
      const selectedSet = new Set(selected);
      list = list.filter((e) => !selectedSet.has(e.name));
    }
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(
      (e) => e.name.toLowerCase().includes(q) || e.employeeCode.toLowerCase().includes(q) || (e.department && e.department.toLowerCase().includes(q))
    );
  }, [search, employees, multiple, selected]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (name: string) => {
    if (multiple) {
      onChange(joinNames([...selected, name]));
      setSearch('');
    } else {
      onChange(name);
      setSearch('');
      setOpen(false);
    }
  };

  const handleRemove = (name: string) => {
    onChange(joinNames(selected.filter((n) => n !== name)));
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div
        className="flex flex-wrap items-center gap-1 w-full min-h-[38px] rounded-md border border-gray-300 px-2 py-1.5 cursor-pointer bg-white"
        onClick={() => setOpen(!open)}
      >
        {multiple && selected.length > 0 ? (
          selected.map((name) => (
            <span key={name} className="inline-flex items-center gap-0.5 rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-xs text-blue-700">
              {name}
              <button type="button" onClick={(e) => { e.stopPropagation(); handleRemove(name); }} className="text-blue-400 hover:text-blue-600"><X className="h-3 w-3" /></button>
            </span>
          ))
        ) : !multiple && value ? (
          <span className="flex-1 truncate text-sm text-gray-900">{value}</span>
        ) : (
          <span className="text-sm text-gray-400">{placeholder}</span>
        )}
        {!multiple && value && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(''); }} className="ml-auto text-gray-400 hover:text-gray-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-52 flex flex-col">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm nhân viên..."
            className="sticky top-0 border-b border-gray-200 px-3 py-2 text-sm outline-none"
          />
          <ul className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500">Không tìm thấy</li>
            ) : filtered.map((emp) => (
              <li
                key={emp.id}
                onClick={() => handleSelect(emp.name)}
                className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer flex items-center gap-2"
              >
                <span className="font-mono text-xs text-gray-500">{emp.employeeCode}</span>
                <span className="text-gray-900">{emp.name}</span>
                {emp.department && <span className="text-xs text-gray-400">({emp.department})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default EmployeePicker;
