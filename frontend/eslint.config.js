import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import eslintConfigPrettier from 'eslint-config-prettier'

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '19.2' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // No TypeScript in this project (deliberate choice, see CLAUDE.md); prop-types would be
      // the only runtime check, but keeping it in sync by hand across every component is more
      // overhead than the plain-JS choice already accepted, so it stays off.
      'react/prop-types': 'off',
    },
  },
  {
    // Node-context files: config files, Vitest unit tests (process.env.TZ),
    // and Playwright specs (process.env.CI, process.env.E2E_BASE_URL),
    // none of which run in the browser like the rest of src/.
    files: ['*.config.js', 'e2e/**/*.js', '**/*.test.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  eslintConfigPrettier,
]
