import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import OrderManagement from '../../components/OrderManagement';
import { useQuery } from '@tanstack/react-query';
import inspectionRequestService from '../../services/inspectionRequestService';
import repairRequestService from '../../services/repairRequestService';
import RepairRequestList from '../../components/RepairRequestList';
import InspectionRequestList from '../../components/InspectionRequestList';
import MachineSystemList from '../../components/MachineSystemList';
import MaintenanceTab from '../../components/MaintenanceTab';
import FaultRecordList from '../../components/FaultRecordList';
import SparePartList from '../../components/SparePartList';
import PageHeader from '../../design-system/PageHeader';
import SectionCard from '../../design-system/SectionCard';

type TabType = 'inspections' | 'repairs' | 'faults' | 'machineSystems' | 'maintenance' | 'spareParts' | 'orders';

const tabs: { key: TabType; label: string }[] = [
  { key: 'inspections', label: 'Danh sách yêu cầu kiểm tra' },
  { key: 'repairs', label: 'Danh sách sửa chữa' },
  { key: 'faults', label: 'Danh sách lỗi' },
  { key: 'machineSystems', label: 'Danh sách hệ thống máy' },
  { key: 'maintenance', label: 'Danh sách bảo dưỡng' },
  { key: 'spareParts', label: 'Danh sách linh kiện' },
  { key: 'orders', label: 'Danh sách đơn hàng' },
];

const isTabType = (value: string | null): value is TabType =>
  tabs.some((tab) => tab.key === value);

const BADGE_CLS = 'ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white min-w-[18px]';

const TechnicalQuality = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  // Badge = số phiếu chưa HOÀN_THÀNH trên toàn thời gian (không giới hạn 90 ngày như /stats).
  // Dùng count trực tiếp qua pagination.total (limit=1) cho chính xác, refetch định kỳ.
  const PENDING_INSPECTION = ['CHO_XU_LY','DA_TIEP_NHAN','DANG_KIEM_TRA','DA_KIEM_TRA','CHO_NGHIEM_THU'] as const;
  const PENDING_REPAIR = ['CHO_XU_LY','DA_TIEP_NHAN','LEN_KE_HOACH','DANG_SUA_CHUA','CHO_NGHIEM_THU','DA_NGHIEM_THU'] as const;
  const inspectionPendingQ = useQuery({
    queryKey: ['badge','inspections','pending'] as const,
    queryFn: async () => {
      let total = 0;
      for (const s of PENDING_INSPECTION) {
        const res: any = await inspectionRequestService.getAll({ page: 1, limit: 1, trangThai: s as any });
        total += res?.pagination?.total ?? res?.data?.length ?? 0;
      }
      return total;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const repairPendingQ = useQuery({
    queryKey: ['badge','repairs','pending'] as const,
    queryFn: async () => {
      let total = 0;
      for (const s of PENDING_REPAIR) {
        const res: any = await repairRequestService.getAll({ page: 1, limit: 1, trangThai: s as any, requestType: 'SUA_CHUA' as any });
        total += res?.pagination?.total ?? res?.data?.length ?? 0;
      }
      return total;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const countInspections = inspectionPendingQ.data ?? 0;
  const countRepairs = repairPendingQ.data ?? 0;
  const badgeFor = (key: TabType): number | null => {
    if (key === 'inspections') return countInspections > 0 ? countInspections : null;
    if (key === 'repairs') return countRepairs > 0 ? countRepairs : null;
    return null;
  };

  const tabParam = searchParams.get('tab');
  const initialTab: TabType = isTabType(tabParam) ? tabParam : 'inspections';

  // Deep-link params determine initial tab when URL has no valid ?tab
  const deepRepairId = searchParams.get('repairId') ?? searchParams.get('repairRequestId');
  const deepInspectionId = searchParams.get('inspectionId') ?? searchParams.get('inspectionRequestId');
  const deepFaultId = searchParams.get('faultId') ?? searchParams.get('faultRecordId');
  const deepPartId = searchParams.get('partId') ?? searchParams.get('sparePartId');
  const deepTabFromParams: TabType | null = (() => {
    if (deepRepairId) return 'repairs';
    if (deepInspectionId) return 'inspections';
    if (deepFaultId) return 'faults';
    if (deepPartId) return 'spareParts';
    return null;
  })();
  const resolvedInitialTab = !isTabType(tabParam) && deepTabFromParams ? deepTabFromParams : initialTab;

  const [activeTab, setActiveTab] = useState<TabType>(resolvedInitialTab);

  const syncingRef = useRef(false);

  const urlTab = searchParams.get('tab');

  useEffect(() => {
    if (syncingRef.current) {
      syncingRef.current = false;
      return;
    }
    // Deep-link forces correct tab (repairId → repairs etc.)
    if (deepRepairId && activeTab !== 'repairs') {
      setActiveTab('repairs');
      return;
    }
    if (deepInspectionId && activeTab !== 'inspections') {
      setActiveTab('inspections');
      return;
    }
    if (deepFaultId && activeTab !== 'faults') {
      setActiveTab('faults');
      return;
    }
    if (deepPartId && activeTab !== 'spareParts') {
      setActiveTab('spareParts');
      return;
    }
    if (isTabType(urlTab) && urlTab !== activeTab && !deepRepairId && !deepInspectionId && !deepFaultId && !deepPartId) {
      setActiveTab(urlTab);
    }
  }, [urlTab, deepRepairId, deepInspectionId, deepFaultId, deepPartId, activeTab]);

  const pushParams = useCallback((nextTab: TabType) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', nextTab);
    // Clean legacy params per 4C — no sub/type/requestType
    next.delete('sub');
    next.delete('type');
    next.delete('requestType');
    syncingRef.current = true;
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    pushParams(tab);
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
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {tabs.map((tab) => {
            const badge = badgeFor(tab.key);
            return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap inline-flex items-center ${
                activeTab === tab.key
                  ? 'border-cyan-500 text-cyan-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {badge != null && <span className={BADGE_CLS}>{badge > 99 ? '99+' : badge}</span>}
            </button>
          );})}
        </nav>
      </div>

      {/* Content — each tab renders a single component */}
      {activeTab === 'inspections' && (
        <SectionCard bodyClassName="">
          <InspectionRequestList />
        </SectionCard>
      )}

      {activeTab === 'repairs' && (
        <SectionCard bodyClassName="">
          <RepairRequestList />
        </SectionCard>
      )}

      {activeTab === 'faults' && (
        <SectionCard bodyClassName="">
          <FaultRecordList />
        </SectionCard>
      )}

      {activeTab === 'machineSystems' && (
        <SectionCard bodyClassName="">
          <MachineSystemList />
        </SectionCard>
      )}

      {activeTab === 'maintenance' && (
        <SectionCard bodyClassName="">
          <MaintenanceTab />
        </SectionCard>
      )}

      {activeTab === 'spareParts' && (
        <SectionCard bodyClassName="">
          <SparePartList />
        </SectionCard>
      )}

      {activeTab === 'orders' && (
        <SectionCard bodyClassName="">
          <OrderManagement hideHeader={true} />
        </SectionCard>
      )}
    </div>
  );
};

export default TechnicalQuality;
