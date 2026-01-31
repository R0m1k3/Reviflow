import { useAccessibility } from '../stores/useAccessibility';

export function DyslexiaToggle() {
    const { isDyslexic, toggleDyslexic } = useAccessibility();

    return (
        <button
            onClick={toggleDyslexic}
            className={`flex items-center px-3 py-2 border rounded-md text-sm font-medium transition-colors ${isDyslexic
                ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
            title="Activer la police adaptée à la dyslexie"
        >
            <span className="mr-2 text-lg">Aa</span>
            {isDyslexic ? 'Mode Dyslexie ON' : 'Mode Dyslexie'}
        </button>
    );
}
