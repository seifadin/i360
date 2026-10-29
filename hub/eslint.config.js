// ESLint for the hub's own JavaScript (run by npm test, so by the pre-push hook on every
// push that changes hub/). Every file is an ES module ("type": "module" in package.json),
// used by the pages (bundled by scripts/build.js), Node (the indexer, the build, the tests)
// and the Workers. theme/early.js is the one plain script: it is inlined into each page's
// <head> as it is.
import js from '@eslint/js';
import globals from 'globals';

// The list ESLint's own confusing-browser-globals package keeps (as in Create React App).
const CONFUSING_BROWSER_GLOBALS = ['addEventListener', 'blur', 'close', 'closed', 'confirm', 'defaultStatus', 'defaultstatus',
  'event', 'external', 'find', 'focus', 'frameElement', 'frames', 'history', 'innerHeight', 'innerWidth', 'length', 'location',
  'locationbar', 'menubar', 'moveBy', 'moveTo', 'name', 'onblur', 'onerror', 'onfocus', 'onload', 'onresize', 'onunload', 'open',
  'opener', 'opera', 'outerHeight', 'outerWidth', 'pageXOffset', 'pageYOffset', 'parent', 'print', 'removeEventListener',
  'resizeBy', 'resizeTo', 'screen', 'screenLeft', 'screenTop', 'screenX', 'screenY', 'scroll', 'scrollbars', 'scrollBy',
  'scrollTo', 'scrollX', 'scrollY', 'self', 'status', 'statusbar', 'stop', 'toolbar', 'top'];

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
    rules: {
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
      // Browser globals that are easy to use by mistake (e.g. a missing import of the Reader's
      // own `toolbar` read window.toolbar instead): write window.… when one is really meant.
      'no-restricted-globals': ['error', ...CONFUSING_BROWSER_GLOBALS]
    }
  },
  { files: ['theme/early.js'], languageOptions: { ecmaVersion: 5, sourceType: 'script' } }
];
