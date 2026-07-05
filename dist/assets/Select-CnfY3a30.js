import{c as e,j as l}from"./index-D0_2xYQO.js";import{R as s}from"./react-vendor-B_9dtp_R.js";
/**
 * @license lucide-react v0.427.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const a=e("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]),r="_wrapper_17jbl_1",i="_fullWidth_17jbl_2",n="_label_17jbl_3",c="_required_17jbl_4",d="_selectContainer_17jbl_6",_="_select_17jbl_6",o="_hasError_17jbl_32",t="_chevron_17jbl_34",j="_error_17jbl_42",h="_hint_17jbl_43",m=s.forwardRef(({label:e,error:s,hint:m,options:b,placeholder:p,fullWidth:x=!0,id:u,className:v="",...N},f)=>{const $=u??`select-${Math.random().toString(36).slice(2)}`;return l.jsxs("div",{className:`${r} ${x?i:""}`,children:[e&&l.jsxs("label",{htmlFor:$,className:n,children:[e,N.required&&l.jsx("span",{className:c,children:" *"})]}),l.jsxs("div",{className:`${d} ${s?o:""}`,children:[l.jsxs("select",{ref:f,id:$,className:`${_} ${v}`,"aria-invalid":s?"true":void 0,...N,children:[p&&l.jsx("option",{value:"",children:p}),b.map(e=>l.jsx("option",{value:e.value,disabled:e.disabled,children:e.label},e.value))]}),l.jsx(a,{className:t,size:18})]}),s&&l.jsx("span",{className:j,role:"alert",children:s}),m&&!s&&l.jsx("span",{className:h,children:m})]})});m.displayName="Select";export{m as S};
