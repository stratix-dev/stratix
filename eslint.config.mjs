// @ts-check

import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended"

export default defineConfig(
  js.configs.recommended, 
  tseslint.configs.recommended, 
  tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
   {
  languageOptions:{
    parserOptions:{
      project:true,
      tsconfigRootDir: import.meta.dirname
  }},
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-empty-object-type": "off",
    // TODO: Enable these rules later
    "@typescript-eslint/no-unsafe-return": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
  },
});