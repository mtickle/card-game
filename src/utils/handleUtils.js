

export const handleStopAutoplay = ({
    dispatch,
    currentPlayer,
    aiTurnTimeoutRef,
    gameOverTimeoutRef,
    hands
}) => {
    // Clear AI turn timeout immediately when stopping autoplay
    if (aiTurnTimeoutRef.current) {
        clearTimeout(aiTurnTimeoutRef.current);
        aiTurnTimeoutRef.current = null;
    }

    // Clear any pending game over restart timeout
    if (gameOverTimeoutRef.current) {
        clearTimeout(gameOverTimeoutRef.current);
        gameOverTimeoutRef.current = null;
    }

    dispatch({ type: 'SET_AUTOPLAY', payload: false });
    dispatch({
        type: 'UPDATE_MESSAGE',
        payload: `Autoplay stopped. Player ${currentPlayer + 1}'s turn.`,
    });
    dispatch({ type: 'ADD_HISTORY', payload: 'Autoplay stopped.' });

    console.log('[AUTOPLAY] Autoplay stopped.');
    logHandSizes('After Autoplay Stop', hands);
};

export const logHandSizes = (label, hands) => {
    console.log(`[${label}]`);
    hands.forEach((hand, index) => {
        console.log(`Player ${index + 1} has ${hand.length} cards.`);
    });
};

// handleUtils.js

export const handleStartAutoplay = ({ dispatch, currentPlayer, isAutoplaying }) => {
    if (!isAutoplaying) {
        dispatch({ type: 'SET_AUTOPLAY', payload: true });
        dispatch({
            type: 'UPDATE_MESSAGE',
            payload: `Autoplay started. Player ${currentPlayer + 1}'s turn.`,
        });
        dispatch({ type: 'ADD_HISTORY', payload: 'Autoplay started.' });

        console.log('[AUTOPLAY] Autoplay started.');
    }
};


export const handleStartNewGame = () => {
    console.log("handleStartNewGame")
    // When starting a new game manually, we assume autoplay is OFF initially
    // unless the user explicitly clicks start autoplay after this.
    dispatch({ type: 'INITIALIZE_GAME', payload: { isAutoplaying: false } }); // <--- Default to human playing
}