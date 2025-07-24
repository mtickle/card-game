export const formatTurnLog = ({ type, playerIndex, card, players }) => {
    const playerName = players?.[playerIndex]?.name || `Player ${playerIndex + 1}`;
    return {
        player: playerName,
        action: type === 'PLAY' ? `Played ${card.value}` : 'Drew a card',
        ...(card ? { card } : {}),
        timestamp: Date.now(),
    };
};
