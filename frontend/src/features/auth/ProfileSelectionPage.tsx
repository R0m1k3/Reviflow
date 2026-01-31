import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../stores/useAuth';
import { UserPlus, Sparkles, LogOut, X } from 'lucide-react';
import { AvatarSelector } from './AvatarSelector';
import { Skeleton } from '../../components/ui/Skeleton';

export const ProfileSelectionPage: React.FC = () => {
    const { user, learnerProfiles, fetchProfiles, selectProfile, createChildAccount, logout } = useAuth();
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = React.useState(false);
    const [newProfileName, setNewProfileName] = React.useState('');
    const [newProfilePin, setNewProfilePin] = React.useState('1234');
    const [newProfileAvatar, setNewProfileAvatar] = React.useState('https://api.dicebear.com/7.x/fun-emoji/svg?seed=Felix');

    useEffect(() => {
        fetchProfiles();
    }, []);

    const handleCreate = async () => {
        if (!newProfileName.trim()) return;
        try {
            await createChildAccount({
                username: newProfileName.toLowerCase().replace(/\s/g, ''),
                password: newProfilePin,
                first_name: newProfileName,
                avatar_url: newProfileAvatar
            });
            setIsCreating(false);
            setNewProfileName('');
        } catch (err) {
            alert("Erreur lors de la création");
        }
    };

    const handleSelect = async (id: string) => {
        try {
            await selectProfile(id);
            navigate('/dashboard');
        } catch (err) {
            console.error("Selection failed", err);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-200/20 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="w-full max-w-5xl relative z-10">
                <div className="text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 border border-indigo-100 rounded-full mb-6 shadow-sm">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        <span className="text-sm font-semibold text-indigo-600 tracking-wide uppercase">Reviflow</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
                        Quel enfant va réviser <span className="text-indigo-600 italic">aujourd'hui ?</span>
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto font-medium">
                        Bonjour {user?.first_name || 'Parent'}. Sélectionnez le profil de votre enfant pour commencer la session.
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {learnerProfiles.length === 0 ? (
                        // Skeleton Loading State
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex flex-col items-center">
                                <Skeleton className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl mb-4" />
                                <Skeleton className="h-6 w-24 rounded-full" />
                            </div>
                        ))
                    ) : (
                        learnerProfiles.map((profile, idx) => (
                            <button
                                key={profile.id}
                                onClick={() => handleSelect(profile.id)}
                                style={{ animationDelay: `${idx * 100}ms` }}
                                className="group flex flex-col items-center animate-in fade-in zoom-in-95 duration-500 fill-mode-backwards"
                            >
                                <div className="relative mb-4">
                                    <div className="absolute inset-0 bg-indigo-500 rounded-3xl blur-[20px] opacity-0 group-hover:opacity-40 transition-opacity duration-500"></div>
                                    <div className="relative w-32 h-32 sm:w-40 sm:h-40 bg-white rounded-3xl shadow-xl border-4 border-white group-hover:border-indigo-100 transition-all duration-500 overflow-hidden ring-1 ring-black/5">
                                        {profile.avatar_url ? (
                                            <img src={profile.avatar_url} alt={profile.first_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                                                <span className="text-4xl font-bold text-indigo-300">
                                                    {profile.first_name.charAt(0)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-white rounded-xl p-2 shadow-lg border border-gray-100 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                                        <Sparkles className="w-4 h-4 text-indigo-500" />
                                    </div>
                                </div>
                                <span className="text-xl font-bold text-gray-800 group-hover:text-indigo-600 transition-colors uppercase tracking-wide">
                                    {profile.first_name}
                                </span>
                            </button>
                        ))
                    )}

                    {/* Add Profile Placeholder */}
                    <button
                        onClick={() => setIsCreating(true)}
                        className="group flex flex-col items-center animate-in fade-in zoom-in-95 duration-500 fill-mode-backwards"
                        style={{ animationDelay: `${learnerProfiles.length * 100}ms` }}
                    >
                        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl border-4 border-dashed border-gray-300 group-hover:border-indigo-300 group-hover:bg-indigo-50 transition-all duration-500 flex items-center justify-center mb-4">
                            <UserPlus className="w-10 h-10 text-gray-400 group-hover:text-indigo-400 transition-colors" />
                        </div>
                        <span className="text-xl font-bold text-gray-400 group-hover:text-indigo-400 transition-colors uppercase tracking-wide">
                            Nouveau
                        </span>
                    </button>
                </div>

                <div className="mt-20 flex justify-center">
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 px-6 py-3 text-gray-500 hover:text-indigo-600 font-semibold transition-colors duration-300 hover:bg-white/50 rounded-2xl"
                    >
                        <LogOut className="w-5 h-5" />
                        Se déconnecter
                    </button>
                </div>
            </div>

            {/* Create Profile Modal */}
            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setIsCreating(false)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <UserPlus className="w-6 h-6 text-indigo-500" />
                            Nouveau Profil
                        </h2>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Prénom</label>
                                <input
                                    type="text"
                                    value={newProfileName}
                                    onChange={(e) => setNewProfileName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold outline-none"
                                    placeholder="Ex: Léo"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Code PIN (4 chiffres)</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={4}
                                    value={newProfilePin}
                                    onChange={(e) => setNewProfilePin(e.target.value.replace(/\D/g, ''))}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono text-center text-2xl tracking-[0.5em] font-bold outline-none"
                                    placeholder="1234"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Avatar</label>
                                <div className="bg-gray-50 rounded-2xl border-2 border-gray-100 p-2">
                                    <AvatarSelector
                                        selectedAvatar={newProfileAvatar}
                                        onSelect={setNewProfileAvatar}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleCreate}
                                disabled={!newProfileName.trim()}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]"
                            >
                                Créer le profil
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
