import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import OrderManagement from '../../components/OrderManagement';
import RepairRequestList from '../../components/RepairRequestList';
import MachineSystemList from '../../components/MachineSystemList';
import MaintenanceTab from '../../components/MaintenanceTab';
import FaultRecordList from '../../components/FaultRecordList';
import SparePartList from '../../components/SparePartList';

type TabType = 'machineSystems' | 'repairAndFault' | 'maintenance' | 'partsAndOrders';

const tabs: { key: TabType; label: string }[] = [
  { key: 'machineSystems', label: 'Hệ thống máy' },
  { key: 'repairAndFault', label: 'Sửa chữa & Lỗi' },
  { key: 'maintenance', label: 'Bảo dưỡng' },
  { key: 'partsAndOrders', label: 'Linh kiện & Đơn hàng' },
];

const isTabType = (value: string | null): value is TabType =>
  tabs.some((tab) => tab.key === value);

type RepairFaultView = 'repair' | 'fault';
type PartsOrdersView = 'parts' | 'orders';

const TechnicalQuality = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = isTabType(tabParam) ? tabParam : 'machineSystems';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [repairFaultView, setRepairFaultView] = useState<RepairFaultView>('repair');
  const [partsOrdersView, setPartsOrdersView] = useState<PartsOrdersView>('parts');

  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab !== activeTab) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', activeTab);
      setSearchParams(next, { replace: true });
    }
  }, [activeTab]);

  useEffect(() => {
    const nextTab = searchParams.get('tab');
    if (isTabType(nextTab) && nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-blue-600" />
          Phòng đảm bảo và cải tiến
        </h1>
        <p className="text-sm text-gray-500 mt-1">Đảm bảo vận hành hệ thống và cải tiến quy trình</p>
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

      {activeTab === 'repairAndFault' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setRepairFaultView('repair')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                repairFaultView === 'repair'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Yêu cầu sửa chữa
            </button>
            <button
              onClick={() => setRepairFaultView('fault')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                repairFaultView === 'fault'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Danh sách lỗi
            </button>
          </div>

          {repairFaultView === 'repair' && <RepairRequestList />}
          {repairFaultView === 'fault' && <FaultRecordList />}
        </div>
      )}

      {activeTab === 'maintenance' && <MaintenanceTab />}

      {activeTab === 'partsAndOrders' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setPartsOrdersView('parts')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                partsOrdersView === 'parts'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Linh kiện
            </button>
            <button
              onClick={() => setPartsOrdersView('orders')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                partsOrdersView === 'orders'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Đơn hàng
            </button>
          </div>

          {partsOrdersView === 'parts' && <SparePartList />}
          {partsOrdersView === 'orders' && <OrderManagement hideHeader={true} />}
        </div>
      )}
    </div>
  );
};

export default TechnicalQuality;
