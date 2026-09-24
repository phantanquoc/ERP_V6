import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import maintenanceRecordService from '../services/maintenanceRecordService';
import toast from 'react-hot-toast';
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMaintenanceRecords, useDeleteMaintenanceRecord } from '../hooks/useMaintenanceRecords';
import { useMachineSystems } from '../hooks/useMachineSystemDetails';
import MaintenanceRecordForm from './MaintenanceRecordForm';
import { MaintenanceRecord } from '../services/maintenanceRecordService';

type ModalMode = 'create' | 'edit' | 'view' | null;

interface MaintenanceRecordListProps {
  lockedMachineSystemId?: string;
}

const MaintenanceRecordList = ({ lockedMachineSystemId }: MaintenanceRecordListProps = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const syncingRef = useRef(false);
  const initPage = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const initSearch = searchParams.get('q') ?? '';
  const initLoai = searchParams.get('loai') ?? '';
  const initSystem = lockedMachineSystemId ?? (searchParams.get('machineSystemId') ?? '');
  const initRecordId = searchParams.get('recordId');
  void initRecordId;
  const [page, setPage] = useState(initPage);
  const [loaiFilter, setLoaiFilter] = useState(initLoai);
  const [systemFilter, setSystemFilter] = useState(initSystem);
  const [search, setSearch] = useState(initSearch);
  const [appliedSearch, setAppliedSearch] = useState(initSearch);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);

  useEffect(() => {
    if (lockedMachineSystemId) {
      setSystemFilter(lockedMachineSystemId);
      setPage(1);
    }
  }, [lockedMachineSystemId]);

  const updateParams = useCallback((patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    syncingRef.current = true;
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (search === appliedSearch) return;
    const t = setTimeout(() => {
      setAppliedSearch(search);
      setPage(1);
      updateParams({ q: search || null, page: null });
    }, 400);
    return () => clearTimeout(t);
  }, [search, appliedSearch, updateParams]);

  useEffect(() => {
    if (syncingRef.current) { syncingRef.current = false; return; }
    const p = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
    const q = searchParams.get('q') ?? '';
    const loai = searchParams.get('loai') ?? '';
    const msId = searchParams.get('machineSystemId') ?? '';
    if (p !== page) setPage(p);
    if (q !== appliedSearch) { setAppliedSearch(q); setSearch(q); }
    if (loai !== loaiFilter) setLoaiFilter(loai);
    if (!lockedMachineSystemId && msId !== systemFilter) setSystemFilter(msId);
  }, [searchParams]);

  const filters = useMemo(() => ({
    page,
    limit: 10,
    ...(loaiFilter && { loai: loaiFilter }),
    ...(systemFilter && { machineSystemId: systemFilter }),
    ...(appliedSearch && { search: appliedSearch }),
  }), [page, loaiFilter, systemFilter, appliedSearch]);

  const { data: recordsResponse, isLoading } = useMaintenanceRecords(filters);
  const { data: systemsResponse } = useMachineSystems({ page: 1, limit: 200, hoatDong: true });
  const deleteRecord = useDeleteMaintenanceRecord();

  const records = recordsResponse?.data ?? [];
  const pagination = recordsResponse?.pagination;
  const systems = systemsResponse?.data ?? [];

  useEffect(() => {
    const recordId = searchParams.get('recordId');
    if (!recordId) return;
    if (selectedRecord?.id === recordId) return;
    const found = records.find((r: MaintenanceRecord) => r.id === recordId);
    if (found) { setSelectedRecord(found); setModalMode('view'); return; }
    let cancelled = false;
    maintenanceRecordService.getById(recordId).then((res: any) => {
      if (cancelled) return;
      const rec = res?.data ?? res;
      if (rec?.id) { setSelectedRecord(rec as MaintenanceRecord); setModalMode('view'); }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [searchParams.get('recordId'), records]);

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc muốn xóa biên bản này?')) {
      deleteRecord.mutate(id, {
        onSuccess: () => toast.success('Đã xóa biên bản'),
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Xóa biên bản thất bại'),
      });
    }
  };


  const openView = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setModalMode('view');
    updateParams({ recordId: record.id });
  };
  const closeRecordModal = () => {
    setModalMode(null);
    setSelectedRecord(null);
    if (searchParams.get('recordId')) updateParams({ recordId: null });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setAppliedSearch(search), setPage(1), updateParams({ q: search || null, page: null }))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg w-48"
          />
          <select
            value={loaiFilter}
            onChange={(e) => { const v = e.target.value; setLoaiFilter(v); setPage(1); updateParams({ loai: v || null, page: null }); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
          >
            <option value="">Tất cả loại</option>
            <option value="Bảo dưỡng">Bảo dưỡng</option>
            <option value="Sửa chữa">Sửa chữa</option>
          </select>
          {!lockedMachineSystemId && (
            <select
              value={systemFilter}
              onChange={(e) => { const v = e.target.value; setSystemFilter(v); setPage(1); updateParams({ machineSystemId: v || null, page: null }); }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
            >
              <option value="">Tất cả hệ thống</option>
              {systems.map((s: any) => (
                <option key={s.id} value={s.id}>{s.tenHeThong}</option>
              ))}
            </select>
          )}
        </div>
        <button
          onClick={() => { setSelectedRecord(null); setModalMode('create'); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Tạo biên bản
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-3 py-2.5 text-left font-medium text-gray-600">Mã BB</th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-600">Loại</th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-600">Hệ thống</th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-600">Thiết bị</th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-600">Nội dung</th>
              <th className="px-3 py-2.5 text-center font-medium text-gray-600">Ngày</th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-600">Người TH</th>
              <th className="px-3 py-2.5 text-center font-medium text-gray-600">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-500">Đang tải...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-500">Chưa có biên bản nào</td></tr>
            ) : (
              records.map((r: MaintenanceRecord) => (
                <tr key={r.id} onClick={() => openView(r)} className={`border-b border-gray-100 border-l-2 cursor-pointer transition-all ${searchParams.get("recordId") === r.id ? "bg-blue-50 border-l-blue-600" : "border-l-transparent hover:bg-blue-100 hover:border-l-blue-500"}`} >
                  <td className="px-3 py-2 text-gray-900 font-medium">
                    {r.maBienBan}
                    {r.sourceLogId && (
                      <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-600 rounded">Tự sinh</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      r.loai === 'Bảo dưỡng' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {r.loai}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-700">{r.machineSystem?.tenHeThong ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-700">{r.machineSystemDetail?.tenChiTiet ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate">{r.noiDung}</td>
                  <td className="px-3 py-2 text-center text-gray-600">{new Date(r.ngayThucHien).toLocaleDateString('vi-VN')}</td>
                  <td className="px-3 py-2 text-gray-700">
                    <div>
                      {r.nguoiThucHien}
                      {(r.nguoiPhu?.length ?? 0) > 0 && (
                        <span className="ml-1 text-xs text-gray-400" title={r.nguoiPhu.join(', ')}>
                          +{r.nguoiPhu.length} người phụ
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="p-1 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => { const np = Math.max(1, page - 1); setPage(np); updateParams({ page: String(np) }); }} disabled={page === 1} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">Trang {page} / {pagination.totalPages}</span>
          <button onClick={() => { const np = Math.min(pagination.totalPages, page + 1); setPage(np); updateParams({ page: String(np) }); }} disabled={page === pagination.totalPages} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal */}
      {modalMode && (
        <MaintenanceRecordForm
          mode={modalMode === 'create' ? 'create' : modalMode === 'edit' ? 'edit' : 'view'}
          record={selectedRecord}
          systems={systems}
          onClose={closeRecordModal}
          lockedMachineSystemId={lockedMachineSystemId}
          onEdit={() => setModalMode('edit')}
        />
      )}
    </div>
  );
};

export default MaintenanceRecordList;
