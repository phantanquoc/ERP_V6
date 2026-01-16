import { useState } from 'react';
import {
  Activity,
  Wrench,
  CheckCircle,
  Package,
  Search,
  Filter,
  Download,
  Plus,
  Edit,
  Eye,
  Trash2,
  Settings,
  Server
} from 'lucide-react';
import OrderManagement from '../../components/OrderManagement';
import MachineActivityReport from '../../components/MachineActivityReport';
import RepairRequestList from '../../components/RepairRequestList';
import MachineSystemList from '../../components/MachineSystemList';

type TabType = 'machineActivity' | 'repairRequests' | 'acceptance' | 'orders' | 'machineSystems';

const TechnicalQuality = () => {
  const [activeTab, setActiveTab] = useState<TabType>('machineActivity');
  const [searchTerm, setSearchTerm] = useState('');

  // Dữ liệu sẽ được load từ API
  const acceptanceData: any[] = [];

  const tabs = [
    { id: 'machineActivity', name: 'Báo cáo hoạt động của máy', icon: <Activity className="w-4 h-4" /> },
    { id: 'repairRequests', name: 'Danh sách yêu cầu sửa chữa', icon: <Wrench className="w-4 h-4" /> },
    { id: 'acceptance', name: 'Danh sách nghiệm thu bàn giao', icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'orders', name: 'Danh sách đơn hàng', icon: <Package className="w-4 h-4" /> },
    { id: 'machineSystems', name: 'Danh sách hệ thống máy', icon: <Server className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <Settings className="w-8 h-8 text-blue-600 mr-3" />
            Phòng QLHTM
          </h1>
          <p className="text-gray-600">Quản lý hệ thống máy và thiết bị</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Báo cáo hoạt động */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Activity className="w-5 h-5 text-blue-600 mr-2" />
              Hoạt động máy
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng báo cáo</span>
                <span className="text-lg font-bold text-blue-600">-</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Hoạt động tốt</span>
                <span className="text-lg font-bold text-green-600">-</span>
              </div>
            </div>
          </div>

          {/* Yêu cầu sửa chữa */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Wrench className="w-5 h-5 text-orange-600 mr-2" />
              Yêu cầu sửa chữa
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng yêu cầu</span>
                <span className="text-lg font-bold text-orange-600">0</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Khẩn cấp</span>
                <span className="text-lg font-bold text-red-600">0</span>
              </div>
            </div>
          </div>

          {/* Nghiệm thu */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              Nghiệm thu
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng nghiệm thu</span>
                <span className="text-lg font-bold text-green-600">0</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đạt yêu cầu</span>
                <span className="text-lg font-bold text-blue-600">0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  {tab.name}
                  {tab.count !== undefined && (
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Action Bar - Hide for orders tab */}
        {activeTab !== 'orders' && (
          <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                  />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                  <Filter className="h-4 w-4" />
                  Lọc
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                  <Download className="h-4 w-4" />
                  Xuất Excel
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  <Plus className="h-4 w-4" />
                  Thêm mới
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* BÁO CÁO HOẠT ĐỘNG CỦA MÁY */}
          {activeTab === 'machineActivity' && (
            <div className="p-6">
              <MachineActivityReport />
            </div>
          )}

          {/* DANH SÁCH YÊU CẦU SỬA CHỮA */}
          {activeTab === 'repairRequests' && (
            <div className="p-6">
              <RepairRequestList />
            </div>
          )}

          {/* DANH SÁCH NGHIỆM THU BÀN GIAO */}
          {activeTab === 'acceptance' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã nghiệm thu</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày nghiệm thu</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên công trình</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn vị thi công</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn vị nghiệm thu</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kết quả</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người nghiệm thu</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {acceptanceData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center">
                        <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">Chưa có dữ liệu nghiệm thu</p>
                      </td>
                    </tr>
                  ) : (
                    acceptanceData.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.maNghiemThu}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(item.ngayNghiemThu).toLocaleDateString('vi-VN')}</td>
                        <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">{item.tenCongTrinh}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{item.donViThiCong}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{item.donViNghiemThu}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.ketQua === 'Đạt' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item.ketQua}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.nguoiNghiemThu}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <button className="text-blue-600 hover:text-blue-800" title="Xem chi tiết">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="text-green-600 hover:text-green-800" title="Chỉnh sửa">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button className="text-red-600 hover:text-red-800" title="Xóa">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* DANH SÁCH ĐƠN HÀNG */}
          {activeTab === 'orders' && (
            <div className="p-6">
              <OrderManagement hideHeader={true} />
            </div>
          )}

          {/* DANH SÁCH HỆ THỐNG MÁY */}
          {activeTab === 'machineSystems' && (
            <div>
              <MachineSystemList />
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default TechnicalQuality;
