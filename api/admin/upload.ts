// Direct Vercel Function route: /api/admin/upload
import handler from '../index';
export default function route(req: any, res: any) {
  req.query = { ...(req.query || {}), route: 'admin/upload' };
  return handler(req, res);
}
