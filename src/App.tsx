import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {ArrowLeft, ArrowRight, BadgePercent, Check, ChevronLeft, ChevronRight, Facebook, Ghost, Instagram, MapPin, Menu as MenuIcon, MessageCircle, Minus, Music2, Phone, Plus, Search, Share2, ShoppingBag, Trash2, Truck, Wallet, CreditCard, Store, X} from 'lucide-react';
import type {StoreData,Product,ProductCategory,CartLine} from './types/store';
import {priceOf,moneyLabel,linkToCategory,linkToProduct} from './types/store';
import {StoreAdmin} from './components/admin/StoreAdmin';
import bundledMenu from '../data/menu.json';

function App(){
  const [path,setPath]=useState(window.location.pathname);
  const [menu,setMenu]=useState<StoreData|null>(null);
  const [sha,setSha]=useState('');
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState('');
  const [search,setSearch]=useState('');
  const [activeSlide,setActiveSlide]=useState(0);
  const [navOpen,setNavOpen]=useState(false);
  const [cart,setCart]=useState<CartLine[]>(()=>{
    try{return JSON.parse(localStorage.getItem('jido-cart')||'[]');}catch{return [];}
  });
  const [customer,setCustomer]=useState({customerName:'',phone:'',address:'',notes:'',service:'pickup',payment:'cash',promo:''});
  const [placing,setPlacing]=useState(false);
  const [orderError,setOrderError]=useState('');
  const [orderSuccess,setOrderSuccess]=useState('');
  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const r=await fetch('/api/menu',{cache:'no-store'});
      const ct=r.headers.get('content-type')||'';
      if(!ct.includes('application/json'))throw new Error('استجابة الخادم غير صالحة (HTTP '+r.status+')');
      const data=await r.json();
      if(!r.ok||!data?.menu?.restaurant)throw new Error(data.error||'تعذر تحميل القائمة');
      setMenu(data.menu);setSha(data.sha||'');
      setLoadError(data.warning||'');
    }catch(e:any){
      console.error('Menu API unavailable:',e);
      setMenu(prev=>prev||(bundledMenu as unknown as StoreData));
      setLoadError('تعذر تحديث القائمة مباشرةً من الخادم. يتم عرض البيانات المحفوظة مؤقتًا، ويمكنك إعادة المحاولة.');
    }finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{localStorage.setItem('jido-cart',JSON.stringify(cart));},[cart]);
  useEffect(()=>{
    const onPop=()=>{setPath(window.location.pathname);window.scrollTo(0,0);};
    window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop);
  },[]);
  useEffect(()=>{
    if(!menu?.restaurant.googleFontUrl)return;
    const url=menu.restaurant.googleFontUrl;
    if(!/^https:\/\/fonts\.googleapis\.com\/css2?\?/.test(url))return;
    const family=(new URL(url)).searchParams.get('family')?.split(':')[0]?.replace(/\+/g,' ');
    if(family)document.documentElement.style.setProperty('--restaurant-font',JSON.stringify(family));
    const link=document.createElement('link');link.rel='stylesheet';link.href=url;document.head.appendChild(link);
    return()=>{link.remove();};
  },[menu?.restaurant.googleFontUrl]);
  useEffect(()=>{
    if(!menu?.restaurant.faviconUrl)return;
    let el=document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if(!el){el=document.createElement('link');el.rel='icon';document.head.appendChild(el);}
    el.href=menu.restaurant.faviconUrl;
  },[menu?.restaurant.faviconUrl]);
  const slides=menu?.slides.filter(s=>s.enabled&&s.imageUrl)||[];
  useEffect(()=>{if(slides.length<2)return;const timer=window.setInterval(()=>setActiveSlide(i=>(i+1)%slides.length),6000);return()=>clearInterval(timer);},[slides.length]);
  const go=(to:string)=>{
    if(to!==window.location.pathname)history.pushState({},'',to);
    setPath(to);setNavOpen(false);window.scrollTo({top:0,behavior:'smooth'});
  };
  const add=(product:Product)=>{
    setCart(old=>{
      const exists=old.find(x=>x.productId===product.id);
      return exists?old.map(x=>x.productId===product.id?{...x,quantity:Math.min(x.quantity+1,99)}:x):[...old,{productId:product.id,quantity:1}];
    });
  };
  const adjust=(id:string,delta:number)=>setCart(old=>old.map(x=>x.productId===id?{...x,quantity:x.quantity+delta}:x).filter(x=>x.quantity>0));
  const cartLines=useMemo(()=>cart.map(line=>({line,product:menu?.items.find(p=>p.id===line.productId)})).filter((v):v is {line:CartLine,product:Product}=>Boolean(v.product&&v.product.isAvailable)),[menu,cart]);
  const cartCount=cartLines.reduce((sum,v)=>sum+v.line.quantity,0);
  const subtotal=cartLines.reduce((sum,v)=>sum+priceOf(v.product)*v.line.quantity,0);
  const selectedPromo=menu?.promos.find(p=>p.enabled&&p.code.toLowerCase()===customer.promo.trim().toLowerCase());
  const discount=selectedPromo?Math.min(subtotal,selectedPromo.type==='percent'?subtotal*selectedPromo.value/100:selectedPromo.value):0;
  const net=subtotal-discount;
  const deliveryFee=customer.service==='delivery'&&menu?.restaurant.deliveryEnabled&&net<(menu.restaurant.freeDeliveryMinimum||0) ?menu.restaurant.deliveryFee||0:0;
  const total=net+deliveryFee;
  const offers=menu?.items.filter(p=>p.isAvailable&&p.offerEnabled&&p.offerPrice!=null&&p.offerPrice<p.basePrice)||[];
  const allCategories=(menu?.categories.filter(c=>c.isActive).sort((a,b)=>a.displayOrder-b.displayOrder)||[]);
  const hasOffers=offers.length>0;
  const searchItems=(items:Product[])=>items.filter(p=>p.isAvailable&&(!search||p.name.includes(search)||p.description.includes(search))).sort((a,b)=>a.displayOrder-b.displayOrder);
  const send=async()=>{
    setOrderError('');setOrderSuccess('');
    if(!cartLines.length){setOrderError('السلة فارغة');return;}
    setPlacing(true);
    try{
      const r=await fetch('/api/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...customer,items:cartLines.map(v=>v.line)})});
      const d=await r.json();if(!r.ok)throw new Error(d.error||'تعذر تسجيل الطلب');
      setOrderSuccess('تم حفظ الطلب رقم '+d.orderId+'، جارٍ الانتقال إلى واتساب لإرساله للمطعم.');
      setCart([]);
      window.location.assign(d.whatsappUrl);
    }catch(e:any){setOrderError(e.message);}finally{setPlacing(false);}
  };
  const share=async()=>{
    const url=window.location.href;
    if(navigator.share){try{await navigator.share({title:document.title,url});return;}catch{}}
    await navigator.clipboard.writeText(url);alert('تم نسخ الرابط');
  };
  const social=[{id:'facebook',label:'فيسبوك',Icon:Facebook},{id:'instagram',label:'إنستغرام',Icon:Instagram},{id:'tiktok',label:'تيك توك',Icon:Music2},{id:'snapchat',label:'سناب شات',Icon:Ghost}] as const;
  if(path.startsWith('/admin'))return <StoreAdmin data={menu} sha={sha} onReload={load} />;
  if(loading&&!menu)return <div className="center-loading" dir="rtl">يتم تحميل قائمة جدو داوود...</div>;
  if(!menu)return <div className="center-loading" dir="rtl"><p>{loadError||'تعذر تحميل القائمة'}</p><button className="btn primary" onClick={load}>إعادة المحاولة</button></div>;
  const restaurant=menu.restaurant;
  const categoryId=decodeURIComponent(path.split('--').slice(-1)[0]||'');
  const currentCategory=allCategories.find(c=>c.id===categoryId);
  const productId=decodeURIComponent(path.split('--').slice(-1)[0]||'');
  const product=menu.items.find(p=>p.id===productId&&p.isAvailable);
  const page=path.startsWith('/category/')?'category':path.startsWith('/product/')?'product':path==='/categories'?'categories':path==='/cart'?'cart':path==='/contact'?'contact':'home';
  const pageTitle=page==='category'?currentCategory?.name:page==='product'?product?.name:page==='cart'?'سلة الطلبات':page==='contact'?'تواصل معنا':page==='categories'?'الأقسام':'قائمة الطعام';
  document.title=(pageTitle||'قائمة الطعام')+' | '+restaurant.name;
  const ProductCard=({p}:{p:Product})=>{
    const offered=p.offerEnabled && p.offerPrice!=null&&p.offerPrice<p.basePrice;
    const pct=offered?Math.round((1-Number(p.offerPrice)/p.basePrice)*100):0;
    return <article className="product-card">
      <button className="product-image-button" aria-label={'عرض '+p.name} onClick={()=>go(linkToProduct(p))}>
        {p.imageUrl?<img loading="lazy" className="product-image" src={p.imageUrl} alt={p.name}/>:<div className="product-placeholder"><ShoppingBag size={36}/></div>}
        {offered&&<span className="offer-badge">خصم {pct}٪</span>}
      </button>
      <div className="product-meta">
        <button className="product-name" onClick={()=>go(linkToProduct(p))}>{p.name}</button>
        <div className="card-bottom">
          <div className="prices">{offered&&<del>{moneyLabel(p.basePrice)}</del>}<strong>{moneyLabel(priceOf(p))}</strong></div>
          <button className="add-circle" onClick={()=>add(p)} aria-label={'أضف '+p.name+' للسلة'}><Plus size={21}/></button>
        </div>
      </div>
    </article>;
  };
  const Cards=({items}:{items:Product[]})=><div className="product-grid">{items.map(p=><ProductCard p={p} key={p.id}/>)}</div>;
  const CategoryGrid=()=> <div className="category-grid">
    {hasOffers&&<button className="category-tile offer-category" onClick={()=>go('/category/offers')}><BadgePercent size={24}/><span>العروض</span><small>{offers.length} منتج</small></button>}
    {allCategories.map(c=><button key={c.id} className="category-tile" onClick={()=>go(linkToCategory(c))}><ShoppingBag size={22}/><span>{c.name}</span><small>{menu.items.filter(p=>p.categoryId===c.id&&p.isAvailable).length} منتج</small></button>)}
  </div>;
  const Contact=()=> <section className="contact-section" id="contact">
    <div className="section-head"><div><span className="eyebrow">نرحب بزيارتكم</span><h2>تواصل معنا</h2></div></div>
    <div className="contact-grid"><div className="contact-information">
      {restaurant.address&&<div className="contact-line"><MapPin/><div><strong>عنوان المطعم</strong><p>{restaurant.address}</p></div></div>}
      {restaurant.phone&&<a className="contact-line" href={'tel:'+restaurant.phone}><Phone/><div><strong>الهاتف</strong><p dir="ltr">{restaurant.phone}</p></div></a>}
      {restaurant.hours&&<div className="contact-line"><Store/><div><strong>أوقات العمل</strong><p>{restaurant.hours}</p></div></div>}
      <div className="social-links">{social.filter(s=>restaurant.social?.[s.id]).map(({id,label,Icon})=><a key={id} target="_blank" rel="noopener noreferrer" href={restaurant.social[id]} aria-label={label} title={label}><Icon size={20}/></a>)}</div>
      {restaurant.whatsapp&&<a className="btn primary whatsapp-btn" target="_blank" rel="noopener noreferrer" href={'https://wa.me/'+restaurant.whatsapp.replace(/\D/g,'')}><MessageCircle size={18}/> تواصل عبر واتساب</a>}
    </div>
    <div className="map-panel">{restaurant.mapEmbedUrl&&/^https:\/\/(www\.)?google\.com\/maps\/embed/.test(restaurant.mapEmbedUrl)?<iframe src={restaurant.mapEmbedUrl} title="موقع المطعم" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen/>:<div className="map-placeholder"><MapPin size={38}/><span>يمكن إضافة موقع المطعم على الخريطة من لوحة التحكم</span></div>}</div></div>
  </section>;
  return <div className="site" dir="rtl" style={{fontFamily:'var(--restaurant-font), Tahoma, sans-serif'}}>
    {loadError&&<div role="status" className="api-warning"><span>{loadError}</span><button onClick={load}>إعادة المحاولة</button></div>}
    <header className="site-header"><div className="header-inner">
      <button className="brand" onClick={()=>go('/')} aria-label="الصفحة الرئيسية">
        <img src={restaurant.logoUrl||'/logo.webp'} alt={'شعار '+restaurant.name}/>
        <span><strong>{restaurant.name}</strong><small>{restaurant.tagline||'الطعم الأصيل'}</small></span>
      </button>
      <nav className={navOpen?'nav-links open':'nav-links'} aria-label="التنقل الرئيسي">
        {[['/','الرئيسية'],['/categories','الأقسام'],['/cart','السلة'],['/contact','اتصل بنا']].map(([to,label])=><button key={to} onClick={()=>go(to)} className={path===to?'nav-current':''}>{label}</button>)}
      </nav>
      <div className="header-actions"><button className="header-cart" onClick={()=>go('/cart')} aria-label="افتح السلة"><ShoppingBag size={21}/>{cartCount>0&&<span>{cartCount}</span>}</button><button className="mobile-menu" onClick={()=>setNavOpen(!navOpen)} aria-label="القائمة">{navOpen?<X/>:<MenuIcon/>}</button></div>
    </div></header>
    <main>
      {page==='home'&&<>
        <section className="hero-wrap"><div className="hero-slider">
          {slides.length?<><img src={slides[activeSlide%slides.length].imageUrl} alt={slides[activeSlide%slides.length].title}/>
            <div className="hero-shade"/><div className="hero-content"><span>أهلاً بكم في {restaurant.name}</span><h1>{slides[activeSlide%slides.length].title}</h1><p>{slides[activeSlide%slides.length].description}</p><button className="btn light" onClick={()=>document.getElementById('menu')?.scrollIntoView({behavior:'smooth'})}>تصفح قائمتنا <ArrowLeft size={18}/></button></div>
            {slides.length>1&&<div className="slide-controls"><button aria-label="التالي" onClick={()=>setActiveSlide((activeSlide+1)%slides.length)}><ChevronRight/></button><button aria-label="السابق" onClick={()=>setActiveSlide((activeSlide+slides.length-1)%slides.length)}><ChevronLeft/></button></div>}
          </>:<div className="hero-empty"><h1>أهلاً بكم في {restaurant.name}</h1><p>نكهات تجمعنا ولحظات تبقى</p></div>}
        </div></section>
        <div className="container">
          <section className="categories-section"><div className="section-head"><div><span className="eyebrow">اكتشف أشهى الأطباق</span><h2>تصفح الأقسام</h2></div><button className="text-link" onClick={()=>go('/categories')}>كل الأقسام <ArrowLeft size={17}/></button></div><CategoryGrid/></section>
          <div id="menu" className="menu-section"><div className="section-head"><div><span className="eyebrow">مذاق على ذوقك</span><h2>قائمة الطعام</h2></div></div>
            <div className="search-wrapper"><Search size={20}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث عن طبقك المفضل..." aria-label="بحث في الأصناف"/></div>
            {hasOffers&&searchItems(offers).length>0&&<section className="menu-group"><div className="group-title"><h3><BadgePercent/> العروض المميزة</h3><button onClick={()=>go('/category/offers')}>عرض الكل <ArrowLeft size={16}/></button></div><Cards items={searchItems(offers)}/></section>}
            {allCategories.map(c=>{
              const items=searchItems(menu.items.filter(p=>p.categoryId===c.id));
              return items.length>0?<section key={c.id} className="menu-group"><div className="group-title"><h3>{c.name}</h3><button onClick={()=>go(linkToCategory(c))}>عرض الكل <ArrowLeft size={16}/></button></div><Cards items={items}/></section>:null;
            })}
            {menu.items.filter(p=>p.isAvailable).length===0&&<div className="empty-state"><ShoppingBag size={38}/><h3>قائمة الطعام قيد الإعداد</h3><p>ستظهر أصناف المطعم هنا قريبًا.</p></div>}
            {search&&menu.items.filter(p=>p.isAvailable&&(p.name.includes(search)||p.description.includes(search))).length===0&&<div className="empty-state">لا توجد نتائج مطابقة للبحث</div>}
          </div>
          <Contact/>
        </div>
      </>}
      {page==='categories'&&<div className="container page-container"><div className="page-heading"><span className="eyebrow">اختر ما تشتهي</span><h1>أقسام القائمة</h1></div><CategoryGrid/></div>}
      {page==='category'&&<div className="container page-container"><button className="back-link" onClick={()=>go('/categories')}><ArrowRight size={16}/> العودة للأقسام</button>
        {(path==='/category/offers'&&hasOffers)?<><div className="page-heading"><h1>العروض المميزة</h1></div><Cards items={offers}/></>:currentCategory?<><div className="page-heading"><h1>{currentCategory.name}</h1><p>{currentCategory.description}</p></div><Cards items={searchItems(menu.items.filter(p=>p.categoryId===currentCategory.id))}/></>:<div className="empty-state">القسم غير موجود</div>}
      </div>}
      {page==='product'&&<div className="container page-container"><button className="back-link" onClick={()=>go('/')}><ArrowRight size={16}/> العودة إلى القائمة</button>
        {product?<div className="product-detail"><div className="detail-media">{product.imageUrl?<img src={product.imageUrl} alt={product.name}/>:<div className="product-placeholder"><ShoppingBag size={45}/></div>}</div>
          <div className="detail-info"><span className="eyebrow">{allCategories.find(c=>c.id===product.categoryId)?.name||'قائمة الطعام'}</span><h1>{product.name}</h1>{product.description&&<p>{product.description}</p>}
            {product.offerEnabled&&product.offerPrice!=null&&product.offerPrice<product.basePrice&&<del>{moneyLabel(product.basePrice)}</del>}
            <div className="detail-price">{moneyLabel(priceOf(product))}</div><div className="detail-actions"><button className="btn primary" onClick={()=>add(product)}><Plus size={19}/> أضف للسلة</button><button className="btn outline" onClick={share}><Share2 size={18}/> مشاركة المنتج</button></div>
          </div></div>:<div className="empty-state">هذا المنتج غير متاح</div>}
      </div>}
      {page==='cart'&&<div className="container page-container"><div className="page-heading"><span className="eyebrow">خطوة واحدة تفصلك عن طلبك</span><h1>سلة الطلبات <span className="count-pill">{cartCount}</span></h1></div>
        {!cartLines.length?<div className="empty-state"><ShoppingBag size={42}/><h3>سلتك فارغة حاليًا</h3><button className="btn primary" onClick={()=>go('/')}>تصفح الطعام</button></div>:
        <div className="checkout-layout"><div className="checkout-main">
          <section className="white-panel"><h2>المنتجات المختارة</h2>{cartLines.map(({line,product:p})=><div key={p.id} className="cart-row">
            {p.imageUrl?<img src={p.imageUrl} alt={p.name}/>:<div className="cart-placeholder"><ShoppingBag/></div>}
            <div className="cart-row-content"><strong>{p.name}</strong><span>{moneyLabel(priceOf(p))}</span><div className="quantity"><button onClick={()=>adjust(p.id,-1)} aria-label="تقليل"><Minus size={14}/></button><span>{line.quantity}</span><button onClick={()=>adjust(p.id,1)} aria-label="زيادة"><Plus size={14}/></button></div></div>
            <button className="delete-product" onClick={()=>adjust(p.id,-line.quantity)} aria-label="حذف"><Trash2 size={18}/></button>
          </div>)}</section>
          <section className="white-panel"><h2>بيانات الطلب</h2><div className="form-grid"><label>الاسم الكامل <input required value={customer.customerName} onChange={e=>setCustomer({...customer,customerName:e.target.value})} placeholder="الاسم"/></label><label>رقم الجوال <input required type="tel" dir="ltr" value={customer.phone} onChange={e=>setCustomer({...customer,phone:e.target.value})} placeholder="05xxxxxxxx"/></label></div>
            <h3 className="form-subheading">طريقة الاستلام</h3><div className="choice-grid">
              <button className={customer.service==='pickup'?'choice selected':'choice'} onClick={()=>setCustomer({...customer,service:'pickup'})}><Store size={20}/> استلام من المطعم {customer.service==='pickup'&&<Check size={16}/>}</button>
              {restaurant.deliveryEnabled&&<button className={customer.service==='delivery'?'choice selected':'choice'} onClick={()=>setCustomer({...customer,service:'delivery'})}><Truck size={20}/> توصيل للمنزل {customer.service==='delivery'&&<Check size={16}/>}</button>}
            </div>
            {customer.service==='delivery'&&restaurant.deliveryEnabled&&<label className="block-label">عنوان التوصيل <textarea rows={2} value={customer.address} onChange={e=>setCustomer({...customer,address:e.target.value})} placeholder="المدينة، الحي، الشارع، رقم المبنى"/></label>}
            <h3 className="form-subheading">طريقة الدفع</h3><div className="choice-grid">
              <button className={customer.payment==='cash'?'choice selected':'choice'} onClick={()=>setCustomer({...customer,payment:'cash'})}><Wallet size={20}/> نقدًا {customer.payment==='cash'&&<Check size={16}/>}</button>
              <button className={customer.payment==='visa'?'choice selected':'choice'} onClick={()=>setCustomer({...customer,payment:'visa'})}><CreditCard size={20}/> فيزا عند الاستلام {customer.payment==='visa'&&<Check size={16}/>}</button>
            </div>
            <label className="block-label">ملاحظات إضافية <textarea rows={2} value={customer.notes} onChange={e=>setCustomer({...customer,notes:e.target.value})} placeholder="ملاحظات أو تعليمات خاصة (اختياري)"/></label>
          </section>
        </div>
        <aside className="white-panel checkout-summary"><h2>ملخص الطلب</h2>
          <label>هل لديك كود خصم؟<div className="promo-input"><input value={customer.promo} onChange={e=>setCustomer({...customer,promo:e.target.value})} placeholder="أدخل رمز الخصم"/>{selectedPromo&&<Check size={18}/>}</div></label>
          {customer.promo&&!selectedPromo&&<small className="hint">رمز الخصم غير متاح</small>}
          <div className="sum-line"><span>المجموع الفرعي</span><strong>{moneyLabel(subtotal)}</strong></div>
          {discount>0&&<div className="sum-line saving"><span>الخصم</span><strong>- {moneyLabel(discount)}</strong></div>}
          <div className="sum-line"><span>التوصيل</span><strong>{customer.service==='pickup'?'استلام':deliveryFee>0?moneyLabel(deliveryFee):'مجاني'}</strong></div>
          {customer.service==='delivery'&&restaurant.freeDeliveryMinimum>0&&<small className="hint">توصيل مجاني للطلبات من {moneyLabel(restaurant.freeDeliveryMinimum)}</small>}
          <div className="sum-line sum-total"><span>الإجمالي</span><strong>{moneyLabel(total)}</strong></div>
          <button className="btn primary checkout-button" disabled={placing||!customer.customerName.trim()||!customer.phone.trim()||(customer.service==='delivery'&&!customer.address.trim())||(!!customer.promo&&!selectedPromo)} onClick={send}><MessageCircle size={20}/>{placing?'جارٍ حفظ الطلب...':'إرسال الطلب عبر واتساب'}</button>
          <p className="hint">سيتم تسجيل طلبك ثم فتح واتساب لإرساله إلى المطعم. لا يتم تحصيل المدفوعات عبر الموقع.</p>
          {orderError&&<p role="alert" className="form-error">{orderError}</p>}{orderSuccess&&<p className="form-success">{orderSuccess}</p>}
        </aside></div>}
      </div>}
      {page==='contact'&&<div className="container page-container"><Contact/></div>}
    </main>
    <footer className="site-footer"><div className="container footer-inner"><div className="footer-brand"><img src={restaurant.logoUrl||'/logo.webp'} alt="الشعار"/><span>{restaurant.name}</span></div><p>نعتز بوجودكم معنا، ونتشرف بخدمتكم دائمًا.</p><p>© {new Date().getFullYear()} {restaurant.name} — جميع الحقوق محفوظة</p></div></footer>
    {cartCount>0&&page!=='cart'&&<button className="floating-cart" onClick={()=>go('/cart')}><span><ShoppingBag size={20}/> عرض السلة ({cartCount})</span><strong>{moneyLabel(subtotal)}</strong><ArrowLeft size={18}/></button>}
  </div>;
}
export default App;
