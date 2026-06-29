// Flat ESLint config. Uses Expo's recommended rules; eslint-config-prettier
// turns off formatting rules so Prettier owns formatting.
const expoFlat = require("eslint-config-expo/flat");
const prettier = require("eslint-config-prettier");

module.exports = [
  ...expoFlat,
  prettier,
  {
    ignores: [
      "node_modules/**",
      ".expo/**",
      "ios/**",
      "android/**",
      "dist/**",
      "babel.config.js",
      "metro.config.js",
      "tailwind.config.js",
      // Node build tooling — different globals, not app code.
      "scripts/**",
      // Deno edge functions have their own runtime/globals.
      "supabase/functions/**",
    ],
  },
  {
    // These React Compiler-era rules flag patterns in existing components
    // (refs read during render, setState-in-effect). Adopt them incrementally:
    // surface as warnings (tech debt) instead of blocking CI. Tighten in 14B.
    rules: {
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];
