const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export const apiRequest = async (path, options = {}) => {
  const token = options.token || sessionStorage.getItem("landstack_token");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`);
  return body;
};
export const loginCitizen = (payload) => apiRequest("/auth/verify-otp", { method: "POST", body: JSON.stringify(payload) });
export const loginOfficial = (payload) => apiRequest("/auth/official-login", { method: "POST", body: JSON.stringify(payload) });
export const getParcels = (state) => apiRequest(`/parcels${state ? `?state=${encodeURIComponent(state)}` : ""}`);
export { API };
