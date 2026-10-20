import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {
  headerIndexes,parsePrice,validateExcelRows,findLocalImage,
  validImageURL,parseExcel,sameText
} from '../src/utils/productExcel';
import type {Product,ProductCategory} from '../src/types/store';

assert.deepEqual(headerIndexes(['صورة المنتج','القسم','اسم المنتج','السعر']),[0,1,2,3]);
assert.deepEqual(headerIndexes(['Price','Product Name','Image URL','Category']),[2,3,1,0]);
assert.deepEqual(headerIndexes(['السعر','القسم','المنتج']),null);
assert.equal(parsePrice('٢٥٫٥٠'),25.5);
assert.equal(parsePrice('1,200'),1200);
assert.equal(parsePrice('15.50 ر.س'),15.5);
assert.equal(parsePrice(0),0);
assert.equal(parsePrice('-3'),null);
assert.equal(parsePrice('25abc'),null);
assert.equal(parsePrice(''),null);
assert.equal(sameText('شَاوَرْمَا','شاورما'),true);
assert.equal(validImageURL('https://images.example.com/food.webp'),true);
assert.equal(validImageURL('http://example.com/image.png'),false);
assert.equal(validImageURL('javascript:alert(1)'),false);
assert.equal(validImageURL('https://user:password@example.com/pic.jpg'),false);
const categories:ProductCategory[]=[
  {id:'main',name:'الأطباق الرئيسية',displayOrder:0,isActive:true}
];
const products:Product[]=[{
  id:'prior',name:'برجر دجاج',description:'',categoryId:'main',
  imageUrl:'/burger.webp',displayOrder:0,basePrice:25,isAvailable:true
}];
const mk=(row:number,category:string,name:string,image='food.jpg',price=25)=>
  ({row,category,name,image,price});
assert.deepEqual(validateExcelRows([mk(2,'الأطباق الرئيسية','بطاطا')],categories,products),[]);
assert.ok(validateExcelRows([mk(2,'الأطباق الرئيسية','برجر دجاج')],categories,products)[0].includes('مكرر'));
assert.ok(validateExcelRows([mk(2,'المقبلات','فلافل','')],categories,products)[0].includes('صورة'));
assert.ok(validateExcelRows([mk(2,'المقبلات','فلافل','x.jpg',Number.NaN)],categories,products)[0].includes('السعر'));
assert.ok(validateExcelRows([mk(2,'جديد','فلافل'),mk(3,'جديد','فلافل')],categories,products)[0].includes('مكرر'));
assert.ok(findLocalImage('folder/food.jpg',[new File(['x'],'FOOD.JPG',{type:'image/jpeg'})]));
assert.equal(findLocalImage('missing.jpg',[new File(['x'],'food.jpg',{type:'image/jpeg'})]),undefined);

const wb=XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
  ['صورة المنتج','القسم','اسم المنتج','السعر'],
  ['https://images.example.com/food.webp','المقبلات','بطاطا','١٢٫٥٠'],
  ['burger.jpg','الأطباق الرئيسية','برجر جديد',39]
]),'المنتجات');
const bytes=XLSX.write(wb,{bookType:'xlsx',type:'array'});
const file=new File([bytes],'products.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
const rows=await parseExcel(file);
assert.equal(rows.length,2);
assert.deepEqual(rows.map(r=>r.row),[2,3]);
assert.deepEqual(rows.map(r=>r.price),[12.5,39]);
assert.deepEqual(rows.map(r=>r.category),['المقبلات','الأطباق الرئيسية']);
assert.equal(rows[1].image,'burger.jpg');
assert.deepEqual(validateExcelRows(rows,categories,products),[]);
console.log('PASS: Arabic/English Excel columns, Arabic price formatting, local images, row parsing, duplicates and append validation.');
