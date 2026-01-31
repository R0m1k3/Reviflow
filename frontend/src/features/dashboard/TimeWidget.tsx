import { useState, useEffect } from 'react';
import { Clock, Calendar } from 'lucide-react';

export function TimeWidget() {
    const [date, setDate] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setDate(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Format Date: "Lundi 30 Janvier"
    const dateString = date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    // Format Time: "14:05"
    const timeString = date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400/10 rounded-full blur-2xl -mr-5 -mt-5"></div>
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-indigo-400/10 rounded-full blur-xl -ml-5 -mb-5"></div>

            <div className="relative z-10 flex flex-col items-center text-center">
                <div className="flex items-center gap-2 text-indigo-500 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-bold uppercase tracking-wider text-indigo-900/60 first-letter:uppercase">
                        {dateString}
                    </span>
                </div>

                <div className="flex items-baseline gap-1 mt-1">
                    <h2 className="text-5xl font-black text-gray-900 tracking-tighter tabular-nums">
                        {timeString}
                    </h2>
                    {/* Animated seconds indicator or simple colon blinking (optional, keeping clean for now) */}
                </div>

                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100">
                    <Clock className="w-3 h-3 text-indigo-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide">
                        Temps Réel
                    </span>
                </div>
            </div>
        </div>
    );
}
