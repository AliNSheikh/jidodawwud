// Standalone Vercel Function: public menu endpoint, no secrets required.
const fallbackMenu = {
  restaurant: {
    name: 'جدو داوود', tagline: 'نكهات تجمعنا ولحظات تبقى',
    currency: 'SAR', currencySymbol: '⃁', locale: 'ar-SA',
    logoUrl: '/logo.webp', faviconUrl: '/logo.webp',
    whatsapp: '', phone: '', address: '', hours: '', mapEmbedUrl: '',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap',
    deliveryEnabled: false, deliveryFee: 0, freeDeliveryMinimum: 100,
    social: { facebook: '', instagram: '', tiktok: '', snapchat: '' }
  },
  categories: [], items: [], promos: [], slides: []
};

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const owner = process.env.GITHUB_REPO_OWNER || 'AliNSheikh';
  const repo = process.env.GITHUB_REPO_NAME || 'jidodawwud';
  const branch = process.env.GITHUB_BRANCH || 'main';
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
  try {
    const url = 'https://api.github.com/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo) +
      '/contents/data/menu.json?ref=' + encodeURIComponent(branch);
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Jido-Dawwud',
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('GitHub returned ' + response.status);
    const file: any = await response.json();
    const menu = JSON.parse(Buffer.from(String(file.content).replace(/\s/g, ''), 'base64').toString('utf8'));
    if (!menu?.restaurant || !Array.isArray(menu.items) || !Array.isArray(menu.categories))
      throw new Error('GitHub menu has an invalid schema');
    return res.status(200).json({ menu, sha: file.sha, source: 'github' });
  } catch (err: any) {
    console.error('Public menu fallback:', err?.message || err);
    return res.status(200).json({
      menu: fallbackMenu, sha: '', source: 'fallback',
      warning: 'تعذر مزامنة القائمة مؤقتًا من GitHub. يرجى تحديث الصفحة لاحقًا.'
    });
  }
}
