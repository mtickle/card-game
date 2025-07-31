export const formatTurnLog = ({ type, playerIndex, card, players }) => {
    const playerName = players?.[playerIndex]?.name || `Player ${playerIndex + 1}`;
    return {
        player: playerName,
        action: type === 'PLAY' ? `Played ${card.value}` : 'Drew a card',
        ...(card ? { card } : {}),
        timestamp: Date.now(),
    };
};

export const colors = ['red', 'blue', 'green', 'yellow'];
export const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', 'Draw Two'];
export const wilds = ['Wild', 'Wild Draw Four'];

export const createDeck = () => {
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

export const dealCards = (deck, numPlayers = 4) => {
    const hands = Array(numPlayers).fill().map(() => []);
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < numPlayers; j++) {
            if (deck.length > 0) {
                hands[j].push(deck.pop());
            }
        }
    }
    return hands;
};

export const canPlayCard = (card, currentTopCard) => {
    if (!card || !currentTopCard) return false;
    if (card.color === 'wild') return true;
    return card.color === currentTopCard.color || card.value === currentTopCard.value;
};

export const calculateGameScore = (currentHands, winnerIdx) => {
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