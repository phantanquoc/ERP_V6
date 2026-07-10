import React, { useState, useMemo } from 'react';
import { Search, X, Clock, Scale, ChevronDown, CalendarDays } from 'lucide-react';
import type { MaterialEvaluation } from '../../services/materialEvaluationService';

// ─── Date helpers ──────────────────────────────────────────────────────────

/** Return YYYY-MM-DD in local time for grouping/comparison. */
const toLocalDateKey = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Display HH:mm DD/MM from an ISO datetime. */
const formatTime = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return `${hh}:${mm} ${dd}/${mo}`;
};

type DateFilter = 'today' | 'yesterday' | 'all';

// ─── Component ─────────────────────────────────────────────────────────────

interface FryBatchPickerProps {
  batches: MaterialEvaluation[];
  selectedMaChien: string;
  onSelect: (maChien: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

const FryBatchPicker: React.FC<FryBatchPickerProps> = ({
  batches,
  selectedMaChien,
  onSelect,
  disabled,
  loading,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');

  const todayKey = toLocalDateKey(new Date().toISOString());
  const yesterdayKey = toLocalDateKey(new Date(Date.now() - 86_400_000).toISOString());

  const selectedBatch = useMemo(
    () => batches.find((b) => b.maChien === selectedMaChien),
    [batches, selectedMaChien],
  );

  // Filter by date chip + search term. When searching, ignore the date chip so
  // older batches remain reachable by code/name.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return batches
      .filter((b) => {
        if (term) {
          return (
            b.maChien.toLowerCase().includes(term) ||
            (b.tenHangHoa || '').toLowerCase().includes(term)
          );
        }
        const key = toLocalDateKey(b.thoiGianChien);
        if (dateFilter === 'today') return key === todayKey;
        if (dateFilter === 'yesterday') return key === yesterdayKey;
        return true;
      })
      .sort(
        (a, b) => new Date(b.thoiGianChien).getTime() - new Date(a.thoiGianChien).getTime(),
      );
  }, [batches, search, dateFilter, todayKey, yesterdayKey]);

  const handlePick = (maChien: string) => {
    onSelect(maChien);
    setOpen(false);
    setSearch('');
  };

  const chip = (value: DateFilter, label: string) => (
    <button
      type="button"
      onClick={() => setDateFilter(value)}
      className={`px-4 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
        dateFilter === value
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <label className="text-sm font-medium text-gray-600">Mã chiên</label>
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen(true)}
        className="w-full min-h-[44px] mt-1 px-3 py-2 border border-gray-300 rounded-lg text-base text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
      >
        <span className={selectedBatch ? 'text-gray-900 truncate' : 'text-gray-400'}>
          {selectedBatch
            ? `${selectedBatch.maChien} - ${selectedBatch.tenHangHoa}`
            : loading
              ? 'Đang tải...'
              : '-- Chọn mã chiên --'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </button>

      {/* Overlay panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          {/* Header: search + close */}
          <div className="sticky top-0 bg-white border-b px-4 py-3 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  autoFocus
                  type="text"
                  inputMode="search"
                  placeholder="Tìm mã chiên hoặc tên hàng..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full min-h-[44px] pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setSearch('');
                }}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Date chips — hidden while searching */}
            {!search.trim() && (
              <div className="flex items-center gap-2">
                {chip('today', 'Hôm nay')}
                {chip('yesterday', 'Hôm qua')}
                {chip('all', 'Tất cả')}
              </div>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <CalendarDays className="w-10 h-10 mb-2" />
                <p className="text-sm">
                  {search.trim()
                    ? 'Không tìm thấy mã chiên phù hợp'
                    : dateFilter === 'today'
                      ? 'Chưa có mã chiên nào hôm nay'
                      : dateFilter === 'yesterday'
                        ? 'Không có mã chiên ngày hôm qua'
                        : 'Chưa có mã chiên nào'}
                </p>
              </div>
            ) : (
              filtered.map((b) => {
                const active = b.maChien === selectedMaChien;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handlePick(b.maChien)}
                    className={`w-full text-left rounded-xl border px-4 py-3 min-h-[60px] transition-colors ${
                      active
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-lg font-semibold text-gray-900">{b.maChien}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTime(b.thoiGianChien)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-sm text-gray-700 truncate">{b.tenHangHoa}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                        <Scale className="w-3.5 h-3.5" />
                        {b.khoiLuong} kg
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FryBatchPicker;
