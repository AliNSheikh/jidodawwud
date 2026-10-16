import assert from 'node:assert/strict';
import crypto from 'node:crypto';
async function main() {
  const original={GITHUB_TOKEN:process.env.GITHUB_TOKEN,SESSION_SECRET:process.env.SESSION_SECRET,
    GITHUB_REPO_OWNER:process.env.GITHUB_REPO_OWNER,GITHUB_REPO_NAME:process.env.GITHUB_REPO_NAME,ORDERS_ENCRYPTION_KEY:process.env.ORDERS_ENCRYPTION_KEY};
  const originalFetch=globalThis.fetch;
  process.env.GITHUB_TOKEN='test-reviews-token';
  process.env.ORDERS_ENCRYPTION_KEY='ab'.repeat(32);
  process.env.SESSION_SECRET='test-session-secret';
  process.env.GITHUB_REPO_OWNER='AliNSheikh';
  process.env.GITHUB_REPO_NAME='jidodawwud';
  const reviews=await import('../api/reviews');
  const admin=await import('../api/admin/reviews');
  const ratings:any[]=[];
  let sha='';
  let encrypted:any=null;
  const secretKey=crypto.createHash('sha256').update(Buffer.from(process.env.ORDERS_ENCRYPTION_KEY,'hex')).update('jidodawwud/reviews/v1').digest();
  const wrap=(code:number,obj:any)=>({ok:code>=200&&code<300,status:code,json:async()=>obj}) as unknown as Response;
  globalThis.fetch=(async(url:any,options:any)=>{
    const p=String(url),method=options?.method||'GET';
    if(p.includes('/data/menu.json'))return wrap(200,{content:Buffer.from(JSON.stringify({items:[{id:'food-1',isAvailable:true}]})).toString('base64')});
    if(p.includes('/data/reviews.json')){
      if(method==='GET')return sha?wrap(200,{sha,content:Buffer.from(JSON.stringify(encrypted)).toString('base64')}):wrap(404,{});
      if(method==='PUT'){
        const payload=JSON.parse(options.body);
        assert.equal(payload.sha||'',sha);
        encrypted=JSON.parse(Buffer.from(payload.content,'base64').toString('utf8'));
        assert.equal(encrypted.algorithm,'aes-256-gcm');
        const dec=crypto.createDecipheriv('aes-256-gcm',secretKey,Buffer.from(encrypted.iv,'base64'));
        dec.setAuthTag(Buffer.from(encrypted.tag,'base64'));
        const decrypted=JSON.parse(Buffer.concat([dec.update(Buffer.from(encrypted.ciphertext,'base64')),dec.final()]).toString('utf8'));
        ratings.splice(0,ratings.length,...decrypted);
        sha='sha-'+(parseInt(sha.split('-')[1]||'0',10)+1);
        return wrap(201,{content:{sha}});
      }
    }
    throw Error('Unexpected test fetch '+method+' '+p);
  }) as typeof fetch;
  function req(method:string,body:any={},authorization?:string){
    return {method,body,headers:authorization?{authorization}:{},url:'/api/reviews',query:{}};
  }
  function response(){const data:any={code:200,body:null};const res:any={
    setHeader:()=>res,status:(code:number)=>{data.code=code;return res;},json:(body:any)=>{data.body=body;return res;}
  };return {data,res};}
  async function run(handler:any,request:any){
    const {data,res}=response();await handler(request,res);assert.ok(typeof data.body==='object');return data;
  }
  const payload=Buffer.from(JSON.stringify({exp:Date.now()+60000,nonce:'test'})).toString('base64url');
  const auth='Bearer '+payload+'.'+crypto.createHmac('sha256',process.env.SESSION_SECRET).update(payload).digest('base64url');
  try{
    let o=await run(reviews.default,req('GET'));
    assert.equal(o.code,200);assert.deepEqual(o.body.reviews,[]);
    o=await run(reviews.default,req('POST',{name:'أحمد',rating:5,comment:'منتج رائع ولذيذ جداً',productId:'food-1'}));
    assert.equal(o.code,201);assert.equal(ratings.length,1);assert.equal(ratings[0].approved,false);
    o=await run(reviews.default,req('GET'));assert.equal(o.body.reviews.length,0);
    o=await run(admin.default,req('GET',{},auth));assert.equal(o.code,200);assert.equal(o.body.reviews.length,1);
    o=await run(admin.default,req('POST',{action:'update',id:ratings[0].id,name:'أحمد',rating:5,comment:ratings[0].comment,approved:true},auth));
    assert.equal(o.code,200);
    o=await run(reviews.default,req('GET'));assert.equal(o.body.reviews.length,1);
    assert.equal(o.body.summary['food-1'].average,5);
    assert.equal(o.body.summary['food-1'].count,1);
    o=await run(admin.default,req('POST',{action:'delete',id:ratings[0].id},auth));assert.equal(o.code,200);
    o=await run(reviews.default,req('GET'));assert.equal(o.body.reviews.length,0);
    console.log('Verified reviewed-only public ratings, submission, approval, admin edits, deletion');
  }finally{
    globalThis.fetch=originalFetch;
    for(const [key,val] of Object.entries(original)){if(val===undefined)delete process.env[key];else process.env[key]=val;}
  }
}
main().catch(err=>{console.error(err);process.exitCode=1;});
