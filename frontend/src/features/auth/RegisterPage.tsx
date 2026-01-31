import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../stores/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';

const registerSchema = z.object({
    email: z.string().email("Adresse email invalide"),
    password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
    confirmPassword: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export const RegisterPage = () => {
    const { register: registerUser, login } = useAuth();
    const navigate = useNavigate();
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema)
    });

    const onSubmit = async (data: RegisterForm) => {
        try {
            setGlobalError(null);
            await registerUser({ email: data.email, password: data.password });
            setSuccess(true);
            // Auto-login after successful registration
            await login({ email: data.email, password: data.password });
            navigate('/');
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            if (Array.isArray(detail)) {
                setGlobalError(detail.map((e: any) => `${e.loc.join('.')}: ${e.msg}`).join(', '));
            } else {
                setGlobalError(detail || "Échec de l'inscription. Cet email est peut-être déjà utilisé.");
            }
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FDFCF8] to-[#F1F5F9] p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">
                        Créer un compte
                    </h2>
                    <p className="mt-3 text-slate-500 font-medium">
                        Ou{' '}
                        <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-700 underline-offset-4 hover:underline">
                            connectez-vous à votre compte existant
                        </Link>
                    </p>
                </div>

                <div className="bg-white/80 backdrop-blur-xl border border-white/20 py-8 px-6 shadow-2xl shadow-indigo-100 sm:rounded-3xl sm:px-12">
                    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                        {globalError && (
                            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm font-medium flex items-center">
                                <span className="mr-2">⚠️</span> {globalError}
                            </div>
                        )}
                        {success && (
                            <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-4 rounded-xl text-sm font-medium flex items-center">
                                <span className="mr-2">✅</span> Compte créé avec succès ! Connexion en cours...
                            </div>
                        )}

                        <div className="space-y-1">
                            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 ml-1">
                                Adresse Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                placeholder="michael@exemple.com"
                                {...register('email')}
                                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                            />
                            {errors.email && <p className="text-red-500 text-xs font-medium mt-1 ml-1">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 ml-1">
                                Mot de passe
                            </label>
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                {...register('password')}
                                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                            />
                            {errors.password && <p className="text-red-500 text-xs font-medium mt-1 ml-1">{errors.password.message}</p>}
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 ml-1">
                                Confirmer le mot de passe
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                {...register('confirmPassword')}
                                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                            />
                            {errors.confirmPassword && <p className="text-red-500 text-xs font-medium mt-1 ml-1">{errors.confirmPassword.message}</p>}
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-12 flex items-center justify-center rounded-2xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                            >
                                {isSubmitting ? 'Création en cours...' : 'Créer mon accès parent'}
                            </button>
                        </div>
                    </form>
                </div>

                <p className="mt-8 text-center text-xs text-slate-400">
                    &copy; 2026 Reviflow. Tous droits réservés.
                </p>
            </div>
        </div>
    );
};
