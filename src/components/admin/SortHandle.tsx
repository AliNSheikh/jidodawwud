import React,{useRef,useState} from 'react';
import {GripVertical} from 'lucide-react';

/**
 * Pointer-based drag handle; supports mouse, touch and pen without relying
 * on HTML5 draggable (unreliable on Android Chrome). Arrow keys work too.
 * Only the handle consumes touch gestures; rows and their buttons scroll normally.
 */
export function SortHandle({
  id,scope,ids,onMove,label,disabled=false
}:{
  id:string;scope:string;ids:string[];
  onMove:(source:string,target:string)=>void;
  label:string;disabled?:boolean;
}) {
  const active=useRef<{pointerId:number;lastTarget:string}|null>(null);
  const [dragging,setDragging]=useState(false);
  function finish(e:React.PointerEvent<HTMLButtonElement>){
    if(active.current?.pointerId!==e.pointerId)return;
    active.current=null;
    setDragging(false);
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  }
  function down(e:React.PointerEvent<HTMLButtonElement>){
    if(disabled||!e.isPrimary||e.button!==0)return;
    e.preventDefault();
    active.current={pointerId:e.pointerId,lastTarget:id};
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }
  function drag(e:React.PointerEvent<HTMLButtonElement>){
    if(disabled||active.current?.pointerId!==e.pointerId)return;
    e.preventDefault();
    // Escaped literal IDs: attribute value is checked against the allowed scope.
    const hovered=document.elementFromPoint(e.clientX,e.clientY);
    let node=hovered instanceof Element?hovered:null;
    while(node){
      if(node.getAttribute('data-sort-scope')===scope){
        const target=node.getAttribute('data-sort-id');
        if(target && target!==id && target!==active.current.lastTarget && ids.includes(target)){
          active.current.lastTarget=target;
          onMove(id,target);
        }
        break;
      }
      node=node.parentElement;
    }
    // Make it possible to drag through long menus while holding the grip.
    const margin=65,delta=e.clientY<margin?-17:e.clientY>window.innerHeight-margin?17:0;
    if(delta)window.scrollBy({top:delta,behavior:'instant'});
  }
  function onKeys(e:React.KeyboardEvent<HTMLButtonElement>){
    if(disabled||!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;
    e.preventDefault();
    const index=ids.indexOf(id);
    if(index<0)return;
    const targetIndex=e.key==='ArrowUp'?Math.max(0,index-1):
      e.key==='ArrowDown'?Math.min(ids.length-1,index+1):
      e.key==='Home'?0:ids.length-1;
    if(index!==targetIndex)onMove(id,ids[targetIndex]);
  }
  return <button type="button"
    className={'admin-sort-handle'+(dragging?' dragging':'')}
    title={disabled?'امسح البحث أولًا لتفعيل الترتيب':'اسحب لترتيب العناصر؛ أو استخدم السهمين للأعلى والأسفل'}
    aria-label={'تغيير ترتيب '+label+'. اسحب أو استخدم الأسهم للأعلى والأسفل'}
    aria-pressed={dragging}
    disabled={disabled}
    onPointerDown={down} onPointerMove={drag} onPointerUp={finish}
    onPointerCancel={finish} onLostPointerCapture={finish} onKeyDown={onKeys}>
    <GripVertical size={20}/>
  </button>;
}
