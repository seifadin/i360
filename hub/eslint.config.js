// ESLint for the hub's own JavaScript (run by npm test, so by the pre-push hook on every
// push that changes hub/). Every file is an ES module ("type": "module" in package.json),
// used by the pages (bundled by scripts/build.js), Node (the indexer, the build, the tests)
// and the Workers. theme/early.js is the one plain script: it is inlined into each page's
// <head> as it is.
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'theme/site/fonts/**', 'indexer/out/**', 'indexer/work/**', 'indexer/dist/**', '.wrangler/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node, ...globals.worker }
    },
    rules: { 'no-unused-vars': ['error', { caughtErrors: 'none' }] }
  },
  { files: ['theme/early.js'], languageOptions: { ecmaVersion: 5, sourceType: 'script' } }
];
