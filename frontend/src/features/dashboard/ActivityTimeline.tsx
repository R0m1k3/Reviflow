import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Clock, BookOpen, CheckCircle, Calendar } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';

interface ActivityItem {
    type: 'REVISION' | 'QUIZ';
    id: string;
    revision_id?: string;
    topic: string;
    created_at: string;
    minutes: number;
    details: string;
}

interface DailyActivity {
    date: string; // YYYY-MM-DD
    total_minutes: number;
    items: ActivityItem[];
}

interface ActivityStats {
    summary: {
        today_minutes: number;
        week_minutes: number;
        total_quizzes: number;
        total_revisions: number;
    };
    history: DailyActivity[];
}

interface ActivityTimelineProps {
    learnerId?: string;
}

export function ActivityTimeline({ learnerId }: ActivityTimelineProps) {
    const [data, setData] = useState<ActivityStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const url = learnerId
            ? `/quiz/stats/activity?learner_id=${learnerId}`
            : `/quiz/stats/activity`;

        api.get(url)
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch activity stats", err);
                setLoading(false);
            });
    }, [learnerId]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex gap-4">
                    <Skeleton className="h-24 flex-1 rounded-2xl" />
                    <Skeleton className="h-24 flex-1 rounded-2xl" />
                </div>
                <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
        );
    }

    if (!data || !data.summary) return <div className="text-center py-8 text-slate-400">Aucune donnée disponible</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl text-center border border-indigo-100 dark:border-indigo-900/30">
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Aujourd'hui</p>
                    <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{data.summary.today_minutes} <span className="text-sm font-bold opacity-70">min</span></p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl text-center border border-emerald-100 dark:border-emerald-900/30">
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Cette semaine</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{data.summary.week_minutes} <span className="text-sm font-bold opacity-70">min</span></p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl text-center border border-amber-100 dark:border-amber-900/30">
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">Total Quiz</p>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{data.summary.total_quizzes}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-center border border-blue-100 dark:border-blue-900/30">
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Total Révisions</p>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{data.summary.total_revisions}</p>
                </div>
            </div>

            {/* Timeline */}
            <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    Historique
                </h3>

                <div className="max-h-[400px] overflow-y-auto pr-4 custom-scrollbar scroll-smooth">
                    <div className="space-y-8 pl-4 border-l-2 border-slate-100 ml-2">
                        {data.history.map((day) => (
                            <div key={day.date} className="relative">
                                {/* Date Marker */}
                                <div className="absolute -left-[21px] top-0 w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900"></div>

                                <div className="mb-4">
                                    <h4 className="font-extrabold text-slate-700 dark:text-slate-300 capitalize">
                                        {new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </h4>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{day.total_minutes} min d'activité</p>
                                </div>

                                <div className="space-y-3">
                                    {day.items.map((item, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                if (item.type === 'REVISION') {
                                                    // Assuming we have useNavigate or just window.location for now, 
                                                    // but let's use a simple anchor or navigate prop if passed, 
                                                    // defaulting to direct window location as fail safe or refactor to useLink
                                                    window.location.href = `/revision/${item.id}`;
                                                }
                                            }}
                                            className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-lg shadow-sm flex items-center gap-4 hover:border-slate-300 dark:hover:border-slate-600 transition-colors ${item.type === 'REVISION' ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50' : ''}`}
                                        >
                                            <div className={`p-3 rounded-md ${item.type === 'QUIZ' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'}`}>
                                                {item.type === 'QUIZ' ? <CheckCircle className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-slate-900 dark:text-slate-200">{item.topic}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{item.details}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-slate-900 dark:text-slate-200 text-sm">{new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-end gap-1">
                                                    <Clock className="w-3 h-3" /> {item.minutes} min
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {data.history.length === 0 && (
                            <div className="text-center py-8 text-slate-400 italic">
                                Aucune activité récente.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
