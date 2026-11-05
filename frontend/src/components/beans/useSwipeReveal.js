import { useRef, useState, useEffect, useCallback } from 'react';

// Width of the revealed action strip in px.
// Must match the width of the action strip in CSS (.bl-row__actions).
export const SWIPE_PANEL_WIDTH = 140;

const SNAP_DIST      = 44;  // px — minimum drag distance to snap open
const SNAP_VEL       = 0.3; // px/ms — fast-swipe threshold (snap open even with short drag)
const DIR_THRESHOLD  = 5;   // px — movement needed before horizontal/vertical is decided

/**
 * Touch-only swipe-to-reveal hook.
 *
 * Attaches touchstart/touchmove/touchend to `trackRef`. Detects horizontal vs
 * vertical intent before acting so vertical page scrolling is not blocked.
 *
 * While the finger is down the row follows it; when it lifts the row snaps
 * open or closed and the parent is told via onOpen / onClose. When nothing is
 * being dragged, the position simply follows `isOpen` — so the parent can
 * close a row (e.g. when another row opens) just by changing that prop.
 *
 * @param {object}   opts
 * @param {boolean}  opts.enabled   – false to ignore touches entirely
 * @param {boolean}  opts.isOpen    – controlled open state driven by the parent list
 * @param {function} opts.onOpen    – called when the panel snaps open
 * @param {function} opts.onClose   – called when the panel snaps closed
 *
 * @returns {{ trackRef, offset, transitioning }}
 *   trackRef      – attach to the swipe-track element via ref={trackRef}
 *   offset        – current translation in px (0 = closed, SWIPE_PANEL_WIDTH = open)
 *   transitioning – true when not dragging; apply a CSS transition while true
 */
export function useSwipeReveal({ enabled, isOpen, onOpen, onClose }) {
  const trackRef  = useRef(null);
  const offsetRef = useRef(0);   // mutable ref — always current, avoids stale closures
  const touchRef  = useRef(null);

  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging]     = useState(false);

  // Stable callback refs so event handlers don't need to re-register on every render
  const isOpenRef  = useRef(isOpen);
  const onOpenRef  = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  useEffect(() => { isOpenRef.current  = isOpen;  }, [isOpen]);
  useEffect(() => { onOpenRef.current  = onOpen;  }, [onOpen]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const handleTouchStart = useCallback((e) => {
    if (!enabled) return;
    const t = e.touches[0];
    touchRef.current = {
      startX:       t.clientX,
      startY:       t.clientY,
      startOffset:  isOpenRef.current ? SWIPE_PANEL_WIDTH : 0,
      startTime:    Date.now(),
      lastX:        t.clientX,
      lastTime:     Date.now(),
      decided:      false,
      isHorizontal: false,
    };
    offsetRef.current = touchRef.current.startOffset;
  }, [enabled]);

  const handleTouchMove = useCallback((e) => {
    if (!enabled || !touchRef.current) return;
    const t  = e.touches[0];
    const tc = touchRef.current;

    // Determine swipe direction on first significant movement
    if (!tc.decided) {
      const absDx = Math.abs(t.clientX - tc.startX);
      const absDy = Math.abs(t.clientY - tc.startY);
      if (absDx < DIR_THRESHOLD && absDy < DIR_THRESHOLD) return;
      tc.decided      = true;
      tc.isHorizontal = absDx > absDy;
      if (tc.isHorizontal) setDragging(true);
    }

    if (!tc.isHorizontal) return; // vertical scroll — let browser handle it

    const dx      = tc.startX - t.clientX; // positive = left swipe
    const raw     = tc.startOffset + dx;
    const clamped = Math.max(0, Math.min(SWIPE_PANEL_WIDTH, raw));

    // Block page scroll only when actually moving horizontally
    if (clamped > 0) e.preventDefault();

    offsetRef.current = clamped;
    setDragOffset(clamped);
    tc.lastX    = t.clientX;
    tc.lastTime = Date.now();
  }, [enabled]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !touchRef.current) return;
    const tc = touchRef.current;
    touchRef.current = null;

    if (!tc.isHorizontal) return; // was a scroll — leave state unchanged

    const totalDx = tc.startX - tc.lastX;                  // positive = swiped left
    const dt      = Math.max(1, tc.lastTime - tc.startTime);
    const vel     = totalDx / dt;
    const cur     = offsetRef.current;

    setDragging(false);
    if (cur > SNAP_DIST || vel > SNAP_VEL) {
      onOpenRef.current();
    } else {
      onCloseRef.current();
    }
  }, [enabled]);

  // Attach / detach touch listeners whenever the handlers change
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove',  handleTouchMove,  { passive: false });
    el.addEventListener('touchend',   handleTouchEnd);
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove',  handleTouchMove);
      el.removeEventListener('touchend',   handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    trackRef,
    offset: dragging ? dragOffset : (isOpen ? SWIPE_PANEL_WIDTH : 0),
    transitioning: !dragging,
  };
}
