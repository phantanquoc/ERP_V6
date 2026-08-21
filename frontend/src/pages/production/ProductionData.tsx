import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ClipboardCheck,
  TrendingUp,
  PackageCheck,
  Star,
  FlaskConical,
  Tablet,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import MaterialEvaluationManagement from '../../components/MaterialEvaluationManagement';
import SystemOperationManagement from '../../components/SystemOperationManagement';
import FinishedProductManagement from '../../components/FinishedProductManagement';
import QualityEvaluationManagement from '../../components/QualityEvaluationManagement';
import { activate as activateKiosk } from '../../utils/kioskSession';
import { getCurrentProductionDay } from '../../utils/productionDay';
import PageHeader from '../../design-system/PageHeader';

type Tab = 'materialEvaluation' | 'systemOperation' | 'finishedProduct' | 'qualityEvaluation';

const VALID_TABS: Tab[] = [
  'materialEvaluation',
  'systemOperation',
  'finishedProduct',
  'qualityEvaluation',
];

const tabs: { key: Tab; label: string; icon: JSX.Element }[] = [
  { key: 'materialEvaluation', label: 'Đánh giá nguyên liệu', icon: <ClipboardCheck className="w-4 h-4" /> },
  { key: 'systemOperation', label: 'Thông số vận hành hệ thống', icon: <TrendingUp className="w-4 h-4" /> },
  { key: 'finishedProduct', label: 'Thành phẩm đầu ra', icon: <PackageCheck className="w-4 h-4" /> },
  { key: 'qualityEvaluation', label: 'Đánh giá chất lượng', icon: <Star className="w-4 h-4" /> },
];

const ProductionData = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const tabParam = searchParams.get('tab');
    return VALID_TABS.includes(tabParam as Tab) ? (tabParam as Tab) : 'materialEvaluation';
  });
  const [selectedMaChien, setSelectedMaChien] = useState('');
  const [selectedThoiGianChien, setSelectedThoiGianChien] = useState('');

  // Production day filter — defaults to current production day (respects 06:30 boundary)
  const defaultProductionDay = useMemo(() => getCurrentProductionDay(), []);
  const [productionDay, setProductionDay] = useState<string>(defaultProductionDay);

  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleCreateSystemOperation = (maChien: string, thoiGianChien: string) => {
    setSelectedMaChien(maChien);
    setSelectedThoiGianChien(thoiGianChien);
    setActiveTab('systemOperation');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dữ liệu sản xuất"
        description="Đánh giá nguyên liệu, thông số vận hành, thành phẩm và đánh giá chất lượng"
        icon={<FlaskConical className="w-5 h-5 text-blue-600" />}
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Ngày SX:</label>
              <input
                type="date"
                value={productionDay}
                onChange={(e) => setProductionDay(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </span>
            <button
              onClick={() => {
                activateKiosk();
                if (activeTab === 'materialEvaluation') {
                  window.open('/production/nhap-lieu-danh-gia', '_blank');
                } else {
                  window.open('/production/nhap-lieu', '_blank');
                }
              }}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              title={activeTab === 'materialEvaluation'
                ? 'Mở trang nhập liệu đánh giá nguyên liệu dành cho tablet (tab mới)'
                : 'Mở trang nhập liệu sản lượng dành cho nhân viên trên tablet (tab mới)'}
            >
              <Tablet className="w-4 h-4" />
              {activeTab === 'materialEvaluation'
                ? 'Mở nhập liệu (Tablet)'
                : 'Mở nhập liệu sản lượng (Tablet)'}
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'materialEvaluation' && (
        <MaterialEvaluationManagement onCreateSystemOperation={handleCreateSystemOperation} productionDay={productionDay} />
      )}
      {activeTab === 'systemOperation' && (
        <SystemOperationManagement
          initialMaChien={selectedMaChien}
          initialThoiGianChien={selectedThoiGianChien}
          productionDay={productionDay}
        />
      )}
      {activeTab === 'finishedProduct' && <FinishedProductManagement productionDay={productionDay} />}
      {activeTab === 'qualityEvaluation' && <QualityEvaluationManagement productionDay={productionDay} />}
    </div>
  );
};

export default ProductionData;
