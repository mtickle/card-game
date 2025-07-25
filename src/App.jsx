// src/App.jsx
import TurnLogTable from '@components/TurnLogTable';
import Header from '@layouts/Header';
import { colors } from '@utils/colorUtils';
import { gameReducer, initialGameState } from '@utils/gameReducer';
import { formatTurnLog } from '@utils/gameUtils';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import Card, { getCardIcon, WinnerCard } from './components/Card';
import { useLastGameId } from './hooks/useLastGameId';
import { handleStartAutoplay, handleStartNewGame, handleStopAutoplay } from './utils/handleUtils';

function App() {

  const [lastFinishedGameId, setLastFinishedGameId] = useLastGameId();
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

  useEffect(() => {
    if (state.gameOver && state.gameId) {
      setLastFinishedGameId(state.gameId);
    }
  }, [state.gameOver, state.gameId]);

  function getColorClass(color, type = 'card') {
    const colors = {
      red: {
        card: 'bg-red-500 text-white',
        border: 'border-red-700',
      },
      blue: {
        card: 'bg-blue-500 text-white',
        border: 'border-blue-700',
      },
      green: {
        card: 'bg-green-500 text-white',
        border: 'border-green-700',
      },
      yellow: {
        card: 'bg-yellow-400 text-black',
        border: 'border-yellow-600',
      },
      wild: {
        card: 'bg-gradient-to-r from-purple-500 via-black to-red-500 text-white',
        border: 'border-gray-700',
      },
    };

    const fallback = {
      card: 'bg-gray-300 text-black',
      border: 'border-gray-500',
    };

    return colors[color]?.[type] || fallback[type];
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
    ${!isAutoplaying
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'}
    ${(gameOver && !isAutoplaying) ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() =>
                isAutoplaying
                  ? handleStopAutoplay({
                    dispatch,
                    currentPlayer,
                    aiTurnTimeoutRef,
                    gameOverTimeoutRef,
                    hands,
                  })
                  : handleStartAutoplay({
                    dispatch,
                    currentPlayer,
                    isAutoplaying,
                  })
              }
              disabled={!isAutoplaying && gameOver}
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

          <div className="w-full md:w-120 bg-gray-100 p-6 rounded-lg shadow-lg max-h-[40vh] overflow-y-auto">
            <h3 className="text-1xl font-semibold mb-4 text-gray-800 border-b pb-2">Game History</h3>
            <ul className="list-none text-base text-gray-700 space-y-2 text-1xl">
              {history.map((entry, index) => {
                const playedMatch = entry.match(/(P\d) played (\w+) (\w+)/);
                const drewMatch = entry.match(/(P\d) drew a (\w+) (\w+) card/);
                const skipMatch = entry.match(/(P\d) was skipped/);
                const reverseMatch = entry.match(/Play direction reversed/);
                const stopMatch = entry.match(/Autoplay stopped./);
                const startMatch = entry.match(/Autoplay started./);
                const drawMatch = entry.match(/(P\d) had to draw (\d)/);                
                const passMatch = entry.match(/(P\d) passed/);
                const wildDraw4Match = entry.match(/(P\d) Wild Draw Four/);

                if (playedMatch) {
                  const [, player, color, value] = playedMatch;
                  return (
                    <li key={index}>
                      🎯 <span className="font-semibold text-gray-600">{player}</span> played{' '}
                      <span className={`inline-block px-2 py-1 text-sm rounded-full font-bold shadow ${getColorClass(color, 'card')}`}>
                        {value}
                      </span>
                    </li>
                  );
                } else if (drewMatch) {
                  const [, player, color, value] = drewMatch;
                  return (
                    <li key={index}>
                      🃏 <span className="font-semibold text-gray-600">{player}</span> drew{' '}
                      <span className={`inline-block px-2 py-1 text-sm rounded-full font-bold shadow ${getColorClass(color, 'card')}`}>
                        {value}
                      </span>{' '}
                      and passed
                    </li>
                  );
                } else if (stopMatch) {
                  return (
                    <li key={index}>
                      🛑 Autoplay was stopped.
                    </li>
                  );
                } else if (startMatch) {
                  return (
                    <li key={index}>
                      ✅ Autoplay was started.
                    </li>
                  );
                } else if (skipMatch) {
                  const [, player] = skipMatch;
                  return (
                    <li key={index}>
                      ⏭️ <span className="font-semibold text-gray-600">{player}</span> was <span className="text-red-500 font-bold">skipped</span>
                    </li>
                  );
                } else if (wildDraw4Match) {
                  const [, player] = skipMatch;
                  return (
                    <li key={index}>
                      ⏭️ <span className="font-semibold text-gray-600">{player}</span> was <span className="text-red-500 font-bold">WILLLDD</span>
                    </li>
                  );
                } else if (reverseMatch) {
                  return (
                    <li key={index}>
                      🔁 <span className="text-blue-700 font-bold">Play direction reversed</span>
                    </li>
                  );
                } else if (drawMatch) {
                  const [, player, count] = drawMatch;
                  return (
                    <li key={index}>
                      ➕<span className="text-red-600 font-bold">{count}</span> <span className="font-semibold text-gray-600">{player}</span> drew <span className="text-red-600 font-bold">{count} cards</span>
                    </li>
                  );
                } else {
                  const wildChoiceMatch = entry.match(/(P\d) played Wild and chose (\w+)/);
                  if (wildChoiceMatch) {
                    const [, player, color] = wildChoiceMatch;
                    return (
                      <li key={index}>
                        🌈 <span className="font-semibold text-gray-600">{player}</span> played{' '}
                        <span className="font-bold text-purple-700">Wild</span> and chose{' '}
                        <span className={`inline-block px-2 py-1 text-sm rounded-full font-bold shadow ${getColorClass(color, 'card')}`}>
                          {color}
                        </span>
                      </li>
                    );
                  } else if (passMatch) {
                    const [, player] = passMatch;
                    return (
                      <li key={index}>
                        🚫 <span className="font-semibold text-gray-600">{player}</span> passed
                      </li>
                    );
                  } else {
                    // fallback: raw string
                    return <li key={index}>{entry}</li>;
                  }
                }
              })}


            </ul>
          </div>


        </div>
      </div>

      <div className="mb-4 border border-gray-200 bg-white shadow-sm rounded-t-2xl rounded-b-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-4 shadow-md flex justify-between items-center rounded-t-2xl">
          <h3 className="text-1xl font-semibold tracking-tight">📊 Game Statistics</h3>
        </div>{lastFinishedGameId && <TurnLogTable gameId={lastFinishedGameId} />}
      </div>

    </div>
  );
}

export default App;