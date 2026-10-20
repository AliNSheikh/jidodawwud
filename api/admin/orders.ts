import {listOrders,respond,secureError,tokenValid} from '../_orderStore';

/** Protected independent orders list. Returns JSON even when storage fails. */
export default async function handler(req:any,res:any){
  if(req.method!=='GET')return respond(res,405,{error:'طريقة غير مدعومة'});
  if(!tokenValid(req))return respond(res,401,{error:'انتهت جلسة لوحة التحكم؛ يرجى تسجيل الدخول مجددًا.'});
  try{
    const orders=await listOrders();
    return respond(res,200,{orders});
  }catch(err){
    const problem=secureError(err,'admin listing');
    return respond(res,problem.code,{error:problem.error});
  }
}
