import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MaintenancePlanList from './MaintenancePlanList';
import MaintenanceRecordList from './MaintenanceRecordList';

type SubView = 'plans' | 'records';
export type MaintenanceView = SubView;

const VALID: SubView[] = ['plans', 'records'];
const isSubView = (v: string | null): v is SubView => (VALID as string[]).includes(v ?? '');

type MaintenanceTabProps = {
  activeView?: SubView;
  onViewChange?: (v: SubView) => void;
};

const MaintenanceTab = ({ activeView: controlledView, onViewChange }: MaintenanceTabProps = {}) => {
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
    setInternalView(v);
    const next = new URLSearchParams(searchParams);
    next.set('mView', v);
    syncingRef.current = true;
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setView('plans')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            subView === 'plans'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Kế hoạch bảo dưỡng
        </button>
        <button
          onClick={() => setView('records')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            subView === 'records'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Biên bản BD/SC
        </button>
      </div>

      {subView === 'plans' && <MaintenancePlanList />}
      {subView === 'records' && <MaintenanceRecordList />}
    </div>
  );
};

export default MaintenanceTab;
