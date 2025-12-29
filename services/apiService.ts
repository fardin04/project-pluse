
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

const fetcher = async (endpoint: string, options: any = {}) => {
  const token = localStorage.getItem('pulse_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    let errorMessage = 'API request failed';
    try {
      const error = await response.json();
      errorMessage = error.message || error.error || errorMessage;
    } catch (e) {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

export const api = {
  getToken: () => localStorage.getItem('pulse_token'),
  setToken: (token: string) => localStorage.setItem('pulse_token', token),
  clearToken: () => localStorage.removeItem('pulse_token'),

  // Auth
  login: (credentials: any) => fetcher('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData: any) => fetcher('/api/auth/register', { method: 'POST', body: JSON.stringify(userData) }),

  // Users
  getUsers: () => fetcher('/api/users'),
  deleteUser: (id: string) => fetcher(`/api/users/${id}`, { method: 'DELETE' }),

  // Projects
  getProjects: () => fetcher('/api/projects'),
  getProject: (id: string) => fetcher(`/api/projects/${id}`),
  updateProject: (id: string, data: any) => fetcher(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  createProject: (data: any) => fetcher('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
  deleteProject: (id: string) => fetcher(`/api/projects/${id}`, { method: 'DELETE' }),

  // Events
  getEvents: (projectId: string) => fetcher(`/api/projects/${projectId}/events`),
  createEvent: (projectId: string, eventData: any) => fetcher(`/api/projects/${projectId}/events`, { 
    method: 'POST', 
    body: JSON.stringify(eventData) 
  }),
  resolveRisk: (projectId: string, eventId: string, data: any = {}) => fetcher(`/api/projects/${projectId}/events/${eventId}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
};
