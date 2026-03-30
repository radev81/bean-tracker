import { createContext, useContext } from "react";

const API_RESOURCE = import.meta.env.VITE_API_RESOURCE || "http://localhost:3000";
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export const ApiContext = createContext(null);
export const useApi = () => useContext(ApiContext);

export function createApiClient(getAccessToken) {
  async function request(method, path, body) {
    const token = await getAccessToken(API_RESOURCE);
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data?.error || `API error ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return data;
  }

  return {
    // Beans
    getBeans: () => request("GET", "/api/beans"),
    getBeanById: (id) => request("GET", `/api/beans/${id}`),
    createBean: (payload) => request("POST", "/api/beans", payload),
    updateBean: (id, payload) => request("PUT", `/api/beans/${id}`, payload),
    toggleFavourite: (id) => request("PUT", `/api/beans/${id}/favourite`),
    deleteBean: (id) => request("DELETE", `/api/beans/${id}`),
    // Containers
    getContainers: () => request("GET", "/api/containers"),
    createContainer: (name) => request("POST", "/api/containers", { name }),
    updateContainer: (id, name) => request("PUT", `/api/containers/${id}`, { name }),
    deleteContainer: (id) => request("DELETE", `/api/containers/${id}`),
    getContainerCurrentBean: (id) =>
      request("GET", `/api/containers/${id}/current-bean`),
    // Shops
    getShops: () => request("GET", "/api/shops"),
    createShop: (name, url = null) => request("POST", "/api/shops", { name, url }),
    updateShop: (id, name, url = null) =>
      request("PUT", `/api/shops/${id}`, { name, url }),
    deleteShop: (id) => request("DELETE", `/api/shops/${id}`),
  };
}
