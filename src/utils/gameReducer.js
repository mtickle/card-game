import { saveGameToStorage, saveTurnLogToStorage } from '@/utils/storageUtils';
import { v4 as uuidv4 } from 'uuid';

const colors = ['red', 'blue', 'green', 'yellow'];
const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', 'Draw Two'];
const wilds = ['Wild', 'Wild Draw Four'];

// --- Helper Functions (Restored) ---
const createDeck = () => {
    let deck = [];
    colors.forEach(color => {
        values.forEach(value => {
            deck.push({ color, value });
            if (value !== '0') deck.push({ color, value });
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


// Initial State
export const initialGameState = {
    deck: [],
    hands: [],
    topCard: null,
    currentPlayer: -1,
    gameMessage: "Welcome to React UNO! Click 'Start Autoplay' or 'Start New Game'.",
    history: [],
    direction: 1,
    isAutoplaying: false,
    gameOver: false,
    winner: null,
    finalScores: [],
    turnLog: [],
    turnNumber: 0,
};

// The Reducer Function
export function gameReducer(state, action) {
    switch (action.type) {
        case 'INITIALIZE_GAME': {
            // This logic is now fully restored
            let deckToUse = createDeck();
            const newHands = dealCards(deckToUse, 4);
            let startingTopCard = null;
            let tempDeckForTopCard = [...deckToUse];
            let attempts = 0;
            while (attempts < 50 && tempDeckForTopCard.length > 0) {
                const drawnCard = tempDeckForTopCard.pop();
                if (drawnCard.value !== 'Skip' && drawnCard.value !== 'Reverse' && drawnCard.value !== 'Draw Two' && drawnCard.color !== 'wild') {
                    startingTopCard = drawnCard;
                    deckToUse = tempDeckForTopCard;
                    break;
                } else {
                    tempDeckForTopCard.unshift(drawnCard);
                    tempDeckForTopCard.sort(() => Math.random() - 0.5);
                }
                attempts++;
            }
            if (!startingTopCard) {
                console.error("[REDUCER] Failed to find a valid starting top card. Defaulting.");
                startingTopCard = { color: 'red', value: '1' };
            }
            return {
                ...initialGameState,
                deck: [...deckToUse],
                hands: newHands,
                topCard: startingTopCard,
                gameMessage: "New game started. Player 1's turn!",
                history: ['New game started'],
                currentPlayer: 0,
                isAutoplaying: action.payload?.isAutoplaying ?? false,
                gameId: action.payload?.gameId ?? uuidv4(),
                turnNumber: 1,
            };
        }

        case 'PLAY_CARD': {
            const { card, playerIndex, chosenWildColor } = action.payload;
            const { hands, deck, topCard, currentPlayer, direction, gameOver, turnLog, turnNumber } = state;

            if (gameOver || playerIndex !== currentPlayer || !canPlayCard(card, topCard)) {
                return state;
            }

            const formatDrawnCards = (cards) => {
                if (!cards || cards.length === 0) return "";
                const cardStrings = cards.map(c => `${c.color} ${c.value}`);
                return `(drew: ${cardStrings.join(', ')})`;
            };

            const newHands = hands.map(h => [...h]);
            const newDeck = [...deck];
            const cardIndex = newHands[playerIndex].findIndex(c => c.color === card.color && c.value === card.value);
            if (cardIndex > -1) {
                newHands[playerIndex].splice(cardIndex, 1);
            } else {
                return state;
            }

            let nextPlayerIdx = (currentPlayer + direction + 4) % 4;
            let cardsToDraw = [];
            let newDirection = direction;
            let historyMessage = `Turn ${turnNumber}: P${playerIndex + 1} played ${card.color} ${card.value}.`;
            let newTopCard = { ...card };
            let penalty = null;

            if (card.value === 'Reverse') {
                newDirection = -direction;
                historyMessage += ` Direction reversed.`;
                if (newHands.length === 2) {
                    nextPlayerIdx = (currentPlayer - direction + 4) % 4;
                }
            } else if (card.value === 'Skip') {
                historyMessage += ` P${nextPlayerIdx + 1} is skipped.`;
                nextPlayerIdx = (nextPlayerIdx + direction + 4) % 4;
            } else if (card.value === 'Draw Two') {
                const playerToDrawIdx = (currentPlayer + direction + 4) % 4;
                for (let i = 0; i < 2; i++) { if (newDeck.length > 0) cardsToDraw.push(newDeck.pop()); }
                newHands[playerToDrawIdx].push(...cardsToDraw);
                penalty = { penalizedPlayer: playerToDrawIdx, cardsDrawn: cardsToDraw, count: 2 };
                historyMessage += ` P${playerToDrawIdx + 1} draws ${penalty.count} cards. ${formatDrawnCards(penalty.cardsDrawn)}`;
                nextPlayerIdx = (nextPlayerIdx + direction + 4) % 4;
            } else if (card.value === 'Wild Draw Four') {
                const playerToDrawIdx = (currentPlayer + direction + 4) % 4;
                for (let i = 0; i < 4; i++) { if (newDeck.length > 0) cardsToDraw.push(newDeck.pop()); }
                newHands[playerToDrawIdx].push(...cardsToDraw);
                penalty = { penalizedPlayer: playerToDrawIdx, cardsDrawn: cardsToDraw, count: 4 };
                historyMessage += ` P${playerToDrawIdx + 1} draws ${penalty.count} cards. ${formatDrawnCards(penalty.cardsDrawn)}`;
                nextPlayerIdx = (nextPlayerIdx + direction + 4) % 4;
            }

            if (card.color === 'wild' && chosenWildColor) {
                newTopCard.color = chosenWildColor;
                historyMessage += ` Wild color chosen: ${chosenWildColor}.`;
            }

            const winner = newHands[playerIndex].length === 0 ? playerIndex : state.winner;
            const gameOverStatus = winner !== null;
            if (gameOverStatus) {
                const finalScores = calculateGameScore(newHands, winner);
                historyMessage = `🎉 Turn ${turnNumber}: Game over! Player ${winner + 1} wins! Final scores: ${finalScores.map((score, idx) => `P${idx + 1}: ${score}`).join(', ')}`;
            }

            const updatedTurnLog = [
                ...turnLog,
                {
                    turn: turnNumber,
                    player: `Player ${playerIndex + 1}`,
                    type: 'PLAY',
                    card: { color: card.color, value: card.value },
                    wildColorChoice: chosenWildColor,
                    penalty,
                    timestamp: Date.now()
                }
            ];

            return {
                ...state,
                hands: newHands,
                deck: newDeck,
                topCard: newTopCard,
                currentPlayer: gameOverStatus ? -1 : nextPlayerIdx,
                direction: newDirection,
                gameMessage: gameOverStatus ? `Player ${winner + 1} wins!` : `Player ${nextPlayerIdx + 1}'s turn.`,
                history: [historyMessage, ...state.history],
                gameOver: gameOverStatus,
                winner: winner,
                finalScores: gameOverStatus ? calculateGameScore(newHands, winner) : [],
                turnLog: updatedTurnLog,
                turnNumber: gameOverStatus ? state.turnNumber : state.turnNumber + 1,
            };
        }

        case 'DRAW_CARD': {
            const { playerIndex } = action.payload;
            const { hands, deck, currentPlayer, direction, gameOver, turnNumber, turnLog } = state;

            if (gameOver || playerIndex !== currentPlayer) {
                return state;
            }

            const newHands = hands.map(h => [...h]);
            const newDeck = [...deck];
            const nextPlayerIdx = (currentPlayer + direction + 4) % 4;

            if (newDeck.length === 0) {
                const historyMessage = `Turn ${turnNumber}: Player ${playerIndex + 1} tried to draw, but deck is empty. Turn passes.`;
                return {
                    ...state,
                    gameMessage: `No cards left to draw! Turn passes.`,
                    history: [historyMessage, ...state.history],
                    currentPlayer: nextPlayerIdx,
                    turnNumber: state.turnNumber + 1,
                };
            }

            const drawnCard = newDeck.pop();
            newHands[playerIndex].push(drawnCard);

            const historyMessage = `Turn ${turnNumber}: P${playerIndex + 1} drew a ${drawnCard.color} ${drawnCard.value} card and passed.`;

            const newTurnLog = [
                ...turnLog,
                {
                    turn: turnNumber,
                    player: `Player ${playerIndex + 1}`,
                    type: 'DRAW_PASS',
                    card: drawnCard,
                    wildColorChoice: null,
                    penalty: null,
                    timestamp: Date.now()
                }
            ];

            return {
                ...state,
                hands: newHands,
                deck: newDeck,
                history: [historyMessage, ...state.history],
                gameMessage: `Player ${playerIndex + 1} drew a card. Player ${nextPlayerIdx + 1}'s turn.`,
                currentPlayer: nextPlayerIdx,
                turnNumber: state.turnNumber + 1,
                turnLog: newTurnLog,
            };
        }

        case 'SET_AUTOPLAY': {
            return { ...state, isAutoplaying: action.payload };
        }

        case 'UPDATE_MESSAGE': {
            return { ...state, gameMessage: action.payload };
        }

        case 'ADD_HISTORY': {
            return { ...state, history: [action.payload, ...state.history] };
        }

        case 'GAME_OVER': {
            const { winnerIndex, turnLog } = action.payload;
            const finalScores = calculateGameScore(state.hands, winnerIndex);

            const finishedGame = {
                gameId: state.gameId,
                timestamp: Date.now(),
                players: state.players,
                winner: state.players?.[winnerIndex]?.name || `Player ${winnerIndex + 1}`,
                finalScores,
                turnLog,
            };
            saveGameToStorage(finishedGame);
            saveTurnLogToStorage(finishedGame.gameId, finishedGame.turnLog);

            return {
                ...state,
                gameOver: true,
                gameMessage: `Game over! ${finishedGame.winner} wins!`,
                history: [`🎉 ${finishedGame.winner} wins the game!`, ...state.history],
                finalScores,
            };
        }

        default:
            return state;
    }
}