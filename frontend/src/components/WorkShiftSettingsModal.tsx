import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import workShiftService from '@services/workShiftService';
import Modal from './Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface ShiftForm {
  id?: string;
  name: string;
  startTime: string;
  endTime: string;
  checkInWindowStart: string;
  checkInWindowEnd: string;
}

const WorkShiftSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [shifts, setShifts] = useState<ShiftForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadShifts();
    }
  }, [isOpen]);

  const loadShifts = async () => {
    setLoading(true);
    try {
      const data = await workShiftService.getAll();
      setShifts(data.map(s => ({
        id: s.id,
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        checkInWindowStart: s.checkInWindowStart ?? '',
        checkInWindowEnd: s.checkInWindowEnd ?? '',
      })));
    } catch (error) {
      console.error('Error loading shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const addShift = () => {
    setShifts([...shifts, {
      name: `Ca ${shifts.length + 1}`,
      startTime: '06:00',
      endTime: '14:00',
      checkInWindowStart: '05:30',
      checkInWindowEnd: '06:30',
    }]);
  };

  const removeShift = (index: number) => {
    setShifts(shifts.filter((_, i) => i !== index));
  };

  const updateShiftField = (index: number, field: keyof ShiftForm, value: string) => {
    const updated = [...shifts];
    updated[index] = { ...updated[index], [field]: value };
    setShifts(updated);
  };

  const handleSave = async () => {
    // Validate
    for (const shift of shifts) {
      if (!shift.name || !shift.startTime || !shift.endTime) {
        alert('Vui lòng điền đầy đủ thông tin cho tất cả ca làm việc');
        return;
      }
    }

    setSaving(true);
    try {
      // Get existing shifts from server to determine what to create/update/delete
      const existing = await workShiftService.getAll();
      const existingIds = existing.map(s => s.id);
      const currentIds = shifts.filter(s => s.id).map(s => s.id!);

      // Delete removed shifts
      for (const ex of existing) {
        if (!currentIds.includes(ex.id)) {
          await workShiftService.delete(ex.id);
        }
      }

      // Create or update shifts
      for (const shift of shifts) {
        const payload = {
          name: shift.name,
          startTime: shift.startTime,
          endTime: shift.endTime,
          checkInWindowStart: shift.checkInWindowStart || null,
          checkInWindowEnd: shift.checkInWindowEnd || null,
        };
        if (shift.id && existingIds.includes(shift.id)) {
          await workShiftService.update(shift.id, payload);
        } else {
          await workShiftService.create(payload);
        }
      }

      alert('Lưu cài đặt ca làm việc thành công');
      onClose();
    } catch (error) {
      console.error('Error saving shifts:', error);
      alert('Lỗi khi lưu cài đặt ca làm việc');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showBackdrop>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full flex flex-col modal-viewport-h" onClick={(e) => e.stopPropagation()}>
        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center rounded-t-lg shrink-0">
          <h3 className="text-xl font-bold text-white">Cài đặt ca làm việc</h3>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-4 text-gray-500">Đang tải...</div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Cài đặt thời gian cho các ca làm việc. <strong>Giờ ca</strong> là khung giờ tính công.
                <strong> Cửa sổ chấm công</strong> là khoảng giờ máy chấm gán vào ca này (bao lấy giờ bắt đầu, thường sớm 30 phút và trễ sau giờ vào 30 phút — dùng khoảng nửa mở <code>[Từ, Đến)</code>). Bỏ trống nếu muốn dùng mặc định.
              </p>

              {shifts.map((shift, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Tên ca</label>
                      <input
                        type="text"
                        value={shift.name}
                        onChange={(e) => updateShiftField(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="w-28">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Từ</label>
                      <input
                        type="time"
                        value={shift.startTime}
                        onChange={(e) => updateShiftField(index, 'startTime', e.target.value)}
                        className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="w-28">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Đến</label>
                      <input
                        type="time"
                        value={shift.endTime}
                        onChange={(e) => updateShiftField(index, 'endTime', e.target.value)}
                        className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={() => removeShift(index)}
                      className="p-2 text-red-500 hover:bg-red-100 rounded-md transition-colors"
                      title="Xóa ca"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Cửa sổ chấm công (khoảng giờ máy chấm gán vào ca này)
                      </label>
                    </div>
                    <div className="w-28">
                      <input
                        type="time"
                        value={shift.checkInWindowStart}
                        onChange={(e) => updateShiftField(index, 'checkInWindowStart', e.target.value)}
                        placeholder="Từ"
                        className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="w-28">
                      <input
                        type="time"
                        value={shift.checkInWindowEnd}
                        onChange={(e) => updateShiftField(index, 'checkInWindowEnd', e.target.value)}
                        placeholder="Đến"
                        className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="w-9" />
                  </div>
                </div>
              ))}

              <button
                onClick={addShift}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                <Plus className="w-4 h-4" />
                Thêm ca làm việc
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default WorkShiftSettingsModal;

