// Direct Vercel Function route: /api/admin/status
import handler from '../index';
export default function route(req: any, res: any) {
  req.query = { ...(req.query || {}), route: 'admin/status' };
  return handler(req, res);
}
