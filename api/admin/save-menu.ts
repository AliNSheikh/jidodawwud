// Direct Vercel Function route: /api/admin/save-menu
import handler from '../index';
export default function route(req: any, res: any) {
  req.query = { ...(req.query || {}), route: 'admin/save-menu' };
  return handler(req, res);
}
