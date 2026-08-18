import React, { useState } from 'react';
import { Warehouse as WarehouseIcon, MapPinOff } from 'lucide-react';
import type { Warehouse as WarehouseType } from '../services/warehouseService';
import { useWarehouses } from '../hooks';
import { hasWarehouseLayout } from '../constants/warehouseLayouts';
import WarehouseManagement from './WarehouseManagement';
import WarehouseMap from './WarehouseMap';

/** Chặn mọi lỗi render trong khu vực kho — không để vỡ cả màn hình. */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="w-full rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <b>Có lỗi khi hiển thị nội dung kho.</b> {this.state.error.message}
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="ml-3 px-2 py-1 border border-red-300 rounded hover:bg-red-100"
          >
            Thử lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface WarehouseUnifiedViewProps {
  initialWarehouseId?: string;
}

/**
 * Kết hợp Quản lý kho + Bản đồ kho vào cùng 1 view.
 * Tab strip danh sách kho luôn ghim full-width phía trên — không bị cuộn theo sidebar.
 * Desktop xl+: map bên trái (flex-1), management sticky bên phải (w-[420px])
 * Mobile/tablet: map trên, management dưới
 * Kho không có CAD layout: management full-width như cũ
 */
const WarehouseUnifiedView: React.FC<WarehouseUnifiedViewProps> = ({ initialWarehouseId }) => {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(initialWarehouseId ?? null);
  const { data: warehousesData } = useWarehouses();

  const warehouses = (warehousesData as WarehouseType[] | undefined) ?? [];
  const sortWarehouses = (list: WarehouseType[]) =>
    [...list].sort((a, b) => {
      const numA = parseInt(a.tenKho.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.tenKho.replace(/\D/g, '')) || 0;
      if (numA !== numB) return numA - numB;
      return a.tenKho.localeCompare(b.tenKho);
    });
  const sortedWarehouses = React.useMemo(() => sortWarehouses(warehouses), [warehouses]);

  const selectedMaKho = warehouses.find((w) => w.id === selectedWarehouseId)?.maKho;
  const showMap = hasWarehouseLayout(selectedMaKho);

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Quản lý kho</h2>
      </div>

      {/* Warehouse Tabs — luôn full-width, ghim phía trên */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 px-4 overflow-x-auto" aria-label="Warehouse Tabs">
            {sortedWarehouses.map((warehouse) => (
              <button
                key={warehouse.id}
                onClick={() => setSelectedWarehouseId(warehouse.id)}
                className={`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                  selectedWarehouseId === warehouse.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <WarehouseIcon className="w-3.5 h-3.5" />
                <span className="flex flex-col items-start leading-tight">
                  <span>{warehouse.tenKho}</span>
                  <span className="text-[10px] text-gray-400 font-normal">{warehouse.maKho}</span>
                </span>
                {warehouse.lots && warehouse.lots.length > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    selectedWarehouseId === warehouse.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {warehouse.lots.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Split panel: map + management */}
      <ErrorBoundary>
      <div className="flex flex-col xl:flex-row gap-4 items-start">
        {showMap && selectedWarehouseId ? (
          <>
            <div className="w-full xl:flex-1 xl:min-w-0 space-y-4">
              <WarehouseMap
                warehouseId={selectedWarehouseId}
                onWarehouseChange={setSelectedWarehouseId}
                hideSidePanel
              />
            </div>

            <div className="w-full xl:w-[420px] xl:shrink-0 xl:sticky xl:top-4">
              <WarehouseManagement
                initialWarehouseId={initialWarehouseId}
                selectedWarehouseId={selectedWarehouseId}
                onSelectedWarehouseChange={setSelectedWarehouseId}
                hideTabs
              />
            </div>
          </>
        ) : (
          <div className="w-full">
            {selectedWarehouseId && !showMap && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <MapPinOff className="h-4 w-4 shrink-0" />
                Kho này chưa có bản đồ CAD (sơ đồ kho) — quản lý kiện qua danh sách dưới đây.
              </div>
            )}
            <WarehouseManagement
              initialWarehouseId={initialWarehouseId}
              selectedWarehouseId={selectedWarehouseId}
              onSelectedWarehouseChange={setSelectedWarehouseId}
              hideTabs
            />
          </div>
        )}
      </div>
      </ErrorBoundary>
    </div>
  );
};

export default WarehouseUnifiedView;
