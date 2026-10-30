/* ---------- ONBOARDING, NDAS, CONTRACTS (added 2026-10-23) ---------- */
(function(){
var U=window.U,S=U.S,esc=U.esc,pill=U.pill;
var FO=['Tabish','Ali','Mehak'];
function head(t,sub){return '<div class="head"><div><h1>'+esc(t)+'</h1>'+(sub?'<div class="sub">'+sub+'</div>':'')+'</div></div>';}
function opt(list,v){return list.map(function(x){return '<option'+(x===v?' selected':'')+'>'+esc(x)+'</option>';}).join('');}
function lg(){if(!S.legal)S.legal=seedLegal();return S.legal;}
function seedLegal(){
  return {
   onb:{
    client:[['Service agreement signed','Contracts','Tabish',true],['NDA signed','NDAs','Tabish',true],['Payment path and first invoice','Billing','Tabish',false],['Intake form received','Client','Ali',true],['Brand assets logged in the workspace','Mehak','Mehak',false],['LinkedIn access method agreed (no shared passwords)','Client','Tabish',false],['Kickoff call held, notes saved','Call','Ali',false],['First batch brief approved by two founders','Delivery','Mehak',false]],
    team:[['Discord invite sent and Founder role set','Tabish','Tabish',true],['Master app login created (ID and password, two-factor)','Tabish','Tabish',false],['Shared mailbox alias set up','Tabish','Tabish',false],['Reads the founders README and SOPs','Self','Mehak',false],['Founder agreement signed by all three','Contracts','Tabish',false]]
   },
   ndas:[
    {id:'n1',party:'Meridian Forge (sample)',kind:'Mutual',status:'signed',on:'2026-10-14',by:'Tabish'},
    {id:'n2',party:'Prospect on a call (sample)',kind:'Mutual',status:'sent',on:'2026-10-21',by:'Ali'}
   ],
   docs:[
    {id:'d1',title:'Client service agreement',party:'Template',status:'draft',owner:'Tabish',ok:{Tabish:true,Ali:false,Mehak:false}},
    {id:'d2',title:'Statement of work (per client)',party:'Template',status:'draft',owner:'Tabish',ok:{Tabish:true,Ali:false,Mehak:false}},
    {id:'d3',title:'Mutual NDA template',party:'Template',status:'draft',owner:'Tabish',ok:{Tabish:true,Ali:false,Mehak:false}},
    {id:'d4',title:'Founder agreement (equity, vesting, leaver terms)',party:'Tabish, Ali, Mehak',status:'draft',owner:'Tabish',ok:{Tabish:false,Ali:false,Mehak:false}},
    {id:'d5',title:'Ladder framework licence to Unscrollable',party:'Tabish and Unscrollable',status:'draft',owner:'Tabish',ok:{Tabish:true,Ali:true,Mehak:true}}
   ]
  };
}
U.screens.onboarding=function(){
  var L=lg(),tab=S.ui.obt||'client',steps=L.onb[tab];
  var done=steps.filter(function(s){return s[3];}).length;
  var h=head('Onboarding','One checklist per new client or team member. Each step has an owner. Nothing is skipped because someone forgot.');
  h+='<div class="seg" role="group">'+[['client','New client'],['team','New team member']].map(function(t){return '<button type="button" data-act="obtab" data-id="'+t[0]+'" aria-pressed="'+(tab===t[0])+'">'+t[1]+'</button>';}).join('')+'</div>';
  h+='<div class="card"><div class="row" style="justify-content:space-between"><h3>'+(tab==='client'?'Meridian Forge (sample client)':'Mehak (sample)')+'</h3>'+pill(done+' of '+steps.length,done===steps.length?'good':'')+'</div><div class="list" style="margin-top:10px">'+steps.map(function(s,i){return '<div class="row" style="justify-content:space-between;padding:8px 0;border-top:1px solid var(--line)"><label style="display:flex;gap:10px;align-items:center;flex:1;min-width:0"><input type="checkbox" style="width:20px;height:20px;min-width:20px;padding:0;flex:none;margin:0" data-act="obtick" data-id="'+i+'"'+(s[3]?' checked':'')+'><span'+(s[3]?' class="mut"':'')+'>'+esc(s[0])+'</span></label><span class="row" style="gap:6px">'+pill(s[1])+pill(s[2])+'</span></div>';}).join('')+'</div></div>';
  h+='<div class="sm mut">Sample steps. A client onboarding starts the day a contract is signed. It ends when the first batch brief is approved by two founders.</div>';
  return '<div class="stack">'+h+'</div>';
};
U.acts.obtab=function(el){S.ui.obt=el.getAttribute('data-id');U.render();};
U.acts.obtick=function(el){var t=S.ui.obt||'client';var s=lg().onb[t][+el.getAttribute('data-id')];s[3]=!s[3];U.save();U.render();};

U.screens.ndas=function(){
  var L=lg();
  var h=head('NDAs','Who has signed what, and when. A mutual NDA goes out before any call that covers client work.');
  h+='<div class="banner">Sample wording only. A lawyer reads the final template before it goes to anyone. The app records the status. It does not send the NDA for you.</div>';
  h+='<div class="card scroll"><table class="tbl"><thead><tr><th>Party</th><th>Type</th><th>Status</th><th>Date</th><th>Sent by</th><th></th></tr></thead><tbody>'+L.ndas.map(function(n){return '<tr><td>'+esc(n.party)+'</td><td>'+esc(n.kind)+'</td><td>'+pill(n.status==='signed'?'Signed':n.status==='sent'?'Sent':'Draft',n.status==='signed'?'good':'')+'</td><td class="tn">'+esc(n.on)+'</td><td>'+esc(n.by)+'</td><td>'+(n.status==='signed'?'':'<button type="button" class="btn sm" data-act="ndasign" data-id="'+n.id+'">Mark signed</button>')+'</td></tr>';}).join('')+'</tbody></table></div>';
  h+='<div class="card"><h3 style="margin-bottom:8px">Log a new NDA</h3><div class="row"><div style="flex:1;min-width:200px"><label class="f">Party<input id="nd_p"></label></div><label class="f">Type<select id="nd_k">'+opt(['Mutual','One way (we disclose)','One way (they disclose)'],'Mutual')+'</select></label><label class="f">Sent by<select id="nd_b">'+opt(FO,S.who)+'</select></label><button type="button" class="btn pri" data-act="ndaadd">Add</button></div></div>';
  return '<div class="stack">'+h+'</div>';
};
U.acts.ndasign=function(el){var n=lg().ndas.filter(function(x){return x.id===el.getAttribute('data-id');})[0];n.status='signed';n.on=U.TODAY;U.save();U.render();U.toast('Marked signed.');};
U.acts.ndaadd=function(){var g=function(i){return document.getElementById(i).value.trim();};if(!g('nd_p')){U.toast('Name the party.');return;}lg().ndas.unshift({id:U.uid('n'),party:g('nd_p'),kind:g('nd_k'),status:'sent',on:U.TODAY,by:g('nd_b')});U.save();U.render();};

U.screens.contracts=function(){
  var L=lg();
  var h=head('Contracts','Client agreements and the founders\' own documents. Each one needs all three founders to approve before it is used.');
  h+='<div class="banner">Sample list. Status is recorded by hand. Nothing here is legal advice, and the final wording needs a lawyer.</div>';
  h+='<div class="grid g2">'+L.docs.map(function(d){var all=FO.every(function(f){return d.ok[f];});return '<div class="card"><div class="row" style="justify-content:space-between"><h3>'+esc(d.title)+'</h3>'+pill(all?'Approved':'Draft',all?'good':'')+'</div><p class="mut" style="margin:6px 0">'+esc(d.party)+'. Owner: '+esc(d.owner)+'.</p><div class="row" style="gap:6px;flex-wrap:wrap">'+FO.map(function(f){return '<button type="button" class="btn sm'+(d.ok[f]?' pri':'')+'" data-act="docok" data-id="'+d.id+'" data-w="'+f+'" aria-pressed="'+!!d.ok[f]+'">'+f+(d.ok[f]?' approved':' to approve')+'</button>';}).join('')+'</div></div>';}).join('')+'</div>';
  h+='<div class="sm mut">Approval buttons are for the prototype. In the real app each founder can only press their own, and the press is logged with the version.</div>';
  return '<div class="stack">'+h+'</div>';
};
U.acts.docok=function(el){var d=lg().docs.filter(function(x){return x.id===el.getAttribute('data-id');})[0];var w=el.getAttribute('data-w');d.ok[w]=!d.ok[w];U.save();U.render();};
})();
