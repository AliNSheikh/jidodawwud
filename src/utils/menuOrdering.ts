import type {Product,ProductCategory} from '../types/store';
import {sortByPrice} from '../types/store';

type OrderedItem={id:string;displayOrder:number};
function sorted<T extends OrderedItem>(items:T[]):T[]{
  // Stable for legacy menu data with duplicate or missing positions.
  return [...items].sort((a,b)=>(Number.isFinite(a.displayOrder)?a.displayOrder:0)-(Number.isFinite(b.displayOrder)?b.displayOrder:0));
}
function move<T extends OrderedItem>(items:T[],activeId:string,overId:string):T[]{
  const from=items.findIndex(item=>item.id===activeId),to=items.findIndex(item=>item.id===overId);
  if(from<0||to<0||from===to)return items;
  const result=[...items];
  result.splice(to,0,...result.splice(from,1));
  return result;
}
/** Drag order becomes the saved order, with continuous numeric positions. */
export function reorderCategories(categories:ProductCategory[],activeId:string,overId:string):ProductCategory[]{
  const ordered=sorted(categories);
  const changed=move(ordered,activeId,overId);
  return changed===ordered?categories:changed.map((c,i)=>({...c,displayOrder:i}));
}
/** Dragging items never moves a product into a different category. */
export function reorderWithinCategory(products:Product[],categoryId:string,activeId:string,overId:string):Product[]{
  const inside=sorted(products.filter(p=>p.categoryId===categoryId));
  const changed=move(inside,activeId,overId);
  if(changed===inside)return products;
  const ranks=new Map(changed.map((product,index)=>[product.id,index]));
  return products.map(product=>ranks.has(product.id)?{...product,displayOrder:ranks.get(product.id)!}:product);
}
export function orderedCategories(categories:ProductCategory[]):ProductCategory[]{return sorted(categories);}
export function orderedProducts(products:Product[]):Product[]{return sorted(products);}

export type MenuSort='manual'|'asc'|'desc';
export function productsForMenu(products:Product[],sort:MenuSort='manual'):Product[]{
  return sort==='manual'?orderedProducts(products):sortByPrice(products,sort);
}
