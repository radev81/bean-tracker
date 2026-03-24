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
    credentials: "include",
  });

  if (res.status === 401) {
    window.location.href = `${BASE}/authelia/?rd=${BASE}/app`;
    return new Promise(() => {});
  }

  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data?.error || `API error ${res.status}`);
    error.status = res.status;
    throw error;
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
 * Update an existing bean by ID
 */
export const updateBean = (id, payload) =>
  apiFetch(`/api/beans/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

/**
 * Toggle is_favourite for one bean (0 → 1 or 1 → 0).
 * Returns { id, is_favourite } with the NEW value.
 */
export const toggleFavourite = (id) =>
  apiFetch(`/api/beans/${id}/favourite`, { method: "PUT" });

/**
 * Deleate a bean by ID
 */
export const deleteBean = (id) =>
  apiFetch(`/api/beans/${id}`, { method: "DELETE" });

// ── Containers ────────────────────────────────────────────────────────────────

export function getContainers() {
  return apiFetch("/api/containers");
}

export function createContainer(name) {
  return apiFetch("/api/containers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export function updateContainer(id, name) {
  return apiFetch(`/api/containers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export function deleteContainer(id) {
  return apiFetch(`/api/containers/${id}`, { method: "DELETE" });
}

// ── Shops ─────────────────────────────────────────────────────────────────────

export function getShops() {
  return apiFetch("/api/shops");
}

export function createShop(name, url = null) {
  return apiFetch("/api/shops", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, url }),
  });
}

export function updateShop(id, name, url = null) {
  return apiFetch(`/api/shops/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, url }),
  });
}

export function deleteShop(id) {
  return apiFetch(`/api/shops/${id}`, { method: "DELETE" });
}
