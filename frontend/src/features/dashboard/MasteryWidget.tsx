import { useEffect, useState } from 'react';
import { useAuth } from '../../stores/useAuth';
import { api } from '../../lib/api';
import { Clock } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';

interface MasteryItem {
    topic: string;
    mastery_score: number;
    quizzes_count: number;
    pending_errors: number;
    status: 'LEARNING' | 'REVIEWING' | 'MASTERED';
    last_activity: string;
}

interface MasteryWidgetProps {
    learnerId?: string;
}

export function MasteryWidget({ learnerId }: MasteryWidgetProps = {}) {
    const { activeLearner } = useAuth();
    const targetId = learnerId || activeLearner?.id;
    const [stats, setStats] = useState<MasteryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!targetId) return;

        setLoading(true);
        api.get(`/quiz/stats/mastery?learner_id=${targetId}`)
            .then(res => {
                setStats(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [targetId]);

    if (!targetId) return null;

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 h-[400px] relative overflow-hidden">
                {/* Background Decorations */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl -ml-5 -mb-5"></div>

                <div className="relative z-10">
                    <Skeleton className="h-8 w-48 mb-8 bg-gray-100 dark:bg-slate-700" />
                    <div className="space-y-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex justify-between items-center">
                                <div className="space-y-2">
                                    <Skeleton className="h-5 w-32 bg-gray-100 dark:bg-slate-700" />
                                    <Skeleton className="h-3 w-20 bg-gray-50 dark:bg-slate-800" />
                                </div>
                                <Skeleton className="h-12 w-12 rounded-full bg-gray-100 dark:bg-slate-700" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (stats.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 text-center flex flex-col items-center justify-center opacity-75">
                <div className="bg-gray-100 dark:bg-slate-700 p-4 rounded-full mb-3">
                    <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-gray-900 dark:text-white font-bold mb-1">Pas encore de résultats</h3>
                <p className="text-sm text-gray-500">Termine un quiz pour voir tes statistiques !</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl -ml-5 -mb-5"></div>

            <div className="relative z-10">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-700 pb-3 mb-4">Maîtrise des Sujets 🧠</h3>

                <div className="space-y-4">
                    {stats.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group">
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{item.topic}</h4>
                                <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.last_activity ? new Date(item.last_activity).toLocaleDateString() : '—'}</span>
                                    <span>•</span>
                                    <span>{item.quizzes_count || 0} quiz</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Status Label */}
                                <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider hidden sm:block
                                    ${item.status === 'MASTERED' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                        item.status === 'REVIEWING' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                                            'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                    }
                                `}>
                                    {item.status === 'MASTERED' ? 'Maîtrisé' :
                                        item.status === 'REVIEWING' ? 'En cours' :
                                            'Débutant'}
                                </div>

                                {/* Circular Progress (Minimal CSS) */}
                                <div className="relative w-10 h-10 flex items-center justify-center">
                                    <svg className="transform -rotate-90 w-full h-full">
                                        <circle
                                            cx="20"
                                            cy="20"
                                            r="16"
                                            stroke="currentColor"
                                            strokeWidth="3"
                                            fill="transparent"
                                            className="text-gray-100 dark:text-slate-700"
                                        />
                                        <circle
                                            cx="20"
                                            cy="20"
                                            r="16"
                                            stroke="currentColor"
                                            strokeWidth="3"
                                            fill="transparent"
                                            strokeDasharray={100.5} // 2 * pi * 16
                                            strokeDashoffset={100.5 - (100.5 * item.mastery_score) / 100}
                                            className={`transition-all duration-1000 ease-out
                                                ${item.mastery_score >= 80 ? 'text-emerald-500' :
                                                    item.mastery_score >= 50 ? 'text-blue-500' :
                                                        'text-amber-500'}
                                            `}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <span className="absolute text-[9px] font-bold text-gray-600 dark:text-gray-300">{Math.round(item.mastery_score || 0)}%</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

            </div>

            <button className="w-full mt-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                Voir tous les sujets
            </button>
        </div>

    );
}
