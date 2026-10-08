import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MaintenancePlanList from './MaintenancePlanList';
import MaintenanceRecordList from './MaintenanceRecordList';

type SubView = 'plans' | 'records';
export type MaintenanceView = SubView;

const VALID: SubView[] = ['plans', 'records'];
const SUB_VIEWS: { key: SubView; label: string }[] = [
  { key: 'plans', label: 'Kế hoạch bảo dưỡng' },
  { key: 'records', label: 'Biên bản BD/SC' },
];
const isSubView =(v: string | null): v is SubView => (VALID as string[]).includes(v ?? '');

/**
 * URL params owned by each sub-view. Switching sub-view drops them all so a
 * page/filter/detail param from one list never leaks into the other
 * (e.g. records page 4 opening plans on an empty page 4).
 */
const SUB_VIEW_PARAMS: Record<SubView, readonly string[]> = {
  plans: ['planPage', 'planQ', 'nam', 'trangThai', 'machineSystemId', 'planId', 'planMonth', 'mode'],
  records: ['recPage', 'recQ', 'loai', 'machineSystemId', 'recordId'],
};
// Legacy shared params from before namespacing — also cleared on switch.
const LEGACY_PARAMS = ['page', 'q'];

type MaintenanceTabProps = {
  activeView?: SubView;
  onViewChange?: (v: SubView) => void;
  lockedMachineSystemId?: string;
};

const MaintenanceTab = ({ activeView: controlledView, onViewChange, lockedMachineSystemId }: MaintenanceTabProps = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial: SubView = isSubView(searchParams.get('mView')) ? (searchParams.get('mView') as SubView) : 'plans';
  const [internalView, setInternalView] = useState<SubView>(initial);
  const subView = controlledView ?? internalView;
  const syncingRef = useRef(false);

  useEffect(() => {
    if (controlledView !== undefined) return;
    const v = searchParams.get('mView');
    if (isSubView(v) && v !== subView) setInternalView(v);
  }, [searchParams, controlledView]);

  const setView = (v: SubView) => {
    if (onViewChange) {
      onViewChange(v);
      return;
    }
    if (v === subView) return;
    setInternalView(v);
    const next = new URLSearchParams(searchParams);
    next.set('mView', v);
    for (const key of [...SUB_VIEW_PARAMS.plans, ...SUB_VIEW_PARAMS.records, ...LEGACY_PARAMS]) next.delete(key);
    syncingRef.current = true;
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="flex flex-col gap-4">
      {!lockedMachineSystemId && (
        <div>
          <h2 className="text-base font-semibold text-gray-900">Bảo dưỡng thiết bị</h2>
          <p className="text-xs text-gray-500">Kế hoạch định kỳ và biên bản thực hiện bảo dưỡng/sửa chữa theo hệ thống máy.</p>
        </div>
      )}
      <div className="inline-flex w-fit gap-1 rounded-lg bg-gray-100 p-1" role="group" aria-label="Chọn danh sách bảo dưỡng">
        {SUB_VIEWS.map(({ key, label }) => {
          const active = subView === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              aria-pressed={active}
              className={`h-8 px-3 text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                active ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {subView === 'plans' && <MaintenancePlanList lockedMachineSystemId={lockedMachineSystemId} />}
      {subView === 'records' && <MaintenanceRecordList lockedMachineSystemId={lockedMachineSystemId} />}
    </div>
  );
};

export default MaintenanceTab;
