import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardCheck, TrendingUp, PackageCheck } from 'lucide-react';
import MaterialEvaluationManagement from '../../components/MaterialEvaluationManagement';
import SystemOperationManagement from '../../components/SystemOperationManagement';
import FinishedProductManagement from '../../components/FinishedProductManagement';

type Tab = 'materialEvaluation' | 'systemOperation' | 'finishedProduct';
const VALID_TABS: Tab[] = ['materialEvaluation', 'systemOperation', 'finishedProduct'];

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

  const tabs = [
    { id: 'materialEvaluation' as Tab, name: 'Đánh giá nguyên liệu', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'systemOperation' as Tab, name: 'Thông số vận hành hệ thống', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'finishedProduct' as Tab, name: 'THÀNH PHẨM ĐẦU RA', icon: <PackageCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="px-2 sm:px-4 py-2 sm:py-4">
      {/* Tabs */}
      <div className="mb-3 sm:mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-2 sm:space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-900 hover:text-blue-600 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm">
        {activeTab === 'materialEvaluation' && (
          <div className="p-2 sm:p-6">
            <MaterialEvaluationManagement onCreateSystemOperation={handleCreateSystemOperation} />
          </div>
        )}
        {activeTab === 'systemOperation' && (
          <div className="p-2 sm:p-6">
            <SystemOperationManagement
              initialMaChien={selectedMaChien}
              initialThoiGianChien={selectedThoiGianChien}
            />
          </div>
        )}
        {activeTab === 'finishedProduct' && (
          <div className="p-2 sm:p-6">
            <FinishedProductManagement />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductionData;

