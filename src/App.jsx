// src/App.jsx
import Header from '@layouts/Header';
import { gameReducer, initialGameState } from '@utils/gameReducer'; // Import reducer
import { useCallback, useEffect, useReducer, useRef } from 'react';
import Card, { getCardIcon, getColorClass, WinnerCard } from './components/Card';

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
  const colors = ['red', 'blue', 'green', 'yellow']; // Still needed for prompt

  // Use useReducer to manage all game state
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const {
    deck,
    hands,
    topCard,
    currentPlayer,
    gameMessage,
    history,
    direction,
    isAutoplaying,
    gameOver,
    winner,
    finalScores
  } = state;

  const aiTurnTimeoutRef = useRef(null);

  // Helper for logging hand sizes - adjusted for reducer state
  const logHandSizes = useCallback((action, currentHandsState) => {
    const targetHands = currentHandsState || hands;
    const sizes = targetHands.map((hand, index) => `P${index + 1}: ${hand.length}`);
    console.log(`[HANDS DEBUG] ${action} - ${sizes.join(', ')}`);
  }, [hands]); // `hands` is still a dependency for `logHandSizes` default behavior


  // --- Card Playability Check ---
  // Moved this logic inside reducer for consistency, but also needed here for UI check
  const canPlayCardUI = useCallback((card, currentTopCard) => {
    if (!card || !currentTopCard) return false;
    if (card.color === 'wild') return true;
    return card.color === currentTopCard.color || card.value === currentTopCard.value;
  }, []);

  // --- AI Logic Functions (pure functions that only decide, not change state) ---
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
      if (card.color !== 'wild' && canPlayCardUI(card, currentTopCard)) {
        return card;
      }
    }
    for (let card of hand) {
      if (card.color === 'wild') {
        return card;
      }
    }
    return null; // No playable card
  }, [canPlayCardUI]);


  // --- Initial Game Setup Effect (runs once on component mount) ---
  useEffect(() => {
    // Only initialize if the game hasn't started yet
    if (hands.length === 0 && deck.length === 0 && !topCard) {
      dispatch({ type: 'INITIALIZE_GAME' });
    }
    // Cleanup timeout if component unmounts
    return () => {
      if (aiTurnTimeoutRef.current) {
        clearTimeout(aiTurnTimeoutRef.current);
      }
    };
  }, [hands.length, deck.length, topCard, dispatch]); // dependencies for effect


  // --- AI Turn Effect (handles all AI players, including Player 0 if autoplaying) ---
  useEffect(() => {
    if (gameOver || currentPlayer === -1 || !hands.length) {
      if (aiTurnTimeoutRef.current) {
        clearTimeout(aiTurnTimeoutRef.current);
        aiTurnTimeoutRef.current = null;
      }
      return;
    }

    const isAITurn = (currentPlayer !== 0 || isAutoplaying);

    if (isAITurn) {
      // Clear any existing timeout to prevent multiple concurrent AI turns
      if (aiTurnTimeoutRef.current) {
        clearTimeout(aiTurnTimeoutRef.current);
      }

      aiTurnTimeoutRef.current = setTimeout(() => {
        const currentAiHand = hands[currentPlayer];
        const currentTopCardForAI = topCard;

        if (!currentAiHand || currentAiHand.length === 0) {
          console.log(`[AI DEBUG] Player ${currentPlayer + 1} hand is already empty or invalid. Skipping AI turn.`);
          dispatch({ type: 'UPDATE_MESSAGE', payload: `Player ${currentPlayer + 1} has no cards left.` });
          return;
        }

        const aiCardToPlay = playAI(currentAiHand, currentTopCardForAI);

        if (aiCardToPlay) {
          // Initialize chosenWildColor here, before any conditional assignment
          let chosenWildColor = null; // <--- ADD THIS LINE

          if (aiCardToPlay.color === 'wild') {
            chosenWildColor = chooseWildColor(currentAiHand);
          }
          // Now chosenWildColor will be either the chosen color or null
          dispatch({ type: 'PLAY_CARD', payload: { card: aiCardToPlay, playerIndex: currentPlayer, chosenWildColor } });
        } else {
          // AI needs to draw a card
          dispatch({ type: 'DRAW_CARD', payload: { playerIndex: currentPlayer, drawnByAI: true } });
        }
      }, isAutoplaying ? 200 : 1500); // Faster turns for autoplay

      return () => {
        if (aiTurnTimeoutRef.current) {
          clearTimeout(aiTurnTimeoutRef.current);
          aiTurnTimeoutRef.current = null;
        }
      };
    }
    return undefined;
  }, [currentPlayer, hands, topCard, isAutoplaying, gameOver, playAI, chooseWildColor, dispatch]); // Dependencies for AI turn

  // --- Autoplay Control Handlers ---
  const handleStartAutoplay = () => {
    if (!isAutoplaying && !gameOver) {
      dispatch({ type: 'SET_AUTOPLAY', payload: true });
      dispatch({ type: 'UPDATE_MESSAGE', payload: "Autoplay started! AI vs AI." });
      dispatch({ type: 'ADD_HISTORY', payload: 'Autoplay started.' }); // New action for history
      console.log("[AUTOPLAY] Autoplay started.");
      logHandSizes("After Autoplay Start", hands);
    } else if (gameOver) {
      dispatch({ type: 'UPDATE_MESSAGE', payload: "Game is over. Click 'Start New Game' to begin again." });
    }
  };

  const handleStopAutoplay = () => {
    dispatch({ type: 'SET_AUTOPLAY', payload: false });
    dispatch({ type: 'UPDATE_MESSAGE', payload: `Autoplay stopped. Player ${currentPlayer + 1}'s turn.` });
    dispatch({ type: 'ADD_HISTORY', payload: 'Autoplay stopped.' }); // New action for history
    if (aiTurnTimeoutRef.current) {
      clearTimeout(aiTurnTimeoutRef.current);
      aiTurnTimeoutRef.current = null;
    }
    console.log("[AUTOPLAY] Autoplay stopped.");
    logHandSizes("After Autoplay Stop", hands);
  };

  const handleStartNewGame = () => {
    // Dispatch INITIALIZE_GAME, passing current autoplay status
    dispatch({ type: 'INITIALIZE_GAME', payload: { isAutoplaying: state.isAutoplaying } });
  }

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
                </div>

                <div className="flex flex-wrap gap-1 justify-left" style={{ minHeight: '6rem' }}>
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
                              dispatch({ type: 'PLAY_CARD', payload: { card, playerIndex: 0, chosenWildColor } });
                            } else {
                              dispatch({ type: 'PLAY_CARD', payload: { card, playerIndex: 0 } });
                            }
                          }
                        }}
                        isDisabled={
                          (player !== currentPlayer) || isAutoplaying || gameOver || (player === currentPlayer && !canPlayCardUI(card, topCard))
                        }
                        isClickable={player === 0 && player === currentPlayer && !isAutoplaying && !gameOver && canPlayCardUI(card, topCard)}
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
              onClick={() => dispatch({ type: 'DRAW_CARD', payload: { playerIndex: 0, drawnByAI: false } })}
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
                onClick={handleStartNewGame}
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