// storageUtils.js

export const saveGameToStorage = (finishedGame) => {
    if (!finishedGame || typeof finishedGame !== 'object') {
        console.warn('[Storage] Invalid game data:', finishedGame);
        return;
    }

    const { gameId } = finishedGame;
    if (!gameId) {
        console.warn('[Storage] Game data missing gameId:', finishedGame);
        return;
    }

    const existingRaw = JSON.parse(localStorage.getItem('savedCardGames') || '[]');
    const existing = existingRaw.filter(g => g && g.gameId); // clean old data

    const updated = existing.filter(g => g.gameId !== gameId);
    updated.push(finishedGame);

    localStorage.setItem('savedCardGames', JSON.stringify(updated));
};


export const saveTurnLogToStorage = (gameId, turnLog) => {
    if (!gameId || !Array.isArray(turnLog)) {
        console.warn('[Storage] Invalid gameId or turnLog:', { gameId, turnLog });
        return;
    }

    const existingRaw = JSON.parse(localStorage.getItem('cardGameTurnLogs') || '{}');

    const updated = {
        ...existingRaw,
        [gameId]: turnLog
    };

    localStorage.setItem('cardGameTurnLogs', JSON.stringify(updated));
};
