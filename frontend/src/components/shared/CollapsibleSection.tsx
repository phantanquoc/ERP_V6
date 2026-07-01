import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  rightAdornment?: React.ReactNode;
  /** Called once when the section is first expanded */
  onExpand?: () => void;
}

export const CollapsibleSection = ({
  title,
  icon,
  defaultOpen = false,
  children,
  rightAdornment,
  onExpand,
}: CollapsibleSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && onExpand) onExpand();
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50"
      >
        <span className="flex items-center gap-2">
          {icon && <span className="text-gray-500">{icon}</span>}
          {title}
        </span>
        <span className="flex items-center gap-2">
          {rightAdornment}
          {open ? (
            <ChevronDown className="h-4 w-4 text-gray-500 transition-transform" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500 transition-transform" />
          )}
        </span>
      </button>
      {open && <div className="border-t border-gray-100 px-4 py-3">{children}</div>}
    </div>
  );
};

export default CollapsibleSection;
