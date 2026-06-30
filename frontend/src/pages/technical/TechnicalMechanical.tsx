import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Zap } from 'lucide-react';
import FaultRecordList from '../../components/FaultRecordList';
import SparePartList from '../../components/SparePartList';

type TabType = 'faultRecords' | 'spareParts';

const TechnicalMechanical = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'faultRecords';
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
    const tabParam = searchParams.get('tab') as TabType | null;
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const tabs: { key: TabType; label: string }[] = [
    { key: 'faultRecords', label: 'Danh sách lỗi' },
    { key: 'spareParts', label: 'Linh kiện' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Zap className="w-6 h-6 text-blue-600" />
          Phòng cơ - điện
        </h1>
        <p className="text-sm text-gray-500 mt-1">Quản lý danh sách lỗi và linh kiện</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px">
          {tabs.map(tab => (
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
      {activeTab === 'faultRecords' && <FaultRecordList />}
      {activeTab === 'spareParts' && <SparePartList />}
    </div>
  );
};

export default TechnicalMechanical;
