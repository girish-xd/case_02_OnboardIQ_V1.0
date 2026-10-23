/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#b9ddfd',
          300: '#7cc2fb',
          400: '#36a3f7',
          500: '#0c87eb',
          600: '#006bc9',
          700: '#0155a3',
          800: '#064986',
          900: '#0a3d6f',
          950: '#07274a',
        },
        deccan: {
          primary: '#0B3B60',
          secondary: '#D97706',
          surface: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
        }
      },
    },
  },
  plugins: [],
}
