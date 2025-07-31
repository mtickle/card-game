import gameReducer from '@features/gameSlice'; // Import the default export
import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
    reducer: {
        // This 'game' key is important. It defines how you access the state.
        game: gameReducer,
    },
});