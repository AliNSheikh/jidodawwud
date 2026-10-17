import assert from 'node:assert/strict';
import {
  priceOf,displayVariantInfo,hasProductOffer,variantPriceInfo,
  resolvedCartLine,cartLineKey,productWithVariantName,sortByPrice
} from '../src/types/store';
import {duplicateProduct} from '../src/utils/adminProducts';
import type {Product} from '../src/types/store';

const plain:Product={
  id:'plain',name:'بطاطا',description:'',categoryId:'starters',basePrice:10,imageUrl:'/p.webp',isAvailable:true,displayOrder:0
};
const withVariants:Product={
  ...plain,id:'variant-product',name:'برجر',basePrice:20,offerEnabled:true,offerPrice:15,
  variants:[
    {id:'regular',name:'عادي',price:null},
    {id:'medium',name:'وسط',price:28},
    {id:'large',name:'كبير',price:40,imageUrl:'/large.webp',offerEnabled:true,offerPrice:35},
    {id:'free',name:'اختياري',price:20}
  ]
};
assert.equal(priceOf(plain),10,'Legacy no-variant prices unchanged');
assert.equal(priceOf(withVariants),35,'Homepage shows highest final-priced variant');
assert.equal(displayVariantInfo(withVariants).variant?.id,'large');
assert.equal(displayVariantInfo(withVariants).original,40);
assert.equal(hasProductOffer(withVariants),true);
assert.equal(variantPriceInfo(withVariants,withVariants.variants![0]).price,15,'Inherited base discount');
assert.equal(variantPriceInfo(withVariants,withVariants.variants![1]).price,28,'Independent no-discount price');
assert.equal(variantPriceInfo(withVariants,withVariants.variants![2]).price,35,'Independent offer');
assert.equal(variantPriceInfo(withVariants,withVariants.variants![3]).price,20,'Same base price');
assert.equal(resolvedCartLine(plain).price,10,'Plain products can go directly to cart');
assert.throws(()=>resolvedCartLine(withVariants),/اختيار/,'Must select a variant before adding');
assert.throws(()=>resolvedCartLine(withVariants,'bogus'),/غير متوفر/);
assert.equal(resolvedCartLine(withVariants,'large').imageUrl,'/large.webp');
assert.equal(resolvedCartLine(withVariants,'regular').imageUrl,'/p.webp');
assert.equal(cartLineKey({productId:'variant-product',variantId:'large'}),'variant-product::large');
assert.notEqual(cartLineKey({productId:'variant-product',variantId:'regular'}),cartLineKey({productId:'variant-product',variantId:'large'}));
assert.equal(productWithVariantName('برجر','كبير'),'برجر (كبير)');
assert.equal(sortByPrice([withVariants,plain])[0].id,'plain');
const copy=duplicateProduct(withVariants,'new-product');
assert.equal(copy.variants?.length,withVariants.variants?.length);
assert.notEqual(copy.variants?.[0].id,withVariants.variants?.[0].id);
copy.variants![0].name='جديد';
assert.equal(withVariants.variants![0].name,'عادي','Duplicating variants must not mutate original');
console.log('Product variant pricing, inheritance, discounts, cart selection, image fallback and copying: PASS');

// Exercise checkout API with real server-side price computation and WhatsApp text.
const keys=['GITHUB_TOKEN','GITHUB_REPO_OWNER','GITHUB_REPO_NAME','GITHUB_BRANCH','ORDERS_ENCRYPTION_KEY'] as const;
const originalEnv=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
const originalFetch=globalThis.fetch;
process.env.GITHUB_TOKEN='test-token';
process.env.GITHUB_REPO_OWNER='AliNSheikh';
process.env.GITHUB_REPO_NAME='jidodawwud';
process.env.GITHUB_BRANCH='main';
process.env.ORDERS_ENCRYPTION_KEY='ab'.repeat(32);
const handler=(await import('../api/index')).default;
const menu={
  restaurant:{whatsapp:'966512345678',deliveryEnabled:false,freeDeliveryMinimum:100,deliveryFee:0},
  items:[plain,withVariants],promos:[]
};
let saved:any=null;
const mock=(status:number,doc:any)=>({ok:status>=200&&status<300,status,json:async()=>doc}) as unknown as Response;
globalThis.fetch=(async(url:any,options:any)=>{
  const route=String(url),method=options?.method||'GET';
  if(route.includes('/contents/data/menu.json')&&method==='GET')
    return mock(200,{sha:'menu1',content:Buffer.from(JSON.stringify(menu)).toString('base64')});
  if(route.includes('/contents/data/orders.encrypted.json')&&method==='GET')
    return mock(404,{message:'Not found'});
  if(route.includes('/contents/data/orders.encrypted.json')&&method==='PUT'){
    saved=JSON.parse(options.body);
    return mock(201,{content:{sha:'orders2'}});
  }
  throw Error('Unexpected fetch: '+method+' '+route);
}) as typeof fetch;
function fakeRes(){
  const result:any={status:200,data:null};
  const res:any={setHeader:()=>res,status:(s:number)=>{result.status=s;return res;},json:(j:any)=>{result.data=j;return res;}};
  return {result,res};
}
async function send(items:any[]){
  const {result,res}=fakeRes();
  await handler({method:'POST',query:{},body:{
    customerName:'عميل',phone:'0501234567',address:'',notes:'',service:'pickup',payment:'cash',promo:'',items
  },headers:{}},res,'/order');
  return result;
}
try {
  let response=await send([{productId:'variant-product',quantity:1}]);
  assert.equal(response.status,400,'Server refuses missing variant');
  assert.match(response.data.error,/اختيار/);
  response=await send([{productId:'variant-product',variantId:'unknown',quantity:1}]);
  assert.equal(response.status,400,'Server refuses obsolete variants');
  response=await send([{productId:'variant-product',variantId:'large',quantity:2},{productId:'plain',quantity:1}]);
  assert.equal(response.status,201,'Server accepts explicit selection and plain products');
  assert.ok(saved,'Orders must be persisted encrypted');
  const iv=Buffer.from(saved.content,'base64').toString('utf8');
  const envelope=JSON.parse(iv);
  assert.equal(envelope.algorithm,'aes-256-gcm');
  const crypto=await import('node:crypto');
  const decoder=crypto.createDecipheriv('aes-256-gcm',Buffer.from(process.env.ORDERS_ENCRYPTION_KEY!,'hex'),Buffer.from(envelope.iv,'base64'));
  decoder.setAuthTag(Buffer.from(envelope.tag,'base64'));
  const orders=JSON.parse(Buffer.concat([decoder.update(Buffer.from(envelope.ciphertext,'base64')),decoder.final()]).toString('utf8'));
  const order=orders[0];
  assert.equal(order.items[0].name,'برجر (كبير)');
  assert.equal(order.items[0].variantId,'large');
  assert.equal(order.items[0].unitPrice,35);
  assert.equal(order.items[0].total,70);
  assert.equal(order.subtotal,80);
  const waText=new URL(response.data.whatsappUrl).searchParams.get('text')||'';
  assert.match(waText,/برجر \(كبير\)/);
  assert.match(waText,/80\.00/);
  console.log('Encrypted WhatsApp checkout recalculates prices from selected variants: PASS');
}finally {
  globalThis.fetch=originalFetch;
  for(const [k,val] of Object.entries(originalEnv)){if(val===undefined)delete process.env[k];else process.env[k]=val;}
}
