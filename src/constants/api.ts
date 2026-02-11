import { getValidatedEnvConfig } from '../utils/validateEnv';

const envConfig = getValidatedEnvConfig();

export const API_ENDPOINTS = {
  PROVINCES: envConfig.api.provincesUrl,
  CLOUDINARY: {
    CLOUD_NAME: envConfig.cloudinary.cloudName,
    UPLOAD_PRESET: envConfig.cloudinary.uploadPreset,
    UPLOAD_URL: `https://api.cloudinary.com/v1_1/${envConfig.cloudinary.cloudName}/upload`,
  },
} as const;
