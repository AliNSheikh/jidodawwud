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
 product('main','dishes',0,30,'https://raw.githubusercontent.com/example/repo/main/1.webp'),
 product('second','starters',1,5,'https://raw.githubusercontent.com/example/repo/main/2.webp'),
 product('first','starters',0,10,''),
 product('orphan','unknown',0,15,'https://raw.githubusercontent.com/example/repo/main/3.webp')
];
items[0].variants=[{id:'large',name:'كبير',price:40}];
const rows=exportRows(cats,items);
assert.deepEqual(rows.map(x=>x.productId),['first','second','main','orphan']);
assert.deepEqual(rows.map(x=>x.category),['المقبلات','المقبلات','الأطباق الرئيسية','بدون قسم']);
assert.deepEqual(rows.map(x=>x.price),[10,5,40,15]);
assert.equal(rows[2].imageUrl,items[0].imageUrl);
assert.equal(pictureLink('https://images.example.com/photo.webp'),'https://images.example.com/photo.webp');
assert.equal(pictureLink('javascript:alert(1)'),'');
assert.equal(pictureLink(''),'');

const ws=XLSX.utils.aoa_to_sheet([
 ['صورة المنتج','القسم','اسم المنتج','السعر (ر.س)'],
 ...rows.map(p=>[p.imageUrl?'الصورة مرفقة':'لا توجد صورة',p.category,p.name,p.price])
]);
ws['!cols']=[{wpx:146},{wpx:210},{wpx:310},{wpx:145}];
ws['!rows']=[{hpx:35},...rows.map(()=>({hpx:134}))];
const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'المنتجات');
const plain=new Uint8Array(XLSX.write(wb,{type:'array',bookType:'xlsx'}));
const pixels=new Uint8Array([255,216,255,224,0,16,74,70,73,70,0,255,217]); // Sample JPEG markers, archive contract only
const enriched=await attachImagesToXlsx(plain,[
 {rowIndex:2,bytes:pixels},
 {rowIndex:3,bytes:pixels}
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
assert.match(drawing,/r:embed="rIdImage1"/);
assert.match(drawing,/r:embed="rIdImage2"/);
assert.match(drawingRels,/Target="\.\.\/media\/product-1\.jpeg"/);
assert.match(contentType,/Extension="jpeg"/);
assert.match(contentType,/PartName="\/xl\/drawings\/drawing1\.xml"/);
assert.deepEqual(await zip.file('xl/media/product-1.jpeg')?.async('uint8array'),pixels);
assert.deepEqual(await zip.file('xl/media/product-2.jpeg')?.async('uint8array'),pixels);
assert.equal((await attachImagesToXlsx(plain,[])).length,plain.length,'image-free Excel should work');
const after=XLSX.read(enriched,{type:'array'});
const extracted=XLSX.utils.sheet_to_json<any[]>(after.Sheets['المنتجات'],{header:1,raw:true});
assert.equal(extracted[0][0],'صورة المنتج');
assert.deepEqual(extracted.slice(1).map(r=>r[3]),[10,5,40,15]);
assert.deepEqual(extracted.slice(1).map(r=>r[1]),['المقبلات','المقبلات','الأطباق الرئيسية','بدون قسم']);
console.log('PASS: product export order, categories, prices, JPEG media parts, drawing relationships and readable XLSX');
