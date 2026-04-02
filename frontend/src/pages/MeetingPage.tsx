/**
 * MeetingPage — Danh sách cuộc họp
 * Full-page layout with tabs, filters, DataTable, realtime, and CRUD modal.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Calendar, Clock, DoorOpen, Users, Eye, Edit2, XCircle, CheckCircle } from 'lucide-react';
import { meetingService, Meeting, MeetingStatus } from '../services/meetingService';
import { useAuth } from '../contexts/AuthContext';
import { DataTable, Column } from '../components/DataTable';
import { formatDate, formatDateTime } from '../utils/formatters';
import MeetingModal from '../components/MeetingModal';

type TabValue = 'all' | 'my' | 'today' | 'week';

const STATUS_BADGE: Record<MeetingStatus, { label: string; bg: string; text: string }> = {
  SCHEDULED:   { label: 'Đã lên lịch',   bg: 'bg-blue-100',   text: 'text-blue-700'  },
  IN_PROGRESS: { label: 'Đang diễn ra',  bg: 'bg-yellow-100', text: 'text-yellow-700' },
  COMPLETED:   { label: 'Hoàn thành',    bg: 'bg-green-100',  text: 'text-green-700'  },
  CANCELLED:   { label: 'Đã hủy',        bg: 'bg-red-100',    text: 'text-red-700'    },
};

// ─── Component ───────────────────────────────────────────────────────────────

const MeetingPage: React.FC = () => {
  const { user } = useAuth();

  // ── Tabs & Filters
  const [currentTab, setCurrentTab] = useState<TabValue>('all');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // ── Data
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null);

  // ── Confirm / Cancel state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Can create/edit? ADMIN or DEPARTMENT_HEAD
  const canCreate = user?.role === 'ADMIN' || user?.role === 'DEPARTMENT_HEAD';

  // ─── Fetch meetings ──────────────────────────────────────────────────────
  const fetchMeetings = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchText || undefined,
        status: statusFilter || undefined,
      };

      let response: { data: Meeting[]; pagination: typeof pagination };
      if (currentTab === 'my') {
        response = await meetingService.getMy(params);
      } else if (currentTab === 'today') {
        response = await meetingService.getToday(params);
      } else if (currentTab === 'week') {
        response = await meetingService.getThisWeek(params);
      } else {
        response = await meetingService.getAll(params);
      }

      setMeetings(response.data);
      setPagination(response.pagination);
    } catch (err) {
      console.error('Error fetching meetings:', err);
      setError('Không thể tải danh sách cuộc họp');
    } finally {
      setIsLoading(false);
    }
  }, [currentTab, currentPage, searchText, statusFilter]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // ── Realtime
  useEffect(() => {
    const handler = () => fetchMeetings();
    window.addEventListener('MEETING_CHANGED', handler);
    window.addEventListener('wsReconnected', handler);
    return () => {
      window.removeEventListener('MEETING_CHANGED', handler);
      window.removeEventListener('wsReconnected', handler);
    };
  }, [fetchMeetings]);

  // ── Actions
  const handleDelete = async (meeting: Meeting) => {
    if (!window.confirm(`Xóa cuộc họp "${meeting.title}"?`)) return;
    try {
      await meetingService.delete(meeting.id);
      fetchMeetings();
    } catch {
      alert('Không thể xóa cuộc họp');
    }
  };

  const handleConfirm = async (meeting: Meeting, isConfirmed: boolean) => {
    try {
      setActionLoading(meeting.id);
      await meetingService.confirm(meeting.id, isConfirmed);
      fetchMeetings();
    } catch {
      alert('Không thể cập nhật trạng thái tham dự');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (meeting: Meeting, status: MeetingStatus) => {
    try {
      setActionLoading(meeting.id);
      await meetingService.updateStatus(meeting.id, status);
      fetchMeetings();
    } catch {
      alert('Không thể cập nhật trạng thái');
    } finally {
      setActionLoading(null);
    }
  };

  // ── DataTable columns
  const columns: Column<Meeting>[] = [
    {
      key: 'title',
      label: 'Tiêu đề',
      filterable: true,
      filterType: 'text',
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900 line-clamp-1">{row.title}</div>
          {row.agenda && <div className="text-xs text-gray-500 line-clamp-1">{row.agenda}</div>}
        </div>
      ),
    },
    {
      key: 'meetingDate',
      label: 'Ngày',
      width: '120px',
      filterable: true,
      filterType: 'date-range',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm">{formatDate(row.meetingDate)}</span>
        </div>
      ),
    },
    {
      key: 'time',
      label: 'Giờ',
      width: '130px',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm">{row.startTime} – {row.endTime}</span>
        </div>
      ),
    },
    {
      key: 'room',
      label: 'Phòng',
      width: '120px',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <DoorOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm">{row.room || '—'}</span>
        </div>
      ),
    },
    {
      key: 'creator',
      label: 'Người tổ chức',
      width: '150px',
      render: (row) => (
        <span className="text-sm text-gray-700">
          {row.creator ? `${row.creator.firstName} ${row.creator.lastName}` : '—'}
        </span>
      ),
    },
    {
      key: 'participants',
      label: 'Người tham dự',
      width: '100px',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium">{row.participants?.length || 0}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      width: '140px',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'SCHEDULED',   label: 'Đã lên lịch'  },
        { value: 'IN_PROGRESS', label: 'Đang diễn ra' },
        { value: 'COMPLETED',   label: 'Hoàn thành'   },
        { value: 'CANCELLED',   label: 'Đã hủy'       },
      ],
      render: (row) => {
        const badge = STATUS_BADGE[row.status] || STATUS_BADGE.SCHEDULED;
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Hành động',
      width: '200px',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {/* View detail */}
          <button
            onClick={() => { setEditMeeting(row); setIsModalOpen(true); }}
            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
            title="Xem chi tiết"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Edit (admin/head only, not cancelled) */}
          {canCreate && row.status !== 'CANCELLED' && (
            <button
              onClick={() => { setEditMeeting(row); setIsModalOpen(true); }}
              className="p-1.5 text-orange-600 hover:bg-orange-100 rounded-md transition-colors"
              title="Chỉnh sửa"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}

          {/* Cancel (admin/head only, not cancelled/completed) */}
          {canCreate && row.status !== 'CANCELLED' && row.status !== 'COMPLETED' && (
            <button
              onClick={() => handleStatusChange(row, 'CANCELLED')}
              disabled={actionLoading === row.id}
              className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50"
              title="Hủy cuộc họp"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}

          {/* Confirm / Decline (participant — show if user is in participants) */}
          {user?.employeeId && row.participants?.some(p => p.employeeId === user.employeeId) && (
            <>
              <button
                onClick={() => handleConfirm(row, true)}
                disabled={actionLoading === row.id || row.status === 'CANCELLED'}
                className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors disabled:opacity-50"
                title="Xác nhận tham dự"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleConfirm(row, false)}
                disabled={actionLoading === row.id || row.status === 'CANCELLED'}
                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                title="Từ chối tham dự"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const handleFilterChange = useCallback((filters: Record<string, unknown>) => {
    setCurrentPage(1);
    if (filters.status) setStatusFilter(filters.status as string);
    else setStatusFilter('');
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* ── Header ── */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            📅 Danh sách cuộc họp
          </h2>
          {canCreate && (
            <button
              onClick={() => { setEditMeeting(null); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tạo cuộc họp
            </button>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1 mb-4 w-fit">
          {([
            ['all',    'Tất cả'],
            ['my',     'Của tôi'],
            ['today',  'Hôm nay'],
            ['week',   'Tuần này'],
          ] as [TabValue, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => { setCurrentTab(val); setCurrentPage(1); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                currentTab === val
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Quick status filter ── */}
        <div className="flex flex-wrap gap-2">
          {['', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === '' ? 'Tất cả' : STATUS_BADGE[s as MeetingStatus]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── DataTable ── */}
      <DataTable
        columns={columns}
        data={meetings}
        isLoading={isLoading}
        total={pagination.total}
        page={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onFilterChange={handleFilterChange}
        emptyMessage="📅 Chưa có cuộc họp nào"
        rowKey="id"
      />

      {/* ── Meeting Modal ── */}
      {isModalOpen && (
        <MeetingModal
          meeting={editMeeting}
          onClose={() => { setIsModalOpen(false); setEditMeeting(null); }}
          onSuccess={() => {
            setIsModalOpen(false);
            setEditMeeting(null);
            fetchMeetings();
          }}
        />
      )}
    </div>
  );
};

export default MeetingPage;
