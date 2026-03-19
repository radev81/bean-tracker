/**
 * theme.js — Beans Tracker · Mocha Deep
 * Single source of truth for all design tokens.
 *
 * CSS variables (index.css) and this file must stay in sync.
 * Use this file whenever JS logic needs a colour value —
 * e.g. canvas drawing, dynamic inline styles, chart colours.
 */

export const colors = {
  // ── Backgrounds ──────────────────────────────────────────
  bg: "#F4F2EE", // warm paper — page background
  surface: "#FFFFFF", // card / panel surface
  border: "#E4E1DA", // default border
  borderHi: "#CCCAB8", // stronger border (focus rings, dividers)

  // ── Text ─────────────────────────────────────────────────
  text: "#0A0906", // primary — bean names, headings
  text2: "#6B6860", // secondary — metadata, detail values
  text3: "#ABABAB", // muted — labels, placeholders
  text4: "#D4D2CC", // inactive icons (un-favourite ♥)

  // ── Accent (Mocha Deep) ──────────────────────────────────
  accentStart: "#6A3828", // gradient start
  accentEnd: "#0E0806", // gradient end (near-black espresso)
  accentMid: "#4A2015", // mid-point — used for text on light bg
  accentBg: "rgba(74,32,21,0.10)", // tinted chip background
  accentBorder: "rgba(74,32,21,0.22)", // tinted chip border
};

export const gradients = {
  accent: "linear-gradient(135deg, #6A3828, #0E0806)", // buttons, active fav icon
  accentVertical: "linear-gradient(180deg, #6A3828, #0E0806)", // expanded card left bar, tab underline
};

export const radii = {
  card: "14px",
  addBtn: "13px",
  search: "10px",
  btn: "8px",
  badge: "6px",
  tag: "4px",
  pill: "20px",
};

export const font = "'Outfit', system-ui, sans-serif";

export const weights = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};
