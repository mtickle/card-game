import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'lastUnoGameId';

export const useLastGameId = () => {
    const [lastGameId, setLastGameId] = useState(null);

    // Load from localStorage on mount
    useEffect(() => {
        const savedId = localStorage.getItem(STORAGE_KEY);
        if (savedId) {
            setLastGameId(savedId);
        }
    }, []);

    // Store new ID in both state and localStorage
    const updateLastGameId = useCallback((newId) => {
        if (!newId) return;
        setLastGameId(newId);
        localStorage.setItem(STORAGE_KEY, newId);
    }, []);

    return [lastGameId, updateLastGameId];
};
