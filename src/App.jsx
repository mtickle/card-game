import Card, { getCardIcon, getColorClass } from '@components/Card'; // <-- Import Card component and helpers
import Header from '@layouts/Header'; // Assuming this path is correct
import { useCallback, useEffect, useRef, useState } from 'react';

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

  //--- Give each of the players SEVEN cards.
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
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [finalScores, setFinalScores] = useState([]);
  // const [autoplay, setAutoplay] = useState(false); // This state is redundant with isAutoplaying

  //--- Prepare the game. Give us a top card but not if it is a special card.
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

    return () => {
      if (aiTurnTimeoutRef.current) {
        clearTimeout(aiTurnTimeoutRef.current);
      }
    };
  }, []);

  //--- This is supposed to do something but I'm not sure what.
  const startNewGame = useCallback(() => {
    const newDeck = createDeck();
    const newHands = dealCards([...newDeck]);

    let startingTopCard = null;
    while (newDeck.length > 0) {
      const card = newDeck.pop();
      if (card.value !== 'Skip' && card.value !== 'Reverse' && card.value !== 'Draw Two' && card.color !== 'wild') {
        startingTopCard = card;
        break;
      }
      newHands[0].push(card); // Put unusable starting cards into Player 1's hand
    }

    setDeck([...newDeck]);
    setHands(newHands);
    setTopCard(startingTopCard || { color: 'wild', value: 'Wild' });
    setCurrentPlayer(0);
    setWinner(null);
    setFinalScores([]);
    setGameMessage("New game started. Player 1's turn.");
    setHistory(['New game started']);
    setGameOver(false);
    // Don't modify isAutoplaying here, it should be controlled by buttons
    // If it was true, it will remain true and new game will autoplay
  }, []);


  //--- GAME OVER
  useEffect(() => {
    const winnerIndex = hands.findIndex(hand => hand.length === 0);

    if (winnerIndex !== -1 && !gameOver) {
      const scores = calculateGameScore(hands, winnerIndex);
      setWinner(winnerIndex);
      setFinalScores(scores);
      setGameOver(true);

      if (isAutoplaying) { // Use isAutoplaying, not 'autoplay'
        const timer = setTimeout(() => {
          startNewGame();
        }, 3000);

        return () => clearTimeout(timer);
      } else {
        setIsAutoplaying(false);
      }
    }
  }, [hands, gameOver, isAutoplaying, startNewGame]); // Dependency update: use isAutoplaying

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
  const chooseWildColor = (hand) => {
    const colorCounts = { red: 0, blue: 0, green: 0, yellow: 0 };
    hand.forEach(card => {
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
    for (let card of hand) {
      if (card.color !== 'wild' && canPlayCard(card, currentTopCard)) {
        return card;
      }
    }
    for (let card of hand) {
      if (card.color === 'wild') {
        return card;
      }
    }
    return null; // AI needs to draw
  };

  const calculateGameScore = (hands, winnerIndex) => {
    return hands.map((hand, index) => {
      if (index === winnerIndex) return 0;

      return hand.reduce((total, card) => {
        if (['Draw Two', 'Reverse', 'Skip'].includes(card.value)) return total + 20;
        if (['Wild', 'Wild Draw Four'].includes(card.value)) return total + 50;

        const numeric = parseInt(card.value, 10);
        return isNaN(numeric) ? total : total + numeric;
      }, 0);
    });
  };


  // --- Main Card Playing Logic ---
  const playCard = (card, playerIndex, chosenWildColor = null) => {
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
      // isAutoplaying is handled in useEffect for gameOver
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
      nextPlayerIdx = (nextPlayerIdx + direction + 4) % 4;
    } else if (card.value === 'Wild Draw Four') {
      drawAmount = 4;
      setHistory(prev => [`Player ${nextPlayerIdx + 1} draws four cards.`, ...prev]);
      nextPlayerIdx = (nextPlayerIdx + direction + 4) % 4;
    }

    if (drawAmount > 0) {
      const currentDeck = [...deck];
      for (let i = 0; i < drawAmount; i++) {
        if (currentDeck.length > 0) {
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
    if (isAutoplaying && currentPlayer === 0) {
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
    if (currentPlayer === -1 || gameOver) { // Add gameOver check here
      return;
    }

    if (currentPlayer !== 0 || isAutoplaying) {
      if (aiTurnTimeoutRef.current) {
        clearTimeout(aiTurnTimeoutRef.current);
      }

      aiTurnTimeoutRef.current = setTimeout(() => {
        const aiHand = hands[currentPlayer];
        const currentTopCard = topCard;
        const currentDeck = deck;

        const aiCardToPlay = playAI(aiHand, currentTopCard, currentDeck, currentPlayer);

        if (aiCardToPlay) {
          let chosenColor = null;
          if (aiCardToPlay.color === 'wild') {
            chosenColor = chooseWildColor(aiHand);
          }
          playCard(aiCardToPlay, currentPlayer, chosenColor);
        } else {
          const newDeck = [...currentDeck];
          if (newDeck.length > 0) {
            const newHands = [...hands];
            const drawnCard = newDeck.pop();
            newHands[currentPlayer].push(drawnCard);
            setDeck(newDeck);
            setHands(newHands);
            setHistory(prev => [`Player ${currentPlayer + 1} drew a card.`, ...prev]);

            const nextPlayer = (currentPlayer + direction + 4) % 4;
            setCurrentPlayer(nextPlayer);
            setGameMessage(`Player ${currentPlayer + 1} drew a card. Player ${nextPlayer + 1}'s turn.`);
          } else {
            setGameMessage(`No cards left to draw for Player ${currentPlayer + 1}! Turn passes.`);
            setHistory(prev => [`No cards left for Player ${currentPlayer + 1} to draw.`, ...prev]);
            const nextPlayer = (currentPlayer + direction + 4) % 4;
            setCurrentPlayer(nextPlayer);
            setGameMessage(`Player ${currentPlayer + 1} could not draw. Player ${nextPlayer + 1}'s turn.`);
          }
        }
      }, isAutoplaying ? 200 : 1500);

      return () => {
        if (aiTurnTimeoutRef.current) {
          clearTimeout(aiTurnTimeoutRef.current);
        }
      };
    }
  }, [currentPlayer, hands, topCard, deck, direction, isAutoplaying, gameOver]); // Dependency update: add gameOver


  // --- Autoplay Control Handlers ---
  const handleStartAutoplay = () => {
    if (!isAutoplaying) {
      setIsAutoplaying(true);
      setGameMessage("Autoplay started! AI vs AI.");
      setHistory(prev => [`Autoplay started.`, ...prev]);
      if (currentPlayer === 0) {
        setCurrentPlayer(0);
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
    <div className="container mx-auto p-4">
      <Header />

      <div className="grid grid-cols-[1fr_auto] gap-4 p-6 bg-white rounded-b-3xl shadow-sm mb-4">
        {/* Player Buckets stacked vertically */}
        <div className="flex flex-col gap-4">
          {[0, 1, 2, 3].map(player => (
            <div
              key={player}
              className={`bg-[#fffdf7] p-4 rounded-2xl shadow-md border-2 border-[#e2dccc] ${currentPlayer === player && !gameOver ? 'border-indigo-500 ring-4 ring-indigo-200' : ''}`}
            >
              <div className="flex flex-col gap-2">
                <div className="font-semibold text-gray-800 text-left">
                  Player {player + 1}
                  {currentPlayer === player && !gameOver && (
                    <span className="ml-2 text-sm text-green-600 font-bold animate-pulse">YOUR TURN</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 justify-left">
                  {hands[player]?.length > 0 ? (
                    hands[player].map((card, index) => (
                      <Card
                        key={index}
                        card={card}
                        onClick={() => {
                          if (player === 0 && !isAutoplaying) { // Human player only and not autoplaying
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
                        isDisabled={
                          (player === 0 && (currentPlayer !== 0 || isAutoplaying || !canPlayCard(card, topCard))) ||
                          (player !== 0 && true) // AI cards are never interactive
                        }
                        isClickable={player === 0 && canPlayCard(card, topCard) && !isAutoplaying}
                      />
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No cards.</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {/* Draw Card button for Player 1 */}
          <div className="text-center mt-4">
            <button
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors duration-200 text-lg font-semibold"
              onClick={drawCard}
              disabled={currentPlayer !== 0 || isAutoplaying || gameOver} // Disable if autoplaying or game over
            >
              Draw Card
            </button>
          </div>
        </div>

        {/* Top Card section aligned to match full height */}
        <div className="bg-[#fffdf7] p-4 rounded-2xl shadow-md border-2 border-[#e2dccc] flex flex-col items-center justify-start gap-4">
          <div className="font-semibold text-gray-800 text-lg">Top Card</div>

          {topCard && (
            <div
              className={`w-24 h-36 rounded-xl shadow-md flex items-center justify-center text-4xl font-extrabold ${getColorClass(topCard.color, 'card')} border-4 ${getColorClass(topCard.color, 'border')}`}
            >
              {getCardIcon(topCard.value)}
            </div>
          )}

          {/* Autoplay Controls */}
          <div className="flex justify-center gap-4 mb-6">
            <button
              className={`px-6 py-3 rounded-lg text-white text-lg font-semibold transition-colors duration-200
                ${isAutoplaying
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'}
                ${gameOver ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={isAutoplaying ? handleStopAutoplay : handleStartAutoplay}
              disabled={gameOver}
            >
              {isAutoplaying ? 'Stop Autoplay' : 'Start Autoplay'}
            </button>
          </div>

          <div className="w-full md:w-96 bg-gray-100 p-6 rounded-lg shadow-lg max-h-[30vh] overflow-y-auto">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800 border-b pb-2">Game History</h2>
            <ul className="list-disc list-inside text-base text-gray-700 space-y-2">
              {history.map((entry, index) => (
                <li key={index} className="border-b border-gray-200 pb-1 last:border-b-0">{entry}</li>
              ))}
            </ul>
          </div>

          {gameOver && winner !== null && (
            <div className="bg-white border-l-8 border-green-500 p-6 rounded-xl shadow-xl mb-6 animate-fade-in">
              <h2 className="text-2xl font-bold text-green-700 mb-2 text-center">
                🎉 Player {winner + 1} wins!
              </h2>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Final Scores</h3>
              <ul className="grid grid-cols-2 gap-2 text-gray-700 text-base font-medium">
                {finalScores.map((score, index) => (
                  <li
                    key={index}
                    className={`p-3 rounded-lg text-center ${index === winner
                      ? 'bg-green-100 border border-green-400 font-bold'
                      : 'bg-gray-100'
                      }`}
                  >
                    Player {index + 1}: {score} pts
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;