// src/gameReducer.js

const colors = ['red', 'blue', 'green', 'yellow'];
const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', 'Draw Two'];
const wilds = ['Wild', 'Wild Draw Four'];

// Helper functions (could be moved out for pure reducer, but useful here)
const createDeck = () => {
    let deck = [];
    colors.forEach(color => {
        values.forEach(value => {
            deck.push({ color, value });
            if (value !== '0') deck.push({ color, value }); // Two of each card except 0
        });
    });
    wilds.forEach(wild => {
        for (let i = 0; i < 4; i++) {
            deck.push({ color: 'wild', value: wild });
        }
    });
    return deck.sort(() => Math.random() - 0.5);
};

const dealCards = (deck, numPlayers = 4) => {
    const hands = Array(numPlayers).fill().map(() => []);
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < numPlayers; j++) {
            if (deck.length > 0) {
                hands[j].push(deck.pop());
            } else {
                console.warn("Deck ran out of cards during dealing!");
                break;
            }
        }
    }
    return hands;
};

const calculateGameScore = (currentHands, winnerIdx) => {
    return currentHands.map((hand, index) => {
        if (index === winnerIdx) return 0;

        return hand.reduce((total, card) => {
            if (['Draw Two', 'Reverse', 'Skip'].includes(card.value)) return total + 20;
            if (['Wild', 'Wild Draw Four'].includes(card.value)) return total + 50;
            const numeric = parseInt(card.value, 10);
            return isNaN(numeric) ? total : total + numeric;
        }, 0);
    });
};

const canPlayCard = (card, currentTopCard) => {
    if (!card || !currentTopCard) return false;
    if (card.color === 'wild') return true;
    return card.color === currentTopCard.color || card.value === currentTopCard.value;
};


// Initial State for the game
export const initialGameState = {
    deck: [],
    hands: [],
    topCard: null,
    currentPlayer: 0,
    gameMessage: 'Welcome to UNO!',
    history: ['Game initialized'],
    direction: 1, // 1 for clockwise, -1 for counter-clockwise
    isAutoplaying: false,
    gameOver: false,
    winner: null,
    finalScores: [],
};

// The Reducer Function
export function gameReducer(state, action) {
    console.log(`[REDUCER] Action: ${action.type}`, action); // Log every action
    console.log("[REDUCER] State BEFORE:", state);

    switch (action.type) {
        case 'INITIALIZE_GAME': {
            let deckToUse = createDeck(); // Renamed to avoid confusion
            const newHands = dealCards(deckToUse, 4); // Use deckToUse for dealing

            let startingTopCard = null;
            // IMPORTANT: Create a *new* tempDeck from the *current* deckToUse after dealing
            let tempDeckForTopCard = [...deckToUse];
            let attempts = 0;
            while (attempts < 50 && tempDeckForTopCard.length > 0) {
                const drawnCard = tempDeckForTopCard.pop();
                if (drawnCard.value !== 'Skip' && drawnCard.value !== 'Reverse' && drawnCard.value !== 'Draw Two' && drawnCard.color !== 'wild') {
                    startingTopCard = drawnCard;
                    deckToUse = tempDeckForTopCard; // Update the main deckToUse after finding the starting card
                    break;
                } else {
                    tempDeckForTopCard.unshift(drawnCard);
                    tempDeckForTopCard.sort(() => Math.random() - 0.5); // Reshuffle to avoid infinite loop on specific card sequence
                }
                attempts++;
            }

            if (!startingTopCard) {
                console.error("[REDUCER] Failed to find a valid starting top card after many attempts. Defaulting.");
                startingTopCard = { color: 'red', value: '1' };
                // If we default, the deckToUse should remain what it was before trying to find a starting card
                // This means we might have put cards back that we drew, which is fine.
            }

            const newState = {
                ...initialGameState,
                deck: [...deckToUse], // Ensure we pass a fresh copy of the final deck state
                hands: newHands,
                topCard: startingTopCard,
                gameMessage: "New game started. Player 1's turn!",
                history: ['New game started'],
                gameOver: false,
                winner: null,
                finalScores: [],
                currentPlayer: 0,
                direction: 1,
                isAutoplaying: action.payload?.isAutoplaying ?? false,
            };
            console.log("[REDUCER] State AFTER INITIALIZE_GAME:", newState);
            return newState;
        }

        case 'PLAY_CARD': {
            const { card, playerIndex, chosenWildColor } = action.payload;
            const { hands, deck, topCard, currentPlayer, direction, gameOver } = state;

            if (gameOver || playerIndex !== currentPlayer || !canPlayCard(card, topCard)) {
                const message = gameOver ? "Game is over!" :
                    playerIndex !== currentPlayer ? `It's not Player ${playerIndex + 1}'s turn!` :
                        `Invalid move for Player ${playerIndex + 1}!`;
                return {
                    ...state,
                    gameMessage: message,
                    history: [`${message} (Attempted by P${playerIndex + 1})`, ...state.history]
                };
            }

            const newHands = hands.map(h => [...h]); // Deep copy hands
            const newDeck = [...deck];

            const cardIndex = newHands[playerIndex].findIndex(c => c.color === card.color && c.value === card.value);
            if (cardIndex > -1) {
                newHands[playerIndex].splice(cardIndex, 1);
            } else {
                console.warn(`[REDUCER] Card to play not found in P${playerIndex + 1}'s hand:`, card);
                return state;
            }

            let nextPlayerIdx = (currentPlayer + direction + 4) % 4;
            let cardsToDraw = [];
            let newDirection = direction;
            let historyMessage = `Player ${playerIndex + 1} played ${card.color} ${card.value}.`;
            let newTopCard = { ...card };

            if (card.value === 'Reverse') {
                newDirection = -direction;
                historyMessage += ` Direction reversed.`;
                if (newHands.length === 2) {
                    nextPlayerIdx = (nextPlayerIdx + newDirection + 4) % 4;
                    historyMessage += ` Player ${nextPlayerIdx + 1} is skipped (due to 2 players).`;
                }
            } else if (card.value === 'Skip') {
                historyMessage += ` Player ${nextPlayerIdx + 1} is skipped.`;
                nextPlayerIdx = (nextPlayerIdx + direction + 4) % 4;
            } else if (card.value === 'Draw Two') {
                const playerToDraw = (currentPlayer + direction + 4) % 4;
                for (let i = 0; i < 2; i++) {
                    if (newDeck.length > 0) cardsToDraw.push(newDeck.pop());
                }
                newHands[playerToDraw] = [...newHands[playerToDraw], ...cardsToDraw];
                historyMessage += ` Player ${playerToDraw + 1} draws two cards.`;
                nextPlayerIdx = (nextPlayerIdx + direction + 4) % 4;
            } else if (card.value === 'Wild Draw Four') {
                const playerToDraw = (currentPlayer + direction + 4) % 4;
                for (let i = 0; i < 4; i++) {
                    if (newDeck.length > 0) cardsToDraw.push(newDeck.pop());
                }
                newHands[playerToDraw] = [...newHands[playerToDraw], ...cardsToDraw];
                historyMessage += ` Player ${playerToDraw + 1} draws four cards.`;
                nextPlayerIdx = (nextPlayerIdx + direction + 4) % 4;
            }

            if (card.color === 'wild' && chosenWildColor) {
                newTopCard.color = chosenWildColor;
                historyMessage += ` Wild color chosen: ${chosenWildColor}.`;
            }

            // Check for winner
            const winner = newHands[playerIndex].length === 0 ? playerIndex : state.winner;
            const gameOverStatus = winner !== null;
            let finalScoresMessage = ''; // New variable for score message

            if (gameOverStatus) {
                const calculatedScores = calculateGameScore(newHands, winner);
                finalScoresMessage = `Final scores: ${calculatedScores.map((score, idx) => `P${idx + 1}: ${score}`).join(', ')}`;
                historyMessage = `Game over! Player ${winner + 1} wins! ${finalScoresMessage}`;
            }

            const newState = {
                ...state,
                hands: newHands,
                deck: newDeck,
                topCard: newTopCard,
                currentPlayer: nextPlayerIdx,
                direction: newDirection,
                gameMessage: gameOverStatus ? `Player ${winner + 1} wins!` : `Player ${nextPlayerIdx + 1}'s turn.`,
                history: [historyMessage, ...state.history], // Add the full message here
                gameOver: gameOverStatus,
                winner: winner,
                // finalScores is no longer needed in state if only displayed in history
                // We'll keep it for now but it won't be used by UI element
                finalScores: gameOverStatus ? calculateGameScore(newHands, winner) : [],
            };
            console.log("[REDUCER] State AFTER PLAY_CARD:", newState);
            return newState;
        }

        case 'DRAW_CARD': {
            const { playerIndex } = action.payload; // No need for drawnByAI, logic is same
            const { hands, deck, currentPlayer, direction, gameOver } = state;

            if (gameOver || playerIndex !== currentPlayer) {
                const message = gameOver ? "Game is over!" : `It's not Player ${playerIndex + 1}'s turn to draw!`;
                return {
                    ...state,
                    gameMessage: message,
                    history: [`${message} (Attempted by P${playerIndex + 1})`, ...state.history]
                };
            }

            const newHands = hands.map(h => [...h]);
            const newDeck = [...deck];
            let historyMessage = '';
            let nextPlayerIdx = (currentPlayer + direction + 4) % 4;

            if (newDeck.length === 0) {
                historyMessage = `Player ${playerIndex + 1} tried to draw, but deck is empty. Turn passes.`;
                const newState = {
                    ...state,
                    gameMessage: `No cards left to draw for Player ${playerIndex + 1}! Turn passes.`,
                    history: [historyMessage, ...state.history],
                    currentPlayer: nextPlayerIdx,
                };
                console.log("[REDUCER] State AFTER DRAW_CARD (Deck Empty):", newState);
                return newState;
            }

            const drawnCard = newDeck.pop();
            newHands[playerIndex].push(drawnCard);
            historyMessage = `Player ${playerIndex + 1} drew a ${drawnCard.color} ${drawnCard.value} card.`;

            const newState = {
                ...state,
                hands: newHands,
                deck: newDeck,
                history: [historyMessage, ...state.history],
                gameMessage: `Player ${playerIndex + 1} drew a card. Player ${nextPlayerIdx + 1}'s turn.`,
                currentPlayer: nextPlayerIdx,
            };
            console.log("[REDUCER] State AFTER DRAW_CARD:", newState);
            return newState;
        }

        case 'SET_AUTOPLAY': {
            const newState = { ...state, isAutoplaying: action.payload };
            console.log("[REDUCER] State AFTER SET_AUTOPLAY:", newState);
            return newState;
        }

        case 'UPDATE_MESSAGE': {
            const newState = { ...state, gameMessage: action.payload };
            console.log("[REDUCER] State AFTER UPDATE_MESSAGE:", newState);
            return newState;
        }

        case 'ADD_HISTORY': { // New action to just add a history entry
            const newState = { ...state, history: [action.payload, ...state.history] };
            console.log("[REDUCER] State AFTER ADD_HISTORY:", newState);
            return newState;
        }

        default:
            console.warn(`[REDUCER] Unknown action type: ${action.type}`);
            return state;
    }
}