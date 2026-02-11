import { useCallback } from 'react';
import { useLoadingStore, LoadingKey } from '../store/loadingStore';

export const useLoading = (key?: LoadingKey) => {
    const { loadingStates, setLoading, setMultipleLoading, isLoading, isAnyLoading } = useLoadingStore();

    const startLoading = useCallback((customKey?: LoadingKey) => {
        const targetKey = customKey || key;
        if (targetKey) {
            setLoading(targetKey, true);
        }
    }, [key, setLoading]);

    const stopLoading = useCallback((customKey?: LoadingKey) => {
        const targetKey = customKey || key;
        if (targetKey) {
            setLoading(targetKey, false);
        }
    }, [key, setLoading]);

    const withLoading = useCallback(
        async <T,>(
            fn: () => Promise<T>,
            customKey?: LoadingKey
        ): Promise<T> => {
            const targetKey = customKey || key;
            if (!targetKey) {
                return fn();
            }

            try {
                setLoading(targetKey, true);
                const result = await fn();
                return result;
            } finally {
                setLoading(targetKey, false);
            }
        },
        [key, setLoading]
    );

    return {
        isLoading: key ? loadingStates[key] : false,
        startLoading,
        stopLoading,
        withLoading,
        setLoading,
        setMultipleLoading,
        checkLoading: isLoading,
        checkAnyLoading: isAnyLoading,
        allLoadingStates: loadingStates,
    };
};
