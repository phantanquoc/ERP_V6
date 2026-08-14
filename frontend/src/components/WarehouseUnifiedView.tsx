import React, { useState } from 'react';
import type { Warehouse as WarehouseType } from '../services/warehouseService';
import { useWarehouses } from '../hooks';
import { hasWarehouseLayout } from '../constants/warehouseLayouts';
import WarehouseManagement from './WarehouseManagement';
import WarehouseMap from './WarehouseMap';

interface WarehouseUnifiedViewProps {
  initialWarehouseId?: string;
}

/**
 * Kết hợp Quản lý kho + Bản đồ kho vào cùng 1 view.
 * Bản đồ là focus chính — render trước, chiếm phần lớn không gian.
 * Desktop xl+: map bên trái (flex-1), management sticky bên phải (w-[420px])
 * Mobile/tablet: map trên, management dưới
 * Kho không có CAD layout: management full-width như cũ
 */
const WarehouseUnifiedView: React.FC<WarehouseUnifiedViewProps> = ({ initialWarehouseId }) => {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(initialWarehouseId ?? null);
  const { data: warehousesData } = useWarehouses();

  const selectedMaKho = (warehousesData as WarehouseType[] | undefined)?.find(
    (w) => w.id === selectedWarehouseId,
  )?.maKho;
  const showMap = hasWarehouseLayout(selectedMaKho);

  return (
    <div className="flex flex-col xl:flex-row gap-4 items-start">
      {/* Map panel: focus chính — render đầu, chiếm không gian lớn */}
      {showMap && selectedWarehouseId ? (
        <>
          <div className="w-full xl:flex-1 xl:min-w-0 space-y-4">
            <WarehouseMap
              warehouseId={selectedWarehouseId}
              onWarehouseChange={setSelectedWarehouseId}
              hideSidePanel
            />
          </div>

          {/* Management section: sidebar bên phải */}
          <div className="w-full xl:w-[420px] xl:shrink-0 xl:sticky xl:top-4">
            <WarehouseManagement
              initialWarehouseId={initialWarehouseId}
              selectedWarehouseId={selectedWarehouseId}
              onSelectedWarehouseChange={setSelectedWarehouseId}
            />
          </div>
        </>
      ) : (
        <div className="w-full">
          <WarehouseManagement
            initialWarehouseId={initialWarehouseId}
            selectedWarehouseId={selectedWarehouseId}
            onSelectedWarehouseChange={setSelectedWarehouseId}
          />
        </div>
      )}
    </div>
  );
};

export default WarehouseUnifiedView;
