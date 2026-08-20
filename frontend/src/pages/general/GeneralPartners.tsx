import { Users, Settings } from 'lucide-react';

const GeneralPartners = () => {
  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
            <Users className="w-8 h-8 text-blue-600 mr-3" />
            Phòng chăm sóc đối tác
          </h1>
          <p className="text-gray-600">Quản lý khách hàng, nhà cung cấp và dịch vụ logistics</p>
        </div>

        {/* Under Development Notice */}
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-yellow-100 rounded-full">
              <Settings className="w-16 h-16 text-yellow-600 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            🚧 Tính năng đang phát triển
          </h2>
          <p className="text-gray-600 text-lg mb-6">
            Chúng tôi đang xây dựng tính năng quản lý đối tác bao gồm:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-blue-600 font-semibold">📋 Khách hàng</div>
              <p className="text-sm text-gray-600 mt-1">Quản lý thông tin khách hàng</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-green-600 font-semibold">🏭 Nhà cung cấp</div>
              <p className="text-sm text-gray-600 mt-1">Quản lý nhà cung cấp nguyên liệu</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-purple-600 font-semibold">🚚 Logistics</div>
              <p className="text-sm text-gray-600 mt-1">Quản lý đối tác vận chuyển</p>
            </div>
          </div>
          <p className="text-gray-500 mt-8 text-sm">
            Vui lòng quay lại sau. Xin cảm ơn!
          </p>
        </div>
    </div>
  );
};

export default GeneralPartners;
