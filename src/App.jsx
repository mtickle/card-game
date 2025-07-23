import { useEffect, useRef, useState } from 'react';

function App() {
  const colors = ['red', 'blue', 'green', 'yellow'];
  const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', 'Draw Two'];
  const wilds = ['Wild', 'Wild Draw Four'];

  // --- Game Initialization Logic ---
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

  // --- Game State ---
  const [deck, setDeck] = useState(() => createDeck());
  const [hands, setHands] = useState([]);
  const [topCard, setTopCard] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(0); // Player 0 is human/simulated human
  const [gameMessage, setGameMessage] = useState('Starting game...');
  const [history, setHistory] = useState(['Game started']);
  const [direction, setDirection] = useState(1); // 1 for clockwise, -1 for counter-clockwise
  const [isAutoplaying, setIsAutoplaying] = useState(false); // New state for autoplay
  const aiTurnTimeoutRef = useRef(null); // Ref for AI turn setTimeout

  // --- Initial Game Setup Effect ---
  useEffect(() => {
    const initialDeck = createDeck();
    const initialHands = dealCards([...initialDeck]);
    setHands(initialHands);

    let startingTopCard = null;
    let tempDeck = [...initialDeck];

    while (tempDeck.length > 0) {
      const card = tempDeck.pop();
      if (card.value !== 'Skip' && card.value !== 'Reverse' && card.value !== 'Draw Two' && card.color !== 'wild') {
        startingTopCard = card;
        break;
      }
      initialHands[0].push(card);
    }

    if (!startingTopCard && tempDeck.length === 0) {
      console.error("Could not find a valid starting top card!");
      startingTopCard = initialDeck.pop();
    }
    setDeck(tempDeck);
    setTopCard(startingTopCard);
    setGameMessage(`Player ${currentPlayer + 1}'s turn`);

    console.log('Initial setup completed.');
    console.log('Player Hands:', initialHands);
    console.log('Initial Top Card:', startingTopCard);

    return () => {
      if (aiTurnTimeoutRef.current) {
        clearTimeout(aiTurnTimeoutRef.current);
      }
    };
  }, []);

  // --- Card Playability Check ---
  const canPlayCard = (card, currentTopCard) => {
    if (!card || !currentTopCard) {
      console.log('Invalid card or topCard passed to canPlayCard:', { card, currentTopCard });
      return false;
    }
    if (card.color === 'wild') return true;
    return card.color === currentTopCard.color || card.value === currentTopCard.value;
  };

  // --- AI Logic ---
  const chooseWildColor = (hand) => { // Passed hand to be more explicit
    const colorCounts = { red: 0, blue: 0, green: 0, yellow: 0 };
    hand.forEach(card => { // Use the passed hand
      if (card.color !== 'wild') {
        colorCounts[card.color]++;
      }
    });
    let bestColor = 'red';
    let maxCount = 0;
    for (const color in colorCounts) {
      if (colorCounts[color] > maxCount) {
        maxCount = colorCounts[color];
        bestColor = color;
      }
    }
    return bestColor;
  };

  const playAI = (hand, currentTopCard, currentDeck, playerIndex) => {
    console.log(`AI Player ${playerIndex + 1} evaluating hand:`, hand, 'Top card:', currentTopCard);
    // Prioritize non-wild cards that match
    for (let card of hand) {
      if (card.color !== 'wild' && canPlayCard(card, currentTopCard)) {
        console.log(`AI Player ${playerIndex + 1} selects card (non-wild):`, card);
        return card;
      }
    }
    // If no non-wild cards, play a wild if possible
    for (let card of hand) {
      if (card.color === 'wild') {
        console.log(`AI Player ${playerIndex + 1} selects card (wild):`, card);
        return card;
      }
    }
    console.log(`AI Player ${playerIndex + 1} cannot play, will draw a card.`);
    return null; // AI needs to draw
  };

  // --- Main Card Playing Logic ---
  const playCard = (card, playerIndex, chosenWildColor = null) => {
    console.log(`Player ${playerIndex + 1} attempting to play card:`, card);

    if (playerIndex !== currentPlayer) {
      setGameMessage(`It's not Player ${playerIndex + 1}'s turn! It's Player ${currentPlayer + 1}'s turn.`);
      setHistory(prev => [`Player ${playerIndex + 1} tried to play out of turn.`, ...prev]);
      return;
    }

    if (!canPlayCard(card, topCard)) {
      setGameMessage(`Invalid move for Player ${playerIndex + 1}! Card: ${card.color} ${card.value} vs. Top Card: ${topCard.color} ${topCard.value}`);
      setHistory(prev => [`Player ${playerIndex + 1} tried to play an invalid card: ${card.color} ${card.value}.`, ...prev]);
      return;
    }

    const newHands = [...hands];
    // Remove the played card from the hand. Handle cases where the same card might appear multiple times.
    const cardIndex = newHands[playerIndex].findIndex(c => c.color === card.color && c.value === card.value);
    if (cardIndex > -1) {
      newHands[playerIndex].splice(cardIndex, 1);
    }
    setHands(newHands);

    let newTopCard = { ...card };
    if (card.color === 'wild' && chosenWildColor) {
      newTopCard.color = chosenWildColor;
      setHistory(prev => [`Player ${playerIndex + 1} played ${card.value} and chose ${chosenWildColor}.`, ...prev]);
    } else {
      setHistory(prev => [`Player ${playerIndex + 1} played ${card.color} ${card.value}.`, ...prev]);
    }
    setTopCard(newTopCard);

    if (newHands[playerIndex].length === 0) {
      setGameMessage(`Player ${playerIndex + 1} wins!`);
      setHistory(prev => [`Player ${playerIndex + 1} wins the game!`, ...prev]);
      setCurrentPlayer(-1); // End game
      setIsAutoplaying(false); // Stop autoplay on win
      return;
    }

    let nextPlayerIdx = (currentPlayer + direction + 4) % 4;
    let drawAmount = 0;

    if (card.value === 'Reverse') {
      setDirection(prevDir => -prevDir);
      nextPlayerIdx = (currentPlayer + (-direction) + 4) % 4;
      setHistory(prev => [`Direction reversed.`, ...prev]);
    } else if (card.value === 'Skip') {
      setHistory(prev => [`Player ${nextPlayerIdx + 1} is skipped.`, ...prev]);
      nextPlayerIdx = (nextPlayerIdx + direction + 4) % 4;
    } else if (card.value === 'Draw Two') {
      drawAmount = 2;
      setHistory(prev => [`Player ${nextPlayerIdx + 1} draws two cards.`, ...prev]);
      nextPlayerIdx = (nextPlayerIdx + direction + 4) % 4; // Player who draws gets skipped
    } else if (card.value === 'Wild Draw Four') {
      drawAmount = 4;
      setHistory(prev => [`Player ${nextPlayerIdx + 1} draws four cards.`, ...prev]);
      nextPlayerIdx = (nextPlayerIdx + direction + 4) % 4; // Player who draws gets skipped
    }

    if (drawAmount > 0) {
      const currentDeck = [...deck];
      for (let i = 0; i < drawAmount; i++) {
        if (currentDeck.length > 0) {
          // The actual player who draws is (currentPlayer + direction + 4) % 4
          newHands[(currentPlayer + direction + 4) % 4].push(currentDeck.pop());
        } else {
          setHistory(prev => [`Deck is empty! Cannot draw more cards.`, ...prev]);
          break;
        }
      }
      setDeck(currentDeck);
      setHands(newHands);
    }

    setCurrentPlayer(nextPlayerIdx);
    setGameMessage(`Player ${nextPlayerIdx + 1}'s turn.`);
  };

  // --- Draw Card Logic for Human Player ---
  const drawCard = () => {
    // Only allow human to manually draw if not autoplaying
    if (isAutoplaying && currentPlayer === 0) {
      console.log("Autoplay is active, AI will handle Player 1's draw.");
      return;
    }

    if (currentPlayer !== 0) {
      setGameMessage('It\'s not your turn to draw!');
      setHistory(prev => [`Player 1 tried to draw out of turn.`, ...prev]);
      return;
    }

    const currentDeck = [...deck];
    if (currentDeck.length === 0) {
      setGameMessage('No cards left to draw!');
      setHistory(prev => [`Player 1 tried to draw, but deck is empty.`, ...prev]);
      return;
    }

    const newHands = [...hands];
    const drawnCard = currentDeck.pop();
    newHands[0].push(drawnCard);

    setDeck(currentDeck);
    setHands(newHands);
    setHistory(prev => [`Player 1 drew a card.`, ...prev]);

    const nextPlayer = (currentPlayer + direction + 4) % 4;
    setCurrentPlayer(nextPlayer);
    setGameMessage(`Player 1 drew a card. Player ${nextPlayer + 1}'s turn.`);
  };

  // --- AI Turn Effect (handles all AI players, including Player 0 if autoplaying) ---
  useEffect(() => {
    // If game is over, or not a valid player turn (shouldn't happen with current logic, but good safeguard)
    if (currentPlayer === -1) {
      return;
    }

    // Only proceed if it's an AI's turn OR if it's player 0's turn and autoplay is active
    if (currentPlayer !== 0 || isAutoplaying) {
      if (aiTurnTimeoutRef.current) {
        clearTimeout(aiTurnTimeoutRef.current);
      }

      aiTurnTimeoutRef.current = setTimeout(() => {
        console.log(`AI Player ${currentPlayer + 1}'s turn logic initiated.`);
        const aiHand = hands[currentPlayer];
        const currentTopCard = topCard; // Ensure latest topCard is used
        const currentDeck = deck; // Ensure latest deck is used

        const aiCardToPlay = playAI(aiHand, currentTopCard, currentDeck, currentPlayer);

        if (aiCardToPlay) {
          let chosenColor = null;
          if (aiCardToPlay.color === 'wild') {
            chosenColor = chooseWildColor(aiHand); // AI chooses color based on its hand
          }
          playCard(aiCardToPlay, currentPlayer, chosenColor);
        } else {
          // AI needs to draw a card
          const newDeck = [...currentDeck]; // Use the latest deck
          if (newDeck.length > 0) {
            const newHands = [...hands];
            const drawnCard = newDeck.pop();
            newHands[currentPlayer].push(drawnCard);
            setDeck(newDeck);
            setHands(newHands);
            setHistory(prev => [`Player ${currentPlayer + 1} drew a card.`, ...prev]);

            // After drawing, AI's turn is over, move to the next player
            const nextPlayer = (currentPlayer + direction + 4) % 4;
            setCurrentPlayer(nextPlayer);
            setGameMessage(`Player ${currentPlayer + 1} drew a card. Player ${nextPlayer + 1}'s turn.`);
          } else {
            setGameMessage(`No cards left to draw for Player ${currentPlayer + 1}! Turn passes.`);
            setHistory(prev => [`No cards left for Player ${currentPlayer + 1} to draw.`, ...prev]);
            // If deck is empty, turn still passes
            const nextPlayer = (currentPlayer + direction + 4) % 4;
            setCurrentPlayer(nextPlayer);
            setGameMessage(`Player ${currentPlayer + 1} could not draw. Player ${nextPlayer + 1}'s turn.`);
          }
        }
      }, isAutoplaying ? 200 : 1500); // Faster turns for autoplay, slower for manual AI

      return () => {
        if (aiTurnTimeoutRef.current) {
          clearTimeout(aiTurnTimeoutRef.current);
        }
      };
    }
  }, [currentPlayer, hands, topCard, deck, direction, isAutoplaying]); // Add isAutoplaying to dependencies

  // --- Autoplay Control Handlers ---
  const handleStartAutoplay = () => {
    if (!isAutoplaying) {
      setIsAutoplaying(true);
      setGameMessage("Autoplay started! AI vs AI.");
      setHistory(prev => [`Autoplay started.`, ...prev]);
      // If it's currently human's turn, trigger the AI effect
      if (currentPlayer === 0) {
        setCurrentPlayer(0); // Trigger useEffect for current player 0
      }
    }
  };

  const handleStopAutoplay = () => {
    setIsAutoplaying(false);
    setGameMessage(`Autoplay stopped. Player ${currentPlayer + 1}'s turn.`);
    setHistory(prev => [`Autoplay stopped.`, ...prev]);
    if (aiTurnTimeoutRef.current) {
      clearTimeout(aiTurnTimeoutRef.current);
    }
  };

  return (
    <div className="p-4 sm:p-8 bg-white rounded-lg shadow-lg max-w-5xl mx-auto mt-4 sm:mt-8 font-sans min-h-screen flex flex-col">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-center mb-4 sm:mb-6 text-indigo-700">Uno Game</h1>

      {/* Autoplay Controls */}
      <div className="flex justify-center gap-4 mb-6">
        <button
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors duration-200 text-lg font-semibold"
          onClick={handleStartAutoplay}
          disabled={isAutoplaying || currentPlayer === -1} // Disable if already autoplaying or game over
        >
          Start Autoplay
        </button>
        <button
          className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors duration-200 text-lg font-semibold"
          onClick={handleStopAutoplay}
          disabled={!isAutoplaying} // Disable if not currently autoplaying
        >
          Stop Autoplay
        </button>
      </div>

      {/* Game Area */}
      <div className="flex flex-col md:flex-row gap-4 flex-grow">
        {/* Main Game Board */}
        <div className="flex-1 flex flex-col justify-between">
          {/* Top Card & Message */}
          <div className="text-center mb-4">
            <h2 className="text-2xl font-semibold mb-2 text-gray-800">Top Card</h2>
            {topCard && (
              <div
                className={`w-24 h-36 rounded-xl shadow-lg mx-auto flex items-center justify-center text-white text-3xl font-bold border-2 border-gray-300
                  ${topCard.color === 'red' ? 'bg-red-600' :
                    topCard.color === 'blue' ? 'bg-blue-600' :
                      topCard.color === 'green' ? 'bg-green-600' :
                        topCard.color === 'yellow' ? 'bg-yellow-600' : 'bg-gray-800'}`}
              >
                {topCard.value}
              </div>
            )}
            <p className={`mt-4 text-xl font-medium text-gray-700 ${currentPlayer === 0 && !isAutoplaying ? 'animate-pulse text-green-700 font-bold text-2xl' : ''}`}>
              {gameMessage}
            </p>
          </div>

          {/* AI Players' Hands (Top Row) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {[1, 2, 3].map(player => (
              <div key={player} className="bg-gray-50 p-3 rounded-lg shadow-sm text-center">
                <h2 className="text-xl font-semibold mb-2 text-gray-800">Player {player + 1} (AI)</h2>
                <div className="flex flex-wrap gap-1 justify-center">
                  {hands[player]?.length > 0 ? (
                    hands[player].map((card, index) => (
                      <div
                        key={index}
                        className={`w-14 h-20 rounded-lg shadow-md flex items-center justify-center text-white text-sm font-bold
                          ${card.color === 'red' ? 'bg-red-400' :
                            card.color === 'blue' ? 'bg-blue-400' :
                              card.color === 'green' ? 'bg-green-400' :
                                card.color === 'yellow' ? 'bg-yellow-400' : 'bg-gray-600'}`}
                      >
                        {card.value === 'Wild' || card.value === 'Wild Draw Four' ? 'W' : ''}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No cards.</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Player 1's Hand */}
          <div className="mt-auto border-t pt-4 border-gray-200">
            <h2 className="text-2xl font-semibold mb-3 text-gray-800 text-center">Your Hand (Player 1)</h2>
            <div className="flex flex-wrap gap-3 justify-center">
              {hands[0]?.length > 0 ? (
                hands[0].map((card, index) => (
                  <button
                    key={index}
                    className={`w-20 h-28 rounded-xl shadow-md flex items-center justify-center cursor-pointer text-white text-lg font-bold transition-all duration-200 ease-in-out transform hover:scale-105 border-2 ${currentPlayer === 0 && !isAutoplaying && canPlayCard(card, topCard) ? 'hover:border-indigo-500' : 'border-gray-300'}
                      ${card.color === 'red' ? 'bg-red-500' :
                        card.color === 'blue' ? 'bg-blue-500' :
                          card.color === 'green' ? 'bg-green-500' :
                            card.color === 'yellow' ? 'bg-yellow-500' : 'bg-gray-700'}
                      ${(currentPlayer !== 0 || isAutoplaying || !canPlayCard(card, topCard)) ? 'opacity-60 cursor-not-allowed' : ''}`}
                    onClick={() => {
                      if (currentPlayer === 0 && !isAutoplaying) { // Only allow human input if not autoplaying
                        if (card.color === 'wild') {
                          let chosenColor = null;
                          while (!chosenColor || !colors.includes(chosenColor)) {
                            chosenColor = prompt('Choose a color: red, blue, green, or yellow').toLowerCase();
                            if (!colors.includes(chosenColor)) {
                              alert('Invalid color chosen. Please choose red, blue, green, or yellow.');
                            }
                          }
                          playCard(card, 0, chosenColor);
                        } else {
                          playCard(card, 0);
                        }
                      }
                    }}
                    disabled={currentPlayer !== 0 || isAutoplaying || !canPlayCard(card, topCard)}
                  >
                    {card.value}
                  </button>
                ))
              ) : (
                <p className="text-gray-600 text-center w-full">No cards in your hand.</p>
              )}
            </div>
            <div className="text-center mt-4">
              <button
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors duration-200 text-lg font-semibold"
                onClick={drawCard}
                disabled={currentPlayer !== 0 || isAutoplaying} // Disable if autoplaying
              >
                Draw Card
              </button>
            </div>
          </div>
        </div>

        {/* Game History Sidebar */}
        <div className="w-full md:w-1/3 bg-gray-100 p-6 rounded-lg shadow-lg md:max-h-[calc(100vh-100px)] overflow-y-auto">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800 border-b pb-2">Game History</h2>
          <ul className="list-disc list-inside text-base text-gray-700 space-y-2">
            {history.map((entry, index) => (
              <li key={index} className="border-b border-gray-200 pb-1 last:border-b-0">{entry}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;