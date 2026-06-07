/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        canvas: "#000000",
        surface: "#0E0E0E",
        elevated: "#1A1A1A",
        accent: "#D4E924",
        textHi: "#FFFFFF",
        textLo: "#8A8A8A",
        border: "#1F1F1F",
      },
      borderRadius: {
        sm: "8px",
        md: "16px",
        pill: "9999px",
      },
      spacing: {
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        5: "24px",
        6: "32px",
        7: "48px",
      },
      fontFamily: {
        display: ["HankenGrotesk_700Bold"],
        heading: ["HankenGrotesk_600SemiBold"],
        body: ["Inter_400Regular"],
        bodyMed: ["Inter_500Medium"],
        label: ["Inter_600SemiBold"],
      },
    },
  },
  plugins: [],
};
