import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import OrderManagement from '../../components/OrderManagement';
import RepairRequestList from '../../components/RepairRequestList';
import MachineSystemList from '../../components/MachineSystemList';
import MaintenanceTab from '../../components/MaintenanceTab';
import FaultRecordList from '../../components/FaultRecordList';
import SparePartList from '../../components/SparePartList';
import PageHeader from '../../design-system/PageHeader';
import SectionCard from '../../design-system/SectionCard';

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

const isRepairFaultView = (v: string | null): v is RepairFaultView => v === 'repair' || v === 'fault';
const isPartsOrdersView = (v: string | null): v is PartsOrdersView => v === 'parts' || v === 'orders';

const TechnicalQuality = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const subParam = searchParams.get('sub');
  const initialTab = isTabType(tabParam) ? tabParam : 'machineSystems';
  const initialRepair = isRepairFaultView(subParam) ? subParam : 'repair';
  const initialParts = isPartsOrdersView(subParam) ? subParam : 'parts';

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [repairFaultView, setRepairFaultView] = useState<RepairFaultView>(initialRepair);
  const [partsOrdersView, setPartsOrdersView] = useState<PartsOrdersView>(initialParts);

  // Single URL → state sync. State → URL is via explicit setters (no second effect to avoid loop).
  const syncingRef = useRef(false);

  useEffect(() => {
    if (syncingRef.current) {
      syncingRef.current = false;
      return;
    }
    const nextTab = searchParams.get('tab');
    const nextSub = searchParams.get('sub');
    if (isTabType(nextTab) && nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
    if (nextTab === 'repairAndFault' && isRepairFaultView(nextSub) && nextSub !== repairFaultView) {
      setRepairFaultView(nextSub);
    }
    if (nextTab === 'partsAndOrders' && isPartsOrdersView(nextSub) && nextSub !== partsOrdersView) {
      setPartsOrdersView(nextSub);
    }
  }, [searchParams]);

  const pushParams = useCallback((nextTab: TabType, nextSub?: string | null) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', nextTab);
    if (nextSub) next.set('sub', nextSub);
    else next.delete('sub');
    syncingRef.current = true;
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // Persist sub when entering a tab that has one, so back/refresh/deep-link is consistent
    const subForTab =
      tab === 'repairAndFault' ? repairFaultView
      : tab === 'partsAndOrders' ? partsOrdersView
      : null;
    pushParams(tab, subForTab);
  };

  const handleRepairView = (v: RepairFaultView) => {
    setRepairFaultView(v);
    pushParams('repairAndFault', v);
  };

  const handlePartsView = (v: PartsOrdersView) => {
    setPartsOrdersView(v);
    pushParams('partsAndOrders', v);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Phòng đảm bảo và cải tiến"
        description="Đảm bảo vận hành hệ thống và cải tiến quy trình"
        icon={<ShieldCheck className="w-6 h-6 text-cyan-500" />}
      />

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-cyan-500 text-cyan-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content — every tab consistently wrapped in SectionCard */}
      {activeTab === 'machineSystems' && (
        <SectionCard bodyClassName="">
          <MachineSystemList />
        </SectionCard>
      )}

      {activeTab === 'repairAndFault' && (
        <SectionCard
          bodyClassName="space-y-4"
          action={
            <div className="flex gap-2">
              <button
                onClick={() => handleRepairView('repair')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  repairFaultView === 'repair'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Yêu cầu sửa chữa
              </button>
              <button
                onClick={() => handleRepairView('fault')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  repairFaultView === 'fault'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Danh sách lỗi
              </button>
            </div>
          }
        >
          {repairFaultView === 'repair' ? <RepairRequestList /> : <FaultRecordList />}
        </SectionCard>
      )}

      {activeTab === 'maintenance' && (
        <SectionCard bodyClassName="">
          <MaintenanceTab />
        </SectionCard>
      )}

      {activeTab === 'partsAndOrders' && (
        <SectionCard
          bodyClassName="space-y-4"
          action={
            <div className="flex gap-2">
              <button
                onClick={() => handlePartsView('parts')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  partsOrdersView === 'parts'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Linh kiện
              </button>
              <button
                onClick={() => handlePartsView('orders')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  partsOrdersView === 'orders'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Đơn hàng
              </button>
            </div>
          }
        >
          {partsOrdersView === 'parts' ? <SparePartList /> : <OrderManagement hideHeader={true} />}
        </SectionCard>
      )}
    </div>
  );
};

export default TechnicalQuality;
