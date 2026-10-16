import crypto from 'node:crypto';

/**
 * Independent Vercel serverless login endpoint. It never imports the
 * menu/order module, and returns JSON for both success and errors.
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Jido-API', 'admin-login-v2');
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'هذا المسار مخصص لتسجيل الدخول فقط' });
    }

    const password = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET_KEY || '';
    const sessionSecret = process.env.SESSION_SECRET || '';
    if (!password || !sessionSecret) {
      return res.status(503).json({
        error: 'يرجى ضبط ADMIN_PASSWORD و SESSION_SECRET في بيئة Production على Vercel، ثم إعادة النشر'
      });
    }

    let input: any = req.body;
    if (typeof input === 'string') {
      try { input = JSON.parse(input); } catch { input = {}; }
    }
    if (!input || typeof input !== 'object') input = {};
    const entered = typeof input.password === 'string' ? input.password : '';

    // Fixed-length SHA256 digests keep comparisons constant-time.
    const expectedDigest = crypto.createHash('sha256').update(password, 'utf8').digest();
    const enteredDigest = crypto.createHash('sha256').update(entered, 'utf8').digest();
    if (!entered || !crypto.timingSafeEqual(expectedDigest, enteredDigest)) {
      return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
    }

    const payload = Buffer.from(JSON.stringify({
      exp: Date.now() + 8 * 60 * 60 * 1000,
      nonce: crypto.randomBytes(10).toString('hex')
    })).toString('base64url');
    const signature = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url');

    return res.status(200).json({ success: true, token: payload + '.' + signature });
  } catch (error) {
    console.error('Jido admin login error:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مجددًا.' });
  }
}
