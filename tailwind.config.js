/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#000000',
        secondary: '#FFFFFF',
        accent: '#4C5866',
        'accent-dark': '#3a4350',
        'accent-light': '#5e6a7a',
      },
    },
  },
  plugins: [],
};
