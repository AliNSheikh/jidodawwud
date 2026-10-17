import assert from 'node:assert/strict';
import type {Product,ProductCategory} from '../src/types/store';
import {orderedCategories,orderedProducts,productsForMenu,reorderCategories,reorderWithinCategory} from '../src/utils/menuOrdering';
import {groupProductsByCategory} from '../src/utils/adminProducts';
const cats:ProductCategory[]=[
  {id:'hot',name:'الساخن',description:'',displayOrder:2,isActive:true},
  {id:'cold',name:'البارد',description:'',displayOrder:0,isActive:true},
  {id:'sides',name:'المقبلات',description:'',displayOrder:1,isActive:true}
];
const row=(id:string,categoryId:string,displayOrder:number,basePrice:number):Product=>({
  id,name:id,categoryId,basePrice,displayOrder,description:'',imageUrl:'',isAvailable:true
});
const products=[
  row('hot1','hot',1,99),row('cold2','cold',1,10),row('side1','sides',0,40),
  row('cold1','cold',0,90),row('hot2','hot',0,20),row('cold3','cold',2,5),
];
assert.deepEqual(orderedCategories(cats).map(c=>c.id),['cold','sides','hot']);
let nextCats=reorderCategories(cats,'hot','cold');
assert.deepEqual(orderedCategories(nextCats).map(c=>c.id),['hot','cold','sides']);
assert.deepEqual(nextCats.map(c=>c.displayOrder),[0,1,2]);
assert.deepEqual(cats.map(c=>c.displayOrder),[2,0,1],'original categories never mutate');
nextCats=reorderCategories(nextCats,'sides','hot');
assert.deepEqual(nextCats.map(c=>c.id),['sides','hot','cold']);
assert.strictEqual(reorderCategories(cats,'missing','hot'),cats,'invalid drag must be ignored');
assert.strictEqual(reorderCategories(cats,'hot','hot'),cats,'same-target drag must be ignored');
let after=reorderWithinCategory(products,'cold','cold3','cold1');
assert.deepEqual(orderedProducts(after.filter(p=>p.categoryId==='cold')).map(p=>p.id),['cold3','cold1','cold2']);
assert.deepEqual(orderedProducts(after.filter(p=>p.categoryId==='hot')).map(p=>p.id),['hot2','hot1']);
assert.deepEqual(orderedProducts(after.filter(p=>p.categoryId==='sides')).map(p=>p.id),['side1']);
assert.deepEqual(orderedProducts(after.filter(p=>p.categoryId==='cold')).map(p=>p.displayOrder),[0,1,2]);
assert.equal(products.find(p=>p.id==='cold3')!.displayOrder,2,'original products never mutate');
assert.strictEqual(reorderWithinCategory(products,'cold','cold3','hot1'),products,'cannot drag across categories');
assert.strictEqual(reorderWithinCategory(products,'cold','cold1','cold1'),products,'same-row drag is ignored');
assert.deepEqual(groupProductsByCategory(nextCats,after).map(g=>g.id),['sides','hot','cold']);
assert.deepEqual(groupProductsByCategory(nextCats,after).find(g=>g.id==='cold')!.products.map(p=>p.id),['cold3','cold1','cold2']);
assert.deepEqual(productsForMenu(after.filter(p=>p.categoryId==='cold')).map(p=>p.id),['cold3','cold1','cold2'],
  'menu default follows saved drag-and-drop order');
assert.deepEqual(productsForMenu(after.filter(p=>p.categoryId==='cold'),'asc').map(p=>p.id),['cold3','cold2','cold1'],
  'optional ascending price sorting remains available');
assert.deepEqual(productsForMenu(after.filter(p=>p.categoryId==='cold'),'desc').map(p=>p.id),['cold1','cold2','cold3'],
  'optional descending price sorting remains available');
const tied=[row('first','hot',0,9),row('second','hot',0,3)];
assert.deepEqual(orderedProducts(tied).map(p=>p.id),['first','second'],
  'legacy equal displayOrder values retain data order');
console.log('PASS: category and product drag positions, isolation, homepage order and optional price sorting.');
