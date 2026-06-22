import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

export type RowActionTone = 'default' | 'primary' | 'success' | 'warning' | 'danger';

export interface RowAction {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  tone?: RowActionTone;
}

const toneClasses: Record<RowActionTone, { inline: string; menu: string }> = {
  default: {
    inline: 'text-gray-400 hover:bg-gray-50 hover:text-gray-700',
    menu: 'text-gray-700 hover:bg-gray-50',
  },
  primary: {
    inline: 'text-gray-400 hover:bg-blue-50 hover:text-blue-600',
    menu: 'text-blue-700 hover:bg-blue-50',
  },
  success: {
    inline: 'text-gray-400 hover:bg-green-50 hover:text-green-600',
    menu: 'text-green-700 hover:bg-green-50',
  },
  warning: {
    inline: 'text-gray-400 hover:bg-yellow-50 hover:text-yellow-700',
    menu: 'text-yellow-700 hover:bg-yellow-50',
  },
  danger: {
    inline: 'text-gray-400 hover:bg-red-50 hover:text-red-600',
    menu: 'text-red-700 hover:bg-red-50',
  },
};

const ResponsiveRowActions = ({ actions, menuLabel = 'Thao tác' }: { actions: RowAction[]; menuLabel?: string }) => {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const triggerRect = triggerRef.current?.getBoundingClientRect();
    if (triggerRect) {
      setMenuPosition({
        top: triggerRect.bottom + 4,
        right: window.innerWidth - triggerRect.right,
      });
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!wrapperRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    const handleViewportChange = () => setOpen(false);

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open]);

  if (actions.length === 0) return null;

  return (
    <div ref={wrapperRef} className="relative flex justify-end">
      <div className="hidden justify-end gap-0.5 lg:flex">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            title={action.label}
            aria-label={action.label}
            onClick={action.onClick}
            className={`rounded-md p-1.5 transition-colors ${toneClasses[action.tone ?? 'default'].inline}`}
          >
            {action.icon}
          </button>
        ))}
      </div>

      <div className="lg:hidden">
        <button
          ref={triggerRef}
          type="button"
          title={menuLabel}
          aria-label={menuLabel}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <MoreHorizontal className="h-4 w-4" />
          {menuLabel}
        </button>

        {open && createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[9999] w-44 overflow-hidden rounded-md border border-gray-200 bg-white py-1 text-left shadow-lg"
            style={{ top: menuPosition.top, right: menuPosition.right }}
          >
            {actions.map((action) => (
              <button
                key={action.key}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  action.onClick();
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${toneClasses[action.tone ?? 'default'].menu}`}
              >
                <span className="shrink-0">{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};

export default ResponsiveRowActions;
