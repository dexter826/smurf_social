import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../../firebase/config';

/**
 * Theo dõi trạng thái kết nối Internet và Server
 */
export const useConnectionStatus = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const connectedRef = ref(rtdb, '.info/connected');
        const unsubscribe = onValue(connectedRef, (snap) => {
            setIsFirebaseConnected(!!snap.val());
        });

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            unsubscribe();
        };
    }, []);

    return {
        isOnline,
        isFirebaseConnected,
        isFullyConnected: isOnline && isFirebaseConnected,
        isBrowserOnline: isOnline
    };
};
