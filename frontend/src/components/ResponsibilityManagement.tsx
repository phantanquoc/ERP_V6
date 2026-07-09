import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Edit, Eye, Trash2, AlertCircle, CheckCircle, X, Users,
  Copy, Wand2, Search, ChevronLeft, AlertTriangle, FileDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import positionService, { Position, POSITION_CATEGORY_LABEL, PositionCategory } from '@services/positionService';
import positionResponsibilityService, { PositionResponsibility } from '@services/positionResponsibilityService';
import { parseNumberInput } from '../utils/numberInput';
import Modal from './Modal';
import apiClient from '@services/apiClient';

interface FormData {
  title: string;
  description: string;
  weight: number;
}

type UsageFilter = 'all' | 'in_use' | 'needs_setup';

const WEIGHT_EPSILON = 0.001;

function weightStatus(sum: number): 'ok' | 'over' | 'under' | 'empty' {
  if (sum === 0) return 'empty';
  if (Math.abs(sum - 100) < WEIGHT_EPSILON) return 'ok';
  return sum > 100 ? 'over' : 'under';
}

function statusColor(s: ReturnType<typeof weightStatus>): string {
  switch (s) {
    case 'ok': return 'bg-green-100 text-green-800 border-green-300';
    case 'over': return 'bg-red-100 text-red-800 border-red-300';
    case 'under': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'empty': return 'bg-gray-100 text-gray-600 border-gray-300';
  }
}

function statusLabel(s: ReturnType<typeof weightStatus>, sum: number): string {
  switch (s) {
    case 'ok': return `✓ ${sum.toFixed(0)}%`;
    case 'over': return `✗ ${sum.toFixed(0)}%`;
    case 'under': return `⚠ ${sum.toFixed(0)}%`;
    case 'empty': return 'Chưa có tiêu chí';
  }
}

const ResponsibilityManagement = ({ initialPositionId }: { initialPositionId?: string }) => {
  const navigate = useNavigate();
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  // Cache of responsibilities per position for sidebar weight-sum display
  const [respMap, setRespMap] = useState<Record<string, PositionResponsibility[]>>({});
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [loadingResp, setLoadingResp] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sidebarQuery, setSidebarQuery] = useState('');
  const [usageFilter, setUsageFilter] = useState<UsageFilter>('all');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedResponsibility, setSelectedResponsibility] = useState<PositionResponsibility | null>(null);
  const [formData, setFormData] = useState<FormData>({ title: '', description: '', weight: 0 });
  const [copySourceId, setCopySourceId] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const responsibilities = selectedPosition ? respMap[selectedPosition.id] ?? [] : [];

  useEffect(() => {
    loadPositions();
  }, []);

  useEffect(() => {
    if (selectedPosition) void loadResponsibilities(selectedPosition.id, true);
  }, [selectedPosition]);

  // Preload weight sums for all positions on first load for the sidebar badges.
  useEffect(() => {
    if (positions.length === 0) return;
    let cancelled = false;
    void (async () => {
      const missing = positions.filter(p => respMap[p.id] === undefined && (p._count?.responsibilities ?? 1) > 0);
      for (const pos of missing) {
        if (cancelled) return;
        try {
          const data = await positionResponsibilityService.getAllResponsibilities(pos.id);
          if (!cancelled) setRespMap(m => ({ ...m, [pos.id]: data ?? [] }));
        } catch {
          if (!cancelled) setRespMap(m => ({ ...m, [pos.id]: [] }));
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions]);

  const loadPositions = async () => {
    try {
      setLoadingPositions(true);
      const list = await positionService.getAllPositions();
      setPositions(list || []);
      if (list && list.length > 0 && !selectedPosition) {
        // If initialPositionId is provided and found, select it; otherwise default to first
        const initial = initialPositionId ? list.find((p: Position) => p.id === initialPositionId) : null;
        setSelectedPosition(initial || list[0]);
      }
      setError('');
    } catch {
      setError('Lỗi tải danh sách vị trí');
    } finally {
      setLoadingPositions(false);
    }
  };

  const loadResponsibilities = async (positionId: string, showSpinner: boolean) => {
    try {
      if (showSpinner) setLoadingResp(true);
      const data = await positionResponsibilityService.getAllResponsibilities(positionId);
      setRespMap(m => ({ ...m, [positionId]: data ?? [] }));
      setError('');
    } catch {
      setError('Lỗi tải danh sách trách nhiệm');
    } finally {
      if (showSpinner) setLoadingResp(false);
    }
  };

  const employeeCountOf = (pos: Position): number => pos.employees?.length ?? 0;
  const sumOf = (posId: string): number =>
    (respMap[posId] ?? []).reduce((acc, r) => acc + (r.weight || 0), 0);

  const handleExport = async () => {
    try {
      setExportLoading(true);
      const params = selectedPosition ? `?positionId=${selectedPosition.id}` : '';
      const filename = selectedPosition
        ? `tieu-chi-${selectedPosition.code}-${new Date().toISOString().slice(0, 10)}.xlsx`
        : `tieu-chi-${new Date().toISOString().slice(0, 10)}.xlsx`;
      await apiClient.download(`/position-responsibilities/export.xlsx${params}`, filename);
    } catch {
      setError('Không thể xuất Excel. Vui lòng thử lại.');
    } finally {
      setExportLoading(false);
    }
  };

  const currentSum = selectedPosition ? sumOf(selectedPosition.id) : 0;
  const currentStatus = weightStatus(currentSum);
  const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const sidebarPositionsRef = React.useRef<Position[]>([]);
  const selectedPositionRef = React.useRef<Position | null>(null);
  const openCreateModalRef = React.useRef<() => void>(() => {});

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const positions = sidebarPositionsRef.current;
      const current = selectedPositionRef.current;

      if (e.key === 'j' || e.key === 'J') {
        if (positions.length === 0) return;
        const idx = current ? positions.findIndex(p => p.id === current.id) : -1;
        const next = positions[Math.min(idx + 1, positions.length - 1)];
        if (next && next.id !== current?.id) setSelectedPosition(next);
      }
      if (e.key === 'k' || e.key === 'K') {
        if (positions.length === 0) return;
        const idx = current ? positions.findIndex(p => p.id === current.id) : 0;
        const prev = positions[Math.max(idx - 1, 0)];
        if (prev && prev.id !== current?.id) setSelectedPosition(prev);
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openCreateModalRef.current();
      }
      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Tìm"]');
        searchInput?.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []); // stable - uses refs

  // Prepare weight preview after submitting the form
  const previewSum = useMemo(() => {
    if (!selectedPosition) return { sum: currentSum, delta: 0 };
    const base = respMap[selectedPosition.id] ?? [];
    let sum = base.reduce((acc, r) => acc + (r.weight || 0), 0);
    if (isEditMode && selectedResponsibility) {
      sum = sum - (selectedResponsibility.weight || 0) + (formData.weight || 0);
    } else {
      sum = sum + (formData.weight || 0);
    }
    return { sum, delta: sum - currentSum };
  }, [formData.weight, isEditMode, selectedResponsibility, selectedPosition, respMap, currentSum]);
  const previewStatus = weightStatus(previewSum.sum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedPosition) { setError('Vui lòng chọn vị trí'); return; }
    try {
      if (isEditMode && selectedResponsibility) {
        await positionResponsibilityService.updateResponsibility(selectedResponsibility.id, formData);
        flash('Cập nhật trách nhiệm thành công');
      } else {
        await positionResponsibilityService.createResponsibility(selectedPosition.id, formData);
        flash('Tạo trách nhiệm thành công');
      }
      setIsFormModalOpen(false);
      void loadResponsibilities(selectedPosition.id, true);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu trách nhiệm');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const usage = await positionResponsibilityService.getResponsibilityUsage(id);
      if (usage.evaluationDetailCount > 0) {
        if (!window.confirm(`Tiêu chí này đang được dùng trong ${usage.evaluationDetailCount} đánh giá.\nBạn có chắc chắn muốn xoá không?`)) return;
      } else {
        if (!window.confirm('Xoá tiêu chí này?')) return;
      }
      await positionResponsibilityService.deleteResponsibility(id);
      // After deleting, update local state by removing from respMap
      if (selectedPosition) {
        setRespMap(m => ({ ...m, [selectedPosition.id]: (m[selectedPosition.id] ?? []).filter(r => r.id !== id) }));
      }
      flash('Xoá tiêu chí thành công');
    } catch (err: any) {
      setError(err.message || 'Lỗi xoá tiêu chí');
    }
  };

  const handleNormalize = async () => {
    if (!selectedPosition || responsibilities.length === 0) return;
    if (Math.abs(currentSum - 100) < WEIGHT_EPSILON) return;
    if (!window.confirm(
      `Chuẩn hóa trọng số về 100%?\n\nHiện tại: ${currentSum.toFixed(1)}% → sau: 100%.\nMỗi tiêu chí sẽ được nhân theo tỷ lệ.`
    )) return;
    try {
      setLoadingResp(true);
      const updated = await positionResponsibilityService.rescaleResponsibilityWeights(selectedPosition.id);
      setRespMap(m => ({ ...m, [selectedPosition.id]: updated ?? [] }));
      flash('Đã chuẩn hóa tổng trọng số về 100%');
    } catch (err: any) {
      setError(err.message || 'Lỗi khi chuẩn hóa');
    } finally {
      setLoadingResp(false);
    }
  };

  const handleCopyFrom = async () => {
    if (!selectedPosition || !copySourceId) return;
    try {
      setLoadingResp(true);
      await positionResponsibilityService.copyResponsibilitiesFrom(selectedPosition.id, copySourceId);
      flash('Sao chép trách nhiệm thành công');
      setIsCopyModalOpen(false);
      setCopySourceId('');
      await loadResponsibilities(selectedPosition.id, false);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi sao chép');
    } finally {
      setLoadingResp(false);
    }
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedResponsibility(null);
    setFormData({ title: '', description: '', weight: 0 });
    setIsFormModalOpen(true);
  };
  openCreateModalRef.current = openCreateModal;

  const openEditModal = (resp: PositionResponsibility) => {
    setIsEditMode(true);
    setSelectedResponsibility(resp);
    setFormData({ title: resp.title, description: resp.description, weight: resp.weight });
    setIsFormModalOpen(true);
  };

  const openDetailModal = (resp: PositionResponsibility) => {
    setSelectedResponsibility(resp);
    setIsDetailModalOpen(true);
  };

  const closeModals = () => {
    setIsFormModalOpen(false);
    setIsDetailModalOpen(false);
    setIsCopyModalOpen(false);
    setSelectedResponsibility(null);
  };

  // Sidebar list: usage-filtered + query-filtered, sorted by usage priority.
  const sidebarPositions = useMemo(() => {
    const q = sidebarQuery.trim().toLowerCase();
    return positions
      .filter(pos => {
        if (q && !pos.code.toLowerCase().includes(q) && !pos.name.toLowerCase().includes(q)) return false;
        const count = employeeCountOf(pos);
        const sum = sumOf(pos.id);
        const needsSetup = count > 0 && Math.abs(sum - 100) >= WEIGHT_EPSILON;
        if (usageFilter === 'in_use' && count === 0) return false;
        if (usageFilter === 'needs_setup' && !needsSetup) return false;
        return true;
      })
      .sort((a, b) => {
        // Rank: needs-setup first, then in-use (more NV first), then alpha
        const countA = employeeCountOf(a);
        const countB = employeeCountOf(b);
        const sumA = sumOf(a.id);
        const sumB = sumOf(b.id);
        const needsA = countA > 0 && Math.abs(sumA - 100) >= WEIGHT_EPSILON;
        const needsB = countB > 0 && Math.abs(sumB - 100) >= WEIGHT_EPSILON;
        if (needsA !== needsB) return needsA ? -1 : 1;
        if (countA !== countB) return countB - countA;
        return a.name.localeCompare(b.name, 'vi');
      });
  }, [positions, respMap, sidebarQuery, usageFilter]);

  sidebarPositionsRef.current = sidebarPositions;
  selectedPositionRef.current = selectedPosition;

  const usageStats = useMemo(() => {
    let inUse = 0, needsSetup = 0;
    for (const pos of positions) {
      const count = employeeCountOf(pos);
      const sum = sumOf(pos.id);
      if (count > 0) inUse++;
      if (count > 0 && Math.abs(sum - 100) >= WEIGHT_EPSILON) needsSetup++;
    }
    return { total: positions.length, inUse, needsSetup };
  }, [positions, respMap]);

  return (
    <div className="flex gap-4 h-[calc(100vh-12rem)]">
      {/* Sidebar */}
      {!sidebarCollapsed && (
        <aside className="w-80 shrink-0 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
          <div className="p-3 border-b border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Danh sách vị trí</h3>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Ẩn thanh bên"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={sidebarQuery}
                onChange={(e) => setSidebarQuery(e.target.value)}
                placeholder="Tìm vị trí..."
                className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {([
                { key: 'needs_setup', label: '⚠ Cần setup', count: usageStats.needsSetup },
                { key: 'in_use', label: 'Đang dùng', count: usageStats.inUse },
                { key: 'all', label: 'Tất cả', count: usageStats.total },
              ] as const).map(chip => (
                <button
                  key={chip.key}
                  onClick={() => setUsageFilter(chip.key)}
                  className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                    usageFilter === chip.key
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {chip.label} <span className={usageFilter === chip.key ? 'text-blue-100' : 'text-gray-500'}>({chip.count})</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingPositions ? (
              <div className="p-6 text-center text-gray-500 text-sm">Đang tải...</div>
            ) : sidebarPositions.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">Không có vị trí</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {sidebarPositions.map(pos => {
                  const count = employeeCountOf(pos);
                  const sum = sumOf(pos.id);
                  const st = weightStatus(sum);
                  const isSelected = selectedPosition?.id === pos.id;
                  return (
                    <li key={pos.id}>
                      <button
                        onClick={() => {
                          setSelectedPosition(pos);
                          // Clear positionId from URL when user manually selects a position
                          if (initialPositionId && pos.id !== initialPositionId) {
                            navigate('?tab=responsibilities', { replace: true });
                          }
                        }}
                        className={`w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-blue-600">{pos.code}</span>
                          {count > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs">
                              <Users className="w-3 h-3" />{count}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-900 mt-0.5 line-clamp-1" title={pos.name}>{pos.name}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`inline-block px-1.5 py-0.5 text-xs font-medium rounded border ${statusColor(st)}`} title={`Tổng trọng số: ${sum.toFixed(1)}%`}>
                            {statusLabel(st, sum)}
                          </span>
                          {pos.category && (
                            <span className="text-xs text-gray-500">
                              {POSITION_CATEGORY_LABEL[pos.category as PositionCategory]}
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="self-start text-sm text-blue-600 hover:text-blue-800"
          >
            Hiện thanh bên
          </button>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <span className="text-red-700 text-sm">{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-700 text-sm">{success}</span>
          </div>
        )}

        {selectedPosition ? (
          <>
            {/* Position header + weight bar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  {initialPositionId && (
                    <button
                      onClick={() => navigate('?tab=positions')}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mb-2"
                    >
                      <ChevronLeft className="w-3 h-3" /> Trở lại vị trí
                    </button>
                  )}
                  <h2 className="text-lg font-bold text-gray-800">{selectedPosition.code} — {selectedPosition.name}</h2>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                    <span>{employeeCountOf(selectedPosition)} nhân viên</span>
                    <span className="text-gray-400">•</span>
                    {selectedPosition.category ? (
                      <span>{POSITION_CATEGORY_LABEL[selectedPosition.category as PositionCategory]}</span>
                    ) : (
                      <span className="text-amber-700">Chưa chọn danh mục</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExport}
                    disabled={exportLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    <FileDown className="w-4 h-4" />
                    {exportLoading ? 'Đang xuất...' : 'Xuất Excel'}
                  </button>
                  <button
                    onClick={() => setIsCopyModalOpen(true)}
                    disabled={responsibilities.length > 0}
                    title={responsibilities.length > 0 ? 'Vị trí đã có tiêu chí. Xoá hết trước khi sao chép.' : 'Sao chép tiêu chí từ vị trí khác'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Copy className="w-4 h-4" />
                    Sao chép từ vị trí khác
                  </button>
                  <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" /> Thêm tiêu chí
                  </button>
                </div>
              </div>

              {/* Weight bar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Tổng trọng số:</span>
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${statusColor(currentStatus)}`}>
                      {statusLabel(currentStatus, currentSum)}
                    </span>
                    <span className="text-xs text-gray-500">/ 100%</span>
                  </div>
                  {currentStatus !== 'ok' && currentStatus !== 'empty' && (
                    <button
                      onClick={handleNormalize}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-purple-700 border border-purple-300 rounded hover:bg-purple-50"
                      title="Nhân tỷ lệ để tổng bằng 100%"
                    >
                      <Wand2 className="w-3 h-3" /> Chuẩn hóa 100%
                    </button>
                  )}
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 transition-all ${
                      currentStatus === 'ok' ? 'bg-green-500'
                      : currentStatus === 'over' ? 'bg-red-500'
                      : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(currentSum, 100)}%` }}
                  />
                </div>
                {currentStatus === 'over' && (
                  <p className="mt-1.5 text-xs text-red-700 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Tổng vượt 100%. Backend sẽ chặn lưu. Giảm bớt trọng số hoặc xoá tiêu chí.
                  </p>
                )}
                {currentStatus === 'under' && (
                  <p className="mt-1.5 text-xs text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Chưa đủ 100%. Thêm tiêu chí hoặc bấm "Chuẩn hóa 100%" để nhân tỷ lệ.
                  </p>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col min-h-0">
              {loadingResp ? (
                <div className="p-8 text-center text-gray-500">Đang tải...</div>
              ) : responsibilities.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>Chưa có tiêu chí nào. Bấm "Thêm tiêu chí" hoặc "Sao chép từ vị trí khác".</p>
                </div>
              ) : (
                <div className="overflow-y-auto flex-1">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tiêu chí</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mô tả</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-r border-gray-200 w-28">Trọng số</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 w-32">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {responsibilities.map((resp, idx) => (
                        <tr key={resp.id} className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-4 py-3 text-sm font-semibold text-blue-700 border-r border-gray-200">{resp.title}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                            <div className="line-clamp-2" title={resp.description}>{resp.description}</div>
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-medium border-r border-gray-200">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                              {resp.weight}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => openDetailModal(resp)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors" title="Xem chi tiết">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button onClick={() => openEditModal(resp)} className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors" title="Chỉnh sửa">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(resp.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors" title="Xoá">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <p>Chọn một vị trí ở thanh bên để bắt đầu.</p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <Modal isOpen={isFormModalOpen} onClose={closeModals} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 overflow-y-auto flex-1">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                {isEditMode ? 'Chỉnh sửa tiêu chí' : 'Thêm tiêu chí mới'}
              </h3>
              <button onClick={closeModals} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên tiêu chí *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trọng số (%) *</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseNumberInput(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {/* Live preview */}
                <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-md text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Sau khi lưu tổng sẽ là:</span>
                    <span className={`inline-block px-2 py-0.5 rounded border font-medium ${statusColor(previewStatus)}`}>
                      {previewSum.sum.toFixed(1)}%
                    </span>
                  </div>
                  {previewStatus === 'over' && (
                    <p className="mt-1 text-red-700">⚠ Backend sẽ chặn (yêu cầu tổng = 100%). Giảm trọng số này {previewSum.sum > 100 ? `xuống ${(formData.weight - (previewSum.sum - 100)).toFixed(1)}` : ''} hoặc sửa tiêu chí khác trước.</p>
                  )}
                  {previewStatus === 'under' && (
                    <p className="mt-1 text-amber-700">⚠ Backend sẽ chặn khi lưu (thiếu {(100 - previewSum.sum).toFixed(1)}%). Cần thêm tiêu chí hoặc tăng trọng số các tiêu chí khác.</p>
                  )}
                  {previewStatus === 'ok' && (
                    <p className="mt-1 text-green-700">✓ Vừa đủ 100% — sẽ lưu thành công.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModals} className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                  Hủy
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  {isEditMode ? 'Cập nhật' : 'Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={isDetailModalOpen && !!selectedResponsibility} onClose={closeModals} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 overflow-y-auto flex-1">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Chi tiết tiêu chí</h3>
              <button onClick={closeModals} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            {selectedResponsibility && (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tên tiêu chí</label>
                    <p className="text-gray-900">{selectedResponsibility.title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Mô tả</label>
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedResponsibility.description}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Trọng số</label>
                    <p className="text-gray-900">{selectedResponsibility.weight}%</p>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={closeModals} className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Đóng</button>
                  <button
                    onClick={() => { openEditModal(selectedResponsibility); setIsDetailModalOpen(false); }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Chỉnh sửa
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </Modal>

      {/* Copy-from Modal */}
      <Modal isOpen={isCopyModalOpen} onClose={closeModals} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 overflow-y-auto flex-1">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Sao chép tiêu chí từ vị trí khác</h3>
              <button onClick={closeModals} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Chọn vị trí <strong>nguồn</strong> để sao chép toàn bộ tiêu chí sang vị trí đang chọn ({selectedPosition?.code}).
              Chỉ những vị trí có tổng trọng số = 100% (✓) mới được liệt kê.
            </p>
            <select
              value={copySourceId}
              onChange={(e) => setCopySourceId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            >
              <option value="">-- Chọn vị trí nguồn --</option>
              {positions
                .filter(p => p.id !== selectedPosition?.id && Math.abs(sumOf(p.id) - 100) < WEIGHT_EPSILON)
                .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name} ({(respMap[p.id] ?? []).length} tiêu chí)
                  </option>
                ))}
            </select>
            <div className="flex gap-3">
              <button onClick={closeModals} className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Hủy</button>
              <button
                onClick={handleCopyFrom}
                disabled={!copySourceId}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sao chép
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ResponsibilityManagement;