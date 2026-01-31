import React, { useState } from 'react';
import { motion } from 'framer-motion';

import { useAuth } from '../../stores/useAuth';
import { Lock, ShieldCheck, AlertCircle } from 'lucide-react';

interface ParentalGateProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export const ParentalGate: React.FC<ParentalGateProps> = ({ onSuccess, onCancel }) => {
    const { user, verifyParentalGate } = useAuth();
    const [pin, setPin] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mode, setMode] = useState<'pin' | 'password'>(user?.has_parental_pin ? 'pin' : 'password');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            await verifyParentalGate(mode === 'pin' ? { pin } : { password });
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Vérification échouée');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-md bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                <div className="p-8">
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-indigo-50 rounded-full">
                            <Lock className="w-8 h-8 text-indigo-600" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
                        Accès Parent Requis
                    </h2>
                    <p className="text-center text-gray-600 mb-8 px-4">
                        Veuillez entrer votre {mode === 'pin' ? 'code PIN' : 'mot de passe'} pour accéder aux paramètres.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {mode === 'pin' ? (
                            <div className="flex justify-center space-x-3">
                                <input
                                    type="password"
                                    maxLength={4}
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    className="w-32 text-center text-3xl tracking-[0.5em] font-mono border-b-2 border-indigo-200 focus:border-indigo-600 outline-none bg-transparent py-2 transition-colors uppercase"
                                    placeholder="••••"
                                    autoFocus
                                    disabled={isSubmitting}
                                />
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-900"
                                    placeholder="Mot de passe du compte parent"
                                    autoFocus
                                    disabled={isSubmitting}
                                />
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg animate-in slide-in-from-top-2">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                        )}

                        <div className="flex flex-col gap-3 pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-5 h-5" />
                                        Confirmer
                                    </>
                                )}
                            </button>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                onClick={onCancel}
                                disabled={isSubmitting}
                                className="w-full py-2 text-sm font-black text-gray-500 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                            >
                                Retour
                            </motion.button>

                        </div>
                    </form>

                    {user?.has_parental_pin && (
                        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center">
                            <button
                                type="button"
                                onClick={() => setMode(mode === 'pin' ? 'password' : 'pin')}
                                className="text-xs font-semibold text-indigo-600 hover:underline uppercase tracking-wider"
                            >
                                Utiliser le {mode === 'pin' ? 'mot de passe' : 'code PIN'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
