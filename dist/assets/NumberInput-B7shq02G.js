import{c as a,j as e}from"./index-C8qSNmZ-.js";import{P as s}from"./plus-CpjUYO3j.js";
/**
 * @license lucide-react v0.427.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const t=a("Minus",[["path",{d:"M5 12h14",key:"1ays0h"}]]),n="_container_who08_1",l="_label_who08_2",i="_inputRow_who08_4",o="_btn_who08_10",r="_valueContainer_who08_40",c="_input_who08_4",h="_unit_who08_70",_="_large_who08_78",m=({value:a,onChange:m,min:u=0,max:d=9999,step:p=1,label:x,unit:b,decimals:j=0,large:N=!1})=>e.jsxs("div",{className:`${n} ${N?_:""}`,children:[x&&e.jsx("label",{className:l,children:x}),e.jsxs("div",{className:i,children:[e.jsx("button",{type:"button",className:o,onClick:()=>{const e=Math.max(u,Math.round(10*(a-p))/10);m(e)},disabled:a<=u,"aria-label":"Disminuir",children:e.jsx(t,{size:N?24:18})}),e.jsxs("div",{className:r,children:[e.jsx("input",{type:"number",className:c,value:j>0?a.toFixed(j):a,onChange:a=>{const e=parseFloat(a.target.value);!isNaN(e)&&e>=u&&e<=d?m(e):""===a.target.value||a.target.value},min:u,max:d,step:p,inputMode:"decimal"}),b&&e.jsx("span",{className:h,children:b})]}),e.jsx("button",{type:"button",className:o,onClick:()=>{const e=Math.min(d,Math.round(10*(a+p))/10);m(e)},disabled:a>=d,"aria-label":"Aumentar",children:e.jsx(s,{size:N?24:18})})]})]});export{m as N};
