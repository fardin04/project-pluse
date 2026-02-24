
  const API_URL = import.meta.env.VITE_API_URL || 'https://project-pluse.onrender.com';
  
  // Debug log (remove in production)
  if (typeof window !== 'undefined') {
    console.log('🔗 API URL configured:', API_URL);
  }

  // Helper to create fetch with timeout
  const fetchWithTimeout = (url: string, options: any = {}, timeout = 30000) => {
    return Promise.race([
      fetch(url, options),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout - server may be waking up from sleep')), timeout)
      )
    ]);
  };

  // Helper to retry failed requests (useful for cold starts)
  const retryFetch = async (url: string, options: any = {}, retries = 1, timeout = 30000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fetchWithTimeout(url, options, timeout);
      } catch (error) {
        if (i === retries - 1) throw error;
        console.log(`Retry ${i + 1}/${retries} after error:`, error);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3s before retry
      }
    }
    throw new Error('Max retries exceeded');
  };

  const fetcher = async (endpoint: string, options: any = {}) => {
  const token = localStorage.getItem('pulse_token');
  
  // Create a clean headers object
  const headers: any = {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };
  
  const isFileUpload = options.body instanceof FormData;
  
  // FIX 1: Match the 2-minute server timeout (120000ms)
  const timeout = isFileUpload ? 120000 : 30000; 
  
  // FIX 2: Strict check for Content-Type
  if (!isFileUpload) {
    headers['Content-Type'] = 'application/json';
  } else {
    // When sending FormData, the browser MUST set the Content-Type 
    // including the unique "boundary" string. 
    // Manually setting it to 'multipart/form-data' or leaving it as JSON will break it.
    delete headers['Content-Type'];
  }

  console.log(`📡 API Call: ${endpoint}${isFileUpload ? ' (File Upload - 120s timeout)' : ''}`);
  
  // Increase retries to 2 for file uploads to handle Render's "cold start"
  const retries = isFileUpload ? 2 : 1;
  
  const response = await retryFetch(`${API_URL}${endpoint}`, { ...options, headers }, retries, timeout);
  
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
    createEvent: (projectId: string, eventData: FormData) => fetcher(`/api/projects/${projectId}/events`, { 
      method: 'POST', 
      body: eventData 
    }),
    resolveRisk: (projectId: string, eventId: string, data: any = {}) => fetcher(`/api/projects/${projectId}/events/${eventId}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
  };
