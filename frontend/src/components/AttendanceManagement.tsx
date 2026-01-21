import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Filter, Download } from 'lucide-react';
import attendanceService from '@services/attendanceService';
import employeeService from '@services/employeeService';
import DatePicker from './DatePicker';

interface AttendanceRecord {
  stt: number;
  id: string;
  employeeCode: string;
  employeeName: string;
  positionName: string;
  attendanceDate: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  workHours: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EARLY' | 'ON_LEAVE';
  notes: string | null;
}

const AttendanceManagement: React.FC = () => {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('');
  const [formData, setFormData] = useState({
    employeeCode: '',
    attendanceDate: new Date().toISOString().split('T')[0],
    checkInTime: '',
    checkOutTime: '',
    status: 'PRESENT' as const,
    notes: '',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchAttendances();
  }, [startDate, endDate]);

  const fetchEmployees = async () => {
    try {
      const response = await employeeService.getAllEmployees(1, 1000);
      console.log('Loaded employees:', response.data);
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchAttendances = async () => {
    try {
      setLoading(true);
      const data = await attendanceService.getAttendanceByDateRange(startDate, endDate);
      setAttendances(data);
    } catch (error) {
      console.error('Error fetching attendances:', error);
      alert('Lỗi khi tải dữ liệu điểm danh');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingId(null);
    setSelectedEmployeeName('');
    setFormData({
      employeeCode: '',
      attendanceDate: new Date().toISOString().split('T')[0],
      checkInTime: '',
      checkOutTime: '',
      status: 'PRESENT',
      notes: '',
    });
    setShowModal(true);
  };

  const handleEmployeeCodeChange = (code: string) => {
    setFormData({ ...formData, employeeCode: code });

    console.log('Searching for employee code:', code);
    console.log('Available employees:', employees.length);

    // Find employee by code
    const employee = employees.find(emp => emp.employeeCode === code);
    console.log('Found employee:', employee);

    if (employee) {
      const fullName = `${employee.user.firstName} ${employee.user.lastName}`;
      console.log('Employee name:', fullName);
      setSelectedEmployeeName(fullName);
    } else {
      setSelectedEmployeeName('');
    }
  };

  const handleEdit = (record: AttendanceRecord) => {
    setEditingId(record.id);
    setSelectedEmployeeName(record.employeeName);

    // Convert UTC time to local time for editing
    const getLocalTimeString = (dateTimeString: string | null) => {
      if (!dateTimeString) return '';
      const date = new Date(dateTimeString);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    setFormData({
      employeeCode: record.employeeCode,
      attendanceDate: record.attendanceDate.split('T')[0],
      checkInTime: getLocalTimeString(record.checkInTime),
      checkOutTime: getLocalTimeString(record.checkOutTime),
      status: record.status,
      notes: record.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      console.log('Form data:', formData);

      if (!formData.employeeCode || !formData.attendanceDate) {
        alert('Vui lòng điền đầy đủ thông tin');
        return;
      }

      if (editingId) {
        const updateData = {
          checkInTime: formData.checkInTime ? `${formData.attendanceDate}T${formData.checkInTime}:00` : undefined,
          checkOutTime: formData.checkOutTime ? `${formData.attendanceDate}T${formData.checkOutTime}:00` : undefined,
          status: formData.status,
          notes: formData.notes || undefined,
        };
        console.log('Updating attendance:', updateData);
        await attendanceService.updateAttendance(editingId, updateData);
        alert('Cập nhật điểm danh thành công');
      } else {
        const createData = {
          employeeCode: formData.employeeCode,
          attendanceDate: formData.attendanceDate,
          checkInTime: formData.checkInTime ? `${formData.attendanceDate}T${formData.checkInTime}:00` : undefined,
          checkOutTime: formData.checkOutTime ? `${formData.attendanceDate}T${formData.checkOutTime}:00` : undefined,
          status: formData.status,
          notes: formData.notes || undefined,
        };
        console.log('Creating attendance:', createData);
        await attendanceService.createAttendance(createData);
        alert('Thêm điểm danh thành công');
      }

      setShowModal(false);
      fetchAttendances();
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Lỗi khi lưu dữ liệu điểm danh: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) return;

    try {
      await attendanceService.deleteAttendance(id);
      alert('Xóa điểm danh thành công');
      fetchAttendances();
    } catch (error) {
      console.error('Error deleting attendance:', error);
      alert('Lỗi khi xóa dữ liệu điểm danh');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'text-green-700 font-medium';
      case 'ABSENT':
        return 'text-red-700 font-medium';
      case 'LATE':
        return 'text-yellow-700 font-medium';
      case 'EARLY':
        return 'text-blue-700 font-medium';
      case 'ON_LEAVE':
        return 'text-purple-700 font-medium';
      default:
        return 'text-gray-700 font-medium';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PRESENT: 'Có mặt',
      ABSENT: 'Vắng mặt',
      LATE: 'Muộn',
      EARLY: 'Sớm',
      ON_LEAVE: 'Nghỉ phép',
    };
    return labels[status] || status;
  };

  const formatTime = (dateTimeString: string | null) => {
    if (!dateTimeString) return '-';
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const filteredAttendances = attendances.filter(
    item =>
      item.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Bảng Điểm Danh Nhân Viên</h2>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Thêm mới
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <DatePicker
              label="Từ ngày"
              value={startDate}
              onChange={(date) => setStartDate(date)}
              maxDate={endDate}
              placeholder="Chọn ngày bắt đầu"
            />
          </div>
          <div className="flex-1">
            <DatePicker
              label="Đến ngày"
              value={endDate}
              onChange={(date) => setEndDate(date)}
              minDate={startDate}
              placeholder="Chọn ngày kết thúc"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tìm kiếm</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Tìm theo mã hoặc tên nhân viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
        ) : filteredAttendances.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Không có dữ liệu điểm danh</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">STT</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã NV</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên nhân viên</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Chức vụ</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Ngày điểm danh</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Giờ vào</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Giờ ra</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Số giờ</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Trạng thái</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Ghi chú</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendances.map((record, index) => (
                  <tr
                    key={record.id}
                    className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">{record.stt}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-blue-600 border-r border-gray-200">
                      {record.employeeCode}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                      {record.employeeName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                      {record.positionName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                      {new Date(record.attendanceDate).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                      {formatTime(record.checkInTime)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                      {formatTime(record.checkOutTime)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                      {record.workHours.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center border-r border-gray-200">
                      <span className={`text-sm ${getStatusColor(record.status)}`}>
                        {getStatusLabel(record.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                      {record.notes || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleEdit(record)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {editingId ? 'Chỉnh sửa điểm danh' : 'Thêm điểm danh'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã nhân viên</label>
                <input
                  type="text"
                  value={formData.employeeCode}
                  onChange={(e) => handleEmployeeCodeChange(e.target.value)}
                  placeholder="Nhập mã nhân viên"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!!editingId}
                />
                {formData.employeeCode && !selectedEmployeeName && !editingId && (
                  <p className="mt-1 text-sm text-red-600">
                    ✗ Không tìm thấy nhân viên
                  </p>
                )}
              </div>

              {selectedEmployeeName && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên nhân viên</label>
                  <input
                    type="text"
                    value={selectedEmployeeName}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-medium"
                  />
                </div>
              )}

              <div>
                <DatePicker
                  label="Ngày điểm danh"
                  value={formData.attendanceDate}
                  onChange={(date) => setFormData({ ...formData, attendanceDate: date })}
                  placeholder="Chọn ngày điểm danh"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ vào</label>
                  <input
                    type="time"
                    value={formData.checkInTime}
                    onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ ra</label>
                  <input
                    type="time"
                    value={formData.checkOutTime}
                    onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PRESENT">Có mặt</option>
                  <option value="ABSENT">Vắng mặt</option>
                  <option value="LATE">Muộn</option>
                  <option value="EARLY">Sớm</option>
                  <option value="ON_LEAVE">Nghỉ phép</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Nhập ghi chú (nếu có)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceManagement;

