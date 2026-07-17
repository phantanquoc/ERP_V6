import React, { useState, useEffect } from 'react';
import { Tablet, Plus, Copy, Check, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import faceAttendanceService, { AttendanceDevice } from '../services/faceAttendanceService';

type DeviceType = 'FACE' | 'DATA_ENTRY';

const TYPE_LABELS: Record<DeviceType, string> = {
  FACE: 'Chấm công',
  DATA_ENTRY: 'Nhập liệu',
};

const TYPE_BADGE_CLASS: Record<DeviceType, string> = {
  FACE: 'bg-blue-100 text-blue-700',
  DATA_ENTRY: 'bg-amber-100 text-amber-700',
};

const DeviceManagementSection: React.FC = () => {
  const [devices, setDevices] = useState<AttendanceDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formType, setFormType] = useState<DeviceType>('FACE');

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await faceAttendanceService.listDevices();
      setDevices(res.data ?? []);
    } catch {
      toast.error('Không thể tải danh sách thiết bị');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);
  const handleCopyKey = (device: AttendanceDevice) => {
    navigator.clipboard.writeText(device.apiKey);
    setCopiedId(device.id);
    toast.success('Đã copy API key');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggle = async (device: AttendanceDevice) => {
    try {
      await faceAttendanceService.toggleDevice(device.id);
      setDevices((prev) =>
        prev.map((d) => (d.id === device.id ? { ...d, isActive: !d.isActive } : d))
      );
      toast.success(device.isActive ? 'Đã tắt thiết bị' : 'Đã bật thiết bị');
    } catch {
      toast.error('Không thể thay đổi trạng thái thiết bị');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Vui lòng nhập tên thiết bị');
      return;
    }
    setCreating(true);
    try {
      const res = await faceAttendanceService.createDevice(
        formName.trim(),
        formLocation.trim() || undefined,
        formType
      );
      if (res.data) {
        setDevices((prev) => [res.data!, ...prev]);
        toast.success('Đã tạo thiết bị mới');
        setFormName('');
        setFormLocation('');
        setFormType('FACE');
        setShowForm(false);
      }
    } catch {
      toast.error('Không thể tạo thiết bị');
    } finally {
      setCreating(false);
    }
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Tablet className="w-5 h-5 text-indigo-600" />
          Quản lý thiết bị
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchDevices}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm thiết bị
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-5 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tên thiết bị *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="VD: Tablet Kho 1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vị trí</label>
              <input
                type="text"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="VD: Kho thành phẩm"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Loại</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as DeviceType)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="FACE">Chấm công (FACE)</option>
                <option value="DATA_ENTRY">Nhập liệu (DATA_ENTRY)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {creating ? 'Đang tạo...' : 'Tạo thiết bị'}
            </button>
          </div>
        </form>
      )}
      {/* Device table */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Đang tải...
        </div>
      ) : devices.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">Chưa có thiết bị nào.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="pb-2 pr-4">Tên</th>
                <th className="pb-2 pr-4">Vị trí</th>
                <th className="pb-2 pr-4">Loại</th>
                <th className="pb-2 pr-4">Trạng thái</th>
                <th className="pb-2 pr-4">Ngày tạo</th>
                <th className="pb-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {devices.map((device) => (
                <tr key={device.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 font-medium text-gray-900">{device.name}</td>
                  <td className="py-3 pr-4 text-gray-600">{device.location || '—'}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TYPE_BADGE_CLASS[(device.type as DeviceType) || 'FACE']}`}>
                      {TYPE_LABELS[(device.type as DeviceType) || 'FACE']}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${device.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                      <span className={`w-2 h-2 rounded-full ${device.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                      {device.isActive ? 'Hoạt động' : 'Tắt'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-500">
                    {new Date(device.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopyKey(device)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                        title="Copy API Key"
                      >
                        {copiedId === device.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggle(device)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                        title={device.isActive ? 'Tắt thiết bị' : 'Bật thiết bị'}
                      >
                        {device.isActive ? (
                          <ToggleRight className="w-5 h-5 text-green-500" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
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
  );
};

export default DeviceManagementSection;
