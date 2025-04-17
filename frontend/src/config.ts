// API configuration
const DEFAULT_API_URL = 'https://llm-demo-production.up.railway.app';

// Get API URL from environment or use default
export const API_URL = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL 
  ? import.meta.env.VITE_API_URL 
  : DEFAULT_API_URL;

// Ensure trailing slash is consistent
export const getApiUrl = () => {
    const url = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    return url;
}; 