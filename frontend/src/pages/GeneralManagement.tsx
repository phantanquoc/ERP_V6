import { Construction } from 'lucide-react';

const GeneralManagement = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bộ phận tổng hợp</h1>
          <p className="text-gray-600">Tổng quan và quản lý các hoạt động của bộ phận</p>
        </div>

        {/* Under Development Notice */}
        <div className="bg-white rounded-lg shadow-sm border-2 border-yellow-200 p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Construction className="w-24 h-24 text-yellow-500 mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Trang đang được phát triển</h2>
            <p className="text-gray-600 text-lg mb-2">
              Chức năng này đang trong quá trình xây dựng và hoàn thiện.
            </p>
            <p className="text-gray-500">
              Vui lòng quay lại sau. Xin cảm ơn!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralManagement;
