import { Construction, Wrench } from 'lucide-react';

const TechnicalManagement = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <Wrench className="w-8 h-8 text-red-600 mr-3" />
            Kỹ thuật
          </h1>
          <p className="text-gray-600">Quản lý và giám sát hệ thống kỹ thuật</p>
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

export default TechnicalManagement;
