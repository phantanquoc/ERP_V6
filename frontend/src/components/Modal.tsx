import React, { useEffect, useRef } from 'react';
import Portal from './Portal';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  showBackdrop?: boolean;
  /** Cho phép click backdrop để đóng (default: false — chỉ nút X mới đóng) */
  closeOnBackdrop?: boolean;
  /** Accessible name announced by screen readers when the dialog opens. */
  ariaLabel?: string;
  /** When provided, dialog uses aria-labelledby instead of aria-label. */
  ariaLabelledby?: string;
}

// Counter for stacked modals — scroll lock is applied on first open and
// released only when the last modal closes. This avoids flicker/unlock when
// a nested modal closes while a parent remains open.
let scrollLockCount = 0;
let savedBodyOverflow = '';
let savedBodyPaddingRight = '';
let savedHtmlOverflow = '';

const focusableSelector = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className = '',
  showBackdrop = true,
  closeOnBackdrop = false,
  ariaLabel = 'Hộp thoại',
  ariaLabelledby,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Focus first control + restore on close
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    // Portal mounts its children in its own effect, so on this first pass the
    // dialog subtree is usually still empty. Retry on the next frames until the
    // content exists, otherwise focus silently stays on the trigger.
    let frame = 0;
    let attempts = 0;
    const focusFirstControl = () => {
      const dialog = dialogRef.current;
      const firstFocusable = dialog?.querySelector<HTMLElement>(focusableSelector);
      if (firstFocusable) {
        firstFocusable.focus();
        return;
      }
      if (attempts < 5) {
        attempts += 1;
        frame = requestAnimationFrame(focusFirstControl);
        return;
      }
      dialog?.focus();
    };
    focusFirstControl();

    return () => {
      cancelAnimationFrame(frame);
      const previous = previouslyFocusedRef.current;
      if (previous && document.contains(previous)) previous.focus();
      previouslyFocusedRef.current = null;
    };
  }, [isOpen]);

  // Focus trap + Escape + body scroll lock + inert background
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const nodes = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      // Filter out hidden/inert elements — offsetParent check fails for fixed; rely on visibility
      const focusables = nodes.filter((el) => el.tabIndex !== -1 && !el.hasAttribute('hidden'));
      if (focusables.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      // If focus is outside dialog (e.g. on body), move to first
      if (!dialog.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Body scroll lock with counter for stacked modals
    if (scrollLockCount === 0) {
      savedBodyOverflow = document.body.style.overflow;
      savedBodyPaddingRight = document.body.style.paddingRight;
      savedHtmlOverflow = document.documentElement.style.overflow;
    }
    scrollLockCount += 1;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollBarWidth}px`;
    document.documentElement.style.overflow = 'hidden';

    // Inert / aria-hidden siblings: hide everything in <body> except the
    // portal's top-level container that holds this dialog. Use rAF to wait
    // until Portal has mounted the container into document.body.
    let inertFrame = 0;
    const altered: Array<{ el: HTMLElement; prevAriaHidden: string | null; prevInert: boolean }> = [];
    const applyInert = () => {
      const topLevel = dialogRef.current?.parentElement as HTMLElement | null;
      // If not yet mounted, retry once next frame
      if (!topLevel || !document.body.contains(topLevel)) {
        inertFrame = requestAnimationFrame(applyInert);
        return;
      }
      Array.from(document.body.children).forEach((child) => {
        const el = child as HTMLElement;
        if (el === topLevel) return;
        // Skip non-visual nodes
        if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK') return;
        const prevAriaHidden = el.getAttribute('aria-hidden');
        const prevInert = (el as unknown as { inert?: boolean }).inert ?? false;
        altered.push({ el, prevAriaHidden, prevInert });
        el.setAttribute('aria-hidden', 'true');
        // inert is widely supported; guard for older engines
        try {
          (el as unknown as { inert: boolean }).inert = true;
        } catch {
          // ignore — aria-hidden still hides from AT
        }
      });
    };
    // Delay one frame so Portal effect has run
    inertFrame = requestAnimationFrame(applyInert);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(inertFrame);
      // Restore inert / aria-hidden
      altered.forEach(({ el, prevAriaHidden, prevInert }) => {
        if (prevAriaHidden === null) el.removeAttribute('aria-hidden');
        else el.setAttribute('aria-hidden', prevAriaHidden);
        try {
          (el as unknown as { inert: boolean }).inert = prevInert;
        } catch {
          // ignore
        }
      });
      // Release scroll lock only when last modal closes
      scrollLockCount = Math.max(0, scrollLockCount - 1);
      if (scrollLockCount === 0) {
        document.body.style.overflow = savedBodyOverflow;
        document.body.style.paddingRight = savedBodyPaddingRight;
        document.documentElement.style.overflow = savedHtmlOverflow;
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const ariaProps = ariaLabelledby
    ? { 'aria-labelledby': ariaLabelledby }
    : { 'aria-label': ariaLabel };

  return (
    <Portal>
      {/*
        Container phủ toàn màn hình — click vào đây (backdrop) để đóng.
        stopPropagation đặt trực tiếp trên children (modal box) để ngăn click bên trong bubble lên.
      */}
      <div
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ width: '100vw', height: '100vh' }}
        onClick={closeOnBackdrop ? onClose : undefined}
      >
        {/* Backdrop overlay — visual only */}
        {showBackdrop && (
          <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
        )}

        {/* Wrapper z-index + w-full để modal box dùng được max-w-* */}
        <div
          ref={dialogRef}
          className={`relative z-10 w-full flex justify-center ${className}`}
          role="dialog"
          aria-modal="true"
          {...ariaProps}
          tabIndex={-1}
        >
          {children}
        </div>
      </div>
    </Portal>
  );
};

export default Modal;
