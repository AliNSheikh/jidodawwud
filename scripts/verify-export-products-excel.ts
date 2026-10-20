import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import type {Product,ProductCategory} from '../src/types/store';
import {exportRows,pictureLink,attachImagesToXlsx} from '../src/utils/exportProductsExcel';

const cats:ProductCategory[]=[
  {id:'dishes',name:'الأطباق الرئيسية',displayOrder:2,isActive:true},
  {id:'starters',name:'المقبلات',displayOrder:1,isActive:true}
];
const product=(id:string,categoryId:string,order:number,price:number,imageUrl:string):Product=>({
  id,categoryId,displayOrder:order,name:'منتج '+id,basePrice:price,
  description:'',offerEnabled:false,imageUrl,isAvailable:true
});
const items:Product[]=[
  product('main','dishes',0,30,'https://raw.githubusercontent.com/example/repo/main/base.webp'),
  product('second','starters',1,5,'https://raw.githubusercontent.com/example/repo/main/2.webp'),
  product('first','starters',0,10,''),
  product('orphan','unknown',0,15,'https://raw.githubusercontent.com/example/repo/main/3.webp')
];
items[0].offerEnabled=true;
items[0].offerPrice=25;
items[0].variants=[
  {id:'large',name:'كبير',price:40,offerEnabled:true,offerPrice:32,imageUrl:'https://example.com/large.webp'},
  {id:'inherited',name:'عادي',price:null},
  {id:'equal',name:'بنفس السعر',price:30}
];
items[2].isAvailable=false; // Even unavailable products must remain in export.

const rows=exportRows(cats,items);
assert.equal(rows.length,7,'export all 4 products plus 3 distinct variant rows');
assert.deepEqual(rows.map(x=>x.productId),
  ['first','second','main','main','main','main','orphan'],
  'category/product order must match admin arrangement, variants stay below their product');
assert.deepEqual(rows.map(x=>x.category),
  ['المقبلات','المقبلات','الأطباق الرئيسية','الأطباق الرئيسية',
   'الأطباق الرئيسية','الأطباق الرئيسية','بدون قسم']);
assert.deepEqual(rows.map(x=>x.variantName),[
  '—','—','—','كبير','عادي','بنفس السعر','—'
]);
assert.deepEqual(rows.map(x=>x.rowType),[
  'منتج بدون خيارات','منتج بدون خيارات','منتج أساسي (مرجع)',
  'خيار','خيار','خيار','منتج بدون خيارات'
]);
assert.deepEqual(rows.map(x=>x.basePrice),[10,5,30,30,30,30,15]);
assert.deepEqual(rows.map(x=>x.regularPrice),[10,5,30,40,30,30,15]);
assert.deepEqual(rows.map(x=>x.discount),[0,0,5,8,5,0,0]);
assert.deepEqual(rows.map(x=>x.price),[10,5,25,32,25,30,15]);
assert.deepEqual(rows.map(x=>x.priceSource),
  ['السعر الأساسي','السعر الأساسي','السعر الأساسي','سعر مستقل',
   'يرث سعر المنتج','سعر مستقل','السعر الأساسي']);
assert.equal(rows[3].imageUrl,'https://example.com/large.webp','variant-specific image');
assert.equal(rows[4].imageUrl,items[0].imageUrl,'fallback to base product image');
assert.equal(rows[5].imageUrl,items[0].imageUrl,'variant without image inherits product image');
assert.equal(rows[2].imageUrl,items[0].imageUrl);
assert.equal(pictureLink('https://images.example.com/photo.webp'),'https://images.example.com/photo.webp');
assert.equal(pictureLink('javascript:alert(1)'),'');
assert.equal(pictureLink(''),'');

// Build and verify the same 10-column structure used by the browser exporter.
const headings=[
  'صورة المنتج','القسم','اسم المنتج','الخيار / النوع','نوع السطر',
  'سعر المنتج الأساسي (ر.س)','سعر الخيار قبل الخصم (ر.س)',
  'قيمة الخصم (ر.س)','السعر النهائي (ر.س)','طريقة التسعير'
];
const ws=XLSX.utils.aoa_to_sheet([
  headings,
  ...rows.map(r=>[r.imageUrl?'الصورة مرفقة':'لا توجد صورة',
    r.category,r.name,r.variantName,r.rowType,r.basePrice,
    r.regularPrice,r.discount,r.price,r.priceSource])
]);
ws['!cols']=[
  {wpx:146},{wpx:170},{wpx:235},{wpx:150},{wpx:155},
  {wpx:170},{wpx:184},{wpx:132},{wpx:165},{wpx:145}
];
ws['!rows']=[{hpx:42},...rows.map(()=>({hpx:134}))];
ws['!autofilter']={ref:'A1:J'+(rows.length+1)};
const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'المنتجات');
const plain=new Uint8Array(XLSX.write(wb,{type:'array',bookType:'xlsx'}));
const pixels=new Uint8Array([255,216,255,224,0,16,74,70,73,70,0,255,217]);
// Drawings anchored to base-product + variant row, not product index.
const enriched=await attachImagesToXlsx(plain,[
  {rowIndex:2,bytes:pixels},
  {rowIndex:3,bytes:pixels},
  {rowIndex:4,bytes:pixels}
]);
const zip=await JSZip.loadAsync(enriched);
const text=async(path:string)=>zip.file(path)?.async('text')||'';
const sheet=await text('xl/worksheets/sheet1.xml');
const sheetRel=await text('xl/worksheets/_rels/sheet1.xml.rels');
const drawing=await text('xl/drawings/drawing1.xml');
const drawingRels=await text('xl/drawings/_rels/drawing1.xml.rels');
const contentType=await text('[Content_Types].xml');
assert.match(sheet,/<drawing r:id="rIdProductImages"\s*\/>/);
assert.match(sheetRel,/Target="\.\.\/drawings\/drawing1\.xml"/);
assert.match(drawing,/<xdr:row>2<\/xdr:row>/);
assert.match(drawing,/<xdr:row>3<\/xdr:row>/);
assert.match(drawing,/<xdr:row>4<\/xdr:row>/);
assert.match(drawing,/r:embed="rIdImage1"/);
assert.match(drawing,/r:embed="rIdImage2"/);
assert.match(drawingRels,/Target="\.\.\/media\/product-1\.jpeg"/);
assert.match(contentType,/Extension="jpeg"/);
assert.match(contentType,/PartName="\/xl\/drawings\/drawing1\.xml"/);
assert.deepEqual(await zip.file('xl/media/product-1.jpeg')?.async('uint8array'),pixels);
assert.deepEqual(await zip.file('xl/media/product-3.jpeg')?.async('uint8array'),pixels);
assert.equal((await attachImagesToXlsx(plain,[])).length,plain.length,'image-free Excel should work');
const after=XLSX.read(enriched,{type:'array'});
const extracted=XLSX.utils.sheet_to_json<any[]>(after.Sheets['المنتجات'],{header:1,raw:true});
assert.deepEqual(extracted[0],headings);
assert.equal(extracted.length,rows.length+1);
assert.deepEqual(extracted.slice(1).map(r=>r[3]),['—','—','—','كبير','عادي','بنفس السعر','—']);
assert.deepEqual(extracted.slice(1).map(r=>r[8]),[10,5,25,32,25,30,15]);
assert.deepEqual(extracted.slice(1).map(r=>r[7]),[0,0,5,8,5,0,0]);
console.log('PASS: all products + optional variants, inherited prices, own discounts, images, and readable XLSX');
