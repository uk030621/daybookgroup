/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#EEF0E9",
          dim: "#E4E7DC",
        },
        ink: {
          DEFAULT: "#16302A",
          light: "#2B463D",
          faint: "#5C6F67",
        },
        rule: "#C9C2B2",
        amber: {
          DEFAULT: "#E0A458",
          dark: "#B9822F",
        },
        coral: {
          DEFAULT: "#D2665A",
          dark: "#A94A40",
        },
        sage: {
          DEFAULT: "#7C9473",
          dark: "#5C7454",
        },
        dusk: {
          DEFAULT: "#0F211C",
          card: "#17332C",
          rule: "#2E4A41",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-public-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(22,48,42,0.06), 0 4px 14px rgba(22,48,42,0.06)",
        cardHover: "0 2px 4px rgba(22,48,42,0.08), 0 10px 24px rgba(22,48,42,0.10)",
      },
      borderRadius: {
        card: "10px",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.35s ease-out both",
        popIn: "popIn 0.2s ease-out both",
      },
    },
  },
  plugins: [],
};
