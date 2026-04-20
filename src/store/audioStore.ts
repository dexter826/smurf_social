import { create } from 'zustand';

interface AudioState {
    currentlyPlayingId: string | null;
    isPlaying: boolean;
    setCurrentlyPlaying: (id: string | null) => void;
    setIsPlaying: (isPlaying: boolean) => void;
    togglePlay: (id: string) => void;
    stopAll: () => void;
}

export const useAudioStore = create<AudioState>((set) => ({
    currentlyPlayingId: null,
    isPlaying: false,

    setCurrentlyPlaying: (id) => set({ currentlyPlayingId: id }),
    setIsPlaying: (isPlaying) => set({ isPlaying }),

    togglePlay: (id) => set((state) => {
        if (state.currentlyPlayingId === id) {
            return { isPlaying: !state.isPlaying };
        }
        return { currentlyPlayingId: id, isPlaying: true };
    }),

    stopAll: () => set({ currentlyPlayingId: null, isPlaying: false }),
}));
