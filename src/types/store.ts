export type PaymentMethod = 'cash' | 'visa';
export type ServiceMethod = 'delivery' | 'pickup';
export type OrderStatus = 'pending' | 'preparing' | 'delivered' | 'cancelled';
export interface Product {
  id:string; categoryId:string; name:string; description:string; basePrice:number;
  offerPrice?:number; offerEnabled?:boolean; imageUrl:string; isAvailable:boolean; displayOrder:number;
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
export interface CartLine {productId:string;quantity:number}
export interface Order {
  id:string;createdAt:string;updatedAt?:string; customerName:string;phone:string;address:string;
  service:ServiceMethod;payment:PaymentMethod;notes:string;promo:string;
  items:Array<{productId:string;name:string;quantity:number;unitPrice:number;total:number}>;
  subtotal:number;discount:number;deliveryFee:number;total:number;status:OrderStatus;
}
export const priceOf=(p:Product)=>p.offerEnabled && Number(p.offerPrice)>=0 && Number(p.offerPrice)<p.basePrice ? Number(p.offerPrice):p.basePrice;
export const money=(n:number)=>new Intl.NumberFormat('ar-SA',{minimumFractionDigits:0,maximumFractionDigits:2}).format(n)+' ر.س';
export const moneyLabel=(n:number)=>new Intl.NumberFormat('ar-SA',{minimumFractionDigits:0,maximumFractionDigits:2}).format(n)+' ر.س';
export const slug=(s:string)=>s.trim().replace(/\s+/g,'-').replace(/[^\p{L}\p{N}-]/gu,'').toLowerCase();
export const linkToProduct=(p:Product)=>'/product/'+encodeURIComponent(slug(p.name))+'--'+encodeURIComponent(p.id);
export const linkToCategory=(c:ProductCategory)=>'/category/'+encodeURIComponent(slug(c.name))+'--'+encodeURIComponent(c.id);
