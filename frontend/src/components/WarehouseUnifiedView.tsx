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
 * Desktop: management bên trái (flex-1), map sticky bên phải (w-[480px])
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
      {/* Management section: always visible, flex-1 */}
      <div className={`flex-1 min-w-0 ${showMap ? '' : 'w-full'}`}>
        <WarehouseManagement
          initialWarehouseId={initialWarehouseId}
          selectedWarehouseId={selectedWarehouseId}
          onSelectedWarehouseChange={setSelectedWarehouseId}
        />
      </div>

      {/* Map panel: sticky sidebar on desktop, only when warehouse has CAD layout */}
      {showMap && selectedWarehouseId && (
        <div className="w-full xl:w-[480px] xl:shrink-0 xl:sticky xl:top-4 space-y-4">
          <WarehouseMap
            warehouseId={selectedWarehouseId}
            onWarehouseChange={setSelectedWarehouseId}
            hideSidePanel
          />
        </div>
      )}
    </div>
  );
};

export default WarehouseUnifiedView;
