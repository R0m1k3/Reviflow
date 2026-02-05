import { useAuth } from '../../stores/useAuth';
import { Trophy, Star, TrendingUp } from 'lucide-react';

export function GamificationWidget() {
    const { activeLearner } = useAuth();

    if (!activeLearner) return null;

    const level = activeLearner.level || 1;
    const currentXP = activeLearner.xp || 0;

    // Formula inverse: XP = 50 * (Level-1)^2
    // But easier: Calculate bounds for current level to show progress bar
    // Level N starts at: 50 * (N-1)^2
    // Level N+1 starts at: 50 * N^2
    const currentLevelStartXP = 50 * Math.pow(level - 1, 2);
    const nextLevelStartXP = 50 * Math.pow(level, 2);
    const xpNeededForLevel = nextLevelStartXP - currentLevelStartXP;
    const xpProgressInLevel = currentXP - currentLevelStartXP;

    // Calculate percentage
    const progressPercent = Math.min(100, Math.max(0, (xpProgressInLevel / xpNeededForLevel) * 100));

    // Level Titles (Flavor text)
    const getLevelTitle = (lvl: number) => {
        if (lvl >= 50) return "Légende Vivante";
        if (lvl >= 30) return "Grand Maître";
        if (lvl >= 20) return "Érudit";
        if (lvl >= 10) return "Explorateur";
        if (lvl >= 5) return "Apprenti";
        return "Novice";
    };

    return (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 shadow-sm relative overflow-hidden">

            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl -ml-5 -mb-5"></div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1">Niveau {level}</div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">{getLevelTitle(level)}</h3>
                    </div>
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-slate-700 rounded-xl flex items-center justify-center border border-indigo-100 dark:border-slate-600 shadow-sm">
                        <Trophy className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                    </div>
                </div>

                <div className="mb-2 flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500" /> {currentXP} XP Totaux</span>
                    <span className="flex items-center gap-1">Prochain niveau: {Math.round(nextLevelStartXP - currentXP)} XP <TrendingUp className="w-3 h-3 text-indigo-500 dark:text-indigo-400" /></span>
                </div>

                {/* Progress Bar Container */}
                <div className="h-4 bg-gray-100 dark:bg-slate-700 rounded-full p-1 border border-gray-200 dark:border-slate-600">
                    {/* Active Progress */}
                    <div
                        className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full shadow-sm transition-all duration-1000 ease-out relative group"
                        style={{ width: `${progressPercent}%` }}
                    >
                        {/* Shimmer Effect */}
                        <div className="absolute top-0 left-0 w-full h-full bg-white/30 rounded-full animate-[shimmer_2s_infinite] opacity-0 group-hover:opacity-100"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
