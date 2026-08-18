/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#05070c",
          raised: "#0b1018",
          border: "#1e2a3c",
        },
        accent: { DEFAULT: "#22d3ee", muted: "#67e8f9" },
        neon: {
          cyan: "#22d3ee",
          blue: "#38bdf8",
          green: "#34d399",
          lime: "#a3e635",
          purple: "#c084fc",
          pink: "#f472b6",
          orange: "#fb923c",
          gold: "#fbbf24",
          red: "#f87171",
        },
      },
      boxShadow: {
        neon: "0 0 24px rgba(34, 211, 238, 0.18)",
        "neon-green": "0 0 20px rgba(52, 211, 153, 0.2)",
      },
    },
  },
  plugins: [],
};
