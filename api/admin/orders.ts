// Direct Vercel Function route: /api/admin/orders
import handler from '../index';
export default function route(req: any, res: any) {
  req.query = { ...(req.query || {}), route: 'admin/orders' };
  return handler(req, res);
}
