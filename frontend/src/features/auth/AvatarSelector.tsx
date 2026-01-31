import { Check } from 'lucide-react';

const AVATAR_SEEDS = [
    'Felix', 'Aneka', 'Zoe', 'Marc', 'Trouble', 'Coco', 'Sasha', 'Jack'
];

interface AvatarSelectorProps {
    selectedAvatar: string;
    onSelect: (url: string) => void;
}

export function AvatarSelector({ selectedAvatar, onSelect }: AvatarSelectorProps) {
    // We use DiceBear "Fun Emoji" style for kid-friendly avatars
    const getAvatarUrl = (seed: string) => `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${seed}`;

    return (
        <div className="grid grid-cols-4 gap-4 p-4">
            {AVATAR_SEEDS.map((seed) => {
                const url = getAvatarUrl(seed);
                const isSelected = selectedAvatar === url;

                return (
                    <button
                        key={seed}
                        type="button"
                        onClick={() => onSelect(url)}
                        className={`relative group rounded-full p-1 transition-all duration-300 ${isSelected ? 'ring-4 ring-indigo-500 scale-110' : 'hover:scale-105 hover:ring-2 hover:ring-indigo-200'}`}
                    >
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-indigo-50 border-2 border-white shadow-sm">
                            <img
                                src={url}
                                alt={seed}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        {isSelected && (
                            <div className="absolute -top-1 -right-1 bg-indigo-600 text-white rounded-full p-1 shadow-md animate-in zoom-in">
                                <Check className="w-3 h-3" />
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
