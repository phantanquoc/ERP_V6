import React, { useState, useEffect } from 'react';
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
import LeaveRequestManagement from '@components/LeaveRequestManagement';
import DatePicker from '@components/DatePicker';
import employeeService from '@services/employeeService';
import employeeEvaluationService, { EmployeeEvaluation } from '@services/employeeEvaluationService';
import attendanceService, { AttendanceRecord } from '@services/attendanceService';

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
  const [activeTab, setActiveTab] = useState<'employees' | 'positions' | 'responsibilities' | 'levels' | 'evaluations' | 'payroll' | 'attendance' | 'leave-requests' | 'users'>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [evaluations, setEvaluations] = useState<EmployeeEvaluation[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

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
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadAttendances();
  }, [selectedDate]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeeService.getAllEmployees(1, 1000); // Get all employees
      setEmployees(response.data);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEvaluations = async () => {
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
    { id: 'employees', name: 'Danh sách nhân viên', icon: <Users className="w-4 h-4" /> },
    { id: 'positions', name: 'Quản lý vị trí', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'levels', name: 'Quản lý cấp độ & lương', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'responsibilities', name: 'Danh sách trách nhiệm', icon: <FileText className="w-4 h-4" /> },
    { id: 'evaluations', name: 'Đánh giá nhân viên', icon: <Star className="w-4 h-4" /> },
    { id: 'payroll', name: 'Bảng tính lương', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'attendance', name: 'Bảng điểm danh nhân viên', icon: <FileText className="w-4 h-4" /> },
    { id: 'leave-requests', name: 'Danh sách đơn nghỉ phép', icon: <Calendar className="w-4 h-4" /> },
    { id: 'users', name: 'Quản lý user', icon: <Lock className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <Users className="w-8 h-8 text-blue-600 mr-3" />
            Phòng chất lượng nhân sự
          </h1>
          <p className="text-gray-600">Quản lý nhân viên, trách nhiệm, đánh giá và lương bổng</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Tổng quan nhân viên */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-blue-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Tổng quan nhân viên
              </h3>
            </div>
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-3 hover:bg-blue-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-blue-300 cursor-pointer">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Tổng nhân viên</span>
                  <span className="text-2xl font-bold text-blue-600">{employees.length}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">{employees.filter(emp => emp.contractType === 'PERMANENT').length}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Chính thức</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">{employees.filter(emp => emp.contractType === 'PROBATION').length}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Thử việc</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">{employees.filter(emp => emp.contractType === 'PART_TIME').length}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Bán thời gian</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tổng quan đánh giá */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-yellow-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <Star className="w-5 h-5 mr-2 text-yellow-500" />
                Tổng quan đánh giá
              </h3>
            </div>

            {/* Month/Year Filter */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700">Tháng</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-gray-50 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-colors"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700">Năm</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-gray-50 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-colors"
                >
                  {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-3 hover:bg-blue-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-blue-300 cursor-pointer">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Đã đánh giá</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {evaluations.filter(e => e.supervisorScore2 > 0).length}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-50 rounded-lg p-2 text-center hover:bg-green-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-green-300 cursor-pointer">
                  <div className="text-xl font-bold text-green-600">{evaluations.filter(e => e.supervisorScore2 > 100).length}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Vượt KPI</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 text-center hover:bg-blue-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-blue-300 cursor-pointer">
                  <div className="text-xl font-bold text-blue-600">{evaluations.filter(e => e.supervisorScore2 === 100).length}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Đạt KPI</div>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center hover:bg-red-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-red-300 cursor-pointer">
                  <div className="text-xl font-bold text-red-600">{evaluations.filter(e => e.supervisorScore2 > 0 && e.supervisorScore2 < 100).length}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Chưa đạt</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tổng quan điểm danh */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-purple-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <Calendar className="w-5 h-5 mr-2 text-purple-600" />
                Tổng quan điểm danh
              </h3>
            </div>

            {/* Date Filter */}
            <div className="mb-3">
              <DatePicker
                label="Ngày"
                value={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                placeholder="Chọn ngày điểm danh"
              />
            </div>

            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-3 hover:bg-blue-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-blue-300 cursor-pointer">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Tổng điểm danh</span>
                  <span className="text-2xl font-bold text-blue-600">{attendances.length}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-50 rounded-lg p-2 text-center hover:bg-green-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-green-300 cursor-pointer">
                  <div className="text-xl font-bold text-green-600">{attendances.filter(a => a.checkInTime !== null).length}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Đã vào</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 text-center hover:bg-blue-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-blue-300 cursor-pointer">
                  <div className="text-xl font-bold text-blue-600">{attendances.filter(a => a.checkOutTime !== null).length}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Đã ra</div>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center hover:bg-red-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-red-300 cursor-pointer">
                  <div className="text-xl font-bold text-red-600">{employees.length - attendances.length}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Chưa điểm danh</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
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
            <EmployeeManagement />
          )}

          {/* QUẢN LÝ VỊ TRÍ */}
          {activeTab === 'positions' && (
            <PositionManagement />
          )}

          {/* QUẢN LÝ CẤP ĐỘ & LƯƠNG */}
          {activeTab === 'levels' && (
            <PositionLevelManagement />
          )}

          {/* DANH SÁCH TRÁCH NHIỆM */}
          {activeTab === 'responsibilities' && (
            <ResponsibilityManagement />
          )}

          {/* ĐÁNH GIÁ NHÂN VIÊN */}
          {activeTab === 'evaluations' && (
            <EmployeeEvaluationManagement />
          )}

          {/* BẢNG TÍNH LƯƠNG */}
          {activeTab === 'payroll' && (
            <PayrollManagement />
          )}

          {/* BẢNG ĐIỂM DANH NHÂN VIÊN */}
          {activeTab === 'attendance' && (
            <AttendanceManagement />
          )}

          {/* DANH SÁCH ĐƠN NGHỈ PHÉP */}
          {activeTab === 'leave-requests' && (
            <LeaveRequestManagement />
          )}

          {/* QUẢN LÝ USER */}
          {activeTab === 'users' && (
            <div className="p-6">
              <UserManagement />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QualityPersonnel;
