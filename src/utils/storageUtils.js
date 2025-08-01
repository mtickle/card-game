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


export async function saveThingsToDatabase(endpoint, data) {
    //const apiUrl = `${API_BASE_URL}/${endpoint}`;

    //let apiUrl = 'http://localhost:3001/api/' + endpoint;
    let apiUrl = 'https://game-api-zjod.onrender.com/api/' + endpoint;

    //console.log('Saving to database:', apiUrl, data);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Failed to save game');
        return await response.json();
    } catch (err) {
        console.error('Error saving game:', err.body || err.message || err``);
    }
}
