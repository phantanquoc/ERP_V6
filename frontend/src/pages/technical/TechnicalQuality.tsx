import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import OrderManagement from '../../components/OrderManagement';
import RepairRequestList from '../../components/RepairRequestList';
import InspectionRequestList from '../../components/InspectionRequestList';
import MachineSystemList from '../../components/MachineSystemList';
import MaintenanceTab from '../../components/MaintenanceTab';
import FaultRecordList from '../../components/FaultRecordList';
import SparePartList from '../../components/SparePartList';
import PageHeader from '../../design-system/PageHeader';
import SectionCard from '../../design-system/SectionCard';
import { useRepairRequestStats } from '../../hooks/useRepairRequests';
import { useInspectionRequestStats } from '../../hooks/useInspectionRequests';
import { useFaultRecordStats } from '../../hooks/useFaultRecords';

type TabType = 'machineSystems' | 'repairAndFault' | 'maintenance' | 'partsAndOrders';

const tabs: { key: TabType; label: string }[] = [
  { key: 'machineSystems', label: 'Hệ thống máy' },
  { key: 'repairAndFault', label: 'Sửa chữa & Lỗi' },
  { key: 'maintenance', label: 'Bảo dưỡng' },
  { key: 'partsAndOrders', label: 'Linh kiện & Đơn hàng' },
];

const isTabType = (value: string | null): value is TabType =>
  tabs.some((tab) => tab.key === value);

type RepairTab = 'kiem_tra' | 'sua_chua' | 'loi';
type PartsOrdersView = 'parts' | 'orders';
type MaintenanceView = 'plans' | 'records';

const isPartsOrdersView = (v: string | null): v is PartsOrdersView => v === 'parts' || v === 'orders';
const isMaintenanceView = (v: string | null): v is MaintenanceView => v === 'plans' || v === 'records';

function deriveRepairTab(searchParams: URLSearchParams): RepairTab {
  const sub = searchParams.get('sub');
  const type = (searchParams.get('type') ?? searchParams.get('requestType') ?? '').toUpperCase();
  if (sub === 'fault') return 'loi';
  if (type === 'KIEM_TRA') return 'kiem_tra';
  if (type === 'SUA_CHUA') return 'sua_chua';
  // no type — default to kiem_tra so one pill is active (keeps 3-pill UX consistent)
  if (sub === 'repair' || sub == null) return 'kiem_tra';
  return 'kiem_tra';
}

const TechnicalQuality = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const subParam = searchParams.get('sub');
  const initialTab = isTabType(tabParam) ? tabParam : 'machineSystems';
  const initialRepairTab: RepairTab = tabParam === 'repairAndFault' ? deriveRepairTab(searchParams) : 'kiem_tra';
  const initialParts = tabParam === 'partsAndOrders' && isPartsOrdersView(subParam) ? subParam : 'parts';
  const initialMaintenance: MaintenanceView = tabParam === 'maintenance' && isMaintenanceView(subParam) ? subParam : 'plans';

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [repairTab, setRepairTab] = useState<RepairTab>(initialRepairTab);
  const [partsOrdersView, setPartsOrdersView] = useState<PartsOrdersView>(initialParts);
  const [maintenanceView, setMaintenanceView] = useState<MaintenanceView>(initialMaintenance);

  const deepFaultId = searchParams.get('faultId') ?? searchParams.get('faultRecordId');
  const deepRepairId = searchParams.get('repairId') ?? searchParams.get('repairRequestId');

  // badge counts — best-effort, no hard failure if stats down
  const repairStatsQ = useRepairRequestStats();
  const inspectionStatsQ = useInspectionRequestStats();
  const faultStatsQ = useFaultRecordStats();
  const kiemTraCount = (inspectionStatsQ.data?.data as unknown as { total?: number } | undefined)?.total ?? (repairStatsQ.data?.data as unknown as { byRequestType?: Record<string, number> } | undefined)?.byRequestType?.['KIEM_TRA'];
  const suaChuaCount = (repairStatsQ.data?.data as unknown as { byRequestType?: Record<string, number> } | undefined)?.byRequestType?.['SUA_CHUA'];
  // fault total: stats shape varies — try total / byStatus sum
  const faultCount = (() => {
    const d = faultStatsQ.data?.data as unknown as { total?: number; byStatus?: Record<string, number> } | undefined;
    if (!d) return undefined;
    if (typeof d.total === 'number') return d.total;
    if (d.byStatus) return Object.values(d.byStatus).reduce((a, b) => a + (b as number), 0);
    return undefined;
  })();

  const syncingRef = useRef(false);

  const urlTab = searchParams.get('tab');
  const urlSub = searchParams.get('sub');
  const urlType = searchParams.get('type') ?? searchParams.get('requestType');
  useEffect(() => {
    if (syncingRef.current) {
      syncingRef.current = false;
      return;
    }
    if ((deepFaultId || deepRepairId) && activeTab !== 'repairAndFault') {
      setActiveTab('repairAndFault');
    }
    // deep-link forces correct pill
    if (deepFaultId && repairTab !== 'loi') {
      setRepairTab('loi');
      return;
    }
    if (deepRepairId && !deepFaultId) {
      // keep current repairTab derived from type if present, else default; don't force
      const derived = deriveRepairTab(searchParams);
      if (derived !== 'loi' && derived !== repairTab) {
        setRepairTab(derived);
        return;
      }
    }
    const nextTab = urlTab;
    const nextSub = urlSub;
    const nextType = urlType;
    if (isTabType(nextTab) && nextTab !== activeTab && !deepFaultId && !deepRepairId) {
      setActiveTab(nextTab);
    }
    if (nextTab === 'repairAndFault' && !deepFaultId && !deepRepairId) {
      const derived = deriveRepairTab(new URLSearchParams({ ...(nextSub ? { sub: nextSub } : {}), ...(nextType ? { type: nextType } : {}) } as never) as unknown as URLSearchParams);
      // reconstruct from live searchParams instead of partial to avoid missing keys
      const liveDerived = deriveRepairTab(searchParams);
      void derived;
      if (liveDerived !== repairTab) setRepairTab(liveDerived);
    }
    if (nextTab === 'partsAndOrders' && isPartsOrdersView(nextSub) && nextSub !== partsOrdersView) {
      setPartsOrdersView(nextSub);
    }
    if (nextTab === 'maintenance' && isMaintenanceView(nextSub) && nextSub !== maintenanceView) {
      setMaintenanceView(nextSub);
    }
  }, [urlTab, urlSub, urlType, deepFaultId, deepRepairId]);

  const pushParams = useCallback((nextTab: TabType, nextSub?: string | null, nextType?: string | null) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', nextTab);
    const needsSub = nextTab === 'repairAndFault' || nextTab === 'partsAndOrders' || nextTab === 'maintenance';
    if (needsSub && nextSub) next.set('sub', nextSub);
    else if (nextTab !== 'repairAndFault') next.delete('sub');
    // for repairAndFault we always keep sub consistent; type only for repair pills
    if (nextTab === 'repairAndFault') {
      if (nextType) next.set('type', nextType);
      else next.delete('type');
      next.delete('requestType');
    }
    syncingRef.current = true;
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'repairAndFault') {
      const sub = repairTab === 'loi' ? 'fault' : 'repair';
      const type = repairTab === 'kiem_tra' ? 'kiem_tra' : repairTab === 'sua_chua' ? 'sua_chua' : null;
      pushParams(tab, sub, type);
      return;
    }
    const subForTab =
      tab === 'partsAndOrders' ? partsOrdersView
      : tab === 'maintenance' ? maintenanceView
      : null;
    pushParams(tab, subForTab);
  };

  const handleRepairTab = (v: RepairTab) => {
    setRepairTab(v);
    if (v === 'loi') pushParams('repairAndFault', 'fault', null);
    else if (v === 'kiem_tra') pushParams('repairAndFault', 'repair', 'kiem_tra');
    else pushParams('repairAndFault', 'repair', 'sua_chua');
  };

  const handlePartsView = (v: PartsOrdersView) => {
    setPartsOrdersView(v);
    pushParams('partsAndOrders', v);
  };

  const handleMaintenanceView = (v: MaintenanceView) => {
    setMaintenanceView(v);
    pushParams('maintenance', v);
  };

  const pillBase = 'px-4 py-2 text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-1.5';
  const pillActive = 'bg-cyan-500 text-white';
  const pillIdle = 'bg-gray-100 text-gray-700 hover:bg-gray-200';
  const badgeCls = 'ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-semibold bg-white/90 text-cyan-700 border border-cyan-200';
  const badgeIdleCls = 'ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-semibold bg-white text-gray-600 border border-gray-200';

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
                onClick={() => handleRepairTab('kiem_tra')}
                className={`${pillBase} ${repairTab === 'kiem_tra' ? pillActive : pillIdle}`}
              >
                Kiểm tra
                {typeof kiemTraCount === 'number' && <span className={repairTab === 'kiem_tra' ? badgeCls : badgeIdleCls}>{kiemTraCount}</span>}
              </button>
              <button
                onClick={() => handleRepairTab('sua_chua')}
                className={`${pillBase} ${repairTab === 'sua_chua' ? pillActive : pillIdle}`}
              >
                Sửa chữa
                {typeof suaChuaCount === 'number' && <span className={repairTab === 'sua_chua' ? badgeCls : badgeIdleCls}>{suaChuaCount}</span>}
              </button>
              <button
                onClick={() => handleRepairTab('loi')}
                className={`${pillBase} ${repairTab === 'loi' ? pillActive : pillIdle}`}
              >
                Lỗi
                {typeof faultCount === 'number' && <span className={repairTab === 'loi' ? badgeCls : badgeIdleCls}>{faultCount}</span>}
              </button>
            </div>
          }
        >
          {repairTab === 'loi' ? <FaultRecordList /> : repairTab === 'kiem_tra' ? <InspectionRequestList /> : <RepairRequestList />}
        </SectionCard>
      )}

      {activeTab === 'maintenance' && (
        <SectionCard bodyClassName="">
          <MaintenanceTab activeView={maintenanceView} onViewChange={handleMaintenanceView} />
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
