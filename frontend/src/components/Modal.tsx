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
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className = '',
  showBackdrop = true,
  closeOnBackdrop = false,
  ariaLabel = 'Hộp thoại',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const focusableSelector = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

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

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollBarWidth}px`;
      document.documentElement.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.documentElement.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
          <div className="absolute inset-0 bg-black/50" />
        )}

        {/* Wrapper z-index + w-full để modal box dùng được max-w-* */}
        <div
          ref={dialogRef}
          className={`relative z-10 w-full flex justify-center ${className}`}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          tabIndex={-1}
        >
          {children}
        </div>
      </div>
    </Portal>
  );
};

export default Modal;

