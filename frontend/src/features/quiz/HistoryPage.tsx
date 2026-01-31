
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../stores/useAuth';
import {
    BookOpen,
    Calendar,
    ChevronLeft,
    ArrowRight,
    Search,
    Book,
    Lightbulb,
    Atom,
    Globe,
    Music,
    Palette
} from 'lucide-react';
import { motion } from 'framer-motion';

// reuse styles from widget
const SUBJECT_STYLES: Record<string, { icon: React.ReactNode, bg: string, color: string }> = {
    'Mathématiques': { icon: <Atom className="w-5 h-5" />, bg: 'bg-blue-100', color: 'text-blue-600' },
    'Français': { icon: <Book className="w-5 h-5" />, bg: 'bg-orange-100', color: 'text-orange-600' },
    'Sciences': { icon: <Lightbulb className="w-5 h-5" />, bg: 'bg-emerald-100', color: 'text-emerald-600' },
    'Histoire-Géo': { icon: <Globe className="w-5 h-5" />, bg: 'bg-purple-100', color: 'text-purple-600' },
    'Musique': { icon: <Music className="w-5 h-5" />, bg: 'bg-pink-100', color: 'text-pink-600' },
    'Arts': { icon: <Palette className="w-5 h-5" />, bg: 'bg-amber-100', color: 'text-amber-600' },
    'default': { icon: <BookOpen className="w-5 h-5" />, bg: 'bg-slate-100', color: 'text-slate-600' }
};

interface Revision {
    id: string;
    topic: string;
    subject: string;
    created_at: string;
    current_series: number;
    total_series: number;
    status: string;
    pending_errors?: number;
}

export const HistoryPage: React.FC = () => {
    const navigate = useNavigate();
    const { activeLearner } = useAuth();
    const [revisions, setRevisions] = useState<Revision[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchAll = async () => {
            if (!activeLearner) return;
            try {
                const res = await api.get(`/quiz/revisions?learner_id=${activeLearner.id}`);
                setRevisions(res.data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [activeLearner]);

    const filteredRevisions = revisions.filter(rev =>
        (rev.topic?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (rev.subject?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getSubjectStyle = (subject: string) => SUBJECT_STYLES[subject] || SUBJECT_STYLES['default'];

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans text-gray-900 pb-20">
            {/* Nav */}
            <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-100 text-slate-500 font-bold rounded-xl hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
                        >
                            <ChevronLeft className="w-5 h-5" />
                            <span>Retour</span>
                        </motion.button>
                        <h1 className="text-xl font-black tracking-tight text-gray-900">Mes Cours</h1>
                        <div className="w-20"></div> {/* spacer */}
                    </div>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto py-10 px-4">
                {/* Search Bar */}
                <div className="relative mb-10">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Rechercher un cours ou une matière..."
                        className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all outline-none font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        <p className="font-bold text-slate-400">Chargement de tes cours...</p>
                    </div>
                ) : filteredRevisions.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredRevisions.map((rev) => {
                            const style = getSubjectStyle(rev.subject);
                            return (
                                <motion.div
                                    key={rev.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={() => navigate(`/play/${rev.id}`)}
                                    className="group bg-white border border-slate-200 p-5 rounded-2xl hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/50 transition-all cursor-pointer flex items-center gap-6"
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${style.bg} ${style.color}`}>
                                        {style.icon}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className={`text-[11px] font-black uppercase tracking-widest mb-1 ${style.color}`}>
                                            {rev.subject || 'Général'}
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                                            {rev.topic}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <div className="flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(rev.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </div>
                                            <span className="text-slate-300">•</span>
                                            <div className="text-xs font-black text-indigo-400 uppercase tracking-tight">
                                                Quizz {rev.current_series}/{rev.total_series}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {rev.status === 'COMPLETED' && (
                                            <span className="hidden sm:flex px-3 py-1.5 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-green-100 items-center gap-2">
                                                <span>✅</span> Terminé
                                            </span>
                                        )}
                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                            <ArrowRight className="w-5 h-5" />
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200">
                        <div className="text-4xl mb-4">🔍</div>
                        <h3 className="text-xl font-bold text-slate-800">Aucun cours trouvé</h3>
                        <p className="text-slate-500 mt-2">Essaie une autre recherche ou crée un nouveau cours !</p>
                        <Link to="/new" className="mt-6 inline-flex px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100">
                            Créer un cours
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
};
