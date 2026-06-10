import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Cog } from 'lucide-react';
import OrderManagement from '../../components/OrderManagement';
import MachineActivityReport from '../../components/MachineActivityReport';
import RepairRequestList from '../../components/RepairRequestList';
import MachineSystemList from '../../components/MachineSystemList';

type TabType = 'machineSystems' | 'machineActivity' | 'orders' | 'repairRequests';

const tabs: { key: TabType; label: string }[] = [
  { key: 'machineSystems', label: 'Hệ thống máy' },
  { key: 'machineActivity', label: 'Báo cáo hoạt động' },
  { key: 'orders', label: 'Đơn hàng' },
  { key: 'repairRequests', label: 'Sửa chữa & Nghiệm thu' },
];

const TechnicalQuality = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'machineSystems';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [activeTab]);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType | null;
    if (tabParam && tabParam !== activeTab) {
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
      {activeTab === 'machineActivity' && <MachineActivityReport />}
      {activeTab === 'orders' && <OrderManagement hideHeader={true} />}
      {activeTab === 'repairRequests' && <RepairRequestList />}
    </div>
  );
};

export default TechnicalQuality;
