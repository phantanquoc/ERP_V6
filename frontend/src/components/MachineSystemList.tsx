import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Copy, Edit, Eye, Plus, Power, RefreshCw, Search, Trash2, X } from 'lucide-react';
import Modal from './Modal';
import {
  useCloneMachineSystem,
  useCreateMachineSystem,
  useCreateMachineSystemDetail,
  useDeactivateMachineSystemDetail,
  useDeleteMachineSystem,
  useDeleteMachineSystemDetail,
  useDetailTree,
  useDistinctMachineSystemFields,
  useMachineSystemDetails,
  useMachineSystems,
  useNextDetailCode,
  useNextMachineSystemCode,
  useUpdateMachineSystem,
  useUpdateMachineSystemDetail,
} from '../hooks/useMachineSystemDetails';
import { useEmployeesForAssignment, type EmployeeOption } from '../hooks/useEmployeesForAssignment';
import MachineSummaryDrawer from './MachineSummaryDrawer';
import MachineStatusUpdateDialog from './MachineStatusUpdateDialog';
import ResponsiveRowActions, { type RowAction } from './ResponsiveRowActions';
import type {
  CloneMachineSystemRequest,
  CreateMachineSystemDetailRequest,
  CreateMachineSystemRequest,
  MachineStatus,
  MachineSystem,
  MachineSystemCategory,
  MachineSystemDetail,
  MachineSystemDetailFilters,
  MachineSystemDetailType,
  MachineSystemFilters,
  UpdateMachineSystemDetailRequest,
} from '../services/machineSystemService';

type Mode = 'create' | 'edit' | 'view';
type SystemForm = CreateMachineSystemRequest;
type DetailForm = CreateMachineSystemDetailRequest;

const DETAIL_TYPES: { value: MachineSystemDetailType; label: string }[] = [
  { value: 'THIET_BI', label: 'Thiết bị' },
  { value: 'CUM', label: 'Cụm' },
  { value: 'LINH_KIEN', label: 'Linh kiện' },
  { value: 'DIEM_KIEM_TRA', label: 'Điểm kiểm tra' },
];

const SYSTEM_SORTS: { value: NonNullable<MachineSystemFilters['sortBy']>; label: string }[] = [
  { value: 'maHeThong', label: 'Mã hệ thống' },
  { value: 'tenHeThong', label: 'Tên hệ thống' },
  { value: 'createdAt', label: 'Ngày tạo' },
];

const MACHINE_SYSTEM_CATEGORIES: { value: MachineSystemCategory; label: string }[] = [
  { value: 'SAN_XUAT', label: 'Sản xuất' },
  { value: 'DONG_GOI', label: 'Đóng gói' },
  { value: 'BAO_QUAN', label: 'Bảo quản' },
  { value: 'DIEN', label: 'Điện' },
  { value: 'NUOC', label: 'Nước' },
  { value: 'HOI', label: 'Hơi' },
  { value: 'KHI_NEN', label: 'Khí nén' },
  { value: 'LAM_NONG', label: 'Làm nóng' },
  { value: 'VAN_CHUYEN', label: 'Vận chuyển' },
  { value: 'PCCC', label: 'Phòng cháy chữa cháy' },
  { value: 'CHAT_THAI', label: 'Chất thải' },
  { value: 'KIEM_TRA_CL', label: 'Kiểm tra CL' },
  { value: 'AN_TOAN', label: 'An toàn' },
  { value: 'KHAC', label: 'Khác' },
];

const DETAIL_SORTS: { value: NonNullable<MachineSystemDetailFilters['sortBy']>; label: string }[] = [
  { value: 'maChiTiet', label: 'Mã chi tiết' },
  { value: 'tenChiTiet', label: 'Tên chi tiết' },
  { value: 'loaiChiTiet', label: 'Loại' },
  { value: 'thuTu', label: 'Thứ tự' },
];

const Combobox = ({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
        setInputValue(value);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  const filteredOptions = useMemo(() => {
    if (!inputValue) return options;
    return options.filter((opt) => opt.toLowerCase().includes(inputValue.toLowerCase()));
  }, [options, inputValue]);

  const handleSelect = (option: string) => {
    setInputValue(option);
    onChange(option);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setInputValue(value);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          disabled={disabled}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => !disabled && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-md border border-gray-300 px-3 py-2 pr-8 text-sm disabled:bg-gray-50"
        />
        {!disabled && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              setOpen((prev) => !prev);
              inputRef.current?.focus();
            }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && filteredOptions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {filteredOptions.map((option) => (
            <li
              key={option}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(option)}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-blue-50"
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};


const emptySystemForm = (): SystemForm => ({
  khuVuc: '',
  viTri: '',
  maHeThong: '',
  tenHeThong: '',
  chucNang: '',
  loaiHeThong: 'KHAC',
  nhiemVu: '',
  maNguoiThucHien: '',
  nguoiThucHien: '',
  hoatDong: true,
});

const emptyDetailForm = (machineSystemId = ''): DetailForm => ({
  machineSystemId,
  parentDetailId: '',
  loaiChiTiet: 'THIET_BI',
  maChiTiet: '',
  tenChiTiet: '',
  viTri: '',
  moTa: '',
  maNguoiPhuTrach: '',
  nguoiPhuTrach: '',
  thuTu: 0,
  hoatDong: true,
  trangThai: 'Đang hoạt động',
});

const detailTypeLabel = (value?: string) =>
  DETAIL_TYPES.find((type) => type.value === value)?.label ?? value ?? '—';

const statusBadge = (active?: boolean) =>
  active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200';

const MACHINE_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  HOAT_DONG: { label: 'Hoạt động', cls: 'bg-green-100 text-green-700 border-green-200' },
  BAO_TRI: { label: 'Bảo trì', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  NGUNG_HOAT_DONG: { label: 'Ngừng HĐ', cls: 'bg-red-100 text-red-700 border-red-200' },
};

const machineStatusBadge = (status?: MachineStatus | null) => {
  const cfg = (status && MACHINE_STATUS_MAP[status]) ?? MACHINE_STATUS_MAP.HOAT_DONG;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('vi-VN') : '—';

const getSystemName = (system?: MachineSystem | null) =>
  system ? `${system.maHeThong} - ${system.tenHeThong}` : '—';

const getDetailPath = (detail: MachineSystemDetail) => {
  const parent = detail.parentDetail ? `${detail.parentDetail.maChiTiet} / ` : '';
  return `${parent}${detail.maChiTiet} - ${detail.tenChiTiet}`;
};

const MachineSystemList = () => {
  const [systemFilters, setSystemFilters] = useState<MachineSystemFilters>({
    page: 1,
    limit: 10,
    sortBy: 'maHeThong',
    sortOrder: 'asc',
  });
  const [detailFilters, setDetailFilters] = useState<MachineSystemDetailFilters>({
    page: 1,
    limit: 10,
    sortBy: 'thuTu',
    sortOrder: 'asc',
  });
  const [systemPageIndex, setSystemPageIndex] = useState(0);

  const systemsQuery = useMachineSystems(systemFilters);
  const allSystemsQuery = useMachineSystems({ page: 1, limit: 200, hoatDong: true, sortBy: 'maHeThong', sortOrder: 'asc' });
  const detailsQuery = useMachineSystemDetails(detailFilters);
  const allDetailsQuery = useMachineSystemDetails({
    page: 1,
    limit: 300,
    machineSystemId: detailFilters.machineSystemId,
    hoatDong: true,
    sortBy: 'thuTu',
    sortOrder: 'asc',
  });

  const createSystem = useCreateMachineSystem();
  const updateSystem = useUpdateMachineSystem();
  const deleteSystem = useDeleteMachineSystem();
  const createDetail = useCreateMachineSystemDetail();
  const updateDetail = useUpdateMachineSystemDetail();
  const deactivateDetail = useDeactivateMachineSystemDetail();
  const deleteDetail = useDeleteMachineSystemDetail();
  const cloneSystem = useCloneMachineSystem();

  const systems = systemsQuery.data?.data ?? [];
  const allSystems = allSystemsQuery.data?.data ?? [];
  const details = detailsQuery.data?.data ?? [];
  const allDetails = allDetailsQuery.data?.data ?? [];
  const systemPagination = systemsQuery.data?.pagination;
  const detailPagination = detailsQuery.data?.pagination;

  const [systemModal, setSystemModal] = useState<{ mode: Mode; record?: MachineSystem } | null>(null);
  const [detailModal, setDetailModal] = useState<{ mode: Mode; record?: MachineSystemDetail } | null>(null);
  const [systemForm, setSystemForm] = useState<SystemForm>(emptySystemForm());
  const [detailForm, setDetailForm] = useState<DetailForm>(emptyDetailForm());
  const [error, setError] = useState('');
  const [drawerSystemId, setDrawerSystemId] = useState<string | null>(null);
  const [statusUpdateSystemId, setStatusUpdateSystemId] = useState<string | null>(null);
  const [cloneDialog, setCloneDialog] = useState<{ system: MachineSystem; maHeThong: string; tenHeThong: string } | null>(null);
  const [cloneError, setCloneError] = useState('');

  // Employee dropdown for assignment
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const { data: employeeOptions = [], isLoading: loadingEmployees } = useEmployeesForAssignment();
  const employeeDropdownRef = useRef<HTMLDivElement>(null);

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch) return employeeOptions;
    const q = employeeSearch.toLowerCase();
    return employeeOptions.filter(
      (emp) =>
        emp.name.toLowerCase().includes(q) ||
        emp.employeeCode.toLowerCase().includes(q) ||
        (emp.department && emp.department.toLowerCase().includes(q))
    );
  }, [employeeSearch, employeeOptions]);

  const handleEmployeeSelect = (employee: EmployeeOption) => {
    setSystemForm((form) => ({
      ...form,
      maNguoiThucHien: employee.employeeCode,
      nguoiThucHien: employee.name,
    }));
    setEmployeeSearch('');
    setIsEmployeeDropdownOpen(false);
  };

  const handleEmployeeClear = () => {
    setSystemForm((form) => ({
      ...form,
      maNguoiThucHien: '',
      nguoiThucHien: '',
    }));
    setEmployeeSearch('');
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target as Node)) {
        setIsEmployeeDropdownOpen(false);
        setEmployeeSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const distinctFieldsQuery = useDistinctMachineSystemFields();
  const existingKhuVuc = distinctFieldsQuery.data?.data?.khuVuc ?? [];
  const existingViTri = distinctFieldsQuery.data?.data?.viTri ?? [];

  const nextCodeQuery = useNextMachineSystemCode(
    systemModal?.mode === 'create' ? systemForm.loaiHeThong : undefined
  );
  const [fetchedCode, setFetchedCode] = useState('');

  useEffect(() => {
    if (systemModal?.mode === 'create' && nextCodeQuery.data?.data?.code) {
      const newCode = nextCodeQuery.data.data.code;
      setFetchedCode(newCode);
      setSystemForm((form) => ({ ...form, maHeThong: newCode }));
    }
  }, [nextCodeQuery.data?.data?.code, systemModal?.mode]);

  useEffect(() => {
    if (systemModal?.mode === 'create') {
      setFetchedCode('');
      nextCodeQuery.refetch();
    }
  }, [systemModal?.mode, systemForm.loaiHeThong]);

  const nextDetailCodeQuery = useNextDetailCode(
    detailModal?.mode === 'create' ? detailForm.loaiChiTiet : undefined
  );

  useEffect(() => {
    if (detailModal?.mode === 'create' && nextDetailCodeQuery.data?.data?.code) {
      setDetailForm((form) => ({ ...form, maChiTiet: nextDetailCodeQuery.data!.data!.code }));
    }
  }, [nextDetailCodeQuery.data?.data?.code, detailModal?.mode]);

  const activeSystemId = detailFilters.machineSystemId ?? allSystems[systemPageIndex]?.id;
  const detailTreeQuery = useDetailTree(activeSystemId);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  type TreeNode = MachineSystemDetail & { depth: number; children: string[] };

  const treeData = useMemo((): TreeNode[] | null => {
    const items = detailTreeQuery.data?.data;
    if (!items || items.length === 0) return null;

    const map = new Map<string, TreeNode>();
    items.forEach((item) => map.set(item.id, { ...item, depth: 0, children: [] }));
    const roots: string[] = [];
    items.forEach((item) => {
      if (item.parentDetailId && map.has(item.parentDetailId)) {
        map.get(item.parentDetailId)!.children.push(item.id);
      } else {
        roots.push(item.id);
      }
    });
    const setDepth = (id: string, depth: number) => {
      const node = map.get(id)!;
      node.depth = depth;
      node.children.forEach((childId) => setDepth(childId, depth + 1));
    };
    roots.forEach((id) => setDepth(id, 0));
    const flatten = (ids: string[]): TreeNode[] => {
      const result: TreeNode[] = [];
      ids.forEach((id) => {
        const node = map.get(id)!;
        result.push(node);
        if (expandedIds.has(id)) {
          result.push(...flatten(node.children));
        }
      });
      return result;
    };
    return flatten(roots);
  }, [detailTreeQuery.data?.data, expandedIds]);

  const treeItemsSource = detailTreeQuery.data?.data;

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    if (!treeItemsSource) return;
    const ids = treeItemsSource
      .filter((item) => item.childDetails && item.childDetails.length > 0)
      .map((item) => item.id);
    setExpandedIds(new Set(ids));
  };

  const collapseAll = () => setExpandedIds(new Set());

  const parentCandidatesQuery = useMachineSystemDetails({
    page: 1,
    limit: 500,
    machineSystemId: detailForm.machineSystemId || undefined,
    hoatDong: true,
    sortBy: 'thuTu',
    sortOrder: 'asc',
  });
  const parentDetailOptions = useMemo(() => {
    if (!detailForm.machineSystemId) return [];
    const type = detailForm.loaiChiTiet;
    if (type === 'THIET_BI') return [];
    const all = (parentCandidatesQuery.data?.data ?? []).filter(
      (d) => d.id !== detailModal?.record?.id
    );
    if (type === 'CUM') return all.filter((d) => d.loaiChiTiet === 'THIET_BI');
    return all.filter((d) => d.loaiChiTiet === 'THIET_BI' || d.loaiChiTiet === 'CUM');
  }, [parentCandidatesQuery.data?.data, detailForm.machineSystemId, detailForm.loaiChiTiet, detailModal?.record?.id]);

  const openSystemModal = (mode: Mode, record?: MachineSystem) => {
    setError('');
    setSystemModal({ mode, record });
    setSystemForm(record ? {
      khuVuc: record.khuVuc ?? '',
      viTri: record.viTri ?? '',
      maHeThong: record.maHeThong,
      tenHeThong: record.tenHeThong,
      chucNang: record.chucNang ?? '',
      loaiHeThong: record.loaiHeThong ?? 'KHAC',
      nhiemVu: record.nhiemVu ?? '',
      maNguoiThucHien: record.maNguoiThucHien ?? '',
      nguoiThucHien: record.nguoiThucHien ?? '',
      hoatDong: record.hoatDong,
    } : emptySystemForm());
    setFetchedCode('');
  };

  const openDetailModal = (mode: Mode, record?: MachineSystemDetail) => {
    setError('');
    setDetailModal({ mode, record });
    setDetailForm(record ? {
      machineSystemId: record.machineSystemId,
      parentDetailId: record.parentDetailId ?? '',
      loaiChiTiet: record.loaiChiTiet,
      maChiTiet: record.maChiTiet,
      tenChiTiet: record.tenChiTiet,
      viTri: record.viTri ?? '',
      moTa: record.moTa ?? '',
      maNguoiPhuTrach: record.maNguoiPhuTrach ?? '',
      nguoiPhuTrach: record.nguoiPhuTrach ?? '',
      thuTu: record.thuTu,
      hoatDong: record.hoatDong,
      trangThai: record.trangThai,
    } : emptyDetailForm(detailFilters.machineSystemId ?? allSystems[0]?.id ?? ''));
  };

  const saveSystem = async (event: FormEvent) => {
    event.preventDefault();
    if (!systemModal) return;
    try {
      if (systemModal.record) {
        await updateSystem.mutateAsync({ id: systemModal.record.id, data: systemForm });
      } else {
        await createSystem.mutateAsync({ data: systemForm });
      }
      setSystemModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được hệ thống');
    }
  };

  const saveDetail = async (event: FormEvent) => {
    event.preventDefault();
    if (!detailModal) return;
    const payload: UpdateMachineSystemDetailRequest = {
      ...detailForm,
      parentDetailId: detailForm.parentDetailId || null,
      thuTu: Number(detailForm.thuTu) || 0,
    };
    try {
      if (detailModal.record) {
        await updateDetail.mutateAsync({ id: detailModal.record.id, data: payload });
      } else {
        await createDetail.mutateAsync({ data: payload as DetailForm });
      }
      setDetailModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được chi tiết máy');
    }
  };

  const removeSystem = async (record: MachineSystem) => {
    if (!confirm(`Xóa hệ thống ${record.maHeThong}?`)) return;
    try {
      await deleteSystem.mutateAsync(record.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không xóa được hệ thống');
    }
  };

  const removeDetail = async (record: MachineSystemDetail) => {
    if (!confirm(`Xóa chi tiết ${record.maChiTiet}? Nếu đã phát sinh dữ liệu, hãy dừng hoạt động thay vì xóa.`)) return;
    try {
      await deleteDetail.mutateAsync(record.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không xóa được chi tiết máy');
    }
  };

  const deactivate = async (record: MachineSystemDetail) => {
    if (!confirm(`Dừng hoạt động chi tiết ${record.maChiTiet}?`)) return;
    try {
      await deactivateDetail.mutateAsync(record.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không dừng được chi tiết máy');
    }
  };

  const renderPager = (
    pagination: typeof systemPagination,
    page: number,
    setPage: (page: number) => void,
  ) => {
    if (!pagination || pagination.totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2 text-sm">
        <span className="text-gray-600">
          Trang {pagination.page}/{pagination.totalPages} - {pagination.total} dòng
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="rounded-md border border-gray-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Trước
          </button>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(page + 1)}
            className="rounded-md border border-gray-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Hệ thống máy</h2>
            <p className="text-xs text-gray-500">Danh mục hệ thống gốc để quản lý chi tiết máy.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                value={systemFilters.search ?? ''}
                onChange={(event) => setSystemFilters((filters) => ({ ...filters, search: event.target.value, page: 1 }))}
                placeholder="Tìm hệ thống"
                className="w-56 rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={systemFilters.hoatDong === undefined ? '' : String(systemFilters.hoatDong)}
              onChange={(event) => setSystemFilters((filters) => ({ ...filters, hoatDong: event.target.value === '' ? undefined : event.target.value === 'true', page: 1 }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="true">Đang hoạt động</option>
              <option value="false">Dừng</option>
            </select>
            <select
              value={systemFilters.sortBy}
              onChange={(event) => setSystemFilters((filters) => ({ ...filters, sortBy: event.target.value as MachineSystemFilters['sortBy'], page: 1 }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {SYSTEM_SORTS.map((sort) => <option key={sort.value} value={sort.value}>{sort.label}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setSystemFilters((filters) => ({ ...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc', page: 1 }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {systemFilters.sortOrder === 'asc' ? 'Tăng' : 'Giảm'}
            </button>
            <button
              type="button"
              onClick={() => openSystemModal('create')}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Thêm hệ thống
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
              <tr>
                <th className="border-b border-gray-200 px-3 py-2.5 text-left sticky left-0 bg-gray-50 z-10 min-w-[80px]">Mã</th>
                <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[140px]">Tên hệ thống</th>
                <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[110px]">Loại</th>
                <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[90px]">Khu vực</th>
                <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[90px]">Vị trí</th>
                <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[100px]">Người TH</th>
                <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[100px]">Hoạt động</th>
                <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[110px]">Tình trạng</th>
                <th className="border-b border-gray-200 px-3 py-2.5 text-right sticky right-0 bg-gray-50 z-10 min-w-[130px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {systemsQuery.isLoading ? (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-400">Đang tải...</td></tr>
              ) : systems.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-400">Chưa có hệ thống phù hợp.</td></tr>
              ) : systems.map((system) => (
                <tr key={system.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-2.5 sticky left-0 bg-white z-10 font-mono text-xs text-blue-700 font-medium">{system.maHeThong}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-900">{system.tenHeThong}</td>
                  <td className="px-3 py-2.5 text-gray-600 text-xs">{MACHINE_SYSTEM_CATEGORIES.find(c => c.value === system.loaiHeThong)?.label ?? system.loaiHeThong}</td>
                  <td className="px-3 py-2.5 text-gray-600 text-xs">{system.khuVuc || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600 text-xs">{system.viTri || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600 text-xs">{system.nguoiThucHien || '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge(system.hoatDong)}`}>
                      {system.hoatDong ? 'Đang hoạt động' : 'Dừng'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {machineStatusBadge(system.trangThai as MachineStatus | undefined)}
                  </td>
                  <td className="px-3 py-2.5 sticky right-0 bg-white z-10">
                    <ResponsiveRowActions
                      actions={[
                        { key: 'view', label: 'Xem hệ thống', icon: <Eye className="h-4 w-4" />, onClick: () => { setDrawerSystemId(system.id); }, tone: 'primary' },
                        { key: 'edit', label: 'Sửa hệ thống', icon: <Edit className="h-4 w-4" />, onClick: () => openSystemModal('edit', system), tone: 'success' },
                        { key: 'clone', label: 'Nhân bản hệ thống', icon: <Copy className="h-4 w-4" />, onClick: () => setCloneDialog({ system, maHeThong: system.maHeThong + '-COPY', tenHeThong: system.tenHeThong + ' (bản sao)' }), tone: 'default' },
                        { key: 'status', label: 'Cập nhật trạng thái', icon: <RefreshCw className="h-4 w-4" />, onClick: () => setStatusUpdateSystemId(system.id), tone: 'warning' },
                        { key: 'delete', label: 'Xóa hệ thống', icon: <Trash2 className="h-4 w-4" />, onClick: () => removeSystem(system), tone: 'danger' },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {renderPager(systemPagination, systemFilters.page ?? 1, (page) => setSystemFilters((filters) => ({ ...filters, page })))}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Chi tiết hệ thống máy</h2>
              <p className="text-xs text-gray-500">Thiết bị, cụm, linh kiện và điểm kiểm tra theo cây hệ thống.</p>
            </div>
            <button
              type="button"
              onClick={() => openDetailModal('create')}
              className="inline-flex w-fit items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Thêm chi tiết
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                value={detailFilters.search ?? ''}
                onChange={(event) => setDetailFilters((filters) => ({ ...filters, search: event.target.value, page: 1 }))}
                placeholder="Tìm chi tiết"
                className="w-52 rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={detailFilters.machineSystemId ?? ''}
              onChange={(event) => { setDetailFilters((filters) => ({ ...filters, machineSystemId: event.target.value || undefined, page: 1 })); setSystemPageIndex(0); setExpandedIds(new Set()); }}
              className="min-w-[220px] rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Tất cả hệ thống</option>
              {allSystems.map((system) => <option key={system.id} value={system.id}>{getSystemName(system)}</option>)}
            </select>
            <select
              value={detailFilters.loaiChiTiet ?? ''}
              onChange={(event) => setDetailFilters((filters) => ({ ...filters, loaiChiTiet: (event.target.value || undefined) as MachineSystemDetailType | undefined, page: 1 }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Tất cả loại</option>
              {DETAIL_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
            <select
              value={detailFilters.hoatDong === undefined ? '' : String(detailFilters.hoatDong)}
              onChange={(event) => setDetailFilters((filters) => ({ ...filters, hoatDong: event.target.value === '' ? undefined : event.target.value === 'true', page: 1 }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Tất cả hoạt động</option>
              <option value="true">Đang hoạt động</option>
              <option value="false">Dừng</option>
            </select>
            <select
              value={detailFilters.sortBy}
              onChange={(event) => setDetailFilters((filters) => ({ ...filters, sortBy: event.target.value as MachineSystemDetailFilters['sortBy'], page: 1 }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {DETAIL_SORTS.map((sort) => <option key={sort.value} value={sort.value}>{sort.label}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setDetailFilters((filters) => ({ ...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc', page: 1 }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {detailFilters.sortOrder === 'asc' ? 'Tăng' : 'Giảm'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-1.5">
            <button type="button" onClick={expandAll} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-200" title="Mở tất cả">
              <ChevronsUpDown className="h-3.5 w-3.5" /> Mở
            </button>
            <button type="button" onClick={collapseAll} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-200" title="Thu gọn">
              <ChevronsDownUp className="h-3.5 w-3.5" /> Gọn
            </button>
            <span className="text-xs text-gray-400">({treeItemsSource?.length ?? 0} chi tiết)</span>
            {!detailFilters.machineSystemId && allSystems[systemPageIndex] && (
              <span className="ml-auto text-xs font-medium text-blue-600">{allSystems[systemPageIndex].maHeThong} — {allSystems[systemPageIndex].tenHeThong}</span>
            )}
          </div>
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
              <tr>
                <th className="border-b border-gray-200 px-3 py-2.5 text-left sticky left-0 bg-gray-50 z-10 min-w-[160px]">Tên chi tiết</th>
                <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[80px]">Mã</th>
                <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[90px]">Loại</th>
                {!detailFilters.machineSystemId && <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[120px]">Hệ thống</th>}
                <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[80px]">Vị trí</th>
                <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[90px]">Phụ trách</th>
                <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[100px]">Trạng thái</th>
                <th className="border-b border-gray-200 px-3 py-2.5 text-right sticky right-0 bg-gray-50 z-10 min-w-[110px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {detailTreeQuery.isLoading ? (
                <tr><td colSpan={detailFilters.machineSystemId ? 7 : 8} className="px-3 py-8 text-center text-gray-400">Đang tải...</td></tr>
              ) : !treeData || treeData.length === 0 ? (
                <tr><td colSpan={detailFilters.machineSystemId ? 7 : 8} className="px-3 py-8 text-center text-gray-400">Chưa có chi tiết nào.</td></tr>
              ) : treeData.map((node) => (
                <tr key={node.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-2.5 sticky left-0 bg-white z-10">
                    <div className="flex items-center" style={{ paddingLeft: `${node.depth * 24}px` }}>
                      {node.children.length > 0 ? (
                        <button type="button" onClick={() => toggleExpand(node.id)} className="mr-1 rounded p-0.5 text-gray-400 hover:text-gray-700">
                          {expandedIds.has(node.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      ) : <span className="mr-1 inline-block w-5" />}
                      <span className="text-gray-900 font-medium">{node.tenChiTiet}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-blue-700 font-medium">{node.maChiTiet}</td>
                  <td className="px-3 py-2.5 text-gray-600 text-xs">{detailTypeLabel(node.loaiChiTiet)}</td>
                  {!detailFilters.machineSystemId && <td className="px-3 py-2.5 text-gray-600 text-xs">{getSystemName(node.machineSystem)}</td>}
                  <td className="px-3 py-2.5 text-gray-600 text-xs">{node.viTri || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600 text-xs">{node.nguoiPhuTrach || '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge(node.hoatDong)}`}>
                      {node.hoatDong ? node.trangThai : 'Dừng'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 sticky right-0 bg-white z-10">
                    <ResponsiveRowActions
                      actions={[
                        { key: 'view', label: 'Xem chi tiết', icon: <Eye className="h-4 w-4" />, onClick: () => openDetailModal('view', node), tone: 'primary' },
                        { key: 'edit', label: 'Sửa chi tiết', icon: <Edit className="h-4 w-4" />, onClick: () => openDetailModal('edit', node), tone: 'success' },
                        ...(node.hoatDong ? [{ key: 'deactivate', label: 'Dừng hoạt động', icon: <Power className="h-4 w-4" />, onClick: () => deactivate(node), tone: 'warning' } satisfies RowAction] : []),
                        { key: 'delete', label: 'Xóa chi tiết', icon: <Trash2 className="h-4 w-4" />, onClick: () => removeDetail(node), tone: 'danger' },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!detailFilters.machineSystemId && allSystems.length > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2 text-sm">
            <span className="text-gray-600">
              Hệ thống {systemPageIndex + 1}/{allSystems.length}: <span className="font-medium">{allSystems[systemPageIndex]?.tenHeThong}</span>
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={systemPageIndex <= 0}
                onClick={() => { setSystemPageIndex((i) => i - 1); setExpandedIds(new Set()); }}
                className="rounded-md border border-gray-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={systemPageIndex >= allSystems.length - 1}
                onClick={() => { setSystemPageIndex((i) => i + 1); setExpandedIds(new Set()); }}
                className="rounded-md border border-gray-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </section>

      <Modal isOpen={!!systemModal} onClose={() => setSystemModal(null)} showBackdrop>
        <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h3 className="text-base font-semibold text-gray-900">
              {systemModal?.mode === 'view' ? 'Chi tiết hệ thống' : systemModal?.record ? 'Sửa hệ thống' : 'Thêm hệ thống'}
            </h3>
            <button type="button" title="Đóng" onClick={() => setSystemModal(null)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={saveSystem} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div>}
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Mã hệ thống {systemModal?.mode === 'create' && <span className="text-xs text-gray-400">(tự动生成)</span>}</span>
                <input
                  required
                  disabled={systemModal?.mode === 'view' || systemModal?.mode === 'create'}
                  value={systemModal?.mode === 'create' && nextCodeQuery.isLoading ? 'Đang tải...' : systemForm.maHeThong}
                  onChange={(event) => setSystemForm((form) => ({ ...form, maHeThong: event.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50"
                />
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Tên hệ thống</span>
                <input required disabled={systemModal?.mode === 'view'} value={systemForm.tenHeThong} onChange={(event) => setSystemForm((form) => ({ ...form, tenHeThong: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Loại hệ thống <span className="text-red-500">*</span></span>
                <select required disabled={systemModal?.mode === 'view'} value={systemForm.loaiHeThong} onChange={(event) => setSystemForm((form) => ({ ...form, loaiHeThong: event.target.value as MachineSystemCategory }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50">
                  {MACHINE_SYSTEM_CATEGORIES.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Khu vực</span>
                <Combobox
                  value={systemForm.khuVuc ?? ''}
                  onChange={(val) => setSystemForm((form) => ({ ...form, khuVuc: val }))}
                  options={existingKhuVuc}
                  placeholder="Chọn hoặc nhập khu vực"
                  disabled={systemModal?.mode === 'view'}
                />
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Vị trí</span>
                <Combobox
                  value={systemForm.viTri ?? ''}
                  onChange={(val) => setSystemForm((form) => ({ ...form, viTri: val }))}
                  options={existingViTri}
                  placeholder="Chọn hoặc nhập vị trí"
                  disabled={systemModal?.mode === 'view'}
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="font-medium text-gray-700">Chức năng</span>
                <textarea disabled={systemModal?.mode === 'view'} rows={2} value={systemForm.chucNang ?? ''} onChange={(event) => setSystemForm((form) => ({ ...form, chucNang: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="font-medium text-gray-700">Nhiệm vụ</span>
                <textarea disabled={systemModal?.mode === 'view'} rows={2} value={systemForm.nhiemVu ?? ''} onChange={(event) => setSystemForm((form) => ({ ...form, nhiemVu: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="font-medium text-gray-700">Người thực hiện</span>
                {systemModal?.mode === 'view' ? (
                  <div className="flex gap-4">
                    <div className="space-y-1">
                      <span className="text-xs text-gray-500">Mã NV</span>
                      <div className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">{systemForm.maNguoiThucHien || '—'}</div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <span className="text-xs text-gray-500">Họ tên</span>
                      <div className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">{systemForm.nguoiThucHien || '—'}</div>
                    </div>
                  </div>
                ) : (
                  <div ref={employeeDropdownRef} className="relative">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          disabled={systemModal?.mode === 'view'}
                          value={systemForm.nguoiThucHien ?? ''}
                          onFocus={() => setIsEmployeeDropdownOpen(true)}
                          readOnly
                          placeholder="Chọn người thực hiện"
                          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm disabled:bg-gray-50"
                        />
                        {!systemForm.nguoiThucHien && (
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setIsEmployeeDropdownOpen(true)}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {systemForm.nguoiThucHien && (
                        <button
                          type="button"
                          onClick={handleEmployeeClear}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Xóa chọn"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {systemForm.maNguoiThucHien && (
                      <div className="mt-1 text-xs text-gray-500">Mã NV: {systemForm.maNguoiThucHien}</div>
                    )}
                    {isEmployeeDropdownOpen && (
                      <div className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                        <div className="sticky top-0 border-b border-gray-100 bg-white px-3 py-2">
                          <input
                            autoFocus
                            value={employeeSearch}
                            onChange={(e) => setEmployeeSearch(e.target.value)}
                            placeholder="Tìm mã NV, họ tên..."
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        {loadingEmployees ? (
                          <div className="px-3 py-2 text-sm text-gray-500">Đang tải danh sách...</div>
                        ) : filteredEmployees.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500">Không tìm thấy nhân viên phù hợp</div>
                        ) : (
                          filteredEmployees.map((employee) => (
                            <button
                              key={employee.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleEmployeeSelect(employee);
                              }}
                              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50"
                            >
                              <span className="font-medium text-gray-900">{employee.employeeCode} - {employee.name}</span>
                              {employee.department && <span className="ml-3 text-xs text-gray-500">{employee.department}</span>}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </label>
              <label className="flex items-center gap-2 pt-6">
                <input type="checkbox" disabled={systemModal?.mode === 'view'} checked={!!systemForm.hoatDong} onChange={(event) => setSystemForm((form) => ({ ...form, hoatDong: event.target.checked }))} />
                <span className="font-medium text-gray-700">Đang hoạt động</span>
              </label>
            </div>
            {systemModal?.mode === 'view' && systemModal?.record && (
              <div className="border-t border-gray-200 pt-3">
                <button
                  type="button"
                  onClick={() => { setSystemModal(null); setDrawerSystemId(systemModal.record!.id); }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50"
                >
                  <Eye className="h-4 w-4" /> Xem tổng quan hệ thống
                </button>
              </div>
            )}
            <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
              <button type="button" onClick={() => setSystemModal(null)} className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">{systemModal?.mode === 'view' ? 'Đóng' : 'Hủy'}</button>
              {systemModal?.mode !== 'view' && <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">Lưu</button>}
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} showBackdrop>
        <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h3 className="text-base font-semibold text-gray-900">
              {detailModal?.mode === 'view' ? 'Chi tiết máy' : detailModal?.record ? 'Sửa chi tiết máy' : 'Thêm chi tiết máy'}
            </h3>
            <button type="button" title="Đóng" onClick={() => setDetailModal(null)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={saveDetail} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div>}
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 md:col-span-2">
                <span className="font-medium text-gray-700">Hệ thống</span>
                <select required disabled={detailModal?.mode === 'view'} value={detailForm.machineSystemId} onChange={(event) => setDetailForm((form) => ({ ...form, machineSystemId: event.target.value, parentDetailId: '' }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50">
                  <option value="">Chọn hệ thống</option>
                  {allSystems.map((system) => <option key={system.id} value={system.id}>{getSystemName(system)}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Loại chi tiết</span>
                <select required disabled={detailModal?.mode === 'view'} value={detailForm.loaiChiTiet} onChange={(event) => setDetailForm((form) => ({ ...form, loaiChiTiet: event.target.value as MachineSystemDetailType }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50">
                  {DETAIL_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Cấp cha</span>
                <select disabled={detailModal?.mode === 'view' || !detailForm.machineSystemId} value={detailForm.parentDetailId ?? ''} onChange={(event) => setDetailForm((form) => ({ ...form, parentDetailId: event.target.value || null }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50">
                  <option value="">Không có</option>
                  {parentDetailOptions.map((detail) => <option key={detail.id} value={detail.id}>{getDetailPath(detail)}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Mã chi tiết {detailModal?.mode === 'create' && <span className="text-xs text-gray-400">(tự sinh)</span>}</span>
                <input required disabled={detailModal?.mode === 'view' || detailModal?.mode === 'create'} value={detailModal?.mode === 'create' && nextDetailCodeQuery.isLoading ? 'Đang tải...' : detailForm.maChiTiet} onChange={(event) => setDetailForm((form) => ({ ...form, maChiTiet: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Tên chi tiết</span>
                <input required disabled={detailModal?.mode === 'view'} value={detailForm.tenChiTiet} onChange={(event) => setDetailForm((form) => ({ ...form, tenChiTiet: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Vị trí</span>
                <input disabled={detailModal?.mode === 'view'} value={detailForm.viTri ?? ''} onChange={(event) => setDetailForm((form) => ({ ...form, viTri: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Thứ tự</span>
                <input type="number" disabled={detailModal?.mode === 'view'} value={detailForm.thuTu ?? 0} onChange={(event) => setDetailForm((form) => ({ ...form, thuTu: Number(event.target.value) }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Người phụ trách</span>
                <input disabled={detailModal?.mode === 'view'} value={detailForm.nguoiPhuTrach ?? ''} onChange={(event) => setDetailForm((form) => ({ ...form, nguoiPhuTrach: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Trạng thái</span>
                <input disabled={detailModal?.mode === 'view'} value={detailForm.trangThai ?? ''} onChange={(event) => setDetailForm((form) => ({ ...form, trangThai: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              <label className="flex items-center gap-2 pt-6">
                <input type="checkbox" disabled={detailModal?.mode === 'view'} checked={!!detailForm.hoatDong} onChange={(event) => setDetailForm((form) => ({ ...form, hoatDong: event.target.checked }))} />
                <span className="font-medium text-gray-700">Đang hoạt động</span>
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="font-medium text-gray-700">Mô tả</span>
                <textarea disabled={detailModal?.mode === 'view'} rows={2} value={detailForm.moTa ?? ''} onChange={(event) => setDetailForm((form) => ({ ...form, moTa: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
              <button type="button" onClick={() => setDetailModal(null)} className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">{detailModal?.mode === 'view' ? 'Đóng' : 'Hủy'}</button>
              {detailModal?.mode !== 'view' && <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">Lưu</button>}
            </div>
          </form>
        </div>
      </Modal>

      <MachineSummaryDrawer machineSystemId={drawerSystemId} onClose={() => setDrawerSystemId(null)} />

      <MachineStatusUpdateDialog
        machineSystemId={statusUpdateSystemId}
        machineName={systems.find((s) => s.id === statusUpdateSystemId)?.tenHeThong}
        onClose={() => setStatusUpdateSystemId(null)}
        onSuccess={() => setStatusUpdateSystemId(null)}
      />

      {cloneDialog && (
        <Modal isOpen onClose={() => { setCloneDialog(null); setCloneError(''); }} showBackdrop>
          <div
            className="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="text-base font-semibold text-gray-900">Nhân bản hệ thống máy</h3>
              <button type="button" onClick={() => { setCloneDialog(null); setCloneError(''); }} className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
              <p className="text-xs text-gray-500">
                Nhân bản từ: <span className="font-medium text-gray-700">{cloneDialog.system.maHeThong} — {cloneDialog.system.tenHeThong}</span>
              </p>
              {cloneError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">{cloneError}</div>
              )}
              <label className="block space-y-1">
                <span className="font-medium text-gray-700">Mã hệ thống mới <span className="text-red-500">*</span></span>
                <input
                  type="text"
                  value={cloneDialog.maHeThong}
                  onChange={(e) => setCloneDialog((d) => d ? { ...d, maHeThong: e.target.value } : null)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mã hệ thống mới"
                />
              </label>
              <label className="block space-y-1">
                <span className="font-medium text-gray-700">Tên hệ thống mới <span className="text-red-500">*</span></span>
                <input
                  type="text"
                  value={cloneDialog.tenHeThong}
                  onChange={(e) => setCloneDialog((d) => d ? { ...d, tenHeThong: e.target.value } : null)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tên hệ thống mới"
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setCloneDialog(null); setCloneError(''); }}
                  className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={cloneSystem.isPending}
                  onClick={async () => {
                    setCloneError('');
                    const { system, maHeThong, tenHeThong } = cloneDialog;
                    if (!maHeThong.trim() || !tenHeThong.trim()) {
                      setCloneError('Vui lòng nhập đầy đủ mã và tên hệ thống mới');
                      return;
                    }
                    try {
                      await cloneSystem.mutateAsync({ id: system.id, data: { maHeThong: maHeThong.trim(), tenHeThong: tenHeThong.trim() } });
                      setCloneDialog(null);
                    } catch (err) {
                      setCloneError(err instanceof Error ? err.message : 'Không nhân bản được hệ thống');
                    }
                  }}
                  className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {cloneSystem.isPending ? 'Đang nhân bản...' : 'Nhân bản'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MachineSystemList;
