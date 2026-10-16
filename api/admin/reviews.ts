import {adminAllowed,applyReviewChange,clean,publicError,readReviews,reply,reqBody,type Review} from '../_reviewStore';

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
