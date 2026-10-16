import crypto from 'node:crypto';
import {applyReviewChange,clean,productExists,publicError,publicView,ratingSummary,readReviews,reply,reqBody,tokenConfigured,type Review} from './_reviewStore';


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
