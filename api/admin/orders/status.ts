import {parseBody,respond,secureError,tokenValid,updateOrderStatus} from '../../_orderStore';

/** Protected independent status update, preserving encrypted order history. */
export default async function handler(req:any,res:any){
  if(req.method!=='POST')return respond(res,405,{error:'طريقة غير مدعومة'});
  if(!tokenValid(req))return respond(res,401,{error:'انتهت جلسة لوحة التحكم؛ يرجى تسجيل الدخول مجددًا.'});
  try{
    const body=await parseBody(req);
    await updateOrderStatus(String(body.id||''),String(body.status||''));
    return respond(res,200,{success:true});
  }catch(err){
    const problem=secureError(err,'status update');
    return respond(res,problem.code,{error:problem.error});
  }
}
