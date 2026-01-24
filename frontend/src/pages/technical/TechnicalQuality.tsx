import { useState, useEffect } from 'react';
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
  Server,
  X
} from 'lucide-react';
import OrderManagement from '../../components/OrderManagement';
import MachineActivityReport from '../../components/MachineActivityReport';
import RepairRequestList from '../../components/RepairRequestList';
import MachineSystemList from '../../components/MachineSystemList';
import acceptanceHandoverService, { AcceptanceHandover } from '../../services/acceptanceHandoverService';

type TabType = 'machineSystems' | 'machineActivity' | 'orders' | 'repairRequests' | 'acceptance';

const TechnicalQuality = () => {
  const [activeTab, setActiveTab] = useState<TabType>('machineSystems');
  const [searchTerm, setSearchTerm] = useState('');
  const [acceptanceData, setAcceptanceData] = useState<AcceptanceHandover[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAcceptance, setSelectedAcceptance] = useState<AcceptanceHandover | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Load acceptance handover data
  useEffect(() => {
    if (activeTab === 'acceptance') {
      loadAcceptanceData();
    }
  }, [activeTab]);

  const loadAcceptanceData = async () => {
    try {
      setLoading(true);
      const response = await acceptanceHandoverService.getAllAcceptanceHandovers(1, 100);
      setAcceptanceData(response.data || []);
    } catch (error) {
      console.error('Error loading acceptance data:', error);
      setAcceptanceData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAcceptance = (item: AcceptanceHandover) => {
    setSelectedAcceptance(item);
    setIsViewModalOpen(true);
  };

  const handleDeleteAcceptance = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nghiệm thu bàn giao này?')) return;

    try {
      await acceptanceHandoverService.deleteAcceptanceHandover(id);
      loadAcceptanceData();
    } catch (error: any) {
      alert(error.message || 'Lỗi khi xóa nghiệm thu bàn giao');
    }
  };

  const tabs = [
    { id: 'machineSystems', name: 'Danh sách hệ thống máy', icon: <Server className="w-4 h-4" /> },
    { id: 'machineActivity', name: 'Báo cáo hoạt động của máy', icon: <Activity className="w-4 h-4" /> },
    { id: 'orders', name: 'Danh sách đơn hàng', icon: <Package className="w-4 h-4" /> },
    { id: 'repairRequests', name: 'Danh sách yêu cầu sửa chữa', icon: <Wrench className="w-4 h-4" /> },
    { id: 'acceptance', name: 'Danh sách nghiệm thu bàn giao', icon: <CheckCircle className="w-4 h-4" /> }
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
                </button>
              ))}
            </nav>
          </div>
        </div>



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
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tháng</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã nghiệm thu</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã yêu cầu sửa chữa</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên hệ thống/thiết bị</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tình trạng trước khi sửa chữa</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tình trạng sau khi sửa chữa</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người bàn giao</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người nhận</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File đính kèm</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {acceptanceData.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-12 text-center">
                          <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500 text-lg">Chưa có dữ liệu nghiệm thu</p>
                        </td>
                      </tr>
                    ) : (
                      acceptanceData.map((item, index) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(item.ngayNghiemThu).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.maNghiemThu}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.maYeuCauSuaChua}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{item.tenHeThongThietBi}</td>
                          <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate" title={item.tinhTrangTruocSuaChua}>
                            {item.tinhTrangTruocSuaChua}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate" title={item.tinhTrangSauSuaChua}>
                            {item.tinhTrangSauSuaChua}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.nguoiBanGiao}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.nguoiNhan}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.fileDinhKem ? (
                              <a
                                href={`http://localhost:5000${item.fileDinhKem}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                              >
                                Xem file
                              </a>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleViewAcceptance(item)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteAcceptance(item.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
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

      {/* View Acceptance Handover Modal */}
      {isViewModalOpen && selectedAcceptance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Chi tiết nghiệm thu bàn giao</h2>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã nghiệm thu</label>
                  <p className="text-gray-900 font-semibold">{selectedAcceptance.maNghiemThu}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày nghiệm thu</label>
                  <p className="text-gray-900">{new Date(selectedAcceptance.ngayNghiemThu).toLocaleDateString('vi-VN')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã yêu cầu sửa chữa</label>
                  <p className="text-gray-900">{selectedAcceptance.maYeuCauSuaChua}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên hệ thống/thiết bị</label>
                  <p className="text-gray-900">{selectedAcceptance.tenHeThongThietBi}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tình trạng trước khi sửa chữa</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedAcceptance.tinhTrangTruocSuaChua}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tình trạng sau khi sửa chữa</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedAcceptance.tinhTrangSauSuaChua}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Người bàn giao</label>
                  <p className="text-gray-900">{selectedAcceptance.nguoiBanGiao}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Người nhận</label>
                  <p className="text-gray-900">{selectedAcceptance.nguoiNhan}</p>
                </div>
              </div>

              {selectedAcceptance.fileDinhKem && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File đính kèm</label>
                  <a
                    href={`http://localhost:5000${selectedAcceptance.fileDinhKem}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Xem file đính kèm
                  </a>
                </div>
              )}

              {selectedAcceptance.ghiChu && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedAcceptance.ghiChu}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-end">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicalQuality;
