import { createSlice } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import { createDeck, dealCards, canPlayCard, calculateGameScore } from '@utils/gameUtils';
import { saveGameToStorage, saveTurnLogToStorage } from '@utils/storageUtils';
import { saveThingsToDatabase } from '@utils/storageUtils';

const initialState = {
    gameId: null,
    deck: [],
    hands: [],
    topCard: null,
    currentPlayer: -1,
    gameMessage: "Welcome! Click 'Start Sim' to begin.",
    direction: 1,
    isAutoplaying: false,
    gameOver: false,
    winner: null,
    finalScores: [],
    turnHistory: [],
    turnNumber: 0,
};

const gameSlice = createSlice({
    name: 'game',
    initialState,
    reducers: {
        initializeGame: (state, action) => {
            Object.assign(state, initialState);
            let deck = createDeck();
            state.hands = dealCards(deck, 4);
            
            let startingTopCard = null;
            let tempDeck = [...deck];
            while(tempDeck.length > 0 && !startingTopCard) {
                const card = tempDeck.pop();
                if(!['Skip', 'Reverse', 'Draw Two', 'Wild', 'Wild Draw Four'].includes(card.value)) {
                    startingTopCard = card;
                } else {
                    deck.unshift(card); 
                }
            }
            if(!startingTopCard) startingTopCard = { color: 'red', value: '1' };
            
            state.deck = deck.filter(c => c !== startingTopCard);
            state.topCard = startingTopCard;
            state.gameId = uuidv4();
            state.currentPlayer = 0;
            state.turnNumber = 1;
            state.isAutoplaying = action.payload?.isAutoplaying ?? true;
            state.gameMessage = "New simulation started.";
        },

        playCard: (state, action) => {
            const { card, playerIndex, chosenWildColor, user } = action.payload;

            if (state.gameOver || playerIndex !== state.currentPlayer || !canPlayCard(card, state.topCard)) {
                return;
            }
            
            // --- NEW: Capture hand state before modification ---
            const handBeforePlay = [...state.hands[playerIndex]];

            const cardIdx = state.hands[playerIndex].findIndex(c => c.value === card.value && c.color === card.color);
            if (cardIdx !== -1) {
                state.hands[playerIndex].splice(cardIdx, 1);
            }
            
            state.topCard = { ...card };
            if (card.color === 'wild') {
                state.topCard.color = chosenWildColor;
            }

            let penalty = null;
            let nextPlayer = (state.currentPlayer + state.direction + 4) % 4;

            if (card.value === 'Draw Two') {
                const cardsToDraw = state.deck.splice(-2, 2);
                state.hands[nextPlayer].push(...cardsToDraw);
                penalty = { penalizedPlayer: nextPlayer, cardsDrawn: cardsToDraw, count: 2 };
                nextPlayer = (nextPlayer + state.direction + 4) % 4;
            } else if (card.value === 'Wild Draw Four') {
                const cardsToDraw = state.deck.splice(-4, 4);
                state.hands[nextPlayer].push(...cardsToDraw);
                penalty = { penalizedPlayer: nextPlayer, cardsDrawn: cardsToDraw, count: 4 };
                nextPlayer = (nextPlayer + state.direction + 4) % 4;
            } else if (card.value === 'Skip') {
                nextPlayer = (nextPlayer + state.direction + 4) % 4;
            } else if (card.value === 'Reverse') {
                state.direction *= -1;
                nextPlayer = (state.currentPlayer + state.direction + 4) % 4;
            }

            state.turnHistory.push({
                turn: state.turnNumber,
                player: `Player ${playerIndex + 1}`,
                type: 'PLAY',
                card,
                wildColorChoice: chosenWildColor,
                penalty,
                handBeforePlay, // Add the hand state to the log
                timestamp: Date.now(),
            });

            if (state.hands[playerIndex].length === 0) {
                state.gameOver = true;
                state.winner = `Player ${playerIndex + 1}`;
                state.finalScores = calculateGameScore(state.hands, playerIndex);
                state.gameMessage = `${state.winner} wins!`;

                const finishedGame = {
                  gameId: state.gameId,
                  timestamp: Date.now(),
                  winner: state.winner,
                  finalScores: state.finalScores,
                  turnHistory: state.turnHistory,
                  username: user?.nickname || 'anonymous',
                };
        
                saveGameToStorage(finishedGame);
                saveTurnLogToStorage(finishedGame.gameId, finishedGame.turnHistory);
                saveThingsToDatabase('postCardGame', finishedGame);

            } else {
                state.currentPlayer = nextPlayer;
                state.turnNumber++;
                state.gameMessage = `Player ${nextPlayer + 1}'s turn.`;
            }
        },

        drawCard: (state, action) => {
            const { playerIndex, user } = action.payload;
            const nextPlayer = (state.currentPlayer + state.direction + 4) % 4;
            
            // --- NEW: Capture hand state before modification ---
            const handBeforePlay = [...state.hands[playerIndex]];

            if (state.deck.length === 0) {
                state.turnHistory.push({
                    turn: state.turnNumber,
                    player: `Player ${playerIndex + 1}`,
                    type: 'DRAW_FAIL_PASS',
                    card: null,
                    handBeforePlay, // Add hand state here too
                    timestamp: Date.now(),
                });
                state.currentPlayer = nextPlayer;
                state.turnNumber++;
                state.gameMessage = `Deck is empty! Player ${playerIndex + 1} passes.`;
                return;
            }

            const drawnCard = state.deck.pop();
            
            if (canPlayCard(drawnCard, state.topCard)) {
                state.topCard = { ...drawnCard };
                let chosenWildColor = null;
                if (drawnCard.color === 'wild') {
                    const colorCounts = { red: 0, blue: 0, green: 0, yellow: 0 };
                    state.hands[playerIndex].forEach(card => {
                        if (card.color !== 'wild') colorCounts[card.color]++;
                    });
                    chosenWildColor = Object.keys(colorCounts).reduce((a, b) => colorCounts[a] > colorCounts[b] ? a : b);
                    state.topCard.color = chosenWildColor;
                }

                state.turnHistory.push({
                    turn: state.turnNumber,
                    player: `Player ${playerIndex + 1}`,
                    type: 'DRAW_PLAY',
                    card: drawnCard,
                    wildColorChoice: chosenWildColor,
                    handBeforePlay, // Add hand state here
                    timestamp: Date.now(),
                });

                if (state.hands[playerIndex].length === 0) {
                    state.gameOver = true;
                    state.winner = `Player ${playerIndex + 1}`;
                    state.finalScores = calculateGameScore(state.hands, playerIndex);
                    state.gameMessage = `${state.winner} wins!`;
                    
                    const finishedGame = {
                        gameId: state.gameId,
                        timestamp: Date.now(),
                        winner: state.winner,
                        finalScores: state.finalScores,
                        turnHistory: state.turnHistory,
                        username: user?.nickname || 'anonymous',
                    };
                    saveGameToStorage(finishedGame);
                    saveTurnLogToStorage(finishedGame.gameId, finishedGame.turnHistory);
                    saveThingsToDatabase('postCardGame', finishedGame);
                } else {
                    state.currentPlayer = nextPlayer;
                    state.turnNumber++;
                    state.gameMessage = `Player ${playerIndex + 1} drew and played. Player ${nextPlayer + 1}'s turn.`;
                }

            } else {
                state.hands[playerIndex].push(drawnCard);
                state.turnHistory.push({
                    turn: state.turnNumber,
                    player: `Player ${playerIndex + 1}`,
                    type: 'DRAW_PASS',
                    card: drawnCard,
                    handBeforePlay, // And finally, add hand state here
                    timestamp: Date.now(),
                });
                state.currentPlayer = nextPlayer;
                state.turnNumber++;
                state.gameMessage = `Player ${playerIndex + 1} drew a card. Player ${nextPlayer + 1}'s turn.`;
            }
        },
        
        setAutoplay: (state, action) => {
            state.isAutoplaying = action.payload;
        }
    },
});

export const { initializeGame, playCard, drawCard, setAutoplay } = gameSlice.actions;
export default gameSlice.reducer;
