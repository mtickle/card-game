import { useEffect, useState } from 'react';

const TurnLogTable = ({ gameId }) => {
    const [turns, setTurns] = useState([]);

    useEffect(() => {
        const raw = localStorage.getItem('cardGameTurnLogs');
        if (!raw) return;
        const allLogs = JSON.parse(raw);
        const gameLog = allLogs?.[gameId] || [];
        setTurns(gameLog);
    }, [gameId]);

    if (!turns.length) return <div className="text-gray-400 p-4">No turn log found for this game.</div>;

    const colorClassMap = {
        red: 'bg-red-600',
        blue: 'bg-blue-600',
        green: 'bg-green-600',
        yellow: 'bg-yellow-500 text-black',
        wild: 'bg-gradient-to-r from-purple-500 via-black to-red-500',
    };

    const getActionText = (turn) => {
        if (turn.type === 'PLAY') {
            if (turn.penalty) {
                return `Forces Draw ${turn.penalty.count}`;
            }
            return 'Played Card';
        }
        if (turn.type === 'DRAW_PASS') {
            return 'Drew and Passed';
        }
        return turn.action || 'Unknown Action'; // Fallback
    };

    const renderCardDetails = (turn) => {
        return (
            <div>
                {/* Main card associated with the action */}
                {turn.card && (
                    <span
                        className={`inline-block px-2 py-1 text-sm font-medium rounded text-white ${colorClassMap[turn.card.color] || 'bg-gray-400'}`}
                    >
                        {turn.card.value}
                    </span>
                )}
                {/* Details for a wild card choice */}
                {turn.wildColorChoice && (
                    <span className="ml-2 text-sm">
                        (Chose <span className={`font-bold capitalize text-${turn.wildColorChoice}-600`}>{turn.wildColorChoice}</span>)
                    </span>
                )}
                {/* Details for a penalty */}
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

    return (
        <div className="overflow-x-auto p-4 bg-gray-50">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Turn Log for Game ID: <span className="font-mono text-base text-gray-600">{gameId}</span></h2>
            <table className="min-w-full bg-white shadow-md rounded-lg">
                <thead className="bg-gray-200 text-gray-700">
                    <tr>
                        <th className="text-left px-4 py-3 w-16">Turn</th>
                        <th className="text-left px-4 py-3 w-24">Player</th>
                        <th className="text-left px-4 py-3 w-48">Action</th>
                        <th className="text-left px-4 py-3">Details</th>
                        <th className="text-left px-4 py-3 w-24">Time</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {turns.map((turn, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-700">{turn.turn}</td>
                            <td className="px-4 py-3">{turn.player}</td>
                            <td className="px-4 py-3 font-semibold text-gray-800">{getActionText(turn)}</td>
                            <td className="px-4 py-3">{renderCardDetails(turn)}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{new Date(turn.timestamp).toLocaleTimeString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TurnLogTable;