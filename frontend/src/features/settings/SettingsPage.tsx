import { useForm } from 'react-hook-form';
import { useAuth } from '../../stores/useAuth';
import { api } from '../../lib/api';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';


interface SettingsForm {
    openrouter_api_key: string;
}

interface ValidationStatus {
    valid: boolean;
    error?: string;
}

export const SettingsPage = () => {
    const { user, checkAuth } = useAuth();
    const navigate = useNavigate();
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [validationStatus, setValidationStatus] = useState<ValidationStatus | null>(null);
    const [isValidating, setIsValidating] = useState(false);

    const { register, handleSubmit, formState: { isSubmitting } } = useForm<SettingsForm>({
        defaultValues: {
            openrouter_api_key: user?.openrouter_api_key || ''
        }
    });

    // Check validation status on mount if key exists
    useEffect(() => {
        if (user?.openrouter_api_key) {
            validateApiKey();
        }
    }, []);

    const validateApiKey = async () => {
        setIsValidating(true);
        try {
            const response = await api.get<ValidationStatus>('/auth/validate-api-key');
            setValidationStatus(response.data);
        } catch (err) {
            setValidationStatus({ valid: false, error: 'Failed to validate' });
        } finally {
            setIsValidating(false);
        }
    };

    const onSubmit = async (data: SettingsForm) => {
        try {
            await api.patch('/auth/users/me', data);
            await checkAuth();
            setSuccessMessage("API Key saved successfully!");
            setTimeout(() => setSuccessMessage(null), 3000);
            // Validate after save
            if (data.openrouter_api_key) {
                validateApiKey();
            } else {
                setValidationStatus(null);
            }
        } catch (err) {
            console.error("Failed to update settings", err);
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Paramètres</h1>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/parent-hub')}
                    className="inline-flex items-center px-6 py-3 bg-white border-2 border-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 hover:border-slate-200 transition-all shadow-sm"
                >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Retour
                </motion.button>

            </div>

            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-50 overflow-hidden">
                <div className="p-8 md:p-12">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900">Configuration IA</h3>
                            <p className="text-slate-500 font-medium">Configurez l'intelligence artificielle pour activer les fonctions de révision.</p>
                        </div>
                    </div>

                    {validationStatus && (
                        <div className={`mb-8 p-4 rounded-2xl border-2 ${validationStatus.valid ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                            <div className="flex items-center">
                                {validationStatus.valid ? (
                                    <>
                                        <div className="p-2 bg-emerald-500 rounded-lg text-white mr-3">
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                                            </svg>
                                        </div>
                                        <span className="text-emerald-700 font-black uppercase tracking-wider text-sm">Clé API Valide</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="p-2 bg-red-500 rounded-lg text-white mr-3">
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path>
                                            </svg>
                                        </div>
                                        <span className="text-red-700 font-black uppercase tracking-wider text-sm">
                                            {validationStatus.error === 'Failed to validate' ? 'Erreur de connexion' : 'Clé API Invalide'}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div>
                            <label htmlFor="api_key" className="block text-sm font-bold text-slate-700 mb-2 ml-1 uppercase tracking-wider">Clé API OpenRouter</label>
                            <div className="flex flex-col md:flex-row gap-4">
                                <input
                                    type="password"
                                    id="api_key"
                                    {...register('openrouter_api_key')}
                                    className="flex-1 px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all font-bold outline-none text-slate-900 placeholder:text-slate-300"
                                    placeholder="sk-or-v1-..."
                                />
                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="inline-flex items-center px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 active:scale-95 whitespace-nowrap"
                                    >
                                        {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={validateApiKey}
                                        disabled={isValidating}
                                        className="inline-flex items-center px-8 py-4 bg-white border-2 border-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-50 transition-all disabled:opacity-50 active:scale-95 whitespace-nowrap"
                                    >
                                        {isValidating ? 'Test en cours...' : 'Tester la connexion'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>

                    {successMessage && (
                        <div className="mt-6 flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 py-3 px-5 rounded-xl border border-emerald-100 animate-in slide-in-from-top-2">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                            Clé API enregistrée avec succès !
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

