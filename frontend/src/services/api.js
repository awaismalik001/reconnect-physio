import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// API Client — talks to the Express backend (http://localhost:5000)
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
});

// Helper to safely extract string ID whether passed as id, _id, or an object
const toId = (val) => {
  if (!val) return '';
  if (typeof val === 'object') return val.id || val._id || '';
  return String(val);
};

// Recursively ensure every object with _id also has id, and vice versa
function normalizeIds(data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(normalizeIds);
  }
  const copy = { ...data };
  if (copy._id && !copy.id) {
    copy.id = String(copy._id);
  } else if (copy.id && !copy._id) {
    copy._id = String(copy.id);
  }
  for (const key of Object.keys(copy)) {
    if (copy[key] && typeof copy[key] === 'object') {
      copy[key] = normalizeIds(copy[key]);
    }
  }
  return copy;
}

// Attach JWT token automatically to every request
api.interceptors.request.use((config) => {
  const token =
    sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalise response data (ensure id is always set) and format errors
api.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = normalizeIds(response.data);
    }
    return response;
  },
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'Request failed';
    error.message = message;
    return Promise.reject(error);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:          (data)        => api.post('/auth/login', data),
  getMe:          ()            => api.get('/auth/me'),
  changePassword: (data)        => api.put('/auth/change-password', data),
};

// ── Patients ─────────────────────────────────────────────────────────────────
export const patientsAPI = {
  getAll:         (params)      => api.get('/patients', { params }),
  getById:        (id)          => api.get(`/patients/${toId(id)}`),
  create:         (formData)    => api.post('/patients', formData),
  update:         (id, formData) => api.put(`/patients/${toId(id)}`, formData),
  delete:         (id)          => api.delete(`/patients/${toId(id)}`),
  uploadDocument: (id, formData) => api.post(`/patients/${toId(id)}/documents`, formData),
  deleteDocument: (docId)       => api.delete(`/patients/documents/${toId(docId)}`),
};

// ── Doctors ───────────────────────────────────────────────────────────────────
export const doctorsAPI = {
  getAll:   ()            => api.get('/doctors'),
  getById:  (id)          => api.get(`/doctors/${toId(id)}`),
  create:   (formData)    => api.post('/doctors', formData),
  update:   (id, formData) => api.put(`/doctors/${toId(id)}`, formData),
  delete:   (id)          => api.delete(`/doctors/${toId(id)}`),
};

// ── Appointments ─────────────────────────────────────────────────────────────
export const appointmentsAPI = {
  getAll:   (params)      => api.get('/appointments', { params }),
  getToday: ()            => api.get('/appointments/today'),
  create:   (data)        => api.post('/appointments', data),
  update:   (id, data)    => api.put(`/appointments/${toId(id)}`, data),
  delete:   (id)          => api.delete(`/appointments/${toId(id)}`),
};

// ── Sessions ──────────────────────────────────────────────────────────────────
export const sessionsAPI = {
  getAll:           (params)   => api.get('/sessions', { params }),
  getById:          (id)       => api.get(`/sessions/${toId(id)}`),
  create:           (data)     => api.post('/sessions', data),
  update:           (id, data) => api.put(`/sessions/${toId(id)}`, data),
  delete:           (id)       => api.delete(`/sessions/${toId(id)}`),
  markPaid:         (id, data) => api.put(`/sessions/${toId(id)}/mark-paid`, data),
  getTherapyTypes:  ()         => api.get('/sessions/therapy-types'),
  createTherapyType:(data)     => api.post('/sessions/therapy-types', data),
};

// ── Finance ───────────────────────────────────────────────────────────────────
export const financeAPI = {
  getAll:        (params)   => api.get('/finance', { params }),
  getSummary:    (params)   => api.get('/finance/summary', { params }),
  getCredits:    ()         => api.get('/finance/credits'),
  markCreditPaid:(id, data) => api.put(`/finance/credits/${toId(id)}/pay`, data),
  create:        (data)     => api.post('/finance', data),
  update:        (id, data) => api.put(`/finance/${toId(id)}`, data),
  delete:        (id)       => api.delete(`/finance/${toId(id)}`),
  getInvoiceUrl: (patientId) => `${BASE_URL}/api/finance/invoice/${toId(patientId)}`,
};

export default { authAPI, patientsAPI, doctorsAPI, appointmentsAPI, sessionsAPI, financeAPI };
