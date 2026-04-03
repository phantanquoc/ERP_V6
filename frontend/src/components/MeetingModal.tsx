/**
 * MeetingModal — Create / Edit / View a meeting.
 *
 * Used from MeetingPage. Handles three modes automatically:
 *  • meeting === null  → Create new
 *  • meeting !== null, canEdit → Edit existing
 *  • meeting !== null, !canEdit → View only
 */
import React, { useState, useEffect, useCallback } from 'react';
import { X, Calendar, Clock, DoorOpen, Users, FileText, Check, XCircle, Edit2, Save, Plus, Trash2 } from 'lucide-react';
import { meetingService, Meeting, MeetingStatus, CreateMeetingData } from '../services/meetingService';
import { useAuth } from '../contexts/AuthContext';
import employeeService from '../services/employeeService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SimpleEmployee {
  id: string;
  employeeCode: string;
  name: string;
}

interface MeetingModalProps {
  meeting: Meeting | null;
  onClose: () => void;
  onSuccess: () => void;
}

const STATUS_LABEL: Record<MeetingStatus, string> = {
  SCHEDULED:   'Đã lên lịch',
  IN_PROGRESS: 'Đang diễn ra',
  COMPLETED:   'Hoàn thành',
  CANCELLED:   'Đã hủy',
};

const STATUS_CLASS: Record<MeetingStatus, string> = {
  SCHEDULED:   'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED:   'bg-green-100 text-green-700',
  CANCELLED:   'bg-red-100 text-red-700',
};

// ─── Component ────────────────────────────────────────────────────────────────

const MeetingModal: React.FC<MeetingModalProps> = ({ meeting, onClose, onSuccess }) => {
  const { user } = useAuth();
  const isNew = !meeting;
  const canEdit = isNew || user?.role === 'ADMIN' || user?.role === 'MANAGER' || meeting?.createdBy === user?._id;

  // ── Form state
  const [title, setTitle] = useState(meeting?.title ?? '');
  const [agenda, setAgenda] = useState(meeting?.agenda ?? '');
  const [meetingDate, setMeetingDate] = useState(
    meeting?.meetingDate ? meeting.meetingDate.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState(meeting?.startTime ?? '08:00');
  const [endTime, setEndTime] = useState(meeting?.endTime ?? '09:00');
  const [room, setRoom] = useState(meeting?.room ?? '');
  const [notes, setNotes] = useState(meeting?.notes ?? '');
  const [selectedIds, setSelectedIds] = useState<string[]>(
    meeting?.participants?.map(p => p.employeeId) ?? []
  );

  // ── Employee list for picker
  const [allEmployees, setAllEmployees] = useState<SimpleEmployee[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // ── Submission
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── View mode: tab
  const [viewTab, setViewTab] = useState<'info' | 'participants'>('info');

  // Load employees for participant picker
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingEmployees(true);
      try {
        const res = await employeeService.getAllEmployees(1, 200);
        if (!cancelled) {
          const list: SimpleEmployee[] = ((res as any)?.data || []).map((e: any) => ({
            id: e.id,
            employeeCode: e.employeeCode,
            name: `${e.user?.firstName ?? ''} ${e.user?.lastName ?? ''}`.trim(),
          }));
          setAllEmployees(list);
        }
      } catch {
        // non-critical — participant list still usable even if empty
      } finally {
        if (!cancelled) setLoadingEmployees(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const toggleEmployee = useCallback((empId: string) => {
    setSelectedIds(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  }, []);

  const filteredEmployees = allEmployees.filter(e =>
    employeeSearch === '' ||
    e.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    e.employeeCode.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  // ── Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) { setError('Tiêu đề không được để trống'); return; }
    if (!meetingDate)   { setError('Vui lòng chọn ngày họp'); return; }
    if (startTime >= endTime) { setError('Giờ kết thúc phải sau giờ bắt đầu'); return; }

    const data: CreateMeetingData = {
      title: title.trim(),
      agenda: agenda.trim() || undefined,
      meetingDate,
      startTime,
      endTime,
      room: room.trim() || undefined,
      notes: notes.trim() || undefined,
      participantIds: selectedIds,
    };

    setSaving(true);
    try {
      if (isNew) {
        await meetingService.create(data);
      } else {
        await meetingService.update(meeting!.id, data);
      }
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-700 flex-shrink-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {isNew ? 'Tạo cuộc họp' : canEdit ? 'Chỉnh sửa cuộc họp' : 'Chi tiết cuộc họp'}
          </h2>
          <div className="flex items-center gap-2">
            {!isNew && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLASS[meeting!.status]}`}>
                {STATUS_LABEL[meeting!.status]}
              </span>
            )}
            <button onClick={onClose} className="text-white/80 hover:text-white p-1 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View-only tabs (when viewing existing meeting) */}
        {!isNew && !canEdit && (
          <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
            {(['info', 'participants'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setViewTab(tab)}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  viewTab === tab
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'info' ? '📋 Thông tin' : `👥 Người tham dự (${meeting!.participants?.length ?? 0})`}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* ── View-only: Info tab ── */}
          {!isNew && !canEdit && viewTab === 'info' && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={<Calendar className="w-4 h-4 text-blue-500" />} label="Ngày họp">
                  {new Date(meeting!.meetingDate).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                </InfoRow>
                <InfoRow icon={<Clock className="w-4 h-4 text-blue-500" />} label="Thời gian">
                  {meeting!.startTime} – {meeting!.endTime}
                </InfoRow>
                <InfoRow icon={<DoorOpen className="w-4 h-4 text-blue-500" />} label="Phòng họp">
                  {meeting!.room || '—'}
                </InfoRow>
                <InfoRow icon={<Users className="w-4 h-4 text-blue-500" />} label="Số người tham dự">
                  {meeting!.participants?.length ?? 0} người
                </InfoRow>
              </div>
              {meeting!.agenda && (
                <InfoRow icon={<FileText className="w-4 h-4 text-blue-500" />} label="Nội dung / Agenda" block>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{meeting!.agenda}</p>
                </InfoRow>
              )}
              {meeting!.notes && (
                <InfoRow icon={<FileText className="w-4 h-4 text-gray-400" />} label="Ghi chú" block>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{meeting!.notes}</p>
                </InfoRow>
              )}
            </div>
          )}

          {/* ── View-only: Participants tab ── */}
          {!isNew && !canEdit && viewTab === 'participants' && (
            <div className="p-5">
              {meeting!.participants?.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Chưa có người tham dự</p>
              ) : (
                <div className="space-y-2">
                  {meeting!.participants.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {(p as any).employeeName || `${p.employee?.user?.firstName ?? ''} ${p.employee?.user?.lastName ?? ''}`.trim()}
                        </p>
                        <p className="text-xs text-gray-500">{(p as any).employeeCode || p.employee?.employeeCode}</p>
                      </div>
                      {p.isConfirmed === true && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><Check className="w-3 h-3" />Đã xác nhận</span>}
                      {p.isConfirmed === false && <span className="text-xs text-red-500 font-medium flex items-center gap-1"><XCircle className="w-3 h-3" />Từ chối</span>}
                      {p.isConfirmed === null && <span className="text-xs text-gray-400">Chưa phản hồi</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Create / Edit form ── */}
          {(isNew || canEdit) && (
            <form id="meeting-form" onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="VD: Họp tổng kết tháng 4"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Date + Time row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày họp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={e => setMeetingDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giờ bắt đầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giờ kết thúc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Room */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phòng họp</label>
                <input
                  type="text"
                  value={room}
                  onChange={e => setRoom(e.target.value)}
                  placeholder="VD: Phòng A1, Online (Google Meet)..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Agenda */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung / Agenda</label>
                <textarea
                  value={agenda}
                  onChange={e => setAgenda(e.target.value)}
                  rows={3}
                  placeholder="Mô tả nội dung họp, các điểm cần thảo luận..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Ghi chú thêm (tùy chọn)..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Participants */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Người tham dự
                  {selectedIds.length > 0 && (
                    <span className="ml-1.5 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {selectedIds.length} đã chọn
                    </span>
                  )}
                </label>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="p-2 border-b border-gray-100 bg-gray-50">
                    <input
                      type="text"
                      value={employeeSearch}
                      onChange={e => setEmployeeSearch(e.target.value)}
                      placeholder="Tìm kiếm nhân viên..."
                      className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {loadingEmployees ? (
                      <p className="text-center text-gray-400 text-sm py-4">Đang tải...</p>
                    ) : filteredEmployees.length === 0 ? (
                      <p className="text-center text-gray-400 text-sm py-4">Không tìm thấy nhân viên</p>
                    ) : (
                      filteredEmployees.map(emp => (
                        <label
                          key={emp.id}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(emp.id)}
                            onChange={() => toggleEmployee(emp.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-800">{emp.name}</span>
                          <span className="text-xs text-gray-400 ml-auto">{emp.employeeCode}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {(isNew || canEdit) ? 'Hủy' : 'Đóng'}
          </button>
          {(isNew || canEdit) && (
            <button
              type="submit"
              form="meeting-form"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Đang lưu...' : isNew ? 'Tạo cuộc họp' : 'Lưu thay đổi'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Helper ───────────────────────────────────────────────────────────────────

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  block?: boolean;
  children: React.ReactNode;
}

function InfoRow({ icon, label, block, children }: InfoRowProps) {
  return (
    <div className={block ? 'col-span-2' : ''}>
      <p className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1 mb-1">
        {icon} {label}
      </p>
      <div className="text-sm text-gray-900">{children}</div>
    </div>
  );
}

export default MeetingModal;
