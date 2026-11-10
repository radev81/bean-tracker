// src/authReturn.js
// ─────────────────────────────────────────────────────────────────────────────
// Remember which page someone was on when they tapped "Sign in", so the
// Logto callback can bring them back there (e.g. a scanned container page)
// instead of always landing on the bean list.
//
// Stored in sessionStorage (this browser tab only). Only paths inside this
// app are accepted, so the value can never send someone to another site.
// ─────────────────────────────────────────────────────────────────────────────

const KEY = "bt-return-to";
const BASE = import.meta.env.BASE_URL; // "/beans/"

export function rememberReturnPath() {
  try {
    sessionStorage.setItem(KEY, window.location.pathname);
  } catch {
    /* storage unavailable — we'll just land on the bean list */
  }
}

export function takeReturnPath() {
  let saved = null;
  try {
    saved = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
  const safe =
    typeof saved === "string" &&
    saved.startsWith(BASE) &&
    !saved.startsWith("//") &&
    !saved.includes("callback");
  return safe ? saved : BASE;
}
