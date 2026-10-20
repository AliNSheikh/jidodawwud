import React,{useMemo,useState} from 'react';
import {FileSpreadsheet,UploadCloud,Image as ImageIcon,Download,CheckCircle2,XCircle} from 'lucide-react';
import type {Product,ProductCategory} from '../../types/store';
import {
  parseExcel,createExcelTemplate,validateExcelRows,findLocalImage,validImageURL,
  checkImageDimensions,sameText,type ExcelRow
} from '../../utils/productExcel';

const newId=()=>globalThis.crypto?.randomUUID?.()||'import-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
type Prepared={row:ExcelRow;file?:File;url?:string};
export function ExcelProductImport({
  categories,products,uploadImage,onApply,onClose
}:{
  categories:ProductCategory[];products:Product[];
  uploadImage:(file:File)=>Promise<string>;
  onApply:(categories:ProductCategory[],products:Product[])=>void;
  onClose:()=>void;
}){
  const [rows,setRows]=useState<ExcelRow[]>([]);
  const [files,setFiles]=useState<File[]>([]);
  const [fileName,setFileName]=useState('');
  const [busy,setBusy]=useState(false);
  const [progress,setProgress]=useState('');
  const [message,setMessage]=useState('');
  const [previewError,setPreviewError]=useState('');
  const issues=useMemo(()=>{
    const list=validateExcelRows(rows,categories,products);
    for(const row of rows){
      const image=row.image.trim();
      if(!row.embedded&&image&&!validImageURL(image)&&!findLocalImage(image,files))
        list.push('الصف '+row.row+': لم يتم العثور على ملف الصورة «'+image+'». أرفق الصور المطابقة أو استخدم رابط HTTPS.');
    }
    return list;
  },[rows,files,categories,products]);
  const newCategoryNames=useMemo(()=>{
    const values:string[]=[];
    rows.forEach(row=>{
      if(row.category&&!categories.some(c=>sameText(c.name,row.category))&&!values.some(c=>sameText(c,row.category)))
        values.push(row.category);
    });
    return values;
  },[rows,categories]);
  async function loadExcel(file:File|null){
    setRows([]);setFileName('');setMessage('');setPreviewError('');
    if(!file)return;
    setBusy(true);setProgress('قراءة ملف Excel والصور المضمنة...');
    try{
      const parsed=await parseExcel(file);
      setRows(parsed);setFileName(file.name);
    }catch(e:any){setPreviewError(e.message||'تعذر قراءة ملف Excel.');}
    finally{setBusy(false);setProgress('');}
  }
  async function apply(){
    if(!rows.length||issues.length||busy)return;
    setBusy(true);setMessage('');setPreviewError('');
    try{
      const prepared:Prepared[]=[];
      // Verify EVERY photo before sending any data to GitHub.
      for(let i=0;i<rows.length;i++){
        const row=rows[i];
        setProgress('التحقق من دقة الصور: '+(i+1)+' / '+rows.length);
        const input=row.image.trim();
        const file=row.embedded || (validImageURL(input)?undefined:findLocalImage(input,files));
        if(file){await checkImageDimensions(file);prepared.push({row,file});}
        else if(validImageURL(input)){await checkImageDimensions(input);prepared.push({row,url:input});}
        else throw Error('الصورة في الصف '+row.row+' غير متوفرة.');
      }
      const categoriesNext:ProductCategory[]=[];
      const allCats=[...categories];
      for(const name of newCategoryNames){
        const entry:ProductCategory={
          id:newId(),name,description:'',isActive:true,
          displayOrder:Math.max(-1,...allCats.map(c=>c.displayOrder||0))+1
        };
        categoriesNext.push(entry);allCats.push(entry);
      }
      const nextPosition=new Map(allCats.map(c=>[c.id,Math.max(-1,...products.filter(p=>p.categoryId===c.id).map(p=>p.displayOrder||0))]));
      const imported:Product[]=[];
      // The import is appended to the dashboard draft only AFTER every upload succeeds.
      for(let i=0;i<prepared.length;i++){
        const {row,file,url}=prepared[i];
        setProgress('رفع الصور وإعداد المنتجات: '+(i+1)+' / '+prepared.length);
        let imageUrl=url||'';
        if(file)imageUrl=await uploadImage(file);
        const category=allCats.find(c=>sameText(c.name,row.category));
        if(!category)throw Error('تعذر تحديد القسم للصف '+row.row);
        const position=(nextPosition.get(category.id)??-1)+1;
        nextPosition.set(category.id,position);
        imported.push({
          id:newId(),name:row.name,categoryId:category.id,basePrice:row.price,
          imageUrl,description:'',displayOrder:position,isAvailable:true,
          offerEnabled:false,offerPrice:0
        });
      }
      onApply(categoriesNext,imported);
    }catch(e:any){
      setPreviewError('لم تُضَف منتجات إلى القائمة. '+(e.message||'حدث خطأ أثناء استيراد المنتجات.'));
    }finally{setBusy(false);setProgress('');}
  }
  return <section className="admin-excel-import" aria-label="استيراد المنتجات من Excel">
    <div className="admin-excel-head">
      <div><h3><FileSpreadsheet size={19}/> استيراد المنتجات من Excel</h3>
        <p>أضف منتجات جديدة دفعة واحدة من ملف XLSX أو XLS. ستتم مراجعة البيانات والصور قبل إضافتها، ولن تتغير المنتجات الموجودة.</p></div>
      <button type="button" className="mini-action" disabled={busy} onClick={onClose}><XCircle size={16}/> إغلاق</button>
    </div>
    <button type="button" className="btn outline" disabled={busy} onClick={async()=>{try{await createExcelTemplate();}catch(e:any){setPreviewError('تعذر إنشاء القالب: '+e.message);}}}>
      <Download size={17}/> تحميل قالب Excel
    </button>
    <div className="admin-excel-controls">
      <label className="admin-field">1. اختر ملف Excel
        <input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          disabled={busy} onChange={e=>{void loadExcel(e.target.files?.[0]||null);e.target.value='';}}/>
      </label>
      <label className="admin-field">2. أرفق صور المنتجات عند استخدام أسماء ملفات (اختياري)
        <input type="file" multiple accept="image/jpeg,image/png,image/webp"
          disabled={busy} onChange={e=>setFiles(Array.from(e.target.files||[]))}/>
      </label>
    </div>
    <div className="admin-excel-help">
      <ImageIcon size={19}/>
      <span>عمود <strong>صورة المنتج</strong> يقبل رابط HTTPS مباشرًا، أو اسم صورة مثل <b dir="ltr">burger.jpg</b> عند إرفاق الملفات، أو صورة مدرجة داخل خلية ملف XLSX.
        يجب أن تكون أبعاد الصور <strong>800×800 بكسل على الأقل</strong>. الصور المرفقة والمضمنة تُرفع بصيغة <b>WebP 1024×1024</b>، وتبقى صور الروابط الخارجية بجودتها الأصلية.</span>
    </div>
    {fileName&&<p className="admin-excel-caption">الملف: <strong>{fileName}</strong> — {rows.length} منتج. الصور الإضافية: {files.length}.</p>}
    {!!newCategoryNames.length&&<p className="admin-excel-caption">الأقسام الجديدة التي ستُنشأ: <strong>{newCategoryNames.join('، ')}</strong>.</p>}
    {!!rows.length&&<div className="admin-excel-preview">
      <h4>معاينة المنتجات ({rows.length})</h4>
      <div className="admin-excel-scroll"><table><thead><tr>
        <th>الصف</th><th>الصورة</th><th>القسم</th><th>اسم المنتج</th><th>السعر (ر.س)</th>
      </tr></thead><tbody>{rows.slice(0,40).map(row=><tr key={row.row}>
        <td>{row.row}</td><td>{row.embedded?'صورة مضمّنة':validImageURL(row.image)?'رابط صورة':findLocalImage(row.image,files)?'ملف صورة':row.image||'—'}</td>
        <td>{row.category}</td><td>{row.name}</td><td>{Number.isFinite(row.price)?row.price.toFixed(2):'غير صالح'}</td>
      </tr>)}</tbody></table></div>
      {rows.length>40&&<p className="hint">تظهر أول 40 منتجات للمعاينة من إجمالي {rows.length}.</p>}
    </div>}
    {issues.length>0&&<div className="admin-excel-errors" role="alert">
      <strong>يرجى تصحيح {issues.length} ملاحظات قبل الاستيراد:</strong>
      {issues.slice(0,12).map((issue,i)=><p key={i}>• {issue}</p>)}
      {issues.length>12&&<p>… و{issues.length-12} ملاحظات أخرى.</p>}
    </div>}
    {previewError&&<p className="form-error" role="alert">{previewError}</p>}
    {message&&<p className="form-success" role="status">{message}</p>}
    {progress&&<p role="status" className="admin-excel-progress"><UploadCloud size={17}/> {progress}</p>}
    {!!rows.length&&<button type="button" className="btn primary admin-excel-submit" disabled={busy||issues.length>0} onClick={()=>void apply()}>
      <CheckCircle2 size={18}/> {busy?'يرجى الانتظار...':'إضافة '+rows.length+' منتج إلى القائمة'}
    </button>}
    <p className="hint">بعد نجاح الاستيراد اضغط <strong>حفظ التغييرات</strong> أعلى لوحة التحكم لنشر المنتجات. الصور المستوردة من روابط خارجية يجب أن تظل متاحة على مواقعها الأصلية.</p>
  </section>;
}
