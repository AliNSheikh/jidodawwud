import assert from 'node:assert/strict';
import menu from '../data/menu.json';
import {linkToProduct,linkToCategory} from '../src/types/store';
import {initialMenu,persistMenu,routeId,scrollToPageTop,validMenu,MENU_CACHE_KEY} from '../src/utils/productNavigation';

function run() {
  assert.ok(validMenu(menu),'bundled menu must render when GitHub API is slow');
  for(const product of menu.items) {
    const link=linkToProduct(product);
    assert.equal(routeId(link,'/product/'),product.id, 'product share links must always resolve');
    assert.equal(routeId(new URL(link,'https://example.com').pathname,'/product/'),product.id);
  }
  for(const category of menu.categories){
    assert.equal(routeId(linkToCategory(category),'/category/'),category.id);
  }
  assert.equal(routeId('/product/%E0%A4%A--broken%','/product/'),null);
  assert.equal(routeId('/product/unrelated','/product/'),null);
  assert.equal(routeId('/','/product/'),null);
  const mem=new Map<string,string>();
  const storage={getItem:(key:string)=>mem.get(key)||null,setItem:(key:string,value:string)=>{mem.set(key,value);}};
  assert.equal(initialMenu(menu,storage).items.length,menu.items.length);
  const revised={...menu,items:[{...menu.items[0],name:'منتج حديث'}]};
  persistMenu(revised as typeof menu,storage);
  assert.equal(initialMenu(menu,storage).items[0]?.name,'منتج حديث','recent edits should work on shared product URL');
  mem.set(MENU_CACHE_KEY,'invalid json');
  assert.equal(initialMenu(menu,storage).items.length,menu.items.length,'corrupted mobile cache should not blank product pages');
  const originalWindow=(globalThis as any).window;
  const originalDocument=(globalThis as any).document;
  let scrolled=0,frame=0;
  (globalThis as any).window={scrollTo:()=>scrolled++,requestAnimationFrame:(cb:any)=>{frame++;cb();}};
  (globalThis as any).document={documentElement:{style:{scrollBehavior:'smooth'},scrollTop:500},body:{scrollTop:500}};
  try{
    scrollToPageTop();
    assert.equal((globalThis as any).document.documentElement.scrollTop,0);
    assert.equal((globalThis as any).document.body.scrollTop,0);
    assert.equal((globalThis as any).document.documentElement.style.scrollBehavior,'smooth');
    assert.equal(scrolled,2);
    assert.equal(frame,1);
  }finally{
    if(originalWindow===undefined)delete (globalThis as any).window;
    else (globalThis as any).window=originalWindow;
    if(originalDocument===undefined)delete (globalThis as any).document;
    else (globalThis as any).document=originalDocument;
  }
  console.log('Product navigation: all Arabic deep links, cached menu fallback and instant mobile scroll pass');
}
run();
