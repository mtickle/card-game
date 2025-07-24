import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'lastUnoGameId';

export const useLastGameId = () => {
    const [lastGameId, setLastGameId] = useState(null);

    useEffect(() => {
        const savedId = localStorage.getItem(STORAGE_KEY);
        if (savedId) {
            setLastGameId(savedId);
        }
    }, []);

    const updateLastGameId = useCallback((newId) => {
        if (!newId) return;
        setLastGameId(newId);
        localStorage.setItem(STORAGE_KEY, newId);
    }, []);

    return [lastGameId, updateLastGameId];
};
