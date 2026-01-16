const StatCard = ({ title, value, valueClass = "text-blue-600" }: { title: string; value: string | number; valueClass?: string; }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-6 text-center shadow-sm hover:shadow-md transition-shadow duration-200">
    <div className="text-sm font-medium text-gray-600 mb-3">{title}</div>
    <div className={`text-3xl font-bold ${valueClass}`}>{String(value).padStart(2, '0')}</div>
  </div>
);

const SimpleBox = ({ title }: { title: string }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
    <div className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">{title}</div>
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Danh sách đơn hàng</span>
        <span className="font-semibold text-gray-800">08</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Đơn hàng chờ xuất</span>
        <span className="font-semibold text-gray-800">08</span>
      </div>
    </div>
  </div>
);

const GeneralManagement = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bộ phận tổng hợp</h1>
          <p className="text-gray-600">Tổng quan và quản lý các hoạt động của bộ phận</p>
        </div>

        {/* Báo cáo */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <div className="w-1 h-6 bg-blue-600 mr-3 rounded"></div>
            Báo cáo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Danh sách đơn hàng" value={8} valueClass="text-blue-600" />
            <StatCard title="Đơn hàng đang sản xuất" value={0} valueClass="text-orange-600" />
            <StatCard title="Đơn hàng chờ sản xuất" value={10} valueClass="text-green-600" />
            <StatCard title="Đơn hàng chờ xuất" value={5} valueClass="text-purple-600" />
          </div>
        </div>

        {/* Phòng chi phí và giá thành */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <div className="w-1 h-6 bg-green-600 mr-3 rounded"></div>
            Phòng chi phí và giá thành
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SimpleBox title="DANH SÁCH YCBG" />
            <SimpleBox title="DANH SÁCH BÁO GIÁ" />
            <SimpleBox title="DANH SÁCH ĐƠN HÀNG" />
          </div>
        </div>

        {/* Phòng chăm sóc */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <div className="w-1 h-6 bg-purple-600 mr-3 rounded"></div>
            Phòng chăm sóc
          </h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-gray-500 text-center py-8">Nội dung phòng chăm sóc sẽ được cập nhật sớm</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralManagement;
