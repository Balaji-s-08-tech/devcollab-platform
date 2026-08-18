export default {
  content: ["./index.html", "./src*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        surface: {
          900: "#0f0f13",
          800: "#16161d",
          700: "#1c1c26",
          600: "#232330",
          500: "#2a2a3a",
          400: "#35354a",
          300: "#42425a",
        },
      },
      fontFamily: {
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        display: ["'Cabinet Grotesk'", "'DM Sans'", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.25s cubic-bezier(0.16,1,0.3,1)",
        "slide-in-right": "slideInRight 0.25s cubic-bezier(0.16,1,0.3,1)",
        "scale-in": "scaleIn 0.15s ease-out",
        "pulse-dot": "pulseDot 1.5s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      boxShadow: {
        "glow-brand": "0 0 20px rgba(99,102,241,0.35)",
        "glow-sm": "0 0 10px rgba(99,102,241,0.2)",
        "card": "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.6)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
};
