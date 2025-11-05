/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50:  '#FFF8E6',
          100: '#FCEEC7',
          200: '#F7DFA3',
          300: '#F0C96E',
          400: '#E8B545',
          500: '#D4A23E', // base color
          600: '#B78332',
          700: '#946626',
          800: '#6E4B1C',
          900: '#4A3213',
        },
      },
      backgroundImage: {
        // Gold gradient options
        'gold-gradient': 'linear-gradient(to right, #E8B545, #D4A23E, #B78332)',
        'gold-gradient-light': 'linear-gradient(to right, #FCEEC7, #F0C96E)',
        'gold-gradient-dark': 'linear-gradient(to right, #D4A23E, #946626)',
      },
    },
  },
  plugins: [],
}
