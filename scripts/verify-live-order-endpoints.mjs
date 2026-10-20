/**
 * Production-only diagnostics. Does not create an order, send customer data or
 * require admin credentials. Logs only status codes + safely truncated errors.
 */
const origin='https://jidodawwud.vercel.app';
const cases=[
  {name:'health',path:'/api/health',method:'GET'},
  {name:'admin/orders unauthorized',path:'/api/admin/orders',method:'GET'},
  {name:'order validation',path:'/api/order',method:'POST',
    body:{customerName:'',phone:'',items:[],service:'pickup',payment:'cash'}}
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
       (test.name==='admin/orders unauthorized'&&res.status!==401)||
       (test.name==='order validation'&&!([400,503].includes(res.status)))){
       failures++;
       console.error('LIVE API DIAGNOSIS: '+test.name+' produced an unexpected response');
    }
  }catch(e){
    failures++;console.error(test.name+' network failure:',e?.name||'Error',String(e?.message||'').slice(0,200));
  }
}
if(failures)throw Error('Production orders API health check failed in '+failures+' case(s)');
console.log('Production order API basic health: PASS');
