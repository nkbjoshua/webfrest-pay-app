import { boot } from 'quasar/wrappers';
import { useTheme } from 'src/stores/theme';
export default boot(() => { useTheme().apply(); });
