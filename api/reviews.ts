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



async function orderCounts(res:any) {
  const key=process.env.ORDERS_ENCRYPTION_KEY||'';
  const token=process.env.GITHUB_TOKEN||process.env.GITHUB_PAT||'';
  if(!/^[0-9a-f]{64}$/i.test(key)||!token)return reply(res,200,{counts:{},available:false});
  try{
    const owner=process.env.GITHUB_REPO_OWNER||'AliNSheikh',repo=process.env.GITHUB_REPO_NAME||'jidodawwud';
    const branch=process.env.GITHUB_BRANCH||'main';
    const url='https://api.github.com/repos/'+encodeURIComponent(owner)+'/'+encodeURIComponent(repo)+'/contents/data/orders.encrypted.json?ref='+encodeURIComponent(branch);
    const r=await fetch(url,{headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'User-Agent':'Jido-Dawwud-Stats'},cache:'no-store',signal:AbortSignal.timeout(11000)});
    if(r.status===404)return reply(res,200,{counts:{},available:true});
    if(!r.ok)throw new Error('GitHub order read '+r.status);
    const file:any=await r.json();
    const envelope=JSON.parse(Buffer.from(file.content.replace(/\s/g,''),'base64').toString('utf8'));
    if(envelope.algorithm!=='aes-256-gcm')throw new Error('Unsupported order cipher');
    const decipher=crypto.createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),Buffer.from(envelope.iv,'base64'));
    decipher.setAuthTag(Buffer.from(envelope.tag,'base64'));
    const orders=JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext,'base64')),decipher.final()]).toString('utf8'));
    if(!Array.isArray(orders))throw new Error('Invalid orders');
    const counts:Record<string,number>={};
    const orderIds=new Set<string>();
    for(const o of orders){
      if(!o||o.status==='cancelled'||typeof o.id!=='string'||orderIds.has(o.id))continue;
      orderIds.add(o.id);
      const products=new Set<string>();
      for(const item of Array.isArray(o.items)?o.items:[]){
        const id=typeof item.productId==='string'?item.productId:'';
        if(id)products.add(id);
      }
      for(const id of products)counts[id]=(counts[id]||0)+1;
    }
    // Expose only product-level counts, never personally identifiable order data.
    return reply(res,200,{counts,available:true});
  }catch(err:any){console.error('Product order stats unavailable:',err?.message);return reply(res,503,{error:'تعذر تحميل إحصاءات الطلبات'});}
}

export default async function handler(req:any,res:any) {
  try {
    if(req.method==='GET'&&(req.query?.stats==='orders'||String(req.url||'').includes('stats=orders')))return await orderCounts(res);
    if(req.method==='GET') {
      const current=await readReviews();
      const approved=current.items.filter(r=>r.approved).map(publicView);
      return reply(res,200,{reviews:approved,summary:ratingSummary(current.items)});
    }
    if(req.method!=='POST')return reply(res,405,{error:'طريقة غير مدعومة'});
    if(!tokenConfigured())return reply(res,503,{error:'إضافة التقييمات غير متاحة مؤقتًا'});
    const raw=reqBody(req);
    // Honeypot discourages standard automated form spam; also gate volumes server-side.
    if(raw.website) return reply(res,400,{error:'تعذر إرسال التقييم'});
    const name=clean(raw.name,45),comment=clean(raw.comment,700),productId=clean(raw.productId,100);
    const rating=Number(raw.rating);
    if(name.length<2||comment.length<12||!Number.isInteger(rating)||rating<1||rating>5||!productId)
      return reply(res,400,{error:'اكتب اسمًا من حرفين على الأقل، وتعليقًا من 12 حرفًا على الأقل، وتقييمًا من نجمة إلى خمس نجوم.'});
    if(!await productExists(productId))return reply(res,404,{error:'هذا المنتج غير متاح'});
    const review:Review={
      id:crypto.randomUUID(),productId,name,comment,rating,createdAt:new Date().toISOString(),approved:false
    };
    await applyReviewChange(current=>{
      const pending=current.filter(x=>!x.approved);
      if(pending.length>=150||pending.filter(x=>x.productId===productId).length>=25)throw new Error('يوجد عدد كبير من التقييمات المعلقة حاليًا. حاول لاحقًا.');
      // Prevent exact duplicate reviews from repeat browser submissions.
      if(current.some(x=>x.productId===productId&&x.name===name&&x.comment===comment&&x.rating===rating))
        throw new Error('هذا التقييم موجود بالفعل');
      return [review,...current];
    });
    return reply(res,201,{success:true,message:'شكرًا لك! تم إرسال تقييمك للمراجعة وسيظهر بعد الموافقة عليه.'});
  } catch(e:any) {
    const message=publicError(e);
    return reply(res,400,{error:message});
  }
}
