import { useAuth } from '../../stores/useAuth';

export function UsageWidget() {
    const { user } = useAuth();

    // Safety check
    if (!user) return null;

    const totalTokens = user.total_tokens_used || 0;
    const totalCost = user.total_cost_usd || 0;

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl -ml-5 -mb-5"></div>

            <div className="relative z-10">
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Ma Consommation</h3>
                    <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">Aperçu de l'utilisation de l'IA.</p>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 transition-all hover:bg-white hover:shadow-sm">
                        <dt className="text-sm font-bold text-gray-500 uppercase tracking-widest">Tokens</dt>
                        <dd className="text-lg font-black text-gray-900">
                            {totalTokens.toLocaleString()}
                        </dd>
                    </div>
                    <div className="flex justify-between items-center px-4 py-3 bg-emerald-50/50 rounded-xl border border-emerald-100 transition-all hover:bg-emerald-50 hover:shadow-sm">
                        <dt className="text-sm font-bold text-emerald-700/70 uppercase tracking-widest">Coût</dt>
                        <dd className="text-lg font-black text-emerald-600">
                            {totalCost.toFixed(4)} <span className="text-[10px] uppercase ml-1">USD</span>
                        </dd>
                    </div>
                </div>
            </div>
        </div>
    );
}
