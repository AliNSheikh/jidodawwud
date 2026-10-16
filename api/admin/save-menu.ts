import crypto from 'node:crypto';

/**
 * Standalone Vercel Serverless API for updating the restaurant's menu in GitHub.
 * This function intentionally does not import api/index.ts.
 * A problem in checkout / image handling must never prevent admin settings saves.
 */
function json(res: any, status: number, data: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Jido-API', 'save-menu-v2');
  return res.status(status).json(data);
}

function authorized(req: any): boolean {
  const secret = process.env.SESSION_SECRET || '';
  if (!secret) return false;
  const token = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '');
  const [data, signature, extra] = token.split('.');
  if (!data || !signature || extra) return false;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  if (signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch { return false; }
}

function getBody(req: any): any {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  return {};
}

function githubError(status: number, operation: string, detail = ''): { code: number; message: string } {
  if (status === 401) return { code: 502, message: 'رفض GitHub رمز الوصول. راجع GITHUB_TOKEN في إعدادات Vercel.' };
  if (status === 403) return { code: 502, message: 'ليس لدى GITHUB_TOKEN صلاحية الوصول للمستودع. اختر Contents: Read and write وتأكد من اختيار المستودع الصحيح.' };
  if (status === 404) return { code: 502, message: 'لم يتم العثور على مستودع GitHub أو ملف القائمة. تحقق من GITHUB_REPO_OWNER و GITHUB_REPO_NAME و GITHUB_BRANCH وصلاحية الرمز.' };
  if (status === 409 || status === 422) return { code: 409, message: 'رفض GitHub الحفظ بسبب تعارض مع تعديل آخر أو قيود على الفرع. حدّث البيانات وتحقق من إعدادات الفرع ثم حاول مجددًا.' };
  if (status === 429) return { code: 503, message: 'تم تجاوز حد طلبات GitHub مؤقتًا. حاول مرة أخرى بعد دقائق.' };
  console.error('GitHub', operation, 'failed with status', status, detail.slice(0, 160));
  return { code: 502, message: 'تعذر الاتصال بـ GitHub لحفظ البيانات (HTTP ' + status + '). حاول مجددًا.' };
}

async function responsePayload(r: Response) {
  try { return await r.json() as any; } catch { return null; }
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'هذا المسار مخصص لحفظ التغييرات فقط.' });
    if (!authorized(req)) return json(res, 401, { error: 'انتهت جلسة المسؤول. سجّل الدخول مرة أخرى.' });

    const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || '';
    const owner = process.env.GITHUB_REPO_OWNER || 'AliNSheikh';
    const repo = process.env.GITHUB_REPO_NAME || 'jidodawwud';
    const branch = process.env.GITHUB_BRANCH || 'main';

    if (!token.trim()) return json(res, 503, { error: 'لم يتم ضبط GITHUB_TOKEN في بيئة Production على Vercel.' });

    const requestBody = getBody(req);
    const menu = requestBody?.menu;
    const expectedSha = typeof requestBody?.expectedSha === 'string' ? requestBody.expectedSha.trim() : '';
    if (!menu || typeof menu !== 'object' ||
        !menu.restaurant || typeof menu.restaurant !== 'object' ||
        !Array.isArray(menu.categories) || !Array.isArray(menu.items) ||
        !Array.isArray(menu.promos) || !Array.isArray(menu.slides)) {
      return json(res, 400, { error: 'بيانات المطعم غير مكتملة؛ لم يتم حفظ أي تغييرات.' });
    }
    if (menu.categories.length > 300 || menu.items.length > 2000 || menu.slides.length > 30) {
      return json(res, 400, { error: 'تم تجاوز الحد المسموح لعدد الأصناف أو الأقسام أو الشرائح.' });
    }
    if (menu.items.some((p: any) => !p || typeof p.name !== 'string' ||
        typeof p.categoryId !== 'string' || !Number.isFinite(p.basePrice) || p.basePrice < 0)) {
      return json(res, 400, { error: 'يوجد منتج باسم أو سعر أو قسم غير صالح.' });
    }
    const serialized = JSON.stringify(menu, null, 2);
    if (Buffer.byteLength(serialized, 'utf8') > 3_000_000) {
      return json(res, 413, { error: 'ملف القائمة كبير جدًا ولا يمكن حفظه بهذه الصيغة.' });
    }

    const url = 'https://api.github.com/repos/' +
      encodeURIComponent(owner) + '/' + encodeURIComponent(repo) + '/contents/data/menu.json';
    const headers = {
      'Accept': 'application/vnd.github+json',
      'Authorization': 'Bearer ' + token,
      'User-Agent': 'Jido-Dawwud-Menu',
      'X-GitHub-Api-Version': '2022-11-28'
    };

    const latestResponse = await fetch(url + '?ref=' + encodeURIComponent(branch), {
      method: 'GET', headers, cache: 'no-store', signal: AbortSignal.timeout(12000)
    });
    if (!latestResponse.ok) {
      const problem = githubError(latestResponse.status, 'read');
      return json(res, problem.code, { error: problem.message });
    }
    const latest = await responsePayload(latestResponse);
    if (!latest || typeof latest.sha !== 'string') {
      return json(res, 502, { error: 'تعذر قراءة الإصدار الحالي للقائمة من GitHub.' });
    }
    if (!expectedSha || latest.sha !== expectedSha) {
      return json(res, 409, {
        error: 'تغيرت بيانات القائمة على GitHub بعد فتح لوحة التحكم. انسخ تعديلاتك المهمة، ثم حدّث الصفحة وأعد إدخالها قبل الحفظ حتى لا تُستبدل التعديلات الأخرى.'
      });
    }

    const saveResponse = await fetch(url, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'chore(menu): save Jido Dawwud settings from admin dashboard',
        branch,
        sha: latest.sha,
        content: Buffer.from(serialized, 'utf8').toString('base64')
      }),
      signal: AbortSignal.timeout(20000)
    });
    if (!saveResponse.ok) {
      const problem = githubError(saveResponse.status, 'write');
      return json(res, problem.code, { error: problem.message });
    }
    const saved = await responsePayload(saveResponse);
    const sha = saved?.content?.sha;
    if (typeof sha !== 'string' || !sha) {
      return json(res, 502, { error: 'استجاب GitHub دون رقم إصدار محفوظ؛ يرجى تحديث القائمة والتأكد من عملية الحفظ.' });
    }
    return json(res, 200, { success: true, sha });
  } catch (error: any) {
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    console.error('Jido save menu error:', error?.name || 'unknown', error?.message || '');
    return json(res, timedOut ? 504 : 500, {
      error: timedOut
        ? 'انتهت مهلة الاتصال مع GitHub. تحقق من اتصال الإنترنت وحاول مجددًا.'
        : 'تعذر حفظ التغييرات بسبب خطأ في الخادم. لم يتم تأكيد الحفظ على GitHub.'
    });
  }
}
