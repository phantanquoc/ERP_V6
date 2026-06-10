import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardCheck, TrendingUp, PackageCheck, FlaskConical } from 'lucide-react';
import MaterialEvaluationManagement from '../../components/MaterialEvaluationManagement';
import SystemOperationManagement from '../../components/SystemOperationManagement';
import FinishedProductManagement from '../../components/FinishedProductManagement';

type Tab = 'materialEvaluation' | 'systemOperation' | 'finishedProduct';
const VALID_TABS: Tab[] = ['materialEvaluation', 'systemOperation', 'finishedProduct'];

const tabs: { key: Tab; label: string }[] = [
  { key: 'materialEvaluation', label: 'Đánh giá nguyên liệu' },
  { key: 'systemOperation', label: 'Thông số vận hành hệ thống' },
  { key: 'finishedProduct', label: 'Thành phẩm đầu ra' },
];

const ProductionData = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const tabParam = searchParams.get('tab');
    return VALID_TABS.includes(tabParam as Tab) ? tabParam as Tab : 'materialEvaluation';
  });
  const [selectedMaChien, setSelectedMaChien] = useState('');
  const [selectedThoiGianChien, setSelectedThoiGianChien] = useState('');

  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [activeTab]);

  const handleCreateSystemOperation = (maChien: string, thoiGianChien: string) => {
    setSelectedMaChien(maChien);
    setSelectedThoiGianChien(thoiGianChien);
    setActiveTab('systemOperation');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-blue-600" />
          Dữ liệu sản xuất
        </h1>
        <p className="text-sm text-gray-500 mt-1">Đánh giá nguyên liệu, thông số vận hành và thành phẩm</p>
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
      {activeTab === 'materialEvaluation' && <MaterialEvaluationManagement onCreateSystemOperation={handleCreateSystemOperation} />}
      {activeTab === 'systemOperation' && (
        <SystemOperationManagement
          initialMaChien={selectedMaChien}
          initialThoiGianChien={selectedThoiGianChien}
        />
      )}
      {activeTab === 'finishedProduct' && <FinishedProductManagement />}
    </div>
  );
};

export default ProductionData;
