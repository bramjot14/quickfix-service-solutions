import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('qf_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('qf_token');
      localStorage.removeItem('qf_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// ─── Public ───────────────────────────────────────────────
export const publicAPI = {
  getCategories: () => api.get('/public/categories'),
  getPros: (params) => api.get('/public/pros', { params }),
  getPro: (id) => api.get(`/public/pros/${id}`),
};

// ─── Workers ──────────────────────────────────────────────
export const workerAPI = {
  updateProfile: (data) => api.patch('/workers/me/profile', data),
  requestVerification: () => api.post('/workers/me/verification/request'),
  getVerification: () => api.get('/workers/me/verification'),
  setAvailability: (data) => api.patch('/workers/me/availability', data),
  getAvailability: () => api.get('/workers/me/availability'),
  getDashboard: () => api.get('/workers/me/dashboard'),
  uploadDocument: (formData) => api.post('/workers/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getDocuments: () => api.get('/workers/documents/me'),
};

// ─── Jobs ────────────────────────────────────────────────
export const jobsAPI = {
  createJob: (formData) => api.post('/jobs', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getMyJobs: (params) => api.get('/jobs/mine', { params }),
  getOpenJobs: (params) => api.get('/jobs/open', { params }),
  getJob: (id) => api.get(`/jobs/${id}`),
  updateJob: (id, data) => api.patch(`/jobs/${id}`, data),
  cancelJob: (id, data) => api.delete(`/jobs/${id}`, { data }),
  customerPay: (id, data) => api.post(`/jobs/${id}/customer-pay`, data),
  cancelJob: (id, data) => api.delete(`/jobs/${id}`, { data }),
  customerPay: (id, data) => api.post(`/jobs/${id}/customer-pay`, data),
  requestPaymentWorker: (id) => api.post(`/jobs/${id}/request-payment`),
  placeBid: (jobId, data) => api.post(`/jobs/${jobId}/bid`, data),
  getBids: (jobId) => api.get(`/jobs/${jobId}/bids`),
  assignWorker: (jobId, workerId) => api.post(`/jobs/${jobId}/assign/${workerId}`),
  updateStatus: (jobId, status) => api.patch(`/jobs/${jobId}/status`, { status }),
  submitReview: (jobId, data) => api.post(`/jobs/${jobId}/review`, data),
  getMessages: (jobId) => api.get(`/jobs/${jobId}/messages`),
  sendMessage: (jobId, text) => api.post(`/jobs/${jobId}/messages`, { text }),
};

// ─── Match ────────────────────────────────────────────────
export const matchAPI = {
  getTopWorkers: (params) => api.get('/match/top-workers', { params }),
  getPricingBenchmark: (params) => api.get('/pricing/benchmark', { params }),
};

// ─── Admin ────────────────────────────────────────────────
export const adminAPI = {
  getVerifications: (params) => api.get('/admin/verifications', { params }),
  getWorkerDocuments: (userId) => api.get(`/admin/documents/worker/${userId}`),
  updateVerification: (userId, data) => api.patch(`/admin/workers/${userId}/verification`, data),
  getJobs: (params) => api.get('/admin/jobs', { params }),
  getPayments: (params) => api.get('/admin/payments', { params }),
  releasePayment: (jobId) => api.post(`/admin/payments/${jobId}/release`),
};

// ─── Analytics ────────────────────────────────────────────
export const track = (event, metadata = {}) => {
  api.post('/analytics/event', { event, metadata }).catch(() => {});
};

export default api;

// Extra job methods (appended)
export const jobsAPIExtra = {
  cancelJob: (id, data) => api.delete(`/jobs/${id}`, { data }),
  customerPay: (id, data) => api.post(`/jobs/${id}/customer-pay`, data),
  requestPaymentWorker: (id) => api.post(`/jobs/${id}/request-payment`),
};
