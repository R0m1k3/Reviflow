/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                cream: '#FDFCF8',
                'soft-indigo': '#6366F1',
                success: '#22C55E', // Vibrant Green
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                dyslexic: ['OpenDyslexic', 'sans-serif'],
            },
            boxShadow: {
                'soft-indigo': '0 10px 15px -3px rgba(99, 102, 241, 0.1), 0 4px 6px -2px rgba(99, 102, 241, 0.05)',
            },
            borderRadius: {
                'xl': '0.75rem', // Reduced from 1rem default if needed, or keep standard
                '2xl': '1rem',   // Standardize to 1rem for "clean" look (was often used as rounded-2xl)
                '3xl': '1.5rem', // Reduced from larger values
            }
        },
    },
    plugins: [],
}
