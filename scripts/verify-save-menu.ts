import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import handler from '../api/admin/save-menu';

const seed = {
  restaurant: { name:'جدو داوود', whatsapp:'966500000000',deliveryFee:0,freeDeliveryMinimum:100 },
  categories:[], items:[], promos:[], slides:[]
};
const originalFetch = globalThis.fetch;
const originalEnv: Record<string,string|undefined> = {};
for (const key of ['SESSION_SECRET','GITHUB_TOKEN','GITHUB_REPO_NAME','GITHUB_REPO_OWNER','GITHUB_BRANCH']) {
  originalEnv[key] = process.env[key];
}
process.env.SESSION_SECRET = 'integration-test-session-secret';
process.env.GITHUB_TOKEN = 'test-only-fake-github-token';
process.env.GITHUB_REPO_OWNER = 'AliNSheikh';
process.env.GITHUB_REPO_NAME = 'jidodawwud';
process.env.GITHUB_BRANCH = 'main';

const data = Buffer.from(JSON.stringify({exp:Date.now()+3600_000,nonce:'test'})).toString('base64url');
const signature = crypto.createHmac('sha256',process.env.SESSION_SECRET).update(data).digest('base64url');
const req = (opts:any = {}) => ({
  method:'POST',
  headers:{authorization:'Bearer '+data+'.'+signature},
  body:{menu:seed,expectedSha:'sha-current'},
  ...opts
});
function response(){
  const result:any={status:200,body:null,headers:{}};
  const res:any={
    setHeader:(key:string,value:string)=>{result.headers[key]=value;return res;},
    status:(code:number)=>{result.status=code;return res;},
    json:(payload:any)=>{result.body=payload;return res;}
  };
  return {res,result};
}
async function run(request:any) {
  const {res,result}=response();
  await handler(request,res);
  assert.equal(typeof result.body,'object', 'must always respond with JSON');
  return result;
}
const mocked=(status:number,payload:any)=>{
  return {ok:status>=200&&status<300,status,json:async()=>payload} as unknown as Response;
};
async function main(){
  try {
    let r=await run(req({method:'GET'}));
    assert.equal(r.status,405);
    assert.match(r.body.error,/المسار/);
    r=await run(req({headers:{authorization:'Bearer broken'}}));
    assert.equal(r.status,401);
    process.env.GITHUB_TOKEN='';
    r=await run(req());
    assert.equal(r.status,503);
    process.env.GITHUB_TOKEN='test-only-fake-github-token';

    globalThis.fetch=(async()=>mocked(403,{message:'Resource not accessible by integration'})) as typeof fetch;
    r=await run(req());
    assert.equal(r.status,502);
    assert.match(r.body.error,/صلاحية/);

    globalThis.fetch=(async()=>mocked(200,{sha:'different-sha'})) as typeof fetch;
    r=await run(req());
    assert.equal(r.status,409);
    assert.match(r.body.error,/تغيرت بيانات/);

    const calls:{method:string,url:string,body:any}[]=[];
    globalThis.fetch=(async(input:any,options:any)=>{
      const method=options?.method||'GET';
      calls.push({method,url:String(input),body:options?.body?JSON.parse(options.body):null});
      return method==='GET'
       ?mocked(200,{sha:'sha-current'})
       :mocked(200,{content:{sha:'sha-saved'}});
    }) as typeof fetch;
    r=await run(req());
    assert.equal(r.status,200);
    assert.equal(r.body.success,true);
    assert.equal(r.body.sha,'sha-saved');
    assert.equal(calls.length,2);
    assert.equal(calls[0].method,'GET');
    assert.equal(calls[1].method,'PUT');
    assert.equal(calls[1].body.sha,'sha-current');
    assert.equal(JSON.parse(Buffer.from(calls[1].body.content,'base64').toString('utf8')).restaurant.whatsapp,'966500000000');
    assert.ok(calls[0].url.includes('jidodawwud'));
    console.log('save-menu: validated access, permissions, conflicts and successful GitHub update');
  } finally {
    globalThis.fetch=originalFetch;
    for(const [key,val] of Object.entries(originalEnv)) { if(val===undefined)delete process.env[key]; else process.env[key]=val; }
  }
}
main().catch(err=>{console.error(err);process.exitCode=1;});
