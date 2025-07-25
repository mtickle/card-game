import { useEffect, useState } from 'react';

const TurnLogTable = ({ gameId }) => {
    const [turns, setTurns] = useState([]);

    useEffect(() => {
        const raw = localStorage.getItem('unoTurnLogs');
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
        yellow: 'bg-yellow-500',
        wild: 'bg-gradient-to-r from-purple-500 via-black to-red-500',
    };

    return (
        <div className="overflow-x-auto p-4">
            <h2 className="text-xl font-bold mb-4">Turn Log for Game {gameId}</h2>
            <table className="min-w-full bg-white shadow rounded-lg">
                <thead className="bg-gray-100 text-gray-700">
                    <tr>
                        <th className="text-left px-4 py-2">Player</th>
                        <th className="text-left px-4 py-2">Action</th>
                        <th className="text-left px-4 py-2">Actual Card</th>
                        <th className="text-left px-4 py-2">Time</th>
                    </tr>
                </thead>
                <tbody>
                    {turns.map((turn, i) => (
                        <tr key={i} className="border-t border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-2">{turn.player}</td>
                            <td className="px-4 py-2">{turn.action}</td>
                            <td className="px-4 py-2">
                                {turn.card ? (
                                    <span
                                        className={`inline-block px-2 py-1 text-sm font-medium rounded text-white ${colorClassMap[turn.card.color] || 'bg-gray-400'
                                            }`}
                                    >
                                        {turn.card.value}
                                    </span>
                                ) : (
                                    '-'
                                )}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">{new Date(turn.timestamp).toLocaleTimeString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TurnLogTable;
