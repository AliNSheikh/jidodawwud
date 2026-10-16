// Direct Vercel Function route: /api/order
import handler from './index';
export default function route(req: any, res: any) {
  return handler(req, res, '/order');
}
