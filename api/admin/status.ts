import crypto from 'node:crypto';

function isAuthorized(req:any):boolean {
  const secret=process.env.SESSION_SECRET||'';
  const token=String(req.headers?.authorization||'').replace(/^Bearer\s+/i,'');
  if(!secret||!token)return false;
  const [data,sig,extra]=token.split('.');
  if(!data||!sig||extra)return false;
  const expected=crypto.createHmac('sha256',secret).update(data).digest('base64url');
  if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return false;
  try{return JSON.parse(Buffer.from(data,'base64url').toString('utf8')).exp>Date.now();}catch{return false;}
}
function respond(res:any,status:number,data:any) {
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  return res.status(status).json(data);
}

export default async function handler(req:any,res:any) {
  if(req.method!=='GET')return respond(res,405,{error:'طريقة الطلب غير مدعومة'});
  if(!isAuthorized(req))return respond(res,401,{error:'انتهت جلسة المسؤول، سجّل الدخول مرة أخرى'});
  const token=process.env.GITHUB_TOKEN||process.env.GITHUB_PAT||'';
  const encryptionKey=process.env.ORDERS_ENCRYPTION_KEY||'';
  const ordersEncrypted=/^[a-f0-9]{64}$/i.test(encryptionKey);
  const result:{githubConfigured:boolean;ordersEncrypted:boolean;githubAccess:boolean|null;githubError?:string}={
    githubConfigured:!!token,ordersEncrypted,githubAccess:null
  };
  if(!token){
    result.githubError='أضف GITHUB_TOKEN إلى Vercel ثم أعد النشر';
    return respond(res,200,result);
  }
  const owner=process.env.GITHUB_REPO_OWNER||'AliNSheikh';
  const repo=process.env.GITHUB_REPO_NAME||'jidodawwud';
  const branch=process.env.GITHUB_BRANCH||'main';
  try{
    const r=await fetch('https://api.github.com/repos/'+encodeURIComponent(owner)+'/'+encodeURIComponent(repo)+'/contents/data/menu.json?ref='+encodeURIComponent(branch),{
      headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'User-Agent':'Jido-Dawwud-Menu'},
      signal:AbortSignal.timeout(8000),cache:'no-store'
    });
    result.githubAccess=r.ok;
    if(!r.ok)result.githubError=
      r.status===401?'رمز GitHub غير صالح':
      r.status===403?'الرمز لا يمتلك إذن Contents لقراءة المستودع':
      r.status===404?'المستودع أو ملف القائمة غير موجود، تحقق من اسم المستودع والفرع':
      'GitHub error (HTTP '+r.status+')';
  }catch(err:any){result.githubAccess=false;result.githubError='تعذر فحص الاتصال بـ GitHub حاليًا';console.warn('Jido GitHub status check:',err?.message);}
  return respond(res,200,result);
}
