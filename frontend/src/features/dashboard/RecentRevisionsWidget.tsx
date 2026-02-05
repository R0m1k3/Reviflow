
import { useNavigate } from 'react-router-dom';
import { Play, BookOpen, ArrowRight, Book, AlertTriangle, X, Trash2, Sparkles, Lightbulb, Brain } from 'lucide-react';
import { useAuth } from '../../stores/useAuth';
import { api } from '../../lib/api';
import { useEffect, useState } from 'react';
import { Skeleton } from '../../components/ui/Skeleton';
import { AnimatePresence, motion } from 'framer-motion';

interface RevisionItem {
    id: string;
    topic: string;
    subject?: string;
    created_at: string;
    status: string;
    current_series: number;
    total_series: number;
    pending_errors?: number;
}

export const RecentRevisionsWidget = () => {
    const { activeLearner } = useAuth();
    const navigate = useNavigate();
    const [revisions, setRevisions] = useState<RevisionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [remediationLoadingId, setRemediationLoadingId] = useState<string | null>(null);

    // Restart Modal State
    const [restartModal, setRestartModal] = useState<{ isOpen: boolean, revisionId: string | null }>({
        isOpen: false,
        revisionId: null
    });
    const [isRestarting, setIsRestarting] = useState(false);

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, revisionId: string | null }>({
        isOpen: false,
        revisionId: null
    });
    const [isDeleting, setIsDeleting] = useState(false);

    // Summary Modal State
    const [summaryModal, setSummaryModal] = useState<{
        isOpen: boolean,
        data: any | null,
        loading: boolean
    }>({
        isOpen: false,
        data: null,
        loading: false
    });

    useEffect(() => {
        if (!activeLearner) return;

        api.get<any>(`/quiz/stats/activity?learner_id=${activeLearner.id}`)
            .then(res => {
                const allRevisions = res.data.history
                    .flatMap((day: any) => day.items)
                    .filter((item: any) => item.type === 'REVISION');
                setRevisions(allRevisions);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [activeLearner]);

    const getSubjectStyle = (subject?: string) => {
        if (subject === 'Mathématiques') return { color: 'text-blue-500', bg: 'bg-blue-50', icon: <BookOpen className="w-5 h-5" /> };
        if (subject === 'Histoire') return { color: 'text-amber-600', bg: 'bg-amber-50', icon: <Book className="w-5 h-5" /> };
        return { color: 'text-indigo-500', bg: 'bg-indigo-50', icon: <BookOpen className="w-5 h-5" /> };
    };

    const handleRemediation = async (e: React.MouseEvent, revisionId: string) => {
        e.stopPropagation();
        if (!activeLearner) return;
        setRemediationLoadingId(revisionId);
        try {
            const res = await api.post('/quiz/remediation/generate', {
                learner_id: activeLearner.id,
                revision_id: revisionId
            });
            const quizData = res.data;
            navigate('/quiz', { state: { quizData: quizData, textContent: "REMEDIATION_MODE", revisionId: revisionId } });
        } catch (e) {
            console.error(e);
            alert("Impossible de générer la révision des erreurs.");
        } finally {
            setRemediationLoadingId(null);
        }
    };

    const confirmRestart = async () => {
        if (!restartModal.revisionId) return;
        setIsRestarting(true);
        try {
            const res = await api.post('/quiz/reset', { revision_id: restartModal.revisionId });
            navigate('/quiz', { state: { quizData: res.data, revisionId: res.data.revision_id } });
        } catch (err) {
            alert("Erreur lors du redémarrage.");
            setIsRestarting(false);
            setRestartModal({ isOpen: false, revisionId: null });
        }
    };

    const confirmDelete = async () => {
        if (!deleteModal.revisionId) return;
        setIsDeleting(true);
        try {
            await api.delete(`/quiz/revision/${deleteModal.revisionId}`);
            // Remove from UI
            setRevisions(prev => prev.filter(r => r.id !== deleteModal.revisionId));
            setDeleteModal({ isOpen: false, revisionId: null });
        } catch (err) {
            alert("Erreur lors de la suppression.");
        } finally {
            setIsDeleting(false);
        }
    };

    const openSummary = async (e: React.MouseEvent, revisionId: string) => {
        e.stopPropagation();
        setSummaryModal(prev => ({ ...prev, isOpen: true, loading: true }));
        try {
            const res = await api.get(`/quiz/review/${revisionId}`);
            setSummaryModal({ isOpen: true, data: res.data, loading: false });
        } catch (err) {
            console.error(err);
            setSummaryModal({ isOpen: false, data: null, loading: false });
        }
    };

    if (loading) return <Skeleton className="h-48 w-full rounded-[2rem]" />;
    if (revisions.length === 0) return null;

    return (
        <>
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-xl shadow-indigo-100/20 dark:shadow-none border border-slate-100 dark:border-slate-700 relative overflow-hidden">
                {/* Background Decorations */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -ml-5 -mb-5"></div>

                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
                            Mes Cours
                        </h3>
                    </div>

                    <div className="space-y-4">
                        {revisions.slice(0, 4).map(rev => {
                            const style = getSubjectStyle(rev.subject);
                            return (
                                <motion.div
                                    key={rev.id}
                                    whileHover={{ y: -4 }}
                                    whileTap={{ scale: 0.99 }}
                                    className="group p-5 bg-slate-50/80 dark:bg-slate-700/30 border border-slate-100/80 dark:border-slate-700/50 rounded-[2rem] hover:bg-white dark:hover:bg-slate-700/50 hover:border-indigo-100 dark:hover:border-slate-600 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer relative"
                                    onClick={() => navigate(`/play/${rev.id}`)}
                                >
                                    {/* Delete Button - Subtle top right */}
                                    <motion.button
                                        whileTap={{ scale: 0.8 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteModal({ isOpen: true, revisionId: rev.id });
                                        }}
                                        className="absolute top-4 right-4 p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 transition-all rounded-xl z-20"
                                        title="Supprimer"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </motion.button>

                                    {/* Top Section: Icon + Title Group */}
                                    <div className="flex items-start gap-3 mb-4">
                                        <motion.div
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={(e) => openSummary(e, rev.id)}
                                            className="relative shrink-0 cursor-help"
                                            title="Voir le résumé"
                                        >
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${style.bg} ${style.color} border-2 border-white shadow-sm`}>
                                                <div className="scale-110">{style.icon}</div>
                                            </div>
                                            {rev.status === 'COMPLETED' && (
                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                                                    <span className="text-[10px] scale-90">✅</span>
                                                </div>
                                            )}
                                        </motion.div>

                                        <div className="flex-1 min-w-0 pr-8">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${style.color}`}>
                                                    {rev.subject || 'Général'}
                                                </span>
                                            </div>
                                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-tight">
                                                {rev.topic}
                                            </h4>
                                        </div>
                                    </div>

                                    {/* Bottom Section: Progress + Primary Actions */}
                                    <div className="flex items-end justify-between pt-3 border-t border-slate-100 dark:border-slate-700/50">
                                        <div className="space-y-1.5 min-w-0">
                                            <p className="text-[11px] font-bold text-slate-400 truncate">
                                                Ajouté le {new Date(rev.created_at).toLocaleDateString()}
                                            </p>
                                            <p className="text-[11px] font-black text-indigo-400 uppercase tracking-tight">
                                                Progression: <span className="text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-lg border border-indigo-100/50 dark:border-indigo-800/30">{rev.current_series}/{rev.total_series} QUIZZ</span>
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            {rev.pending_errors && rev.pending_errors > 0 ? (
                                                <motion.button
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={(e) => handleRemediation(e, rev.id)}
                                                    className="h-14 px-5 bg-amber-50 text-amber-700 border-2 border-amber-100 rounded-2xl flex items-center gap-3 shadow-sm hover:bg-amber-100 transition-colors"
                                                >
                                                    {remediationLoadingId === rev.id ? (
                                                        <span className="animate-spin w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full block"></span>
                                                    ) : (
                                                        <span className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Corriger</span>
                                                            <span className="bg-white px-2 py-0.5 rounded-lg text-xs font-black border border-amber-200 shadow-sm">{rev.pending_errors}</span>
                                                        </span>
                                                    )}
                                                </motion.button>
                                            ) : null}

                                            {rev.status === 'COMPLETED' ? (
                                                <motion.button
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setRestartModal({ isOpen: true, revisionId: rev.id });
                                                    }}
                                                    className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-700 border-2 border-slate-100 dark:border-slate-600 flex items-center justify-center text-slate-400 hover:bg-green-500 hover:text-white hover:border-transparent transition-all shadow-sm group/btn"
                                                    title="Recommencer"
                                                >
                                                    <span className="text-2xl group-hover/btn:rotate-180 transition-transform duration-500">🔄</span>
                                                </motion.button>
                                            ) : (
                                                <motion.button
                                                    whileTap={{ scale: 0.9 }}
                                                    className="w-14 h-14 rounded-2xl bg-indigo-600 border-2 border-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
                                                >
                                                    <Play className="w-6 h-6 ml-1" />
                                                </motion.button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/history')}
                        className="w-full mt-6 py-4 px-6 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-900 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-all active:bg-indigo-50"
                    >
                        <span>Tout voir</span>
                        <ArrowRight className="w-5 h-5" />
                    </motion.button>
                </div>
            </div >

            {/* Restart Confirmation Modal */}
            <AnimatePresence>
                {
                    restartModal.isOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                            onClick={() => setRestartModal({ isOpen: false, revisionId: null })}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl max-w-sm w-full relative overflow-hidden border border-transparent dark:border-slate-800"
                            >
                                <div className="absolute top-0 right-0 p-4">
                                    <button
                                        onClick={() => setRestartModal({ isOpen: false, revisionId: null })}
                                        className="text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex flex-col items-center text-center">
                                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-amber-600">
                                        <AlertTriangle className="w-8 h-8" />
                                    </div>

                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Recommencer le cours ?</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                                        Vous allez recommencer ce cours depuis le début. Votre progression actuelle (série en cours) sera réinitialisée.
                                    </p>

                                    <div className="flex gap-3 w-full">
                                        <button
                                            onClick={() => setRestartModal({ isOpen: false, revisionId: null })}
                                            className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            onClick={confirmRestart}
                                            disabled={isRestarting}
                                            className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                                        >
                                            {isRestarting ? (
                                                <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>
                                            ) : (
                                                <>
                                                    <span>Recommencer</span>
                                                    <span className="text-indigo-200">🔄</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {
                    deleteModal.isOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                            onClick={() => setDeleteModal({ isOpen: false, revisionId: null })}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl max-w-sm w-full relative overflow-hidden ring-4 ring-red-50 dark:ring-red-900/10 border border-transparent dark:border-slate-800"
                            >
                                <div className="absolute top-0 right-0 p-4">
                                    <button
                                        onClick={() => setDeleteModal({ isOpen: false, revisionId: null })}
                                        className="text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex flex-col items-center text-center">
                                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                                        <Trash2 className="w-8 h-8" />
                                    </div>

                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Supprimer ce cours ?</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                                        Cette action est irréversible. Toutes les données (progression, quiz, notes) seront effacées.
                                    </p>

                                    <div className="flex gap-3 w-full">
                                        <button
                                            onClick={() => setDeleteModal({ isOpen: false, revisionId: null })}
                                            className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            onClick={confirmDelete}
                                            disabled={isDeleting}
                                            className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-200 flex items-center justify-center gap-2"
                                        >
                                            {isDeleting ? (
                                                <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>
                                            ) : (
                                                <>
                                                    <span>Supprimer</span>
                                                    <span className="text-red-200">❌</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            {/* Summary Modal */}
            <AnimatePresence>
                {
                    summaryModal.isOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
                            onClick={() => setSummaryModal(prev => ({ ...prev, isOpen: false }))}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-[#FDFCF8] dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl max-w-2xl w-full my-auto relative border border-white/50 dark:border-slate-800"
                            >
                                <div className="absolute top-6 right-8">
                                    <button
                                        onClick={() => setSummaryModal(prev => ({ ...prev, isOpen: false }))}
                                        className="w-10 h-10 bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all hover:scale-110 active:scale-95"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {summaryModal.loading ? (
                                    <div className="py-20 flex flex-col items-center gap-4">
                                        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                        <p className="text-slate-400 font-bold animate-pulse">Chargement du résumé...</p>
                                    </div>
                                ) : summaryModal.data ? (
                                    <div className="animate-in fade-in zoom-in-95 duration-300">
                                        <div className="mb-8 border-b border-indigo-100/30 pb-6 pr-10">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800/30">Résumé du cours</span>
                                            </div>
                                            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-tight">
                                                {summaryModal.data.topic}
                                            </h3>
                                        </div>

                                        <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                            {/* Synthesis Section (Magic Summary) */}
                                            {summaryModal.data.synthesis && (
                                                <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-[2rem] p-6 border border-indigo-100/50 dark:border-indigo-800/30 shadow-sm">
                                                    <h4 className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 font-black mb-4 uppercase tracking-tighter text-sm">
                                                        <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                                                        Résumé Magique
                                                    </h4>
                                                    <div className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium italic whitespace-pre-wrap">
                                                        {summaryModal.data.synthesis}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Tips & Mnemonics Split Section */}
                                            {summaryModal.data.study_tips && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {(() => {
                                                        try {
                                                            const allTips: string[] = JSON.parse(summaryModal.data.study_tips);
                                                            if (!Array.isArray(allTips)) return null;

                                                            const mnemonics = allTips.filter(tip =>
                                                                tip.toLowerCase().includes('moyen') ||
                                                                tip.toLowerCase().includes('mémo') ||
                                                                tip.toLowerCase().includes('phrase') ||
                                                                tip.length < 50
                                                            );
                                                            const regularTips = allTips.filter(tip => !mnemonics.includes(tip));

                                                            return (
                                                                <>
                                                                    {/* Regular Tips Column */}
                                                                    <div className="space-y-4">
                                                                        <h4 className="flex items-center gap-2 text-amber-700 font-black uppercase tracking-tighter text-xs">
                                                                            <Lightbulb className="w-4 h-4 text-amber-500" />
                                                                            Astuces
                                                                        </h4>
                                                                        <div className="space-y-3">
                                                                            {regularTips.length > 0 ? regularTips.map((tip, idx) => (
                                                                                <div key={idx} className="p-4 bg-amber-50/40 border border-amber-100/50 rounded-2xl text-amber-900/80 text-xs font-bold leading-relaxed shadow-sm italic">
                                                                                    "{tip}"
                                                                                </div>
                                                                            )) : (
                                                                                <p className="text-xs text-slate-400 italic">Aucun conseil particulier.</p>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Mnemonics Column */}
                                                                    <div className="space-y-4">
                                                                        <h4 className="flex items-center gap-2 text-purple-700 font-black uppercase tracking-tighter text-xs">
                                                                            <Brain className="w-4 h-4 text-purple-500" />
                                                                            Mémos
                                                                        </h4>
                                                                        <div className="space-y-3">
                                                                            {mnemonics.length > 0 ? mnemonics.map((memo, idx) => (
                                                                                <div key={idx} className="p-4 bg-purple-50/40 border border-purple-100/50 rounded-2xl text-purple-900/80 text-xs font-black leading-relaxed shadow-sm">
                                                                                    {memo}
                                                                                </div>
                                                                            )) : (
                                                                                <p className="text-xs text-slate-400 italic">Pas de mémotechnique.</p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            );
                                                        } catch (e) { return null; }
                                                    })()}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/50 flex justify-center">
                                            <button
                                                onClick={() => {
                                                    setSummaryModal(prev => ({ ...prev, isOpen: false }));
                                                    navigate(`/play/${summaryModal.data.id}`);
                                                }}
                                                className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 hover:scale-105 transition-all active:scale-95 flex items-center gap-3"
                                            >
                                                <Play className="w-5 h-5 ml-1" />
                                                <span>Commencer le Quiz</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </>
    );
};
