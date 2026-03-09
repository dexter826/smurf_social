import { Timestamp, serverTimestamp, FieldValue } from 'firebase/firestore';

/**
 * Convert Date to Firestore Timestamp
 */
export const toTimestamp = (date: Date): Timestamp => {
    return Timestamp.fromDate(date);
};

/**
 * Convert Firestore Timestamp to Date
 */
export const toDate = (timestamp: Timestamp): Date => {
    return timestamp.toDate();
};

/**
 * Get current timestamp (client-side)
 */
export const now = (): Timestamp => {
    return Timestamp.now();
};

/**
 * Get server timestamp (for writes)
 * Use this when creating/updating documents
 */
export const getServerTimestamp = (): FieldValue => {
    return serverTimestamp();
};

/**
 * Format timestamp to readable string
 */
export const formatTimestamp = (timestamp: Timestamp, locale: string = 'vi-VN'): string => {
    return timestamp.toDate().toLocaleString(locale);
};

/**
 * Check if timestamp is valid
 */
export const isValidTimestamp = (value: any): value is Timestamp => {
    return value instanceof Timestamp;
};

/**
 * Compare two timestamps
 */
export const compareTimestamps = (a: Timestamp, b: Timestamp): number => {
    return a.toMillis() - b.toMillis();
};

/**
 * Get timestamp from milliseconds
 */
export const fromMillis = (milliseconds: number): Timestamp => {
    return Timestamp.fromMillis(milliseconds);
};
