import React, { useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { AppNotification } from '../services/notificationService';
import { getNotificationIcon, formatRelativeTime } from './myNotificationsUtils';

interface MyNotificationsItemProps {
  item: AppNotification;
  onItemClick: (item: AppNotification, buttonEl?: HTMLButtonElement) => void;
  onDelete: (id: string) => void;
}

const MyNotificationsItem: React.FC<MyNotificationsItemProps> = ({
  item,
  onItemClick,
  onDelete,
}) => {
  const rowRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="group relative flex items-start gap-3 px-4 py-3 hover:bg-gray-50/70 transition-colors border-b border-gray-100 last:border-0">
      {/* Unread dot */}
      {!item.isRead && (
        <span
          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"
          aria-hidden="true"
        />
      )}

      {/* Icon */}
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-50 ring-1 ring-gray-200 flex items-center justify-center mt-0.5">
        {getNotificationIcon(item.type)}
      </div>

      {/* Row body — clickable */}
      <button
        ref={rowRef}
        type="button"
        onClick={() => onItemClick(item, rowRef.current ?? undefined)}
        className="flex-1 min-w-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
      >
        {/* Title */}
        <p
          className={`text-sm truncate leading-snug ${
            item.isRead ? 'font-normal text-gray-700' : 'font-semibold text-gray-900'
          }`}
        >
          {item.title}
        </p>
        {/* Message — two lines clamped */}
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
          {item.message}
        </p>
        {/* Timestamp */}
        <p className="text-[11px] text-gray-400 mt-1">{formatRelativeTime(item.createdAt)}</p>
      </button>

      {/* Hover-revealed delete button (desktop) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item.id);
        }}
        className="flex-shrink-0 p-1.5 rounded-lg text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        aria-label={`Xóa thông báo "${item.title}"`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

export default MyNotificationsItem;
