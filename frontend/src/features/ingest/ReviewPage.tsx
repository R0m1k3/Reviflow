import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../stores/useAuth';
import { DyslexiaToggle } from '../../components/DyslexiaToggle';
import { useAccessibility } from '../../stores/useAccessibility';
import { motion } from 'framer-motion';


interface AnalysisResult {
    title: string;
    subject: string;
    raw_text: string;
    synthesis: string;
    study_tips?: string[];
    is_math_content: boolean;
    math_safety_triggered: boolean;
}

const SUBJECTS = [
    'Histoire',
    'Géographie',
    'Français',
    'Mathématiques',
    'Sciences',
    'Physique-Chimie',
    'SVT',
    'Anglais',
    'Espagnol',
    'Allemand',
    'Arts Plastiques',
    'Musique',
    'EPS',
    'Technologie',
    'Autre'
];

export const ReviewPage = () => {
    const navigate = useNavigate();
    const { isDyslexic } = useAccessibility();
    const { activeLearner } = useAuth();
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const storedResult = sessionStorage.getItem('analysisResult');
        if (!storedResult) {
            navigate('/new');
            return;
        }

        const parsed = JSON.parse(storedResult) as AnalysisResult;
        setResult(parsed);
        setTitle(parsed.title);
        setSubject(parsed.subject);
    }, []);

    const handleSubmit = async () => {
        if (!result) return;
        setIsSubmitting(true);
        setError(null);

        const updatedResult = { ...result, title, subject };

        try {
            await api.post('/quiz/generate', {
                text_content: updatedResult.raw_text,
                difficulty: 'medium',
                title: updatedResult.title,
                subject: updatedResult.subject,
                synthesis: updatedResult.synthesis,
                study_tips: updatedResult.study_tips,
                learner_id: activeLearner?.id
            });

            sessionStorage.removeItem('analysisResult');
            sessionStorage.removeItem('lessonData');
            navigate('/dashboard');
        } catch (err: any) {
            console.error(err);
            setError("Erreur lors de la sauvegarde : " + (err.response?.data?.detail || err.message));
            setIsSubmitting(false);
        }
    };

    const handleBack = () => {
        sessionStorage.removeItem('analysisResult');
        navigate('/new');
    };

    if (!result) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-500">Chargement...</p>
            </div>
        );
    }

    return (
        <div className={`min-h-screen bg-[#FDFCF8] py-12 ${isDyslexic ? 'font-dyslexic' : ''}`}>
            <div className="max-w-4xl mx-auto px-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                            Vérifiez l'analyse
                        </h1>
                        <p className="text-slate-500 font-medium mt-2">Ajustez les détails avant de générer votre quiz.</p>
                    </div>
                    <DyslexiaToggle />
                </div>

                {/* Math Safety Warning */}
                {result.math_safety_triggered && (
                    <div className="mb-8 p-6 bg-amber-50 border border-amber-100 rounded-[2rem] flex items-center gap-6 shadow-sm">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm">⚠️</div>
                        <div>
                            <h3 className="font-black text-amber-900 uppercase tracking-wider text-sm mb-1">
                                Contenu mathématique détecté
                            </h3>
                            <p className="text-amber-700 font-medium">
                                Le mode "Extraction Stricte" est activé. Les équations ont été extraites sans résolution.
                            </p>
                        </div>
                    </div>
                )}

                {/* Editable Fields */}
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-indigo-100/50 border border-slate-50 p-10 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        <div className="space-y-2 md:col-span-2">
                            <label className="block text-sm font-black text-slate-700 uppercase tracking-widest ml-1">
                                Titre de la leçon
                            </label>
                            <textarea
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white transition-all font-bold outline-none text-slate-900 resize-none h-auto min-h-[5rem]"
                                placeholder="Ex: La Révolution Française"
                                rows={2}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="block text-sm font-black text-slate-700 uppercase tracking-widest ml-1">
                                Matière
                            </label>
                            <select
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white transition-all font-bold outline-none text-slate-900 appearance-none"
                            >
                                {SUBJECTS.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Synthesis */}
                    <div className="mb-10">
                        <label className="block text-sm font-black text-slate-700 uppercase tracking-widest ml-1 mb-3">
                            Résumé magique ✨
                        </label>
                        <div className="p-8 bg-indigo-50/30 border border-indigo-50 rounded-[2rem] whitespace-pre-wrap text-slate-700 font-medium leading-relaxed italic">
                            {result.synthesis}
                        </div>
                    </div>

                    {/* Study Tips */}
                    {result.study_tips && result.study_tips.length > 0 && (
                        <div className="mb-10">
                            <label className="block text-sm font-black text-slate-700 uppercase tracking-widest ml-1 mb-3">
                                Conseils Métho 💡
                            </label>
                            <div className="grid gap-4 md:grid-cols-3">
                                {result.study_tips.map((tip, idx) => (
                                    <div key={idx} className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-[1.5rem] shadow-sm">
                                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-emerald-600 font-black text-sm mb-3 shadow-sm border border-emerald-50">
                                            {idx + 1}
                                        </div>
                                        <p className="text-slate-700 font-bold text-sm leading-relaxed">
                                            {tip}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Raw Text (collapsed by default) */}
                    <details className="group">
                        <summary className="cursor-pointer text-sm font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-600 transition-colors list-none flex items-center gap-2">
                            <span className="group-open:rotate-180 transition-transform">📄</span>
                            Voir le texte extrait complet
                        </summary>
                        <div className="mt-6 p-6 bg-slate-50 rounded-2xl whitespace-pre-wrap text-slate-400 font-mono text-xs max-h-64 overflow-y-auto border border-slate-100">
                            {result.raw_text}
                        </div>
                    </details>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleBack}
                        className="flex-1 py-5 px-6 bg-white border-2 border-slate-100 rounded-2xl text-slate-600 font-black hover:bg-slate-50 hover:border-slate-200 transition-all shadow-sm flex items-center justify-center gap-3"
                    >
                        <span>← Retour</span>
                    </motion.button>

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !title.trim()}
                        className="flex-1 py-5 px-6 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3"
                    >
                        {isSubmitting ? (
                            <>
                                <span className="animate-spin text-xl">⏳</span>
                                Sauvegarde...
                            </>
                        ) : 'Valider & Sauvegarder'}
                    </button>
                    {error && (
                        <div className="md:col-span-2 text-red-500 font-bold text-center mt-4 bg-red-50 p-4 rounded-xl w-full">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
