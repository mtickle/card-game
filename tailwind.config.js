module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html"
    ],
    theme: {
        extend: {
            fontFamily: {
                luckiest: ['"Luckiest Guy"', 'cursive'],
            },
            backgroundImage: {
                'dice-gradient': 'linear-gradient(90deg, #f67280, #f8b195, #f6d365, #c06c84, #6c5b7b)',
            },
            boxShadow: {
                'text-subtle': '1px 1px 2px rgba(0,0,0,0.1)',
            },
            keyframes: {
                shake: {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '20%': { transform: 'translateX(-4px)' },
                    '40%': { transform: 'translateX(4px)' },
                    '60%': { transform: 'translateX(-4px)' },
                    '80%': { transform: 'translateX(4px)' },
                },
            },
            animation: {
                shake: 'shake 0.6s ease-in-out',
            },
        },
    },
    plugins: [],
};
