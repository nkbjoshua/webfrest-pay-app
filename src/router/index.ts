import { route } from 'quasar/wrappers';
import { createRouter, createWebHistory } from 'vue-router';
import routes from './routes';
import { useAuth } from 'src/stores/auth';

export default route(function () {
  const router = createRouter({ scrollBehavior: () => ({ left: 0, top: 0 }), routes, history: createWebHistory() });
  router.beforeEach((to) => {
    const auth = useAuth();
    if (to.meta.public) return true;
    if (!auth.isAuthed) return { path: '/login', query: to.fullPath !== '/' ? { next: to.fullPath } : {} };
    if (auth.user?.mustChangePassword && to.path !== '/change-password') return '/change-password';
    if (to.meta.area === 'ops' && !auth.isOps) return '/dashboard/overview';
    if (to.meta.area === 'merchant' && auth.isOps) return '/ops/overview';
    return true;
  });
  return router;
});
