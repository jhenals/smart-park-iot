const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Get the Firebase ID token from localStorage
 */
function getAuthToken() {
  const directToken = localStorage.getItem("accessToken");
  if (directToken) {
    return directToken;
  }
  const session = localStorage.getItem("userSession");
  if (session) {
    const parsed = JSON.parse(session);
    return parsed.token;
  }
  return null;
}

/**
 * Get the user session from localStorage (optional UI cache)
 */
export function getUserSession() {
  const session = localStorage.getItem("userSession");
  return session ? JSON.parse(session) : null;
}

/**
 * Check session status from backend (Bearer token)
 */
export async function fetchSessionStatus() {
  const token = getAuthToken();
  if (!token) {
    return null;
  }

  const res = await fetch(`${API_BASE_URL}/api/auth/session-status`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  localStorage.setItem("userSession", JSON.stringify(data));
  localStorage.setItem("sessionSavedAt", new Date().toISOString());
  return data;
}

/**
 * Make an authenticated API request
 *
 * @param {string} endpoint - API endpoint (e.g., '/api/weather/forecast')
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Promise<any>} - Response data
 *
 * @example
 * const data = await apiRequest('/api/weather/forecast?minutes=60');
 *
 * @example
 * const data = await apiRequest('/api/weather/data', {
 *   method: 'POST',
 *   body: { temperature: 25 }
 * });
 */
export async function apiRequest(endpoint, options = {}) {
  // Build full URL
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  // Prepare headers with authorization token
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Add Bearer token to authorization header
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Prepare request options
  const config = {
    ...options,
    headers,
  };

  // Convert body to JSON if it's an object
  if (options.body && typeof options.body === "object") {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);

    // Handle 401 Unauthorized (token expired or invalid)
    if (response.status === 401) {
      console.error("Authentication failed - session expired or invalid");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userSession");
      localStorage.removeItem("sessionSavedAt");
      window.location.href = `${userPrefix}/web-app/src/login.html`;
      throw new Error("Session expired. Please login again.");
    }

    // Handle 403 Forbidden (not admin)
    if (response.status === 403) {
      throw new Error("Admin access required");
    }

    // Handle other errors
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `API Error: ${response.status}`);
    }

    // Return JSON response
    return await response.json();
  } catch (error) {
    console.error("API Request failed:", error);
    throw error;
  }
}

/**
 * Convenience methods for common HTTP methods
 */
export const api = {
  get: (endpoint, options = {}) =>
    apiRequest(endpoint, { ...options, method: "GET" }),

  post: (endpoint, body, options = {}) =>
    apiRequest(endpoint, { ...options, method: "POST", body }),

  put: (endpoint, body, options = {}) =>
    apiRequest(endpoint, { ...options, method: "PUT", body }),

  delete: (endpoint, options = {}) =>
    apiRequest(endpoint, { ...options, method: "DELETE" }),
};

// Export default
export default api;
