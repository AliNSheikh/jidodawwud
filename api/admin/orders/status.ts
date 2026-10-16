// Direct Vercel Function route: /api/admin/orders/status
import handler from '../../index';
export default function route(req: any, res: any) {
  return handler(req, res, '/admin/orders/status');
}
