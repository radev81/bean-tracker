// frontend/src/api.js
//
// Centralised fetch wrapper.
// VITE_API_URL is configured in:
//   .env.development  →  http://localhost:3001
//   .env.production   →  https://yourdomain.com

const BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(
  /\/$/,
  "",
); // strip trailing slash, just in case

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.error || message;
    } catch {
      // Response wasn't JSON — keep the status code message
    }
    throw new Error(message);
  }

  return res.json();
}

// ── Beans ─────────────────────────────────────────────────────────────────────

/** All beans, sorted favourites-first then A–Z. */
export const getBeans = () => request("/api/beans");

/**
 * Single bean by ID — includes `tags` (string[]) and `recipes` (array).
 * Called lazily when a card is expanded for the first time.
 */
export const getBeanById = (id) => request(`/api/beans/${id}`);

/**
 * Toggle is_favourite for one bean (0 → 1 or 1 → 0).
 * Returns { id, is_favourite } with the NEW value.
 */
export const toggleFavourite = (id) =>
  request(`/api/beans/${id}/favourite`, { method: "PUT" });

// ── Containers ────────────────────────────────────────────────────────────────

export const getContainers = () => request("/api/containers");

// ── Shops ─────────────────────────────────────────────────────────────────────

export const getShops = () => request("/api/shops");
