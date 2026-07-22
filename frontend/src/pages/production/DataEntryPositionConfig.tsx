import React, { useState } from 'react';
import { usePositions } from '../../hooks/usePositions';
import {
  useDataEntryPageMappings,
  useAddPageMapping,
  useRemovePageMapping,
} from '../../hooks/useDataEntryPagePosition';
import { Loader2, Plus, Trash2, Package, Leaf, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const PAGE_KEYS = [
  {
    key: 'PRODUCTION_OUTPUT',
    label: 'Sản lượng chiên',
    description: 'Trang nhập liệu sản lượng thành phẩm',
    icon: Package,
  },
  {
    key: 'MATERIAL_EVALUATION',
    label: 'Đánh giá nguyên liệu',
    description: 'Trang nhập liệu đánh giá chất lượng nguyên liệu',
    icon: Leaf,
  },
  {
    key: 'RESERVED',
    label: 'Loại nhập liệu thứ 3 (dành chỗ)',
    description: 'Chưa được triển khai',
    icon: HelpCircle,
    disabled: true,
  },
];

const DataEntryPositionConfig: React.FC = () => {
  const [selectedPageKey, setSelectedPageKey] = useState<string>('PRODUCTION_OUTPUT');
  const { data: positions, isLoading: isLoadingPositions } = usePositions(1, 1000);
  const { data: mappings, isLoading: isLoadingMappings } = useDataEntryPageMappings(selectedPageKey);
  const addMapping = useAddPageMapping();
  const removeMapping = useRemovePageMapping();

  const selectedPage = PAGE_KEYS.find((p) => p.key === selectedPageKey);
  const allPositions = positions?.data || [];
  const mappedPositionIds = new Set((mappings || []).map((m) => m.positionId));
  const unmappedPositions = allPositions.filter((p) => !mappedPositionIds.has(p.id));

  const handleAdd = async (positionId: string) => {
    try {
      await addMapping.mutateAsync({ pageKey: selectedPageKey, positionId });
      toast.success('Đã thêm vị trí vào trang nhập liệu');
    } catch (error: any) {
      toast.error(error.message || 'Thêm vị trí thất bại');
    }
  };

  const handleRemove = async (positionId: string) => {
    try {
      await removeMapping.mutateAsync({ pageKey: selectedPageKey, positionId });
      toast.success('Đã xóa vị trí khỏi trang nhập liệu');
    } catch (error: any) {
      toast.error(error.message || 'Xóa vị trí thất bại');
    }
  };

  if (isLoadingPositions) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Cấu hình vị trí cho trang nhập liệu tablet
        </h1>
        <p className="text-gray-600">
          Gán vị trí công việc cho từng loại trang nhập liệu. Sau khi chọn ca, tablet sẽ chỉ hiển thị
          nhân viên giữ vị trí đã được gán cho trang đó.
        </p>
      </div>

      {/* Page tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {PAGE_KEYS.map((page) => {
          const Icon = page.icon;
          return (
            <button
              key={page.key}
              onClick={() => !page.disabled && setSelectedPageKey(page.key)}
              disabled={page.disabled}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedPageKey === page.key
                  ? 'border-blue-500 bg-blue-50'
                  : page.disabled
                  ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon
                  className={`w-5 h-5 ${
                    selectedPageKey === page.key ? 'text-blue-600' : 'text-gray-400'
                  }`}
                />
                <h3 className="font-semibold text-gray-800 text-left">{page.label}</h3>
              </div>
              <p className="text-sm text-gray-500 text-left">{page.description}</p>
            </button>
          );
        })}
      </div>

      {/* Config section */}
      {selectedPage && !selectedPage.disabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mapped positions */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              Vị trí đã gán
              {isLoadingMappings && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
            </h2>
            {!isLoadingMappings && (
              <div className="space-y-2">
                {(mappings || []).length === 0 && (
                  <p className="text-gray-500 text-sm py-4 text-center">
                    Chưa gán vị trí nào. Thêm từ danh sách bên phải.
                  </p>
                )}
                {(mappings || []).map((mapping) => (
                  <div
                    key={mapping.id}
                    className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{mapping.position.name}</p>
                      <p className="text-xs text-gray-500">{mapping.position.code}</p>
                    </div>
                    <button
                      onClick={() => handleRemove(mapping.positionId)}
                      disabled={removeMapping.isPending}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unmapped positions */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Vị trí khả dụng</h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {unmappedPositions.length === 0 && (
                <p className="text-gray-500 text-sm py-4 text-center">
                  Tất cả vị trí đã được gán.
                </p>
              )}
              {unmappedPositions.map((position) => (
                <div
                  key={position.id}
                  className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-800">{position.name}</p>
                    <p className="text-xs text-gray-500">{position.code}</p>
                  </div>
                  <button
                    onClick={() => handleAdd(position.id)}
                    disabled={addMapping.isPending}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataEntryPositionConfig;
