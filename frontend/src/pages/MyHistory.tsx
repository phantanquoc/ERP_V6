import React, { useState } from 'react';
import { History } from 'lucide-react';
import { useMyHistory } from '../hooks/useMyHistory';
import { MyHistoryParams, HistoryItem } from '../services/myHistoryService';
import MyHistoryFilters from '../components/MyHistoryFilters';
import MyHistoryTimeline from '../components/MyHistoryTimeline';
import MyHistoryDetailModal from '../components/MyHistoryDetailModal';

// Default: last 90 days
function defaultDateFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const GROUP_LABELS: Record<string, string> = {
  'Yêu cầu': 'Yêu cầu',
  'Nhiệm vụ': 'Nhiệm vụ',
  'Kế hoạch': 'Kế hoạch',
  'Báo cáo': 'Báo cáo',
  'Phiếu': 'Phiếu',
};

const MyHistory: React.FC = () => {
  const [params, setParams] = useState<MyHistoryParams>({
    dateFrom: defaultDateFrom(),
    page: 1,
    limit: 20,
  });
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  const { data, isLoading, isError } = useMyHistory(params);

  const handleFiltersChange = (next: MyHistoryParams) => {
    setParams(next);
  };

  const handlePageChange = (page: number) => {
    setParams((prev) => ({ ...prev, page }));
  };

  const groupCounts = data?.groupCounts;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <History className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Lịch sử của tôi</h1>
          <p className="text-sm text-gray-500">Tất cả hoạt động bạn đã tạo hoặc tham gia</p>
        </div>
      </div>

      {/* Group count badges */}
      {groupCounts && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(GROUP_LABELS).map(([key, label]) => {
            const count = (groupCounts as Record<string, number>)[key] ?? 0;
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600"
              >
                {label}
                <span className="font-semibold text-gray-800">{count}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4">
        <MyHistoryFilters params={params} onChange={handleFiltersChange} />
      </div>

      {/* Error state */}
      {isError && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
          Không thể tải dữ liệu. Vui lòng thử lại.
        </div>
      )}

      {/* Timeline */}
      <MyHistoryTimeline
        items={data?.items ?? []}
        total={data?.total ?? 0}
        page={data?.page ?? 1}
        totalPages={data?.totalPages ?? 1}
        isLoading={isLoading}
        onItemClick={setSelectedItem}
        onPageChange={handlePageChange}
      />

      {/* Detail modal */}
      <MyHistoryDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
};

export default MyHistory;
