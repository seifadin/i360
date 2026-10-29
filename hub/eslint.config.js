'use strict';
// ESLint for the hub's own JavaScript (run by npm test, so by the pre-push hook on every
// push that changes hub/). Plain CommonJS scripts, shared by the pages (as plain <script>s),
// Node (the indexer, the build, the tests) and the Workers; the two ES modules are listed below.
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/**', 'theme/site/fonts/**', 'indexer/out/**', 'indexer/work/**', 'indexer/dist/**', '.wrangler/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'commonjs',
      globals: { ...globals.browser, ...globals.node, ...globals.worker }
    },
    rules: { 'no-unused-vars': ['error', { caughtErrors: 'none' }] }
  },
  { files: ['theme/site/theme-loader.js', 'hijri/worker/index.js'], languageOptions: { sourceType: 'module' } }
];
