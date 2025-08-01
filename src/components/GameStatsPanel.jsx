import { useAuth0 } from '@auth0/auth0-react';
import {
    ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Title, Tooltip
} from 'chart.js';
import { useEffect, useMemo, useState } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';

// Import your API utility function
import { loadThingsFromDatabase } from '@utils/storageUtils';

// FIX: Register all the necessary Chart.js components
ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend
);

export default function GameStatsPanel({ refreshKey }) {
    const [allGames, setAllGames] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth0();

    useEffect(() => {
        // We can still keep the auth check to ensure only logged-in users can see stats
        if (isAuthLoading || !isAuthenticated) {
            return;
        }

        const fetchGameData = async () => {
            setIsLoading(true);
            // const username = user?.nickname || 'anonymous'; // Kept for future reference

            // Refactored to fetch all games without a username parameter
            const games = await loadThingsFromDatabase('getAllGameResults');

            setAllGames(Array.isArray(games) ? games : []);
            setIsLoading(false);
        };

        fetchGameData();
    }, [refreshKey, isAuthenticated, isAuthLoading]); // Removed user from dependency array

    const stats = useMemo(() => {
        if (!allGames || allGames.length === 0) {
            return null;
        }

        // --- 1. Summary Stats ---
        const gamesPlayed = allGames.length;
        const playerWins = { 'Player 1': 0, 'Player 2': 0, 'Player 3': 0, 'Player 4': 0 };
        allGames.forEach(game => {
            if (playerWins[game.winner] !== undefined) {
                playerWins[game.winner]++;
            }
        });

        // --- 2. Card Type Distribution ---
        const cardTypeCounts = {
            'Number': 0, 'Skip': 0, 'Reverse': 0, 'Draw Two': 0, 'Wild': 0, 'Wild Draw Four': 0
        };
        allGames.forEach(game => {
            if (Array.isArray(game.turnHistory)) {
                game.turnHistory.forEach(turn => {
                    if (turn.type === 'PLAY' && turn.card) {
                        const value = turn.card.value;
                        if (!isNaN(parseInt(value))) {
                            cardTypeCounts['Number']++;
                        } else if (cardTypeCounts[value] !== undefined) {
                            cardTypeCounts[value]++;
                        }
                    }
                });
            }
        });

        const cardTypeData = {
            labels: Object.keys(cardTypeCounts),
            datasets: [{
                label: 'Times Played',
                data: Object.values(cardTypeCounts),
                backgroundColor: ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#6366F1', '#8B5CF6'],
                borderColor: '#1F2937',
                borderWidth: 1,
            }]
        };

        // --- 3. Player Win Rate ---
        const playerWinData = {
            labels: Object.keys(playerWins),
            datasets: [{
                data: Object.values(playerWins),
                backgroundColor: ['#3B82F6', '#10B981', '#EF4444', '#F59E0B'],
                hoverOffset: 4,
            }]
        };

        // --- 4. Average Game Length ---
        const gameLengths = allGames.map(game => Array.isArray(game.turnHistory) ? game.turnHistory.length : 0);
        const avgGameLength = gameLengths.reduce((a, b) => a + b, 0) / gamesPlayed;

        const gameLengthData = {
            labels: allGames.slice(-30).map((g, i) => `Game ${gamesPlayed - Math.min(30, gamesPlayed) + i + 1}`),
            datasets: [{
                label: 'Number of Turns',
                data: gameLengths.slice(-30),
                borderColor: '#2563eb',
                backgroundColor: '#2563eb',
                tension: 0.1,
            }]
        };

        return {
            gamesPlayed,
            playerWins,
            cardTypeData,
            playerWinData,
            gameLengthData,
            avgGameLength: avgGameLength.toFixed(1),
        };
    }, [allGames]);

    if (isAuthLoading) {
        return <div className="bg-gray-50 px-4 py-3 text-gray-500">Authenticating...</div>;
    }

    if (!isAuthenticated) {
        return <div className="bg-gray-50 px-4 py-3 text-gray-500">Please log in to view your game statistics.</div>;
    }

    if (isLoading) {
        return <div className="bg-gray-50 px-4 py-3 text-gray-500">Loading statistics from the database...</div>;
    }

    if (!stats) {
        return <div className="bg-gray-50 px-4 py-3 text-gray-500">No game data found. Play a game to see statistics.</div>;
    }

    return (
        <div className="space-y-6 p-6">
            {/* Summary Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div className="bg-[#fffdf7] p-6 rounded-2xl shadow-md border-2 border-[#e2dccc]">
                    <div className="text-4xl font-bold text-gray-800">{stats.gamesPlayed}</div>
                    <div className="text-sm text-gray-600 mt-2">Games Played</div>
                </div>
                {Object.entries(stats.playerWins).map(([player, wins]) => (
                    <div key={player} className="bg-[#fffdf7] p-6 rounded-2xl shadow-md border-2 border-[#e2dccc]">
                        <div className="text-4xl font-bold text-gray-800">{wins}</div>
                        <div className="text-sm text-gray-600 mt-2">{player} Wins</div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="w-full bg-[#fffdf7] p-6 rounded-2xl shadow-md border-2 border-[#e2dccc]">
                    <h3 className="text-lg font-medium text-gray-700 mb-4">Player Win Distribution</h3>
                    <div className="w-full h-[250px] flex justify-center p-2">
                        <Pie data={stats.playerWinData} options={{ responsive: true, maintainAspectRatio: false }} />
                    </div>
                </div>
                <div className="w-full bg-[#fffdf7] p-6 rounded-2xl shadow-md border-2 border-[#e2dccc]">
                    <h3 className="text-lg font-medium text-gray-700 mb-4">Card Types Played</h3>
                    <div className="w-full h-[250px] p-2">
                        <Bar data={stats.cardTypeData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                    </div>
                </div>
            </div>
            <div className="w-full bg-[#fffdf7] p-6 rounded-2xl shadow-md border-2 border-[#e2dccc]">
                <h3 className="text-lg font-medium text-gray-700 mb-4">Game Length (Last 30 Games)</h3>
                <div className="w-full h-[250px] p-2">
                    <Line data={stats.gameLengthData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
            </div>
        </div>
    );
}
