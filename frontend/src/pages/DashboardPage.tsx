import { Link } from 'react-router-dom';
import { useAuth } from '../stores/useAuth';

import { UsageWidget } from '../features/dashboard/UsageWidget';
import { GamificationWidget } from '../features/dashboard/GamificationWidget';
import { MasteryWidget } from '../features/dashboard/MasteryWidget';
import { ActivityTimeline } from '../features/dashboard/ActivityTimeline';
import { RecentRevisionsWidget } from '../features/dashboard/RecentRevisionsWidget';
import { LogOut, Flame } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Avatar Configuration (Original Fun-Emoji Style) ---
const AVATAR_SEEDS = [
    'Felix', 'Aneka', 'Zoe', 'Marc', 'Trouble', 'Coco', 'Sasha', 'Jack',
    'Lulu', 'Bibi', 'Mimi', 'Titi', 'Gigi', 'Nana', 'Kiki', 'Pupu',
    'Riri', 'Fifi', 'Loulou', 'Pipo', 'Pepa', 'Papi', 'Pomo', 'Pumi'
];

// --- Badges Configuration (Modern 30+ System) ---
type BadgeRarity = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
interface BadgeDef {
    code: string;
    label: string;
    description: string;
    icon: string;
    rarity: BadgeRarity;
    category: string;
}

const ALL_BADGES: BadgeDef[] = [
    // --- Les Débuts ---
    { code: 'FIRST_STEPS', label: 'Premiers Pas', description: 'Ton tout premier quiz terminé !', icon: '🌱', rarity: 'BRONZE', category: 'Débuts' },
    { code: 'PROFILE_MASTER', label: 'Bien chez soi', description: 'Personnalisation de ton avatar réussie.', icon: '🖼️', rarity: 'BRONZE', category: 'Débuts' },
    { code: 'QUICK_START', label: 'Vite fait, bien fait', description: 'Premier exercice complété en moins de 2 minutes.', icon: '⚡', rarity: 'BRONZE', category: 'Débuts' },

    // --- L'Érudit (Matières) ---
    { code: 'MATH_CHAMP', label: 'Génie Maths', description: 'Atteins 80% de maîtrise en Mathématiques.', icon: '📐', rarity: 'SILVER', category: 'Savoir' },
    { code: 'FRANCAIS_EXPERT', label: 'Molière en herbe', description: 'Maîtrise parfaite des bases du Français.', icon: '📚', rarity: 'SILVER', category: 'Savoir' },
    { code: 'SCIENCE_STAR', label: 'P’tit Scientifique', description: 'Exploration des sciences complétée avec succès.', icon: '🧪', rarity: 'SILVER', category: 'Savoir' },
    { code: 'GLOBAL_MASTER', label: 'Savant Fou', description: 'Atteins le niveau 20 dans toutes les matières.', icon: '🌎', rarity: 'GOLD', category: 'Savoir' },
    { code: 'ENCYCLOPEDIE', label: 'L’Encyclopédie', description: 'Réponds correctement à 500 questions.', icon: '📖', rarity: 'PLATINUM', category: 'Savoir' },

    // --- Le Marathonien (Assiduité) ---
    { code: 'STREAK_3', label: 'Le Triplé', description: 'Révise pendant 3 jours consécutifs.', icon: '🥉', rarity: 'BRONZE', category: 'Marathon' },
    { code: 'STREAK_7', label: 'Une Semaine au Top', description: '7 jours de révisions sans interruption !', icon: '🥈', rarity: 'SILVER', category: 'Marathon' },
    { code: 'STREAK_30', label: 'Légende Mensuelle', description: '30 jours de folie ! Rien ne t’arrête.', icon: '🥇', rarity: 'GOLD', category: 'Marathon' },
    { code: 'WEEKENDER', label: 'Guerrier du WE', description: 'Révise même le samedi et le dimanche.', icon: '📅', rarity: 'SILVER', category: 'Marathon' },
    { code: 'EARLY_BIRD', label: 'Lève-tôt', description: 'Fais un quiz avant 8h du matin.', icon: '🌅', rarity: 'BRONZE', category: 'Marathon' },
    { code: 'NIGHT_OWL', label: 'Oiseau de Nuit', description: 'Révise après 20h le soir.', icon: '🦉', rarity: 'BRONZE', category: 'Marathon' },

    // --- L'Éclair (Performance) ---
    { code: 'ON_FIRE', label: 'On Fire', description: 'Enchaîne 10 bonnes réponses d’affilée.', icon: '🔥', rarity: 'SILVER', category: 'Performance' },
    { code: 'PERFECT_SCORE', label: 'Sans Faute', description: 'Obtiens 100% à un quiz difficile.', icon: '🎯', rarity: 'GOLD', category: 'Performance' },
    { code: 'SPEED_DEMON', label: 'Éclair Argenté', description: 'Termine un quiz en un temps record.', icon: '🏎️', rarity: 'SILVER', category: 'Performance' },
    { code: 'UNSTOPPABLE', label: 'Invincible', description: '50 bonnes réponses sans aucune erreur.', icon: '💎', rarity: 'GOLD', category: 'Performance' },
    { code: 'SNIPER', label: 'Sniper Or', description: 'Précision de 95% sur l’ensemble de la semaine.', icon: '🏹', rarity: 'GOLD', category: 'Performance' },

    // --- Social & Fun ---
    { code: 'FEEDBACK_FAN', label: 'Curieux', description: 'Consulte tes erreurs après un quiz.', icon: '🧐', rarity: 'BRONZE', category: 'Découverte' },
    { code: 'ZEN_MASTER', label: 'Maître Zen', description: 'Passe 1 heure totale en mode concentration.', icon: '🧘', rarity: 'SILVER', category: 'Découverte' },
    { code: 'LEVEL_UP_FAST', label: 'Ascension Fulgurante', description: 'Gagne 2 niveaux en une seule journée.', icon: '🚀', rarity: 'GOLD', category: 'Performance' },
    { code: 'LUCKY_STAR', label: 'Étoile Chanceuse', description: 'Débloque un badge caché.', icon: '✨', rarity: 'SILVER', category: 'Découverte' },
    { code: 'TREASURE_HUNTER', label: 'Chasseur de Trésors', description: 'Débloque 15 badges différents.', icon: '🏴‍☠️', rarity: 'GOLD', category: 'Collection' },
    { code: 'TRUE_LEGEND', label: 'La Vraie Légende', description: 'Atteins le niveau 50.', icon: '👑', rarity: 'PLATINUM', category: 'Collection' },
    { code: 'COMPLETIONIST', label: 'Le Collectionneur', description: 'Obtiens tous les badges du jeu.', icon: '🏆', rarity: 'PLATINUM', category: 'Collection' },

    // Extra variety
    { code: 'BRAIN_POWER', label: 'Super Cerveau', description: 'Réponds à 20 questions de logique.', icon: '🧠', rarity: 'SILVER', category: 'Savoir' },
    { code: 'LITERATURE_LOVER', label: 'Plume d’Or', description: 'Excellence en littérature.', icon: '✒️', rarity: 'GOLD', category: 'Savoir' },
    { code: 'HISTORY_BUFF', label: 'Voyageur Temporel', description: 'Expert en Histoire.', icon: '⏳', rarity: 'SILVER', category: 'Savoir' },
    { code: 'ART_CRITIC', label: 'Petit Artiste', description: 'Premier badge en Arts.', icon: '🎨', rarity: 'BRONZE', category: 'Savoir' },
    { code: 'MUSIC_MAESTRO', label: 'Mélomane', description: 'Rythme de révision parfait.', icon: '🎵', rarity: 'BRONZE', category: 'Performance' },
];

function BadgeGalleryModal({ isOpen, onClose, unlockedBadges }: { isOpen: boolean, onClose: () => void, unlockedBadges: string[] }) {
    const categories = Array.from(new Set(ALL_BADGES.map(b => b.category)));

    // Gamified Medal Styles
    const getBadgeStyle = (_rarity: BadgeRarity, isUnlocked: boolean) => {
        const base = "relative flex flex-col items-center text-center transition-all duration-300 transform active:scale-95 group";

        if (!isUnlocked) {
            return `${base} opacity-60 grayscale scale-95`;
        }

        // Add hover:z-50 to ensure the badge and its tooltip appear on top of siblings
        return `${base} hover:scale-110 hover:-translate-y-1 hover:brightness-110 hover:z-50`;
    };

    const getMedalClass = (rarity: BadgeRarity, isUnlocked: boolean) => {
        const base = "relative w-16 h-18 sm:w-20 sm:h-22 p-4 flex items-center justify-center mb-2 shadow-lg transition-all duration-500 overflow-hidden";

        // Custom "Medal" shape using clip-path or complex rounding
        // Shield shape approximation with border-radius
        const shape = "rounded-[20%_20%_50%_50%]";

        if (!isUnlocked) {
            return `${base} ${shape} bg-slate-200 border-2 border-slate-300`;
        }

        switch (rarity) {
            case 'PLATINUM':
                return `${base} ${shape} bg-gradient-to-b from-indigo-100 via-purple-100 to-indigo-300 border-2 border-white shadow-indigo-200/50 ring-2 ring-purple-400/20`;
            case 'GOLD':
                return `${base} ${shape} bg-gradient-to-b from-yellow-200 via-amber-300 to-orange-400 border-2 border-white shadow-amber-200/50 ring-2 ring-yellow-400/30`;
            case 'SILVER':
                return `${base} ${shape} bg-gradient-to-b from-slate-100 via-blue-100 to-slate-400 border-2 border-white shadow-blue-100/50 ring-2 ring-blue-300/20`;
            default: // BRONZE
                return `${base} ${shape} bg-gradient-to-b from-orange-100 via-orange-300 to-red-400 border-2 border-white shadow-orange-200/50 ring-2 ring-orange-400/20`;
        }
    };

    const getRarityLabel = (rarity: BadgeRarity) => {
        switch (rarity) {
            case 'PLATINUM': return "PLATINE";
            case 'GOLD': return "OR";
            case 'SILVER': return "ARGENT";
            default: return "BRONZE";
        }
    };

    const getRarityColor = (rarity: BadgeRarity) => {
        switch (rarity) {
            case 'PLATINUM': return "text-indigo-600";
            case 'GOLD': return "text-amber-600";
            case 'SILVER': return "text-blue-600";
            default: return "text-orange-700";
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md">
                    <div className="absolute inset-0" onClick={onClose} />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 30 }}
                        className="relative z-10 bg-white/95 rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col border border-white/20"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white/80 sticky top-0 z-20 backdrop-blur-sm">
                            <div>
                                <h3 className="text-3xl font-black text-gray-900 tracking-tight">Ma Collection 🏆</h3>
                                <div className="mt-2 flex items-center gap-3">
                                    <div className="h-2 w-48 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-1000"
                                            style={{ width: `${(unlockedBadges.length / ALL_BADGES.length) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-black text-indigo-600">
                                        {unlockedBadges.length} DE {ALL_BADGES.length} DÉBLOQUÉS
                                    </span>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all active:scale-95 text-gray-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-hide">
                            {categories.map(category => (
                                <div key={category} className="space-y-6">
                                    <h4 className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.2em] text-gray-400">
                                        <span className="h-px flex-1 bg-gray-100"></span>
                                        {category}
                                        <span className="h-px flex-1 bg-gray-100"></span>
                                    </h4>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 gap-y-10">
                                        {ALL_BADGES.filter(b => b.category === category).map(badge => {
                                            const isUnlocked = unlockedBadges.includes(badge.code);
                                            return (
                                                <div
                                                    key={badge.code}
                                                    className={getBadgeStyle(badge.rarity, isUnlocked)}
                                                >
                                                    {/* Medal Body */}
                                                    <div className={getMedalClass(badge.rarity, isUnlocked)}>
                                                        {/* Inner Glossy Effect */}
                                                        {isUnlocked && <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 -skew-x-12 translate-x-[-20%] pointer-events-none" />}

                                                        <span className={`text-4xl sm:text-5xl drop-shadow-md select-none ${!isUnlocked ? 'filter-none grayscale' : ''}`}>
                                                            {badge.icon}
                                                        </span>
                                                    </div>

                                                    {/* Badge Info */}
                                                    <div className="space-y-1 mt-1">
                                                        <h5 className="text-[11px] font-black leading-tight text-gray-900 uppercase tracking-tight">
                                                            {badge.label}
                                                        </h5>
                                                        <span className={`text-[8px] font-black uppercase tracking-widest ${getRarityColor(badge.rarity)}`}>
                                                            {getRarityLabel(badge.rarity)}
                                                        </span>
                                                    </div>

                                                    {/* Gamified Hover Tooltip (Top) */}
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-32 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 transform translate-y-2 group-hover:translate-y-0">
                                                        <div className="bg-gray-900 text-white p-3 rounded-xl shadow-2xl border border-white/10 text-center ring-4 ring-black/5 relative">
                                                            <p className="text-[10px] font-bold leading-relaxed">{badge.description}</p>
                                                            {/* Arrow pointing down */}
                                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function getAvatarUrl(seed: string) {
    return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${seed}&radius=50`;
}

function AvatarSelector({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const { updateProfile } = useAuth();
    const [sending, setSending] = useState(false);

    const handleSelect = async (seed: string) => {
        setSending(true);
        const url = getAvatarUrl(seed);
        try {
            await updateProfile({ avatar_url: url });
            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setSending(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="absolute inset-0" onClick={onClose} />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100"
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Choisis ton Avatar</h3>
                                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </button>
                            </div>

                            <div className="grid grid-cols-4 gap-3 max-h-[400px] overflow-y-auto p-1 scrollbar-hide">
                                {AVATAR_SEEDS.map((seed) => (
                                    <button
                                        key={seed}
                                        onClick={() => handleSelect(seed)}
                                        disabled={sending}
                                        className="aspect-square flex items-center justify-center p-2 bg-gray-50 rounded-full hover:bg-indigo-50 hover:scale-110 active:scale-95 transition-all outline-none border-2 border-transparent hover:border-indigo-200"
                                    >
                                        <img src={getAvatarUrl(seed)} alt={seed} className="w-full h-full object-contain" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

// Function to render avatar content
function AvatarDisplay({ url, size = "w-9 h-9", fontSize = "text-xl" }: { url: string | null, size?: string, fontSize?: string }) {
    if (!url) return <div className={`${size} rounded-full bg-gray-200 flex items-center justify-center text-gray-400`}>?</div>;

    // Check if it's a URL or a plain emoji
    const isEmoji = !url.startsWith('http') && !url.startsWith('data:') && !url.includes('/');

    return (
        <div className={`${size} rounded-full bg-white border border-gray-200 overflow-hidden flex items-center justify-center shadow-sm`}>
            {isEmoji ? (
                <span className={fontSize}>{url}</span>
            ) : (
                <img src={url} alt="Avatar" className="w-full h-full object-cover" />
            )}
        </div>
    );
}

// --- Dyslexia Toggle Button ---
function DyslexiaToggle() {
    const [isDyslexic, setIsDyslexic] = useState(() => {
        return localStorage.getItem('dyslexic-mode') === 'true';
    });

    useEffect(() => {
        if (isDyslexic) {
            document.body.classList.add('font-dyslexic');
        } else {
            document.body.classList.remove('font-dyslexic');
        }
        localStorage.setItem('dyslexic-mode', String(isDyslexic));
    }, [isDyslexic]);

    return (
        <button
            onClick={() => setIsDyslexic(!isDyslexic)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-bold transition-all ${isDyslexic
                ? 'bg-indigo-100 text-indigo-700 border-indigo-200 shadow-inner'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
            title="Activer la police adaptée pour la dyslexie"
        >
            <span className="text-lg leading-none">Aa</span>
            <span className="hidden sm:inline">{isDyslexic ? 'Mode Lecture' : 'Dyslexie'}</span>
        </button>
    );
}

export default function DashboardPage() {
    const { user, activeLearner, logout } = useAuth();
    const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
    const [isBadgeGalleryOpen, setIsBadgeGalleryOpen] = useState(false);

    // Get recently unlocked badges (last 4)
    const recentBadges = activeLearner?.badges?.slice(-4).reverse() || [];
    const unlockedBadgeCodes = activeLearner?.badges?.map(b => b.badge_code) || [];
    // Auto-generated avatar based on name
    const currentAvatarUrl = activeLearner?.avatar_url;

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-gray-900 overflow-x-hidden">
            <AvatarSelector isOpen={isAvatarPickerOpen} onClose={() => setIsAvatarPickerOpen(false)} />
            <BadgeGalleryModal
                isOpen={isBadgeGalleryOpen}
                onClose={() => setIsBadgeGalleryOpen(false)}
                unlockedBadges={unlockedBadgeCodes}
            />
            {/* Navigation */}
            <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-6">
                            <Link to="/dashboard" className="flex items-center gap-3">
                                <img src="/logo.png" alt="Reviflow" className="w-8 h-8 rounded-lg shadow-sm object-cover bg-white" />
                                <span className="text-lg font-bold tracking-tight text-gray-900">Reviflow</span>
                            </Link>

                            <div className="hidden sm:flex items-center space-x-1">
                                <Link to="/dashboard" className="px-3 py-2 text-gray-900 bg-gray-100/50 rounded-md text-sm font-medium">
                                    Tableau de bord
                                </Link>
                                {user?.role === 'parent' && (
                                    <>
                                        <Link to="/parent-hub" className="px-3 py-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors">
                                            Espace Parent
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Center: Date/Time */}
                        <div className="hidden lg:flex flex-col items-center justify-center">
                            <span className="text-sm font-black text-gray-900 capitalize">
                                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </span>
                            <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
                                {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Dyslexia Toggle */}
                            <DyslexiaToggle />

                            <div className="h-6 w-px bg-gray-200 mx-1"></div>

                            {/* Profile Info */}
                            <div className="flex items-center gap-3">
                                <div className="hidden md:block text-right">
                                    <p className="text-sm font-bold text-gray-900 leading-none">
                                        {activeLearner?.first_name || user?.first_name}
                                    </p>
                                </div>
                                <button
                                    onClick={() => user?.role === 'learner' && setIsAvatarPickerOpen(true)}
                                    className="outline-none"
                                    disabled={user?.role !== 'learner'}
                                >
                                    <AvatarDisplay url={currentAvatarUrl || null} />
                                </button>
                            </div>

                            <button
                                onClick={logout}
                                className="p-2 text-gray-400 hover:text-red-900 transition-colors"
                                title="Se déconnecter"
                            >
                                <LogOut className="w-4 h-4 ml-1" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-grow py-8 px-4 sm:px-6">
                <div className="max-w-6xl mx-auto">

                    {/* Header Section */}
                    <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-in fade-in slide-in-from-top-2 duration-500">
                        <div>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {activeLearner && (activeLearner.streak_current || 0) > 0 && (
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-orange-50 border border-orange-100 rounded-full text-orange-700">
                                        <Flame className="w-3 h-3 fill-orange-500 text-orange-500" />
                                        <span className="text-[10px] font-bold uppercase tracking-wide">
                                            {activeLearner.streak_current} jours
                                        </span>
                                    </div>
                                )}
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                                Bonjour {activeLearner?.first_name}.
                            </h2>
                            <p className="text-gray-500 mt-1">Prêt à avancer sur tes objectifs ?</p>
                        </div>

                        <div className="flex gap-3">
                            <Link
                                to="/new"
                                className="inline-flex items-center px-6 py-3 bg-gray-900 hover:bg-black text-white font-medium rounded-xl shadow-lg shadow-gray-200 hover:shadow-xl transition-all active:scale-95"
                            >
                                <span className="mr-2 text-lg">+</span>
                                Ajouter un cours
                            </Link>
                        </div>
                    </div>

                    {/* Grid Layout */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                    >
                        {/* Left Column: Stats */}
                        <div className="lg:col-span-4 space-y-6">
                            <GamificationWidget />
                            {/* TimeWidget Removed */}
                            <RecentRevisionsWidget />
                            {user?.role === 'parent' && <UsageWidget />}

                            {user?.role === 'parent' && (
                                <Link to="/parent-hub" className="block p-6 bg-indigo-900 rounded-xl text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/30 rounded-full blur-2xl -ml-5 -mb-5"></div>

                                    <div className="relative z-10">
                                        <h3 className="font-bold text-lg mb-1 group-hover:translate-x-1 transition-transform">Espace Parent</h3>
                                        <p className="text-indigo-200 text-sm mb-4">Gérer les comptes et abonnements.</p>
                                        <div className="flex items-center text-sm font-bold text-indigo-100">
                                            Accéder <span className="ml-2">→</span>
                                        </div>
                                    </div>
                                </Link>
                            )}
                        </div>

                        {/* Right Column: Mastery & Activity */}
                        <div className="lg:col-span-8 space-y-6">

                            {/* Badges - Compact */}
                            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm relative overflow-hidden">
                                {/* Background Decorations */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl -ml-5 -mb-5"></div>

                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-gray-900">Succès Récents</h3>
                                        <button
                                            onClick={() => setIsBadgeGalleryOpen(true)}
                                            className="text-[10px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-md transition-colors"
                                        >
                                            Collection →
                                        </button>
                                    </div>
                                    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                                        {recentBadges.length > 0 ? (
                                            recentBadges.map((badge) => {
                                                const badgeDef = ALL_BADGES.find(b => b.code === badge.badge_code);
                                                return (
                                                    <div key={badge.badge_code} className="flex-shrink-0 flex items-center gap-3 px-4 py-2 rounded-full border border-indigo-100 bg-white text-indigo-900 shadow-md hover:scale-105 transition-all cursor-pointer ring-1 ring-indigo-50">
                                                        <span className="text-xl drop-shadow-sm">{badgeDef?.icon || '🏆'}</span>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black leading-tight uppercase tracking-tight">{badgeDef?.label || badge.badge_code}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 text-gray-400 w-full justify-center">
                                                <span className="text-sm font-bold uppercase tracking-widest opacity-60">En attente de succès... 🚀</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <MasteryWidget />

                            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm min-h-[300px] relative overflow-hidden">
                                {/* Background Decorations */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl -ml-5 -mb-5"></div>

                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="font-bold text-gray-900">Activités Récentes</h3>
                                    </div>
                                    <ActivityTimeline learnerId={activeLearner?.id} />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
