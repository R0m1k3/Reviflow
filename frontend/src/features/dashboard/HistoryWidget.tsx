import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../stores/useAuth';
import { Skeleton } from '../../components/ui/Skeleton';

interface Score {
    id: string;
    topic: string;
    score: number;
    total_questions: number;
    created_at: string;
    revision_id?: string;
}

export function HistoryWidget() {
    const [history, setHistory] = useState<Score[]>([]);
    const [loading, setLoading] = useState(true);

    const { activeLearner } = useAuth();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const params = activeLearner ? { learner_id: activeLearner.id } : {};
                const response = await api.get<Score[]>('/quiz/history', { params });
                setHistory(response.data);
            } catch (error) {
                console.error("Failed to load history", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [activeLearner]);

    if (loading) {
        return (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg h-64 p-6">
                <div className="flex justify-between items-center mb-6">
                    <Skeleton className="h-6 w-32 bg-gray-100" />
                    <Skeleton className="h-4 w-16 bg-gray-100" />
                </div>
                <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex justify-between items-center">
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-48 bg-gray-100" />
                                <Skeleton className="h-3 w-24 bg-gray-50" />
                            </div>
                            <Skeleton className="h-10 w-10 rounded-full bg-gray-100" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-100/50 border border-slate-50 h-[400px] flex flex-col items-center justify-center p-10 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl mb-6">📚</div>
                <p className="text-slate-900 font-black text-xl mb-2">Aucune révision pour le moment</p>
                <p className="text-slate-400 font-medium">Scannez un cours pour commencer à apprendre !</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-100/50 border border-slate-50 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Révisions Récentes</h3>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-black rounded-full">Total: {history.length}</span>
            </div>
            <div className="max-h-[330px] overflow-y-auto scrollbar-hide">
                <ul className="divide-y divide-slate-50">
                    {history.map((item) => (
                        <li key={item.id} className="px-8 py-5 hover:bg-slate-50 transition-colors group">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <p className="text-lg font-black text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight">{item.topic}</p>
                                    <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-2 uppercase tracking-widest">
                                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    {item.revision_id && (
                                        <Link
                                            to={`/revision/${item.revision_id}`}
                                            className="hidden group-hover:block px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors"
                                        >
                                            Revoir
                                        </Link>
                                    )}
                                    <div className={`flex items-center justify-center w-14 h-14 rounded-2xl border-4 text-sm font-black transition-all group-hover:scale-110 ${(item.score / item.total_questions) >= 0.8 ? 'border-emerald-100 text-emerald-600 bg-emerald-50 shadow-lg shadow-emerald-100/50' :
                                        (item.score / item.total_questions) >= 0.5 ? 'border-amber-100 text-amber-600 bg-amber-50 shadow-lg shadow-amber-100/50' :
                                            'border-red-100 text-red-600 bg-red-50 shadow-lg shadow-red-100/50'
                                        }`}>
                                        {item.score}/{item.total_questions}
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
