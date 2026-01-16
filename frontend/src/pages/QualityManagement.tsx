const StatCard = ({ title, value, valueClass = "text-red-600" }: { title: string; value: string | number; valueClass?: string; }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-6 text-center shadow-sm hover:shadow-md transition-shadow duration-200">
    <div className="text-sm font-medium text-gray-600 mb-3">{title}</div>
    <div className={`text-3xl font-bold ${valueClass}`}>{String(value).padStart(2, '0')}</div>
  </div>
);

const DetailBox = ({ title, data }: { title: string; data: { label: string; value: string | number }[] }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
    <div className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">{title}</div>
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="flex justify-between items-center">
          <span className="text-gray-600">{item.label}</span>
          <span className="font-semibold text-gray-800">{item.value}</span>
        </div>
      ))}
    </div>
  </div>
);

const QualityManagement = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bộ phận chất lượng</h1>
          <p className="text-gray-600">Quản lý và đảm bảo chất lượng sản phẩm, quy trình</p>
        </div>

        {/* Báo cáo */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <div className="w-1 h-6 bg-blue-600 mr-3 rounded"></div>
            Báo cáo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Đề nghị bổ sung quy trình" value="" valueClass="text-gray-600" />
            <StatCard title="Điểm không phù hợp" value={12} valueClass="text-red-600" />
            <StatCard title="Vi phạm quy định" value={8} valueClass="text-red-600" />
            <StatCard title="Khách hàng phàn nàn" value={5} valueClass="text-red-600" />
          </div>
        </div>

        {/* Phòng chất lượng nhân sự */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <div className="w-1 h-6 bg-green-600 mr-3 rounded"></div>
            Phòng chất lượng nhân sự
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <DetailBox
              title="DANH SÁCH NHÂN VIÊN"
              data={[
                { label: "Tổng số nhân viên", value: 48 },
                { label: "Nhân viên chính thức", value: 40 },
                { label: "Nhân viên thử việc", value: 8 }
              ]}
            />
            <DetailBox
              title="DANH SÁCH TRÁCH NHIỆM"
              data={[
                { label: "Tổng số trách nhiệm", value: 48 },
                { label: "Nhân viên chính thức", value: 40 },
                { label: "Nhân viên thử việc", value: 8 }
              ]}
            />
            <DetailBox
              title="ĐÁNH GIÁ NHÂN VIÊN"
              data={[
                { label: "Tổng số trách nhiệm", value: 48 },
                { label: "Nhân viên chính thức", value: 40 },
                { label: "Nhân viên thử việc", value: 8 }
              ]}
            />
            <DetailBox
              title="BẢNG LƯƠNG NHÂN VIÊN"
              data={[
                { label: "Tổng số trách nhiệm", value: 48 },
                { label: "Nhân viên chính thức", value: 40 },
                { label: "Nhân viên thử việc", value: 8 }
              ]}
            />
          </div>
        </div>

        {/* Phòng chất lượng quy trình */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <div className="w-1 h-6 bg-purple-600 mr-3 rounded"></div>
            Phòng chất lượng quy trình
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            <DetailBox
              title="DANH SÁCH QUY TRÌNH"
              data={[
                { label: "Tổng số nhân viên", value: 48 },
                { label: "Nhân viên chính thức", value: 40 },
                { label: "Nhân viên thử việc", value: 8 }
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default QualityManagement;
