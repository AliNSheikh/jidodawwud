import crypto from 'node:crypto';
import {getCheckoutMenu,orderConfigValid,parseBody,priceOrder,respond,sanitize,secureError,storeOrder,whatsappText} from './_orderStore';

/** Standalone checkout function — independent from the older monolithic API. */
export default async function handler(req:any,res:any){
  if(req.method!=='POST')return respond(res,405,{error:'طريقة الطلب غير مدعومة'});
  try{
    if(!orderConfigValid())return respond(res,503,{error:'خدمة تسجيل الطلبات غير مهيأة حاليًا. يرجى التواصل مع المطعم.'});
    const body=await parseBody(req);
    const menu=await getCheckoutMenu();
    const whatsapp=sanitize(menu.restaurant.whatsapp,22).replace(/\D/g,'');
    if(!/^[1-9]\d{7,14}$/.test(whatsapp))
      return respond(res,503,{error:'رقم واتساب المطعم غير مضبوط. يرجى التواصل مع الإدارة.'});
    const customerName=sanitize(body.customerName,100);
    const phone=sanitize(body.phone,22);
    const address=sanitize(body.address,260);
    const service=sanitize(body.service,20);
    const payment=sanitize(body.payment,20);
    if(customerName.length<2||!/^[+0-9 ()-]{8,22}$/.test(phone))
      return respond(res,400,{error:'يرجى إدخال الاسم ورقم جوال صحيح'});
    if(service==='delivery'&&address.length<6)
      return respond(res,400,{error:'يرجى كتابة عنوان التوصيل'});
    if(payment!=='cash'&&payment!=='visa')
      return respond(res,400,{error:'يرجى تحديد طريقة الدفع'});
    const details=priceOrder(menu,body.items,sanitize(body.promo,50),service);
    const order={
      id:'JD-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomBytes(3).toString('hex').toUpperCase(),
      createdAt:new Date().toISOString(),customerName,phone,
      address:service==='delivery'?address:'',service,payment,
      notes:sanitize(body.notes,350),...details,status:'pending'
    };
    await storeOrder(order);
    return respond(res,201,{
      success:true,orderId:order.id,
      whatsappUrl:'https://wa.me/'+whatsapp+'?text='+encodeURIComponent(whatsappText(order))
    });
  }catch(err){
    const problem=secureError(err,'checkout');
    return respond(res,problem.code,{error:problem.error});
  }
}
