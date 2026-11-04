import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    // These effects read browser-only values (theme class, localStorage, Date.now) after hydration on purpose:
    // reading them during render would make the server and client HTML disagree.
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Static browser scripts (the PDF tool engine) whose functions are called from inline onclick attributes.
      "public/**",
      // Vendored Velora UI / shadcn components, kept as published so they can be diffed against upstream.
      "components/velora/**",
    ],
  },
];

export default eslintConfig;
