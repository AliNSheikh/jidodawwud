import crypto from 'node:crypto';
import {applyReviewChange,clean,productExists,publicError,publicView,ratingSummary,readReviews,reply,reqBody,tokenConfigured,type Review} from './_reviewStore';

export default async function handler(req:any,res:any) {
  try {
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
