import React,{useState} from 'react';
import {Star,Send} from 'lucide-react';
import type {ProductReview,RatingSummary} from '../types/store';

export function RatingBadge({summary}:{summary?:RatingSummary}) {
  const avg=summary?.average||0,count=summary?.count||0;
  return <span className="rating-badge" title={count?'التقييم '+avg+' من 5 ('+count+' تقييم)':'لا توجد تقييمات بعد'}>
    <span className="rating-badge-stars">
      {[1,2,3,4,5].map(n=><Star key={n} size={12} className={n<=Math.round(avg)?'star-lit':'star-empty'} fill={n<=Math.round(avg)?'currentColor':'none'}/>)}
    </span>
    <span>{count?avg.toFixed(1):'0.0'}</span>
    <span className="rating-count">({count})</span>
  </span>;
}
function Stars({rating,interactive=false,onChoose}:{rating:number;interactive?:boolean;onChoose?:(v:number)=>void}){
  return <span className={'stars-row'+(interactive?' interactive':'')} role={interactive?'radiogroup':undefined} aria-label={interactive?'اختر التقييم من نجمة إلى خمس نجوم':undefined}>
    {[1,2,3,4,5].map(n=>interactive?
      <button key={n} type="button" role="radio" aria-checked={rating===n} aria-label={n+' نجوم'}
        onClick={()=>onChoose?.(n)}><Star size={25} fill={n<=rating?'currentColor':'none'}/></button>:
      <Star key={n} size={16} fill={n<=rating?'currentColor':'none'} className={n<=rating?'star-lit':'star-empty'}/>
    )}
  </span>;
}
export function ReviewSection({productId,reviews,onSubmitted}:{productId:string;reviews:ProductReview[];onSubmitted:()=>Promise<void>}){
  const [name,setName]=useState('');
  const [comment,setComment]=useState('');
  const [rating,setRating]=useState(5);
  const [sending,setSending]=useState(false);
  const [feedback,setFeedback]=useState('');
  const [error,setError]=useState('');
  const [website,setWebsite]=useState('');
  const selected=reviews.filter(r=>r.productId===productId&&r.rating>=4)
    .sort((a,b)=>b.rating-a.rating||b.comment.length-a.comment.length||b.createdAt.localeCompare(a.createdAt))
    .slice(0,10);
  async function submit(e:React.FormEvent){
    e.preventDefault();if(sending)return;
    setSending(true);setError('');setFeedback('');
    try{
      const r=await fetch('/api/reviews',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name,comment,rating,productId,website})});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||'تعذر إرسال التقييم');
      setFeedback(d.message||'تم إرسال التقييم للمراجعة');setComment('');setName('');setRating(5);
      await onSubmitted().catch(()=>{});
    }catch(err:any){setError(err.message||'يرجى المحاولة لاحقًا');}
    finally{setSending(false);}
  }
  return <section className="review-section">
    <div className="section-head"><div><span className="eyebrow">آراء زبائننا</span><h2>تقييمات المنتج</h2></div></div>
    <div className="review-layout">
      <div className="review-list">
        <h3>أفضل التقييمات ({selected.length})</h3>
        {selected.length?selected.map(r=><article className="review-card" key={r.id}>
          <div className="review-card-top"><strong>{r.name}</strong><Stars rating={r.rating}/></div>
          <small>{new Date(r.createdAt).toLocaleDateString('ar-SA')}</small>
          <p>{r.comment}</p>
        </article>):<div className="empty-state">لا توجد مراجعات إيجابية منشورة بعد. كن أول من يقيّم هذا المنتج!</div>}
      </div>
      <form className="review-form white-panel" onSubmit={submit}>
        <h3>أضف تقييمك</h3>
        <p className="hint">نرحب بتجربتك. يُنشر التقييم بعد مراجعة إدارة المطعم. سيظهر اسمك المكتوب هنا للعامة.</p>
        <label>تقييمك <Stars rating={rating} interactive onChoose={setRating}/></label>
        <label>الاسم الذي سيظهر <input required minLength={2} maxLength={45} value={name} onChange={e=>setName(e.target.value)} placeholder="اسمك أو اسم مستعار"/></label>
        <label>رأيك في المنتج <textarea required minLength={12} maxLength={700} rows={4} value={comment} onChange={e=>setComment(e.target.value)} placeholder="شاركنا تجربتك مع هذا المنتج..."/></label>
        <div className="review-honeypot" aria-hidden="true"><label>الموقع الإلكتروني<input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></label></div>
        <button type="submit" className="btn primary" disabled={sending||name.trim().length<2||comment.trim().length<12}><Send size={17}/>{sending?'يتم إرسال التقييم...':'إرسال التقييم'}</button>
        {feedback&&<p role="status" className="form-success">{feedback}</p>}
        {error&&<p role="alert" className="form-error">{error}</p>}
      </form>
    </div>
  </section>;
}
