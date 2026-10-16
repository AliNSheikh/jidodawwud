// Direct Vercel Function route: /api/admin/status
import handler from '../index';
export default function route(req: any, res: any) {
  return handler(req, res, '/admin/status');
}
