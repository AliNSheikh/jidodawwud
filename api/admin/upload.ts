import crypto from 'node:crypto';

function respond(res:any,status:number,data:any) {
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  return res.status(status).json(data);
}
function isAuthorized(req:any):boolean {
  const secret=process.env.SESSION_SECRET||'';
  const token=String(req.headers?.authorization||'').replace(/^Bearer\s+/i,'');
  if(!secret||!token)return false;
  const [data,sig,extra]=token.split('.');
  if(!data||!sig||extra)return false;
  const expected=crypto.createHmac('sha256',secret).update(data).digest('base64url');
  if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return false;
  try {return JSON.parse(Buffer.from(data,'base64url').toString('utf8')).exp>Date.now();}catch{return false;}
}
function dataBody(req:any):any {
  if(req.body && typeof req.body==='object')return req.body;
  if(typeof req.body==='string')return JSON.parse(req.body);
  return {};
}
export default async function handler(req:any,res:any) {
  try{
    if(req.method!=='POST')return respond(res,405,{error:'طريقة الطلب غير مدعومة'});
    if(!isAuthorized(req))return respond(res,401,{error:'انتهت جلسة المسؤول. سجل الدخول مجددًا'});
    const token=process.env.GITHUB_TOKEN||process.env.GITHUB_PAT||'';
    if(!token)return respond(res,503,{error:'أضف GITHUB_TOKEN في Vercel ثم أعد النشر لتفعيل رفع الصور'});
    const b=dataBody(req);
    const matches=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(b.data||''));
    if(!matches)return respond(res,400,{error:'يجب رفع صورة JPEG أو PNG أو WebP'});
    const raw=Buffer.from(matches[2],'base64');
    if(raw.length===0||raw.length>2_000_000)return respond(res,413,{error:'حجم الصورة يجب ألا يتجاوز 2 ميغابايت'});
    const mime=matches[1];
    const isPng=mime==='image/png'&&raw.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const isJpeg=mime==='image/jpeg'&&raw[0]===255&&raw[1]===216&&raw[2]===255;
    const isWebp=mime==='image/webp'&&raw.toString('ascii',0,4)==='RIFF'&&raw.toString('ascii',8,12)==='WEBP';
    if(!isPng&&!isJpeg&&!isWebp)return respond(res,400,{error:'الملف ليس صورة مدعومة'});
    const ext=isPng?'png':isJpeg?'jpg':'webp';
    const owner=process.env.GITHUB_REPO_OWNER||'AliNSheikh';
    const repo=process.env.GITHUB_REPO_NAME||'jidodawwud';
    const branch=process.env.GITHUB_BRANCH||'main';
    const path='public/uploads/'+Date.now()+'-'+crypto.randomBytes(8).toString('hex')+'.'+ext;
    const r=await fetch('https://api.github.com/repos/'+encodeURIComponent(owner)+'/'+encodeURIComponent(repo)+'/contents/'+path,{
      method:'PUT',
      headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'User-Agent':'Jido-Dawwud-Menu','Content-Type':'application/json'},
      body:JSON.stringify({message:'chore(menu): upload product image',branch,content:matches[2]}),
      signal:AbortSignal.timeout(18000)
    });
    if(!r.ok){
      console.error('Jido upload GitHub status:',r.status);
      return respond(res,r.status===403?502:r.status===401?502:502,{
        error:r.status===401?'GITHUB_TOKEN غير صالح':r.status===403?'GITHUB_TOKEN يحتاج صلاحية Contents: Read and write على المستودع':r.status===404?'المستودع غير موجود أو لا يسمح الرمز بالوصول إليه':'تعذر رفع الصورة إلى GitHub (HTTP '+r.status+')'
      });
    }
    return respond(res,200,{url:'https://raw.githubusercontent.com/'+encodeURIComponent(owner)+'/'+encodeURIComponent(repo)+'/'+encodeURIComponent(branch)+'/'+path});
  }catch(err:any){
    console.error('Jido upload error:',err?.message||'unknown');
    return respond(res,err?.name==='TimeoutError'?504:500,{error:'تعذر رفع الصورة الآن. يرجى المحاولة مجددًا.'});
  }
}
