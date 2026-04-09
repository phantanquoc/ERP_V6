import React, { useState, useEffect } from 'react';
import { X, Save, Clock } from 'lucide-react';
import attendanceReminderService, { AttendanceReminderSettings } from '@services/attendanceReminderService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const AttendanceReminderSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AttendanceReminderSettings>({
    checkinReminder: '08:30',
    checkoutReminder: '17:30',
    autoAbsent: '22:00',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await attendanceReminderService.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading reminder settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await attendanceReminderService.updateSettings(settings);
      alert('Lưu cài đặt nhắc nhở thành công');
      onClose();
    } catch (error) {
      console.error('Error saving reminder settings:', error);
      alert('Lỗi khi lưu cài đặt nhắc nhở');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="bg-amber-600 px-6 py-4 flex justify-between items-center rounded-t-lg">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Cài đặt nhắc nhở chấm công
          </h3>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-4 text-gray-500">Đang tải...</div>
          ) : (
            <div className="space-y-5">
              <p className="text-sm text-gray-600">
                Hệ thống sẽ tự động gửi thông báo nhắc nhở chấm công cho nhân viên tại các thời điểm dưới đây.
              </p>

              {/* Nhắc nhở chấm công vào */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <label className="block text-sm font-semibold text-blue-800 mb-2">
                  Nhắc nhở chấm công vào
                </label>
                <p className="text-xs text-blue-600 mb-2">
                  Gửi thông báo nếu nhân viên chưa chấm công vào trước giờ này
                </p>
                <input
                  type="time"
                  value={settings.checkinReminder}
                  onChange={(e) => setSettings({ ...settings, checkinReminder: e.target.value })}
                  className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Nhắc nhở chấm công ra */}
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <label className="block text-sm font-semibold text-orange-800 mb-2">
                  Nhắc nhở chấm công ra
                </label>
                <p className="text-xs text-orange-600 mb-2">
                  Gửi thông báo nếu nhân viên đã chấm công vào nhưng chưa chấm công ra
                </p>
                <input
                  type="time"
                  value={settings.checkoutReminder}
                  onChange={(e) => setSettings({ ...settings, checkoutReminder: e.target.value })}
                  className="w-full px-3 py-2 border border-orange-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Tự động ghi vắng mặt */}
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <label className="block text-sm font-semibold text-red-800 mb-2">
                  Tự động ghi nhận vắng mặt
                </label>
                <p className="text-xs text-red-600 mb-2">
                  Sau giờ này, nhân viên chưa chấm công sẽ bị ghi nhận vắng mặt tự động
                </p>
                <input
                  type="time"
                  value={settings.autoAbsent}
                  onChange={(e) => setSettings({ ...settings, autoAbsent: e.target.value })}
                  className="w-full px-3 py-2 border border-red-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceReminderSettingsModal;
