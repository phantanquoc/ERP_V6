import React, { useState } from 'react';
import { BarChart3, Search, X } from 'lucide-react';
import { useOutputStatistics } from '../hooks/useFinishedProducts';
import { OutputStatisticsFilters, OutputStatisticsRow } from '../services/finishedProductService';

// ─── Date formatting ──────────────────────────────────────────────────────────

/** Convert YYYY-MM-DD to DD/MM/YYYY for display */
const formatDate = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

/** Format today as YYYY-MM-DD */
const todayIso = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

/** Format 30 days ago as YYYY-MM-DD */
const thirtyDaysAgoIso = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
};

// ─── Component ────────────────────────────────────────────────────────────────

interface OutputStatisticsTableProps {
  /** Optional pre-filtered machineSystemId */
  machineSystemId?: string;
}

const OutputStatisticsTable: React.FC<OutputStatisticsTableProps> = ({ machineSystemId }) => {
  const [dateFrom, setDateFrom] = useState<string>(thirtyDaysAgoIso());
  const [dateTo, setDateTo] = useState<string>(todayIso());
  const [tenHangHoa, setTenHangHoa] = useState<string>('');
  const [appliedFilters, setAppliedFilters] = useState<OutputStatisticsFilters>({
    dateFrom: thirtyDaysAgoIso(),
    dateTo: todayIso(),
    machineSystemId,
  });

  const { data: rows = [], isLoading, isError, error } = useOutputStatistics(appliedFilters);

  const handleSearch = () => {
    setAppliedFilters({
      dateFrom,
      dateTo,
      machineSystemId,
      tenHangHoa: tenHangHoa.trim() || undefined,
    });
  };

  const handleClear = () => {
    const from = thirtyDaysAgoIso();
    const to = todayIso();
    setDateFrom(from);
    setDateTo(to);
    setTenHangHoa('');
    setAppliedFilters({ dateFrom: from, dateTo: to, machineSystemId });
  };

  // Aggregate totals
  const totals = rows.reduce(
    (acc, r) => ({
      aKhoiLuong: acc.aKhoiLuong + r.aKhoiLuong,
      bKhoiLuong: acc.bKhoiLuong + r.bKhoiLuong,
      bDauKhoiLuong: acc.bDauKhoiLuong + r.bDauKhoiLuong,
      cKhoiLuong: acc.cKhoiLuong + r.cKhoiLuong,
      vunLonKhoiLuong: acc.vunLonKhoiLuong + r.vunLonKhoiLuong,
      vunNhoKhoiLuong: acc.vunNhoKhoiLuong + r.vunNhoKhoiLuong,
      phePhamKhoiLuong: acc.phePhamKhoiLuong + r.phePhamKhoiLuong,
      uotKhoiLuong: acc.uotKhoiLuong + r.uotKhoiLuong,
      tongKhoiLuong: acc.tongKhoiLuong + r.tongKhoiLuong,
      goodOutput: acc.goodOutput + r.goodOutput,
      scrap: acc.scrap + r.scrap,
    }),
    {
      aKhoiLuong: 0, bKhoiLuong: 0, bDauKhoiLuong: 0, cKhoiLuong: 0,
      vunLonKhoiLuong: 0, vunNhoKhoiLuong: 0, phePhamKhoiLuong: 0, uotKhoiLuong: 0,
      tongKhoiLuong: 0, goodOutput: 0, scrap: 0,
    }
  );

  const fmt = (n: number) => n.toFixed(2);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Từ ngày</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Đến ngày</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tên hàng hóa</label>
            <input
              type="text"
              value={tenHangHoa}
              onChange={(e) => setTenHangHoa(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Lọc theo tên..."
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
            />
          </div>
          <button
            onClick={handleSearch}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            <Search className="w-4 h-4" />
            Tìm kiếm
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
          >
            <X className="w-4 h-4" />
            Xóa lọc
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
            Đang tải dữ liệu thống kê…
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center py-12 text-red-600 text-sm">
            {(error as Error)?.message ?? 'Không thể tải dữ liệu. Vui lòng thử lại.'}
          </div>
        )}

        {!isLoading && !isError && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <BarChart3 className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">Không có dữ liệu trong khoảng thời gian đã chọn</p>
          </div>
        )}

        {!isLoading && !isError && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-300">
                  <th className="px-3 py-3 text-left font-semibold text-gray-700 border-r border-gray-200 whitespace-nowrap">Ngày</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700 border-r border-gray-200 whitespace-nowrap">Mã chiên</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700 border-r border-gray-200 whitespace-nowrap">Tên hàng hóa</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700 border-r border-gray-200 whitespace-nowrap">Máy</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700 border-r border-gray-200 whitespace-nowrap">A (kg)</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700 border-r border-gray-200 whitespace-nowrap">B (kg)</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700 border-r border-gray-200 whitespace-nowrap">B Dầu (kg)</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700 border-r border-gray-200 whitespace-nowrap">C (kg)</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700 border-r border-gray-200 whitespace-nowrap">Vụn lớn</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700 border-r border-gray-200 whitespace-nowrap">Vụn nhỏ</th>
                  <th className="px-3 py-3 text-right font-semibold text-green-700 border-r border-gray-200 whitespace-nowrap">Tốt (kg)</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700 border-r border-gray-200 whitespace-nowrap">Phế phẩm</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700 border-r border-gray-200 whitespace-nowrap">Ướt (kg)</th>
                  <th className="px-3 py-3 text-right font-semibold text-red-700 border-r border-gray-200 whitespace-nowrap">Phế (kg)</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700 whitespace-nowrap">Tổng (kg)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: OutputStatisticsRow) => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 border-r border-gray-100 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-3 py-2 border-r border-gray-100 font-mono text-xs whitespace-nowrap">{row.maChien}</td>
                    <td className="px-3 py-2 border-r border-gray-100 whitespace-nowrap">{row.tenHangHoa}</td>
                    <td className="px-3 py-2 border-r border-gray-100 whitespace-nowrap text-xs text-gray-600">
                      {row.maHeThong ?? <span className="text-gray-400 italic">—</span>}
                    </td>
                    <td className="px-3 py-2 border-r border-gray-100 text-right">{fmt(row.aKhoiLuong)}</td>
                    <td className="px-3 py-2 border-r border-gray-100 text-right">{fmt(row.bKhoiLuong)}</td>
                    <td className="px-3 py-2 border-r border-gray-100 text-right">{fmt(row.bDauKhoiLuong)}</td>
                    <td className="px-3 py-2 border-r border-gray-100 text-right">{fmt(row.cKhoiLuong)}</td>
                    <td className="px-3 py-2 border-r border-gray-100 text-right">{fmt(row.vunLonKhoiLuong)}</td>
                    <td className="px-3 py-2 border-r border-gray-100 text-right">{fmt(row.vunNhoKhoiLuong)}</td>
                    <td className="px-3 py-2 border-r border-gray-100 text-right font-semibold text-green-700">{fmt(row.goodOutput)}</td>
                    <td className="px-3 py-2 border-r border-gray-100 text-right">{fmt(row.phePhamKhoiLuong)}</td>
                    <td className="px-3 py-2 border-r border-gray-100 text-right">{fmt(row.uotKhoiLuong)}</td>
                    <td className="px-3 py-2 border-r border-gray-100 text-right font-semibold text-red-700">{fmt(row.scrap)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmt(row.tongKhoiLuong)}</td>
                  </tr>
                ))}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr className="bg-blue-50 border-t-2 border-blue-200 font-semibold">
                  <td colSpan={4} className="px-3 py-2 border-r border-blue-200 text-gray-700">Tổng cộng ({rows.length} mẻ)</td>
                  <td className="px-3 py-2 border-r border-blue-200 text-right">{fmt(totals.aKhoiLuong)}</td>
                  <td className="px-3 py-2 border-r border-blue-200 text-right">{fmt(totals.bKhoiLuong)}</td>
                  <td className="px-3 py-2 border-r border-blue-200 text-right">{fmt(totals.bDauKhoiLuong)}</td>
                  <td className="px-3 py-2 border-r border-blue-200 text-right">{fmt(totals.cKhoiLuong)}</td>
                  <td className="px-3 py-2 border-r border-blue-200 text-right">{fmt(totals.vunLonKhoiLuong)}</td>
                  <td className="px-3 py-2 border-r border-blue-200 text-right">{fmt(totals.vunNhoKhoiLuong)}</td>
                  <td className="px-3 py-2 border-r border-blue-200 text-right text-green-700">{fmt(totals.goodOutput)}</td>
                  <td className="px-3 py-2 border-r border-blue-200 text-right">{fmt(totals.phePhamKhoiLuong)}</td>
                  <td className="px-3 py-2 border-r border-blue-200 text-right">{fmt(totals.uotKhoiLuong)}</td>
                  <td className="px-3 py-2 border-r border-blue-200 text-right text-red-700">{fmt(totals.scrap)}</td>
                  <td className="px-3 py-2 text-right">{fmt(totals.tongKhoiLuong)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputStatisticsTable;
