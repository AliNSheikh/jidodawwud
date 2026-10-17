import assert from 'node:assert/strict';
import {groupProductsByCategory,duplicateProduct} from '../src/utils/adminProducts';
import type {Product,ProductCategory} from '../src/types/store';

const categories:ProductCategory[]=[
 {id:'drinks',name:'المشروبات',displayOrder:3,isActive:true},
 {id:'starters',name:'المقبلات',displayOrder:1,isActive:true},
 {id:'mains',name:'الأطباق الرئيسية',displayOrder:2,isActive:true}
];
const products:Product[]=[
 {id:'potato',categoryId:'starters',name:'بطاطا',description:'بطاطا مقرمشة',basePrice:11,offerPrice:8,offerEnabled:true,imageUrl:'/potato.webp',isAvailable:true,displayOrder:2},
 {id:'kibbeh',categoryId:'starters',name:'كبة',description:'كبة دجاج',basePrice:7,imageUrl:'/kibbeh.webp',isAvailable:true,displayOrder:1},
 {id:'cola',categoryId:'drinks',name:'كولا',description:'مشروب بارد',basePrice:5,imageUrl:'/cola.webp',isAvailable:true,displayOrder:0},
 {id:'orphan',categoryId:'missing-category',name:'منتج غير مصنف',description:'وصف',basePrice:2,imageUrl:'',isAvailable:false,displayOrder:0}
];
const groups=groupProductsByCategory(categories,products);
assert.deepEqual(groups.map(x=>x.title),['المقبلات','الأطباق الرئيسية','المشروبات','بدون قسم']);
assert.deepEqual(groups[0].products.map(x=>x.id),['kibbeh','potato']);
assert.equal(groups[1].products.length,0);
assert.equal(groups[3].products[0].id,'orphan');
assert.deepEqual(groupProductsByCategory(categories,products,'كبة').map(g=>g.id),['starters']);
assert.deepEqual(groupProductsByCategory(categories,products,'مقرمشة').map(g=>g.id),['starters']);
assert.deepEqual(groupProductsByCategory(categories,products,'','drinks').map(g=>g.id),['drinks']);
assert.deepEqual(groupProductsByCategory(categories,products,'','uncategorized').map(g=>g.id),['uncategorized']);
assert.equal(groupProductsByCategory(categories,products,'no matching product').length,0);
assert.deepEqual(categories.map(x=>x.id),['drinks','starters','mains'],'grouping must not reorder saved categories');
assert.deepEqual(products.map(x=>x.id),['potato','kibbeh','cola','orphan'],'grouping must not mutate products');

const copied=duplicateProduct(products[0],'new-independent-id');
assert.notEqual(copied.id,products[0].id);
assert.equal(copied.categoryId,products[0].categoryId);
assert.equal(copied.imageUrl,products[0].imageUrl);
assert.equal(copied.basePrice,products[0].basePrice);
assert.equal(copied.offerPrice,products[0].offerPrice);
assert.equal(copied.offerEnabled,products[0].offerEnabled);
assert.equal(copied.description,products[0].description);
assert.equal(copied.name,'بطاطا (نسخة)');
assert.equal(copied.isAvailable,false,'copies must be unpublished before editing');
assert.equal(copied.displayOrder,3);
copied.name='منتج جديد';copied.imageUrl='/different.webp';copied.basePrice=15;
assert.equal(products[0].name,'بطاطا','edits to copies must not alter the original');
assert.equal(products[0].imageUrl,'/potato.webp');
assert.equal(products[0].basePrice,11);
assert.throws(()=>duplicateProduct(products[0],products[0].id),'copy must receive a new identity');
console.log('Admin category grouping and safe independent product duplication passed');
