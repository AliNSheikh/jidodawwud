import type {Product,ProductCategory} from '../types/store';

export type ExcelRow={
  row:number;image:string;category:string;name:string;price:number;
  embedded?:File;error?:string;
};
export type PreparedRow=ExcelRow & {file?:File;url?:string};
const HEADERS=['صورة المنتج','القسم','اسم المنتج','السعر'];
const MAX_ROWS=120;
const normalize=(text:unknown)=>String(text??'').normalize('NFKC')
  .replace(/[\u064B-\u065F\u0670]/g,'').replace(/[\u0640]/g,'')
  .trim().toLocaleLowerCase().replace(/[\s_\-()[\]،:]+/g,'');
const names=[
  ['صورةالمنتج','الصورة','رابطالصورة','صورة','image','imageurl','photo','picture','filename'],
  ['القسم','التصنيف','الفئة','category','section','classification'],
  ['اسمالمنتج','المنتج','اسمالصنف','الصنف','productname','name','item'],
  ['السعر','سعر','السعرر.س','price','baseprice','pricesar','sar']
];
export function headerIndexes(raw:unknown[]):number[]|null {
  const keys=raw.map(normalize);
  const found=names.map(aliases=>keys.findIndex(key=>aliases.includes(key)));
  return found.some(i=>i<0)||new Set(found).size!==4?null:found;
}
function arabicDigits(text:string){
  return text.replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-0x660))
    .replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-0x6f0))
    .replace(/٫/g,'.').replace(/٬/g,',');
}
export function parsePrice(raw:unknown):number|null {
  if(typeof raw==='number')return Number.isFinite(raw)&&raw>=0?Math.round(raw*100)/100:null;
  let text=arabicDigits(String(raw??'').trim())
    .replace(/(?:ر\.?\s*س\.?|ريال(?:\s*سعودي)?|SAR)/gi,'').replace(/\s/g,'');
  if(!text)return null;
  if(text.includes(',')&&!text.includes('.')&&/,\d{1,2}$/.test(text))text=text.replace(',','.');
  else text=text.replace(/,/g,'');
  if(!/^\d+(\.\d{1,2})?$/.test(text))return null;
  const value=Number(text);
  return Number.isFinite(value)&&value<=1_000_000?value:null;
}
export const sameText=(a:string,b:string)=>normalize(a)===normalize(b);
export function validateExcelRows(rows:ExcelRow[],categories:ProductCategory[],products:Product[]){
  const errors:string[]=[];
  const previous=new Set(products.map(p=>p.categoryId+'|'+normalize(p.name)));
  const categoryIds=new Map(categories.map(c=>[normalize(c.name),c.id]));
  const seen=new Set<string>();
  for(const row of rows){
    if(row.error){errors.push('الصف '+row.row+': '+row.error);continue;}
    if(!row.name||!row.category)errors.push('الصف '+row.row+': اسم المنتج والقسم مطلوبان.');
    if(row.price===null||!Number.isFinite(row.price)||row.price<0)errors.push('الصف '+row.row+': السعر غير صالح.');
    if(!row.image&&!row.embedded)errors.push('الصف '+row.row+': يجب إدخال صورة أو رابط أو اسم ملف صورة.');
    const id=categoryIds.get(normalize(row.category))||normalize(row.category);
    const key=id+'|'+normalize(row.name);
    if(previous.has(key)||seen.has(key))errors.push('الصف '+row.row+': المنتج «'+row.name+'» مكرر في نفس القسم.');
    seen.add(key);
  }
  return errors;
}
function filename(value:string){return decodeURIComponent(value.split(/[\\/]/).pop()||value).normalize('NFKC').trim().toLocaleLowerCase();}
export function findLocalImage(reference:string,files:File[]){
  let expected=reference;
  try{expected=filename(reference);}catch{expected=reference.trim().toLocaleLowerCase();}
  return files.find(f=>filename(f.name)===expected||f.webkitRelativePath&&filename(f.webkitRelativePath)===expected);
}
export function validImageURL(value:string){
  try{const u=new URL(value.trim());return u.protocol==='https:'&&!!u.hostname&&u.username===''&&u.password==='';}
  catch{return false;}
}
export async function createExcelTemplate(){
  const XLSX=await import('xlsx');
  const workbook=XLSX.utils.book_new();
  const ws=XLSX.utils.aoa_to_sheet([HEADERS]);
  ws['!cols']=[{wch:49},{wch:24},{wch:36},{wch:17}];
  XLSX.utils.book_append_sheet(workbook,ws,'المنتجات');
  const instructions=XLSX.utils.aoa_to_sheet([
    ['تعليمات استيراد منتجات جدو داوود'],
    ['اكتب صفًا لكل منتج تحت العناوين في ورقة "المنتجات".'],
    ['صورة المنتج','ضع رابط HTTPS مباشر للصورة، أو اسم ملف مثل burger.jpg وأرفق الصور عند الاستيراد.'],
    ['صور داخل Excel','يمكن أيضًا إدراج صورة فوق خلية عمود صورة المنتج داخل ملف XLSX.'],
    ['جودة الصورة','يجب أن تكون الصور على الأقل 800 × 800 بكسل. الصور المحلية تُجهّز 1024 × 1024 WebP.'],
    ['القسم','اكتب اسم القسم الموجود في لوحة التحكم، أو اسم قسم جديد وسيتم إنشاؤه.'],
    ['اسم المنتج','اكتب الاسم كما يجب أن يظهر على الموقع.'],
    ['السعر','اكتب رقمًا مثل 25 أو 25.50 دون رمز العملة.'],
    ['الحفظ','راجع المعاينة، أضف المنتجات، ثم اضغط زر حفظ التغييرات الرئيسي.']
  ]);
  instructions['!cols']=[{wch:27},{wch:100}];
  XLSX.utils.book_append_sheet(workbook,instructions,'تعليمات');
  XLSX.writeFile(workbook,'قالب-استيراد-منتجات-جدو-داوود.xlsx');
}
const xml=(source:string)=>new DOMParser().parseFromString(source,'application/xml');
const all=(node:Document|Element,local:string)=>Array.from(node.getElementsByTagNameNS('*',local));
const attr=(element:Element|null|undefined,name:string)=>element?.getAttribute(name)||element?.getAttribute('r:'+name)||'';
const resolve=(source:string,target:string)=>{
  if(target.startsWith('/'))return target.replace(/^\/+/,'');
  const parts=source.split('/').slice(0,-1);
  for(const p of target.split('/')){if(p==='..')parts.pop();else if(p!=='.'&&p)parts.push(p);}
  return parts.join('/');
};
function rel(doc:Document,id:string):string {
  return all(doc,'Relationship').find(node=>node.getAttribute('Id')===id)?.getAttribute('Target')||'';
}
const mime=(path:string)=>/\.png$/i.test(path)?'image/png':/\.webp$/i.test(path)?'image/webp':
  /\.jpe?g$/i.test(path)?'image/jpeg':'';
export async function embeddedImages(file:File,sheetName:string,column:number):Promise<Map<number,File>>{
  const map=new Map<number,File>();
  if(!file.name.toLowerCase().endsWith('.xlsx'))return map;
  const JSZip=(await import('jszip')).default;
  const zip=await JSZip.loadAsync(file);
  const text=async(path:string)=>zip.file(path)?.async('text');
  const book=await text('xl/workbook.xml'),bookRels=await text('xl/_rels/workbook.xml.rels');
  if(!book||!bookRels)return map;
  const sheet=all(xml(book),'sheet').find(x=>x.getAttribute('name')===sheetName);
  if(!sheet)return map;
  const sheetRel=rel(xml(bookRels),attr(sheet,'id'));
  if(!sheetRel)return map;
  const sheetPath=resolve('xl/workbook.xml',sheetRel);
  const sheetSource=await text(sheetPath);
  if(!sheetSource)return map;
  const drawing=all(xml(sheetSource),'drawing')[0];
  if(!drawing)return map;
  const sheetRels=await text(resolve(sheetPath,'_rels/'+sheetPath.split('/').pop()+'.rels'));
  const drawingTarget=sheetRels?rel(xml(sheetRels),attr(drawing,'id')):'';
  if(!drawingTarget)return map;
  const drawingPath=resolve(sheetPath,drawingTarget);
  const drawingSource=await text(drawingPath);
  const drawingRels=await text(resolve(drawingPath,'_rels/'+drawingPath.split('/').pop()+'.rels'));
  if(!drawingSource||!drawingRels)return map;
  const rdoc=xml(drawingRels);
  for(const anchor of Array.from(xml(drawingSource).documentElement.children)){
    if(!['oneCellAnchor','twoCellAnchor'].includes(anchor.localName))continue;
    const from=all(anchor,'from')[0],blip=all(anchor,'blip')[0];
    if(!from||!blip)continue;
    const row=Number(all(from,'row')[0]?.textContent),col=Number(all(from,'col')[0]?.textContent);
    if(!Number.isInteger(row)||col!==column||map.has(row))continue;
    const mediaTarget=rel(rdoc,attr(blip,'embed'));
    if(!mediaTarget)continue;
    const mediaPath=resolve(drawingPath,mediaTarget);
    const type=mime(mediaPath),image=zip.file(mediaPath);
    if(!type||!image)continue;
    // Archive metadata makes decompression-bomb-like images in Excel less likely.
    const payload=await image.async('uint8array');
    if(payload.byteLength>12*1024*1024)throw Error('الصورة المضمنة في الصف '+(row+1)+' تتجاوز 12 ميغابايت.');
    const safe=new Uint8Array(payload.byteLength);safe.set(payload);
    map.set(row,new File([safe],mediaPath.split('/').pop()||'excel-image.png',{type}));
  }
  return map;
}
export async function parseExcel(file:File):Promise<ExcelRow[]>{
  if(!/\.(xlsx|xls)$/i.test(file.name))throw Error('يرجى اختيار ملف Excel بصيغة XLSX أو XLS.');
  if(file.size>16*1024*1024)throw Error('ملف Excel كبير جدًا (الحد 16 ميغابايت).');
  const XLSX=await import('xlsx');
  const book=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});
  const name=book.SheetNames[0],sheet=book.Sheets[name];
  if(!sheet)throw Error('ملف Excel لا يحتوي على بيانات.');
  const records=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,defval:'',blankrows:true,raw:true});
  const head=records.slice(0,12).map((cells,index)=>({index,cols:headerIndexes(cells)})).find(x=>x.cols);
  if(!head?.cols)throw Error('يجب أن يحتوي Excel على الأعمدة: صورة المنتج، القسم، اسم المنتج، السعر.');
  const [imgCol,catCol,nameCol,priceCol]=head.cols;
  const embedded=await embeddedImages(file,name,imgCol);
  const rows:ExcelRow[]=[];
  for(let idx=head.index+1;idx<records.length;idx++){
    const row=records[idx]||[];
    const nonEmpty=row.some(v=>String(v??'').trim()!=='')||embedded.has(idx);
    if(!nonEmpty)continue;
    const price=parsePrice(row[priceCol]);
    const excel:ExcelRow={
      row:idx+1,image:String(row[imgCol]??'').trim(),
      category:String(row[catCol]??'').trim(),
      name:String(row[nameCol]??'').trim(),
      price:price??NaN,embedded:embedded.get(idx)
    };
    if(price===null)excel.error='السعر غير صالح (اكتب رقمًا مثل 12.50).';
    rows.push(excel);
    if(rows.length>MAX_ROWS)throw Error('الحد الأقصى '+MAX_ROWS+' منتج في ملف واحد. قسّم القائمة إلى ملفات أصغر.');
  }
  if(!rows.length)throw Error('لم يتم العثور على أي منتجات أسفل عناوين الأعمدة.');
  return rows;
}
export async function checkImageDimensions(source:File|string):Promise<{width:number;height:number}>{
  let temp='';
  const url=typeof source==='string'?source:(temp=URL.createObjectURL(source));
  try{
    const {width,height}=await new Promise<{width:number;height:number}>((resolve,reject)=>{
      const img=new Image();const timer=setTimeout(()=>{img.src='';reject(Error('انتهت مهلة تحميل الصورة'));},11000);
      img.onload=()=>{clearTimeout(timer);resolve({width:img.naturalWidth,height:img.naturalHeight});};
      img.onerror=()=>{clearTimeout(timer);reject(Error('تعذر فتح الصورة؛ تأكد من الرابط أو الملف.'));};
      img.src=url;
    });
    if(width<800||height<800)throw Error('دقة الصورة '+width+'×'+height+' منخفضة؛ الحد الأدنى 800×800 بكسل.');
    if(width/height>3||height/width>3)throw Error('أبعاد الصورة غير مناسبة لعرض المنتجات؛ اختر صورة أقرب إلى المربع.');
    return {width,height};
  }finally{if(temp)URL.revokeObjectURL(temp);}
}
export async function productImageWebP(file:File):Promise<string>{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('الصور المقبولة JPG أو PNG أو WebP فقط.');
  if(file.size>12*1024*1024)throw Error('حجم الصورة يتجاوز 12 ميغابايت.');
  await checkImageDimensions(file);
  const url=URL.createObjectURL(file);
  let img:HTMLImageElement;
  try{img=await new Promise((resolve,reject)=>{
    const el=new Image();el.onload=()=>resolve(el);el.onerror=()=>reject(Error('تعذر قراءة الصورة'));el.src=url;
  });}finally{URL.revokeObjectURL(url);}
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('متصفحك لا يدعم معالجة الصور.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,1024,1024);
  const ratio=Math.min(1024/img.naturalWidth,1024/img.naturalHeight);
  const w=img.naturalWidth*ratio,h=img.naturalHeight*ratio;
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(img,(1024-w)/2,(1024-h)/2,w,h);
  for(const quality of [.87,.78,.67,.54]){
    const data=canvas.toDataURL('image/webp',quality);
    if(data.startsWith('data:image/webp;')&&data.length<2_650_000)return data;
  }
  throw Error('لم تنجح معالجة الصورة بحجم مناسب. اختر صورة أقل تعقيدًا.');
}
