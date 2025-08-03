import { useAuth0 } from '@auth0/auth0-react';
import Header from '@layouts/Header';
import { colors } from '@utils/colorUtils';
import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import GameStatsPanel from './components/GameStatsPanel';
import TurnLogTable from './components/TurnLogTable';

// Import the actions from your game slice
import { drawCard, initializeGame, playCard, setAutoplay } from '@features/gameSlice';

import Card, { getCardIcon, WinnerCard } from '@components/Card';
import { useLastGameId } from '@hooks/useLastGameId';

// A map to define the point value of each card for strategic sorting
const cardValueMap = {
  'Wild Draw Four': 50,
  'Wild': 50,
  'Draw Two': 20,
  'Reverse': 20,
  'Skip': 20,
  '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2, '1': 1, '0': 0
};

function App() {
  const { user } = useAuth0();
  const state = useSelector((state) => state.game);
  const dispatch = useDispatch();

  const {
    gameId,
    deck,
    hands,
    topCard,
    currentPlayer,
    gameMessage,
    isAutoplaying,
    gameOver,
    winner,
  } = state;

  const [lastFinishedGameId, setLastFinishedGameId] = useLastGameId();
  const aiTurnTimeoutRef = useRef(null);
  const gameOverTimeoutRef = useRef(null);

  const canPlayCardUI = useCallback((card, currentTopCard) => {
    if (!card || !currentTopCard) return false;
    if (card.color === 'wild') return true;
    return card.color === currentTopCard.color || card.value === currentTopCard.value;
  }, []);

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

  // --- UPDATED AI Logic with Sorting Strategy ---
  const playAI = useCallback((hand, currentTopCard) => {
    const sortedHand = [...hand];
    // Sort the hand from highest point value to lowest
    sortedHand.sort((a, b) => cardValueMap[b.value] - cardValueMap[a.value]);

    // Find the first playable card in the strategically sorted hand
    for (let card of sortedHand) {
      if (canPlayCardUI(card, currentTopCard)) {
        return card;
      }
    }
    return null; // No playable card found
  }, [canPlayCardUI]);

  // --- Effect Hooks ---
  useEffect(() => {
    if (hands && hands.length === 0 && deck.length === 0 && !topCard) {
      dispatch(initializeGame({ isAutoplaying: false }));
    }
    return () => {
      if (aiTurnTimeoutRef.current) clearTimeout(aiTurnTimeoutRef.current);
      if (gameOverTimeoutRef.current) clearTimeout(gameOverTimeoutRef.current);
    };
  }, [hands, deck, topCard, dispatch]);

  useEffect(() => {
    if (gameOver || currentPlayer === -1 || !hands || hands.length === 0) {
      if (aiTurnTimeoutRef.current) clearTimeout(aiTurnTimeoutRef.current);
      return;
    }
    // AI turn logic now applies to players 1, 2, 3, and player 0 if autoplay is on
    const isCurrentPlayerAI = (currentPlayer !== 0 || isAutoplaying);
    if (isCurrentPlayerAI) {
      if (aiTurnTimeoutRef.current) clearTimeout(aiTurnTimeoutRef.current);
      aiTurnTimeoutRef.current = setTimeout(() => {
        const currentAiHand = hands[currentPlayer];
        const aiCardToPlay = playAI(currentAiHand, topCard);

        if (aiCardToPlay) {
          let chosenWildColor = null;
          if (aiCardToPlay.color === 'wild') {
            chosenWildColor = chooseWildColor(currentAiHand);
          }
          dispatch(playCard({ card: aiCardToPlay, playerIndex: currentPlayer, chosenWildColor, user }));
        } else {
          dispatch(drawCard({ playerIndex: currentPlayer, user }));
        }
      }, isAutoplaying ? 200 : 1500);
      return () => { if (aiTurnTimeoutRef.current) clearTimeout(aiTurnTimeoutRef.current) };
    }
  }, [currentPlayer, hands, topCard, isAutoplaying, gameOver, playAI, chooseWildColor, dispatch, user]);

  useEffect(() => {
    if (gameOver && isAutoplaying) {
      if (aiTurnTimeoutRef.current) clearTimeout(aiTurnTimeoutRef.current);
      if (gameOverTimeoutRef.current) clearTimeout(gameOverTimeoutRef.current);
      gameOverTimeoutRef.current = setTimeout(() => {
        dispatch(initializeGame({ isAutoplaying: true }));
      }, 3000);
      return () => { if (gameOverTimeoutRef.current) clearTimeout(gameOverTimeoutRef.current) };
    }
  }, [gameOver, isAutoplaying, dispatch]);

  useEffect(() => {
    if (gameOver && gameId) {
      setLastFinishedGameId(gameId);
    }
  }, [gameOver, gameId, setLastFinishedGameId]);

  function getColorClass(color, type = 'card') {
    const colorMap = {
      red: { card: 'bg-red-500 text-white', border: 'border-red-700' },
      blue: { card: 'bg-blue-500 text-white', border: 'border-blue-700' },
      green: { card: 'bg-green-500 text-white', border: 'border-green-700' },
      yellow: { card: 'bg-yellow-400 text-black', border: 'border-yellow-600' },
      wild: { card: 'bg-gradient-to-r from-purple-500 via-black to-red-500 text-white', border: 'border-gray-700' },
    };
    return colorMap[color]?.[type] || 'bg-gray-300 text-black';
  }

  return (
    <div className="container mx-auto p-4">
      <Header />

      <div className="grid grid-cols-[1fr_auto] gap-4 p-6 bg-white rounded-b-3xl shadow-sm mb-4">
        {/* Player Buckets */}
        <div className="flex flex-col gap-4">
          {hands && [0, 1, 2, 3].map(player => (
            <div
              key={player}
              className={`bg-[#fffdf7] p-4 rounded-2xl shadow-md border-2 border-[#e2dccc] ${currentPlayer === player && !gameOver ? 'border-indigo-500 ring-4 ring-indigo-200' : ''}`}
            >
              <div className="flex flex-col gap-2">
                <div className="font-semibold text-gray-800 text-left">
                  Player {player + 1}
                  {currentPlayer === player && isAutoplaying && player !== 0 && (
                    <span className="ml-2 text-sm text-gray-500">(AI)</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 justify-left" style={{ minHeight: '4rem' }}>
                  {hands[player]?.length > 0 ? (
                    hands[player].map((card, index) => (
                      <Card
                        key={index}
                        card={card}
                        onClick={() => {
                          if (player === 0 && !isAutoplaying && !gameOver && currentPlayer === 0) {
                            if (card.color === 'wild') {
                              const chosenColor = prompt('Choose a color: red, blue, green, or yellow')?.toLowerCase();
                              if (chosenColor && colors.includes(chosenColor)) {
                                dispatch(playCard({ card, playerIndex: 0, chosenWildColor, user }));
                              }
                            } else {
                              dispatch(playCard({ card, playerIndex: 0, user }));
                            }
                          }
                        }}
                        isDisabled={(player !== currentPlayer) || (player === 0 && isAutoplaying) || gameOver || !canPlayCardUI(card, topCard)}
                        isClickable={player === 0 && !isAutoplaying && currentPlayer === 0 && !gameOver && canPlayCardUI(card, topCard)}
                      />
                    ))
                  ) : (
                    <WinnerCard />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Control Panel */}
        <div className="bg-[#fffdf7] p-4 rounded-2xl shadow-md border-2 border-[#e2dccc] flex flex-col items-center justify-start gap-4">
          <div className="font-semibold text-gray-800 text-lg">Top Card</div>
          {topCard && (
            <div
              className={`w-24 h-36 rounded-xl shadow-md flex items-center justify-center text-4xl font-extrabold ${getColorClass(topCard.color, 'card')} border-4 ${getColorClass(topCard.color, 'border')}`}
            >
              {getCardIcon(topCard.value)}
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center gap-4 mb-6">
            <button
              className={`px-6 py-3 rounded-lg text-white text-lg font-semibold transition-colors duration-200 ${!isAutoplaying ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} ${(gameOver && !isAutoplaying) ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => dispatch(setAutoplay(!isAutoplaying))}
              disabled={gameOver && !isAutoplaying}
            >
              {isAutoplaying ? 'Stop Autoplay' : 'Start Autoplay'}
            </button>
            {gameOver && (
              <button
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 text-lg font-semibold"
                onClick={() => dispatch(initializeGame({ isAutoplaying: false }))}
              >
                Start New Game
              </button>
            )}
          </div>

          <div className="w-full md:w-120 bg-gray-100 p-6 rounded-lg shadow-lg max-h-[40vh] overflow-y-auto">
            <h3 className="text-1xl font-semibold mb-4 text-gray-800 border-b pb-2">Game Message</h3>
            <p className="text-gray-700">{gameMessage}</p>
          </div>
        </div>
      </div>

      {/* Game Statistics and Turn Log */}
      <div className="mb-4 border border-gray-200 bg-white shadow-sm rounded-t-2xl rounded-b-2xl overflow-hidden">
        <GameStatsPanel refreshKey={lastFinishedGameId} />
        {lastFinishedGameId && <TurnLogTable gameId={lastFinishedGameId} />}
      </div>
    </div>
  );
}

export default App;
