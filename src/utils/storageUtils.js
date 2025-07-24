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

    const existingRaw = JSON.parse(localStorage.getItem('savedUnoGames') || '[]');
    const existing = existingRaw.filter(g => g && g.gameId); // clean old data

    const updated = existing.filter(g => g.gameId !== gameId);
    updated.push(finishedGame);

    localStorage.setItem('savedUnoGames', JSON.stringify(updated));
};
