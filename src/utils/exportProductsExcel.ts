import type {Product,ProductCategory} from '../types/store';
import {basePriceOf,variantPriceInfo,variantsOf} from '../types/store';
import {orderedCategories,orderedProducts} from './menuOrdering';

export type ExcelExportRow={
  productId:string;
  variantId?:string;
  imageUrl:string;
  category:string;
  name:string;
  variantName:string;
  rowType:'منتج بدون خيارات'|'منتج أساسي (مرجع)'|'خيار';
  basePrice:number;
  regularPrice:number;
  discount:number;
  price:number;
  priceSource:'السعر الأساسي'|'يرث سعر المنتج'|'سعر مستقل';
};
export type ExcelImage={rowIndex:number;bytes:Uint8Array};
export type ExportResult={total:number;variants:number;rows:number;embedded:number;missing:number;lowResolution:number};

/** Include every product (including inactive ones) and a separate line for
 * EVERY variant in its saved order. Product base rows are reference-only
 * when variants exist, because customers must choose a specific variant.
 */
export function exportRows(categories:ProductCategory[],products:Product[]):ExcelExportRow[]{
  const ordered=orderedCategories(categories);
  const seen=new Set(ordered.map(c=>c.id));
  const includingOrphans=[...ordered.map(c=>({id:c.id,name:c.name})),{id:'__unclassified__',name:'بدون قسم'}];
  return includingOrphans.flatMap(category=>
    orderedProducts(products.filter(p=>category.id==='__unclassified__'?!seen.has(p.categoryId):p.categoryId===category.id))
      .flatMap(product=>{
        const variants=variantsOf(product);
        const basePrice=product.basePrice;
        const baseFinal=basePriceOf(product);
        const base:ExcelExportRow={
          productId:product.id,
          imageUrl:product.imageUrl||'',
          category:category.name,
          name:product.name,
          variantName:'—',
          rowType:variants.length?'منتج أساسي (مرجع)':'منتج بدون خيارات',
          basePrice,regularPrice:basePrice,
          discount:Math.max(0,Math.round((basePrice-baseFinal)*100)/100),
          price:baseFinal,
          priceSource:'السعر الأساسي'
        };
        const options:ExcelExportRow[]=variants.map(variant=>{
          const info=variantPriceInfo(product,variant);
          return {
            productId:product.id,variantId:variant.id,
            imageUrl:variant.imageUrl||product.imageUrl||'',
            category:category.name,name:product.name,
            variantName:variant.name||'خيار بدون اسم',
            rowType:'خيار',
            basePrice,regularPrice:info.original,
            discount:Math.max(0,Math.round((info.original-info.price)*100)/100),
            price:info.price,
            priceSource:variant.price==null?'يرث سعر المنتج':'سعر مستقل'
          };
        });
        return [base,...options];
      })
  );
}
export function pictureLink(url:string){
  if(!url)return '';
  try{
    const parsed=new URL(url,typeof window==='undefined'?'https://jidodawwud.vercel.app':window.location.origin);
    if(!['https:','http:'].includes(parsed.protocol))return '';
    return parsed.toString();
  }catch{return '';}
}
/** High-resolution JPEG payloads for in-sheet photos. The image is never
 * downloaded through a server-side proxy or uploaded back to GitHub. */
export async function jpegForWorkbook(url:string):Promise<{bytes:Uint8Array;lowResolution:boolean}>{
  const source=pictureLink(url);
  if(!source)throw Error('لا يوجد رابط صورة صالح');
  const response=await fetch(source,{method:'GET',mode:'cors',signal:AbortSignal.timeout(18000)});
  if(!response.ok)throw Error('فشل تنزيل الصورة (HTTP '+response.status+')');
  const blob=await response.blob();
  if(blob.size===0||blob.size>20*1024*1024)throw Error('حجم صورة غير مناسب');
  const blobUrl=URL.createObjectURL(blob);
  let image:HTMLImageElement;
  try{
    image=await new Promise<HTMLImageElement>((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(Error('تعذر معالجة الصورة'));
      img.src=blobUrl;
    });
    const width=image.naturalWidth,height=image.naturalHeight;
    if(!width||!height)throw Error('الصورة بلا أبعاد صالحة');
    const canvas=document.createElement('canvas');
    canvas.width=1024;canvas.height=1024;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw Error('المتصفح لا يدعم تحويل الصور');
    ctx.fillStyle='#fff';
    ctx.fillRect(0,0,1024,1024);
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality='high';
    const scale=Math.min(1024/width,1024/height);
    const w=width*scale,h=height*scale;
    ctx.drawImage(image,(1024-w)/2,(1024-h)/2,w,h);
    const data=canvas.toDataURL('image/jpeg',.93);
    const encoded=data.slice(data.indexOf(',')+1);
    const binary=atob(encoded);
    const bytes=new Uint8Array(binary.length);
    for(let n=0;n<binary.length;n++)bytes[n]=binary.charCodeAt(n);
    return {bytes,lowResolution:width<800||height<800};
  }finally{
    URL.revokeObjectURL(blobUrl);
  }
}

/** Enrich a standards-compliant SheetJS workbook with actual Excel pictures,
 * not just image links. Images use 1024x1024 JPEG encoded at 93% quality and
 * display inside 128px tall photo cells without losing their source pixels. */
export async function attachImagesToXlsx(file:Uint8Array,images:ExcelImage[]):Promise<Uint8Array>{
  if(!images.length)return file;
  const JSZip=(await import('jszip')).default;
  const zip=await JSZip.loadAsync(file);
  const sheet='xl/worksheets/sheet1.xml';
  const src=await zip.file(sheet)?.async('text');
  const ct=await zip.file('[Content_Types].xml')?.async('text');
  if(!src||!ct||!src.includes('</worksheet>'))throw Error('ملف Excel غير قابل لإضافة الصور');

  const relPath='xl/worksheets/_rels/sheet1.xml.rels';
  let sheetRels=(await zip.file(relPath)?.async('text'))||'';
  if(!sheetRels)sheetRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  const id='rIdProductImages';
  if(sheetRels.includes('Id="'+id+'"'))throw Error('تعذر إنشاء علاقة صور Excel');
  sheetRels=sheetRels.replace('</Relationships>',
    '<Relationship Id="'+id+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>');
  zip.file(relPath,sheetRels);

  let sheetSrc=src;
  const worksheetOpening=sheetSrc.match(/<worksheet\b[^>]*>/)?.[0]||'';
  if(!/xmlns:r=/.test(worksheetOpening)){
    sheetSrc=sheetSrc.replace(/<worksheet\b/,'<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"');
  }
  sheetSrc=sheetSrc.replace('</worksheet>','<drawing r:id="'+id+'"/></worksheet>');
  zip.file(sheet,sheetSrc);

  const scale=128*9525; // 128px display; full 1024px JPEG remains embedded.
  const drawing=images.map((image,index)=>{
    const n=index+1;
    // rowIndex is zero-based Excel worksheet row (header=0, first item=1).
    const imageRel='rIdImage'+n;
    return '<xdr:oneCellAnchor>'+
      '<xdr:from><xdr:col>0</xdr:col><xdr:colOff>38100</xdr:colOff><xdr:row>'+image.rowIndex+'</xdr:row><xdr:rowOff>38100</xdr:rowOff></xdr:from>'+
      '<xdr:ext cx="'+scale+'" cy="'+scale+'"/>'+
      '<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="'+n+'" name="صورة المنتج '+n+'"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>'+
      '<xdr:blipFill><a:blip r:embed="'+imageRel+'"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>'+
      '<xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic>'+
      '<xdr:clientData/></xdr:oneCellAnchor>';
  }).join('');
  zip.file('xl/drawings/drawing1.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" '+
    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '+
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'+
    drawing+'</xdr:wsDr>');
  const imageRels=images.map((_,index)=>{
    const n=index+1;
    return '<Relationship Id="rIdImage'+n+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/product-'+n+'.jpeg"/>';
  }).join('');
  zip.file('xl/drawings/_rels/drawing1.xml.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+imageRels+'</Relationships>');
  for(let i=0;i<images.length;i++){
    zip.file('xl/media/product-'+(i+1)+'.jpeg',images[i].bytes);
  }
  let types=ct;
  if(!/<Default\b[^>]*Extension="jpeg"/i.test(types)){
    types=types.replace('</Types>','<Default Extension="jpeg" ContentType="image/jpeg"/></Types>');
  }
  if(!/PartName="\/xl\/drawings\/drawing1.xml"/.test(types)){
    types=types.replace('</Types>',
      '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>');
  }
  zip.file('[Content_Types].xml',types);
  const output=await zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:6}});
  return output;
}
export async function downloadProductsExcel(
  categories:ProductCategory[],products:Product[],
  onProgress?:(progress:string)=>void
):Promise<ExportResult>{
  const XLSX=await import('xlsx');
  const rows=exportRows(categories,products);
  if(!rows.length)throw Error('لا توجد منتجات لتصديرها.');
  // Distinguish reference-only base records from selectable variants, while
  // preserving source-photo hyperlinks even if CORS prevents embedding.
  const cells=[[
    'صورة المنتج','القسم','اسم المنتج','الخيار / النوع','نوع السطر',
    'سعر المنتج الأساسي (ر.س)','سعر الخيار قبل الخصم (ر.س)',
    'قيمة الخصم (ر.س)','السعر النهائي (ر.س)','طريقة التسعير'
  ],...rows.map(r=>[
    r.imageUrl?'الصورة مرفقة — اضغط لفتح الأصل':'لا توجد صورة',
    r.category,r.name,r.variantName,r.rowType,
    r.basePrice,r.regularPrice,r.discount,r.price,r.priceSource
  ])];
  const sheet=XLSX.utils.aoa_to_sheet(cells);
  sheet['!cols']=[
    {wpx:146},{wpx:170},{wpx:235},{wpx:150},{wpx:155},
    {wpx:170},{wpx:184},{wpx:132},{wpx:165},{wpx:145}
  ];
  sheet['!rows']=[{hpx:42},...rows.map(()=>({hpx:134}))];
  sheet['!autofilter']={ref:'A1:J'+(rows.length+1)};
  for(let i=0;i<rows.length;i++){
    const photo=sheet['A'+(i+2)];
    const link=pictureLink(rows[i].imageUrl);
    if(photo&&link)XLSX.utils.cell_set_hyperlink(photo,link,'فتح الصورة بدقتها الأصلية');
    for(const col of ['F','G','H','I']){
      const amount=sheet[col+(i+2)];
      if(amount)amount.z='#,##0.00';
    }
  }
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,sheet,'المنتجات');
  const content=XLSX.write(wb,{type:'array',bookType:'xlsx',compression:true});
  const images:ExcelImage[]=[];
  let missing=0,lowResolution=0;
  const photoCache=new Map<string,ReturnType<typeof jpegForWorkbook>>();
  for(let index=0;index<rows.length;index++){
    const row=rows[index];
    onProgress?.('تجهيز صور المنتجات بدقة عالية: '+(index+1)+' / '+rows.length);
    if(!row.imageUrl){missing++;continue;}
    try{
      let task=photoCache.get(row.imageUrl);
      if(!task){task=jpegForWorkbook(row.imageUrl);photoCache.set(row.imageUrl,task);}
      const photo=await task;
      images.push({rowIndex:index+1,bytes:photo.bytes});
      if(photo.lowResolution)lowResolution++;
    }catch(error){
      console.warn('Excel image skipped for product',row.productId,error);
      missing++;
    }
  }
  onProgress?.('إنشاء ملف Excel وإدراج الصور...');
  const workbook=await attachImagesToXlsx(new Uint8Array(content),images);
  const bytes=new Uint8Array(workbook.length);
  bytes.set(workbook);
  const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='منتجات-جدو-داوود-'+new Date().toISOString().slice(0,10)+'.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60_000);
  return {total:products.length,variants:rows.filter(r=>r.rowType==='خيار').length,rows:rows.length,
    embedded:images.length,missing,lowResolution};
}
