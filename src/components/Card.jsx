// src/components/Card.jsx
import { Palette, Plus, SkipForward, Undo2 } from 'lucide-react';

// Add a simple "WinnerCard" component or integrate its styles directly
export const WinnerCard = () => (
    <div
        className="w-14 h-20 rounded-xl shadow-md flex items-center justify-center text-5xl font-extrabold bg-green-500 text-white border-4 border-green-700 animate-pulse-once"
        style={{ minWidth: '6rem', minHeight: '9rem' }} // Ensure it maintains card size
    >
        🏆
    </div>
);

// Helper function to get the icon/value for a card
export const getCardIcon = (value) => {
    switch (value) {
        case 'Skip':
            return <SkipForward size={24} />;
        case 'Reverse':
            return <Undo2 size={24} />;
        case 'Draw Two':
            return (
                <div className="flex items-center gap-1">
                    <Plus size={20} />
                    <Plus size={20} />
                </div>
            );
        case 'Wild':
            return <Palette size={24} />;
        case 'Wild Draw Four':
            return (
                <div className="flex items-center gap-1">
                    <Palette size={20} />
                    <span className="font-bold text-lg">+4</span>
                </div>
            );
        default:
            return <span className="text-1xl font-bold">{value}</span>;
    }
};

// Helper function to get the Tailwind CSS classes for card colors
export const getColorClass = (color, type = 'card') => {
    // 'type' can be used to vary styles, e.g., 'card' vs 'border'
    switch (color) {
        case 'red':
            return type === 'card' ? 'bg-red-500 text-white' : 'border-red-500 text-red-600';
        case 'blue':
            return type === 'card' ? 'bg-blue-500 text-white' : 'border-blue-500 text-blue-600';
        case 'green':
            return type === 'card' ? 'bg-green-500 text-white' : 'border-green-500 text-green-600';
        case 'yellow':
            return type === 'card' ? 'bg-yellow-400 text-black' : 'border-yellow-500 text-yellow-600'; // Yellow text on yellow card can be hard to see
        case 'wild':
            return type === 'card' ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white' : 'border-gray-500 text-gray-600';
        default:
            return type === 'card' ? 'bg-gray-300 text-black' : 'border-gray-500 text-gray-600';
    }
};

// The Card React Component
const Card = ({ card, onClick, isDisabled, isClickable }) => {
    const { color, value } = card;

    const baseClasses = `
        w-14 h-20 rounded-xl shadow-md flex items-center justify-center text-lg font-bold transition-all duration-200 ease-in-out
        ${getColorClass(color, 'card')}
        ${isClickable ? 'cursor-pointer hover:scale-105' : ''}
        ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}
    `;

    // Border for human player's playable cards
    const playableBorderClass =
        isClickable && !isDisabled && color !== 'wild' // Only apply to non-wild playable cards
            ? `border-4 ${getColorClass(color, 'border')} hover:border-indigo-500`
            : `border-4 ${getColorClass(color, 'border')}`;


    return (
        <button
            className={`${baseClasses} ${playableBorderClass}`}
            onClick={onClick}
            disabled={isDisabled}
        >
            {getCardIcon(value)}
        </button>
    );
};

export default Card;