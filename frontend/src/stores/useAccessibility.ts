import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AccessibilityState {
    isDyslexic: boolean;
    toggleDyslexic: () => void;
}

export const useAccessibility = create<AccessibilityState>()(
    persist(
        (set) => ({
            isDyslexic: false,
            toggleDyslexic: () => set((state) => ({ isDyslexic: !state.isDyslexic })),
        }),
        {
            name: 'accessibility-storage',
        }
    )
);
