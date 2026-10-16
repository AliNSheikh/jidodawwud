import type {StoreData} from '../types/store';

/** Extract a stable product/category ID even from an Arabic, percent-encoded share URL. */
export function routeId(path:string,prefix:'/product/'|'/category/'):string|null {
  if(!path.startsWith(prefix))return null;
  try {
    const segment=path.slice(prefix.length).split(/[/?#]/)[0];
    const marker=segment.lastIndexOf('--');
    if(marker<0||marker===segment.length-2)return null;
    const id=decodeURIComponent(segment.slice(marker+2));
    return id&&id.length<=160?id:null;
  }catch {return null;}
}

export function validMenu(data:any):data is StoreData {
  return !!data&&typeof data==='object'&&
    !!data.restaurant&&typeof data.restaurant.name==='string'&&
    Array.isArray(data.categories)&&Array.isArray(data.items)&&
    Array.isArray(data.promos)&&Array.isArray(data.slides);
}
export const MENU_CACHE_KEY='jido-menu-public-v2';

/** Prefer fresh locally cached public menu data; never block product URLs on a slow API. */
export function initialMenu(fallback:StoreData,storage?:Pick<Storage,'getItem'>):StoreData {
  if(!storage)return fallback;
  try {
    const saved=JSON.parse(storage.getItem(MENU_CACHE_KEY)||'null');
    if(saved && Number(saved.time)>Date.now()-24*60*60*1000 && validMenu(saved.menu))return saved.menu;
  }catch {}
  return fallback;
}
export function persistMenu(data:StoreData,storage?:Pick<Storage,'setItem'>) {
  if(!storage)return;
  try{storage.setItem(MENU_CACHE_KEY,JSON.stringify({time:Date.now(),menu:data}));}
  catch{/* Private mode/storage disabled: bundled menu still works. */}
}

/** Stop long smooth-scroll animations from leaving a short product page off-screen. */
export function scrollToPageTop() {
  if(typeof window==='undefined'||typeof document==='undefined')return;
  const root=document.documentElement;
  const previous=root.style.scrollBehavior;
  root.style.scrollBehavior='auto';
  root.scrollTop=0;
  document.body.scrollTop=0;
  window.scrollTo(0,0);
  window.requestAnimationFrame(()=>{
    root.scrollTop=0;
    document.body.scrollTop=0;
    window.scrollTo(0,0);
    root.style.scrollBehavior=previous;
  });
}
