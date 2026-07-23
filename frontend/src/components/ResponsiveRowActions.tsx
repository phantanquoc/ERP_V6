import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import { MoreHorizontal } from 'lucide-react';

export type RowActionTone = 'default' | 'primary' | 'success' | 'warning' | 'danger';

export interface RowAction {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  tone?: RowActionTone;
  disabled?: boolean;
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

const ResponsiveRowActions = ({ actions, menuLabel = 'Thao tác', alwaysMenu = false }: { actions: RowAction[]; menuLabel?: string; alwaysMenu?: boolean }) => {
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-end',
    middleware: [offset(4), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'menu' });

  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

  if (actions.length === 0) return null;

  return (
    <div className="relative flex justify-end">
      {!alwaysMenu && (
        <div className="hidden justify-end gap-0.5 lg:flex">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              title={action.label}
              aria-label={action.label}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`rounded-md p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${toneClasses[action.tone ?? 'default'].inline}`}
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}

      <div className={alwaysMenu ? '' : 'lg:hidden'}>
        <button
          ref={refs.setReference}
          type="button"
          title={menuLabel}
          aria-label={menuLabel}
          aria-haspopup="menu"
          aria-expanded={open}
          className={
            alwaysMenu
              ? 'inline-flex items-center rounded-md border border-gray-300 bg-white p-1.5 text-gray-600 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500'
              : 'inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500'
          }
          {...getReferenceProps({ onClick: (e) => e.stopPropagation() })}
        >
          <MoreHorizontal className="h-4 w-4" />
          {!alwaysMenu && menuLabel}
        </button>

        {open && (
          <FloatingPortal>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className="z-[9999] w-44 overflow-hidden rounded-md border border-gray-200 bg-white py-1 text-left shadow-lg"
              {...getFloatingProps()}
            >
              {actions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  role="menuitem"
                  disabled={action.disabled}
                  onClick={() => {
                    setOpen(false);
                    action.onClick();
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${toneClasses[action.tone ?? 'default'].menu}`}
                >
                  <span className="shrink-0">{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </FloatingPortal>
        )}
      </div>
    </div>
  );
};

export default ResponsiveRowActions;
