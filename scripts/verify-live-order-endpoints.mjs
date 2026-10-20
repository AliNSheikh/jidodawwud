/**
 * Production-only diagnostics. Does not create an order, send customer data or
 * require admin credentials. Logs only status codes + safely truncated errors.
 */
const origin='https://jidodawwud.vercel.app';
const cases=[
  {name:'health',path:'/api/health',method:'GET'},
  {name:'reviews',path:'/api/reviews',method:'GET'},
  {name:'login invalid',path:'/api/admin/login',method:'POST',body:{password:'wrong-password'}},
  {name:'admin/orders unauthorized',path:'/api/admin/orders',method:'GET'},
  // Valid contact fields with a nonexistent item exercise the GitHub/menu
  // read and encryption configuration, but CANNOT create a customer order.
  {name:'order GitHub validation',path:'/api/order',method:'POST',
    body:{customerName:'تشخيص آلي',phone:'0500000000',items:[{productId:'__diagnostic_missing_product__',quantity:1}],service:'pickup',payment:'cash'}}
];
let failures=0;
for (const test of cases){
  let res,raw='';
  try{
    res=await fetch(origin+test.path,{
      method:test.method,redirect:'manual',
      headers:{Accept:'application/json',...(test.body?{'Content-Type':'application/json'}:{})},
      body:test.body?JSON.stringify(test.body):undefined,
      signal:AbortSignal.timeout(12000)
    });
    raw=await res.text();
    let data;
    try{data=JSON.parse(raw);}catch{}
    const ct=res.headers.get('content-type')||'';
    const safe={test:test.name,status:res.status,contentType:ct,
      errorKind:typeof data?.error==='string'?data.error.slice(0,100):null,
      vercelError:res.headers.get('x-vercel-error')||null,
      invocationId:res.headers.get('x-vercel-id')||null
    };
    console.log(JSON.stringify(safe));
    if(!ct.includes('application/json')||!data||
       (test.name==='health'&&res.status!==200)||
       (test.name==='reviews'&&res.status!==200)||
       (test.name==='login invalid'&&![401,503].includes(res.status))||
       (test.name==='admin/orders unauthorized'&&res.status!==401)||
       (test.name==='order GitHub validation'&&res.status!==400)){
       failures++;
       console.error('LIVE API DIAGNOSIS: '+test.name+' produced an unexpected response');
    }
  }catch(e){
    failures++;console.error(test.name+' network failure:',e?.name||'Error',String(e?.message||'').slice(0,200));
  }
}
if(failures)throw Error('Production orders API health check failed in '+failures+' case(s)');
console.log('Production order API basic health: PASS');
