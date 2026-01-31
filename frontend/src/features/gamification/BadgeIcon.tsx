import { type LucideIcon, Trophy, Flame, Star, Zap, Award, BookOpen, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface BadgeIconProps {
    code: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    unlocked?: boolean;
}

// Badge Definitions
const BADGE_CONFIG: Record<string, { icon: LucideIcon; color: string; bg: string; tier: 'bronze' | 'silver' | 'gold' }> = {
    'FIRST_STEPS': { icon: Trophy, color: 'text-amber-700', bg: 'bg-gradient-to-br from-amber-100 to-amber-200', tier: 'bronze' },
    'ON_FIRE': { icon: Flame, color: 'text-orange-600', bg: 'bg-gradient-to-br from-orange-100 to-orange-200', tier: 'gold' },
    'MATH_CHAMP': { icon: Zap, color: 'text-blue-600', bg: 'bg-gradient-to-br from-blue-100 to-blue-200', tier: 'silver' },
    'NIGHT_OWL': { icon: Clock, color: 'text-indigo-600', bg: 'bg-gradient-to-br from-indigo-100 to-indigo-200', tier: 'bronze' },
    'PERFECT_SCORE': { icon: Star, color: 'text-yellow-600', bg: 'bg-gradient-to-br from-yellow-100 to-yellow-200', tier: 'gold' },
    'BOOKWORM': { icon: BookOpen, color: 'text-emerald-600', bg: 'bg-gradient-to-br from-emerald-100 to-emerald-200', tier: 'silver' },
};

const SIZES = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl'
};

const BORDERS = {
    bronze: 'border-amber-300',
    silver: 'border-slate-300',
    gold: 'border-yellow-300'
};

export function BadgeIcon({ code, size = 'md', unlocked = true }: BadgeIconProps) {
    const config = BADGE_CONFIG[code] || { icon: Award, color: 'text-gray-500', bg: 'bg-gray-100', tier: 'silver' };
    const Icon = config.icon;

    if (!unlocked) {
        return (
            <div className={`${SIZES[size]} rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300`}>
                <Icon className="w-1/2 h-1/2" />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className={`
            ${SIZES[size]} 
            rounded-full 
            flex items-center justify-center 
            ${config.bg} 
            ${config.color} 
            border-2 ${BORDERS[config.tier]} 
            shadow-sm 
            relative
            group
        `}>
            {/* Shine effect */}
            <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>

            <Icon className="w-1/2 h-1/2 relative z-10 drop-shadow-sm" />

            {/* Tier Star (Optional tiny indicator) */}
            {config.tier === 'gold' && (
                <Star className="absolute -top-1 -right-1 w-[30%] h-[30%] text-yellow-500 fill-yellow-500 stroke-white stroke-2" />
            )}
        </motion.div>
    );
}
