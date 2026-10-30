// ESLint flat config (2026-10-03), `npm run lint`: every file of the app's own code — src/ and,
// since 2026-10-30, the config files and scripts/ beside it. hub/ has its own ESLint (run by its
// npm test); android/, ios/, public/ and dist/ are generated or built. Vite's react-ts template
// rules, plus two type-aware promise rules: this app relies on fire-and-forget calls (OtaKit,
// retries) and a startup guard that treats any unhandled rejection as fatal,
// so an unmarked floating promise is worth a lint error. Async onClick
// handlers are an accepted React pattern, hence attributes: false.
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'hub', 'android', 'ios', 'public', 'node_modules'] },
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
      // The two classic hooks rules — what eslint-plugin-react-hooks 5 recommended. Version 7's
      // recommended set adds React Compiler rules (we don't use the compiler); adopting them
      // means code changes, so it is a separate decision (2026-10-22).
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // The two providers also export their hooks; fast refresh falls back to
      // a full reload for those two files only, which is acceptable.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true, allowExportNames: ['useAppState', 'useDataCache'] }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
    },
  },
  // The configs read by Vite and Capacitor, type-checked by tsconfig.node.json: the same promise rules.
  {
    files: ['vite.config.ts', 'capacitor.config.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
      parserOptions: { project: './tsconfig.node.json', tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
  // Tailwind's config: in no tsconfig, so without the type-aware rules.
  {
    files: ['tailwind.config.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  // Plain ES modules run by Node: the other configs and scripts/.
  {
    files: ['*.js', 'scripts/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: globals.node },
  },
)
