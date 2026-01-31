import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../stores/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';

const loginSchema = z.object({
    identifier: z.string().min(1, "L'identifiant ou l'email est requis"),
    password: z.string().min(4, "Le mot de passe/PIN doit contenir au moins 4 chiffres"),
});

type LoginForm = z.infer<typeof loginSchema>;

export const LoginPage = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [isParentMode, setIsParentMode] = useState(true);
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const { register, handleSubmit, formState: { errors, isSubmitting }, clearErrors } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema)
    });

    const toggleMode = (mode: boolean) => {
        setIsParentMode(mode);
        setGlobalError(null);
        clearErrors();
    };

    const onSubmit = async (data: LoginForm) => {
        console.log("DEBUG: Login form submitted", data);
        try {
            setGlobalError(null);
            const loginData = isParentMode
                ? { email: data.identifier, password: data.password }
                : { username: data.identifier, password: data.password };

            console.log("DEBUG: Calling login with", loginData);
            await login(loginData);
            console.log("DEBUG: Login successful, navigating");
            navigate('/');
        } catch (err) {
            console.error("DEBUG: Login error caught in component", err);
            setGlobalError("Identifiants invalides ou erreur de connexion");
        }
    };

    const onError = (errors: any) => {
        console.log("DEBUG: Form validation failed", errors);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FDFCF8] to-[#F1F5F9] p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center p-3 mb-4 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200">
                        <Lock className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">
                        Reviflow
                    </h2>
                    <p className="mt-3 text-slate-500 font-medium">
                        Heureux de vous revoir ! Connectez-vous.
                    </p>
                </div>

                <div className="bg-white/80 backdrop-blur-xl border border-white/20 py-8 px-6 shadow-2xl shadow-indigo-100 sm:rounded-3xl sm:px-12">
                    {/* Role Toggle */}
                    <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
                        <button
                            type="button"
                            onClick={() => toggleMode(true)}
                            className={`flex-1 py-2 px-4 text-sm font-bold rounded-lg transition-all ${isParentMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Parent
                        </button>
                        <button
                            type="button"
                            onClick={() => toggleMode(false)}
                            className={`flex-1 py-2 px-4 text-sm font-bold rounded-lg transition-all ${!isParentMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Apprenti
                        </button>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit(onSubmit, onError)}>
                        {globalError && (
                            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm font-medium flex items-center">
                                <span className="mr-2">⚠️</span> {globalError}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label htmlFor="identifier" className="block text-sm font-semibold text-slate-700 ml-1">
                                {isParentMode ? 'Adresse Email' : 'Identifiant'}
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                    {isParentMode ? <Mail className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                                </div>
                                <input
                                    id="identifier"
                                    type={isParentMode ? "email" : "text"}
                                    placeholder={isParentMode ? "michael@exemple.com" : "Nom d'apprenti"}
                                    {...register('identifier')}
                                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 sm:text-sm"
                                />
                            </div>
                            {errors.identifier && <p className="text-red-500 text-xs font-medium mt-1 ml-1">{errors.identifier.message}</p>}
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 ml-1">
                                {isParentMode ? 'Mot de passe' : 'Code PIN'}
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder={isParentMode ? "••••••••" : "••••"}
                                    {...register('password')}
                                    className="block w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 sm:text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-red-500 text-xs font-medium mt-1 ml-1">{errors.password.message}</p>}
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-12 flex items-center justify-center rounded-2xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    'Se connecter'
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-100">
                        <p className="text-center text-sm text-slate-500">
                            Pas encore de compte ?{' '}
                            <Link to="/register" className="font-bold text-indigo-600 hover:text-indigo-700">
                                Créer un accès parent
                            </Link>
                        </p>
                    </div>
                </div>

                <p className="mt-8 text-center text-xs text-slate-400">
                    &copy; 2026 Reviflow. Tous droits réservés.
                </p>
            </div>
        </div>
    );
};
