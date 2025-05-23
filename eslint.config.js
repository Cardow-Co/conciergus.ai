const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
  recommendedConfig: js.configs.recommended
});

module.exports = [
  { ignores: ['node_modules/**', 'dist/**', 'eslint.config.js', 'rollup.config.js', 'scripts/**'] },
  ...compat.extends(
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:prettier/recommended'
  ),
  {
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      react: require('eslint-plugin-react'),
      'react-hooks': require('eslint-plugin-react-hooks'),
      import: require('eslint-plugin-import'),
      prettier: require('eslint-plugin-prettier')
    },
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: { project: './tsconfig.json', ecmaVersion: 'latest', sourceType: 'module' }
    },
    settings: { react: { version: 'detect' } },
    rules: {
      // Add or override rules here
    }
  }
]; 