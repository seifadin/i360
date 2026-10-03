// ESLint flat config (2026-10-03). Vite's react-ts template rules, plus two
// type-aware promise rules: this app relies on fire-and-forget calls (OtaKit,
// retries) and a startup guard that treats any unhandled rejection as fatal,
// so an unmarked floating promise is worth a lint error. Async onClick
// handlers are an accepted React pattern, hence attributes: false.
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: { project: './tsconfig.app.json', tsconfigRootDir: import.meta.dirname },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // The two providers also export their hooks; fast refresh falls back to
      // a full reload for those two files only, which is acceptable.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true, allowExportNames: ['useAppState', 'useDataCache'] }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
    },
  },
)
