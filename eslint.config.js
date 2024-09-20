import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    ignores: ["dist/*.*"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      "no-constant-condition": [
        "warn",
        {
          checkLoops: false,
        },
      ],
      "no-unused-private-class-members": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];