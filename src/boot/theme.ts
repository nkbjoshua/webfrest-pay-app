// Inter is self-hosted (no Google Fonts request): keeps the CSP to 'self' and needs no third-party integrity hashes.
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-800.css';
import { boot } from 'quasar/wrappers';
import { useTheme } from 'src/stores/theme';
export default boot(() => { useTheme().apply(); });
