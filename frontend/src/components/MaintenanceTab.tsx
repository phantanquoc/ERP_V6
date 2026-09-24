import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MaintenancePlanList from './MaintenancePlanList';
import MaintenanceRecordList from './MaintenanceRecordList';

type SubView = 'plans' | 'records';

const VALID: SubView[] = ['plans', 'records'];
const isSubView = (v: string | null): v is SubView => (VALID as string[]).includes(v ?? '');

const MaintenanceTab = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial: SubView = isSubView(searchParams.get('mView')) ? (searchParams.get('mView') as SubView) : 'plans';
  const [subView, setSubView] = useState<SubView>(initial);
  const syncingRef = useRef(false);

  useEffect(() => {
    const v = searchParams.get('mView');
    if (isSubView(v) && v !== subView) setSubView(v);
  }, [searchParams]);

  const setView = (v: SubView) => {
    setSubView(v);
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
