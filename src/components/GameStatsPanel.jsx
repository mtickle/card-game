import { useAuth0 } from '@auth0/auth0-react';
import {
    ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Title, Tooltip
} from 'chart.js';
import { useEffect, useMemo, useState } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';

// Import your API utility function
import { loadThingsFromDatabase } from '@utils/storageUtils';

// Register all the necessary Chart.js components
ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend
);

export default function GameStatsPanel({ refreshKey }) {
    const [allGames, setAllGames] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth0();
    // NEW: State to trigger a manual refresh
    const [refreshCounter, setRefreshCounter] = useState(0);

    useEffect(() => {
        if (isAuthLoading || !isAuthenticated) {
            return;
        }

        const fetchGameData = async () => {
            setIsLoading(true);
            const games = await loadThingsFromDatabase('getAllCardGames');
            setAllGames(Array.isArray(games) ? games : []);
            setIsLoading(false);
        };

        fetchGameData();
        // The effect now runs automatically on game end (via refreshKey) OR on manual click
    }, [refreshKey, refreshCounter, isAuthenticated, isAuthLoading]);

    const stats = useMemo(() => {
        if (!allGames || allGames.length === 0) {
            return null;
        }

        // --- Summary Stats Logic ---
        const scores = allGames
            .map(g => Array.isArray(g.finalScores) ? g.finalScores.reduce((a, b) => a + b, 0) : 0)
            .filter(score => typeof score === 'number' && isFinite(score));

        const gamesPlayed = scores.length;
        const lowestScore = gamesPlayed > 0 ? Math.min(...scores) : 0;
        const highestScore = gamesPlayed > 0 ? Math.max(...scores) : 0;
        const averageScore = gamesPlayed > 0
            ? scores.reduce((a, b) => a + b, 0) / gamesPlayed
            : 0;

        const summaryStats = {
            gamesPlayed,
            lowestScore,
            highestScore,
            averageScore: Number(averageScore.toFixed(1)),
        };

        // --- Other stat calculations (no change) ---
        const playerWins = { 'Player 1': 0, 'Player 2': 0, 'Player 3': 0, 'Player 4': 0 };
        allGames.forEach(game => {
            if (playerWins[game.winner] !== undefined) {
                playerWins[game.winner]++;
            }
        });

        const allCardValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', 'Draw Two', 'Wild', 'Wild Draw Four'];
        const cardTypeCounts = allCardValues.reduce((acc, value) => {
            acc[value] = 0;
            return acc;
        }, {});

        allGames.forEach(game => {
            if (Array.isArray(game.turnHistory)) {
                game.turnHistory.forEach(turn => {
                    if (turn.type === 'PLAY' && turn.card) {
                        const value = turn.card.value;
                        if (cardTypeCounts[value] !== undefined) {
                            cardTypeCounts[value]++;
                        }
                    }
                });
            }
        });

        const playedCardLabels = Object.keys(cardTypeCounts).filter(key => cardTypeCounts[key] > 0);
        const playedCardData = playedCardLabels.map(label => cardTypeCounts[label]);

        const cardTypeData = {
            labels: playedCardLabels,
            datasets: [{
                label: 'Times Played',
                data: playedCardData,
                backgroundColor: ['#3B82F6', '#2563EB', '#1D4ED8', '#1E3A8A', '#172554', '#EF4444', '#F59E0B', '#10B981', '#6366F1', '#8B5CF6'],
                borderColor: '#1F2937',
                borderWidth: 1,
            }]
        };

        const playerWinData = {
            labels: Object.keys(playerWins),
            datasets: [{
                data: Object.values(playerWins),
                backgroundColor: ['#3B82F6', '#10B981', '#EF4444', '#F59E0B'],
                hoverOffset: 4,
            }]
        };

        const gameLengths = allGames.map(game => Array.isArray(game.turnHistory) ? game.turnHistory.length : 0);

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
            summaryStats,
            playerWins,
            cardTypeData,
            playerWinData,
            gameLengthData,
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
        <div className="mb-4 border border-gray-200 bg-white shadow-sm rounded-t-2xl rounded-b-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-4 shadow-md flex justify-between items-center rounded-t-2xl">
                <h3 className="text-1xl font-semibold tracking-tight">📊 Game Statistics</h3>
                {/* NEW: Manual Refresh Button */}
                <button
                    onClick={() => setRefreshCounter(c => c + 1)}
                    className="bg-white text-blue-700 px-3 py-1 rounded-lg text-sm font-medium shadow hover:bg-blue-50 transition"
                >
                    🔁 Refresh Data
                </button>
            </div>
            <div className="space-y-6 p-6">
                {/* Summary Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <div className="bg-[#fffdf7] p-6 rounded-2xl shadow-md border-2 border-[#e2dccc]">
                        <div className="text-4xl font-bold text-gray-800">{stats.summaryStats.gamesPlayed}</div>
                        <div className="text-sm text-gray-600 mt-2">Games Played</div>
                    </div>
                    <div className="bg-[#fffdf7] p-6 rounded-2xl shadow-md border-2 border-[#e2dccc]">
                        <div className="text-4xl font-bold text-gray-800">{stats.summaryStats.lowestScore}</div>
                        <div className="text-sm text-gray-600 mt-2">Lowest Score</div>
                    </div>
                    <div className="bg-[#fffdf7] p-6 rounded-2xl shadow-md border-2 border-[#e2dccc]">
                        <div className="text-4xl font-bold text-gray-800">{stats.summaryStats.highestScore}</div>
                        <div className="text-sm text-gray-600 mt-2">Highest Score</div>
                    </div>
                    <div className="bg-[#fffdf7] p-6 rounded-2xl shadow-md border-2 border-[#e2dccc]">
                        <div className="text-4xl font-bold text-gray-800">{stats.summaryStats.averageScore}</div>
                        <div className="text-sm text-gray-600 mt-2">Average Score</div>
                    </div>
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
        </div>
    );
}
