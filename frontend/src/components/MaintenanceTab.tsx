import { useState } from 'react';
import MaintenancePlanList from './MaintenancePlanList';
import MaintenanceRecordList from './MaintenanceRecordList';

type SubView = 'plans' | 'records';

const MaintenanceTab = () => {
  const [subView, setSubView] = useState<SubView>('plans');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setSubView('plans')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            subView === 'plans'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Kế hoạch bảo dưỡng
        </button>
        <button
          onClick={() => setSubView('records')}
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
