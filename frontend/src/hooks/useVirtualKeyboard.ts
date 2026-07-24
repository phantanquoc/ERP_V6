import { useEffect, useState, useCallback } from 'react';

interface VirtualKeyboardState {
  keyboardOpen: boolean;
  keyboardHeight: number;
}

/**
 * Detects if virtual keyboard is open (mobile/tablet).
 * Uses visualViewport API with absolute threshold (150px diff)
 * to handle landscape tablets where keyboard is only 30-40% of height.
 * Also auto-scrolls the focused input into view when keyboard opens.
 */
export default function useVirtualKeyboard(): VirtualKeyboardState {
  const [state, setState] = useState<VirtualKeyboardState>({
    keyboardOpen: false,
    keyboardHeight: 0,
  });

  const scrollFocusedIntoView = useCallback(() => {
    setTimeout(() => {
      const el = document.activeElement;
      if (
        el &&
        (el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement)
      ) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }, 100);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;

    const check = () => {
      // Ignore pinch-zoom — only detect keyboard when scale is 1
      if (vv.scale !== 1) return;

      const diff = document.documentElement.clientHeight - vv.height;
      const isOpen = diff > 150;

      setState((prev) => {
        if (prev.keyboardOpen !== isOpen) {
          // Keyboard just opened — scroll focused element into view
          if (isOpen) {
            scrollFocusedIntoView();
          }
          return { keyboardOpen: isOpen, keyboardHeight: isOpen ? diff : 0 };
        }
        // Update height even if state hasn't toggled
        if (isOpen && Math.abs(prev.keyboardHeight - diff) > 10) {
          return { keyboardOpen: true, keyboardHeight: diff };
        }
        return prev;
      });
    };

    check();
    vv.addEventListener('resize', check);
    vv.addEventListener('scroll', check);
    return () => {
      vv.removeEventListener('resize', check);
      vv.removeEventListener('scroll', check);
    };
  }, [scrollFocusedIntoView]);

  return state;
}
