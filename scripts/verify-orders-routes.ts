import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import orderHandler from '../api/order';
import ordersHandler from '../api/admin/orders';
import statusHandler from '../api/admin/orders/status';

const keys=['GITHUB_TOKEN','GITHUB_REPO_OWNER','GITHUB_REPO_NAME','GITHUB_BRANCH','ORDERS_ENCRYPTION_KEY','SESSION_SECRET'] as const;
const original=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
const priorFetch=globalThis.fetch;
process.env.GITHUB_TOKEN='test-gh-token';
process.env.GITHUB_REPO_OWNER='AliNSheikh';
process.env.GITHUB_REPO_NAME='jidodawwud';
process.env.GITHUB_BRANCH='main';
process.env.ORDERS_ENCRYPTION_KEY='a5'.repeat(32);
process.env.SESSION_SECRET='test-secret';
const menu={
  restaurant:{whatsapp:'966555111222',deliveryEnabled:true,freeDeliveryMinimum:100,deliveryFee:10},
  promos:[],
  items:[
    {id:'p1',name:'برجر',isAvailable:true,basePrice:20,variants:[{id:'lg',name:'كبير',price:35,offerEnabled:true,offerPrice:30}]},
    {id:'p2',name:'بطاطا',isAvailable:true,basePrice:10}
  ]
};
let file:any=null;
let sha=0;
let failGithub=false;
const mock=(status:number,data:any)=>({status,ok:status>=200&&status<300,json:async()=>data}) as unknown as Response;
globalThis.fetch=(async(url:any,init:any)=>{
  if(failGithub)return mock(403,{message:'Forbidden'});
  const request=String(url),method=init?.method||'GET';
  if(request.includes('/contents/data/menu.json'))return mock(200,{sha:'menu-sha',content:Buffer.from(JSON.stringify(menu),'utf8').toString('base64')});
  if(request.includes('/contents/data/orders.encrypted.json')&&method==='GET')
    return file?mock(200,{sha:'sha-'+sha,content:Buffer.from(JSON.stringify(file)).toString('base64')}):mock(404,{message:'Not found'});
  if(request.includes('/contents/data/orders.encrypted.json')&&method==='PUT'){
    const payload=JSON.parse(init.body);
    if(file)assert.equal(payload.sha,'sha-'+sha);
    assert.equal(payload.branch,'main');
    const envelope=JSON.parse(Buffer.from(payload.content,'base64').toString('utf8'));
    assert.equal(envelope.algorithm,'aes-256-gcm');
    file=envelope;
    sha++;
    return mock(201,{content:{sha:'sha-'+sha}});
  }
  throw Error('Unexpected request '+method+' '+request);
}) as typeof fetch;
const payload=Buffer.from(JSON.stringify({exp:Date.now()+30_000})).toString('base64url');
const token='Bearer '+payload+'.'+crypto.createHmac('sha256',process.env.SESSION_SECRET).update(payload).digest('base64url');
const response=()=>{
  const output:any={status:200,body:null,headers:{}};
  const res:any={
    setHeader:(name:string,value:string)=>{output.headers[name.toLowerCase()]=value;return res;},
    status:(status:number)=>{output.status=status;return res;},
    json:(obj:any)=>{output.body=obj;return res;}
  };
  return {res,output};
};
async function call(handler:any,method:string,body:any={},auth=false){
  const {res,output}=response();
  await handler({method,headers:{...(auth?{authorization:token}:{})},body,query:{}},res);
  assert.match(output.headers['content-type']||'',/application\/json/);
  assert.ok(output.body&&typeof output.body==='object','API must always return JSON body');
  return output;
}
try{
  let result=await call(ordersHandler,'GET');
  assert.equal(result.status,401,'orders list must require a login token');
  result=await call(ordersHandler,'GET',{},true);
  assert.equal(result.status,200,'an empty order file is not a server error');
  assert.deepEqual(result.body.orders,[]);
  result=await call(orderHandler,'POST',{
    customerName:'عميل تجربة',phone:'0501234567',service:'pickup',payment:'cash',promo:'',
    items:[{productId:'p1',quantity:2}]
  });
  assert.equal(result.status,400,'checkout must refuse missing variant');
  assert.ok(!file,'invalid checkout must never write an order');
  result=await call(orderHandler,'POST',{
    customerName:'عميل تجربة',phone:'0501234567',service:'pickup',payment:'cash',promo:'',
    items:[{productId:'p1',variantId:'lg',quantity:2},{productId:'p2',quantity:1}]
  });
  assert.equal(result.status,201,'checkout succeeds after selection');
  assert.equal(result.body.success,true);
  assert.equal(new URL(result.body.whatsappUrl).host,'wa.me');
  assert.match(new URL(result.body.whatsappUrl).searchParams.get('text')||'',/برجر \(كبير\)/);
  assert.ok(file.ciphertext&&!JSON.stringify(file).includes('0501234567'),'stored GitHub order must be encrypted');
  result=await call(ordersHandler,'GET',{},true);
  assert.equal(result.status,200);
  assert.equal(result.body.orders.length,1);
  assert.equal(result.body.orders[0].subtotal,70);
  assert.equal(result.body.orders[0].items[0].unitPrice,30);
  assert.equal(result.body.orders[0].items[0].name,'برجر (كبير)');
  const id=result.body.orders[0].id;
  result=await call(statusHandler,'POST',{id,status:'preparing'},true);
  assert.equal(result.status,200);
  result=await call(ordersHandler,'GET',{},true);
  assert.equal(result.body.orders[0].status,'preparing','status updates persist in same encrypted order file');
  result=await call(statusHandler,'POST',{id,status:'bogus'},true);
  assert.equal(result.status,400,'invalid status must be rejected');
  failGithub=true;
  result=await call(orderHandler,'POST',{
    customerName:'عميل',phone:'0501234567',service:'pickup',payment:'cash',items:[{productId:'p2',quantity:1}]
  });
  assert.equal(result.status,503,'GitHub errors must return controlled JSON, not a Vercel 500 HTML page');
  assert.equal(typeof result.body.error,'string');
  result=await call(ordersHandler,'GET',{},true);
  assert.equal(result.status,503);
  assert.equal(typeof result.body.error,'string');
  console.log('Standalone orders routes: empty list, checkout, variant, encryption, status and JSON error cases PASS');
}finally{
  globalThis.fetch=priorFetch;
  for(const [k,val] of Object.entries(original)){
    if(val===undefined)delete process.env[k];else process.env[k]=val;
  }
}
