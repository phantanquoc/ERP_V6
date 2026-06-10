import React, { useEffect } from 'react';
import Portal from './Portal';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  showBackdrop?: boolean;
  /** Cho phép click backdrop để đóng (default: false — chỉ nút X mới đóng) */
  closeOnBackdrop?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className = '',
  showBackdrop = true,
  closeOnBackdrop = false,
}) => {
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
        <div className={`relative z-10 w-full flex justify-center ${className}`}>
          {children}
        </div>
      </div>
    </Portal>
  );
};

export default Modal;

