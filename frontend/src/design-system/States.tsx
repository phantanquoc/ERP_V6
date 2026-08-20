import React from 'react';
import { AlertTriangle, RefreshCw, Inbox } from 'lucide-react';

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Đang tải dữ liệu...' }) => (
  <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col items-center justify-center py-12 gap-3">
    <div aria-hidden="true" className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    <span className="text-sm text-gray-500 font-medium">{message}</span>
  </div>
);

export const LoadingSkeleton: React.FC = () => (
  <div aria-hidden="true" aria-busy="true" role="status" aria-label="Đang tải..." >
    <div className="flex items-center justify-between mb-5">
      <div>
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-3 w-64 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 bg-white border border-gray-200 rounded-lg animate-pulse" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="h-72 bg-white border border-gray-200 rounded-lg animate-pulse" />
      <div className="h-72 bg-white border border-gray-200 rounded-lg animate-pulse" />
    </div>
  </div>
);

export const ErrorState: React.FC<{ message?: string; onRetry?: () => void }> = ({
  message = 'Không thể tải dữ liệu',
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center py-12">
    <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
    <p role="alert" className="text-sm text-gray-600 mb-3">{message}</p>
    {onRetry && (
      <button onClick={onRetry} className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 border border-gray-200 bg-white rounded-lg px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
        <RefreshCw aria-hidden="true" className="w-3.5 h-3.5" /> Thử lại
      </button>
    )}
  </div>
);

export const EmptyState: React.FC<{ message?: string; description?: string; action?: React.ReactNode }> = ({
  message = 'Chưa có dữ liệu',
  description,
  action,
}) => (
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
      <Inbox aria-hidden="true" className="w-6 h-6 text-gray-400" />
    </div>
    <p className="text-sm font-medium text-gray-600">{message}</p>
    {description && <p className="text-xs text-gray-400 mt-1 max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
