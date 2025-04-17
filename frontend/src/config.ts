// API configuration
declare const VITE_API_URL: string;

export const API_URL = 
  // @ts-ignore - Vite replaces process.env.VITE_API_URL with the actual value
  process.env.VITE_API_URL || 
  // @ts-ignore - Vite replaces import.meta.env.VITE_API_URL with the actual value
  (import.meta.env?.VITE_API_URL) || 
  'https://llm-demo-production.up.railway.app';

// Ensure trailing slash is consistent
export const getApiUrl = () => {
    const url = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    return url;
}; 