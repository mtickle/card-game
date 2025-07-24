// src/App.jsx
import Header from '@layouts/Header';
import { colors } from '@utils/colorUtils';
import { gameReducer, initialGameState } from '@utils/gameReducer';
import { formatTurnLog } from '@utils/gameUtils';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import Card, { getCardIcon, getColorClass, WinnerCard } from './components/Card';
import { handleStartAutoplay, handleStartNewGame, handleStopAutoplay } from './utils/handleUtils';

function App() {

  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const {
    deck,
    hands,
    topCard,
    currentPlayer,
    gameMessage,
    history,
    direction,
    isAutoplaying, // This will now start as true from initialGameState
    gameOver,
    winner,
    // finalScores is no longer needed for direct UI rendering
  } = state;

  const aiTurnTimeoutRef = useRef(null);
  const gameOverTimeoutRef = useRef(null); // New ref for game over pause

  // Helper for logging hand sizes - adjusted for reducer state
  // const logHandSizes = useCallback((action, currentHandsState) => {
  //   const targetHands = currentHandsState || hands;
  //   const sizes = targetHands.map((hand, index) => `P${index + 1}: ${hand.length}`);
  //   console.log(`[HANDS DEBUG] ${action} - ${sizes.join(', ')}`);
  // }, [hands]);


  // --- Card Playability Check ---
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

  // --- Initial Game Setup Effect (runs once on component mount or on new game) ---
  useEffect(() => {
    // Only initialize if the game hasn't started yet or if we're explicitly starting a new game
    // The initialGameState.isAutoplaying is now true, so we initialize immediately
    if (hands.length === 0 && deck.length === 0 && !topCard) {
      dispatch({ type: 'INITIALIZE_GAME', payload: { isAutoplaying: true } }); // Start with autoplay on initial load
    }
    // Cleanup timeout if component unmounts
    return () => {
      if (aiTurnTimeoutRef.current) {
        clearTimeout(aiTurnTimeoutRef.current);
      }
      if (gameOverTimeoutRef.current) { // Clean up game over timeout too
        clearTimeout(gameOverTimeoutRef.current);
      }
    };
  }, [hands.length, deck.length, topCard, dispatch]); // dependencies for effect

  //--- Logging??
  useEffect(() => {
    if (!state.lastAction) return;

    const logEntry = formatTurnLog({
      ...state.lastAction,
      players: state.players,
    });

    dispatch({ type: 'LOG_TURN', payload: logEntry, formatTurnLog });
  }, [state.lastAction]);


  // --- AI Turn Effect (handles all AI players, including Player 0 if autoplaying) ---
  useEffect(() => {
    if (gameOver || currentPlayer === -1 || !hands.length) {
      if (aiTurnTimeoutRef.current) {
        clearTimeout(aiTurnTimeoutRef.current);
        aiTurnTimeoutRef.current = null;
      }
      return;
    }

    const isCurrentPlayerAI = (currentPlayer !== 0 || isAutoplaying); // Player 0 is AI if autoplaying

    if (isCurrentPlayerAI) {
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
          let chosenWildColor = null;
          if (aiCardToPlay.color === 'wild') {
            chosenWildColor = chooseWildColor(currentAiHand);
          }
          dispatch({ type: 'PLAY_CARD', payload: { card: aiCardToPlay, playerIndex: currentPlayer, chosenWildColor } });
        } else {
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
  }, [currentPlayer, hands, topCard, isAutoplaying, gameOver, playAI, chooseWildColor, dispatch]);


  // --- Game Over Auto-Restart Logic ---
  useEffect(() => {
    if (gameOver && isAutoplaying) {
      // Clear any pending AI turn timeouts
      if (aiTurnTimeoutRef.current) {
        clearTimeout(aiTurnTimeoutRef.current);
        aiTurnTimeoutRef.current = null;

      }
      // Clear any previous game over timeout
      if (gameOverTimeoutRef.current) {
        clearTimeout(gameOverTimeoutRef.current);
      }
      console.log("GAME OVER HERE, CREATE LOG")
      dispatch({
        type: 'GAME_OVER',
        payload: {
          winnerIndex: currentPlayer,
          //finalScores: calculateFinalScores(state),
          turnLog: state.turnLog,
        }
      });
      dispatch({ type: 'ADD_HISTORY', payload: `Game over! New game starting in 3 seconds...` });

      gameOverTimeoutRef.current = setTimeout(() => {
        dispatch({ type: 'INITIALIZE_GAME', payload: { isAutoplaying: true } }); // Reinitialize with autoplay still on
        dispatch({ type: 'UPDATE_MESSAGE', payload: "New game started automatically." }); // Update message for new game
      }, 3000); // 3-second pause

      return () => {
        if (gameOverTimeoutRef.current) {
          clearTimeout(gameOverTimeoutRef.current); // Cleanup on unmount or if dependencies change
        }
      };
    } else if (gameOver && !isAutoplaying) {
      // If game is over but autoplay is NOT active, ensure AI turn timeouts are clear
      if (aiTurnTimeoutRef.current) {
        clearTimeout(aiTurnTimeoutRef.current);
        aiTurnTimeoutRef.current = null;
      }
      // Also clear any game over restart timer if autoplay was stopped mid-restart
      if (gameOverTimeoutRef.current) {
        clearTimeout(gameOverTimeoutRef.current);
        gameOverTimeoutRef.current = null;
      }
    }
    return undefined;
  }, [gameOver, isAutoplaying, dispatch]);

  return (
    <div className="container mx-auto p-4">
      <Header />

      <div className="grid grid-cols-[1fr_auto] gap-4 p-6 bg-white rounded-b-3xl shadow-sm mb-4">
        {/* Player Buckets stacked vertically */}
        <div className="flex flex-col gap-4">
          {[0, 1, 2, 3].map(player => (
            <div
              key={player}
              className={`bg-[#fffdf7] p-4 rounded-2xl shadow-md border-2 border-[#e2dccc] ${currentPlayer === player && !gameOver && (!isAutoplaying || player === 0) ? 'border-indigo-500 ring-4 ring-indigo-200' : ''}`}
            >
              <div className="flex flex-col gap-2">
                <div className="font-semibold text-gray-800 text-left">
                  Player {player + 1}
                  {/* Indicate if current player is AI (only if autoplaying) */}
                  {currentPlayer === player && isAutoplaying && (
                    <span className="ml-2 text-sm text-gray-500">(AI)</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 justify-left" style={{ minHeight: '6rem' }}>
                  {hands[player]?.length > 0 ? (
                    hands[player].map((card, index) => (
                      <Card
                        key={index}
                        card={card}
                        onClick={() => {
                          // Only allow human player (player 0) to click if not in autoplay and not game over
                          if (player === 0 && !isAutoplaying && !gameOver) {
                            if (card.color === 'wild') {
                              let chosenColor = null;
                              while (!chosenColor || !colors.includes(chosenColor) || chosenColor.length === 0) { // Added check for empty string
                                chosenColor = prompt('Choose a color: red, blue, green, or yellow').toLowerCase();
                                if (!colors.includes(chosenColor)) {
                                  alert('Invalid color chosen. Please choose red, blue, green, or yellow.');
                                }
                              }
                              dispatch({ type: 'PLAY_CARD', payload: { card, playerIndex: 0, chosenWildColor: chosenColor } });
                            } else {
                              dispatch({ type: 'PLAY_CARD', payload: { card, playerIndex: 0 } });
                            }
                          }
                        }}
                        // Disable if not current player, or if autoplaying, or if game over, or if card is unplayable
                        isDisabled={
                          (player !== currentPlayer) || isAutoplaying || gameOver || (player === currentPlayer && !canPlayCardUI(card, topCard))
                        }
                        // Make clickable only if it's Player 0's turn, not autoplaying, not game over, and card is playable
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
                ${!isAutoplaying // If NOT autoplaying, make it green "Start Autoplay"
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'} // If autoplaying, make it red "Stop Autoplay"
                ${(gameOver && !isAutoplaying) ? 'opacity-50 cursor-not-allowed' : ''} // If game over AND not autoplaying, disable
                `}
              onClick={isAutoplaying ? handleStopAutoplay : handleStartAutoplay}
              disabled={!isAutoplaying && gameOver} // Disabled if not autoplaying and game is over (user should click Start New Game)
            >
              {isAutoplaying ? 'Stop Autoplay' : 'Start Autoplay'}
            </button>

            {/* Start New Game button */}
            {gameOver && ( // This button should always be available if game is over
              <button
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 text-lg font-semibold"
                onClick={handleStartNewGame}
              >
                Start New Game
              </button>
            )}
          </div>

          <div className="w-full md:w-96 bg-gray-100 p-6 rounded-lg shadow-lg max-h-[50vh] overflow-y-auto">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800 border-b pb-2">Game History</h2>
            <ul className="list-disc list-inside text-base text-gray-700 space-y-2">
              {history.map((entry, index) => (
                <li key={index} className="border-b border-gray-200 pb-1 last:border-b-0">{entry}</li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;