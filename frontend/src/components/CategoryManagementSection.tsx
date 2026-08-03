import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, ChevronDown, ChevronUp, Database, Calendar, Clock, ClipboardList, Package, DollarSign, Cog, ExternalLink, Tags } from 'lucide-react';
import AttendanceCodeManager from './AttendanceCodeManager';
import HolidayManager from './HolidayManager';
import WorkShiftSettingsModal from './WorkShiftSettingsModal';
import CategorySettingsModal from './products/CategorySettingsModal';
import PayrollSettingsManager from './PayrollSettingsManager';
import MaterialCriteriaManager from './MaterialCriteriaManager';
import LookupManager from './LookupManager';
import internationalProductService from '../services/internationalProductService';

type SectionId = 'attendance' | 'holiday' | 'workshift' | 'category' | 'payroll' | 'process' | 'material' | 'lookup';

interface Section {
  id: SectionId;
  title: string;
  description: string;
  icon: React.ReactNode;
  /** Nhúng inline, mở/đóng bằng accordion. */
  component?: React.ReactNode;
  /** Mở modal có sẵn thay vì nhúng inline. */
  modal?: 'workshift' | 'category';
  /** Điều hướng sang trang riêng (component đó là full page, không nhúng được). */
  route?: string;
}

const CategoryManagementSection: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<SectionId | null>(null);
  const [showWorkShiftModal, setShowWorkShiftModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const navigate = useNavigate();

  const fetchCategories = useCallback(async () => {
    try {
      const response = await internationalProductService.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const sections: Section[] = [
    {
      id: 'attendance',
      title: 'Mã chấm công',
      description: 'Quản lý các mã chấm công (P, L, A, OT, v.v.)',
      icon: <ClipboardList className="w-5 h-5 text-blue-600" />,
      component: <AttendanceCodeManager />,
    },
    {
      id: 'holiday',
      title: 'Ngày nghỉ lễ',
      description: 'Quản lý các ngày lễ, tết trong năm',
      icon: <Calendar className="w-5 h-5 text-red-600" />,
      component: <HolidayManager />,
    },
    {
      id: 'workshift',
      title: 'Ca làm việc',
      description: 'Quản lý các ca làm việc (sáng, chiều, tối)',
      icon: <Clock className="w-5 h-5 text-purple-600" />,
      modal: 'workshift',
    },
    {
      id: 'category',
      title: 'Loại hàng hóa',
      description: 'Phân loại sản phẩm quốc tế',
      icon: <Package className="w-5 h-5 text-green-600" />,
      modal: 'category',
    },
    {
      id: 'payroll',
      title: 'Cài đặt bảng lương',
      description: 'Hệ số OT, phụ cấp, ngày công chuẩn',
      icon: <DollarSign className="w-5 h-5 text-yellow-600" />,
      component: <PayrollSettingsManager />,
    },
    {
      id: 'material',
      title: 'Tiêu chí đánh giá NVL',
      description: 'Tiêu chí đánh giá nguyên liệu đầu vào',
      icon: <Database className="w-5 h-5 text-teal-600" />,
      component: <MaterialCriteriaManager />,
    },
    {
      id: 'lookup',
      title: 'Danh mục dùng chung',
      description: 'Đơn vị tính, loại chi phí, phân loại vật tư, khu vực…',
      icon: <Tags className="w-5 h-5 text-orange-600" />,
      component: <LookupManager />,
    },
    {
      id: 'process',
      title: 'Loại quy trình',
      description: 'Quản lý các loại quy trình sản xuất',
      icon: <Cog className="w-5 h-5 text-indigo-600" />,
      route: '/quality/process-types',
    },
  ];

  const handleSectionClick = (section: Section) => {
    if (section.modal === 'workshift') {
      setShowWorkShiftModal(true);
    } else if (section.modal === 'category') {
      setShowCategoryModal(true);
    } else if (section.route) {
      navigate(section.route);
    } else if (section.component) {
      setExpandedSection(expandedSection === section.id ? null : section.id);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          Quản lý danh mục
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          Cài đặt các nhãn phân loại và tham số hệ thống
        </p>

        <div className="space-y-2">
          {sections.map((section) => (
            <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Section header */}
              <button
                type="button"
                onClick={() => handleSectionClick(section)}
                className={`w-full flex items-center justify-between px-4 py-3 transition-colors cursor-pointer ${
                  expandedSection === section.id ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {section.icon}
                  <div className="text-left">
                    <h3 className="text-sm font-medium text-gray-900">{section.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{section.description}</p>
                  </div>
                </div>
                {section.component ? (
                  expandedSection === section.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )
                ) : (
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Expanded content */}
              {expandedSection === section.id && section.component && (
                <div className="border-t border-gray-200 bg-gray-50">
                  {section.component}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            💡 <strong>Mẹo:</strong> Mục có mũi tên mở rộng ngay tại đây; mục có biểu tượng ↗ sẽ mở modal hoặc chuyển sang trang riêng.
          </p>
        </div>
      </div>

      {/* Modals */}
      <WorkShiftSettingsModal
        isOpen={showWorkShiftModal}
        onClose={() => setShowWorkShiftModal(false)}
      />
      <CategorySettingsModal
        isOpen={showCategoryModal}
        categories={categories}
        onClose={() => setShowCategoryModal(false)}
        onChanged={fetchCategories}
      />
    </>
  );
};

export default CategoryManagementSection;
