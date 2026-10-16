// Standalone Vercel Function for checking serverless runtime availability.
export default function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  return res.status(200).json({
    ok: true, service: 'jido-dawwud-api',
    timestamp: new Date().toISOString()
  });
}
