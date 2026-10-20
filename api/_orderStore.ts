import crypto from 'node:crypto';

/** Server-only order storage. Never import the React storefront from Vercel functions. */
const OWNER=()=>process.env.GITHUB_REPO_OWNER||'AliNSheikh';
const REPO=()=>process.env.GITHUB_REPO_NAME||'jidodawwud';
const BRANCH=()=>process.env.GITHUB_BRANCH||'main';
const TOKEN=()=>process.env.GITHUB_TOKEN||process.env.GITHUB_PAT||'';
const KEY=()=>process.env.ORDERS_ENCRYPTION_KEY||'';
const ORDERS='data/orders.encrypted.json';

export function respond(res:any,status:number,data:any){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  return res.status(status).json(data);
}
export function secureError(error:unknown,context:string){
  const e=error as any;
  const message=String(e?.message||'');
  console.error('Jido orders '+context, e?.name||'Error',message);
  const timedOut=e?.name==='TimeoutError'||e?.name==='AbortError';
  if(timedOut)return {code:504,error:'انتهت مهلة الاتصال بالخادم. يرجى المحاولة بعد قليل.'};
  if(typeof e?.status==='number' && [401,403,429].includes(e.status))
    return {code:503,error:'تعذر الوصول إلى تخزين الطلبات. يرجى مراجعة صلاحيات GitHub أو المحاولة لاحقًا.'};
  if(message.includes('فك تشفير')||message.includes('التشفير')||message.includes('ORDERS_ENCRYPTION_KEY'))
    return {code:503,error:'تعذر قراءة الطلبات المشفرة. يرجى التحقق من مفتاح ORDERS_ENCRYPTION_KEY في إعدادات Vercel دون تغييره عن المفتاح السابق.'};
  if(message.includes('تعارض'))return {code:409,error:message};
  if(message.includes('غير متاح')||message.includes('غير صالحة')||message.includes('السلة')||
     message.includes('يرجى')||message.includes('الخيار')||message.includes('الخصم')||
     message.includes('الكود')||message.includes('رقم')||message.includes('العنوان')||
     message.includes('طريقة'))return {code:400,error:message};
  return {code:503,error:'تعذر تسجيل الطلب أو قراءة الطلبات حاليًا. لم يتم تأكيد التسجيل. يرجى المحاولة لاحقًا.'};
}
export function tokenValid(req:any){
  const secret=process.env.SESSION_SECRET||'';
  if(!secret)return false;
  const auth=String(req.headers?.authorization||'').replace(/^Bearer\s+/i,'');
  const [payload,signature,extra]=auth.split('.');
  if(!payload||!signature||extra)return false;
  const expected=crypto.createHmac('sha256',secret).update(payload).digest('base64url');
  if(signature.length!==expected.length||
      !crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return false;
  try{
    const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    return typeof data.exp==='number'&&data.exp>Date.now();
  }catch{return false;}
}
export async function parseBody(req:any){
  if(req.body && typeof req.body==='object')return req.body;
  if(typeof req.body==='string')return JSON.parse(req.body);
  let input='';
  if(req[Symbol.asyncIterator])for await(const chunk of req){
    input+=chunk;
    if(input.length>100_000)throw Error('حجم بيانات الطلب كبير جدًا');
  }
  return input?JSON.parse(input):{};
}
const clean=(v:any,max:number)=>String(v??'').trim().slice(0,max);
const githubUrl=(path:string)=>'https://api.github.com/repos/'+encodeURIComponent(OWNER())+'/'+encodeURIComponent(REPO())+'/contents/'+path;
const headers=()=>({
  Accept:'application/vnd.github+json',
  'X-GitHub-Api-Version':'2022-11-28',
  'User-Agent':'Jido-Dawwud-Orders',
  ...(TOKEN()?{Authorization:'Bearer '+TOKEN()}:{})
});
function checkedKey(){
  const secret=KEY();
  if(!/^[a-fA-F0-9]{64}$/.test(secret))throw Error('ORDERS_ENCRYPTION_KEY: يجب أن يكون مفتاح التشفير مطابقًا للقيمة المستخدمة سابقًا وطوله 64 رمزًا سداسيًا.');
  return Buffer.from(secret,'hex');
}
function encrypt(orders:any[]){
  const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',checkedKey(),iv);
  const ciphertext=Buffer.concat([cipher.update(JSON.stringify(orders),'utf8'),cipher.final()]);
  return {version:1,algorithm:'aes-256-gcm',iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')};
}
function decrypt(doc:any){
  if(!doc)return [];
  if(doc.algorithm!=='aes-256-gcm')throw Error('تعذر فك تشفير الطلبات: صيغة غير معروفة');
  try{
    const decipher=crypto.createDecipheriv('aes-256-gcm',checkedKey(),Buffer.from(doc.iv,'base64'));
    decipher.setAuthTag(Buffer.from(doc.tag,'base64'));
    const data=JSON.parse(Buffer.concat([decipher.update(Buffer.from(doc.ciphertext,'base64')),decipher.final()]).toString('utf8'));
    if(!Array.isArray(data))throw Error('Invalid order list');
    return data;
  }catch(e){throw Error('تعذر فك تشفير الطلبات: تحقق من المفتاح الأصلي وملف التخزين');}
}
async function ghRead(path:string):Promise<{value:any;sha:string}|null>{
  const response=await fetch(githubUrl(path)+'?ref='+encodeURIComponent(BRANCH()),{
    method:'GET',headers:headers(),cache:'no-store',signal:AbortSignal.timeout(12000)
  });
  if(response.status===404)return null;
  if(!response.ok){
    const error:any=Error('GitHub read failed ('+response.status+')');
    error.status=response.status;throw error;
  }
  const file:any=await response.json();
  if(typeof file.content!=='string'||typeof file.sha!=='string')throw Error('Invalid GitHub file response');
  return {value:JSON.parse(Buffer.from(file.content.replace(/\s/g,''),'base64').toString('utf8')),sha:file.sha};
}
async function ghWrite(path:string,doc:any,sha:string){
  if(!TOKEN())throw Error('GITHUB_TOKEN غير مضبوط');
  const response=await fetch(githubUrl(path),{
    method:'PUT',
    headers:{...headers(),'Content-Type':'application/json'},
    body:JSON.stringify({
      branch:BRANCH(),message:'chore(orders): securely save customer checkout orders',
      ...(sha?{sha}:{}),
      content:Buffer.from(JSON.stringify(doc),'utf8').toString('base64')
    }),
    signal:AbortSignal.timeout(17000)
  });
  if(!response.ok){
    const error:any=Error('GitHub write failed ('+response.status+')');
    error.status=response.status;throw error;
  }
  return response.json();
}
export async function listOrders(){
  checkedKey();
  if(!TOKEN())throw Error('GITHUB_TOKEN غير مضبوط');
  const doc=await ghRead(ORDERS);
  return decrypt(doc?.value);
}
export async function storeOrder(order:any){
  checkedKey();
  if(!TOKEN())throw Error('GITHUB_TOKEN غير مضبوط');
  for(let attempt=0;attempt<5;attempt++){
    const doc=await ghRead(ORDERS);
    const orders=decrypt(doc?.value);
    if(orders.some((o:any)=>o.id===order.id))return;
    orders.unshift(order);
    try{await ghWrite(ORDERS,encrypt(orders),doc?.sha||'');return;}
    catch(e:any){if(e?.status===409||e?.status===422)continue;throw e;}
  }
  throw Error('تعارض في حفظ الطلبات المتزامنة؛ يرجى إعادة المحاولة');
}
export async function updateOrderStatus(id:string,status:string){
  if(!['pending','preparing','delivered','cancelled'].includes(status))
    throw Error('حالة الطلب غير صالحة');
  if(!id)throw Error('رقم الطلب غير صالح');
  checkedKey();
  for(let attempt=0;attempt<5;attempt++){
    const doc=await ghRead(ORDERS),orders=decrypt(doc?.value);
    const order=orders.find((o:any)=>o.id===id);
    if(!order)throw Error('رقم الطلب غير موجود');
    order.status=status;order.updatedAt=new Date().toISOString();
    try{await ghWrite(ORDERS,encrypt(orders),doc?.sha||'');return;}
    catch(e:any){if(e?.status===409||e?.status===422)continue;throw e;}
  }
  throw Error('تعارض في تحديث الطلبات؛ يرجى إعادة المحاولة');
}
const positive=(n:any)=>Number.isFinite(Number(n))&&Number(n)>=0?Number(n):0;
function priceForProduct(product:any,variantId?:string){
  const base=positive(product.basePrice);
  const validOffer=(price:any,regular:number,enabled:any)=>enabled===true &&
    typeof price==='number'&&Number.isFinite(price)&&price>=0&&price<regular;
  const hasVariants=Array.isArray(product.variants)&&product.variants.length>0;
  if(!hasVariants){
    if(variantId)throw Error('الخيار المحدد غير متوفر');
    return {price:validOffer(product.offerPrice,base,product.offerEnabled)?product.offerPrice:base,variantName:''};
  }
  if(!variantId)throw Error('يرجى اختيار أحد خيارات المنتج');
  const variant=product.variants.find((x:any)=>x.id===variantId);
  if(!variant)throw Error('الخيار المحدد غير متوفر');
  const inherits=variant.price==null;
  const original=inherits?base:positive(variant.price);
  const inherited=validOffer(product.offerPrice,base,product.offerEnabled)?product.offerPrice:base;
  const price=validOffer(variant.offerPrice,original,variant.offerEnabled)?variant.offerPrice:inherits?inherited:original;
  return {price,variantName:String(variant.name||'')};
}
export function priceOrder(menu:any,lines:any[],code:string,service:string){
  if(!Array.isArray(lines)||!lines.length||lines.length>60)throw Error('السلة فارغة أو تحتوي عددًا كبيرًا من الأصناف');
  const items=lines.map(line=>{
    const product=menu.items?.find((p:any)=>p.id===line.productId&&p.isAvailable);
    const quantity=Number(line.quantity);
    if(!product||!Number.isInteger(quantity)||quantity<1||quantity>99)
      throw Error('تحتوي السلة على منتج غير متاح أو كمية غير صالحة');
    const selection=priceForProduct(product,line.variantId);
    const name=product.name+(selection.variantName?' ('+selection.variantName+')':'');
    return {productId:product.id,...(selection.variantName?{variantId:line.variantId,variantName:selection.variantName}:{}),
      name,quantity,unitPrice:selection.price,total:Math.round(quantity*selection.price*100)/100};
  });
  const subtotal=Math.round(items.reduce((sum:number,p:any)=>sum+p.total,0)*100)/100;
  const promo=(menu.promos||[]).find((p:any)=>p.enabled&&p.code?.trim().toLowerCase()===code.trim().toLowerCase());
  if(code&&!promo)throw Error('رمز الخصم غير صالح أو غير مفعّل');
  const discount=promo?Math.round(Math.min(subtotal,promo.type==='percent'?subtotal*positive(promo.value)/100:positive(promo.value))*100)/100:0;
  const afterDiscount=subtotal-discount;
  if(service==='delivery'&&!menu.restaurant?.deliveryEnabled)throw Error('التوصيل غير متاح حاليًا');
  if(service!=='pickup'&&service!=='delivery')throw Error('يرجى تحديد التوصيل أو الاستلام');
  const deliveryFee=service==='delivery'&&afterDiscount<positive(menu.restaurant.freeDeliveryMinimum)
    ?positive(menu.restaurant.deliveryFee):0;
  return {items,subtotal,discount,deliveryFee,total:Math.round((afterDiscount+deliveryFee)*100)/100,promo:promo?.code||''};
}
function formatMoney(n:number){return n.toFixed(2)+' ر.س';}
export function whatsappText(order:any){
  return [
    'طلب جديد من مطعم جدو داوود 🍽️',
    'رقم الطلب: '+order.id,
    'الاسم: '+order.customerName,
    'الجوال: '+order.phone,
    'الخدمة: '+(order.service==='delivery'?'توصيل للمنزل':'استلام من المطعم'),
    ...(order.service==='delivery'?['العنوان: '+order.address]:[]),
    'طريقة الدفع: '+(order.payment==='visa'?'فيزا عند الاستلام':'نقدًا'),
    '— المنتجات —',
    ...order.items.map((p:any)=>p.name+' × '+p.quantity+' = '+formatMoney(p.total)),
    'المجموع الفرعي: '+formatMoney(order.subtotal),
    ...(order.promo?['كود الخصم: '+order.promo,'الخصم: -'+formatMoney(order.discount)]:[]),
    'رسوم التوصيل: '+formatMoney(order.deliveryFee),
    'الإجمالي: '+formatMoney(order.total),
    ...(order.notes?['ملاحظات: '+order.notes]:[])
  ].join('\n');
}
export function orderConfigValid(){return /^[a-fA-F0-9]{64}$/.test(KEY())&&!!TOKEN();}
export const sanitize=(v:any,max:number)=>clean(v,max);
export async function getCheckoutMenu(){
  const doc=await ghRead('data/menu.json');
  if(!doc||!Array.isArray(doc.value?.items)||!doc.value?.restaurant)
    throw Error('لم يتم العثور على قائمة المطعم المحدثة');
  return doc.value;
}
