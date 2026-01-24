import { Settings } from 'lucide-react';

const PurchasingEquipment = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <Settings className="w-8 h-8 text-purple-600 mr-3" />
            Phòng mua Thiết bị
          </h1>
          <p className="text-gray-600">Quản lý nhà cung cấp, đơn hàng mua, hợp đồng và đầu tư thiết bị máy móc</p>
        </div>

        {/* Content placeholder */}
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-500">Trang đang được xây dựng...</p>
        </div>
      </div>
    </div>
  );
};

export default PurchasingEquipment;
