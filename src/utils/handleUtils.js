

export const handleStopAutoplay = () => {
    if (isAutoplaying) { // Only stop if currently autoplaying
        dispatch({ type: 'SET_AUTOPLAY', payload: false });
        dispatch({ type: 'UPDATE_MESSAGE', payload: `Autoplay stopped. Player ${currentPlayer + 1}'s turn.` });
        dispatch({ type: 'ADD_HISTORY', payload: 'Autoplay stopped.' });
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
        console.log("[AUTOPLAY] Autoplay stopped.");
        logHandSizes("After Autoplay Stop", hands);
    }
};

export const handleStartAutoplay = () => {
    console.log("handleStartAutoplay")
    if (!isAutoplaying) { // Only start if not already autoplaying
        dispatch({ type: 'SET_AUTOPLAY', payload: true });
        dispatch({ type: 'UPDATE_MESSAGE', payload: "Autoplay started! AI vs AI." });
        dispatch({ type: 'ADD_HISTORY', payload: 'Autoplay started.' });
        console.log("[AUTOPLAY] Autoplay started.");
        logHandSizes("After Autoplay Start", hands);
    }
};

export const handleStartNewGame = () => {
    console.log("handleStartNewGame")
    // When starting a new game manually, we assume autoplay is OFF initially
    // unless the user explicitly clicks start autoplay after this.
    dispatch({ type: 'INITIALIZE_GAME', payload: { isAutoplaying: false } }); // <--- Default to human playing
}