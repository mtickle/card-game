import { useEffect, useMemo, useState } from 'react';

const TurnLogTable = ({ gameId }) => {
    const [turns, setTurns] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState('All');

    useEffect(() => {
        const raw = localStorage.getItem('cardGameTurnLogs');
        if (!raw) return;
        const allLogs = JSON.parse(raw);
        const gameLog = allLogs?.[gameId] || [];
        setTurns(gameLog);
    }, [gameId]);

    const filteredTurns = useMemo(() => {
        if (selectedPlayer === 'All') {
            return turns;
        }
        return turns.filter(turn => turn.player === selectedPlayer);
    }, [turns, selectedPlayer]);

    // Determine the winner from the last turn in the full log
    const winner = useMemo(() => {
        return turns.length > 0 ? turns[turns.length - 1].player : null;
    }, [turns]);

    if (!turns.length) return <div className="text-gray-400 p-4">No turn log found for this game.</div>;

    const colorClassMap = {
        red: 'bg-red-600',
        blue: 'bg-blue-600',
        green: 'bg-green-600',
        yellow: 'bg-yellow-500 text-black',
        wild: 'bg-gradient-to-r from-purple-500 via-black to-red-500',
    };

    const getActionText = (turn, isWinningTurn) => {
        if (isWinningTurn) {
            return '🏆 Winning Play';
        }
        if (turn.type === 'PLAY') {
            if (turn.penalty) {
                return `Forces Draw ${turn.penalty.count}`;
            }
            return 'Played Card';
        }
        if (turn.type === 'DRAW_PLAY') {
            return 'Drew and Played';
        }
        if (turn.type === 'DRAW_PASS') {
            return 'Drew and Passed';
        }
        if (turn.type === 'DRAW_FAIL_PASS') {
            return 'Attempted Draw (Deck Empty)';
        }
        return 'Unknown Action';
    };

    const renderCardDetails = (turn) => {
        return (
            <div>
                {turn.card && (
                    <span
                        className={`inline-block px-2 py-1 text-sm font-medium rounded text-white ${colorClassMap[turn.card.color] || 'bg-gray-400'}`}
                    >
                        {turn.card.value}
                    </span>
                )}
                {turn.wildColorChoice && (
                    <span className="ml-2 text-sm">
                        (Chose <span className={`font-bold capitalize text-${turn.wildColorChoice}-600`}>{turn.wildColorChoice}</span>)
                    </span>
                )}
                {turn.penalty && (
                    <div className="mt-2 text-xs text-gray-600">
                        <span className="font-semibold">P{turn.penalty.penalizedPlayer + 1} drew:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {turn.penalty.cardsDrawn.map((c, i) => (
                                <span key={i} className={`inline-block px-1.5 py-0.5 text-xs font-medium rounded text-white ${colorClassMap[c.color] || 'bg-gray-400'}`}>
                                    {c.value}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const filterButtons = ['All', 'Player 1', 'Player 2', 'Player 3', 'Player 4'];

    return (
        <div className="p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Turn Log for Game ID:
                    <span className="font-mono text-base text-gray-600 ml-2">{gameId ? gameId.split('-')[0] : ''}</span>
                </h2>
                {/* Filter Buttons */}
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Filter by Player:</span>
                    {filterButtons.map(player => (
                        <button
                            key={player}
                            onClick={() => setSelectedPlayer(player)}
                            className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${selectedPlayer === player
                                ? 'bg-blue-600 text-white shadow'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            {player}
                        </button>
                    ))}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white shadow-md rounded-lg">
                    <thead className="bg-gray-200 text-gray-700">
                        <tr>
                            <th className="text-left px-4 py-3 w-16">Turn</th>
                            <th className="text-left px-4 py-3 w-24">Player</th>
                            <th className="text-left px-4 py-3 w-48">Action</th>
                            <th className="text-left px-4 py-3">Details</th>
                            <th className="text-left px-4 py-3">Hand Before Play</th>
                            <th className="text-left px-4 py-3 w-24">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredTurns.map((turn, i, arr) => {
                            // The winning turn is the last turn in the unfiltered array
                            const isWinningTurn = turn.turn === turns[turns.length - 1].turn;
                            return (
                                <tr key={i} className={`transition-colors ${isWinningTurn ? 'bg-green-100' : 'hover:bg-gray-50'}`}>
                                    <td className="px-4 py-3 font-medium text-gray-700">{turn.turn}</td>
                                    <td className="px-4 py-3">{turn.player}</td>
                                    <td className={`px-4 py-3 font-semibold ${isWinningTurn ? 'text-green-700' : 'text-gray-800'}`}>{getActionText(turn, isWinningTurn)}</td>
                                    <td className="px-4 py-3">{renderCardDetails(turn)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            {Array.isArray(turn.handBeforePlay) && turn.handBeforePlay.map((card, cardIndex) => (
                                                <span
                                                    key={cardIndex}
                                                    className={`inline-block px-1.5 py-0.5 text-xs font-medium rounded text-white ${colorClassMap[card.color] || 'bg-gray-400'}`}
                                                >
                                                    {card.value}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(turn.timestamp).toLocaleTimeString()}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Game Outcome Summary */}
            <div className="mt-6 p-4 bg-white rounded-lg shadow-md border-t-4 border-blue-600">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Game Outcome</h3>
                <ul className="space-y-2">
                    {filterButtons.slice(1).map(player => (
                        <li key={player} className="flex justify-between items-center py-2 border-b last:border-none">
                            <span className="font-medium text-gray-700">{player}</span>
                            {player === winner ? (
                                <span className="font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full text-sm">Winner</span>
                            ) : (
                                <span className="text-red-600 bg-red-100 px-3 py-1 rounded-full text-sm">Lost</span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default TurnLogTable;
