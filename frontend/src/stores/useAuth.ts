import { create } from 'zustand';
import { api } from '../lib/api';

interface User {
    id: string;
    email: string;
    username?: string;
    is_active: boolean;
    is_superuser: boolean;
    role: 'parent' | 'learner';
    first_name?: string;
    openrouter_api_key?: string;
    total_tokens_used?: number;
    total_cost_usd?: number;
    parent_id?: string;
    has_parental_pin?: boolean;
    learner_profile?: LearnerProfile;
}

interface LearnerProfile {
    id: string;
    first_name: string;
    avatar_url: string | null;
    streak_current?: number;
    streak_max?: number;
    xp?: number;
    level?: number;
    badges?: Badge[];
}

export interface Badge {
    id: string;
    badge_code: string;
    earned_at: string;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isParentalModeActive: boolean;
    learnerProfiles: LearnerProfile[];
    activeLearner: LearnerProfile | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (credentials: any) => Promise<void>;
    register: (credentials: any) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: (refresh?: boolean) => Promise<void>;
    verifyParentalGate: (pinOrPassword: { pin?: string; password?: string }) => Promise<void>;
    fetchProfiles: () => Promise<void>;
    selectProfile: (learnerId: string) => Promise<void>;
    updateProfile: (data: { first_name?: string; avatar_url?: string }) => Promise<void>;
    createChildAccount: (data: { username: string; password?: string; first_name: string; avatar_url: string }) => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
    user: null,
    isAuthenticated: false,
    isParentalModeActive: false,
    learnerProfiles: [],
    activeLearner: null,
    isLoading: true,
    error: null,

    login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
            // 1. Login (Get Token/Cookie)
            const formData = new URLSearchParams();
            // In our system, 'username' in credentials can be Email OR Username
            formData.append('username', credentials.username || credentials.email);
            formData.append('password', credentials.password);

            const loginResponse = await api.post('/auth/jwt/login', formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            // Store the JWT token
            const token = loginResponse.data.access_token;
            if (token) {
                localStorage.setItem('access_token', token);
            }

            // 2. Fetch User Profile
            const userResponse = await api.get<User>('/auth/users/me');
            const user = userResponse.data;

            set({ user, isAuthenticated: true, isLoading: false, isParentalModeActive: user.role === 'parent' });

            // 3. Auto-select profile if it's a learner
            if (user.role === 'learner' && user.learner_profile) {
                set({ activeLearner: user.learner_profile });
                localStorage.setItem('active_learner_id', user.learner_profile.id);
            } else {
                // If parent, fetch all supervised child profiles
                await get().fetchProfiles();
            }
        } catch (err: any) {
            set({ error: 'Invalid credentials', isLoading: false });
            throw err;
        }
    },

    register: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
            await api.post('/auth/register', {
                email: credentials.email,
                password: credentials.password,
                role: 'parent'
            });
            // Auto-login after register would happen here if desired
            set({ isLoading: false });
        } catch (err: any) {
            set({ error: err.response?.data?.detail || 'Registration failed', isLoading: false });
            throw err;
        }
    },

    logout: async () => {
        localStorage.removeItem('access_token');
        set({ user: null, isAuthenticated: false, activeLearner: null });
    },

    checkAuth: async (refresh = false) => {
        if (!refresh) set({ isLoading: true });
        try {
            const userResponse = await api.get<User>('/auth/users/me');
            const user = userResponse.data;
            set({ user, isAuthenticated: true, isParentalModeActive: user.role === 'parent' });

            if (user.role === 'learner' && user.learner_profile) {
                set({ activeLearner: user.learner_profile });
            } else {
                // Restore profiles for parent
                const profileResponse = await api.get<LearnerProfile[]>('/auth/profiles');
                const profiles = profileResponse.data;
                set({ learnerProfiles: profiles });

                // Restore active learner from localStorage (if parent previously selected one)
                const storedLearnerId = localStorage.getItem('active_learner_id');
                if (storedLearnerId) {
                    const active = profiles.find(p => p.id === storedLearnerId);
                    if (active) {
                        set({ activeLearner: active });
                    }
                }
            }
            if (!refresh) set({ isLoading: false });
        } catch (err) {
            set({ user: null, isAuthenticated: false, isLoading: false, activeLearner: null });
        }
    },

    verifyParentalGate: async (pinOrPassword) => {
        try {
            const response = await api.post('/auth/verify-parental-gate', pinOrPassword);
            if (response.data.success) {
                set({ isParentalModeActive: true });
            } else {
                throw new Error(response.data.error || 'Verification failed');
            }
        } catch (err: any) {
            console.error("Parental verification failed", err);
            throw err;
        }
    },

    fetchProfiles: async () => {
        try {
            const response = await api.get<LearnerProfile[]>('/auth/profiles');
            set({ learnerProfiles: response.data });
        } catch (err) {
            console.error("Failed to fetch profiles", err);
        }
    },

    selectProfile: async (learnerId) => {
        try {
            const response = await api.post(`/auth/select-profile/${learnerId}`);
            if (response.data.success) {
                set({ activeLearner: response.data.profile });
                // Store in local storage to persist choice
                localStorage.setItem('active_learner_id', learnerId);
            }
        } catch (err) {
            console.error("Failed to select profile", err);
            throw err;
        }
    },
    updateProfile: async (data: { first_name?: string; avatar_url?: string }) => {
        try {
            const response = await api.patch('/auth/profiles/me', data);
            const updatedProfile = response.data;

            set((state) => ({
                user: state.user ? {
                    ...state.user,
                    learner_profile: state.user.role === 'learner' ? updatedProfile : state.user.learner_profile
                } : null,
                activeLearner: state.activeLearner?.id === updatedProfile.id ? updatedProfile : state.activeLearner,
                learnerProfiles: state.learnerProfiles.map(p => p.id === updatedProfile.id ? updatedProfile : p)
            }));
        } catch (err) {
            console.error("Failed to update profile", err);
            throw err;
        }
    },

    createChildAccount: async (data) => {
        try {
            const response = await api.post('/auth/profiles', data);
            if (response.data.success) {
                // Refresh profiles
                await get().fetchProfiles();
            }
        } catch (err) {
            console.error("Failed to create child account", err);
            throw err;
        }
    }
}));
