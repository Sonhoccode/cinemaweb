/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/**/*"
  ],
  safelist: [
    'flex',
    'grid',
    'block',
    'hidden',
    'text-white',
    'bg-primary-dark',
    'container',
    'grid-cols-2',
    'grid-cols-3',
    'grid-cols-4',
    'grid-cols-5',
    'md:grid-cols-3',
    'lg:grid-cols-4',
    'xl:grid-cols-5',
    'gap-6',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          dark: '#111827', // Gray 900
          lighter: '#1F2937', // Gray 800
        },
        accent: {
          cyan: '#3B82F6', // Blue 500 (Basic Link Color)
          blue: '#1D4ED8', // Blue 700
          pink: '#EF4444', // Red 500 (for accents if needed)
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      // Remove custom gradients and shadows for flat design
    },
  },
  plugins: [],
}
