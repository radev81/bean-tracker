/**
 * api.js — Beans Tracker backend client
 * ──────────────────────────────────────
 * All fetch calls go through here.
 * The base URL is set in .env (VITE_API_URL).
 *
 * Local dev:   VITE_API_URL=http://localhost:3001
 * Production:  VITE_API_URL=http://192.168.x.x:3001   ← your NAS IP
 *
 * Create a file called `.env` in the `frontend/` folder with:
 *   VITE_API_URL=http://localhost:3001
 * (Vite automatically loads it — never commit secrets to this file.)
 */

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

// ── Generic helper ────────────────────────────────────────────────────────────
async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    // Surface the server's error message when available
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  // 204 No Content responses have no body
  if (res.status === 204) return null;
  return res.json();
}

// ── Beans ─────────────────────────────────────────────────────────────────────
// Returns the v_beans view: all fields including shop_name, container_name, etc.
export const getBeans = () => request("/api/beans");
export const getBean = (id) => request(`/api/beans/${id}`);
export const createBean = (data) =>
  request("/api/beans", { method: "POST", body: JSON.stringify(data) });
export const updateBean = (id, data) =>
  request(`/api/beans/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteBean = (id) =>
  request(`/api/beans/${id}`, { method: "DELETE" });

// ── Containers ────────────────────────────────────────────────────────────────
export const getContainers = () => request("/api/containers");
export const createContainer = (data) =>
  request("/api/containers", { method: "POST", body: JSON.stringify(data) });
export const updateContainer = (id, data) =>
  request(`/api/containers/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
export const deleteContainer = (id) =>
  request(`/api/containers/${id}`, { method: "DELETE" });

// ── Shops ─────────────────────────────────────────────────────────────────────
export const getShops = () => request("/api/shops");
export const createShop = (data) =>
  request("/api/shops", { method: "POST", body: JSON.stringify(data) });
export const updateShop = (id, data) =>
  request(`/api/shops/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteShop = (id) =>
  request(`/api/shops/${id}`, { method: "DELETE" });
