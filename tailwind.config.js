/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#faf6f1",
        ink: "#2b2621",
        clay: "#b08968",
      },
    },
  },
  plugins: [],
};
