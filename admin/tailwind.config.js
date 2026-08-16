/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: "#0f1419", raised: "#1a2332", border: "#2d3a4f" },
        accent: { DEFAULT: "#3b82f6", muted: "#60a5fa" },
      },
    },
  },
  plugins: [],
};
