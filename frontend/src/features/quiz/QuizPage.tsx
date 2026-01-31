import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { QuestionCard } from './QuestionCard';
import { ResultCard } from './ResultCard';
import { DyslexiaToggle } from '../../components/DyslexiaToggle';
import { useAccessibility } from '../../stores/useAccessibility';
import { useAuth } from '../../stores/useAuth';
import { Skeleton } from '../../components/ui/Skeleton';
import { Modal } from '../../components/ui/Modal';

interface Question {
    id: number;
    question: string;
    options: string[];
    correct_answer: number;
    explanation: string;
}

interface QuizResponse {
    topic: string;
    questions: Question[];
    series_info?: {
        current: number;
        total: number;
    };
}

export function QuizPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { isDyslexic } = useAccessibility();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [quizData, setQuizData] = useState<QuizResponse | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const [answers, setAnswers] = useState<any[]>([]); // Track details
    const [isFinished, setIsFinished] = useState(false);
    const [revisionId, setRevisionId] = useState<string | null>(null); // New state

    // Badge Modal State
    const [showBadgeModal, setShowBadgeModal] = useState(false);
    const [newBadges, setNewBadges] = useState<string[]>([]);

    // Get text content from navigation state OR params
    const textContent = location.state?.textContent;
    const { revisionId: paramRevisionId } = useParams();

    useEffect(() => {
        const loadQuiz = async () => {
            setLoading(true);
            try {
                // Scenario 0: Quiz Data passed via State (e.g. Remediation)
                if (location.state?.quizData) {
                    setQuizData(location.state.quizData);
                    if (location.state.revisionId) {
                        setRevisionId(location.state.revisionId);
                    } else if (location.state.quizData.revision_id) {
                        setRevisionId(location.state.quizData.revision_id);
                    }
                    // If it's pure remediation, we might not want to save a new Revision in backend,
                    // but we do want to track progress? 
                    // For now, simple display is enough.
                }
                // Scenario A: Loading existing revision
                else if (paramRevisionId) {
                    setRevisionId(paramRevisionId);
                    const res = await api.get(`/quiz/review/${paramRevisionId}`);
                    // Revision has quiz_data as string
                    if (res.data.quiz_data) {
                        const parsedQuiz = JSON.parse(res.data.quiz_data);
                        // Inject series info and completion status
                        (parsedQuiz as any).series_info = {
                            current: res.data.current_series,
                            total: res.data.total_series,
                            completed: res.data.completed_series || 0
                        };
                        setQuizData(parsedQuiz);

                        // Checks for "Between Series" state
                        if (res.data.progress_state) {
                            const progress = JSON.parse(res.data.progress_state);
                            setCurrentQuestionIndex(progress.current_index || 0);
                            setScore(progress.score || 0);
                            setAnswers(progress.answers || []);
                        } else if (res.data.completed_series >= res.data.current_series && res.data.current_series < res.data.total_series) {
                            // User finished this part but left before starting the next.
                            setIsFinished(true);
                        }
                    } else {
                        setError("Ce quiz ne contient pas de données valides.");
                    }
                }
                // Scenario B: Generating new quiz
                else if (textContent) {
                    const response = await api.post<QuizResponse & { revision_id: string }>('/quiz/generate', {
                        text_content: textContent,
                        difficulty: 'medium',
                        title: location.state?.title,
                        subject: location.state?.subject,
                        synthesis: location.state?.synthesis,
                        study_tips: location.state?.study_tips,
                        learner_id: useAuth.getState().activeLearner?.id
                    });
                    setQuizData(response.data);
                    if (response.data.revision_id) {
                        setRevisionId(response.data.revision_id);
                    }
                } else {
                    setError("Aucun contenu fourni. Veuillez sélectionner une révision ou en créer une nouvelle.");
                }
            } catch (err: any) {
                console.error("Quiz error:", err);
                setError(err.response?.data?.detail || "Erreur lors du chargement du quiz.");
            } finally {
                setLoading(false);
            }
        };

        loadQuiz();
    }, [textContent, paramRevisionId]);

    // Manual advance handler
    const handleNext = () => {
        if (currentQuestionIndex < (quizData?.questions.length || 0) - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedOption(null);
        } else {
            setIsFinished(true);
        }
    };

    const handleOptionSelect = (index: number) => {
        if (selectedOption !== null) return; // Prevent changing answer
        setSelectedOption(index);

        if (!quizData) return;

        const currentQ = quizData.questions[currentQuestionIndex];
        const isCorrect = index === currentQ.correct_answer;

        if (isCorrect) {
            setScore(prev => prev + 1);
        }

        // Record answer details
        setAnswers(prev => [...prev, {
            question: currentQ.question,
            user_answer: currentQ.options[index],
            correct_answer: currentQ.options[currentQ.correct_answer],
            is_correct: isCorrect,
            original_content: null
        }]);
    };

    // Save score when quiz is finished
    const { activeLearner, checkAuth } = useAuth();
    const hasSaved = useRef(false);

    useEffect(() => {
        if (isFinished && quizData && !hasSaved.current) {
            hasSaved.current = true;

            // Trigger Confetti if score is good (> 50%)
            if (activeLearner && score / quizData.questions.length > 0.5) {
                import('canvas-confetti').then((confetti) => {
                    confetti.default({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#6366f1', '#a855f7', '#ec4899', '#fwd700']
                    });
                });
            }

            const saveScore = async () => {
                try {
                    const response = await api.post('/quiz/score', {
                        topic: quizData.topic,
                        score: score,
                        total_questions: quizData.questions.length,
                        learner_id: activeLearner?.id,
                        details: answers,
                        revision_id: revisionId
                    });

                    // Refresh profile to get updated badges/streaks
                    await checkAuth(true);

                    // Check for new badges
                    if (response.data.new_badges && response.data.new_badges.length > 0) {
                        setNewBadges(response.data.new_badges);
                        setShowBadgeModal(true);
                    }

                } catch (e) {
                    console.error("Failed to save score", e);
                    hasSaved.current = false;
                }
            };
            saveScore();
        }
    }, [isFinished, quizData, score, activeLearner, checkAuth, answers, revisionId]);

    const handlePause = async () => {
        if (!revisionId) {
            navigate('/dashboard');
            return;
        }

        try {
            await api.post('/quiz/progress/save', {
                revision_id: revisionId,
                current_index: currentQuestionIndex,
                answers: answers,
                score: score
            });
            navigate('/dashboard');
        } catch (e) {
            console.error("Failed to save progress", e);
            navigate('/dashboard');
        }
    };

    const handleNextSeries = async () => {
        if (!revisionId) return;
        setLoading(true);
        try {
            const res = await api.post('/quiz/next-series', { revision_id: revisionId });
            setQuizData(res.data);
            setCurrentQuestionIndex(0);
            setScore(0);
            setAnswers([]);
            setSelectedOption(null); // Fix: Reset selected option to prevent "Ghost Answer" on Q1
            setIsFinished(false);
            setLoading(false);
        } catch (e) {
            console.error("Failed to load next series", e);
            setError("Impossible de charger la suite du cours. Veuillez réessayer.");
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen bg-cream py-8 px-4 sm:px-6 lg:px-8 ${isDyslexic ? 'font-dyslexic' : 'font-sans'}`}>
            <div className="max-w-screen-sm mx-auto relative content-center">

                {/* Pause Button */}
                {!loading && !error && !isFinished && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handlePause}
                        className="absolute -top-2 right-0 text-slate-400 hover:text-indigo-600 font-bold text-sm bg-white px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-all border border-slate-100 flex items-center gap-2"
                    >
                        <span>⏸ Pause & Quitter</span>
                    </motion.button>
                )}

                {loading && (
                    <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl shadow-xl p-8 animate-pulse">
                        <div className="flex justify-between items-center mb-8">
                            <Skeleton className="h-4 w-24 bg-indigo-50" />
                            <Skeleton className="h-4 w-32 bg-indigo-50" />
                        </div>

                        <Skeleton className="h-8 w-3/4 mb-4 bg-gray-200" />
                        <Skeleton className="h-8 w-1/2 mb-12 bg-gray-200" />

                        <div className="space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <Skeleton key={i} className="h-16 w-full rounded-xl bg-gray-100" />
                            ))}
                        </div>

                        <div className="mt-8 text-center">
                            <p className="text-indigo-600 font-medium animate-pulse">Génération de votre quiz en cours...</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="text-center text-red-600 bg-red-50 p-8 rounded-[2.5rem] mt-10 border-2 border-red-100 shadow-xl shadow-red-50 animate-in zoom-in duration-300">
                        <div className="text-5xl mb-4">⚠️</div>
                        <h3 className="text-2xl font-black mb-2">Une erreur est survenue</h3>
                        <p className="font-medium text-red-500 opacity-80">{error}</p>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/dashboard')}
                            className="mt-8 px-8 py-4 bg-white border-2 border-red-100 text-red-600 font-black rounded-2xl hover:bg-red-50 transition-all shadow-lg shadow-red-50 flex items-center justify-center gap-3"
                        >
                            Retour au tableau de bord
                        </motion.button>

                    </div>
                )}

                {!loading && !error && quizData && !isFinished && (
                    <div className="flex flex-col items-center w-full">
                        <QuestionCard
                            question={quizData.questions[currentQuestionIndex].question}
                            options={quizData.questions[currentQuestionIndex].options}
                            selectedOption={selectedOption}
                            correctAnswer={quizData.questions[currentQuestionIndex].correct_answer}
                            onSelectOption={handleOptionSelect}
                            currentStep={currentQuestionIndex + 1}
                            totalSteps={quizData.questions.length}
                            explanation={quizData.questions[currentQuestionIndex].explanation}
                        />

                        {/* NEXT BUTTON */}
                        {selectedOption !== null && (
                            <button
                                onClick={handleNext}
                                className="mt-8 bg-indigo-600 text-white font-black text-lg py-4 px-12 rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 hover:shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 flex items-center gap-3 group"
                            >
                                <span>Question Suivante</span>
                                <span className="text-2xl group-hover:translate-x-1 transition-transform">➜</span>
                            </button>
                        )}
                    </div>
                )}

                {isFinished && quizData && (
                    <ResultCard
                        score={score}
                        totalQuestions={quizData.questions.length}
                        topic={quizData.topic}
                        onRetry={() => window.location.reload()}
                        onNextSeries={handleNextSeries}
                        seriesInfo={(quizData as any).series_info}
                    />
                )}

                <div className="mt-8 flex justify-center">
                    <DyslexiaToggle />
                </div>

                <Modal
                    isOpen={showBadgeModal}
                    onClose={() => setShowBadgeModal(false)}
                    title="Nouveau Badge Débloqué !"
                    icon="🏆"
                >
                    <div className="text-gray-600 text-lg">
                        <p className="mb-4">Félicitations ! Vous avez gagné de nouveaux badges :</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {newBadges.map((badge, idx) => (
                                <span key={idx} className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-xl font-bold">
                                    {badge.replace('_', ' ')}
                                </span>
                            ))}
                        </div>
                    </div>
                </Modal>
            </div>
        </div>
    );
}
