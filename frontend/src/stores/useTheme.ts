import { create } from 'zustand';
import { useEffect } from 'react';

interface ThemeState {
    isDark: boolean;
    toggleTheme: () => void;
    setTheme: (isDark: boolean) => void;
}

export const useTheme = create<ThemeState>((set) => {
    // 1. Check local storage or system preference on initialization
    const stored = localStorage.getItem('theme-mode');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const initialIsDark = stored ? stored === 'dark' : systemPrefersDark;

    return {
        isDark: initialIsDark,
        toggleTheme: () => set((state) => {
            const newIsDark = !state.isDark;
            localStorage.setItem('theme-mode', newIsDark ? 'dark' : 'light');
            return { isDark: newIsDark };
        }),
        setTheme: (isDark) => set(() => {
            localStorage.setItem('theme-mode', isDark ? 'dark' : 'light');
            return { isDark };
        })
    };
});

// Hook to handle the side effect of applying the class to HTML/Body
export function useThemeEffect() {
    const isDark = useTheme((state) => state.isDark);

    useEffect(() => {
        const root = window.document.documentElement;
        if (isDark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [isDark]);
}
