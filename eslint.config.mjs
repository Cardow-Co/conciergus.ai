import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  { languageOptions: { env: { browser: true, es2021: true, node: true } } },
  pluginJs.configs.recommended
];
