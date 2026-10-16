import type {SVGProps} from 'react';

/**
 * Scalable Saudi Riyal currency sign (U+20C1). The official geometric paths
 * are embedded so the sign renders on older Android and iOS browsers whose
 * installed fonts do not yet contain the new Unicode character.
 *
 * Artwork based on the Saudi Central Bank public-domain symbol, as reproduced
 * at https://commons.wikimedia.org/wiki/File:Saudi_Riyal_Symbol.svg
 */
export function RiyalSymbol(props:SVGProps<SVGSVGElement>) {
  return <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1124.14 1256.39"
    width="1em" height="1em"
    fill="currentColor"
    focusable="false"
    aria-hidden="true"
    {...props}
  >
    <path d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"/>
    <path d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"/>
  </svg>;
}

/** Render currency without font-dependent Unicode characters. */
export function RiyalPrice({amount,className=''}:{amount:number;className?:string}) {
  const formatted=new Intl.NumberFormat('ar-SA',{minimumFractionDigits:0,maximumFractionDigits:2}).format(amount);
  return <span className={'price-amount '+className} dir="ltr" aria-label={formatted+' ريال سعودي'}>
    <span className="price-number">{formatted}</span>
    <RiyalSymbol className="currency-mark"/>
  </span>;
}
