/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#110c08",
          900: "#19120c",
          800: "#221811",
          700: "#2e2015",
          600: "#42301f",
        },
        gold: {
          400: "#e6bd6e",
          500: "#cf9b42",
          600: "#b6832f",
        },
        // Landing-page editorial palette — same family, warmer & richer
        "near-black": "#110c08",
        paper: "#f3e8d4",
        muted2: "#9c8a6e",
        brass: {
          400: "#e6bd6e",
          500: "#cf9b42",
          600: "#b6832f",
        },
        leather: "#2e2015",
        hairline: "#3a2a1c",
        charcoal: "#19120c",
      },
      fontFamily: {
        display: ["Georgia", "serif"],
        fraunces: ["var(--font-fraunces)", "Georgia", "serif"],
        inter: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

