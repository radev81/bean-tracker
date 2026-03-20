// frontend/src/api.js
//
// Centralised fetch wrapper.
// VITE_API_URL is configured in:
//   .env.development  →  http://localhost:3001
//   .env.production   →  https://yourdomain.com

const BASE = import.meta.env.VITE_API_URL;

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await res.json();

  // 409 Conflict is intentional — pass it through so callers can handle it
  if (!res.ok && res.status !== 409) {
    throw new Error(data?.error || `API error ${res.status}`);
  }

  return data;
}

// ── Beans ─────────────────────────────────────────────────────────────────────

/** All beans, sorted favourites-first then A–Z. */
export const getBeans = () => apiFetch("/api/beans");

/**
 * Single bean by ID — includes `tags` (string[]) and `recipes` (array).
 * Called lazily when a card is expanded for the first time.
 */
export const getBeanById = (id) => apiFetch(`/api/beans/${id}`);

/**
 * Toggle is_favourite for one bean (0 → 1 or 1 → 0).
 * Returns { id, is_favourite } with the NEW value.
 */
export const toggleFavourite = (id) =>
  apiFetch(`/api/beans/${id}/favourite`, { method: "PUT" });

// ── Containers ────────────────────────────────────────────────────────────────

export const getContainers = () => apiFetch("/api/containers");

// ── Shops ─────────────────────────────────────────────────────────────────────

export const getShops = () => apiFetch("/api/shops");
