import{a as N}from"./chunk-X22FENZT.js";import{a as U}from"./chunk-NYEEP3KJ.js";import{h as D}from"./chunk-YNO2CH5N.js";import{D as F,J as T,U as j,Y as A,c as I,e as S,f as E,m as z}from"./chunk-4H6K527C.js";import{Ab as f,Hb as C,I as O,Pb as a,Qb as x,Rb as b,Sb as m,Xb as w,Ya as h,Yb as k,ac as v,bb as e,cb as d,cc as y,ma as P,pb as g,rb as s,v as M,wb as i,xb as o,yb as u,zb as _}from"./chunk-UOUGGPYB.js";var R=()=>({id:null});function L(t,r){t&1&&(i(0,"span",4),a(1,` Transaction with such id doesn't exist, isn't confirmed, or doesn't belong to your wallet \u{1F937}\u200D\u2640\uFE0F
`),o())}function q(t,r){t&1&&(_(0),u(1,"br"),f())}function B(t,r){if(t&1&&(_(0),a(1),g(2,q,2,0,"ng-container",3),f()),t&2){let p=r.$implicit,c=r.index,n=C(3);e(),b(" ",p," "),e(),s("ngIf",c+1<n.tx.addresses.length)}}function H(t,r){if(t&1&&(i(0,"span",8),g(1,B,3,2,"ng-container",12),o()),t&2){let p=C(2);e(),s("ngForOf",p.tx.addresses)}}function W(t,r){if(t&1&&(_(0),i(1,"div",5)(2,"div",6)(3,"span",7),a(4,"ID:"),o(),i(5,"span",8),a(6),o()(),i(7,"div",6)(8,"span",7),a(9,"Timestamp:"),o(),i(10,"span",8),a(11),v(12,"date"),o()(),i(13,"div",6)(14,"span",7),a(15,"Confirmed:"),o(),i(16,"span",8),a(17),o()(),i(18,"div",6)(19,"span",7),a(20),o(),g(21,H,2,1,"span",9),o(),i(22,"div",6)(23,"span",7),a(24,"Amount:"),o(),i(25,"span",8),a(26),o()(),i(27,"div",6)(28,"span",7),a(29,"Fee:"),o(),i(30,"span",8),a(31),o()()(),i(32,"a",10),a(33," View in explorer "),u(34,"fa-icon",11),o(),f()),t&2){let p,c,n=C();e(6),x(n.tx==null?null:n.tx.id),e(5),x(y(12,12,n.tx==null?null:n.tx.time,"dd.MM.yyyy, HH:mm:ss")),e(6),m(" ",n.tx==null?null:n.tx.confirmations," time",((n.tx==null?null:n.tx.confirmations)||0)!=1?"s":""," "),e(3),b("",!(n.tx==null||n.tx.amount==null)&&n.tx.amount.isPositive()?"Received on":"Sent to",":"),e(),s("ngIf",n.tx==null?null:n.tx.addresses),e(5),m(" ",n.tx==null||n.tx.amount==null||(p=n.tx.amount.abs())==null||(p=p.toNumber())==null?null:p.toFixed(n.coin==null?null:n.coin.decimals)," ",n.coin==null?null:n.coin.shortName," "),e(5),m(" ",n.tx==null||n.tx.fee==null||(c=n.tx.fee.toNumber())==null?null:c.toFixed(n.coin==null?null:n.coin.decimals)," ",n.coin==null?null:n.coin.shortName," "),e(),s("href","https://blockstream.info/tx/"+(n.tx==null?null:n.tx.id),h),e(2),s("icon",n.faArrowUpRightFromSquare)}}var tn=(()=>{let r=class r{constructor(c,n,l){this.wallet=c,this.route=n,this._location=l,this.loading=!0,this.badId=!1,this.faArrowLeft=A,this.faArrowUpRightFromSquare=j,this.window=window}ngOnInit(){let c=this.route.snapshot.queryParamMap.get("id");try{this.wallet.currentCoin(this.route).subscribe(n=>{if(!n||!c)return this._location.back();this.coin=n,this.wallet.getTransaction(n,c).pipe(O(()=>(this.badId=!0,this.loading=!1,M()))).subscribe(l=>{this.badId=!1,this.tx=l,this.loading=!1})})}catch{this.badId=!0,this.loading=!1}}};r.\u0275fac=function(n){return new(n||r)(d(D),d(F),d(I))},r.\u0275cmp=P({type:r,selectors:[["app-transaction"]],standalone:!0,features:[w],decls:4,vars:5,consts:[[3,"show"],["title","Transaction",3,"params"],["class","error",4,"ngIf"],[4,"ngIf"],[1,"error"],[1,"table"],[1,"row"],[1,"name"],[1,"content"],["class","content",4,"ngIf"],["target","_blank",1,"button","link",3,"href"],[1,"link__icon",3,"icon"],[4,"ngFor","ngForOf"]],template:function(n,l){n&1&&(u(0,"app-loader",0)(1,"app-wallet-header",1),g(2,L,2,0,"span",2)(3,W,35,15,"ng-container",3)),n&2&&(s("show",l.loading),e(),s("params",k(4,R)),e(),s("ngIf",l.badId),e(),s("ngIf",!l.badId))},dependencies:[T,z,U,E,N,S],styles:['*[_ngcontent-%COMP%]{margin:0;padding:0;box-sizing:border-box;outline:none;list-style:none;-webkit-tap-highlight-color:transparent}*[_ngcontent-%COMP%]::-webkit-scrollbar{width:3px;height:3px;background:none}*[_ngcontent-%COMP%]::-webkit-scrollbar-track{background:transparent}*[_ngcontent-%COMP%]::-webkit-scrollbar-thumb{transition:background-color .07s ease;background:#2b2e4a59;border-radius:3px}*[_ngcontent-%COMP%]::-webkit-scrollbar-thumb:hover{background:#2b2e4a8c}*[_ngcontent-%COMP%]::-webkit-scrollbar-button{height:5px;width:2px;background:none}html[_ngcontent-%COMP%], body[_ngcontent-%COMP%]{overflow-x:hidden}html[_ngcontent-%COMP%], body[_ngcontent-%COMP%]{height:100%}input[type=number][_ngcontent-%COMP%]::-webkit-inner-spin-button, input[type=number][_ngcontent-%COMP%]::-webkit-outer-spin-button{appearance:none;margin:0}.simple-notification[_ngcontent-%COMP%]{border-radius:15px;background:#fff!important;box-shadow:3px 3px 5px -2px #2b2e4a40}.simple-notification-wrapper[_ngcontent-%COMP%]{width:unset!important}.simple-notification[_ngcontent-%COMP%]   *[_ngcontent-%COMP%]{padding:0!important;color:#2b2e4a}.simple-notification[_ngcontent-%COMP%]   .notification[_ngcontent-%COMP%]{display:flex;align-items:center;justify-content:space-between;gap:20px}.simple-notification[_ngcontent-%COMP%]   .notification[_ngcontent-%COMP%]   .message[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:7px;padding:12px 0!important}.simple-notification[_ngcontent-%COMP%]   .notification[_ngcontent-%COMP%]   .message[_ngcontent-%COMP%]   .title[_ngcontent-%COMP%]{font-size:22px}.simple-notification[_ngcontent-%COMP%]   .notification[_ngcontent-%COMP%]   .message[_ngcontent-%COMP%]   .text[_ngcontent-%COMP%]{display:flex;align-items:center;gap:3px;font-size:16px}.simple-notification[_ngcontent-%COMP%]   .notification[_ngcontent-%COMP%]   .message[_ngcontent-%COMP%]   .text[_ngcontent-%COMP%]   img[_ngcontent-%COMP%]{margin-left:4px}.simple-notification[_ngcontent-%COMP%]   .notification__icon[_ngcontent-%COMP%]{display:flex;flex-direction:column;justify-content:center;align-items:center}.simple-notification[_ngcontent-%COMP%]   .notification__icon[_ngcontent-%COMP%]   fa-icon[_ngcontent-%COMP%]{font-size:42px}.input[_ngcontent-%COMP%]{padding:15px 25px;font-size:16px;font-weight:lighter;background:#f8f8f9;color:#2b2e4abf;border:none;border-radius:10px;transition:background-color .15s ease-in-out,box-shadow .15s ease-in-out;width:100%;margin:0 3px;font-family:Ubuntu,sans-serif}.input[_ngcontent-%COMP%]::placeholder{color:#2b2e4a59;letter-spacing:.05em}.input-wrapper[_ngcontent-%COMP%]:has(.input){display:block;position:relative;width:fit-content;height:fit-content;margin:0 3px}.input-wrapper[_ngcontent-%COMP%]:has(.input)   input[_ngcontent-%COMP%]{margin:unset}.input[_ngcontent-%COMP%] + .stepper[_ngcontent-%COMP%]{position:absolute;display:flex;flex-direction:column;justify-content:center;right:0;top:0;height:100%;width:20px;opacity:0;transition:opacity .15s ease-in-out}.input[_ngcontent-%COMP%] + .stepper[_ngcontent-%COMP%]:before, .input[_ngcontent-%COMP%] + .stepper[_ngcontent-%COMP%]:after{content:"";position:absolute;background:#2b2e4a12;top:0;bottom:0;margin:auto}.input[_ngcontent-%COMP%] + .stepper[_ngcontent-%COMP%]:before{width:70%;height:1px;right:0;left:0}.input[_ngcontent-%COMP%] + .stepper[_ngcontent-%COMP%]:after{width:1px;height:70%;left:-1px}.input[_ngcontent-%COMP%] + .stepper[_ngcontent-%COMP%]   .up[_ngcontent-%COMP%], .input[_ngcontent-%COMP%] + .stepper[_ngcontent-%COMP%]   .down[_ngcontent-%COMP%]{display:flex;justify-content:center;font-size:10px;opacity:.65;height:100%;width:100%;transition:opacity .1s ease,background-color .1s ease;cursor:pointer}.input[_ngcontent-%COMP%] + .stepper[_ngcontent-%COMP%]   .up[_ngcontent-%COMP%]:hover, .input[_ngcontent-%COMP%] + .stepper[_ngcontent-%COMP%]   .down[_ngcontent-%COMP%]:hover{background:#2b2e4a1a;opacity:.85}.input[_ngcontent-%COMP%] + .stepper[_ngcontent-%COMP%]   .up[_ngcontent-%COMP%]{padding-bottom:4px;align-items:flex-end;border-top-right-radius:10px}.input[_ngcontent-%COMP%] + .stepper[_ngcontent-%COMP%]   .down[_ngcontent-%COMP%]{padding-top:4px;align-items:flex-start;border-bottom-right-radius:10px}.input[_ngcontent-%COMP%]:not(.inactive):focus{background:#fff;box-shadow:1px 1px 5px -1px #2b2e4a40}.input[_ngcontent-%COMP%]:not(.inactive):focus.error{box-shadow:1px 1px 5px -1px #e8454540}.input[_ngcontent-%COMP%]:not(.inactive):hover + .stepper[_ngcontent-%COMP%]{opacity:1}.input[_ngcontent-%COMP%]:not(.inactive) + .stepper[_ngcontent-%COMP%]:hover{opacity:1}.input.inactive[_ngcontent-%COMP%]{pointer-events:none;color:#2b2e4a59}.input.inactive[_ngcontent-%COMP%] + .stepper[_ngcontent-%COMP%]{pointer-events:none}.input.error[_ngcontent-%COMP%]{color:#e84545bf;border:1px solid rgba(232,69,69,.3)}@media (pointer: coarse),(pointer: none){.input[_ngcontent-%COMP%] + .stepper[_ngcontent-%COMP%]{opacity:1}}.button[_ngcontent-%COMP%]{font-size:16px;font-weight:bolder;padding:14px 35px;background-color:#2b2e4a;text-decoration:none;display:flex;align-items:center;gap:10px;width:fit-content;border-radius:10px;text-transform:uppercase;transition:opacity .15s ease-in-out,color .07s ease-in-out;border:none;cursor:pointer;font-family:Ubuntu,sans-serif;letter-spacing:.05em;-webkit-user-select:none;user-select:none;position:relative}.button[_ngcontent-%COMP%], .button[_ngcontent-%COMP%]   .icon[_ngcontent-%COMP%]{color:#fff}.button[_ngcontent-%COMP%]   .icon[_ngcontent-%COMP%]{font-size:15px;transition:opacity .07s ease-in-out}.button[_ngcontent-%COMP%]:not(.loading):not(.inactive):hover{opacity:.93}.button.inactive[_ngcontent-%COMP%]{opacity:.5;cursor:default;pointer-events:none}.button.loading[_ngcontent-%COMP%]{color:transparent;cursor:progress}.button.loading[_ngcontent-%COMP%]   .icon[_ngcontent-%COMP%]{opacity:0}.button.loading[_ngcontent-%COMP%]   .loader[_ngcontent-%COMP%]{position:absolute;display:flex;align-items:center;justify-content:center;gap:.3em;width:100%;height:100%;border-radius:100%;margin:0 auto;top:0;left:0}.button.loading[_ngcontent-%COMP%]   .loader[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]{display:inline-block;width:.4em;height:.4em;border-radius:100%;background-color:#f9f7f7}.button.loading[_ngcontent-%COMP%]   .loader[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]:nth-child(1){animation:_ngcontent-%COMP%_bounce 1s ease-in-out infinite}.button.loading[_ngcontent-%COMP%]   .loader[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]:nth-child(2){animation:_ngcontent-%COMP%_bounce 1s ease-in-out .33s infinite}.button.loading[_ngcontent-%COMP%]   .loader[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]:nth-child(3){animation:_ngcontent-%COMP%_bounce 1s ease-in-out .66s infinite}.button--side[_ngcontent-%COMP%]{background:#fff;border:1px solid #2B2E4A;color:#2b2e4a}.button--side[_ngcontent-%COMP%]   .icon[_ngcontent-%COMP%]{color:#2b2e4a}@keyframes _ngcontent-%COMP%_bounce{0%,75%,to{transform:translateY(0)}25%{transform:translateY(-100%)}}@media (max-width: 525px){.button[_ngcontent-%COMP%]   .header[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%]{font-size:24px}.button[_ngcontent-%COMP%]   .input[_ngcontent-%COMP%]{font-size:18px;line-height:1.6}}.checkbox[_ngcontent-%COMP%]{display:inline-block;width:calc(var(--size, 1) * 22px);position:relative}.checkbox.disabled[_ngcontent-%COMP%]{pointer-events:none}.checkbox.disabled[_ngcontent-%COMP%]:not(:has(input:checked)){--background: rgba(43, 46, 74, .1)}.checkbox.disabled[_ngcontent-%COMP%]:has(input:checked){--background: rgba(43, 46, 74, .2);opacity:.5}.checkbox[_ngcontent-%COMP%]:after{content:"";width:100%;padding-top:100%;display:block}.checkbox[_ngcontent-%COMP%]   *[_ngcontent-%COMP%]{position:absolute}.checkbox[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]{appearance:none;cursor:pointer;background-color:var(--background, #fff);border-radius:4px;border:calc(var(--new-border, 1) * 1px) solid;color:var(--new-border-color, #d1d6ee);outline:none;margin:0;padding:0;transition:border .1s linear,color .1s linear}.checkbox[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:hover, .checkbox[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:checked{--new-border: 2}.checkbox[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:hover{--new-border-color: rgba(96, 126, 170, .3)}.checkbox[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:checked{--new-border-color: #2B2E4A;transition-delay:.2307692308s}.checkbox[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:checked + svg[_ngcontent-%COMP%]{--dash-array: 16 93;--dash-offset: 109}.checkbox[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%]{fill:none;left:0;pointer-events:none;stroke:var(--stroke, #2B2E4A);stroke-dasharray:var(--dash-array, 93);stroke-dashoffset:var(--dash-offset, 94);stroke-linecap:round;stroke-linejoin:round;stroke-width:2px;top:0;transition:stroke-dasharray .3s,stroke-dashoffset .3s}.checkbox[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%], .checkbox[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]{display:block;height:100%;width:100%}.control[_ngcontent-%COMP%]{width:50px;height:50px;border-radius:10px;background:#f8f8f9;border:none;cursor:pointer;display:flex;justify-content:center;align-items:center}.control[_ngcontent-%COMP%]   fa-icon[_ngcontent-%COMP%], .control[_ngcontent-%COMP%]   img[_ngcontent-%COMP%], .control[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%]{transition:color .15s ease-in-out;font-size:19px;color:#2b2e4a99}.control[_ngcontent-%COMP%]:hover   fa-icon[_ngcontent-%COMP%], .control[_ngcontent-%COMP%]:hover   img[_ngcontent-%COMP%], .control[_ngcontent-%COMP%]:hover   svg[_ngcontent-%COMP%]{color:#2b2e4acc}[_ngcontent-%COMP%]:root{font-family:Ubuntu,sans-serif;color:#2b2e4a}.shine[_ngcontent-%COMP%]{display:inline-block;position:relative;background:#f6f7f8 linear-gradient(to right,#f6f7f8,#edeef1 20%,#f6f7f8 40% 100%) no-repeat;background-size:200% 104px;animation:_ngcontent-%COMP%_placeholderShimmer 1.5s linear forwards infinite}@keyframes _ngcontent-%COMP%_placeholderShimmer{0%{background-position:150% 0}to{background-position:-150% 0}}[_nghost-%COMP%]{overflow-y:auto;padding:35px 45px 10px;display:flex;flex-direction:column;align-items:center;height:100%}@media (max-width: 425px){[_nghost-%COMP%]{padding:30px 10px}}.header[_ngcontent-%COMP%]{display:flex;align-items:center;justify-content:center;position:relative;width:100%}.header__title[_ngcontent-%COMP%], .header[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%]{font-size:30px;font-weight:500}.header__back[_ngcontent-%COMP%], .header[_ngcontent-%COMP%]   fa-icon[_ngcontent-%COMP%], .header[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]{position:absolute;left:0;font-size:20px;color:#2b2e4a99;cursor:pointer;transition:background-color .15s ease-in-out,color .15s ease-in-out;width:35px;height:35px;display:flex;align-items:center;justify-content:center;border-radius:50%}.header__back[_ngcontent-%COMP%]:hover, .header[_ngcontent-%COMP%]   fa-icon[_ngcontent-%COMP%]:hover, .header[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:hover{background:#2b2e4a12;color:#2b2e4ab3}[_nghost-%COMP%]{padding:35px 30px 10px;gap:50px}.table[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:30px}.table[_ngcontent-%COMP%]   .row[_ngcontent-%COMP%]{display:grid;align-items:flex-start;grid-template-columns:minmax(95px,130px) minmax(180px,1fr)}.table[_ngcontent-%COMP%]   .row[_ngcontent-%COMP%]   .name[_ngcontent-%COMP%]{width:95px;grid-row:1;font-size:16px}.table[_ngcontent-%COMP%]   .row[_ngcontent-%COMP%]   .content[_ngcontent-%COMP%]{word-wrap:break-word;min-width:180px;grid-row:1;font-size:14px;font-weight:500;max-height:125px;overflow-y:auto}']});let t=r;return t})();export{tn as TransactionComponent};