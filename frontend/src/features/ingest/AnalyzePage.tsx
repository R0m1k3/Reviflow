import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ProgressStep {
    step: string;
    message: string;
    progress: number;
    result?: AnalysisResult;
}

interface AnalysisResult {
    title: string;
    subject: string;
    raw_text: string;
    synthesis: string;
    study_tips: string[];
    is_math_content: boolean;
    math_safety_triggered: boolean;
}

const STEP_ICONS: Record<string, string> = {
    uploading: '📤',
    reading: '👁️',
    analyzing: '🧠',
    synthesizing: '✨',
    complete: '✅',
    error: '❌'
};

const STEP_LABELS: Record<string, string> = {
    uploading: 'Envoi',
    reading: 'Lecture',
    analyzing: 'Analyse',
    synthesizing: 'Synthèse',
    complete: 'Terminé',
    error: 'Erreur'
};

export const AnalyzePage = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState<ProgressStep | null>(null);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const docs = sessionStorage.getItem('pendingDocuments');
        if (!docs) {
            navigate('/new');
            return;
        }

        try {
            const imagesBase64 = JSON.parse(docs);
            startAnalysis(imagesBase64);
        } catch (e) {
            console.error('Error parsing pending documents:', e);
            navigate('/new');
        }
    }, []);

    const startAnalysis = async (imagesBase64: string[]) => {
        try {
            const token = localStorage.getItem('access_token');

            const response = await fetch('/api/ingest/analyze-stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ images_base64: imagesBase64 })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Analyse échouée');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('Pas de corps de réponse');
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = JSON.parse(line.slice(6)) as ProgressStep;
                        setCurrentStep(data);

                        if (data.step === 'complete' && data.result) {
                            setResult(data.result);
                            sessionStorage.setItem('analysisResult', JSON.stringify(data.result));
                            sessionStorage.removeItem('pendingDocuments');
                        } else if (data.step === 'error') {
                            setError(data.message);
                        }
                    }
                }
            }
        } catch (err: any) {
            setError(err.message || 'Analyse échouée');
        }
    };

    const handleContinue = () => {
        navigate('/review');
    };

    const handleRetry = () => {
        sessionStorage.removeItem('pendingDocuments');
        navigate('/new');
    };

    if (error) {
        return (
            <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center p-6">
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-red-100 border border-red-50 p-12 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">❌</div>
                    <h2 className="text-3xl font-black text-slate-900 mb-4">Erreur d'analyse</h2>
                    <p className="text-slate-500 font-medium mb-10">{error}</p>
                    <button
                        onClick={handleRetry}
                        className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
                    >
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }

    if (result) {
        return (
            <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center p-6">
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-100 border border-slate-50 p-12 max-w-md w-full text-center animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">✅</div>
                    <h2 className="text-3xl font-black text-slate-900 mb-6">Analyse terminée !</h2>

                    <div className="space-y-4 mb-10 p-6 bg-slate-50 rounded-2xl text-left">
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Détails de la leçon</p>
                        <p className="text-slate-700 font-black">
                            {result.title}
                        </p>
                        <div className="inline-flex px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-black rounded-full uppercase tracking-tighter">
                            {result.subject}
                        </div>
                    </div>

                    {result.math_safety_triggered && (
                        <div className="mb-8 p-4 bg-amber-50 rounded-2xl text-amber-700 text-sm font-bold border border-amber-100 flex items-center gap-3">
                            <span className="text-xl">⚠️</span>
                            Mode mathématique activé
                        </div>
                    )}

                    <button
                        onClick={handleContinue}
                        className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-100"
                    >
                        Continuer
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center p-6 text-center">
            <div className="max-w-md w-full">
                <div className="mb-12 relative">
                    <div className="w-32 h-32 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto shadow-2xl shadow-indigo-200 animate-bounce">
                        {STEP_ICONS[currentStep?.step || 'uploading'] || '⏳'}
                    </div>
                </div>

                <h2 className="text-3xl font-black text-slate-900 mb-4 animate-pulse">
                    {currentStep?.message || "Analyse en cours..."}
                </h2>
                <p className="text-slate-500 font-medium mb-12">L'intelligence artificielle transforme votre cours en quiz interactif.</p>

                {/* Progress Bar */}
                <div className="mb-12 p-1 bg-white rounded-full shadow-inner border border-slate-50">
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out rounded-full"
                            style={{ width: `${currentStep?.progress || 0}%` }}
                        />
                    </div>
                </div>

                {/* Step Indicators */}
                <div className="flex justify-between relative px-2">
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 -z-10"></div>
                    {['uploading', 'reading', 'analyzing', 'synthesizing'].map((step, i) => (
                        <div
                            key={step}
                            className={`flex flex-col items-center gap-2 transition-all duration-500 ${(currentStep?.progress || 0) >= (i + 1) * 25
                                ? 'scale-110 opacity-100'
                                : 'opacity-40 grayscale scale-90'
                                }`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${(currentStep?.progress || 0) >= (i + 1) * 25 ? 'bg-indigo-600 shadow-lg shadow-indigo-100 text-white' : 'bg-white border-2 border-slate-100 text-slate-300'}`}>
                                {STEP_ICONS[step]}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-tighter text-slate-600">{STEP_LABELS[step]}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
