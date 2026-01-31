import { useEffect, useState } from 'react';
import { useAuth } from '../stores/useAuth';
import { Users, Plus, TrendingUp, Settings as SettingsIcon, LogOut, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { MasteryWidget } from '../features/dashboard/MasteryWidget';
import { ActivityTimeline } from '../features/dashboard/ActivityTimeline';

export const ParentHubPage = () => {
    const [isCreating, setIsCreating] = useState(false);
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null); // For modal
    const [newProfileName, setNewProfileName] = useState('');
    const [newProfileUsername, setNewProfileUsername] = useState('');
    const [newProfilePin, setNewProfilePin] = useState('');
    const { user, fetchProfiles, learnerProfiles, logout, createChildAccount } = useAuth();
    const [stats, setStats] = useState({ total_tokens: 0, total_cost: 0 });
    const navigate = useNavigate();

    useEffect(() => {
        fetchProfiles();

        // Fetch Children Usage Stats
        const fetchUsage = async () => {
            if (!user) return;
            try {
                const res = await api.get('/auth/children');
                const children = res.data;

                let tokens = user.total_tokens_used || 0;
                let cost = user.total_cost_usd || 0;

                children.forEach((child: any) => {
                    tokens += child.total_tokens_used || 0;
                    cost += child.total_cost_usd || 0;
                });

                setStats({
                    total_tokens: tokens,
                    total_cost: cost
                });
            } catch (err) {
                console.error("Failed to fetch children usage", err);
            }
        };

        fetchUsage();
    }, [user, fetchProfiles]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleCreate = async () => {
        if (!newProfileName.trim() || !newProfileUsername.trim()) return;
        try {
            await createChildAccount({
                username: newProfileUsername,
                password: newProfilePin,
                first_name: newProfileName,
                avatar_url: `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${newProfileName}`
            });
            setIsCreating(false);
            setNewProfileName('');
            setNewProfileUsername('');
            setNewProfilePin('');
        } catch (err) {
            alert("Erreur lors de la création du compte enfant");
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFCF8] flex flex-col">
            {/* Navigation */}
            <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <Link to="/parent-hub" className="flex items-center group">
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white mr-3 shadow-indigo-100 shadow-lg group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                    </svg>
                                </div>
                                <span className="text-xl font-black tracking-tight text-gray-900">Reviflow</span>
                            </Link>

                            <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
                                <Link to="/parent-hub" className="flex items-center gap-2 px-3 py-2 text-indigo-600 bg-indigo-50 rounded-lg text-sm font-bold transition-all">
                                    <Users className="w-4 h-4" />
                                    Espace Parent
                                </Link>
                                <Link to="/settings" className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition-all">
                                    <SettingsIcon className="w-4 h-4" />
                                    Paramètres
                                </Link>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 pl-4 border-l border-gray-100">
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-900 leading-none mb-1">{user?.first_name || 'Parent'}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Administrateur</p>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                <header className="mb-10">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Bonjour, {user?.first_name || 'Parent'} ! 👋</h1>
                    <p className="text-slate-500 mt-2 text-lg font-medium">Suivez les progrès de vos apprentis en toute sérénité.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-50">
                        <div className="flex items-center space-x-4">
                            <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Apprentis</p>
                                <p className="text-3xl font-black text-slate-900">{learnerProfiles.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-50">
                        <div className="flex items-center space-x-4">
                            <div className="p-4 bg-amber-50 rounded-2xl text-amber-600">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Jetons AI</p>
                                <p className="text-3xl font-black text-slate-900">{stats.total_tokens.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-50">
                        <div className="flex items-center space-x-4">
                            <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600">
                                <div className="h-6 w-6 font-black flex items-center justify-center">€</div>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Coût estimé</p>
                                <p className="text-3xl font-black text-slate-900">{stats.total_cost.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight border-b-4 border-indigo-100 pb-1">Mes Apprentis</h2>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 hover:-translate-y-1 active:scale-95"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Nouvel accès enfant
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {learnerProfiles.map(child => (
                        <div key={child.id} className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-50 hover:shadow-2xl hover:shadow-indigo-100 transition-all group">
                            <div className="flex items-center space-x-5 mb-6">
                                <div className="h-16 w-16 rounded-[1.5rem] bg-indigo-50 border-2 border-white shadow-md flex items-center justify-center text-2xl font-black text-indigo-400 overflow-hidden group-hover:scale-110 transition-transform">
                                    {child.avatar_url && child.avatar_url.startsWith('http') ? (
                                        <img src={child.avatar_url} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-4xl">{child.avatar_url || child.first_name[0].toUpperCase()}</span>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">{child.first_name}</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Niveau {child.level || 1}</p>
                                </div>
                            </div>
                            <div className="space-y-4 pt-6 border-t border-slate-100">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-500">Série actuelle</span>
                                    <span className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-black rounded-full border border-orange-100">
                                        {child.streak_current || 0} JOURS 🔥
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">Expérience</span>
                                    <span className="font-bold text-slate-900">{child.xp || 0} XP</span>
                                </div>
                                <button
                                    onClick={() => setSelectedChildId(child.id)}
                                    className="w-full py-4 mt-2 bg-slate-50 text-slate-600 font-bold rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-95"
                                >
                                    Détails de progression
                                </button>
                            </div>
                        </div>
                    ))}

                    {learnerProfiles.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-[3rem] border-4 border-dashed border-slate-100">
                            <div className="p-6 bg-white rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-lg">
                                <Users className="h-12 w-12 text-slate-200" />
                            </div>
                            <p className="text-slate-400 text-lg font-bold">Aucun compte apprenti créé pour le moment.</p>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="mt-6 text-indigo-600 font-black text-lg hover:underline underline-offset-8"
                            >
                                Créer maintenant →
                            </button>
                        </div>
                    )}
                </div>

                {/* Create Profile Modal */}
                {isCreating && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 relative animate-in zoom-in-95 duration-300">
                            <button
                                onClick={() => setIsCreating(false)}
                                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>

                            <h2 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-xl">
                                    <Plus className="w-6 h-6 text-indigo-600" />
                                </div>
                                Nouvel Apprenti
                            </h2>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 ml-1 uppercase tracking-wider">Prénom de l'enfant</label>
                                    <input
                                        type="text"
                                        value={newProfileName}
                                        onChange={(e) => setNewProfileName(e.target.value)}
                                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all font-bold outline-none text-slate-900 placeholder:text-slate-300"
                                        placeholder="Ex: Léo"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 ml-1 uppercase tracking-wider">Identifiant (Login)</label>
                                    <input
                                        type="text"
                                        value={newProfileUsername}
                                        onChange={(e) => setNewProfileUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all font-bold outline-none text-slate-900 placeholder:text-slate-300"
                                        placeholder="leo2026"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-2 ml-1 font-bold uppercase tracking-widest">Utilisé pour se connecter sans email</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 ml-1 uppercase tracking-wider">Code PIN ou Mot de passe (4+ car.)</label>
                                    <input
                                        type="text"
                                        value={newProfilePin}
                                        onChange={(e) => setNewProfilePin(e.target.value)}
                                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all font-bold text-center text-3xl tracking-widest outline-none text-indigo-600"
                                        placeholder="1234"
                                    />
                                </div>

                                <button
                                    onClick={handleCreate}
                                    disabled={!newProfileName.trim() || !newProfileUsername.trim() || newProfilePin.length < 4}
                                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-black rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] mt-4"
                                >
                                    Créer le compte
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats Modal */}
                {selectedChildId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl p-8 relative animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                            <button
                                onClick={() => setSelectedChildId(null)}
                                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <h2 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3">
                                📊 Progression
                            </h2>

                            <MasteryWidget learnerId={selectedChildId} />

                            <div className="my-8 border-t border-slate-100"></div>

                            <ActivityTimeline learnerId={selectedChildId} />

                            <div className="mt-8 text-center">
                                <button
                                    onClick={() => setSelectedChildId(null)}
                                    className="text-slate-500 font-bold hover:text-slate-800"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <footer className="mt-auto py-12 border-t border-slate-100 bg-white">
                <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
                        <span className="text-slate-400 font-black uppercase tracking-widest text-sm">Reviflow &copy; 2026</span>
                    </div>
                    <div className="flex gap-10">
                        <a href="#" className="text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-indigo-600 transition-colors">Documentation</a>
                        <a href="#" className="text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-indigo-600 transition-colors">Privacy</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};
