import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, X, Settings } from 'lucide-react';
import systemOperationService, { SystemOperation, GiaiDoan } from '../services/systemOperationService';
import machineService, { Machine } from '../services/machineService';

interface FormData {
  maChien: string;
  tenMay: string;
  thoiGianChien: string;
  khoiLuongDauVao: number;
  giaiDoan1: GiaiDoan;
  giaiDoan2: GiaiDoan;
  giaiDoan3: GiaiDoan;
  giaiDoan4: GiaiDoan;
  trangThai: 'DANG_HOAT_DONG' | 'BAO_TRI' | 'NGUNG_HOAT_DONG';
  ghiChu: string;
  nguoiThucHien: string;
}

interface SystemOperationManagementProps {
  initialMaChien?: string;
  initialThoiGianChien?: string;
}

const SystemOperationManagement: React.FC<SystemOperationManagementProps> = ({ initialMaChien, initialThoiGianChien }) => {
  const [operations, setOperations] = useState<SystemOperation[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<SystemOperation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<FormData>({
    maChien: '',
    tenMay: '',
    thoiGianChien: '',
    khoiLuongDauVao: 0,
    giaiDoan1: { thoiGian: 0, nhietDo: 0, apSuat: 0 },
    giaiDoan2: { thoiGian: 0, nhietDo: 0, apSuat: 0 },
    giaiDoan3: { thoiGian: 0, nhietDo: 0, apSuat: 0 },
    giaiDoan4: { thoiGian: 0, nhietDo: 0, apSuat: 0 },
    trangThai: 'DANG_HOAT_DONG',
    ghiChu: '',
    nguoiThucHien: '',
  });

  // Lấy danh sách operations của máy đang chọn
  const filteredOperations = operations.filter(op => op.tenMay === selectedMachine);

  // Map trạng thái máy sang trạng thái thông số vận hành
  const mapMachineStatusToOperationStatus = (machineStatus: string): 'DANG_HOAT_DONG' | 'BAO_TRI' | 'NGUNG_HOAT_DONG' => {
    switch (machineStatus) {
      case 'HOAT_DONG':
        return 'DANG_HOAT_DONG';
      case 'BẢO_TRÌ':
        return 'BAO_TRI';
      case 'NGỪNG_HOẠT_ĐỘNG':
        return 'NGUNG_HOAT_DONG';
      default:
        return 'DANG_HOAT_DONG';
    }
  };

  useEffect(() => {
    loadMachines();
  }, []);

  useEffect(() => {
    if (selectedMachine) {
      loadOperations();
    }
  }, [selectedMachine]);

  const loadMachines = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await machineService.getAllMachines(1, 100);
      setMachines(result.data);

      // Set first machine as selected if available
      if (result.data.length > 0 && !selectedMachine) {
        setSelectedMachine(result.data[0].tenMay);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi tải danh sách máy');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadOperations = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await systemOperationService.getAllSystemOperations(1, 1000, selectedMachine);
      setOperations(result.data);
    } catch (err: any) {
      setError(err.message || 'Lỗi tải dữ liệu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (datetime: string) => {
    if (!datetime) return '';
    try {
      const date = new Date(datetime);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes} ${day}/${month}/${year}`;
    } catch {
      return datetime;
    }
  };

  // Convert ISO datetime to datetime-local format (YYYY-MM-DDTHH:mm)
  const toDatetimeLocalFormat = (datetime: string) => {
    if (!datetime) return '';
    try {
      const date = new Date(datetime);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  // Hiển thị thông báo khi nhận được mã chiên từ đánh giá nguyên liệu
  useEffect(() => {
    if (initialMaChien && initialThoiGianChien) {
      console.log(`Nhận được mã chiên: ${initialMaChien}, thời gian: ${initialThoiGianChien}`);
    }
  }, [initialMaChien, initialThoiGianChien]);

  const handleOpenModal = (operation?: SystemOperation) => {
    if (operation) {
      setIsEditing(true);
      setSelectedOperation(operation);
      setFormData({
        maChien: operation.maChien,
        tenMay: operation.tenMay,
        thoiGianChien: toDatetimeLocalFormat(operation.thoiGianChien),
        khoiLuongDauVao: operation.khoiLuongDauVao || 0,
        giaiDoan1: operation.giaiDoan1,
        giaiDoan2: operation.giaiDoan2,
        giaiDoan3: operation.giaiDoan3,
        giaiDoan4: operation.giaiDoan4,
        trangThai: operation.trangThai,
        ghiChu: operation.ghiChu,
        nguoiThucHien: operation.nguoiThucHien,
      });
    } else {
      setIsEditing(false);
      setSelectedOperation(null);

      // Tìm máy hiện tại để lấy trạng thái
      const currentMachine = machines.find(m => m.tenMay === selectedMachine);
      const operationStatus = currentMachine
        ? mapMachineStatusToOperationStatus(currentMachine.trangThai)
        : 'DANG_HOAT_DONG';

      setFormData({
        maChien: initialMaChien || '',
        tenMay: selectedMachine,
        thoiGianChien: initialThoiGianChien || '',
        khoiLuongDauVao: 0,
        giaiDoan1: { thoiGian: 0, nhietDo: 0, apSuat: 0 },
        giaiDoan2: { thoiGian: 0, nhietDo: 0, apSuat: 0 },
        giaiDoan3: { thoiGian: 0, nhietDo: 0, apSuat: 0 },
        giaiDoan4: { thoiGian: 0, nhietDo: 0, apSuat: 0 },
        trangThai: operationStatus,
        ghiChu: '',
        nguoiThucHien: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOperation(null);
    setIsEditing(false);
  };

  const handleViewDetail = (operation: SystemOperation) => {
    setSelectedOperation(operation);
    setIsViewModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStageChange = (stage: 'giaiDoan1' | 'giaiDoan2' | 'giaiDoan3' | 'giaiDoan4', field: keyof GiaiDoan, value: string) => {
    setFormData(prev => ({
      ...prev,
      [stage]: {
        ...prev[stage],
        [field]: parseFloat(value) || 0
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError('');

      if (isEditing && selectedOperation) {
        await systemOperationService.updateSystemOperation(selectedOperation.id, formData);
      } else {
        await systemOperationService.createSystemOperation(formData);
      }

      await loadOperations();
      handleCloseModal();
    } catch (err: any) {
      setError(err.message || 'Lỗi lưu dữ liệu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa thông số này?')) {
      try {
        setLoading(true);
        setError('');
        await systemOperationService.deleteSystemOperation(id);
        await loadOperations();
      } catch (err: any) {
        setError(err.message || 'Lỗi xóa dữ liệu');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const calculateTongThoiGianSay = (data: FormData): number => {
    return data.giaiDoan1.thoiGian + data.giaiDoan2.thoiGian +
           data.giaiDoan3.thoiGian + data.giaiDoan4.thoiGian;
  };

  const getTrangThaiLabel = (status: string): string => {
    switch (status) {
      case 'DANG_HOAT_DONG':
        return 'Đang hoạt động';
      case 'BAO_TRI':
        return 'Bảo trì';
      case 'NGUNG_HOAT_DONG':
        return 'Ngừng hoạt động';
      default:
        return 'Không xác định';
    }
  };

  const getTrangThaiColor = (status: string): string => {
    switch (status) {
      case 'DANG_HOAT_DONG':
        return 'bg-green-100 text-green-800';
      case 'BAO_TRI':
        return 'bg-yellow-100 text-yellow-800';
      case 'NGUNG_HOAT_DONG':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRemoveMachine = async (machine: Machine) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${machine.tenMay}?`)) {
      try {
        setLoading(true);
        setError('');
        await machineService.deleteMachine(machine.id);
        await loadMachines();

        // Select first machine if current machine was deleted
        if (selectedMachine === machine.tenMay && machines.length > 1) {
          const remainingMachines = machines.filter(m => m.id !== machine.id);
          if (remainingMachines.length > 0) {
            setSelectedMachine(remainingMachines[0].tenMay);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Lỗi xóa máy');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Thông số vận hành hệ thống</h2>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Notification Banner */}
      {initialMaChien && initialThoiGianChien && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Settings className="h-5 w-5 text-blue-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <span className="font-semibold">Mã chiên: {initialMaChien}</span> - Thời gian: {initialThoiGianChien}
                <br />
                <span className="text-xs">Chọn máy và click "Thêm thông số" để tạo bản ghi mới</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Machine Tabs */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-2">
          {machines.map((machine) => (
            <div key={machine.id} className="relative group">
              <button
                onClick={() => setSelectedMachine(machine.tenMay)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedMachine === machine.tenMay
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {machine.tenMay}
                {machine.trangThai !== 'HOAT_DONG' && (
                  <span className="ml-2 text-xs">
                    ({machine.trangThai === 'BẢO_TRÌ' ? 'Bảo trì' : 'Ngừng'})
                  </span>
                )}
              </button>
              {machines.length > 1 && (
                <button
                  onClick={() => handleRemoveMachine(machine)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Xóa máy"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã chiên</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên máy</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian chiên</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khối lượng đầu vào (kg)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng thời gian sấy</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ghi chú</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người thực hiện</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOperations.map((operation, index) => (
                <tr key={operation.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{operation.maChien}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-purple-600">{operation.tenMay}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{formatDateTime(operation.thoiGianChien)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{operation.khoiLuongDauVao || 0} kg</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{operation.tongThoiGianSay} phút</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTrangThaiColor(operation.trangThai)}`}>
                      {getTrangThaiLabel(operation.trangThai)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">{operation.ghiChu}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{operation.nguoiThucHien}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewDetail(operation)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenModal(operation)}
                        className="text-green-600 hover:text-green-800"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(operation.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOperations.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Chưa có dữ liệu cho {selectedMachine}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">
                {isEditing ? 'Chỉnh sửa thông số' : 'Thêm thông số mới'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {/* Thông tin cơ bản */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã chiên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="maChien"
                    value={formData.maChien}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên máy <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="tenMay"
                    value={formData.tenMay}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thời gian chiên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="thoiGianChien"
                    value={formData.thoiGianChien}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Khối lượng đầu vào (kg)
                  </label>
                  <input
                    type="number"
                    name="khoiLuongDauVao"
                    value={formData.khoiLuongDauVao}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trạng thái
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTrangThaiColor(formData.trangThai)}`}>
                      {getTrangThaiLabel(formData.trangThai)}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">(Tự động từ trạng thái máy)</span>
                  </div>
                </div>
              </div>

              {/* Giai đoạn 1 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Giai đoạn 1</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian (phút)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.giaiDoan1.thoiGian}
                      onChange={(e) => handleStageChange('giaiDoan1', 'thoiGian', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nhiệt độ (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.giaiDoan1.nhietDo}
                      onChange={(e) => handleStageChange('giaiDoan1', 'nhietDo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Áp suất (mmHg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.giaiDoan1.apSuat}
                      onChange={(e) => handleStageChange('giaiDoan1', 'apSuat', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Giai đoạn 2 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Giai đoạn 2</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian (phút)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.giaiDoan2.thoiGian}
                      onChange={(e) => handleStageChange('giaiDoan2', 'thoiGian', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nhiệt độ (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.giaiDoan2.nhietDo}
                      onChange={(e) => handleStageChange('giaiDoan2', 'nhietDo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Áp suất (mmHg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.giaiDoan2.apSuat}
                      onChange={(e) => handleStageChange('giaiDoan2', 'apSuat', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Giai đoạn 3 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Giai đoạn 3</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian (phút)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.giaiDoan3.thoiGian}
                      onChange={(e) => handleStageChange('giaiDoan3', 'thoiGian', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nhiệt độ (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.giaiDoan3.nhietDo}
                      onChange={(e) => handleStageChange('giaiDoan3', 'nhietDo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Áp suất (mmHg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.giaiDoan3.apSuat}
                      onChange={(e) => handleStageChange('giaiDoan3', 'apSuat', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Giai đoạn 4 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Giai đoạn 4</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian (phút)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.giaiDoan4.thoiGian}
                      onChange={(e) => handleStageChange('giaiDoan4', 'thoiGian', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nhiệt độ (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.giaiDoan4.nhietDo}
                      onChange={(e) => handleStageChange('giaiDoan4', 'nhietDo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Áp suất (mmHg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.giaiDoan4.apSuat}
                      onChange={(e) => handleStageChange('giaiDoan4', 'apSuat', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Thông tin bổ sung */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Người thực hiện <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nguoiThucHien"
                    value={formData.nguoiThucHien}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File đính kèm
                  </label>
                  <input
                    type="file"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  name="ghiChu"
                  value={formData.ghiChu}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {isEditing ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {isViewModalOpen && selectedOperation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Chi tiết thông số vận hành</h2>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Thông tin cơ bản */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Mã chiên</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">{selectedOperation.maChien}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Tên máy</label>
                  <p className="mt-1 text-sm text-purple-600 font-semibold">{selectedOperation.tenMay}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Thời gian chiên</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDateTime(selectedOperation.thoiGianChien)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Khối lượng đầu vào</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">{selectedOperation.khoiLuongDauVao || 0} kg</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Trạng thái</label>
                  <p className="mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTrangThaiColor(selectedOperation.trangThai)}`}>
                      {getTrangThaiLabel(selectedOperation.trangThai)}
                    </span>
                  </p>
                </div>
              </div>

              {/* Giai đoạn 1 */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Giai đoạn 1</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Thời gian</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedOperation.giaiDoan1.thoiGian} phút</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Nhiệt độ</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedOperation.giaiDoan1.nhietDo}°C</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Áp suất</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedOperation.giaiDoan1.apSuat} mmHg</p>
                  </div>
                </div>
              </div>

              {/* Giai đoạn 2 */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Giai đoạn 2</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Thời gian</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedOperation.giaiDoan2.thoiGian} phút</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Nhiệt độ</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedOperation.giaiDoan2.nhietDo}°C</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Áp suất</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedOperation.giaiDoan2.apSuat} mmHg</p>
                  </div>
                </div>
              </div>

              {/* Giai đoạn 3 */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Giai đoạn 3</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Thời gian</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedOperation.giaiDoan3.thoiGian} phút</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Nhiệt độ</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedOperation.giaiDoan3.nhietDo}°C</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Áp suất</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedOperation.giaiDoan3.apSuat} mmHg</p>
                  </div>
                </div>
              </div>

              {/* Giai đoạn 4 */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Giai đoạn 4</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Thời gian</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedOperation.giaiDoan4.thoiGian} phút</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Nhiệt độ</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedOperation.giaiDoan4.nhietDo}°C</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Áp suất</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedOperation.giaiDoan4.apSuat} mmHg</p>
                  </div>
                </div>
              </div>

              {/* Tổng kết */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Tổng thời gian sấy</label>
                    <p className="mt-1 text-sm text-gray-900 font-semibold">{selectedOperation.tongThoiGianSay} phút</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Người thực hiện</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedOperation.nguoiThucHien}</p>
                  </div>
                </div>
              </div>

              {/* Ghi chú */}
              {selectedOperation.ghiChu && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-500">Ghi chú</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedOperation.ghiChu}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end p-6 border-t">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemOperationManagement;

