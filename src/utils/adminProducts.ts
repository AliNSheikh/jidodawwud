import type {Product,ProductCategory} from '../types/store';

export type AdminProductGroup = {
  id:string;
  title:string;
  products:Product[];
  knownCategory:boolean;
};

/**
 * Keep categories in their configured order; place products under the matching
 * category and preserve unattached products in a visible "Uncategorized" group.
 * Never mutate the live menu arrays.
 */
export function groupProductsByCategory(
  categories:ProductCategory[],
  products:Product[],
  search='',
  categoryFilter='all'
):AdminProductGroup[] {
  const query=search.trim().toLocaleLowerCase();
  const matches=products.filter(p=>
    !query || [p.name,p.description].some(value=>String(value||'').toLocaleLowerCase().includes(query))
  );
  const ordered=[...categories].sort((a,b)=>a.displayOrder-b.displayOrder||a.name.localeCompare(b.name,'ar'));
  const sortProducts=(arr:Product[])=>[...arr].sort((a,b)=>a.displayOrder-b.displayOrder||a.name.localeCompare(b.name,'ar'));
  const sections:AdminProductGroup[]=ordered
    .filter(c=>categoryFilter==='all'||categoryFilter===c.id)
    .map(c=>({
      id:c.id,
      title:c.name,
      products:sortProducts(matches.filter(p=>p.categoryId===c.id)),
      knownCategory:true
    }))
    .filter(group=>!query||group.products.length>0);

  const known=new Set(categories.map(c=>c.id));
  const uncategorized=sortProducts(matches.filter(p=>!known.has(p.categoryId)));
  if((categoryFilter==='all'||categoryFilter==='uncategorized')&&
     (uncategorized.length>0||categoryFilter==='uncategorized')) {
    sections.push({id:'uncategorized',title:'بدون قسم',products:uncategorized,knownCategory:false});
  }
  return sections;
}

/** The copy has its own identity and cannot inherit the source's order/reviews.
 *  Leave it unpublished until the admin finishes editing it and saves.
 */
export function duplicateProduct(source:Product,newId:string):Product {
  if(!newId || newId===source.id)throw new Error('يجب أن تكون للنسخة هوية جديدة');
  return {
    ...source,
    id:newId,
    name:(source.name.trim()||'منتج')+' (نسخة)',
    isAvailable:false,
    displayOrder:(Number.isFinite(source.displayOrder)?source.displayOrder:0)+1
  };
}
