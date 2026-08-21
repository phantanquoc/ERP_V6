import React, { useState, useEffect, useRef, useCallback } from 'react';
import Modal from './Modal';
import { Bell, X, CheckCheck, Trash2, Inbox, BellOff, Loader2 } from 'lucide-react';
import notificationService, { AppNotification } from '@services/notificationService';
import apiClient from '@services/apiClient';
import { getNotificationIcon } from '../utils/notificationIcons';
import { formatRelativeTime } from '../utils/formatRelativeTime';

const PAGE_SIZE = 15;

interface CursorPage {
  data: AppNotification[];
  nextCursor: string | null;
  hasMore: boolean;
}

async function fetchNotificationsCursor(cursor: string | null, limit: number): Promise<CursorPage> {
  const params: Record<string, string | number> = { limit };
  // cursor must be present to trigger cursor mode on backend; '' = first page
  params.cursor = cursor ?? '';
  const res = await apiClient.get<AppNotification[]>('/notifications', { params });
  const raw = res as unknown as { data: AppNotification[]; nextCursor?: string | null; hasMore?: boolean; success: boolean };
  if (raw.nextCursor === undefined && raw.hasMore === undefined) {
    return { data: Array.isArray(raw.data) ? raw.data : [], nextCursor: null, hasMore: false };
  }
  return { data: Array.isArray(raw.data) ? raw.data : [], nextCursor: raw.nextCursor ?? null, hasMore: !!raw.hasMore };
}

interface AllNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick: (notification: AppNotification) => void;
}

function groupByDate(notifications: AppNotification[]): { label: string; items: AppNotification[] }[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const todayItems: AppNotification[] = [];
  const yesterdayItems: AppNotification[] = [];
  const earlierItems: AppNotification[] = [];

  for (const n of notifications) {
    const d = new Date(n.createdAt); d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) todayItems.push(n);
    else if (d.getTime() === yesterday.getTime()) yesterdayItems.push(n);
    else earlierItems.push(n);
  }

  const groups: { label: string; items: AppNotification[] }[] = [];
  if (todayItems.length) groups.push({ label: 'Hôm nay', items: todayItems });
  if (yesterdayItems.length) groups.push({ label: 'Hôm qua', items: yesterdayItems });
  if (earlierItems.length) groups.push({ label: 'Trước đó', items: earlierItems });
  return groups;
}

function NotificationSkeletonRow() {
  return (
    <div className="px-6 py-4 border-b border-gray-100 flex gap-3 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 min-w-0 space-y-2.5 py-0.5">
        <div className="h-3.5 bg-gray-200 rounded w-3/5" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-4/5" />
        <div className="h-2.5 bg-gray-100 rounded w-20 mt-2" />
      </div>
      <div className="w-2 h-2 bg-gray-200 rounded-full shrink-0 mt-2" />
    </div>
  );
}

const AllNotificationsModal: React.FC<AllNotificationsModalProps> = ({ isOpen, onClose, onNotificationClick }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadFirstPage = useCallback(async () => {
    try {
      setLoading(true);
      const page = await fetchNotificationsCursor(null, PAGE_SIZE);
      setNotifications(Array.isArray(page.data) ? page.data : []);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || loadingMore) return;
    try {
      setLoadingMore(true);
      const page = await fetchNotificationsCursor(nextCursor, PAGE_SIZE);
      setNotifications(prev => [...prev, ...(Array.isArray(page.data) ? page.data : [])]);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (error) {
      console.error('Error loading more notifications:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loading, loadingMore, nextCursor]);

  useEffect(() => {
    if (isOpen) {
      void loadFirstPage();
    }
  }, [isOpen, loadFirstPage]);

  // Listen for WS notifications to refresh first page
  useEffect(() => {
    if (!isOpen) return;
    const handler = () => { void loadFirstPage(); };
    window.addEventListener('ws-notification', handler);
    return () => window.removeEventListener('ws-notification', handler);
  }, [isOpen, loadFirstPage]);

  // Infinite scroll: auto-load when sentinel becomes visible
  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void loadMore();
      },
      { root, rootMargin: '200px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMore, notifications.length, showUnreadOnly]);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      window.dispatchEvent(new Event('ws-notification'));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn xóa thông báo này?')) return;
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleClick = (notification: AppNotification) => {
    if (!notification.isRead) {
      notificationService.markAsRead(notification.id);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
    }
    onNotificationClick(notification);
  };

  const displayedNotifications = showUnreadOnly
    ? notifications.filter(n => !n.isRead)
    : notifications;
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const groups = groupByDate(displayedNotifications);

  // When filtering to unread and the current loaded window has no unread but server may have more,
  // still allow loading more to discover older unread items.
  const canLoadMore = hasMore && !loading;

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showBackdrop closeOnBackdrop={true}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl max-w-2xl w-full flex flex-col modal-viewport-h overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle — visual affordance for bottom-sheet */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden shrink-0" aria-hidden="true">
          <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
        </div>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-6 py-4 flex items-center justify-between shrink-0 sm:rounded-t-xl">
          <div className="flex items-center gap-3 min-w-0">
            <Bell className="w-6 h-6 text-white shrink-0" />
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">Tất cả thông báo</h2>
              <p className="text-blue-100 text-xs sm:text-sm truncate">
                {displayedNotifications.length} thông báo{hasMore ? ' · cuộn để xem thêm' : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors shrink-0 ml-2" aria-label="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter tabs + Mark all read */}
        <div className="flex gap-1 px-4 sm:px-6 py-2.5 border-b border-gray-200 bg-white items-center shrink-0">
          <button
            onClick={() => setShowUnreadOnly(false)}
            className={`text-sm px-4 py-1.5 rounded-full transition-colors ${
              !showUnreadOnly
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setShowUnreadOnly(true)}
            className={`text-sm px-4 py-1.5 rounded-full transition-colors ${
              showUnreadOnly
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Chưa đọc {unreadCount > 0 && `(${unreadCount})`}
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="ml-auto text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
            >
              <CheckCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Đọc tất cả</span>
              <span className="sm:hidden">Đọc hết</span>
            </button>
          )}
        </div>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div role="status" aria-label="Đang tải thông báo" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <NotificationSkeletonRow key={i} />
              ))}
              <span className="sr-only">Đang tải thông báo...</span>
            </div>
          ) : displayedNotifications.length === 0 ? (
            <div className="px-6 py-12 sm:py-14 text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                {showUnreadOnly ? (
                  <BellOff className="w-9 h-9 text-blue-400" />
                ) : (
                  <Inbox className="w-9 h-9 text-blue-400" />
                )}
              </div>
              <h3 className="text-base font-semibold text-gray-900">
                {showUnreadOnly ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
              </h3>
              <p className="text-sm text-gray-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                {showUnreadOnly
                  ? 'Tuyệt vời! Bạn đã xử lý hết thông báo. Hãy quay lại danh sách đầy đủ để xem lại.'
                  : 'Thông báo mới sẽ xuất hiện ở đây.'}
              </p>
              <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
                {showUnreadOnly ? (
                  <button
                    onClick={() => setShowUnreadOnly(false)}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Xem tất cả thông báo
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Đóng
                  </button>
                )}
              </div>
              {/* Even when filtered empty, still allow loading more if server has more */}
              {showUnreadOnly && canLoadMore && (
                <div className="mt-6">
                  <button
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                    Tải thêm
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {groups.map(group => (
                <div key={group.label}>
                  <div className="px-4 sm:px-6 py-1.5 bg-gray-100 text-xs font-medium text-gray-500 sticky top-0">
                    {group.label}
                  </div>
                  {group.items.map(notification => (
                    <div
                      key={notification.id}
                      onClick={() => handleClick(notification)}
                      className={`px-4 sm:px-6 py-4 border-b border-gray-100 cursor-pointer transition-colors group ${
                        notification.isRead ? 'bg-white hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {formatRelativeTime(notification.createdAt)}
                          </p>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2">
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full" />
                          )}
                          <button
                            onClick={(e) => handleDelete(e, notification.id)}
                            className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity rounded-md hover:bg-red-50"
                            title="Xóa thông báo"
                            aria-label="Xóa thông báo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {/* Infinite scroll sentinel + manual fallback */}
              <div ref={sentinelRef} className="h-1" aria-hidden="true" />

              <div className="px-4 sm:px-6 py-4 flex flex-col items-center gap-2">
                {loadingMore && (
                  <div className="flex items-center gap-2 text-sm text-gray-500" role="status" aria-busy="true">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang tải...
                  </div>
                )}
                {canLoadMore && !loadingMore && (
                  <button
                    onClick={() => void loadMore()}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Tải thêm
                  </button>
                )}
                {!hasMore && notifications.length > 0 && (
                  <p className="text-xs text-gray-400">Đã xem hết thông báo</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AllNotificationsModal;
