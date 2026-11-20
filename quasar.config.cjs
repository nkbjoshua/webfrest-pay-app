/* eslint-env node */
const { configure } = require('quasar/wrappers');

require('dotenv').config();
if (process.env.NODE_ENV === 'production') require('dotenv').config({ path: '.env.production', override: true });

module.exports = configure(function () {
  return {
    boot: ['pinia', 'axios', 'theme'],
    css: ['app.scss'],
    extras: ['material-icons', 'material-icons-outlined'],
    build: {
      target: { browser: ['es2022', 'firefox115', 'chrome115', 'safari14'], node: 'node22' },
      vueRouterMode: 'history',
      typescript: { strict: false, vueShim: true },
      env: {
        WFP_API_BASE: process.env.WFP_API_BASE ?? '',
        WFP_CHECKOUT_BASE: process.env.WFP_CHECKOUT_BASE ?? '',
      },
    },
    devServer: { open: false, port: 9500, historyApiFallback: true },
    framework: {
      config: { dark: 'auto', notify: { position: 'top', timeout: 3500 } },
      plugins: ['Dialog', 'Notify', 'Loading', 'LocalStorage'],
    },
    animations: [],
  };
});
