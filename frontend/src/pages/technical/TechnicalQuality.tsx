import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Cog } from 'lucide-react';
import OrderManagement from '../../components/OrderManagement';
import RepairRequestList from '../../components/RepairRequestList';
import MachineSystemList from '../../components/MachineSystemList';
import MaintenanceTab from '../../components/MaintenanceTab';

type TabType = 'machineSystems' | 'orders' | 'repairRequests' | 'maintenance';

const tabs: { key: TabType; label: string }[] = [
  { key: 'machineSystems', label: 'Hệ thống máy' },
  { key: 'orders', label: 'Đơn hàng' },
  { key: 'repairRequests', label: 'Sửa chữa & Nghiệm thu' },
  { key: 'maintenance', label: 'Bảo dưỡng & Sửa chữa' },
];

const isTabType = (value: string | null): value is TabType =>
  tabs.some((tab) => tab.key === value);

const TechnicalQuality = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = isTabType(tabParam) ? tabParam : 'machineSystems';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab !== activeTab) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', activeTab);
      setSearchParams(next, { replace: true });
    }
  }, [activeTab]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (isTabType(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Cog className="w-6 h-6 text-blue-600" />
          Phòng QLHTM
        </h1>
        <p className="text-sm text-gray-500 mt-1">Quản lý hệ thống máy và thiết bị</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'machineSystems' && <MachineSystemList />}
      {activeTab === 'orders' && <OrderManagement hideHeader={true} />}
      {activeTab === 'repairRequests' && <RepairRequestList />}
      {activeTab === 'maintenance' && <MaintenanceTab />}
    </div>
  );
};

export default TechnicalQuality;
