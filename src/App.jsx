// src/App.jsx
import Header from '@layouts/Header';
import { useCallback, useEffect, useRef, useState } from 'react';
import Card, { getCardIcon, getColorClass } from './components/Card';

// Add a simple "WinnerCard" component or integrate its styles directly
const WinnerCard = () => (
  <div
    className="w-24 h-36 rounded-xl shadow-md flex items-center justify-center text-5xl font-extrabold bg-green-500 text-white border-4 border-green-700 animate-pulse-once"
    style={{ minWidth: '6rem', minHeight: '9rem' }} // Ensure it maintains card size
  >
    🏆
  </div>
);

// CSS for animate-pulse-once (add this to your App.css or index.css)
/*
@keyframes pulse-once {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.9; }
  100% { transform: scale(1); opacity: 1; }
}

.animate-pulse-once {
  animation: pulse-once 1s ease-in-out;
}
*/

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
    // Shuffle the deck initially
    return deck.sort(() => Math.random() - 0.5);
  };

  const dealCards = (deck, numPlayers = 4) => {
    const hands = Array(numPlayers).fill().map(() => []);
    for (let i = 0; i < 7; i++) { // Explicitly deal exactly 7 cards
      for (let j = 0; j < numPlayers; j++) {
        if (deck.length > 0) {
          hands[j].push(deck.pop());
        } else {
          console.warn("Deck ran out of cards during dealing! Not all players received 7 cards.");
          break; // Stop if deck is empty prematurely
        }
      }
    }
    return hands;
  };

  // --- Game State ---
  const [deck, setDeck] = useState([]);
  const [hands, setHands] = useState([]);
  const [topCard, setTopCard] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [gameMessage, setGameMessage] = useState('Welcome to UNO!');
  const [history, setHistory] = useState(['Game initialized']);
  const [direction, setDirection] = useState(1);
  const [isAutoplaying, setIsAutoplaying] = useState(false);
  const aiTurnTimeoutRef = useRef(null);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [finalScores, setFinalScores] = useState([]);

  // Helper for logging hand sizes
  const logHandSizes = useCallback((action) => {
    const sizes = hands.map((hand, index) => `P${index + 1}: ${hand.length}`);
    console.log(`[HANDS DEBUG] ${action} - ${sizes.join(', ')}`);
  }, [hands]); // Depend on hands so it always gets the latest state

  // --- `startNewGame` function, wrapped in useCallback ---
  const startNewGame = useCallback(() => {
    if (aiTurnTimeoutRef.current) {
      clearTimeout(aiTurnTimeoutRef.current);
      aiTurnTimeoutRef.current = null;
    }

    let initialDeck = createDeck();
    const newHands = dealCards(initialDeck, 4);

    let currentDeck = [...initialDeck];

    let startingTopCard = null;
    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      if (currentDeck.length === 0) {
        console.warn("[START GAME] Deck ran out while picking starting top card. Recreating deck.");
        initialDeck = createDeck();
        const tempHandsForRedeal = dealCards(initialDeck, 4);
        newHands.splice(0, newHands.length, ...tempHandsForRedeal);
        currentDeck = [...initialDeck];
      }

      const drawnCard = currentDeck.pop();
      if (drawnCard.value !== 'Skip' && drawnCard.value !== 'Reverse' && drawnCard.value !== 'Draw Two' && drawnCard.color !== 'wild') {
        startingTopCard = drawnCard;
        break;
      } else {
        currentDeck.unshift(drawnCard);
        currentDeck.sort(() => Math.random() - 0.5);
        attempts++;
      }
    }

    if (!startingTopCard) {
      console.error("[START GAME] Failed to find a valid starting top card after many attempts. Defaulting.");
      startingTopCard = { color: 'red', value: '1' };
    }

    setDeck(currentDeck);
    setHands(newHands);
    setTopCard(startingTopCard);
    setCurrentPlayer(0);
    setWinner(null);
    setFinalScores([]);
    setGameMessage("New game started. Player 1's turn!");
    setHistory(['New game started']);
    setGameOver(false);
    setDirection(1);

    // Log hand sizes immediately after setting initial state
    console.log("[START GAME] Hands after initial deal and top card selection:");
    newHands.forEach((hand, index) => {
      console.log(`  Player ${index + 1}: ${hand.length} cards`);
    });
  }, []);

  // --- Initial Game Setup Effect (runs once on component mount) ---
  useEffect(() => {
    if (hands.length === 0 && deck.length === 0 && !topCard) {
      startNewGame();
    }
    return () => {
      if (aiTurnTimeoutRef.current) {
        clearTimeout(aiTurnTimeoutRef.current);
      }
    };
  }, [startNewGame, hands, deck, topCard]);

  // --- Card Playability Check ---
  const canPlayCard = useCallback((card, currentTopCard) => {
    if (!card || !currentTopCard) return false;
    if (card.color === 'wild') return true;
    return card.color === currentTopCard.color || card.value === currentTopCard.value;
  }, []);

  // --- AI Logic Functions ---
  const chooseWildColor = useCallback((hand) => {
    const colorCounts = { red: 0, blue: 0, green: 0, yellow: 0 };
    hand.forEach(card => {
      if (card.color !== 'wild') colorCounts[card.color]++;
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
  }, []);

  const playAI = useCallback((hand, currentTopCard) => {
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
    return null;
  }, [canPlayCard]);

  // --- Game Score Calculation ---
  const calculateGameScore = useCallback((hands, winnerIndex) => {
    return hands.map((hand, index) => {
      if (index === winnerIndex) return 0;

      return hand.reduce((total, card) => {
        if (['Draw Two', 'Reverse', 'Skip'].includes(card.value)) return total + 20;
        if (['Wild', 'Wild Draw Four'].includes(card.value)) return total + 50;
        const numeric = parseInt(card.value, 10);
        return isNaN(numeric) ? total : total + numeric;
      }, 0);
    });
  }, []);

  // --- Main Card Playing Logic ---
  const playCard = useCallback((card, playerIndex, chosenWildColor = null) => {
    // --- Initial Validation and Game Over Check ---
    if (gameOver) return; // Prevent any moves if game is already over
    if (playerIndex !== currentPlayer) {
      setGameMessage(`It's not Player ${playerIndex + 1}'s turn!`);
      setHistory(prev => [`Player ${playerIndex + 1} tried to play out of turn.`, ...prev]);
      return;
    }
    if (!canPlayCard(card, topCard)) {
      setGameMessage(`Invalid move for Player ${playerIndex + 1}!`);
      setHistory(prev => [`Player ${playerIndex + 1} tried to play an invalid card.`, ...prev]);
      return;
    }

    // --- Log Before Card Play ---
    logHandSizes(`Before P${playerIndex + 1} plays ${card.value} ${card.color}`);

    // --- Update Player's Hand (Remove Played Card) ---
    setHands(prevHands => {
      const newHands = [...prevHands];
      const cardIndex = newHands[playerIndex].findIndex(c => c.color === card.color && c.value === card.value);
      if (cardIndex > -1) {
        newHands[playerIndex].splice(cardIndex, 1); // Remove the played card
      }
      return newHands;
    });

    // --- Update Top Card and History ---
    let newTopCard = { ...card };
    if (card.color === 'wild' && chosenWildColor) {
      newTopCard.color = chosenWildColor;
      setHistory(prev => [`Player ${playerIndex + 1} played ${card.value} and chose ${chosenWildColor}.`, ...prev]);
    } else {
      setHistory(prev => [`Player ${playerIndex + 1} played ${card.color} ${card.value}.`, ...prev]);
    }
    setTopCard(newTopCard);

    // --- Check for Immediate Win Condition ---
    // Note: `hands[playerIndex].length - 1` checks the length *after* the current card is removed.
    // The `gameOver` useEffect will react to the `hands` state change.
    if (hands[playerIndex].length - 1 === 0) {
      // Player won! Let the `gameOver` useEffect handle state updates and next steps.
      // Log hand sizes (with a small delay to ensure state propagates for logging accuracy).
      setTimeout(() => {
        logHandSizes(`AFTER P${playerIndex + 1} played and WON`);
      }, 0);
      return; // Stop further execution in this `playCard` call, game over logic takes over.
    }

    // --- Determine Next Player and Draw Effects ---
    let nextPlayerIdx = (currentPlayer + direction + 4) % 4;
    let drawAmount = 0;
    let historyMessage = `Player ${playerIndex + 1} played ${card.color} ${card.value}. `;

    if (card.value === 'Reverse') {
      setDirection(prevDir => -prevDir);
      nextPlayerIdx = (currentPlayer + (-direction) + 4) % 4; // Current player + reversed direction
      historyMessage += `Direction reversed.`;
    } else if (card.value === 'Skip') {
      historyMessage += `Player ${nextPlayerIdx + 1} is skipped.`;
      nextPlayerIdx = (nextPlayerIdx + direction + 4) % 4; // Skip one player
    } else if (card.value === 'Draw Two') {
      drawAmount = 2;
      historyMessage += `Player ${nextPlayerIdx + 1} draws two cards.`;
      nextPlayerIdx = (nextPlayerIdx + direction + 4) % 4; // Skip drawing player
    } else if (card.value === 'Wild Draw Four') {
      drawAmount = 4;
      historyMessage += `Player ${nextPlayerIdx + 1} draws four cards.`;
      nextPlayerIdx = (nextPlayerIdx + direction + 4) % 4; // Skip drawing player
    }

    setHistory(prev => [historyMessage, ...prev]);

    // --- Handle Draw Effects (Refactored for Atomic Updates) ---
    if (drawAmount > 0) {
      const playerToDraw = (currentPlayer + direction + 4) % 4;
      let drawnCards = [];

      // 1. Update the deck and collect drawn cards
      setDeck(prevDeck => {
        const currentDeck = [...prevDeck];
        for (let i = 0; i < drawAmount; i++) {
          if (currentDeck.length > 0) {
            drawnCards.push(currentDeck.pop());
          } else {
            setHistory(hist => [`Deck is empty! Cannot draw more cards for Player ${playerToDraw + 1}.`, ...hist]);
            break; // Stop drawing if deck is empty
          }
        }
        return currentDeck; // Return the deck with cards removed
      });

      // 2. Update the target player's hand with the drawn cards
      setHands(prevHands => {
        const newHandsAfterDraw = [...prevHands];
        // Use spread operator to create a new array for the player's hand, combining old with new
        newHandsAfterDraw[playerToDraw] = [...newHandsAfterDraw[playerToDraw], ...drawnCards];

        // Log hand sizes immediately after hand update for draw effect
        logHandSizes(`AFTER P${playerToDraw + 1} drew ${drawnCards.length} cards (from ${playerToDraw + 1}'s turn)`);

        return newHandsAfterDraw;
      });
    }

    // --- Finalize Turn Transition ---
    setCurrentPlayer(nextPlayerIdx);
    setGameMessage(`Player ${nextPlayerIdx + 1}'s turn.`);

    // Log hand sizes AFTER the turn has fully transitioned and all effects (except win) are applied.
    // This provides a final snapshot for the end of a playCard action.
    setTimeout(() => {
      logHandSizes(`End of turn: P${playerIndex + 1} played, now P${nextPlayerIdx + 1}'s turn`);
    }, 0);

  }, [currentPlayer, direction, topCard, canPlayCard, hands, logHandSizes, setDeck, setHands, setHistory, setTopCard, setDirection]); // Added missing dependencies

  // --- Draw Card Logic for Human Player ---
  const drawCard = useCallback(() => {
    if (gameOver || isAutoplaying || currentPlayer !== 0) {
      setGameMessage('It\'s not your turn to draw or game is over/autoplay!');
      return;
    }

    if (deck.length === 0) {
      setGameMessage('No cards left to draw!');
      setHistory(prev => [`Player 1 tried to draw, but deck is empty.`, ...prev]);
      return;
    }

    // Log hand sizes BEFORE drawing
    logHandSizes(`Before P1 draws a card`);

    setDeck(prevDeck => {
      const currentDeck = [...prevDeck];
      const drawnCard = currentDeck.pop();
      setHands(prevHands => {
        const newHands = [...prevHands];
        newHands[0].push(drawnCard);
        return newHands;
      });
      setHistory(prev => [`Player 1 drew a card.`, ...prev]);
      return currentDeck;
    });

    const nextPlayer = (currentPlayer + direction + 4) % 4;
    setCurrentPlayer(nextPlayer);
    setGameMessage(`Player 1 drew a card. Player ${nextPlayer + 1}'s turn.`);

    // Log hand sizes AFTER drawing and turn transition
    setTimeout(() => {
      logHandSizes(`AFTER P1 drew and P${nextPlayer + 1} turn`);
    }, 0);
  }, [currentPlayer, direction, deck.length, gameOver, isAutoplaying, logHandSizes]);

  // --- AI Turn Effect (handles all AI players, including Player 0 if autoplaying) ---
  useEffect(() => {
    if (gameOver || currentPlayer === -1) {
      if (aiTurnTimeoutRef.current) {
        clearTimeout(aiTurnTimeoutRef.current);
        aiTurnTimeoutRef.current = null;
      }
      return;
    }

    if (currentPlayer !== 0 || isAutoplaying) {
      if (aiTurnTimeoutRef.current) {
        clearTimeout(aiTurnTimeoutRef.current);
      }

      aiTurnTimeoutRef.current = setTimeout(() => {
        const aiHand = hands[currentPlayer];

        // This check is important here to avoid issues if hands state updates mid-timeout
        if (!aiHand || aiHand.length === 0) {
          console.log(`[AI DEBUG] Player ${currentPlayer + 1} hand is already empty or invalid. Skipping AI turn.`);
          // Potentially trigger game over check explicitly if it didn't already
          if (hands.findIndex(hand => hand.length === 0) !== -1 && !gameOver) {
            setGameOver(true);
          }
          return;
        }

        const currentTopCard = topCard;
        const aiCardToPlay = playAI(aiHand, currentTopCard);

        if (aiCardToPlay) {
          let chosenColor = null;
          if (aiCardToPlay.color === 'wild') {
            chosenColor = chooseWildColor(aiHand);
          }
          playCard(aiCardToPlay, currentPlayer, chosenColor);
        } else {
          // AI needs to draw a card
          // Log hand sizes BEFORE AI draws
          logHandSizes(`Before P${currentPlayer + 1} (AI) draws a card`);

          setDeck(prevDeck => {
            const newDeck = [...prevDeck];
            if (newDeck.length > 0) {
              setHands(prevHands => {
                const newHands = [...prevHands];
                const drawnCard = newDeck.pop();
                newHands[currentPlayer].push(drawnCard);
                return newHands;
              });
              setHistory(prev => [`Player ${currentPlayer + 1} drew a card.`, ...prev]);

              const nextPlayer = (currentPlayer + direction + 4) % 4;
              setCurrentPlayer(nextPlayer);
              setGameMessage(`Player ${currentPlayer + 1} drew a card. Player ${nextPlayer + 1}'s turn.`);

              // Log hand sizes AFTER AI draws and turn transition
              setTimeout(() => { // Use timeout to ensure state propagates
                logHandSizes(`AFTER P${currentPlayer + 1} (AI) drew and P${nextPlayer + 1} turn`);
              }, 0);
            } else {
              setGameMessage(`No cards left to draw for Player ${currentPlayer + 1}! Turn passes.`);
              setHistory(prev => [`No cards left for Player ${currentPlayer + 1} to draw.`, ...prev]);
              const nextPlayer = (currentPlayer + direction + 4) % 4;
              setCurrentPlayer(nextPlayer);
              setGameMessage(`Player ${currentPlayer + 1} could not draw. Player ${nextPlayer + 1}'s turn.`);
            }
            return newDeck;
          });
        }
      }, isAutoplaying ? 200 : 1500);

      return () => {
        if (aiTurnTimeoutRef.current) {
          clearTimeout(aiTurnTimeoutRef.current);
          aiTurnTimeoutRef.current = null;
        }
      };
    }
  }, [currentPlayer, hands, topCard, deck.length, direction, isAutoplaying, gameOver, playAI, playCard, chooseWildColor, logHandSizes]);

  // --- GAME OVER Effect (listens for game end) ---
  useEffect(() => {
    const winnerIndex = hands.findIndex(hand => hand.length === 0);

    if (winnerIndex !== -1 && !gameOver) {
      setGameOver(true);
      setWinner(winnerIndex);
      const scores = calculateGameScore(hands, winnerIndex);
      setFinalScores(scores);
      setGameMessage(`Player ${winnerIndex + 1} wins! Game Over.`);
      setHistory(prev => [`Player ${winnerIndex + 1} wins the game!`, ...prev]);

      // Log hand sizes at Game Over
      console.log(`[GAME OVER] Player ${winnerIndex + 1} wins! Final Hand Sizes:`);
      hands.forEach((hand, index) => {
        console.log(`  Player ${index + 1}: ${hand.length} cards`);
      });

      if (isAutoplaying) {
        if (aiTurnTimeoutRef.current) {
          clearTimeout(aiTurnTimeoutRef.current);
          aiTurnTimeoutRef.current = null;
        }
        setHistory(prev => [`New game starting in 3 seconds...`, ...prev]);
        const timer = setTimeout(() => {
          startNewGame();
        }, 3000);

        return () => clearTimeout(timer);
      } else {
        if (aiTurnTimeoutRef.current) {
          clearTimeout(aiTurnTimeoutRef.current);
          aiTurnTimeoutRef.current = null;
        }
      }
    }
  }, [hands, gameOver, isAutoplaying, startNewGame, calculateGameScore]);


  // --- Autoplay Control Handlers ---
  const handleStartAutoplay = () => {
    if (!isAutoplaying && !gameOver) {
      setIsAutoplaying(true);
      setGameMessage("Autoplay started! AI vs AI.");
      setHistory(prev => [`Autoplay started.`, ...prev]);
      if (currentPlayer === 0) {
        setCurrentPlayer(0);
      }
      console.log("[AUTOPLAY] Autoplay started.");
      logHandSizes("After Autoplay Start"); // Log hand sizes when autoplay begins
    } else if (gameOver) {
      setGameMessage("Game is over. Click 'Start New Game' to begin again.");
    }
  };

  const handleStopAutoplay = () => {
    setIsAutoplaying(false);
    setGameMessage(`Autoplay stopped. Player ${currentPlayer + 1}'s turn.`);
    setHistory(prev => [`Autoplay stopped.`, ...prev]);
    if (aiTurnTimeoutRef.current) {
      clearTimeout(aiTurnTimeoutRef.current);
      aiTurnTimeoutRef.current = null;
    }
    console.log("[AUTOPLAY] Autoplay stopped.");
    logHandSizes("After Autoplay Stop"); // Log hand sizes when autoplay ends
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
              className={`bg-[#fffdf7] p-4 rounded-2xl shadow-md border-2 border-[#e2dccc] ${currentPlayer === player && !gameOver && !isAutoplaying ? 'border-indigo-500 ring-4 ring-indigo-200' : ''}`}
            >
              <div className="flex flex-col gap-2">
                <div className="font-semibold text-gray-800 text-left">
                  Player {player + 1}
                  {currentPlayer === player && !gameOver && !isAutoplaying && (
                    <span className="ml-2 text-sm text-green-600 font-bold animate-pulse">YOUR TURN</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 justify-left" style={{ minHeight: '9rem' }}>
                  {hands[player]?.length > 0 ? (
                    hands[player].map((card, index) => (
                      <Card
                        key={index}
                        card={card}
                        onClick={() => {
                          if (player === 0 && !isAutoplaying && !gameOver) {
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
                          (player !== currentPlayer) || isAutoplaying || gameOver || (player === currentPlayer && !canPlayCard(card, topCard))
                        }
                        isClickable={player === 0 && player === currentPlayer && !isAutoplaying && !gameOver && canPlayCard(card, topCard)}
                      />
                    ))
                  ) : (
                    gameOver && winner === player ? (
                      <WinnerCard />
                    ) : (
                      <p className="text-gray-500 text-sm" style={{ width: '6rem', height: '9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No cards.</p>
                    )
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
              disabled={currentPlayer !== 0 || isAutoplaying || gameOver}
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
              disabled={gameOver && !isAutoplaying}
            >
              {isAutoplaying ? 'Stop Autoplay' : 'Start Autoplay'}
            </button>
            {gameOver && !isAutoplaying && (
              <button
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 text-lg font-semibold"
                onClick={startNewGame}
              >
                Start New Game
              </button>
            )}
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