// API configuration
export const API_URL = import.meta.env.VITE_API_URL || 'https://llm-demo-production.up.railway.app';

// Ensure trailing slash is consistent
export const getApiUrl = () => {
    const url = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    return url;
}; 