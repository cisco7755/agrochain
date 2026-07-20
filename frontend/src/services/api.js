import axios from 'axios';

const API_BASE = `http://${window.location.hostname}:8000`;

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// No JWT — wallet is the identity layer. All requests are unauthenticated.
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
    return Promise.reject(new Error(message));
  }
);

// ── Products (read-only via backend) ─────────────────────────────────────────
export const getProducts = (skip = 0, limit = 100) =>
  api.get('/products', { params: { skip, limit } }).then((r) => r.data);
export const getProduct = (id) => api.get(`/products/${id}`).then((r) => r.data);
export const trackProduct = (id) => api.get(`/products/${id}/track`).then((r) => r.data);
export const getProductByBatch = (batch) =>
  api.get(`/products/batch/${encodeURIComponent(batch)}`).then((r) => r.data);

// QR-scan anti-cloning: logs a scan and returns activity stats. Works for
// any on-chain product ID, whether or not the backend cache knows about it.
export const logScan = (productId, unitNumber) =>
  api.post(`/products/${productId}/scan`, null, {
    params: unitNumber ? { unit: unitNumber } : {},
  }).then((r) => r.data);

// Test-ETH faucet — funds a wallet so it can pay gas (rate-limited server-side).
export const requestFaucet = (address) =>
  api.post('/faucet/', { address }).then((r) => r.data);

// ── Events ────────────────────────────────────────────────────────────────────
export const getEvents = (productId) =>
  api.get('/events', { params: productId ? { product_id: productId } : {} }).then((r) => r.data);
export const createEvent = (data) => api.post('/events', data).then((r) => r.data);

// ── Actors ────────────────────────────────────────────────────────────────────
export const getActors = () => api.get('/actors').then((r) => r.data);

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
// Decoupled from any backend product row — used when issuing an on-chain
// certification, where the document URL gets passed into issueCertification().
export const uploadCertificationDocument = (file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/uploads/certification-document', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};

// ── Export ────────────────────────────────────────────────────────────────────
export const exportProductAuditCSV = (id) =>
  api.get(`/export/product/${id}/csv`, { responseType: 'blob' }).then((r) => r.data);
export const getExpiringProducts = (days = 7) =>
  api.get('/export/expiring', { params: { days } }).then((r) => r.data);

// ── Stats & Health ────────────────────────────────────────────────────────────
export const getStats = () => api.get('/stats').then((r) => r.data);
export const getHealth = () => api.get('/health').then((r) => r.data);

export const getApiBase = () => API_BASE;

export default api;
