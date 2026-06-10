import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  Wrench,
  Package,
  Settings,
  Server,
} from 'lucide-react';
import OrderManagement from '../../components/OrderManagement';
import MachineActivityReport from '../../components/MachineActivityReport';
import RepairRequestList from '../../components/RepairRequestList';
import MachineSystemList from '../../components/MachineSystemList';

type TabType = 'machineSystems' | 'machineActivity' | 'orders' | 'repairRequests';

const TechnicalQuality = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'machineSystems';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Sync tab to URL when changed
  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [activeTab]);

  // Sync tab when URL query param changes (e.g. from notification click)
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType | null;
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const tabs = [
    { id: 'machineSystems', name: 'Danh sách hệ thống máy', icon: <Server className="w-4 h-4" /> },
    { id: 'machineActivity', name: 'Báo cáo hoạt động của máy', icon: <Activity className="w-4 h-4" /> },
    { id: 'orders', name: 'Danh sách đơn hàng', icon: <Package className="w-4 h-4" /> },
    { id: 'repairRequests', name: 'Sửa chữa & Nghiệm thu', icon: <Wrench className="w-4 h-4" /> },
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
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
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

          {/* SỬA CHỮA & NGHIỆM THU */}
          {activeTab === 'repairRequests' && (
            <div className="p-6">
              <RepairRequestList />
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
