import Header from '@layouts/Header';
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

    // console.log('Initial setup completed.');
    // console.log('Player Hands:', initialHands);
    // console.log('Initial Top Card:', startingTopCard);

    return () => {
      if (aiTurnTimeoutRef.current) {
        clearTimeout(aiTurnTimeoutRef.current);
      }
    };
  }, []);



  //--- This is supposed to do something but I'm not sure what.
  const startNewGame = useCallback(() => {
    const newDeck = shuffleDeck();
    const newHands = dealCards(newDeck);
    const startingCard = drawInitialPlayableCard(newDeck); // however you select the first top card

    setHands(newHands);
    setDeck(newDeck);
    setTopCard(startingCard);
    setCurrentPlayer(0);
    setWinner(null);
    setFinalScores([]);
    setHistory([]);
  }, []);



  //--- GAME OVER
  useEffect(() => {
    const winnerIndex = hands.findIndex(hand => hand.length === 0);

    if (winnerIndex !== -1 && !gameOver) {
      console.log("game over")
      const scores = calculateGameScore(hands, winnerIndex);
      setWinner(winnerIndex);
      setFinalScores(scores);
      setGameOver(true);

      const timer = setTimeout(() => {
        startNewGame();
        setGameOver(false);
      }, 3000);

      return () => clearTimeout(timer); // cleanup if component unmounts
    }
  }, [hands, gameOver, startNewGame]);


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
    //console.log(`AI Player ${playerIndex + 1} evaluating hand:`, hand, 'Top card:', currentTopCard);
    // Prioritize non-wild cards that match
    for (let card of hand) {
      if (card.color !== 'wild' && canPlayCard(card, currentTopCard)) {
        //  console.log(`AI Player ${playerIndex + 1} selects card (non-wild):`, card);
        return card;
      }
    }
    // If no non-wild cards, play a wild if possible
    for (let card of hand) {
      if (card.color === 'wild') {
        //console.log(`AI Player ${playerIndex + 1} selects card (wild):`, card);
        return card;
      }
    }
    //console.log(`AI Player ${playerIndex + 1} cannot play, will draw a card.`);
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
    //console.log(`Player ${playerIndex + 1} attempting to play card:`, card);

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
      //console.log("Autoplay is active, AI will handle Player 1's draw.");
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

  useEffect(() => {
    if (!isAutoplaying) {
      handleStartAutoplay();
    }
  }, []);

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
        //console.log(`AI Player ${currentPlayer + 1}'s turn logic initiated.`);
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
    <div className="container mx-auto p-4">
      <Header />

      <div className="grid grid-cols-[1fr_auto] gap-4 p-6 bg-white rounded-b-3xl shadow-sm mb-4">
        {/* Player Buckets stacked vertically */}
        <div className="flex flex-col gap-4">
          {[0, 1, 2, 3].map(player => (
            <div
              key={player}
              className="bg-[#fffdf7] p-4 rounded-2xl shadow-md border-2 border-[#e2dccc]"
            >
              <div className="flex flex-col gap-2">
                <div className="font-semibold text-gray-800 text-left">Player {player + 1}</div>

                <div className="flex flex-wrap gap-1 justify-center">
                  {hands[player]?.length > 0 ? (
                    hands[player].map((card, index) => (
                      <div
                        key={index}
                        className={`w-14 h-20 rounded-xl shadow-md flex items-center justify-center border-4 text-lg font-bold bg-white
                    ${card.color === 'red' ? 'border-red-500 text-red-600' :
                            card.color === 'blue' ? 'border-blue-500 text-blue-600' :
                              card.color === 'green' ? 'border-green-500 text-green-600' :
                                card.color === 'yellow' ? 'border-yellow-500 text-yellow-600' : 'border-gray-500 text-gray-600'}`}
                      >
                        {card.value === 'Wild' || card.value === 'Wild Draw Four' ? 'W' : card.value}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No cards.</p>
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
              className={`w-24 h-36 rounded-xl shadow-md flex items-center justify-center border-4 text-4xl font-extrabold bg-white
          ${topCard.color === 'red' ? 'border-red-500 text-red-600' :
                  topCard.color === 'blue' ? 'border-blue-500 text-blue-600' :
                    topCard.color === 'green' ? 'border-green-500 text-green-600' :
                      topCard.color === 'yellow' ? 'border-yellow-500 text-yellow-600' : 'border-gray-500 text-gray-600'}`}
            >
              {topCard.value === 'Wild' || topCard.value === 'Wild Draw Four' ? 'W' : topCard.value}
            </div>
          )}

          {/* Autoplay Controls */}
          <div className="flex justify-center gap-4 mb-6">
            <button
              className={`px-6 py-3 rounded-lg text-white text-lg font-semibold transition-colors duration-200
      ${isAutoplaying
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'}
      ${currentPlayer === -1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={isAutoplaying ? handleStopAutoplay : handleStartAutoplay}
              disabled={currentPlayer === -1} // Only disable if game over
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