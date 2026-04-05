import axios from 'axios';

const API_BASE = `http://${window.location.hostname}:8000`;

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('agrochain_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail = error.response?.data?.detail;
    let message;
    if (typeof detail === 'string') {
      message = detail;
    } else if (Array.isArray(detail)) {
      message = detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
    } else {
      message = error.response?.data?.message || error.message || 'An unexpected error occurred';
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('agrochain_token');
      localStorage.removeItem('agrochain_user');
    }
    return Promise.reject(new Error(message));
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const loginUser = (data) => api.post('/auth/login', data).then((r) => r.data);
export const registerUser = (data) => api.post('/auth/register', data).then((r) => r.data);
export const getMe = () => api.get('/auth/me').then((r) => r.data);
export const getUsers = () => api.get('/auth/users').then((r) => r.data);

// ── Products ──────────────────────────────────────────────────────────────────
export const getProducts = (skip = 0, limit = 100) =>
  api.get('/products', { params: { skip, limit } }).then((r) => r.data);
export const getProduct = (id) => api.get(`/products/${id}`).then((r) => r.data);
export const createProduct = (data) => api.post('/products', data).then((r) => r.data);
export const trackProduct = (id) => api.get(`/products/${id}/track`).then((r) => r.data);
export const getProductByBatch = (batch) =>
  api.get(`/products/batch/${encodeURIComponent(batch)}`).then((r) => r.data);
export const getProductQR = (id) => api.get(`/products/${id}/qr`).then((r) => r.data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);

// ── Events ────────────────────────────────────────────────────────────────────
export const getEvents = (productId) =>
  api.get('/events', { params: productId ? { product_id: productId } : {} }).then((r) => r.data);
export const createEvent = (data) => api.post('/events', data).then((r) => r.data);

// ── Actors ────────────────────────────────────────────────────────────────────
export const getActors = () => api.get('/actors').then((r) => r.data);
export const createActor = (data) => api.post('/actors', data).then((r) => r.data);

// ── Recalls ───────────────────────────────────────────────────────────────────
export const getRecalls = () => api.get('/recalls').then((r) => r.data);
export const issueRecall = (data) => api.post('/recalls', data).then((r) => r.data);
export const resolveRecall = (id) => api.patch(`/recalls/${id}/resolve`).then((r) => r.data);
export const getRecallByProduct = (productId) =>
  api.get(`/recalls/product/${productId}`).then((r) => r.data);

// ── Uploads ───────────────────────────────────────────────────────────────────
export const uploadProductImage = (productId, file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post(`/uploads/image/${productId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};
export const uploadCertificate = (productId, file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post(`/uploads/certificate/${productId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};

// ── Export ────────────────────────────────────────────────────────────────────
export const exportProductsCSV = () =>
  api.get('/export/products/csv', { responseType: 'blob' }).then((r) => r.data);
export const exportEventsCSV = () =>
  api.get('/export/events/csv', { responseType: 'blob' }).then((r) => r.data);
export const exportProductAuditCSV = (id) =>
  api.get(`/export/product/${id}/csv`, { responseType: 'blob' }).then((r) => r.data);
export const getExpiringProducts = (days = 7) =>
  api.get('/export/expiring', { params: { days } }).then((r) => r.data);

// ── Stats & Health ────────────────────────────────────────────────────────────
export const getStats = () => api.get('/stats').then((r) => r.data);
export const getHealth = () => api.get('/health').then((r) => r.data);

export const getApiBase = () => API_BASE;

export default api;
