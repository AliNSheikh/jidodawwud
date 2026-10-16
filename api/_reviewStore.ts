import crypto from 'node:crypto';

export type Review = {
  id:string; productId:string; name:string; rating:number; comment:string;
  createdAt:string; updatedAt?:string; approved:boolean;
};
const OWNER=process.env.GITHUB_REPO_OWNER || 'AliNSheikh';
const REPO=process.env.GITHUB_REPO_NAME || 'jidodawwud';
const BRANCH=process.env.GITHUB_BRANCH || 'main';
const FILE='data/reviews.json';
const TOKEN=process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || '';
const URL='https://api.github.com/repos/'+encodeURIComponent(OWNER)+'/'+encodeURIComponent(REPO)+'/contents/'+FILE;
const headers=()=>({
  Accept:'application/vnd.github+json',
  'X-GitHub-Api-Version':'2022-11-28',
  'User-Agent':'Jido-Dawwud-Reviews',
  ...(TOKEN?{Authorization:'Bearer '+TOKEN}:{})
});
export function reply(res:any,status:number,body:any) {
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store, max-age=0');
  return res.status(status).json(body);
}
export function adminAllowed(req:any) {
  const secret=process.env.SESSION_SECRET || '';
  if(!secret)return false;
  const token=String(req.headers?.authorization||'').replace(/^Bearer\s+/i,'');
  const [payload,sig,extra]=token.split('.');
  if(!payload||!sig||extra)return false;
  const expected=crypto.createHmac('sha256',secret).update(payload).digest('base64url');
  if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return false;
  try{return JSON.parse(Buffer.from(payload,'base64url').toString('utf8')).exp>Date.now();}catch{return false;}
}
export function reqBody(req:any) {
  if(req.body && typeof req.body==='object')return req.body;
  if(typeof req.body==='string')return JSON.parse(req.body);
  return {};
}
export function clean(value:any,max:number) {
  return String(value??'').trim().replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').slice(0,max);
}
export function publicView(r:Review) {return {id:r.id,productId:r.productId,name:r.name,rating:r.rating,comment:r.comment,createdAt:r.createdAt};}
export function isWriteConflict(status:number){return status===409||status===422;}
export function tokenConfigured(){return !!TOKEN;}
export async function readReviews():Promise<{items:Review[];sha:string}> {
  const response=await fetch(URL+'?ref='+encodeURIComponent(BRANCH),{
    headers:headers(),cache:'no-store',signal:AbortSignal.timeout(12000)
  });
  if(response.status===404)return {items:[],sha:''};
  if(!response.ok)throw new Error('GitHub reviews read failed ('+response.status+')');
  const file:any=await response.json();
  const parsed=JSON.parse(Buffer.from(file.content.replace(/\s/g,''),'base64').toString('utf8'));
  if(!Array.isArray(parsed))throw new Error('Reviews file is not an array');
  return {items:parsed.filter((r:any)=>r&&typeof r.id==='string') as Review[],sha:file.sha};
}
export async function saveReviews(items:Review[],sha:string) {
  if(!TOKEN)throw new Error('Missing GITHUB_TOKEN');
  const response=await fetch(URL,{
    method:'PUT',headers:{...headers(),'Content-Type':'application/json'},
    body:JSON.stringify({message:'chore(reviews): update moderated product reviews',branch:BRANCH,
      ...(sha?{sha}:{}),content:Buffer.from(JSON.stringify(items,null,2),'utf8').toString('base64')}),
    signal:AbortSignal.timeout(16000)
  });
  if(!response.ok){const err:any=new Error('GitHub reviews write failed ('+response.status+')');err.status=response.status;throw err;}
}
export async function applyReviewChange(change:(current:Review[])=>Review[]) {
  for(let attempt=0;attempt<6;attempt++) {
    const current=await readReviews();
    const updated=change(current.items);
    if(updated.length>2500)throw new Error('تم بلوغ الحد الأقصى للتقييمات');
    try {await saveReviews(updated,current.sha);return;}
    catch(e:any){if(isWriteConflict(e.status))continue;throw e;}
  }
  throw new Error('حدث تعارض أثناء حفظ التقييمات. أعد المحاولة.');
}
export function ratingSummary(items:Review[]) {
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
export async function productExists(productId:string) {
  const url='https://api.github.com/repos/'+encodeURIComponent(OWNER)+'/'+encodeURIComponent(REPO)+'/contents/data/menu.json?ref='+encodeURIComponent(BRANCH);
  const r=await fetch(url,{headers:headers(),signal:AbortSignal.timeout(10000),cache:'no-store'});
  if(!r.ok)throw new Error('تعذر التحقق من المنتج');
  const f:any=await r.json();
  const data=JSON.parse(Buffer.from(f.content.replace(/\s/g,''),'base64').toString('utf8'));
  return Array.isArray(data.items)&&data.items.some((p:any)=>p.id===productId&&p.isAvailable);
}
export function publicError(e:any) {
  const msg=String(e?.message||'');
  if(e?.status===403||e?.status===401)return 'يحتاج نظام التقييمات إلى صلاحية GitHub للكتابة.';
  if(msg.includes('تعارض')||msg.includes('الحد الأقصى')||msg.includes('طلبات معلقة'))return msg;
  console.error('Reviews API error:',e);
  return 'تعذر حفظ التقييم الآن. حاول لاحقًا.';
}
