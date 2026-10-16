// Direct Vercel Function route: /api/admin/orders/status
import handler from '../../index';
export default function route(req: any, res: any) {
  req.query = { ...(req.query || {}), route: 'admin/orders/status' };
  return handler(req, res);
}
