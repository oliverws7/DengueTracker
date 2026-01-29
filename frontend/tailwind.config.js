/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cores personalizadas para o tema de saúde/combate à dengue
        'dengue-red': '#e11d48',
        'dengue-green': '#10b981',
      }
    },
  },
  plugins: [],
}