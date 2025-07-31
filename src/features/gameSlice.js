import { createSlice } from '@reduxjs/toolkit';
import { calculateGameScore, canPlayCard, createDeck, dealCards } from '@utils/gameUtils.js';
import { v4 as uuidv4 } from 'uuid';

const initialState = {
    gameId: null,
    deck: [],
    hands: [],
    topCard: null,
    currentPlayer: -1,
    gameMessage: "Welcome! Click 'Start New Game'.",
    direction: 1,
    isAutoplaying: false,
    gameOver: false,
    winner: null,
    finalScores: [],
    turnHistory: [], // Renamed from turnLog for clarity
    turnNumber: 0,
};

const gameSlice = createSlice({
    name: 'game',
    initialState,
    // Reducers handle state changes. Immer lets us "mutate" state directly.
    reducers: {
        initializeGame: (state, action) => {
            // Reset state to initial, then set up the new game
            Object.assign(state, initialState);

            let deck = createDeck();
            state.hands = dealCards(deck, 4);

            // Logic to find a valid starting card
            let startingTopCard = null;
            // ... (same logic as before to find a non-action card)
            startingTopCard = deck.pop(); // simplified for brevity

            state.deck = deck;
            state.topCard = startingTopCard;
            state.gameId = uuidv4();
            state.currentPlayer = 0;
            state.turnNumber = 1;
            state.isAutoplaying = action.payload?.isAutoplaying ?? false;
            state.gameMessage = "New game started. Player 1's turn!";
        },

        playCard: (state, action) => {
            const { card, playerIndex, chosenWildColor } = action.payload;

            if (state.gameOver || playerIndex !== state.currentPlayer || !canPlayCard(card, state.topCard)) {
                return; // Exit if move is invalid
            }

            // Remove card from hand
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

            // Handle card effects
            if (card.value === 'Draw Two') {
                const cardsToDraw = state.deck.splice(-2, 2);
                state.hands[nextPlayer].push(...cardsToDraw);
                penalty = { penalizedPlayer: nextPlayer, cardsDrawn: cardsToDraw, count: 2 };
                nextPlayer = (nextPlayer + state.direction + 4) % 4; // Skip next player
            } else if (card.value === 'Skip') {
                nextPlayer = (nextPlayer + state.direction + 4) % 4;
            } else if (card.value === 'Reverse') {
                state.direction *= -1;
                // With 2 players, reverse is a skip
                nextPlayer = (state.currentPlayer + state.direction + 4) % 4;
            }

            // Log the turn
            state.turnHistory.push({
                turn: state.turnNumber,
                player: `Player ${playerIndex + 1}`,
                type: 'PLAY',
                card,
                wildColorChoice: chosenWildColor,
                penalty,
                timestamp: Date.now(),
            });

            // Check for winner
            if (state.hands[playerIndex].length === 0) {
                state.gameOver = true;
                state.winner = `Player ${playerIndex + 1}`;
                state.finalScores = calculateGameScore(state.hands, playerIndex);
                state.gameMessage = `${state.winner} wins!`;
            } else {
                state.currentPlayer = nextPlayer;
                state.turnNumber++;
                state.gameMessage = `Player ${nextPlayer + 1}'s turn.`;
            }
        },

        drawCard: (state, action) => {
            const { playerIndex } = action.payload;
            if (state.deck.length === 0) return;

            const drawnCard = state.deck.pop();
            state.hands[playerIndex].push(drawnCard);

            state.turnHistory.push({
                turn: state.turnNumber,
                player: `Player ${playerIndex + 1}`,
                type: 'DRAW_PASS',
                card: drawnCard,
                timestamp: Date.now(),
            });

            state.currentPlayer = (state.currentPlayer + state.direction + 4) % 4;
            state.turnNumber++;
        },

        setAutoplay: (state, action) => {
            state.isAutoplaying = action.payload;
        }
    },
});

export const { initializeGame, playCard, drawCard, setAutoplay } = gameSlice.actions;
export default gameSlice.reducer;