import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { DyslexiaToggle } from '../../components/DyslexiaToggle';
import { useAccessibility } from '../../stores/useAccessibility';
import { motion } from 'framer-motion';


interface Revision {
    id: string;
    topic: string;
    text_content: string;
    synthesis?: string;
    study_tips?: string;
    created_at: string;
}

export function RevisionViewPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isDyslexic } = useAccessibility();
    const [revision, setRevision] = useState<Revision | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRevision = async () => {
            try {
                const response = await api.get<Revision>(`/quiz/review/${id}`);
                setRevision(response.data);
            } catch (err) {
                console.error("Failed to load revision", err);
                setError("Impossible de charger la révision.");
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchRevision();
    }, [id]);

    const handleRetry = () => {
        if (!revision) return;
        // Navigate to quiz with original content to re-generate/take
        navigate('/quiz', {
            state: {
                textContent: revision.text_content,
                // We could pass topic too if QuizPage supports it, but textContent is key
            }
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error || !revision) {
        return (
            <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center">
                <div className="text-center p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Oups !</h2>
                    <p className="text-gray-600 mb-6">{error || "Révision introuvable."}</p>
                    <button onClick={() => navigate('/dashboard')} className="text-indigo-600 font-bold hover:underline">
                        Retour au tableau de bord
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen bg-[#FDFCF8] dark:bg-slate-900 py-12 ${isDyslexic ? 'font-dyslexic' : ''} transition-colors duration-300`}>
            <div className="max-w-4xl mx-auto px-4">
                <div className="flex justify-between items-center mb-10">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold rounded-xl hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-100 dark:hover:border-indigo-900 transition-all shadow-sm"
                    >
                        <span>← Retour</span>
                    </motion.button>

                    <DyslexiaToggle />
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl shadow-indigo-100/50 dark:shadow-none border border-slate-50 dark:border-slate-700 p-10 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-8 border-b border-slate-100 dark:border-slate-700 pb-6">
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2">{revision.topic}</h1>
                        <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-xs">
                            Révision du {new Date(revision.created_at).toLocaleDateString()}
                        </p>
                    </div>

                    <div className="prose prose-indigo dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                        {/* Synthesis Section */}
                        {revision.synthesis && (
                            <div className="mb-10">
                                <h3 className="text-lg font-black text-indigo-900 dark:text-indigo-300 mb-4 flex items-center gap-2">
                                    <span className="text-2xl">✨</span> Résumé Magique
                                </h3>
                                <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl italic text-slate-700 dark:text-slate-300">
                                    {revision.synthesis}
                                </div>
                            </div>
                        )}

                        {/* Tips Section */}
                        {revision.study_tips && (
                            <div className="mb-10">
                                <h3 className="text-lg font-black text-emerald-900 dark:text-emerald-400 mb-4 flex items-center gap-2">
                                    <span className="text-2xl">💡</span> Conseils Métho
                                </h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    {(() => {
                                        try {
                                            const tips = JSON.parse(revision.study_tips);
                                            return Array.isArray(tips) ? tips.map((tip: string, idx: number) => (
                                                <div key={idx} className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-emerald-800 dark:text-emerald-200 text-sm font-bold flex gap-3">
                                                    <span className="w-6 h-6 bg-white dark:bg-emerald-800 rounded-full flex items-center justify-center text-xs shadow-sm shrink-0">{idx + 1}</span>
                                                    {tip}
                                                </div>
                                            )) : null;
                                        } catch (e) { return null; }
                                    })()}
                                </div>
                            </div>
                        )}

                        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 uppercase tracking-widest text-sm">Contenu du Cours</h3>
                        {revision.text_content}
                    </div>
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={handleRetry}
                        className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 transition-all active:scale-95"
                    >
                        📝 Refaire le Quiz
                    </button>
                </div>
            </div>
        </div>
    );
}
