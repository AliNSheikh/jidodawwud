// Direct Vercel Function route: /api/order
import handler from './index';
export default function route(req: any, res: any) {
  req.query = { ...(req.query || {}), route: 'order' };
  return handler(req, res);
}
