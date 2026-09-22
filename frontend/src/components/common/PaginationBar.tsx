import React from 'react';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

interface PaginationBarProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  label: string; // e.g. 'phiếu', 'hàng hóa', 'lô'
  ariaLabel: string;
}

const PaginationBar: React.FC<PaginationBarProps> = ({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  label,
  ariaLabel,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 px-2">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">
          {total > 0
            ? `Hiển thị ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} / ${total} ${label}`
            : `Không có ${label}`}
        </span>
        <select
          value={limit}
          onChange={(e) => {
            onLimitChange(Number(e.target.value));
          }}
          className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
          aria-label="Số dòng mỗi trang"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}/trang
            </option>
          ))}
        </select>
      </div>
      {totalPages > 1 && (
        <nav aria-label={ariaLabel} className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 min-h-[32px] text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trước
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .map((p, idx, arr) => (
              <React.Fragment key={p}>
                {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-gray-400">...</span>}
                <button
                  type="button"
                  aria-current={p === page ? 'page' : undefined}
                  aria-label={`Trang ${p}`}
                  onClick={() => onPageChange(p)}
                  className={`px-3 py-1.5 min-h-[32px] min-w-[32px] text-sm rounded-md ${
                    p === page ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              </React.Fragment>
            ))}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 min-h-[32px] text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sau
          </button>
        </nav>
      )}
    </div>
  );
};

export default PaginationBar;
