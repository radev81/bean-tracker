/**
 * theme.js — Beans Tracker · Dial design tokens
 * Mirror of the CSS variables in index.css, for places where JavaScript
 * needs a colour value (e.g. SVG dials drawn from code, inline styles).
 *
 * index.css is the source of truth — keep this file in sync with it.
 * In components, prefer CSS variables (e.g. "var(--signal)") so the
 * light/dark theme switch keeps working; use these values only when a
 * literal colour is unavoidable.
 */

export const colors = {
  dark: {
    ground: "#0B0B0A", // page background
    face: "#121211", // cards, dial faces
    raised: "#161614", // sheets, selected tiles
    line: "#2A2A27", // borders, dial track
    lineHi: "#3A3935", // stronger borders, minor ticks
    ink: "#F3EFE6", // primary text, primary buttons
    ink2: "#D9D4C8", // secondary text
    muted: "#A39E93", // labels, metadata
    ghost: "#4A4844", // inactive icons
    signal: "#F2A65A", // the one accent: live / selected
    onInk: "#0B0B0A", // text on ink buttons
    danger: "#E06A4E",
  },
  light: {
    ground: "#F4F1EA",
    face: "#FFFFFF",
    raised: "#FAF8F3",
    line: "#E2DDD2",
    lineHi: "#CFC8BA",
    ink: "#141311",
    ink2: "#3F3B35",
    muted: "#6B665D",
    ghost: "#C9C3B7",
    signal: "#B8661A",
    onInk: "#FAF8F3",
    danger: "#B4402A",
  },
};

export const radii = {
  card: "20px",
  sheet: "28px",
  input: "14px",
  pill: "999px",
};

// Dial geometry shared by every round gauge in the app
export const dial = {
  sweepDeg: 270, // arc length; the 90° gap sits at the bottom
  startDeg: 135, // where the arc starts (bottom-left), clockwise
};

export const font = "'Manrope', system-ui, sans-serif";

export const weights = {
  light: 300, // big dial readouts
  regular: 400,
  medium: 500, // titles, bean names
  semibold: 600, // primary buttons, small caps labels
  bold: 700,
};
