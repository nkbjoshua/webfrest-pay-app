import { boot } from 'quasar/wrappers';
import { setupApi } from 'src/services/api';
export default boot(({ router }) => { setupApi(router); });
