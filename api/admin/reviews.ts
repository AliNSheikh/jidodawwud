import crypto from 'node:crypto';

type Review = {
  id:string; productId:string; name:string; rating:number; comment:string;
  createdAt:string; updatedAt?:string; approved:boolean;
};
const OWNER=process.env.GITHUB_REPO_OWNER || 'AliNSheikh';
const REPO=process.env.GITHUB_REPO_NAME || 'jidodawwud';
const BRANCH=process.env.GITHUB_BRANCH || 'main';
const FILE='data/reviews.encrypted.json';
const ENCRYPTION_KEY=process.env.ORDERS_ENCRYPTION_KEY || '';
const TOKEN=process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || '';
const URL='https://api.github.com/repos/'+encodeURIComponent(OWNER)+'/'+encodeURIComponent(REPO)+'/contents/'+FILE;
const headers=()=>({
  Accept:'application/vnd.github+json',
  'X-GitHub-Api-Version':'2022-11-28',
  'User-Agent':'Jido-Dawwud-Reviews',
  ...(TOKEN?{Authorization:'Bearer '+TOKEN}:{})
});
function reply(res:any,status:number,body:any) {
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store, max-age=0');
  return res.status(status).json(body);
}
function adminAllowed(req:any) {
  const secret=process.env.SESSION_SECRET || '';
  if(!secret)return false;
  const token=String(req.headers?.authorization||'').replace(/^Bearer\s+/i,'');
  const [payload,sig,extra]=token.split('.');
  if(!payload||!sig||extra)return false;
  const expected=crypto.createHmac('sha256',secret).update(payload).digest('base64url');
  if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return false;
  try{return JSON.parse(Buffer.from(payload,'base64url').toString('utf8')).exp>Date.now();}catch{return false;}
}
function reqBody(req:any) {
  if(req.body && typeof req.body==='object')return req.body;
  if(typeof req.body==='string')return JSON.parse(req.body);
  return {};
}
function clean(value:any,max:number) {
  return String(value??'').trim().replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').slice(0,max);
}
function publicView(r:Review) {return {id:r.id,productId:r.productId,name:r.name,rating:r.rating,comment:r.comment,createdAt:r.createdAt};}
function isWriteConflict(status:number){return status===409||status===422;}
function tokenConfigured(){return !!TOKEN && /^[a-f0-9]{64}$/i.test(ENCRYPTION_KEY);}
function reviewCipherKey() {
  if(!/^[a-f0-9]{64}$/i.test(ENCRYPTION_KEY))throw new Error('ORDERS_ENCRYPTION_KEY required for review privacy');
  return crypto.createHash('sha256').update(Buffer.from(ENCRYPTION_KEY,'hex')).update('jidodawwud/reviews/v1').digest();
}
function encryptReviews(items:Review[]){
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',reviewCipherKey(),iv);
  const ciphertext=Buffer.concat([cipher.update(JSON.stringify(items),'utf8'),cipher.final()]);
  return {version:1,algorithm:'aes-256-gcm',iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')};
}
function decryptReviews(doc:any):Review[]{
  if(doc?.algorithm!=='aes-256-gcm')throw new Error('Unsupported review cipher');
  const dec=crypto.createDecipheriv('aes-256-gcm',reviewCipherKey(),Buffer.from(doc.iv,'base64'));
  dec.setAuthTag(Buffer.from(doc.tag,'base64'));
  const data=JSON.parse(Buffer.concat([dec.update(Buffer.from(doc.ciphertext,'base64')),dec.final()]).toString('utf8'));
  if(!Array.isArray(data))throw new Error('Invalid decrypted reviews');
  return data;
}
async function readReviews():Promise<{items:Review[];sha:string}> {
  reviewCipherKey(); // Missing/invalid encryption configuration must not expose reviews.
  const response=await fetch(URL+'?ref='+encodeURIComponent(BRANCH),{
    headers:headers(),cache:'no-store',signal:AbortSignal.timeout(12000)
  });
  if(response.status===404)return {items:[],sha:''};
  if(!response.ok)throw new Error('GitHub reviews read failed ('+response.status+')');
  const file:any=await response.json();
  const parsed=JSON.parse(Buffer.from(file.content.replace(/\s/g,''),'base64').toString('utf8'));
  const reviews=decryptReviews(parsed);
  return {items:reviews.filter((r:any)=>r&&typeof r.id==='string') as Review[],sha:file.sha};
}
async function saveReviews(items:Review[],sha:string) {
  if(!TOKEN)throw new Error('Missing GITHUB_TOKEN');
  const response=await fetch(URL,{
    method:'PUT',headers:{...headers(),'Content-Type':'application/json'},
    body:JSON.stringify({message:'chore(reviews): update moderated product reviews',branch:BRANCH,
      ...(sha?{sha}:{}),content:Buffer.from(JSON.stringify(encryptReviews(items)),'utf8').toString('base64')}),
    signal:AbortSignal.timeout(16000)
  });
  if(!response.ok){const err:any=new Error('GitHub reviews write failed ('+response.status+')');err.status=response.status;throw err;}
}
async function applyReviewChange(change:(current:Review[])=>Review[]) {
  for(let attempt=0;attempt<6;attempt++) {
    const current=await readReviews();
    const updated=change(current.items);
    if(updated.length>2500)throw new Error('تم بلوغ الحد الأقصى للتقييمات');
    try {await saveReviews(updated,current.sha);return;}
    catch(e:any){if(isWriteConflict(e.status))continue;throw e;}
  }
  throw new Error('حدث تعارض أثناء حفظ التقييمات. أعد المحاولة.');
}
function ratingSummary(items:Review[]) {
  const byProduct:Record<string,{average:number;count:number}>={};
  const tally:Record<string,{sum:number;count:number}>={};
  for(const r of items){
    if(!r.approved||!Number.isInteger(r.rating)||r.rating<1||r.rating>5)continue;
    if(!tally[r.productId])tally[r.productId]={sum:0,count:0};
    tally[r.productId].sum+=r.rating;tally[r.productId].count++;
  }
  for(const [id,x] of Object.entries(tally))byProduct[id]={average:Math.round(x.sum/x.count*10)/10,count:x.count};
  return byProduct;
}
async function productExists(productId:string) {
  const url='https://api.github.com/repos/'+encodeURIComponent(OWNER)+'/'+encodeURIComponent(REPO)+'/contents/data/menu.json?ref='+encodeURIComponent(BRANCH);
  const r=await fetch(url,{headers:headers(),signal:AbortSignal.timeout(10000),cache:'no-store'});
  if(!r.ok)throw new Error('تعذر التحقق من المنتج');
  const f:any=await r.json();
  const data=JSON.parse(Buffer.from(f.content.replace(/\s/g,''),'base64').toString('utf8'));
  return Array.isArray(data.items)&&data.items.some((p:any)=>p.id===productId&&p.isAvailable);
}
function publicError(e:any) {
  const msg=String(e?.message||'');
  if(e?.status===403||e?.status===401)return 'يحتاج نظام التقييمات إلى صلاحية GitHub للكتابة.';
  if(msg.includes('تعارض')||msg.includes('الحد الأقصى')||msg.includes('طلبات معلقة'))return msg;
  console.error('Reviews API error:',e);
  return 'تعذر حفظ التقييم الآن. حاول لاحقًا.';
}



export default async function handler(req:any,res:any) {
  try {
    if(!adminAllowed(req))return reply(res,401,{error:'انتهت الجلسة، يرجى تسجيل الدخول مجددًا'});
    if(req.method==='GET') {
      const {items}=await readReviews();
      return reply(res,200,{reviews:items.sort((a,b)=>Number(a.approved)-Number(b.approved)||b.createdAt.localeCompare(a.createdAt))});
    }
    if(req.method!=='POST')return reply(res,405,{error:'طريقة غير مدعومة'});
    const body=reqBody(req);
    const id=clean(body.id,100),action=clean(body.action,20);
    if(!id||!['update','delete'].includes(action))return reply(res,400,{error:'بيانات العملية غير صالحة'});
    let found=false;
    const rating=Number(body.rating);
    const name=clean(body.name,45),comment=clean(body.comment,700);
    if(action==='update'&&(!Number.isInteger(rating)||rating<1||rating>5||name.length<2||comment.length<12))
      return reply(res,400,{error:'يرجى إدخال اسم وتعليق صالحين وتقييم من نجمة إلى خمس نجوم'});
    await applyReviewChange(items=>{
      const review=items.find(x=>x.id===id);
      if(!review)throw new Error('لم يتم العثور على التقييم');
      found=true;
      if(action==='delete')return items.filter(x=>x.id!==id);
      return items.map(x=>x.id===id?{...x,name,comment,rating,approved:body.approved===true,updatedAt:new Date().toISOString()} as Review:x);
    });
    return reply(res,200,{success:found});
  }catch(e:any){return reply(res,400,{error:publicError(e)});}
}
