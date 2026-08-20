import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  FileText,
  Star,
  DollarSign,
  Lock,
  Briefcase,
  Calendar
} from 'lucide-react';
import UserManagement from '@components/UserManagement';
import EmployeeManagement from '@components/EmployeeManagement';
import PositionManagement from '@components/PositionManagement';
import ResponsibilityManagement from '@components/ResponsibilityManagement';
import PositionLevelManagement from '@components/PositionLevelManagement';
import EmployeeEvaluationManagement from '@components/EmployeeEvaluationManagement';
import PayrollManagement from '@components/PayrollManagement';
import AttendanceManagement from '@components/AttendanceManagement';
import MonthlyTimesheetGrid from '@components/MonthlyTimesheetGrid';
import HolidayManager from '@components/HolidayManager';
import AttendanceCodeManager from '@components/AttendanceCodeManager';
import LeaveRequestManagement from '@components/LeaveRequestManagement';
import DatePicker from '@components/DatePicker';
import employeeService from '@services/employeeService';
import employeeEvaluationService, { EmployeeEvaluation } from '@services/employeeEvaluationService';
import attendanceService, { AttendanceRecord } from '@services/attendanceService';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/auth';
import { PageHeader } from '../../design-system/PageHeader';
import { SectionCard } from '../../design-system/SectionCard';
import { LoadingState, ErrorState } from '../../design-system/States';

interface Employee {
  id: string;
  employeeCode: string;
  contractType: string;
  status: string;
  user?: {
    firstName: string;
    lastName: string;
  };
}

const QualityPersonnel = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const positionIdParam = searchParams.get('positionId') || undefined;
  // /api/employees now allows EMPLOYEE (read-only) + ADMIN | DEPARTMENT_HEAD | TEAM_LEAD
  const canViewEmployees = user?.role === UserRole.ADMIN
    || user?.role === UserRole.DEPARTMENT_HEAD
    || user?.role === UserRole.TEAM_LEAD
    || user?.role === UserRole.EMPLOYEE;
  // /api/employee-evaluations/evaluations now allows TEAM_LEAD + EMPLOYEE (read-only) + ADMIN | DEPARTMENT_HEAD
  const canViewEvaluations = user?.role === UserRole.ADMIN
    || user?.role === UserRole.DEPARTMENT_HEAD
    || user?.role === UserRole.TEAM_LEAD
    || user?.role === UserRole.EMPLOYEE;

  const VALID_TABS = ['employees', 'positions', 'responsibilities', 'levels', 'evaluations', 'payroll', 'attendance', 'monthly-timesheet', 'holidays', 'attendance-codes', 'leave-requests', 'users'];
  const [activeTab, setActiveTab] = useState<'employees' | 'positions' | 'responsibilities' | 'levels' | 'evaluations' | 'payroll' | 'attendance' | 'monthly-timesheet' | 'holidays' | 'attendance-codes' | 'leave-requests' | 'users'>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && VALID_TABS.includes(tabParam)) return tabParam as any;
    if (!user?.role) return 'attendance';
    if (user.role === UserRole.EMPLOYEE && canViewEmployees) return 'employees';
    return 'employees';
  });

  useEffect(() => {
    const currentTab = searchParams.get('tab');
    const currentPosId = searchParams.get('positionId');
    if (currentTab !== activeTab) {
      // Keep positionId if the new tab was triggered by a cross-link (positionId present)
      // but clear it when the user manually clicks a tab (no positionId in current params)
      const params: Record<string, string> = { tab: activeTab };
      if (currentPosId && currentTab !== activeTab) {
        // Don't carry positionId across manual tab switches
      }
      setSearchParams(params, { replace: true });
    }
  }, [activeTab]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [evaluations, setEvaluations] = useState<EmployeeEvaluation[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  // Evaluation filters
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Attendance filter
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    loadEvaluations();
  }, [selectedMonth, selectedYear, canViewEvaluations]);

  useEffect(() => {
    loadAttendances();
  }, [selectedDate]);

  const loadEmployees = async () => {
    if (!canViewEmployees) {
      setEmployees([]);
      return;
    }
    try {
      setPageLoading(true);
      const response = await employeeService.getAllEmployees(1, 1000); // Get all employees
      setEmployees(response.data);
    } catch (error) {
      console.error('Error loading employees:', error);
      setPageError('Không thể tải danh sách nhân viên');
    } finally {
      setPageLoading(false);
    }
  };

  const loadEvaluations = async () => {
    if (!canViewEvaluations) {
      setEvaluations([]);
      return;
    }
    try {
      const data = await employeeEvaluationService.getEmployeeEvaluations(selectedMonth, selectedYear);
      setEvaluations(data);
    } catch (error) {
      console.error('Error loading evaluations:', error);
    }
  };

  const loadAttendances = async () => {
    try {
      // Create start and end of day for the selected date
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const data = await attendanceService.getAttendanceByDateRange(
        startOfDay.toISOString(),
        endOfDay.toISOString()
      );
      setAttendances(data);
      console.log('Loaded attendances for', selectedDate, ':', data);
    } catch (error) {
      console.error('Error loading attendances:', error);
    }
  };

  const tabs = [
    { id: 'employees', name: 'Danh sách nhân viên', icon: <Users className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE] },
    { id: 'positions', name: 'Quản lý vị trí', icon: <Briefcase className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD] },
    { id: 'levels', name: 'Quản lý cấp độ & lương', icon: <DollarSign className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD] },
    { id: 'responsibilities', name: 'Danh sách trách nhiệm', icon: <FileText className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD] },
    { id: 'evaluations', name: 'Đánh giá nhân viên', icon: <Star className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE] },
    { id: 'payroll', name: 'Bảng tính lương', icon: <DollarSign className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE] },
    { id: 'attendance', name: 'Bảng điểm danh nhân viên', icon: <FileText className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE] },
    { id: 'monthly-timesheet', name: 'Chấm công tháng', icon: <Calendar className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE] },
    { id: 'holidays', name: 'Ngày lễ', icon: <Calendar className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE] },
    { id: 'attendance-codes', name: 'Mã chấm công', icon: <FileText className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE] },
    { id: 'leave-requests', name: 'Danh sách đơn nghỉ phép', icon: <Calendar className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE] },
    { id: 'users', name: 'Quản lý user', icon: <Lock className="w-4 h-4" />, roles: [UserRole.ADMIN] },
  ].filter(tab => !user?.role || tab.roles.includes(user.role as UserRole));

  return (
    <div className="space-y-5">
        <PageHeader
          title="Phòng chất lượng nhân sự"
          description="Quản lý nhân viên, trách nhiệm, đánh giá và lương bổng"
          icon={<Users className="w-6 h-6 text-violet-500" />}
        />

        {pageLoading && (
          <div className="py-8">
            <LoadingState message="Đang tải dữ liệu nhân sự..." />
          </div>
        )}
        {pageError && !pageLoading && (
          <ErrorState message={pageError} onRetry={() => { setPageError(null); loadEmployees(); }} />
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
          {/* Tổng quan nhân viên */}
          <div onClick={() => setActiveTab('employees')} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:border-gray-300 hover:shadow-md transition-all duration-200 cursor-pointer">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-violet-500" />
              <h3 className="text-sm font-semibold text-gray-700">Tổng quan nhân viên</h3>
            </div>
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500">Tổng nhân viên</span>
                  <span className="text-2xl font-bold text-gray-800">{employees.length}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-gray-800">{employees.filter(emp => emp.contractType === 'PERMANENT').length}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Chính thức</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-gray-800">{employees.filter(emp => emp.contractType === 'PROBATION').length}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Thử việc</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-gray-800">{employees.filter(emp => emp.contractType === 'PART_TIME').length}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Bán thời gian</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tổng quan đánh giá */}
          <div onClick={() => setActiveTab('evaluations')} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:border-gray-300 hover:shadow-md transition-all duration-200 cursor-pointer">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-700">Tổng quan đánh giá</h3>
            </div>

            {/* Month/Year Filter */}
            <div className="grid grid-cols-2 gap-2 mb-3" onClick={e => e.stopPropagation()}>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500">Tháng</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500">Năm</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500">Đã đánh giá</span>
                  <span className="text-2xl font-bold text-gray-800">
                    {evaluations.filter(e => e.supervisorScore2 > 0).length}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-emerald-600">{evaluations.filter(e => e.supervisorScore2 > 100).length}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Vượt KPI</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-blue-600">{evaluations.filter(e => e.supervisorScore2 === 100).length}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Đạt KPI</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-red-500">{evaluations.filter(e => e.supervisorScore2 > 0 && e.supervisorScore2 < 100).length}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Chưa đạt</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tổng quan điểm danh */}
          <div onClick={() => setActiveTab('attendance')} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:border-gray-300 hover:shadow-md transition-all duration-200 cursor-pointer">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-violet-500" />
              <h3 className="text-sm font-semibold text-gray-700">Tổng quan điểm danh</h3>
            </div>

            {/* Date Filter */}
            <div className="mb-3" onClick={e => e.stopPropagation()}>
              <DatePicker
                label="Ngày"
                value={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                placeholder="Chọn ngày điểm danh"
              />
            </div>

            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500">Tổng điểm danh</span>
                  <span className="text-2xl font-bold text-gray-800">{attendances.filter(a => a.status !== 'OVERTIME').length}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-emerald-600">{attendances.filter(a => a.status !== 'OVERTIME' && a.checkInTimes?.length > 0).length}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Đã vào</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-blue-600">{attendances.filter(a => a.status !== 'OVERTIME' && a.checkOutTimes?.length > 0).length}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Đã ra</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-red-500">{employees.length - attendances.filter(a => a.status !== 'OVERTIME').length}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Chưa điểm danh</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-5">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-6 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    // Clear positionId when user manually clicks a tab
                    setSearchParams({ tab: tab.id }, { replace: true });
                  }}
                  className={`min-h-[44px] py-2.5 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-violet-500 text-violet-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
        <div>
          {/* DANH SÁCH NHÂN VIÊN */}
          {activeTab === 'employees' && (
            <SectionCard padded={false}><div className="p-4"><EmployeeManagement /></div></SectionCard>
          )}

          {/* QUẢN LÝ VỊ TRÍ */}
          {activeTab === 'positions' && (
            <SectionCard padded={false}><div className="p-4"><PositionManagement initialPositionId={positionIdParam} /></div></SectionCard>
          )}

          {/* QUẢN LÝ CẤP ĐỘ & LƯƠNG */}
          {activeTab === 'levels' && (
            <SectionCard padded={false}><div className="p-4"><PositionLevelManagement initialPositionId={positionIdParam} /></div></SectionCard>
          )}

          {/* DANH SÁCH TRÁCH NHIỆM */}
          {activeTab === 'responsibilities' && (
            <SectionCard padded={false}><div className="p-4"><ResponsibilityManagement initialPositionId={positionIdParam} /></div></SectionCard>
          )}

          {/* ĐÁNH GIÁ NHÂN VIÊN */}
          {activeTab === 'evaluations' && (
            <SectionCard padded={false}><div className="p-4"><EmployeeEvaluationManagement /></div></SectionCard>
          )}

          {/* BẢNG TÍNH LƯƠNG */}
          {activeTab === 'payroll' && (
            <SectionCard padded={false}><div className="p-4"><PayrollManagement /></div></SectionCard>
          )}

          {/* BẢNG ĐIỂM DANH NHÂN VIÊN */}
          {activeTab === 'attendance' && (
            <SectionCard padded={false}><div className="p-4"><AttendanceManagement /></div></SectionCard>
          )}

          {/* CHẤM CÔNG THÁNG */}
          {activeTab === 'monthly-timesheet' && (
            <SectionCard padded={false}><div className="p-4"><MonthlyTimesheetGrid /></div></SectionCard>
          )}

          {/* NGÀY LỄ */}
          {activeTab === 'holidays' && (
            <SectionCard padded={false}><div className="p-4"><HolidayManager /></div></SectionCard>
          )}

          {/* MÃ CHẤM CÔNG */}
          {activeTab === 'attendance-codes' && (
            <SectionCard padded={false}><div className="p-4"><AttendanceCodeManager /></div></SectionCard>
          )}

          {/* DANH SÁCH ĐƠN NGHỈ PHÉP */}
          {activeTab === 'leave-requests' && (
            <SectionCard padded={false}><div className="p-4"><LeaveRequestManagement /></div></SectionCard>
          )}

          {/* QUẢN LÝ USER */}
          {activeTab === 'users' && (
            <SectionCard padded={false}><div className="p-4"><UserManagement /></div></SectionCard>
          )}
        </div>
    </div>
  );
};

export default QualityPersonnel;
