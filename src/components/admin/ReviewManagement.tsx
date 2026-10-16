import React,{useEffect,useState} from 'react';
import {RefreshCw,Star,Trash2} from 'lucide-react';
import type {Product,ProductReview} from '../../types/store';

type AdminReview=ProductReview & {approved:boolean};
export function ReviewManagement({products}:{products:Product[]}){
  const [reviews,setReviews]=useState<AdminReview[]>([]);
  const [filter,setFilter]=useState('all');
  const [productFilter,setProductFilter]=useState('');
  const [editing,setEditing]=useState<AdminReview|null>(null);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState('');
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  async function request(method:'GET'|'POST',body?:any){
    const r=await fetch('/api/admin/reviews',{
      method,cache:'no-store',headers:{Authorization:'Bearer '+(sessionStorage.getItem('jido-admin-token')||''),'Content-Type':'application/json'},
      ...(body?{body:JSON.stringify(body)}:{})
    });
    const d=await r.json().catch(()=>({error:'تعذر قراءة استجابة الخادم'}));
    if(!r.ok)throw new Error(d.error||'تعذر تحديث التقييمات');
    return d;
  }
  async function load(){
    setLoading(true);setError('');
    try{const d=await request('GET');setReviews(d.reviews||[]);}catch(e:any){setError(e.message);}
    finally{setLoading(false);}
  }
  useEffect(()=>{load();},[]);
  const pending=reviews.filter(r=>!r.approved).length;
  const visible=reviews.filter(r=>(filter==='all'||(filter==='pending'?!r.approved:r.approved))&&(!productFilter||r.productId===productFilter))
    .sort((a,b)=>Number(a.approved)-Number(b.approved)||b.rating-a.rating||b.createdAt.localeCompare(a.createdAt));
  async function saveReview(r:AdminReview){
    setBusy(r.id);setError('');setNotice('');
    try{
      await request('POST',{action:'update',id:r.id,name:r.name,comment:r.comment,rating:r.rating,approved:r.approved});
      setEditing(null);setNotice('تم حفظ التقييم ومزامنته مع GitHub.');await load();
    }catch(e:any){setError(e.message);}finally{setBusy('');}
  }
  async function removeReview(r:AdminReview){
    if(!window.confirm('هل تريد حذف هذا التقييم نهائيًا؟'))return;
    setBusy(r.id);setError('');setNotice('');
    try{await request('POST',{action:'delete',id:r.id});setNotice('تم حذف التقييم.');await load();}
    catch(e:any){setError(e.message);}finally{setBusy('');}
  }
  return <section className="admin-panel">
    <div className="admin-section-title"><div><h2>إدارة تقييمات المنتجات</h2><p className="hint">التقييمات الجديدة قيد المراجعة ولا تظهر للزبائن حتى توافق على نشرها.</p></div><button className="btn outline" onClick={load} disabled={loading}><RefreshCw size={16}/> تحديث</button></div>
    <div className="reviews-stats"><span>كل التقييمات: <b>{reviews.length}</b></span><span>بانتظار المراجعة: <b>{pending}</b></span><span>منشورة: <b>{reviews.length-pending}</b></span></div>
    <div className="admin-form-grid">
      <label className="admin-field">حالة التقييم<select value={filter} onChange={e=>setFilter(e.target.value)}>
        <option value="all">الكل</option><option value="pending">بانتظار الموافقة</option><option value="approved">منشور</option>
      </select></label>
      <label className="admin-field">المنتج<select value={productFilter} onChange={e=>setProductFilter(e.target.value)}>
        <option value="">كل المنتجات</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select></label>
    </div>
    {notice&&<p role="status" className="form-success">{notice}</p>}
    {error&&<p role="alert" className="form-error">{error}</p>}
    {loading&&<p>جارٍ تحميل التقييمات...</p>}
    <div className="admin-reviews-list">
      {visible.map(r=>{
        const edit=editing?.id===r.id?editing:null;
        return <article className="admin-review-card" key={r.id}>
          <div className="admin-review-head">
            <div><strong>{products.find(p=>p.id===r.productId)?.name||'منتج محذوف'}</strong><p>{r.name} · {new Date(r.createdAt).toLocaleDateString('ar-SA')}</p></div>
            <span className={r.approved?'order-status status-delivered':'order-status status-pending'}>{r.approved?'منشور':'بانتظار الموافقة'}</span>
          </div>
          {edit?<div className="review-edit-form">
            <label className="admin-field">الاسم<input value={edit.name} maxLength={45} onChange={e=>setEditing({...edit,name:e.target.value})}/></label>
            <label className="admin-field">التقييم<select value={edit.rating} onChange={e=>setEditing({...edit,rating:Number(e.target.value)})}>{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} نجوم</option>)}</select></label>
            <label className="admin-field">النص<textarea rows={3} value={edit.comment} maxLength={700} onChange={e=>setEditing({...edit,comment:e.target.value})}/></label>
            <label className="admin-check"><input type="checkbox" checked={edit.approved} onChange={e=>setEditing({...edit,approved:e.target.checked})}/> الموافقة على نشر التقييم</label>
            <div className="review-actions"><button className="btn primary" disabled={!!busy} onClick={()=>saveReview(edit)}>حفظ التقييم</button><button className="btn outline" onClick={()=>setEditing(null)}>إلغاء</button></div>
          </div>:<>
            <div className="review-stars-mini">{Array.from({length:5},(_,i)=><Star key={i} size={16} fill={i<r.rating?'currentColor':'none'}/>)}</div>
            <p className="review-comment">{r.comment}</p>
            <div className="review-actions">
              {!r.approved&&<button className="btn primary" disabled={!!busy} onClick={()=>saveReview({...r,approved:true})}>الموافقة والنشر</button>}
              <button className="btn outline" onClick={()=>setEditing({...r})}>تعديل</button>
              <button className="btn outline delete-review" disabled={!!busy} onClick={()=>removeReview(r)}><Trash2 size={16}/> حذف</button>
            </div>
          </>}
        </article>;
      })}
      {!loading&&visible.length===0&&<div className="empty-state">لا توجد تقييمات مطابقة.</div>}
    </div>
  </section>;
}
