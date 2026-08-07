import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

const MIN_DROPDOWN_HEIGHT = 200;
const DROPDOWN_GAP = 4;
const VIEWPORT_MARGIN = 8;

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Sub-pixel layout noise must not count as a content change. */
const isSameHeight = (a: number, b: number) => Math.abs(a - b) < 1;

export interface DropdownPosition {
  top: number;
  left: number;
  maxHeight: number;
}

interface UseDropdownPositionOptions {
  /** Whether the dropdown is currently mounted/visible. */
  isOpen: boolean;
  /** Element the dropdown is anchored to (usually the trigger input). */
  anchorRef: RefObject<HTMLElement | null>;
  /** Fixed dropdown width in px, used for the horizontal clamp. */
  width: number;
  /** First-paint guess, replaced by the real measurement as soon as it exists. */
  estimatedHeight: number;
}

interface UseDropdownPositionResult {
  position: DropdownPosition;
  /** Attach to the scroll container that receives `position` as inline style. */
  dropdownRef: RefObject<HTMLDivElement>;
  /** Attach to a plain wrapper holding all dropdown content — the measured element. */
  contentRef: RefObject<HTMLDivElement>;
}

/**
 * Positions a `position: fixed` portal dropdown against its anchor and caps its
 * height to the viewport space actually available.
 *
 * Height comes from a real measurement of the content, not an estimate, so the
 * flip-up decision and the height cap stay correct when the content changes
 * (a 6-row month is ~40px taller than a 5-row one).
 *
 * SSR-safe: all layout reads are guarded and only run in effects.
 */
export default function useDropdownPosition({
  isOpen,
  anchorRef,
  width,
  estimatedHeight,
}: UseDropdownPositionOptions): UseDropdownPositionResult {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const naturalHeightRef = useRef(estimatedHeight);
  const previousHeightRef = useRef<number | null>(null);

  const [position, setPosition] = useState<DropdownPosition>({
    top: 0,
    left: 0,
    maxHeight: estimatedHeight,
  });

  const calcPosition = useCallback(() => {
    if (typeof window === 'undefined') return;
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const desiredHeight = naturalHeightRef.current;
    const spaceBelow = window.innerHeight - rect.bottom - DROPDOWN_GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - DROPDOWN_GAP - VIEWPORT_MARGIN;
    // Prefer below. Flip up when below cannot fit; when neither side fits, take
    // the roomier side so the scrollable body stays as tall as possible.
    const showAbove =
      spaceBelow < desiredHeight && (spaceAbove >= desiredHeight || spaceAbove > spaceBelow);

    // Floor keeps the dropdown usable (scrollable) instead of collapsing to a
    // sliver on very short viewports; overflowing the margin is the lesser evil.
    const maxHeight = Math.max(
      MIN_DROPDOWN_HEIGHT,
      Math.min(desiredHeight, showAbove ? spaceAbove : spaceBelow)
    );

    const top = showAbove
      ? Math.max(VIEWPORT_MARGIN, rect.top - maxHeight - DROPDOWN_GAP)
      : rect.bottom + DROPDOWN_GAP;

    // Clamp both edges: the right-edge clamp alone goes negative on viewports
    // narrower than the dropdown width + margin.
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(rect.left, window.innerWidth - width - VIEWPORT_MARGIN)
    );

    // Bail out on an unchanged result so a ResizeObserver tick can never turn
    // into a render loop.
    setPosition((prev) =>
      prev.top === top && prev.left === left && prev.maxHeight === maxHeight
        ? prev
        : { top, left, maxHeight }
    );
  }, [anchorRef, width]);

  const measureNaturalHeight = useCallback(() => {
    if (typeof window === 'undefined') return;
    const content = contentRef.current;
    const container = dropdownRef.current;
    if (!content || !container) return;

    // Measure the unclamped content wrapper, never the container: the container
    // carries the `maxHeight` this measurement feeds, so measuring it would let
    // the cap drive its own input.
    const style = window.getComputedStyle(container);
    const containerChrome =
      parseFloat(style.paddingTop) +
      parseFloat(style.paddingBottom) +
      parseFloat(style.borderTopWidth) +
      parseFloat(style.borderBottomWidth);

    const next = Math.ceil(content.getBoundingClientRect().height + containerChrome);
    if (next <= 0) return;

    const applied = naturalHeightRef.current;
    if (isSameHeight(next, applied)) return;

    // Oscillation breaker. A cap change can toggle the scrollbar, which narrows
    // the content box and can feed a different height straight back — A/B/A
    // forever. On the first repeat, settle on the taller of the pair (a
    // too-generous cap only costs a slightly conservative flip decision, while
    // a too-small one shows a scrollbar that is not needed) and ignore both
    // values until a genuinely new height arrives.
    const previous = previousHeightRef.current;
    if (previous !== null && isSameHeight(next, previous)) {
      naturalHeightRef.current = Math.max(next, applied);
      previousHeightRef.current = Math.min(next, applied);
      calcPosition();
      return;
    }

    previousHeightRef.current = applied;
    naturalHeightRef.current = next;
    calcPosition();
  }, [calcPosition]);

  // Measure + position before paint so the first frame already uses real numbers.
  useIsomorphicLayoutEffect(() => {
    if (!isOpen) return;
    measureNaturalHeight();
    calcPosition();
    // The measured height carries over to the next open as a better estimate;
    // the oscillation history does not.
    return () => {
      previousHeightRef.current = null;
    };
  }, [isOpen, measureNaturalHeight, calcPosition]);

  // Re-measure when the content itself changes height (month with 6 day rows,
  // font swap, conditional footer buttons).
  useEffect(() => {
    if (!isOpen) return;
    const content = contentRef.current;
    if (!content || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => measureNaturalHeight());
    observer.observe(content);
    return () => observer.disconnect();
  }, [isOpen, measureNaturalHeight]);

  // Re-position while open as the anchor moves through the viewport.
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const handleUpdate = () => calcPosition();
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isOpen, calcPosition]);

  return { position, dropdownRef, contentRef };
}
