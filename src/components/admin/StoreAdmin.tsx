import React,{useEffect,useMemo,useState} from 'react';
import {ArrowRight, BadgePercent, BarChart3, Check, Copy, Image as ImageIcon, LayoutDashboard, Loader2, LogOut, Menu as MenuIcon, Package, Plus, Save, Settings, ShoppingBag, Tag, Trash2, Truck, X} from 'lucide-react';
import type {StoreData,Product,ProductCategory,Promo,Slide,Order,OrderStatus} from '../../types/store';
import {moneyLabel,priceOf,linkToProduct,linkToCategory} from '../../types/store';

type Tab='overview'|'products'|'categories'|'orders'|'promos'|'slides'|'settings';
const createId=()=>globalThis.crypto?.randomUUID?.()||'id-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const emptyProduct=():Product=>({id:createId(),name:'',description:'',categoryId:'',basePrice:0,offerPrice:0,offerEnabled:false,imageUrl:'',displayOrder:0,isAvailable:true});
const emptyCategory=():ProductCategory=>({id:createId(),name:'',description:'',displayOrder:0,isActive:true});
const emptyPromo=():Promo=>({id:createId(),code:'',type:'percent',value:10,enabled:true});
const emptySlide=():Slide=>({id:createId(),title:'',description:'',imageUrl:'',enabled:true});
const statusNames:{[k:string]:string}={pending:'جديد',preparing:'قيد التجهيز',delivered:'تم التسليم',cancelled:'ملغي'};
async function readJson(r:Response){const x=await r.json();if(!r.ok)throw new Error(x.error||'تعذر إتمام العملية');return x;}
const TextInput=({label,value,onChange,type='text',placeholder=''}:{label:string;value:string|number;onChange:(v:string)=>void;type?:string;placeholder?:string})=><label className="admin-field">{label}<input type={type} value={value??''} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/></label>;
const CheckInput=({label,value,onChange}:{label:string;value:boolean;onChange:(v:boolean)=>void})=><label className="admin-check"><input type="checkbox" checked={!!value} onChange={e=>onChange(e.target.checked)}/>{label}</label>;
export function StoreAdmin({data,sha,onReload}:{data:StoreData|null;sha:string;onReload:()=>Promise<void>}){
  const [token,setToken]=useState(()=>sessionStorage.getItem('jido-admin-token')||'');
  const [password,setPassword]=useState('');
  const [loginError,setLoginError]=useState('');
  const [logging,setLogging]=useState(false);
  const [draft,setDraft]=useState<StoreData|null>(data?structuredClone(data):null);
  const [savedSha,setSavedSha]=useState(sha);
  const [dirty,setDirty]=useState(false);
  const [tab,setTab]=useState<Tab>('overview');
  const [sideOpen,setSideOpen]=useState(false);
  const [message,setMessage]=useState('');
  const [saving,setSaving]=useState(false);
  const [uploading,setUploading]=useState('');
  const [productId,setProductId]=useState<string|null>(null);
  const [categoryId,setCategoryId]=useState<string|null>(null);
  const [promoId,setPromoId]=useState<string|null>(null);
  const [slideId,setSlideId]=useState<string|null>(null);
  const [orders,setOrders]=useState<Order[]>([]);
  const [ordersError,setOrdersError]=useState('');
  const [filterStatus,setFilterStatus]=useState('all');
  const [filterDate,setFilterDate]=useState('');
  const [search,setSearch]=useState('');
  const [configured,setConfigured]=useState<{githubConfigured:boolean;ordersEncrypted:boolean}|null>(null);
  useEffect(()=>{if(data&&!dirty){setDraft(structuredClone(data));setSavedSha(sha);}},[data,sha]);
  useEffect(()=>{
    if(!token)return;
    getOrders();
    auth('/api/admin/status').then(setConfigured).catch(()=>{});
  },[token]);
  async function auth(url:string,options:RequestInit={}){
    const r=await fetch(url,{...options,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,...options.headers},cache:'no-store'});
    if(r.status===401){sessionStorage.removeItem('jido-admin-token');setToken('');throw new Error('انتهت الجلسة؛ سجّل الدخول مرة أخرى');}
    return readJson(r);
  }
  async function login(e:React.FormEvent){
    e.preventDefault();setLogging(true);setLoginError('');
    try{const d=await readJson(await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})}));
      setToken(d.token);sessionStorage.setItem('jido-admin-token',d.token);setPassword('');
    }catch(e:any){setLoginError(e.message);}finally{setLogging(false);}
  }
  function change(next:StoreData){setDraft(next);setDirty(true);setMessage('');}
  function update<K extends keyof StoreData>(key:K,value:StoreData[K]){if(draft)change({...draft,[key]:value});}
  function modifyProduct(product:Product){if(draft)update('items',draft.items.some(p=>p.id===product.id)?draft.items.map(p=>p.id===product.id?product:p):[...draft.items,product]);}
  function modifyCategory(category:ProductCategory){if(draft)update('categories',draft.categories.some(c=>c.id===category.id)?draft.categories.map(c=>c.id===category.id?category:c):[...draft.categories,category]);}
  function modifyPromo(promo:Promo){if(draft)update('promos',draft.promos.some(p=>p.id===promo.id)?draft.promos.map(p=>p.id===promo.id?promo:p):[...draft.promos,promo]);}
  function modifySlide(slide:Slide){if(draft)update('slides',draft.slides.some(p=>p.id===slide.id)?draft.slides.map(p=>p.id===slide.id?slide:p):[...draft.slides,slide]);}
  const product=productId&&draft?.items.find(p=>p.id===productId);
  const category=categoryId&&draft?.categories.find(p=>p.id===categoryId);
  const promo=promoId&&draft?.promos.find(p=>p.id===promoId);
  const slide=slideId&&draft?.slides.find(p=>p.id===slideId);
  async function save(){
    if(!draft||saving)return;
    if(draft.items.some(p=>!p.name.trim()||!p.categoryId||p.basePrice<0))return setMessage('تحقق من أسماء المنتجات وأسعارها والأقسام المرتبطة بها');
    if(draft.restaurant.deliveryFee<0||draft.restaurant.freeDeliveryMinimum<0)return setMessage('قيم التوصيل يجب أن تكون موجبة');
    setSaving(true);setMessage('');
    try{
      const out=await auth('/api/admin/save-menu',{method:'POST',body:JSON.stringify({menu:draft,expectedSha:savedSha})});
      setSavedSha(out.sha);setDirty(false);setMessage('تم حفظ التغييرات على GitHub بنجاح. قد يستغرق تحديث نشر Vercel لحظات.');await onReload();
    }catch(e:any){setMessage('خطأ: '+e.message);}finally{setSaving(false);}
  }
  async function imageUpload(file:File|null,callback:(url:string)=>void,key:string){
    if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setMessage('يرجى رفع صورة JPG أو PNG أو WebP');return;}
    if(file.size>12*1024*1024){setMessage('حجم الصورة كبير جدًا');return;}
    setUploading(key);setMessage('');
    try{
      const img=await new Promise<HTMLImageElement>((resolve,reject)=>{const x=new Image();const u=URL.createObjectURL(file);x.onload=()=>{URL.revokeObjectURL(u);resolve(x)};x.onerror=()=>{URL.revokeObjectURL(u);reject(new Error('الصورة غير قابلة للقراءة'))};x.src=u;});
      const scale=Math.min(1,1400/Math.max(img.width,img.height));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
      canvas.getContext('2d')?.drawImage(img,0,0,canvas.width,canvas.height);
      const encoded=canvas.toDataURL('image/webp',0.78);
      const out=await auth('/api/admin/upload',{method:'POST',body:JSON.stringify({data:encoded})});
      callback(out.url);
    }catch(e:any){setMessage('فشل رفع الصورة: '+e.message);}finally{setUploading('');}
  }
  async function getOrders(){
    setOrdersError('');
    try{const d=await auth('/api/admin/orders');setOrders(d.orders||[]);}
    catch(e:any){setOrdersError(e.message);}
  }
  async function changeStatus(id:string,status:OrderStatus){
    try{await auth('/api/admin/orders/status',{method:'POST',body:JSON.stringify({id,status})});setOrders(old=>old.map(o=>o.id===id?{...o,status}:o));}
    catch(e:any){setOrdersError(e.message);}
  }
  const visibleOrders=useMemo(()=>orders.filter(o=>(filterStatus==='all'||o.status===filterStatus)&&(!filterDate||o.createdAt.slice(0,10)===filterDate))
    .sort((a,b)=>{const score=(o:Order)=>o.status==='pending'?0:o.status==='preparing'?1:2;return score(a)-score(b)||b.createdAt.localeCompare(a.createdAt)}),[orders,filterStatus,filterDate]);
  async function exportExcel(){
    try{
      const XLSX=await import('xlsx');
      const rows=visibleOrders.flatMap(o=>o.items.map(p=>({
        'رقم الطلب':o.id,'تاريخ الطلب':new Date(o.createdAt).toLocaleString('ar-SA'),
        'اسم الزبون':o.customerName,'رقم الجوال':o.phone,'نوع الطلب':o.service==='delivery'?'توصيل':'استلام',
        'العنوان':o.address,'طريقة الدفع':o.payment==='visa'?'فيزا':'نقدي','المنتج':p.name,'الكمية':p.quantity,
        'سعر الوحدة (ر.س)':p.unitPrice,'إجمالي الصنف (ر.س)':p.total,'المجموع الفرعي (ر.س)':o.subtotal,
        'كود الخصم':o.promo,'قيمة الخصم (ر.س)':o.discount,'رسوم التوصيل (ر.س)':o.deliveryFee,
        'الإجمالي (ر.س)':o.total,'الحالة':statusNames[o.status],'ملاحظات':o.notes
      })));
      const ws=XLSX.utils.json_to_sheet(rows.length?rows:[{'الطلبات':'لا توجد طلبات مطابقة'}]);
      ws['!cols']=Object.keys(rows[0]||{'الطلبات':''}).map(()=>({wch:22}));
      const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,ws,'الطلبات');XLSX.writeFile(book,'طلبات-جدو-داوود-'+new Date().toISOString().slice(0,10)+'.xlsx');
    }catch(e:any){setOrdersError('تعذر تصدير الملف: '+e.message);}
  }
  const tabs:{id:Tab;name:string;Icon:any}[]=[
    {id:'overview',name:'الرئيسية',Icon:LayoutDashboard},{id:'products',name:'المنتجات',Icon:Package},
    {id:'categories',name:'الأقسام',Icon:MenuIcon},{id:'orders',name:'الطلبات',Icon:ShoppingBag},
    {id:'promos',name:'أكواد الخصم',Icon:BadgePercent},{id:'slides',name:'الشرائح الرئيسية',Icon:ImageIcon},
    {id:'settings',name:'إعدادات المطعم',Icon:Settings}
  ];
  const Upload=({onPick,id}:{onPick:(f:File|null)=>void;id:string})=><label className="upload-button"><ImageIcon size={16}/>{uploading===id?'جارٍ رفع الصورة...':'رفع صورة من الجهاز'}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={!!uploading} onChange={e=>{onPick(e.target.files?.[0]||null);e.target.value='';}} hidden/></label>;
  if(!token)return <div className="admin-login" dir="rtl"><form onSubmit={login} className="login-box">
    <a href="/" className="back-link"><ArrowRight size={17}/> العودة للموقع</a>
    <img src={data?.restaurant.logoUrl||'/logo.webp'} alt="شعار جدو داوود"/>
    <h1>لوحة إدارة جدو داوود</h1><p>هذه الصفحة مخصصة لإدارة المطعم</p>
    <label>كلمة مرور المسؤول<input type="password" value={password} autoComplete="current-password" onChange={e=>setPassword(e.target.value)} required/></label>
    <button disabled={logging} type="submit" className="btn primary">{logging?'يتم التحقق...':'تسجيل الدخول'}</button>
    {loginError&&<p role="alert" className="form-error">{loginError}</p>}
  </form></div>;
  if(!draft)return <div className="center-loading">جارٍ تحميل بيانات المطعم...</div>;
  return <div className="admin-app" dir="rtl"><aside className={sideOpen?'admin-sidebar opened':'admin-sidebar'}>
    <div className="admin-side-head"><img src={draft.restaurant.logoUrl||'/logo.webp'} alt="شعار"/><div><strong>جدو داوود</strong><small>لوحة التحكم</small></div><button className="admin-close" onClick={()=>setSideOpen(false)}><X/></button></div>
    <nav>{tabs.map(t=><button className={tab===t.id?'side-active':''} key={t.id} onClick={()=>{setTab(t.id);setSideOpen(false);setProductId(null);setCategoryId(null);setPromoId(null);setSlideId(null);if(t.id==='orders')getOrders();}}><t.Icon size={20}/>{t.name}{t.id==='orders'&&orders.some(o=>o.status==='pending')&&<span className="side-dot"/>}</button>)}</nav>
    <div className="sidebar-bottom"><a href="/" target="_blank">عرض الموقع <ArrowRight size={15}/></a><button onClick={()=>{sessionStorage.removeItem('jido-admin-token');setToken('');}}><LogOut size={17}/> تسجيل الخروج</button></div>
  </aside>
  {sideOpen&&<div className="admin-overlay" onClick={()=>setSideOpen(false)}/>}
  <div className="admin-main"><header className="admin-top"><button className="admin-mobile-toggle" onClick={()=>setSideOpen(true)}><MenuIcon/></button><h1>{tabs.find(t=>t.id===tab)?.name}</h1><div className="admin-top-actions">{dirty&&<span className="unsaved">تغييرات غير محفوظة</span>}<button className="btn primary" disabled={!dirty||saving} onClick={save}>{saving?<Loader2 size={17}/>:<Save size={17}/>} {saving?'جارٍ الحفظ':'حفظ التغييرات'}</button></div></header>
  <div className="admin-body">{message&&<div role="status" className={message.startsWith('خطأ')||message.startsWith('فشل')?'admin-message error':'admin-message'}>{message}</div>}
    {tab==='overview'&&<><div className="stats-grid">
      {[['المنتجات',draft.items.length,Package],['الأقسام',draft.categories.length,MenuIcon],['الطلبات الجديدة',orders.filter(o=>o.status==='pending').length,ShoppingBag],['العروض النشطة',draft.items.filter(p=>p.offerEnabled).length,BadgePercent]].map(([name,value,Icon]:any)=><div className="stat-card" key={name}><Icon size={22}/><span>{name}</span><strong>{value}</strong></div>)}
    </div><section className="admin-panel"><h2>حالة التكامل</h2><p>الربط مع GitHub: {configured?.githubConfigured?'مفعّل':'يحتاج إعداد GITHUB_TOKEN على Vercel'}</p><p>حفظ الطلبات المشفّر: {configured?.ordersEncrypted?'مفعّل':'يحتاج إعداد ORDERS_ENCRYPTION_KEY'}</p><p>يتم حفظ منتجات المطعم والأقسام والإعدادات في مستودع GitHub وتحديثها على الموقع. تُشفّر بيانات الطلبات قبل إرسالها للمستودع.</p><button className="btn outline" onClick={getOrders}>تحديث الطلبات</button></section></>}
    {tab==='products'&&<section className="admin-panel"><div className="admin-section-title"><h2>إدارة المنتجات</h2><button className="btn primary" onClick={()=>{const p=emptyProduct();p.categoryId=draft.categories[0]?.id||'';modifyProduct(p);setProductId(p.id);}}><Plus size={17}/> إضافة منتج</button></div>
      {productId&&product&&<div className="editor-panel"><h3>بيانات المنتج</h3>
        <div className="admin-form-grid">
          <TextInput label="اسم المنتج" value={product.name} onChange={v=>modifyProduct({...product,name:v})}/>
          <label className="admin-field">القسم<select value={product.categoryId} onChange={e=>modifyProduct({...product,categoryId:e.target.value})}><option value="">اختر القسم</option>{draft.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <TextInput label="السعر الأصلي (ر.س)" type="number" value={product.basePrice} onChange={v=>modifyProduct({...product,basePrice:Number(v)})}/>
          <TextInput label="السعر بعد الخصم (ر.س)" type="number" value={product.offerPrice??0} onChange={v=>modifyProduct({...product,offerPrice:Number(v)})}/>
          <TextInput label="ترتيب الظهور" type="number" value={product.displayOrder} onChange={v=>modifyProduct({...product,displayOrder:Number(v)})}/>
          <div className="admin-field"><span>الصورة</span><Upload id={'product-'+product.id} onPick={file=>imageUpload(file,url=>modifyProduct({...product,imageUrl:url}),'product-'+product.id)}/></div>
        </div>
        {product.imageUrl&&<img className="admin-image-preview" src={product.imageUrl} alt="معاينة المنتج"/>}
        <label className="admin-field">الوصف<textarea rows={3} value={product.description} onChange={e=>modifyProduct({...product,description:e.target.value})}/></label>
        <div className="admin-check-row"><CheckInput label="المنتج متاح" value={product.isAvailable} onChange={v=>modifyProduct({...product,isAvailable:v})}/><CheckInput label="تفعيل العرض الخاص" value={!!product.offerEnabled} onChange={v=>modifyProduct({...product,offerEnabled:v})}/></div>
        {product.offerEnabled&&product.offerPrice!=null&&product.basePrice>product.offerPrice&&<div className="discount-preview"><del>{moneyLabel(product.basePrice)}</del><strong>{moneyLabel(product.offerPrice)}</strong><span>خصم {Math.round((1-product.offerPrice/product.basePrice)*100)}٪</span></div>}
        <button className="btn outline" onClick={()=>setProductId(null)}>إغلاق المحرر</button>
      </div>}
      <TextInput label="بحث عن منتج" value={search} onChange={setSearch} placeholder="اسم المنتج"/>
      <div className="admin-list">{draft.items.filter(p=>p.name.includes(search)).map(p=><div className="admin-list-row" key={p.id}>
        {p.imageUrl?<img src={p.imageUrl} alt=""/>:<Package/>}<div className="list-info"><strong>{p.name||'منتج جديد'}</strong><small>{draft.categories.find(c=>c.id===p.categoryId)?.name||'بدون قسم'} · {moneyLabel(priceOf(p))}</small></div>
        <button className="mini-action" onClick={()=>setProductId(p.id)}>تعديل</button>
        <button className="icon-danger" aria-label="حذف المنتج" onClick={()=>{if(confirm('هل تريد حذف المنتج؟')){update('items',draft.items.filter(x=>x.id!==p.id));if(productId===p.id)setProductId(null);}}}><Trash2 size={17}/></button>
      </div>)}</div></section>}
    {tab==='categories'&&<section className="admin-panel"><div className="admin-section-title"><h2>أقسام القائمة</h2><button className="btn primary" onClick={()=>{const c=emptyCategory();modifyCategory(c);setCategoryId(c.id);}}><Plus size={17}/> إضافة قسم</button></div>
      {categoryId&&category&&<div className="editor-panel"><div className="admin-form-grid"><TextInput label="اسم القسم" value={category.name} onChange={v=>modifyCategory({...category,name:v})}/><TextInput label="ترتيب القسم" type="number" value={category.displayOrder} onChange={v=>modifyCategory({...category,displayOrder:Number(v)})}/></div>
        <label className="admin-field">وصف القسم<textarea rows={2} value={category.description||''} onChange={e=>modifyCategory({...category,description:e.target.value})}/></label><CheckInput label="القسم ظاهر" value={category.isActive} onChange={v=>modifyCategory({...category,isActive:v})}/>
        <button className="btn outline" onClick={()=>setCategoryId(null)}>إغلاق المحرر</button></div>}
      <div className="admin-list">{draft.categories.map(c=><div className="admin-list-row" key={c.id}><Tag/><div className="list-info"><strong>{c.name||'قسم جديد'}</strong><small>{draft.items.filter(p=>p.categoryId===c.id).length} منتج · /category/{c.id}</small></div><button className="mini-action" onClick={()=>setCategoryId(c.id)}>تعديل</button><button className="icon-danger" onClick={()=>{if(draft.items.some(p=>p.categoryId===c.id)){alert('انقل منتجات هذا القسم أولًا قبل حذفه');return;}if(confirm('حذف القسم؟')){update('categories',draft.categories.filter(x=>x.id!==c.id));if(categoryId===c.id)setCategoryId(null);}}}><Trash2 size={17}/></button></div>)}</div>
      <p className="hint">قسم «العروض» يظهر تلقائيًا أولًا إذا كان هناك منتج مفعّل له عرض.</p></section>}
    {tab==='promos'&&<section className="admin-panel"><div className="admin-section-title"><h2>أكواد الخصم</h2><button className="btn primary" onClick={()=>{const p=emptyPromo();modifyPromo(p);setPromoId(p.id);}}><Plus size={17}/> إضافة كود</button></div>
      {promoId&&promo&&<div className="editor-panel"><div className="admin-form-grid">
        <TextInput label="رمز الخصم" value={promo.code} onChange={v=>modifyPromo({...promo,code:v.trim().toUpperCase()})}/>
        <label className="admin-field">نوع الخصم<select value={promo.type} onChange={e=>modifyPromo({...promo,type:e.target.value as 'percent'|'fixed'})}><option value="percent">نسبة مئوية</option><option value="fixed">مبلغ ثابت</option></select></label>
        <TextInput label={promo.type==='percent'?'النسبة المئوية':'القيمة (ر.س)'} type="number" value={promo.value} onChange={v=>modifyPromo({...promo,value:Number(v)})}/>
      </div><CheckInput label="الكود مفعّل" value={promo.enabled} onChange={v=>modifyPromo({...promo,enabled:v})}/><button className="btn outline" onClick={()=>setPromoId(null)}>إغلاق المحرر</button></div>}
      <div className="admin-list">{draft.promos.map(p=><div className="admin-list-row" key={p.id}><BadgePercent/><div className="list-info"><strong dir="ltr">{p.code||'كود جديد'}</strong><small>{p.type==='percent'?p.value+'٪':moneyLabel(p.value)} · {p.enabled?'مفعّل':'متوقف'}</small></div><button className="mini-action" onClick={()=>setPromoId(p.id)}>تعديل</button><button className="icon-danger" onClick={()=>{if(confirm('حذف كود الخصم؟')){update('promos',draft.promos.filter(x=>x.id!==p.id));setPromoId(null);}}}><Trash2 size={17}/></button></div>)}</div></section>}
    {tab==='slides'&&<section className="admin-panel"><div className="admin-section-title"><h2>الصور المتحركة في الرئيسية</h2><button className="btn primary" onClick={()=>{const s=emptySlide();modifySlide(s);setSlideId(s.id);}}><Plus size={17}/> إضافة شريحة</button></div>
      {slideId&&slide&&<div className="editor-panel"><div className="admin-form-grid"><TextInput label="العنوان" value={slide.title} onChange={v=>modifySlide({...slide,title:v})}/><div className="admin-field"><span>صورة الشريحة</span><Upload id={'slide-'+slide.id} onPick={f=>imageUpload(f,url=>modifySlide({...slide,imageUrl:url}),'slide-'+slide.id)}/></div></div>
        <label className="admin-field">الوصف<textarea rows={2} value={slide.description} onChange={e=>modifySlide({...slide,description:e.target.value})}/></label><CheckInput label="الشريحة مفعّلة" value={slide.enabled} onChange={v=>modifySlide({...slide,enabled:v})}/>{slide.imageUrl&&<img className="admin-wide-preview" src={slide.imageUrl} alt="معاينة"/>}<button className="btn outline" onClick={()=>setSlideId(null)}>إغلاق المحرر</button></div>}
      <div className="admin-list">{draft.slides.map(s=><div className="admin-list-row" key={s.id}>{s.imageUrl?<img src={s.imageUrl} alt=""/>:<ImageIcon/>}<div className="list-info"><strong>{s.title||'شريحة جديدة'}</strong><small>{s.enabled?'مفعّلة':'غير مفعّلة'}</small></div><button className="mini-action" onClick={()=>setSlideId(s.id)}>تعديل</button><button className="icon-danger" onClick={()=>{if(confirm('حذف الشريحة؟')){update('slides',draft.slides.filter(x=>x.id!==s.id));setSlideId(null);}}}><Trash2 size={17}/></button></div>)}</div></section>}
    {tab==='orders'&&<section className="admin-panel"><div className="admin-section-title"><h2>طلبات الزبائن</h2><div className="admin-toolbar"><button className="btn outline" onClick={getOrders}>تحديث</button><button className="btn primary" onClick={exportExcel}>تصدير Excel</button></div></div>
      {ordersError&&<p className="form-error">{ordersError}</p>}
      <div className="admin-form-grid"><label className="admin-field">فلترة حسب الحالة<select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="all">كل الحالات</option>{Object.entries(statusNames).map(([v,n])=><option value={v} key={v}>{n}</option>)}</select></label><TextInput label="فلترة حسب التاريخ" type="date" value={filterDate} onChange={setFilterDate}/></div>
      <p className="hint">{visibleOrders.length} طلب مطابق — الطلبات غير المنجزة تظهر أولًا</p>
      <div className="orders-list">{visibleOrders.map(o=><article className="order-card" key={o.id}>
        <div className="order-top"><div><strong>{o.id}</strong><small>{new Date(o.createdAt).toLocaleString('ar-SA')}</small></div><span className={'order-status status-'+o.status}>{statusNames[o.status]}</span></div>
        <div className="order-detail-grid"><span><b>العميل:</b> {o.customerName}</span><span><b>الجوال:</b> <a href={'tel:'+o.phone}>{o.phone}</a></span><span><b>طريقة الاستلام:</b> {o.service==='delivery'?'توصيل':'استلام'}</span><span><b>الدفع:</b> {o.payment==='visa'?'فيزا عند الاستلام':'نقدًا'}</span>{o.address&&<span className="order-address"><b>العنوان:</b> {o.address}</span>}</div>
        <div className="order-items">{o.items.map((p,i)=><div key={i}><span>{p.name} × {p.quantity}</span><strong>{moneyLabel(p.total)}</strong></div>)}</div>
        <div className="order-totals"><span>خصم: {moneyLabel(o.discount)}</span><span>توصيل: {moneyLabel(o.deliveryFee)}</span><strong>الإجمالي: {moneyLabel(o.total)}</strong></div>{o.notes&&<p className="order-notes">ملاحظات: {o.notes}</p>}
        <label className="admin-field">تغيير الحالة<select value={o.status} onChange={e=>changeStatus(o.id,e.target.value as OrderStatus)}>{Object.entries(statusNames).map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
      </article>)}{visibleOrders.length===0&&<div className="empty-state">لا توجد طلبات مطابقة</div>}</div></section>}
    {tab==='settings'&&<section className="admin-panel"><h2>هوية المطعم ومعلومات الاتصال</h2>
      <div className="admin-form-grid">
        <TextInput label="اسم المطعم" value={draft.restaurant.name} onChange={v=>change({...draft,restaurant:{...draft.restaurant,name:v}})}/>
        <TextInput label="عبارة تعريفية" value={draft.restaurant.tagline} onChange={v=>change({...draft,restaurant:{...draft.restaurant,tagline:v}})}/>
        <TextInput label="رقم واتساب الطلبات (رمز الدولة بدون +)" value={draft.restaurant.whatsapp} onChange={v=>change({...draft,restaurant:{...draft.restaurant,whatsapp:v}})} placeholder="9665xxxxxxxx"/>
        <TextInput label="رقم هاتف المطعم" value={draft.restaurant.phone} onChange={v=>change({...draft,restaurant:{...draft.restaurant,phone:v}})}/>
        <TextInput label="العنوان" value={draft.restaurant.address} onChange={v=>change({...draft,restaurant:{...draft.restaurant,address:v}})}/>
        <TextInput label="ساعات العمل" value={draft.restaurant.hours} onChange={v=>change({...draft,restaurant:{...draft.restaurant,hours:v}})}/>
        <TextInput label="رابط تضمين Google Maps" value={draft.restaurant.mapEmbedUrl} onChange={v=>change({...draft,restaurant:{...draft.restaurant,mapEmbedUrl:v}})}/>
        <TextInput label="رابط الخط من Google Fonts" value={draft.restaurant.googleFontUrl} onChange={v=>change({...draft,restaurant:{...draft.restaurant,googleFontUrl:v}})} placeholder="https://fonts.googleapis.com/css2?family=..."/>
      </div>
      <div className="admin-form-grid admin-upload-pair"><div className="admin-field"><span>تغيير الشعار</span><Upload id="logo" onPick={f=>imageUpload(f,url=>change({...draft,restaurant:{...draft.restaurant,logoUrl:url}}),'logo')}/>{draft.restaurant.logoUrl&&<img src={draft.restaurant.logoUrl} className="admin-logo-preview" alt="الشعار"/>}</div><div className="admin-field"><span>تغيير أيقونة الموقع (favicon)</span><Upload id="favicon" onPick={f=>imageUpload(f,url=>change({...draft,restaurant:{...draft.restaurant,faviconUrl:url}}),'favicon')}/>{draft.restaurant.faviconUrl&&<img src={draft.restaurant.faviconUrl} className="admin-favicon-preview" alt="الأيقونة"/>}</div></div>
      <h2>إعدادات التوصيل</h2><CheckInput label="تفعيل خدمة التوصيل" value={draft.restaurant.deliveryEnabled} onChange={v=>change({...draft,restaurant:{...draft.restaurant,deliveryEnabled:v}})}/>
      <div className="admin-form-grid"><TextInput label="رسوم التوصيل (ر.س)" type="number" value={draft.restaurant.deliveryFee} onChange={v=>change({...draft,restaurant:{...draft.restaurant,deliveryFee:Number(v)}})}/><TextInput label="الحد الأدنى للتوصيل المجاني (ر.س)" type="number" value={draft.restaurant.freeDeliveryMinimum} onChange={v=>change({...draft,restaurant:{...draft.restaurant,freeDeliveryMinimum:Number(v)}})}/></div>
      <h2>روابط التواصل الاجتماعي</h2><p className="hint">تظهر أيقونة المنصة على الموقع فقط عند إضافة رابط لها. اترك الحقل فارغًا لإخفائها.</p>
      <div className="admin-form-grid">{([['facebook','فيسبوك'],['instagram','إنستغرام'],['tiktok','تيك توك'],['snapchat','سناب شات']] as const).map(([key,label])=>
        <TextInput key={key} label={label} value={draft.restaurant.social?.[key]||''} placeholder="https://..." onChange={v=>change({...draft,restaurant:{...draft.restaurant,social:{...draft.restaurant.social,[key]:v}}})}/>)}</div>
      <p className="hint">العملة ثابتة: الريال السعودي (SAR). جميع البيانات عربية وواجهة الموقع RTL.</p>
    </section>}
  </div></div></div>;
}
