import crypto from 'node:crypto';

export function aggregateOrders(orders:any[]) {
  const counts:Record<string,number>={};
  const seenOrders=new Set<string>();
  for(const o of orders) {
    // These are recorded checkout orders. Do not count cancelled orders or duplicates.
    if(!o||o.status==='cancelled'||typeof o.id!=='string'||seenOrders.has(o.id))continue;
    seenOrders.add(o.id);
    const seenProducts=new Set<string>();
    for(const item of Array.isArray(o.items)?o.items:[]) {
      const id=typeof item.productId==='string'?item.productId:'';
      if(!id||seenProducts.has(id))continue;
      seenProducts.add(id);
      counts[id]=(counts[id]||0)+1;
    }
  }
  return counts;
}
export default async function handler(req:any,res:any){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store,max-age=0');
  if(req.method!=='GET')return res.status(405).json({error:'طريقة غير مدعومة'});
  const key=process.env.ORDERS_ENCRYPTION_KEY||'';
  const token=process.env.GITHUB_TOKEN||process.env.GITHUB_PAT||'';
  if(!/^[a-f0-9]{64}$/i.test(key)||!token)
    return res.status(200).json({counts:{},available:false});
  try{
    const owner=process.env.GITHUB_REPO_OWNER||'AliNSheikh';
    const repo=process.env.GITHUB_REPO_NAME||'jidodawwud';
    const branch=process.env.GITHUB_BRANCH||'main';
    const url='https://api.github.com/repos/'+encodeURIComponent(owner)+'/'+encodeURIComponent(repo)+'/contents/data/orders.encrypted.json?ref='+encodeURIComponent(branch);
    const r=await fetch(url,{
      headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'User-Agent':'Jido-Dawwud-OrderStats'},
      signal:AbortSignal.timeout(11000),cache:'no-store'
    });
    if(r.status===404)return res.status(200).json({counts:{},available:true});
    if(!r.ok)throw new Error('GitHub read failed '+r.status);
    const file:any=await r.json();
    const envelope=JSON.parse(Buffer.from(file.content.replace(/\s/g,''),'base64').toString('utf8'));
    if(envelope.algorithm!=='aes-256-gcm')throw new Error('Unsupported order cipher');
    const decipher=crypto.createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),Buffer.from(envelope.iv,'base64'));
    decipher.setAuthTag(Buffer.from(envelope.tag,'base64'));
    const orders=JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext,'base64')),decipher.final()]).toString('utf8'));
    if(!Array.isArray(orders))throw new Error('Malformed orders');
    // Only aggregate counts leave the server, NEVER customer names/phone/address.
    return res.status(200).json({counts:aggregateOrders(orders),available:true});
  }catch(e:any){
    console.error('Order stats:',e?.message||e);
    return res.status(503).json({error:'تعذر تحميل إحصاءات الطلبات حاليًا'});
  }
}
