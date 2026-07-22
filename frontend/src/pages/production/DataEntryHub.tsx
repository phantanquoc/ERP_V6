import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { markTab } from '../../utils/kioskSession';
import { Package, Leaf, HelpCircle } from 'lucide-react';

const DataEntryHub: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    markTab('DATA_ENTRY_HUB');
  }, []);

  const entryTypes = [
    {
      key: 'production-output',
      title: 'Sản lượng chiên',
      description: 'Nhập dữ liệu sản lượng thành phẩm',
      icon: Package,
      route: '/production/nhap-lieu',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      key: 'material-evaluation',
      title: 'Đánh giá nguyên liệu',
      description: 'Nhập kết quả đánh giá chất lượng nguyên liệu',
      icon: Leaf,
      route: '/production/nhap-lieu-danh-gia',
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      key: 'placeholder',
      title: 'Loại nhập liệu thứ 3',
      description: 'Dành chỗ cho loại nhập liệu trong tương lai',
      icon: HelpCircle,
      route: null,
      color: 'bg-gray-300 cursor-not-allowed',
      disabled: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Tablet Nhập Liệu
          </h1>
          <p className="text-gray-600 text-lg">
            Chọn loại nhập liệu bạn muốn thực hiện
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {entryTypes.map((entry) => {
            const Icon = entry.icon;
            return (
              <button
                key={entry.key}
                onClick={() => {
                  if (entry.route && !entry.disabled) {
                    navigate(entry.route);
                  }
                }}
                disabled={entry.disabled}
                className={`${entry.color} text-white rounded-2xl p-8 shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex flex-col items-center text-center ${
                  entry.disabled ? 'opacity-50' : ''
                }`}
              >
                <div className="bg-white bg-opacity-20 rounded-full p-6 mb-4">
                  <Icon size={64} strokeWidth={1.5} />
                </div>
                <h2 className="text-2xl font-bold mb-2">{entry.title}</h2>
                <p className="text-sm opacity-90">{entry.description}</p>
                {entry.disabled && (
                  <span className="mt-4 text-xs bg-white bg-opacity-20 px-3 py-1 rounded-full">
                    Đang phát triển
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Vui lòng chọn loại nhập liệu phù hợp với công việc của bạn</p>
        </div>
      </div>
    </div>
  );
};

export default DataEntryHub;
