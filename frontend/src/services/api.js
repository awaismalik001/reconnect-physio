import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// API Client — talks to the Express backend (http://localhost:5000)
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
});

// Attach JWT token automatically to every request
api.interceptors.request.use((config) => {
  const token =
    sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalise error shape so callers always get error.response.data.message
api.interceptors.response.use(
  (response) => response,
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
  getById:        (id)          => api.get(`/patients/${id}`),
  create:         (formData)    => api.post('/patients', formData),        // FormData for photo
  update:         (id, formData) => api.put(`/patients/${id}`, formData),  // FormData for photo
  delete:         (id)          => api.delete(`/patients/${id}`),
  uploadDocument: (id, formData) => api.post(`/patients/${id}/documents`, formData),
  deleteDocument: (docId)       => api.delete(`/patients/documents/${docId}`),
};

// ── Doctors ───────────────────────────────────────────────────────────────────
export const doctorsAPI = {
  getAll:   ()            => api.get('/doctors'),
  getById:  (id)          => api.get(`/doctors/${id}`),
  create:   (formData)    => api.post('/doctors', formData),
  update:   (id, formData) => api.put(`/doctors/${id}`, formData),
  delete:   (id)          => api.delete(`/doctors/${id}`),
};

// ── Appointments ─────────────────────────────────────────────────────────────
export const appointmentsAPI = {
  getAll:   (params)      => api.get('/appointments', { params }),
  getToday: ()            => api.get('/appointments/today'),
  create:   (data)        => api.post('/appointments', data),
  update:   (id, data)    => api.put(`/appointments/${id}`, data),
  delete:   (id)          => api.delete(`/appointments/${id}`),
};

// ── Sessions ──────────────────────────────────────────────────────────────────
export const sessionsAPI = {
  getAll:           (params)   => api.get('/sessions', { params }),
  getById:          (id)       => api.get(`/sessions/${id}`),
  create:           (data)     => api.post('/sessions', data),
  update:           (id, data) => api.put(`/sessions/${id}`, data),
  delete:           (id)       => api.delete(`/sessions/${id}`),
  markPaid:         (id, data) => api.put(`/sessions/${id}/mark-paid`, data),
  getTherapyTypes:  ()         => api.get('/sessions/therapy-types'),
  createTherapyType:(data)     => api.post('/sessions/therapy-types', data),
};

// ── Finance ───────────────────────────────────────────────────────────────────
export const financeAPI = {
  getAll:        (params)   => api.get('/finance', { params }),
  getSummary:    (params)   => api.get('/finance/summary', { params }),
  getCredits:    ()         => api.get('/finance/credits'),
  markCreditPaid:(id, data) => api.put(`/finance/credits/${id}/pay`, data),
  create:        (data)     => api.post('/finance', data),
  update:        (id, data) => api.put(`/finance/${id}`, data),
  delete:        (id)       => api.delete(`/finance/${id}`),
  getInvoiceUrl: (patientId) => `${BASE_URL}/api/finance/invoice/${patientId}`,
};

export default { authAPI, patientsAPI, doctorsAPI, appointmentsAPI, sessionsAPI, financeAPI };
