/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  PROVINCES: import.meta.env.VITE_PROVINCES_API_URL || 'https://provinces.open-api.vn/api/p/',
} as const;
