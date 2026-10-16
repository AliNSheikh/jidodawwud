// Direct Vercel Function route: /api/admin/login
import handler from '../index';
export default function route(req: any, res: any) {
  req.query = { ...(req.query || {}), route: 'admin/login' };
  return handler(req, res);
}
