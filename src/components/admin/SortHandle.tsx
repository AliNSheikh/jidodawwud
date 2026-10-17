import React,{useEffect,useRef,useState} from 'react';
import {GripVertical} from 'lucide-react';

/**
 * Reorder grip with touch, pen, mouse and keyboard support.
 *
 * Event listeners belong to window, not a captured DOM node: React moves rows
 * during a sort and moving that node can release pointer capture on Android.
 * Touch-action:none applies only to the grip, so the rest of the list scrolls.
 */
export function SortHandle({
  id,scope,ids,onMove,label,disabled=false
}:{
  id:string;scope:string;ids:string[];
  onMove:(source:string,target:string)=>void;
  label:string;disabled?:boolean;
}) {
  const propsRef=useRef({id,scope,ids,onMove,disabled});
  propsRef.current={id,scope,ids,onMove,disabled};
  const dragRef=useRef<{pointerId:number;lastTarget:string;cleanup:()=>void}|null>(null);
  const [dragging,setDragging]=useState(false);
  useEffect(()=>()=>dragRef.current?.cleanup(),[]);
  function down(e:React.PointerEvent<HTMLButtonElement>){
    if(disabled||!e.isPrimary||e.button!==0||dragRef.current)return;
    e.preventDefault();
    const pointerId=e.pointerId;
    const previousUserSelect=document.body.style.userSelect;
    document.body.style.userSelect='none';
    function cleanup(){
      window.removeEventListener('pointermove',move);
      window.removeEventListener('pointerup',up);
      window.removeEventListener('pointercancel',up);
      document.body.style.userSelect=previousUserSelect;
    }
    function move(ev:PointerEvent){
      const drag=dragRef.current,props=propsRef.current;
      if(!drag||ev.pointerId!==drag.pointerId||props.disabled)return;
      if(ev.cancelable)ev.preventDefault();
      const hovered=document.elementFromPoint(ev.clientX,ev.clientY);
      let node=hovered instanceof Element?hovered:null;
      while(node){
        if(node.getAttribute('data-sort-scope')===props.scope){
          const target=node.getAttribute('data-sort-id');
          if(target && target!==props.id && target!==drag.lastTarget && props.ids.includes(target)){
            drag.lastTarget=target;
            props.onMove(props.id,target);
          }
          break;
        }
        node=node.parentElement;
      }
      // Help moving items in a long, vertically scrolling admin panel.
      const edge=65,dy=ev.clientY<edge?-16:ev.clientY>window.innerHeight-edge?16:0;
      if(dy)window.scrollBy({top:dy,behavior:'auto'});
    }
    function up(ev:PointerEvent){
      if(dragRef.current?.pointerId!==ev.pointerId)return;
      const cleanup=dragRef.current.cleanup;
      dragRef.current=null;
      cleanup();
      setDragging(false);
    }
    dragRef.current={pointerId,lastTarget:id,cleanup};
    window.addEventListener('pointermove',move,{passive:false});
    window.addEventListener('pointerup',up);
    window.addEventListener('pointercancel',up);
    setDragging(true);
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
    onPointerDown={down} onKeyDown={onKeys}>
    <GripVertical size={20}/>
  </button>;
}
