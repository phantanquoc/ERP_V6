import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface HoverTooltipProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Lightweight hover tooltip rendered through a portal so it is never clipped
 * by ancestor `overflow-hidden` / `overflow-auto` containers (e.g. scrollable
 * tables). Positioned in fixed/viewport coordinates via getBoundingClientRect.
 */
export const HoverTooltip: React.FC<HoverTooltipProps> = ({ title, description, children, className }) => {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  const show = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const halfWidth = 130; // half of max tooltip width (260px)
    let left = r.left + r.width / 2;
    if (left < halfWidth + 4) left = halfWidth + 4;
    if (left > window.innerWidth - halfWidth - 4) left = window.innerWidth - halfWidth - 4;
    setPos({ top: r.bottom + 6, left });
  }, []);

  const hide = useCallback(() => setPos(null), []);

  return (
    <span ref={ref} onMouseEnter={show} onMouseLeave={hide} className={className}>
      {children}
      {pos && createPortal(
        <div
          style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translateX(-50%)', zIndex: 9999 }}
          className="pointer-events-none max-w-[260px] rounded-md bg-gray-900 text-white text-[11px] leading-snug px-2.5 py-2 shadow-lg text-left font-normal normal-case whitespace-normal"
        >
          <div className="font-semibold mb-0.5">{title}</div>
          {description && <div className="text-gray-200">{description}</div>}
        </div>,
        document.body,
      )}
    </span>
  );
};

export default HoverTooltip;
