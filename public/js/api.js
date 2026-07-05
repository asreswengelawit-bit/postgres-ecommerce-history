const API_URL = '/api';

/**
 * Get stored authentication token
 */
function getToken() {
  return localStorage.getItem('token');
}

/**
 * Get currently logged-in user profile details
 */
function getCurrentUser() {
  const userJson = localStorage.getItem('user');
  try {
    return userJson ? JSON.parse(userJson) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Log out user by clearing storage and returning to storefront
 */
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
}

/**
 * Standard fetch wrapper that automatically attaches the JWT bearer token
 */
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    // Automatically capture expired tokens
    if (response.status === 401 || response.status === 403) {
      if (token) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert('Your session has expired. Please log in again.');
        window.location.href = '/login';
      }
    }
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

// Global exposure for EJS script scripts
window.getToken = getToken;
window.getCurrentUser = getCurrentUser;
window.logout = logout;
window.apiFetch = apiFetch;
