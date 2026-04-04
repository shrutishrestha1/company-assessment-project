import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: inject token ───────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: handle errors globally ────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || 'Something went wrong.';

    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      toast.error('Session expired. Please log in again.');
    } else if (status === 429) {
      toast.error('Too many requests. Please slow down.');
    } else if (status >= 500) {
      toast.error(
        error.response?.data?.message || 'Server error. Please try again later.'
      );
    }

    return Promise.reject({ ...error, message });
  }
);

// ─── Auth ─────────────────────────────────────────────────────
export const authAPI = {
  sendOTP: (email) => api.post('/auth/send-otp', { email }),
  verifyOTP: (email, otp) => api.post('/auth/verify-otp', { email, otp }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

// ─── Users ────────────────────────────────────────────────────
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  toggleStatus: (id, is_active) => api.patch(`/users/${id}/status`, { is_active }),
};

// ─── Senders ──────────────────────────────────────────────────
export const sendersAPI = {
  getAll: (params) => api.get('/senders', { params }),
  getById: (id) => api.get(`/senders/${id}`),
  create: (data) => api.post('/senders', data),
  update: (id, data) => api.put(`/senders/${id}`, data),
  toggleStatus: (id, is_active) => api.patch(`/senders/${id}/status`, { is_active }),
  delete: (id) => api.delete(`/senders/${id}`),
};

// ─── Receivers ────────────────────────────────────────────────
export const receiversAPI = {
  getAll: (params) => api.get('/receivers', { params }),
  getById: (id) => api.get(`/receivers/${id}`),
  create: (data) => api.post('/receivers', data),
  update: (id, data) => api.put(`/receivers/${id}`, data),
  toggleStatus: (id, is_active) => api.patch(`/receivers/${id}/status`, { is_active }),
  delete: (id) => api.delete(`/receivers/${id}`),
};

// ─── Transactions ─────────────────────────────────────────────
export const transactionsAPI = {
  getAll: (params) => api.get('/transactions', { params }),
  getById: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post('/transactions', data),
  calculate: (amount_jpy) => api.get('/transactions/calculate', { params: { amount_jpy } }),
  getSummary: () => api.get('/transactions/summary'),
};

export default api;
