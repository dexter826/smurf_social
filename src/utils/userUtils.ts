import { Generation } from '../../shared/types';
import { GENERATION_THRESHOLDS } from '../constants/appConfig';

export const calculateGeneration = (dob: number | Date | null | undefined): Generation => {
  if (!dob) return Generation.UNKNOWN;
  const date = typeof dob === 'number' ? new Date(dob) : dob;
  const year = date.getFullYear();

  if (year >= GENERATION_THRESHOLDS.ALPHA) return Generation.ALPHA;
  if (year >= GENERATION_THRESHOLDS.Z) return Generation.Z;
  if (year >= GENERATION_THRESHOLDS.MILLENNIALS) return Generation.MILLENNIALS;
  if (year >= GENERATION_THRESHOLDS.X) return Generation.X;
  return Generation.BOOMERS;
};
