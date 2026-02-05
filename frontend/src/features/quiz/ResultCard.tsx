import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';

interface ResultCardProps {
    score: number;
    totalQuestions: number;
    topic: string;
    onRetry: () => void;
    onNextSeries?: () => void;
    seriesInfo?: { current: number, total: number, completed?: number };
}

export function ResultCard({ score, totalQuestions, topic, onRetry, onNextSeries, seriesInfo }: ResultCardProps) {
    const percentage = Math.round((score / totalQuestions) * 100);

    useEffect(() => {
        if (percentage >= 80) {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [percentage]);

    let message = "Continue tes efforts !";
    let color = "text-orange-500";
    let bgColor = "bg-orange-50";

    // Scenario: Resuming between series (Score is 0 because not re-fetched, but we want to encourage continuing)
    const isResumingSeries = seriesInfo && seriesInfo.completed && seriesInfo.completed >= seriesInfo.current;

    if (isResumingSeries) {
        message = "Prêt pour la suite ?";
        bgColor = "bg-blue-50 dark:bg-blue-900/20";
        color = "text-blue-600 dark:text-blue-400";
    }
    else if (percentage >= 80) {
        message = "Excellent travail !";
        color = "text-green-600 dark:text-green-400";
        bgColor = "bg-green-50 dark:bg-green-900/20";
    } else if (percentage >= 50) {
        message = "Bravo, bel effort !";
        color = "text-soft-indigo dark:text-indigo-400";
        bgColor = "bg-indigo-50 dark:bg-indigo-900/20";
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl shadow-indigo-100 dark:shadow-none border border-slate-50 dark:border-slate-700 overflow-hidden max-w-xl mx-auto mt-10 p-12 text-center animate-in zoom-in-95 duration-500">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Quiz Terminé !</h2>
            <p className="text-slate-400 dark:text-slate-500 mb-10 font-bold uppercase tracking-widest text-xs">Sujet : {topic}</p>

            <div className={`mb-10 p-8 rounded-2xl ${bgColor}`}>
                <div className={`text-7xl font-black ${color} mb-4`}>{percentage}%</div>
                <p className="text-slate-700 dark:text-slate-300 text-xl font-semibold">{score} sur {totalQuestions} corrects</p>
                <p className={`text-lg mt-3 font-medium ${color}`}>{message}</p>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                    onClick={onRetry}
                    className="flex-1 inline-flex justify-center items-center px-6 py-3 border-2 border-soft-indigo dark:border-indigo-500 text-soft-indigo dark:text-indigo-400 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 font-bold transition-all"
                >
                    Recommencer
                </button>

                {onNextSeries && seriesInfo && seriesInfo.current < seriesInfo.total && (
                    <button
                        onClick={onNextSeries}
                        className="flex-1 inline-flex justify-center items-center px-6 py-3 border-2 border-transparent bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-md shadow-indigo-200 dark:shadow-none transition-all animate-pulse"
                    >
                        Suite (Partie {seriesInfo.current + 1}/{seriesInfo.total})
                    </button>
                )}
                <Link
                    to="/dashboard"
                    className="flex-1 inline-flex justify-center items-center px-6 py-3 border-2 border-transparent bg-soft-indigo dark:bg-indigo-600 text-white rounded-xl hover:opacity-90 font-bold shadow-md shadow-indigo-200 dark:shadow-none transition-all"
                >
                    Tableau de bord
                </Link>
            </div>
        </div>
    );
}
