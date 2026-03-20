import React, { useState } from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import WorkPlanListModal from './WorkPlanListModal';
import OvertimePlanListModal from './OvertimePlanListModal';

type Tab = 'workPlans' | 'overtimePlans';

interface PlanCombinedModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  defaultTab?: Tab;
}

const PlanCombinedModal: React.FC<PlanCombinedModalProps> = ({
  isOpen,
  onClose,
  isAdmin = false,
  defaultTab = 'workPlans',
}) => {
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-orange-500 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Kế hoạch</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            onClick={() => setActiveTab('workPlans')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'workPlans'
                ? 'border-purple-600 text-purple-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Kế hoạch công việc
          </button>
          <button
            onClick={() => setActiveTab('overtimePlans')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overtimePlans'
                ? 'border-orange-500 text-orange-500 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            Kế hoạch tăng ca
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'workPlans' && (
            <WorkPlanListModal
              isOpen={true}
              onClose={onClose}
              isAdmin={isAdmin}
              embedded={true}
            />
          )}
          {activeTab === 'overtimePlans' && (
            <OvertimePlanListModal
              isOpen={true}
              onClose={onClose}
              isAdmin={isAdmin}
              embedded={true}
            />
          )}
        </div>

      </div>
    </div>
  );
};

export default PlanCombinedModal;

