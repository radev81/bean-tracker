// components/ui/geometry.js
// ─────────────────────────────────────────────────────────────────────────────
// Shared maths for the round "Dial" gauges.
//
// Every dial in the app uses the same shape: a 270° arc that starts at the
// bottom-left (135°) and runs clockwise to the bottom-right, leaving a 90° gap
// at the bottom (room for ± buttons). Angles are in degrees, measured
// clockwise from "3 o'clock" — the same convention SVG uses.
// ─────────────────────────────────────────────────────────────────────────────

export const START_DEG = 135; // where the arc begins (bottom-left)
export const SWEEP_DEG = 270; // how far the arc travels

/** Keep a number between 0 and 1. */
export function clamp01(n) {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** Where `value` sits between `min` and `max`, as 0…1. */
export function fraction(value, min, max) {
  if (max === min) return 0;
  return clamp01((value - min) / (max - min));
}

/** Point on a circle: centre (cx, cy), radius r, angle in degrees. */
export function polar(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** Angle (degrees) for a 0…1 position along the arc. */
export function angleAt(t) {
  return START_DEG + SWEEP_DEG * t;
}

/** Full circumference and the length of the 270° arc for radius r. */
export function arcLengths(r) {
  const circumference = 2 * Math.PI * r;
  return { circumference, arc: (circumference * SWEEP_DEG) / 360 };
}

/**
 * Turn a pointer position into a 0…1 position on the arc.
 * Positions inside the bottom gap snap to the nearest end.
 */
export function fractionFromPoint(x, y, cx, cy) {
  let deg = (Math.atan2(y - cy, x - cx) * 180) / Math.PI; // -180…180
  let rel = (deg - START_DEG + 360) % 360; // 0…360 from arc start
  if (rel > SWEEP_DEG) {
    // In the gap: closer to the end (270) or back to the start (360)?
    rel = rel - SWEEP_DEG < (360 - SWEEP_DEG) / 2 ? SWEEP_DEG : 0;
  }
  return rel / SWEEP_DEG;
}

/** Round a value to the nearest `step`, keeping float noise out (0.1+0.2). */
export function snap(value, step, min = 0) {
  const decimals = (String(step).split(".")[1] || "").length;
  const snapped = Math.round((value - min) / step) * step + min;
  return Number(snapped.toFixed(decimals));
}
