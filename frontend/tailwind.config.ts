/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Loose handwriting — titles, headings, the big numbers.
        hand: ['"Caveat"', '"Bradley Hand"', "cursive"],
        // Legible handwriting — body copy, checklist lines.
        note: ['"Kalam"', '"Comic Sans MS"', "cursive"],
        // Typewriter — stamps, dates, labels, anything small.
        type: ['"Special Elite"', '"Courier New"', "monospace"],
        // Printed serif — the pre-printed parts of a form.
        print: ['"Newsreader"', "Georgia", "serif"],
        sans: ['"Kalam"', "system-ui", "sans-serif"],
        serif: ['"Newsreader"', "Georgia", "serif"],
        mono: ['"Special Elite"', '"Courier New"', "monospace"],
      },
      colors: {
        // The page itself.
        paper: {
          50: "#fffdf7",
          100: "#fdf9ee",
          200: "#faf4e4",
          300: "#f5edd8",
          400: "#ede2c6",
          500: "#e0d3b4",
          aged: "#f7f0dd",
          shadow: "#e8dfc8",
        },
        // Blue-black fountain pen.
        ink: {
          50: "#f2f4f7",
          100: "#e3e8ef",
          200: "#c7d0dd",
          300: "#9aa9bf",
          400: "#6b7f9c",
          500: "#4a6081",
          600: "#35496a",
          700: "#263754",
          800: "#1f3a5f",
          900: "#182b46",
          950: "#0f1c2e",
        },
        // Red marking pen — corrections, urgency, the margin rule.
        redpen: {
          100: "#fbe4e0",
          200: "#f3c0b8",
          300: "#e08d80",
          400: "#cf6152",
          500: "#b93a28",
          600: "#96291a",
        },
        // Graphite.
        pencil: {
          100: "#e9e9e6",
          200: "#cfcfc9",
          300: "#a8a8a1",
          400: "#7d7d76",
          500: "#5c5c56",
          600: "#42423d",
        },
        // Ruled lines on the page.
        rule: {
          DEFAULT: "#cfdcea",
          soft: "#dde6f0",
          margin: "#e6a8a0",
        },
        // Highlighter swipes.
        marker: {
          yellow: "#fdf3a7",
          green: "#c9edcf",
          blue: "#bfe0f5",
          pink: "#fbd0e0",
        },
        // Sticky notes.
        sticky: {
          yellow: "#fff7ae",
          orange: "#ffd9a0",
          pink: "#ffc9d8",
          blue: "#bfe4f7",
          green: "#c8eeb9",
        },
        // Semantic aliases used across pages.
        greenpen: "#2f6b46",
      },
      boxShadow: {
        // A sheet lifted slightly off the desk.
        sheet: "0 1px 2px rgba(72,58,32,0.08), 0 2px 8px rgba(72,58,32,0.06)",
        "sheet-md": "0 2px 4px rgba(72,58,32,0.09), 0 6px 16px rgba(72,58,32,0.08)",
        "sheet-lg": "0 6px 12px rgba(72,58,32,0.10), 0 16px 32px rgba(72,58,32,0.10)",
        "sheet-xl": "0 12px 24px rgba(72,58,32,0.12), 0 28px 56px rgba(72,58,32,0.12)",
        // A stack of pages, edges showing.
        stack:
          "0 1px 1px rgba(72,58,32,0.10), 0 3px 0 -1px #fdf9ee, 0 4px 1px -1px rgba(72,58,32,0.10), 0 7px 0 -2px #fdf9ee, 0 8px 1px -2px rgba(72,58,32,0.08)",
        sticky: "0 3px 6px rgba(72,58,32,0.16), 0 10px 18px rgba(72,58,32,0.10)",
        pressed: "inset 0 2px 4px rgba(72,58,32,0.14)",
      },
      borderRadius: {
        // The classic hand-drawn box: no two corners alike.
        sketch: "255px 15px 225px 15px / 15px 225px 15px 255px",
        "sketch-alt": "15px 225px 15px 255px / 225px 15px 255px 15px",
        blob: "38% 62% 63% 37% / 41% 44% 56% 59%",
      },
      rotate: {
        "0.5": "0.5deg",
        "1.5": "1.5deg",
        "2.5": "2.5deg",
      },
      animation: {
        "fade-in": "fadeIn 0.35s ease-out both",
        "slide-up": "slideUp 0.35s cubic-bezier(0.16,1,0.3,1) both",
        "ink-in": "inkIn 0.45s cubic-bezier(0.16,1,0.3,1) both",
        "draw-check": "drawCheck 0.4s cubic-bezier(0.65,0,0.35,1) forwards",
        "strike": "strike 0.35s cubic-bezier(0.65,0,0.35,1) forwards",
        "paper-drop": "paperDrop 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "wiggle": "wiggle 0.4s ease-in-out",
        "pen-blink": "penBlink 1.1s steps(2) infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Ink soaking into the page.
        inkIn: {
          "0%": { opacity: "0", filter: "blur(2px)", transform: "translateY(4px)" },
          "100%": { opacity: "1", filter: "blur(0)", transform: "translateY(0)" },
        },
        drawCheck: { "0%": { strokeDashoffset: "24" }, "100%": { strokeDashoffset: "0" } },
        strike: { "0%": { strokeDashoffset: "220" }, "100%": { strokeDashoffset: "0" } },
        paperDrop: {
          "0%": { opacity: "0", transform: "translateY(-8px) rotate(-1.5deg) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) rotate(0) scale(1)" },
        },
        wiggle: {
          "0%,100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-1.2deg)" },
          "75%": { transform: "rotate(1.2deg)" },
        },
        penBlink: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0" } },
      },
    },
  },
  plugins: [],
};
