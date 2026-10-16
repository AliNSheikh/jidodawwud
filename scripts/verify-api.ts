// Offline API smoke test: checks that serverless handlers load and return JSON.
import assert from 'node:assert/strict';
import menuHandler from '../api/menu';
import healthHandler from '../api/health';
import adminLoginHandler from '../api/admin/login';
import orderHandler from '../api/order';

function fakeRes() {
  const result:any={code:200,headers:{},data:null};
  const res:any={
    setHeader:(key:string,value:string)=>{result.headers[key.toLowerCase()]=value;return res;},
    status:(code:number)=>{result.code=code;return res;},
    json:(data:any)=>{result.data=data;return res;}
  };
  return {res,result};
}

(async()=>{
  const originalFetch=globalThis.fetch;
  const seed={
    restaurant:{name:'جدو داوود',currency:'SAR'},
    categories:[],items:[],promos:[],slides:[]
  };
  try{
    globalThis.fetch=(async()=>({
      ok:true,status:200,
      json:async()=>({sha:'test-sha',content:Buffer.from(JSON.stringify(seed),'utf8').toString('base64')})
    })) as typeof fetch;
    {
      const {res,result}=fakeRes();
      await menuHandler({method:'GET'},res);
      assert.equal(result.code,200);
      assert.equal(result.data.menu.restaurant.name,'جدو داوود');
      assert.equal(result.data.sha,'test-sha');
    }
    {
      const {res,result}=fakeRes();
      await healthHandler({method:'GET'},res);
      assert.equal(result.code,200);
      assert.equal(result.data.ok,true);
    }
    {
      const {res,result}=fakeRes();
      await adminLoginHandler({method:'POST',query:{},body:{password:'invalid'}},res);
      assert.ok([401,503].includes(result.code));
      assert.equal(typeof result.data.error,'string');
    }
    {
      const {res,result}=fakeRes();
      await orderHandler({method:'POST',query:{},body:{}},res);
      assert.ok(result.code>=400 && result.code<600);
      assert.equal(typeof result.data.error,'string');
    }
  }finally{
    globalThis.fetch=originalFetch;
  }
  console.log('Vercel serverless handlers: JSON smoke tests passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
