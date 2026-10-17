export type PaymentMethod = 'cash' | 'visa';
export type ServiceMethod = 'delivery' | 'pickup';
export type OrderStatus = 'pending' | 'preparing' | 'delivered' | 'cancelled';
export interface ProductVariant {
  id:string; name:string; imageUrl?:string; price?:number|null;
  offerEnabled?:boolean; offerPrice?:number|null;
}
export interface Product {
  id:string; categoryId:string; name:string; description:string; basePrice:number;
  offerPrice?:number; offerEnabled?:boolean; imageUrl:string; isAvailable:boolean; displayOrder:number;
  variants?:ProductVariant[];
}
export interface ProductCategory {id:string;name:string;description?:string;displayOrder:number;isActive:boolean}
export interface Promo {id:string;code:string;type:'percent'|'fixed';value:number;enabled:boolean}
export interface Slide {id:string;imageUrl:string;title:string;description:string;enabled:boolean}
export interface Restaurant {
  name:string;tagline:string;currency:'SAR';currencySymbol:string;locale:'ar-SA';logoUrl:string;faviconUrl:string;
  whatsapp:string;phone:string;address:string;hours:string;mapEmbedUrl:string;googleFontUrl:string;
  deliveryEnabled:boolean;deliveryFee:number;freeDeliveryMinimum:number;
  social:{facebook:string;instagram:string;tiktok:string;snapchat:string};
}
export interface StoreData {restaurant:Restaurant; categories:ProductCategory[];items:Product[];promos:Promo[];slides:Slide[]}
export interface ProductReview {
  id:string;productId:string;name:string;rating:number;comment:string;createdAt:string;updatedAt?:string;approved?:boolean;
}
export interface RatingSummary {average:number;count:number}
export type PriceOrder='asc'|'desc';
export function sortByPrice<T extends Product>(products:T[],direction:PriceOrder='asc'):T[]{
  return [...products].sort((a,b)=>(priceOf(a)-priceOf(b))*(direction==='asc'?1:-1)||a.name.localeCompare(b.name,'ar'));
}
export function orderDisplay(count:number){return count>100?'+100':String(Math.max(0,count));}
export interface CartLine {productId:string;variantId?:string;quantity:number}
export interface Order {
  id:string;createdAt:string;updatedAt?:string; customerName:string;phone:string;address:string;
  service:ServiceMethod;payment:PaymentMethod;notes:string;promo:string;
  items:Array<{productId:string;variantId?:string;variantName?:string;name:string;quantity:number;unitPrice:number;total:number}>;
  subtotal:number;discount:number;deliveryFee:number;total:number;status:OrderStatus;
}
/** Variant price may be inherited, overridden, or independently discounted. */
const validDiscount=(regular:number,discount:unknown,enabled:unknown)=>
  enabled===true && discount!==null && discount!==undefined &&
  typeof discount==='number' && Number.isFinite(discount) && discount>=0 && discount<regular;
export const variantsOf=(product:Product):ProductVariant[]=>
  Array.isArray(product.variants)?product.variants:[];
export const basePriceOf=(p:Product)=>validDiscount(p.basePrice,p.offerPrice,p.offerEnabled)?p.offerPrice!:p.basePrice;
export function variantPriceInfo(product:Product,variant?:ProductVariant){
  if(!variant)return {original:product.basePrice,price:basePriceOf(product),discounted:basePriceOf(product)<product.basePrice};
  const inheritsPrice=variant.price===undefined||variant.price===null;
  const original=inheritsPrice?product.basePrice:variant.price!;
  const fallback=inheritsPrice?basePriceOf(product):original;
  const price=validDiscount(original,variant.offerPrice,variant.offerEnabled)?variant.offerPrice!:fallback;
  return {original,price,discounted:price<original};
}
export function displayVariantInfo(p:Product){
  const variants=variantsOf(p);
  if(!variants.length)return {...variantPriceInfo(p),variant:undefined as ProductVariant|undefined};
  return variants.map(variant=>({...variantPriceInfo(p,variant),variant}))
    .sort((a,b)=>b.price-a.price)[0];
}
export const priceOf=(p:Product)=>displayVariantInfo(p).price;
export const hasProductOffer=(p:Product)=>variantsOf(p).length
  ? variantsOf(p).some(v=>variantPriceInfo(p,v).discounted)
  : variantPriceInfo(p).discounted;
export function resolvedCartLine(product:Product,variantId?:string) {
  const variants=variantsOf(product);
  if(!variants.length){
    if(variantId)throw new Error('لا يحتوي هذا المنتج على خيار بهذه المواصفات');
    return {...variantPriceInfo(product),variantId:undefined,variantName:'',imageUrl:product.imageUrl};
  }
  if(!variantId)throw new Error('يرجى اختيار أحد خيارات المنتج');
  const variant=variants.find(v=>v.id===variantId);
  if(!variant)throw new Error('الخيار المحدد غير متوفر لهذا المنتج');
  return {...variantPriceInfo(product,variant),variantId:variant.id,variantName:variant.name,imageUrl:variant.imageUrl||product.imageUrl};
}
export const productWithVariantName=(productName:string,variantName?:string)=>
  variantName?productName+' ('+variantName+')':productName;
export const cartLineKey=(line:Pick<CartLine,'productId'|'variantId'>)=>
  line.productId+'::'+(line.variantId||'');
export const money=(n:number)=>new Intl.NumberFormat('ar-SA',{minimumFractionDigits:0,maximumFractionDigits:2}).format(n)+' ر.س';
export const moneyLabel=(n:number)=>new Intl.NumberFormat('ar-SA',{minimumFractionDigits:0,maximumFractionDigits:2}).format(n)+' ر.س';
export const slug=(s:string)=>s.trim().replace(/\s+/g,'-').replace(/[^\p{L}\p{N}-]/gu,'').toLowerCase();
export const linkToProduct=(p:Product)=>'/product/'+encodeURIComponent(slug(p.name))+'--'+encodeURIComponent(p.id);
export const linkToCategory=(c:ProductCategory)=>'/category/'+encodeURIComponent(slug(c.name))+'--'+encodeURIComponent(c.id);
