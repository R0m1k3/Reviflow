import { useTheme } from '../stores/useTheme';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
    const { isDark, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-bold transition-all ${isDark
                    ? 'bg-slate-800 text-yellow-400 border-slate-700 hover:bg-slate-700'
                    : 'bg-white text-indigo-900 border-gray-200 hover:bg-gray-50'
                }`}
            title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
            aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
        >
            {isDark ? <Moon className="w-4 h-4 fill-current" /> : <Sun className="w-4 h-4 fill-current" />}
            <span className="hidden sm:inline">{isDark ? 'Sombre' : 'Clair'}</span>
        </button>
    );
}
