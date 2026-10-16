import crypto from 'node:crypto';
import initialMenu from '../data/menu.json';

const OWNER = process.env.GITHUB_REPO_OWNER || 'AliNSheikh';
const REPO = process.env.GITHUB_REPO_NAME || 'jedodawod';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const GH_TOKEN = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || '';
const PASS = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET_KEY || '';
const SECRET = process.env.SESSION_SECRET || '';
const ORDER_KEY = process.env.ORDERS_ENCRYPTION_KEY || '';
const MENU_PATH = 'data/menu.json';
const ORDERS_PATH = 'data/orders.encrypted.json';

function respond(res:any, status:number, value:any) {
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.status(status).json(value);
}
function errorMessage(e:any) { return String(e?.message || 'حدث خطأ غير متوقع'); }
async function body(req:any) {
  if(typeof req.body === 'object' && req.body !== null) return req.body;
  if(typeof req.body === 'string') return JSON.parse(req.body);
  let input = '';
  for await (const part of req) { input += part; if(input.length>4_000_000) throw new Error('حجم الطلب كبير'); }
  return input ? JSON.parse(input) : {};
}
const ghHeaders = () => ({
  Accept:'application/vnd.github+json',
  'User-Agent':'Jido-Dawwud-Menu',
  ...(GH_TOKEN ? {Authorization:'Bearer '+GH_TOKEN}: {})
});
async function ghRead(path:string):Promise<{value:any;sha:string}|null> {
  const url = 'https://api.github.com/repos/'+OWNER+'/'+REPO+'/contents/'+path+'?ref='+encodeURIComponent(BRANCH)+'&t='+Date.now();
  const r = await fetch(url,{headers:ghHeaders(),cache:'no-store'});
  if(r.status===404) return null;
  if(!r.ok) throw new Error('GitHub read failed ('+r.status+')');
  const file:any = await r.json();
  return {value:JSON.parse(Buffer.from(file.content.replace(/\s/g,''),'base64').toString('utf8')),sha:file.sha};
}
async function ghWrite(path:string, text:string, sha?:string, binary=false) {
  if(!GH_TOKEN) throw new Error('يجب إعداد GITHUB_TOKEN على Vercel لتفعيل الحفظ');
  const r=await fetch('https://api.github.com/repos/'+OWNER+'/'+REPO+'/contents/'+path,{
    method:'PUT',
    headers:{...ghHeaders(),'Content-Type':'application/json'},
    body:JSON.stringify({message:'Jido Dawwud: update '+path,branch:BRANCH,content:binary?text:Buffer.from(text,'utf8').toString('base64'),...(sha?{sha}:{})})
  });
  const value:any=await r.json().catch(()=>({}));
  if(!r.ok) {
    const err:any=new Error(value.message||('GitHub write failed ('+r.status+')'));
    err.status=r.status;
    throw err;
  }
  return value.content?.sha || '';
}
function createToken() {
  const payload=Buffer.from(JSON.stringify({exp:Date.now()+8*3600*1000,nonce:crypto.randomBytes(10).toString('hex')})).toString('base64url');
  const sig=crypto.createHmac('sha256',SECRET).update(payload).digest('base64url');
  return payload+'.'+sig;
}
function authorized(req:any) {
  if(!SECRET) return false;
  const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  const [data,sig]=token.split('.');
  if(!data||!sig) return false;
  const expected=crypto.createHmac('sha256',SECRET).update(data).digest('base64url');
  if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return false;
  try{return JSON.parse(Buffer.from(data,'base64url').toString()).exp>Date.now();}catch{return false;}
}
function encryptedOrders(orders:any[]) {
  const key=Buffer.from(ORDER_KEY,'hex');
  if(key.length!==32)throw new Error('ORDERS_ENCRYPTION_KEY must be 64 hex characters');
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
  const ciphertext=Buffer.concat([cipher.update(JSON.stringify(orders),'utf8'),cipher.final()]);
  return {version:1,algorithm:'aes-256-gcm',iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')};
}
function decryptedOrders(envelope:any):any[] {
  if(!envelope) return [];
  const key=Buffer.from(ORDER_KEY,'hex');
  if(key.length!==32)throw new Error('ORDERS_ENCRYPTION_KEY must be configured');
  const dec=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'));
  dec.setAuthTag(Buffer.from(envelope.tag,'base64'));
  const result=JSON.parse(Buffer.concat([dec.update(Buffer.from(envelope.ciphertext,'base64')),dec.final()]).toString('utf8'));
  return Array.isArray(result)?result:[];
}
async function getMenu() {
  const remote=await ghRead(MENU_PATH);
  return remote || {value:initialMenu,sha:''};
}
const validNumber=(n:any)=> Number.isFinite(Number(n)) && Number(n)>=0 ? Number(n) : 0;
function effectivePrice(p:any) {
  return p.offerEnabled && validNumber(p.offerPrice)<validNumber(p.basePrice) ? validNumber(p.offerPrice) : validNumber(p.basePrice);
}
function calculate(menu:any, lines:any[], code:string, service:string) {
  const items=(Array.isArray(lines)?lines:[]).slice(0,60).map((line:any)=>{
    const product=menu.items.find((p:any)=>p.id===line.productId && p.isAvailable);
    const quantity=Math.floor(Number(line.quantity));
    if(!product||!Number.isFinite(quantity)||quantity<1||quantity>99)throw new Error('تحتوي السلة على منتج غير متاح أو كمية غير صالحة');
    return {productId:product.id,name:product.name,quantity,unitPrice:effectivePrice(product),total:Math.round(quantity*effectivePrice(product)*100)/100};
  });
  if(!items.length)throw new Error('السلة فارغة');
  const subtotal=Math.round(items.reduce((sum:number,l:any)=>sum+l.total,0)*100)/100;
  const promo=(menu.promos||[]).find((p:any)=>p.enabled && p.code?.trim().toLowerCase()===code.trim().toLowerCase());
  if(code && !promo)throw new Error('رمز الخصم غير صالح أو غير مفعّل');
  const discount=promo?Math.round(Math.min(subtotal,promo.type==='percent'?subtotal*validNumber(promo.value)/100:validNumber(promo.value))*100)/100:0;
  const afterDiscount=subtotal-discount;
  if(service==='delivery' && !menu.restaurant.deliveryEnabled)throw new Error('التوصيل غير متاح حاليًا');
  if(service!=='delivery' && service!=='pickup')throw new Error('يجب تحديد التوصيل أو الاستلام');
  const shipping=service==='delivery' && afterDiscount < validNumber(menu.restaurant.freeDeliveryMinimum)
    ?validNumber(menu.restaurant.deliveryFee):0;
  return {items,subtotal,discount,deliveryFee:shipping,total:Math.round((afterDiscount+shipping)*100)/100,promo:promo?.code||''};
}
const clean=(v:any,max:number)=>String(v??'').trim().slice(0,max);
function formatSAR(n:number) { return n.toFixed(2)+' ر.س'; }
function whatsAppText(order:any) {
  const line=[
    'طلب جديد من مطعم جدو داوود 🍽️',
    'رقم الطلب: '+order.id,
    'الاسم: '+order.customerName,
    'الجوال: '+order.phone,
    'الخدمة: '+(order.service==='delivery'?'توصيل للمنزل':'استلام من المطعم'),
    ...(order.service==='delivery'?['العنوان: '+order.address]:[]),
    'طريقة الدفع: '+(order.payment==='visa'?'فيزا عند الاستلام':'نقدًا'),
    '— المنتجات —',
    ...order.items.map((p:any)=>p.name+' × '+p.quantity+' = '+formatSAR(p.total)),
    'المجموع الفرعي: '+formatSAR(order.subtotal),
    ...(order.promo?['كود الخصم: '+order.promo,'الخصم: -'+formatSAR(order.discount)]:[]),
    'رسوم التوصيل: '+formatSAR(order.deliveryFee),
    'الإجمالي: '+formatSAR(order.total),
    ...(order.notes?['ملاحظات: '+order.notes]:[])
  ];
  return line.join('\n');
}
async function storeOrder(order:any) {
  for(let attempt=0;attempt<6;attempt++){
    const prev=await ghRead(ORDERS_PATH);
    const list=decryptedOrders(prev?.value);
    if(list.some((o:any)=>o.id===order.id))return;
    list.unshift(order);
    try{await ghWrite(ORDERS_PATH,JSON.stringify(encryptedOrders(list)),prev?.sha);return;}
    catch(e:any){if(e.status!==409&&e.status!==422)throw e;}
  }
  throw new Error('تعذر حفظ الطلب بسبب عمليات متزامنة، حاول مرة أخرى');
}
export default async function handler(req:any,res:any) {
  const rewrite=Array.isArray(req.query?.route)?req.query.route.join('/'):req.query?.route;
  const route=rewrite?'/'+String(rewrite).replace(/^\/+/, ''):((req.url||'').split('?')[0].replace(/^\/api/,'')||'/');
  try{
    if(route==='/menu'&&req.method==='GET'){
      const d=await getMenu();
      return respond(res,200,{menu:d.value,sha:d.sha,source:d.sha?'github':'local'});
    }
    if(route==='/admin/login'&&req.method==='POST'){
      if(!PASS||!SECRET)return respond(res,503,{error:'يجب ضبط ADMIN_PASSWORD و SESSION_SECRET في إعدادات Vercel'});
      const b=await body(req);
      const input=Buffer.from(String(b.password||'')),expected=Buffer.from(PASS);
      const valid=input.length===expected.length && crypto.timingSafeEqual(input,expected);
      return valid?respond(res,200,{success:true,token:createToken()}):respond(res,401,{error:'كلمة المرور غير صحيحة'});
    }
    if(route==='/order'&&req.method==='POST'){
      if(!GH_TOKEN||!ORDER_KEY||Buffer.from(ORDER_KEY,'hex').length!==32)return respond(res,503,{error:'خدمة الطلبات تحتاج إعداد مفاتيح GitHub وتشفير الطلبات على Vercel'});
      const b=await body(req);
      const {value:menu}=await getMenu();
      const whatsapp=clean(menu.restaurant.whatsapp,22).replace(/\D/g,'');
      if(!/^([1-9]\d{7,14})$/.test(whatsapp))return respond(res,503,{error:'رقم واتساب المطعم غير مضبوط بعد'});
      const customerName=clean(b.customerName,100),phone=clean(b.phone,22),address=clean(b.address,260);
      const service=clean(b.service,20),payment=clean(b.payment,20);
      if(customerName.length<2 || !/^[+0-9 ()-]{8,22}$/.test(phone))throw new Error('يرجى إدخال الاسم ورقم جوال صحيح');
      if(service==='delivery'&&address.length<6)throw new Error('يرجى كتابة عنوان التوصيل');
      if(payment!=='cash'&&payment!=='visa')throw new Error('يجب اختيار طريقة الدفع');
      const sum=calculate(menu,b.items,clean(b.promo,50),service);
      const order={id:'JD-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomBytes(3).toString('hex').toUpperCase(),
        createdAt:new Date().toISOString(),customerName,phone,address:service==='delivery'?address:'',
        service,payment,notes:clean(b.notes,350),...sum,status:'pending'};
      await storeOrder(order);
      return respond(res,201,{success:true,orderId:order.id,whatsappUrl:'https://wa.me/'+whatsapp+'?text='+encodeURIComponent(whatsAppText(order))});
    }
    if(route.startsWith('/admin/')){
      if(!authorized(req))return respond(res,401,{error:'انتهت الجلسة أو ليس لديك صلاحية'});
      if(route==='/admin/status'&&req.method==='GET')return respond(res,200,{githubConfigured:!!GH_TOKEN,ordersEncrypted:Buffer.from(ORDER_KEY,'hex').length===32});
      if(route==='/admin/save-menu'&&req.method==='POST'){
        const b=await body(req), menu=b.menu;
        if(!menu||!Array.isArray(menu.categories)||!Array.isArray(menu.items)||!menu.restaurant||!Array.isArray(menu.promos)||!Array.isArray(menu.slides))throw new Error('بيانات القائمة غير مكتملة');
        if(menu.items.length>2000||menu.categories.length>300||menu.slides.length>30)throw new Error('تم تجاوز الحد المسموح');
        const latest=await getMenu();
        if(latest.sha!==clean(b.expectedSha,100))return respond(res,409,{error:'تم تحديث البيانات من جلسة أخرى. حدّث الصفحة قبل الحفظ'});
        const sha=await ghWrite(MENU_PATH,JSON.stringify(menu,null,2),latest.sha||undefined);
        return respond(res,200,{success:true,sha});
      }
      if(route==='/admin/upload'&&req.method==='POST'){
        const b=await body(req);
        const matches=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(b.data||''));
        if(!matches)throw new Error('الصورة يجب أن تكون PNG أو JPG أو WebP');
        const raw=Buffer.from(matches[2],'base64');
        if(raw.length===0||raw.length>2_000_000)throw new Error('حجم الصورة يجب أن يكون أقل من 2 ميغابايت');
        const extension=matches[1]==='image/png'?'png':matches[1]==='image/jpeg'?'jpg':'webp';
        const pathname='public/uploads/'+Date.now()+'-'+crypto.randomBytes(6).toString('hex')+'.'+extension;
        await ghWrite(pathname,matches[2],undefined,true);
        return respond(res,200,{url:'https://raw.githubusercontent.com/'+OWNER+'/'+REPO+'/'+BRANCH+'/'+pathname});
      }
      if(route==='/admin/orders'&&req.method==='GET'){
        if(!ORDER_KEY)return respond(res,503,{error:'يجب إعداد مفتاح تشفير الطلبات'});
        const doc=await ghRead(ORDERS_PATH);
        return respond(res,200,{orders:decryptedOrders(doc?.value)});
      }
      if(route==='/admin/orders/status'&&req.method==='POST'){
        const b=await body(req), status=clean(b.status,30);
        if(!['pending','preparing','delivered','cancelled'].includes(status))throw new Error('حالة الطلب غير صالحة');
        for(let attempt=0;attempt<6;attempt++){
          const doc=await ghRead(ORDERS_PATH),orders=decryptedOrders(doc?.value);
          const order=orders.find((o:any)=>o.id===b.id);
          if(!order)return respond(res,404,{error:'الطلب غير موجود'});
          order.status=status;order.updatedAt=new Date().toISOString();
          try {await ghWrite(ORDERS_PATH,JSON.stringify(encryptedOrders(orders)),doc?.sha);return respond(res,200,{success:true});}
          catch(e:any){if(e.status!==409&&e.status!==422)throw e;}
        }
        throw new Error('تعارض في تحديث الطلب، حاول مجددًا');
      }
    }
    return respond(res,404,{error:'المسار غير موجود'});
  }catch(e:any){console.error('Jido API:',e);return respond(res,e.status===409?409:400,{error:errorMessage(e)});}
}
