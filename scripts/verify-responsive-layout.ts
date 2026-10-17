import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync('src/index.css','utf8');
const html=readFileSync('index.html','utf8');
const review=readFileSync('src/components/ReviewWidgets.tsx','utf8');

assert.match(html,/<meta\s+name="viewport"\s+content="[^"]*width=device-width[^"]*"/i,
  'Every direct product link must use the device viewport.');
assert.match(html,/<html[^>]*dir="rtl"/i,'Use RTL page direction');
const hiddenFieldRules=[...css.matchAll(/\.review-honeypot\s*\{([^}]*)\}/g)];
assert.ok(hiddenFieldRules.length>0,'Hidden review form field must have a safe CSS rule');
const hiddenFieldCSS=hiddenFieldRules.at(-1)![1];
assert.doesNotMatch(hiddenFieldCSS,/(?:left|right|inset-inline-start|inset-inline-end)\s*:\s*-\s*\d{3,}/i,
  'An off-screen positioned field can expand an RTL page from 390px to more than 1500px');
assert.match(hiddenFieldCSS,/clip-path\s*:\s*inset\(50%\)/,'Hide anti-spam field by clipping within form');
assert.match(css,/\.review-form\s*\{position:relative\}/,'Position the clipped field relative to review form');
assert.match(css,/@media\s*\(max-width:720px\)[\s\S]*?\.product-detail\s*\{[\s\S]*?flex-direction\s*:\s*column/,
  'Product information must stack on mobile');
assert.match(css,/@media\s*\(max-width:720px\)[\s\S]*?\.review-layout\s*\{[\s\S]*?flex-direction\s*:\s*column/,
  'Review columns must stack on mobile');
assert.match(review,/className="review-honeypot"/,'Keep the spam prevention input with its safe layout');
console.log('Responsive product checks passed: viewport, RTL, safe clipped honeypot, mobile product and review layout');
