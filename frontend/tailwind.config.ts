/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Newsreader"', "Georgia", "Times New Roman", "serif"],
        mono: ['"JetBrains Mono"', "Menlo", "Consolas", "monospace"],
        sans: ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        ink: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
          950: "#0a0a0a",
        },
        paper: {
          50: "#fefefe",
          100: "#fcfcfc",
          200: "#f8f8f8",
          300: "#f0f0f0",
          400: "#e8e8e8",
        },
      },
      boxShadow: {
        paper: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "paper-md": "0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04)",
        "paper-lg": "0 10px 15px rgba(0,0,0,0.05), 0 4px 6px rgba(0,0,0,0.03)",
        "paper-xl": "0 20px 25px rgba(0,0,0,0.05), 0 8px 10px rgba(0,0,0,0.03)",
        "paper-inner": "inset 0 1px 2px rgba(0,0,0,0.04)",
        "paper-2xl": "0 25px 50px rgba(0,0,0,0.08)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.25s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "draw-line": "drawLine 0.4s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        drawLine: {
          "0%": { width: "0%" },
          "100%": { width: "100%" },
        },
      },
    },
  },
  plugins: [],
};
