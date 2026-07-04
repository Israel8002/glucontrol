import{c as s,j as a}from"./index-C8qSNmZ-.js";import{M as i}from"./Modal-cKztRcB_.js";import{B as e}from"./Button-ChAKdtU1.js";
/**
 * @license lucide-react v0.427.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const n=s("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]),l="_container_16ksv_1",o="_message_16ksv_3",r="_actions_16ksv_9",c=({isOpen:s,onClose:n,onConfirm:c,title:t,message:d,confirmLabel:m="Confirmar",cancelLabel:h="Cancelar",variant:x="danger",loading:j=!1})=>a.jsx(i,{isOpen:s,onClose:n,title:t,size:"sm",id:"confirm-dialog",children:a.jsxs("div",{className:l,children:[a.jsx("p",{className:o,children:d}),a.jsxs("div",{className:r,children:[a.jsx(e,{variant:"ghost",onClick:n,fullWidth:!0,children:h}),a.jsx(e,{variant:x,onClick:async()=>{await c(),n()},fullWidth:!0,loading:j,children:m})]})]})});export{c as C,n as T};
