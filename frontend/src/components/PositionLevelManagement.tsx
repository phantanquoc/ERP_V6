import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Trash2, AlertCircle, CheckCircle, X, Users, Copy,
  Search, ChevronLeft, DollarSign, TrendingUp, AlertTriangle, FileDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import positionLevelService, { PositionLevel } from '@services/positionLevelService';
import { usePositions, usePositionLevelsByPosition, positionKeys } from '../hooks';
import { useQueryClient } from '@tanstack/react-query';
import { Position, POSITION_CATEGORY_LABEL, PositionCategory } from '@services/positionService';
import { parseNumberInput } from '../utils/numberInput';
import Modal from './Modal';
import apiClient from '@services/apiClient';

interface FormData {
  level: string;
  baseSalary: number | '';
  kpiSalary: number | '';
}

type UsageFilter = 'all' | 'in_use' | 'needs_setup';

const LEVEL_PRESETS: Array<{ label: string; levels: Array<{ level: string; baseSalary: number; kpiSalary: number }> }> = [
  {
    label: 'Sản xuất 3 bậc',
    levels: [
      { level: 'Học việc', baseSalary: 4500000, kpiSalary: 500000 },
      { level: 'Chính thức', baseSalary: 6000000, kpiSalary: 1000000 },
      { level: 'Lành nghề', baseSalary: 8000000, kpiSalary: 1500000 },
    ],
  },
  {
    label: 'Văn phòng 4 bậc',
    levels: [
      { level: 'Junior', baseSalary: 8000000, kpiSalary: 1000000 },
      { level: 'Middle', baseSalary: 12000000, kpiSalary: 2000000 },
      { level: 'Senior', baseSalary: 18000000, kpiSalary: 3000000 },
      { level: 'Lead', baseSalary: 25000000, kpiSalary: 5000000 },
    ],
  },
  {
    label: 'Quản lý 3 bậc',
    levels: [
      { level: 'Team Lead', baseSalary: 20000000, kpiSalary: 5000000 },
      { level: 'Department Head', baseSalary: 30000000, kpiSalary: 8000000 },
      { level: 'Director', baseSalary: 50000000, kpiSalary: 15000000 },
    ],
  },
];

const vnd = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v);

const PositionLevelManagement = ({ initialPositionId }: { initialPositionId?: string }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sidebarQuery, setSidebarQuery] = useState('');
  const [usageFilter, setUsageFilter] = useState<UsageFilter>('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<PositionLevel | null>(null);
  const [formData, setFormData] = useState<FormData>({ level: '', baseSalary: '', kpiSalary: '' });
  const [copySourceId, setCopySourceId] = useState<string>('');
  const [presetIdx, setPresetIdx] = useState<number>(0);
  const [exportLoading, setExportLoading] = useState(false);

  const { data: positions = [], isLoading: positionsLoading } = usePositions();
  const { data: levels = [], isLoading: levelsLoading } = usePositionLevelsByPosition(selectedPosition?.id || '');
  const loading = positionsLoading || levelsLoading;

  // Level counts are now included in the positions query via _count.levels
  // No additional queries needed

  useEffect(() => {
    if (positions.length > 0 && !selectedPosition) {
      const initial = initialPositionId ? positions.find((p: Position) => p.id === initialPositionId) : null;
      setSelectedPosition(initial || positions[0]);
    }
  }, [positions, selectedPosition]);

  const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };
  const employeeCountOf = (pos: Position): number => pos.employees?.length ?? 0;

  const handleExport = async () => {
    try {
      setExportLoading(true);
      const params = selectedPosition ? `?positionId=${selectedPosition.id}` : '';
      const filename = selectedPosition
        ? `bac-luong-${selectedPosition.code}-${new Date().toISOString().slice(0, 10)}.xlsx`
        : `bac-luong-${new Date().toISOString().slice(0, 10)}.xlsx`;
      await apiClient.download(`/position-levels/export.xlsx${params}`, filename);
    } catch {
      setError('Không thể xuất Excel. Vui lòng thử lại.');
    } finally {
      setExportLoading(false);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.level || formData.baseSalary === '' || formData.kpiSalary === '') {
      setError('Vui lòng điền đầy đủ thông tin'); return;
    }
    if (!selectedPosition) { setError('Vui lòng chọn vị trí'); return; }
    try {
      const payload = {
        level: formData.level,
        baseSalary: Number(formData.baseSalary),
        kpiSalary: Number(formData.kpiSalary),
      };
      if (isEditMode && selectedLevel) {
        await positionLevelService.updateLevel(selectedLevel.id, payload);
        flash('Cập nhật cấp độ thành công');
      } else {
        await positionLevelService.createLevel(selectedPosition.id, payload);
        flash('Thêm cấp độ thành công');
      }
      closeModals();
      queryClient.invalidateQueries({ queryKey: positionKeys.levels() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi xử lý');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const usage = await positionLevelService.getLevelUsage(id);
      if (usage.employeeCount > 0) {
        if (!window.confirm(`Cấp độ này đang được ${usage.employeeCount} nhân viên sử dụng.\nBạn có chắc chắn muốn xoá không?`)) return;
      } else {
        if (!window.confirm('Xoá cấp độ này?')) return;
      }
      await positionLevelService.deleteLevel(id);
      flash('Xoá cấp độ thành công');
      queryClient.invalidateQueries({ queryKey: positionKeys.levels() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi xoá cấp độ');
    }
  };

  const handleCopyFrom = async () => {
    if (!selectedPosition || !copySourceId) return;
    try {
      const src = await positionLevelService.getAllLevelsByPosition(copySourceId);
      if (src.length === 0) { setError('Vị trí nguồn không có cấp độ nào'); return; }
      let ok = 0, dup = 0;
      for (const lvl of src) {
        try {
          await positionLevelService.createLevel(selectedPosition.id, {
            level: lvl.level, baseSalary: lvl.baseSalary, kpiSalary: lvl.kpiSalary,
          });
          ok++;
        } catch (err: any) {
          if (String(err?.message ?? '').toLowerCase().includes('already exists')) dup++;
          else throw err;
        }
      }
      queryClient.invalidateQueries({ queryKey: positionKeys.levels() });
      flash(`Đã sao chép ${ok} cấp độ${dup ? ` (bỏ qua ${dup} trùng tên)` : ''}`);
      setIsCopyModalOpen(false);
      setCopySourceId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi sao chép');
    }
  };

  const handleApplyPreset = async () => {
    if (!selectedPosition) return;
    const preset = LEVEL_PRESETS[presetIdx];
    if (!preset) return;
    try {
      let ok = 0, dup = 0;
      for (const lvl of preset.levels) {
        try {
          await positionLevelService.createLevel(selectedPosition.id, lvl);
          ok++;
        } catch (err: any) {
          if (String(err?.message ?? '').toLowerCase().includes('already exists')) dup++;
          else throw err;
        }
      }
      queryClient.invalidateQueries({ queryKey: positionKeys.levels() });
      flash(`Đã áp dụng preset: thêm ${ok} cấp độ${dup ? ` (bỏ qua ${dup} trùng tên)` : ''}`);
      setIsPresetModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi áp dụng preset');
    }
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedLevel(null);
    setFormData({ level: '', baseSalary: '', kpiSalary: '' });
    setIsFormModalOpen(true);
  };
  openCreateModalRef.current = openCreateModal;

  const openEditModal = (level: PositionLevel) => {
    setIsEditMode(true);
    setSelectedLevel(level);
    setFormData({ level: level.level, baseSalary: level.baseSalary, kpiSalary: level.kpiSalary });
    setIsFormModalOpen(true);
  };

  const closeModals = () => {
    setIsFormModalOpen(false);
    setIsCopyModalOpen(false);
    setIsPresetModalOpen(false);
    setFormData({ level: '', baseSalary: '', kpiSalary: '' });
  };

  // Sort levels by total salary asc for consistent display
  const sortedLevels = useMemo(
    () => [...levels].sort((a, b) => a.baseSalary + a.kpiSalary - (b.baseSalary + b.kpiSalary)),
    [levels]
  );

  // Sidebar: filter + sort
  const sidebarPositions = useMemo(() => {
    const q = sidebarQuery.trim().toLowerCase();
    return positions
      .filter(pos => {
        if (q && !pos.code.toLowerCase().includes(q) && !pos.name.toLowerCase().includes(q)) return false;
        const count = employeeCountOf(pos);
        const hasLevels = (pos._count?.levels ?? 0) > 0;
        if (usageFilter === 'in_use' && count === 0) return false;
        if (usageFilter === 'needs_setup' && (count === 0 || hasLevels)) return false;
        return true;
      })
      .sort((a, b) => {
        const countA = employeeCountOf(a), countB = employeeCountOf(b);
        const needsA = countA > 0 && (a._count?.levels ?? 0) === 0;
        const needsB = countB > 0 && (b._count?.levels ?? 0) === 0;
        if (needsA !== needsB) return needsA ? -1 : 1;
        if (countA !== countB) return countB - countA;
        return a.name.localeCompare(b.name, 'vi');
      });
  }, [positions, sidebarQuery, usageFilter]);

  sidebarPositionsRef.current = sidebarPositions;
  selectedPositionRef.current = selectedPosition;

  const usageStats = useMemo(() => {
    let inUse = 0, needsSetup = 0;
    for (const pos of positions) {
      const count = employeeCountOf(pos);
      const hasLevels = (pos._count?.levels ?? 0) > 0;
      if (count > 0) inUse++;
      if (count > 0 && !hasLevels) needsSetup++;
    }
    return { total: positions.length, inUse, needsSetup };
  }, [positions]);

  // Live preview salary
  const previewTotal = (Number(formData.baseSalary) || 0) + (Number(formData.kpiSalary) || 0);
  const previewKpiRatio = previewTotal > 0 ? (Number(formData.kpiSalary) || 0) / previewTotal : 0;

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
            {positionsLoading ? (
              <div className="p-6 text-center text-gray-500 text-sm">Đang tải...</div>
            ) : sidebarPositions.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">Không có vị trí</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {sidebarPositions.map(pos => {
                  const count = employeeCountOf(pos);
                  const lvlCount = pos._count?.levels ?? 0;
                  const isSelected = selectedPosition?.id === pos.id;
                  const needsSetup = count > 0 && lvlCount === 0;
                  return (
                    <li key={pos.id}>
                      <button
                        onClick={() => {
                          setSelectedPosition(pos);
                          // Clear positionId from URL when user manually selects a position
                          if (initialPositionId && pos.id !== initialPositionId) {
                            navigate('?tab=levels', { replace: true });
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
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium rounded border ${
                            lvlCount === 0
                              ? 'bg-gray-100 text-gray-600 border-gray-300'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}>
                            <DollarSign className="w-3 h-3" />{lvlCount === 0 ? 'Chưa có bậc' : `${lvlCount} bậc`}
                          </span>
                          {needsSetup && (
                            <span className="text-xs text-amber-700" title="Có nhân viên nhưng chưa có bậc lương">⚠</span>
                          )}
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

      {/* Main */}
      <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
        {sidebarCollapsed && (
          <button onClick={() => setSidebarCollapsed(false)} className="self-start text-sm text-blue-600 hover:text-blue-800">
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
            {/* Header */}
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
                    <span className="text-gray-400">•</span>
                    <span>{sortedLevels.length} bậc lương</span>
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
                    onClick={() => setIsPresetModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                    title="Áp dụng preset chuẩn cho danh mục vị trí"
                  >
                    <TrendingUp className="w-4 h-4" /> Áp dụng preset
                  </button>
                  <button
                    onClick={() => setIsCopyModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                    title="Sao chép bậc lương từ vị trí khác"
                  >
                    <Copy className="w-4 h-4" /> Sao chép từ vị trí khác
                  </button>
                  <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" /> Thêm bậc
                  </button>
                </div>
              </div>

              {/* Summary strip */}
              {sortedLevels.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-gray-100">
                  <div className="p-2 rounded bg-slate-50">
                    <div className="text-xs text-gray-500">Bậc thấp nhất</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {vnd(sortedLevels[0].baseSalary + sortedLevels[0].kpiSalary)}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-50">
                    <div className="text-xs text-gray-500">Bậc cao nhất</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {vnd(sortedLevels[sortedLevels.length - 1].baseSalary + sortedLevels[sortedLevels.length - 1].kpiSalary)}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-50">
                    <div className="text-xs text-gray-500">Chênh cao/thấp</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {sortedLevels[0].baseSalary + sortedLevels[0].kpiSalary > 0
                        ? `${(((sortedLevels[sortedLevels.length - 1].baseSalary + sortedLevels[sortedLevels.length - 1].kpiSalary) /
                              (sortedLevels[0].baseSalary + sortedLevels[0].kpiSalary)) * 100 - 100).toFixed(0)}%`
                        : '–'}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-50">
                    <div className="text-xs text-gray-500">KPI TB / tổng</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {(() => {
                        const totalSum = sortedLevels.reduce((a, l) => a + l.baseSalary + l.kpiSalary, 0);
                        const kpiSum = sortedLevels.reduce((a, l) => a + l.kpiSalary, 0);
                        return totalSum > 0 ? `${((kpiSum / totalSum) * 100).toFixed(0)}%` : '–';
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col min-h-0">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Đang tải...</div>
              ) : sortedLevels.length === 0 ? (
                <div className="p-8 text-center text-gray-500 space-y-2">
                  <p>Chưa có bậc lương nào cho vị trí này.</p>
                  <p className="text-sm">
                    Bấm <strong>"Áp dụng preset"</strong> để tạo nhanh, hoặc <strong>"Sao chép từ vị trí khác"</strong>, hoặc <strong>"Thêm bậc"</strong> để nhập tay.
                  </p>
                </div>
              ) : (
                <div className="overflow-y-auto flex-1">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Bậc</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 border-r border-gray-200">Lương cơ bản</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 border-r border-gray-200">Lương KPI</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 border-r border-gray-200">Tổng</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-r border-gray-200 w-24">KPI %</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-r border-gray-200 w-28">Chênh bậc trước</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 w-28">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedLevels.map((level, idx) => {
                        const total = level.baseSalary + level.kpiSalary;
                        const kpiPct = total > 0 ? (level.kpiSalary / total) * 100 : 0;
                        const prev = idx > 0 ? sortedLevels[idx - 1] : null;
                        const prevTotal = prev ? prev.baseSalary + prev.kpiSalary : 0;
                        const deltaPct = prev && prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;
                        return (
                          <tr key={level.id} onClick={() => openEditModal(level)} className={`border-b border-gray-100 border-l-2 border-l-transparent hover:bg-blue-100 hover:border-l-blue-500 cursor-pointer transition-all ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="px-4 py-3 text-sm font-semibold text-blue-700 border-r border-gray-200">{level.level}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900 border-r border-gray-200">{vnd(level.baseSalary)}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900 border-r border-gray-200">{vnd(level.kpiSalary)}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 border-r border-gray-200">{vnd(total)}</td>
                            <td className="px-4 py-3 text-center border-r border-gray-200">
                              <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                                {kpiPct.toFixed(0)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-sm border-r border-gray-200">
                              {deltaPct === null ? (
                                <span className="text-gray-400 text-xs">–</span>
                              ) : (
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                  deltaPct >= 20 ? 'bg-emerald-100 text-emerald-800'
                                  : deltaPct >= 5 ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                                }`}>
                                  +{deltaPct.toFixed(0)}%
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(level.id); }} className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors" title="Xoá">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 flex flex-col modal-viewport-h" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 overflow-y-auto flex-1">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">{isEditMode ? 'Chỉnh sửa bậc lương' : 'Thêm bậc lương mới'}</h3>
              <button onClick={closeModals} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên bậc *</label>
                <input
                  type="text"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  placeholder="VD: Junior, Senior, Lành nghề, Manager"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lương cơ bản (VND) *</label>
                <input
                  type="number"
                  min="0"
                  step="100000"
                  value={formData.baseSalary}
                  onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value ? parseNumberInput(e.target.value) : '' })}
                  placeholder="VD: 6000000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {formData.baseSalary !== '' && Number(formData.baseSalary) > 0 && (
                  <p className="mt-1 text-xs text-gray-500">= {vnd(Number(formData.baseSalary))}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lương KPI (VND) *</label>
                <input
                  type="number"
                  min="0"
                  step="100000"
                  value={formData.kpiSalary}
                  onChange={(e) => setFormData({ ...formData, kpiSalary: e.target.value ? parseNumberInput(e.target.value) : '' })}
                  placeholder="VD: 1000000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {formData.kpiSalary !== '' && Number(formData.kpiSalary) > 0 && (
                  <p className="mt-1 text-xs text-gray-500">= {vnd(Number(formData.kpiSalary))}</p>
                )}
              </div>

              {/* Live preview */}
              {(formData.baseSalary !== '' || formData.kpiSalary !== '') && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Tổng lương:</span>
                    <span className="font-semibold text-blue-800">{vnd(previewTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Tỷ lệ KPI:</span>
                    <span className={`font-medium ${
                      previewKpiRatio < 0.1 ? 'text-red-700'
                      : previewKpiRatio > 0.35 ? 'text-amber-700'
                      : 'text-emerald-700'
                    }`}>
                      {(previewKpiRatio * 100).toFixed(1)}%
                    </span>
                  </div>
                  {previewKpiRatio < 0.1 && previewTotal > 0 && (
                    <p className="text-red-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> KPI dưới 10% — nhân viên khó có động lực</p>
                  )}
                  {previewKpiRatio > 0.35 && (
                    <p className="text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> KPI trên 35% — có thể gây bất ổn thu nhập</p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModals} className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Hủy</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  {isEditMode ? 'Cập nhật' : 'Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Modal>

      {/* Copy-from Modal */}
      <Modal isOpen={isCopyModalOpen} onClose={closeModals} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 flex flex-col modal-viewport-h" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 overflow-y-auto flex-1">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Sao chép bậc lương từ vị trí khác</h3>
              <button onClick={closeModals} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Chọn vị trí nguồn để copy toàn bộ bậc lương sang <strong>{selectedPosition?.code}</strong>.
              Nếu tên bậc trùng sẽ tự động bỏ qua.
            </p>
            <select
              value={copySourceId}
              onChange={(e) => setCopySourceId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            >
              <option value="">-- Chọn vị trí nguồn --</option>
              {positions
                .filter(p => p.id !== selectedPosition?.id && (p._count?.levels ?? 0) > 0)
                .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name} ({p._count?.levels ?? 0} bậc)
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

      {/* Preset Modal */}
      <Modal isOpen={isPresetModalOpen} onClose={closeModals} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 flex flex-col modal-viewport-h" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 overflow-y-auto flex-1">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Áp dụng preset bậc lương</h3>
              <button onClick={closeModals} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Chọn preset phù hợp với vị trí <strong>{selectedPosition?.code}</strong>. Có thể tinh chỉnh sau khi tạo.
            </p>
            <div className="space-y-2 mb-4">
              {LEVEL_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setPresetIdx(idx)}
                  className={`w-full text-left p-3 border rounded-md transition-colors ${
                    presetIdx === idx ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-gray-900">{preset.label}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {preset.levels.map(l => `${l.level} (${vnd(l.baseSalary + l.kpiSalary)})`).join(' → ')}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-amber-700 mb-3">
              ⚠ Nếu tên bậc trùng bậc đã có, sẽ tự động bỏ qua bậc trùng.
            </p>
            <div className="flex gap-3">
              <button onClick={closeModals} className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Hủy</button>
              <button
                onClick={handleApplyPreset}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PositionLevelManagement;