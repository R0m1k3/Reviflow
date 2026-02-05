
import { useState, useEffect } from 'react';

interface QuestionCardProps {
    question: string;
    options: string[];
    selectedOption: number | null;
    correctAnswer: number;
    onSelectOption: (index: number) => void;
    currentStep: number;
    totalSteps: number;
    explanation?: string;
}

export function QuestionCard({
    question,
    options,
    selectedOption,
    correctAnswer,
    onSelectOption,
    currentStep,
    totalSteps,
    explanation
}: QuestionCardProps) {
    const [animation, setAnimation] = useState<'pop' | 'shake' | null>(null);

    useEffect(() => {
        if (selectedOption !== null) {
            if (selectedOption === correctAnswer) {
                setAnimation('pop');
            } else {
                setAnimation('shake');
            }
            // Removed auto-hide timer for animation to keep state clear, 
            // but we might want to keep the effect. 
            // The user wants "time to read", so we shouldn't auto-advance too fast in parent.
            const timer = setTimeout(() => setAnimation(null), 500);
            return () => clearTimeout(timer);
        }
    }, [selectedOption, correctAnswer]);

    const isCorrect = selectedOption === correctAnswer;

    return (
        <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-soft-indigo dark:shadow-none overflow-hidden max-w-2xl mx-auto mt-8 p-8 transition-transform duration-300 ${animation === 'pop' ? 'scale-105' : animation === 'shake' ? 'animate-shake' : ''
            }`}>
            <div className="mb-10">
                <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">Question {currentStep} / {totalSteps}</span>
                    <span className="text-xs font-black text-slate-400 dark:text-slate-500">{Math.round((currentStep / totalSteps) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-2.5 p-0.5">
                    <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full transition-all duration-700 ease-out shadow-sm"
                        style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                    ></div>
                </div>
            </div>

            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-10 leading-tight tracking-tight">{question}</h2>

            <div className="grid grid-cols-1 gap-4 mb-4">
                {options.map((option, index) => (
                    <button
                        key={index}
                        disabled={selectedOption !== null}
                        onClick={() => onSelectOption(index)}
                        className={`w-full text-left p-5 border-2 rounded-xl transition-all duration-200 group relative ${selectedOption === null
                            ? 'border-slate-100 dark:border-slate-700 hover:border-soft-indigo dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20'
                            : selectedOption === index
                                ? index === correctAnswer
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                    : 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                                : index === correctAnswer
                                    ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10'
                                    : 'border-slate-100 dark:border-slate-700 opacity-50'
                            }`}
                    >
                        <div className="flex items-center">
                            <span className={`flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${selectedOption === null
                                ? 'border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 group-hover:border-soft-indigo dark:group-hover:border-indigo-400 group-hover:text-soft-indigo dark:group-hover:text-indigo-400'
                                : selectedOption === index
                                    ? index === correctAnswer
                                        ? 'border-green-500 bg-green-500 text-white'
                                        : 'border-orange-400 bg-orange-400 text-white'
                                    : index === correctAnswer
                                        ? 'border-green-500 text-green-500'
                                        : 'border-slate-200 dark:border-slate-600 text-slate-300 dark:text-slate-600'
                                }`}>
                                {String.fromCharCode(65 + index)}
                            </span>
                            <span className="ml-4 text-lg font-medium text-slate-700 dark:text-slate-200">{option}</span>
                        </div>
                    </button>
                ))}
            </div>

            {selectedOption !== null && (
                <div className={`mt-6 p-6 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300 ${isCorrect ? 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30' : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30'}`}>
                    <div className="flex items-start gap-4">
                        <div className={`text-2xl ${isCorrect ? 'grayscale-0' : 'grayscale-0'}`}>
                            {isCorrect ? '🎉' : '💡'}
                        </div>
                        <div>
                            <h4 className={`font-black uppercase tracking-wider text-xs mb-1 ${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                {isCorrect ? 'Bonne réponse !' : 'Oups, pas tout à fait...'}
                            </h4>
                            <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                                {explanation || "Pas d'explication disponible."}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
