(function(){
'use strict';
var U=window.U,S=U.S,esc=U.esc,pill=U.pill,TODAY=U.TODAY,fmt=U.fmt,head=U.head,diff=U.diff,lab=function(l,v){for(var i=0;i<l.length;i++)if(l[i][0]===v)return l[i][1];return '';};
function po(id){return S.posts.filter(function(p){return p.id===id;})[0];}
var CT=[['review','Review','check'],['calendar','Calendar','cal'],['alerts','Alerts','bell'],['files','Files','folder'],['handover','Handover','lock'],['invoices','Invoices','lock']];
U.clientDoor=function(){
  var cd=S.cd,c=S.clients[0];
  var bar='<div class="cd-top"><div class="row" style="gap:10px"><div style="width:26px;height:34px">'+U.MARK+'</div><span class="nm">Unscrollable</span></div>'+(cd.signed?'<div class="row" style="gap:12px"><span class="mut">Reviewing for <b style="color:var(--fg)">'+esc(c.name)+'</b></span><span class="chip">'+U.icon('tick').replace('<path d="M5 12l4 4 10-10"/>','<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>')+'Private link</span></div>':'')+'</div>';
  if(!cd.signed){
    if(cd.step==='email')return '<div style="max-width:420px;margin:6vh auto 0">'+bar+'<div class="card stack"><h1 style="font-size:22px">Sign in</h1><p class="mut" style="margin:0">Enter your work email. We send a one-time code. No password.</p><label class="f">Work email<input id="cd_em" type="email" value="ravi@meridianforge.example"></label><button type="button" class="btn pri" data-act="cdsend">Send code</button><div class="sm mut">Prototype: any email works. A guest link from your reviewer skips this step.</div></div></div>';
    return '<div style="max-width:420px;margin:6vh auto 0">'+bar+'<div class="card stack"><h1 style="font-size:22px">Enter your code</h1><p class="mut" style="margin:0">We sent a 6-digit code to your email.</p><label class="f">Code<input id="cd_code" inputmode="numeric" value="482913"></label><button type="button" class="btn pri" data-act="cdsign">Sign in</button></div></div>';
  }
  var inReview=S.posts.filter(function(p){return p.client===c.id&&p.status==='review';}).length;
  var side='<aside class="cd-side" aria-label="Client menu"><div class="row" style="gap:10px;padding:4px 8px 12px"><div style="width:26px;height:34px">'+U.MARK+'</div><span class="nm">Unscrollable</span></div><nav class="cd-nav">'+CT.map(function(t){return '<button type="button" data-act="cdtab" data-id="'+t[0]+'"'+(cd.tab===t[0]?' aria-current="page"':'')+'>'+U.icon(t[2])+'<span>'+t[1]+'</span>'+(t[0]==='review'&&inReview?'<span class="cnt">'+inReview+'</span>':'')+'</button>';}).join('')+'</nav><div class="cd-who"><div class="u-av" style="width:34px;height:34px;font-size:13px">'+esc(U.initials(c.person))+'</div><div style="min-width:0"><b style="display:block;overflow:hidden;text-overflow:ellipsis">'+esc(c.person)+'</b><button type="button" class="lnkb" data-act="cdout">Sign out</button></div></div></aside>';
  var top='<div class="cd-top"><h1 style="font-size:26px">'+esc(lab(CT,cd.tab))+'</h1><div class="row" style="gap:12px"><span class="mut">Reviewing for <b style="color:var(--fg)">'+esc(c.name)+'</b></span><span class="chip">'+U.icon('lock')+'Private link</span></div></div>';
  return '<div class="cd-shell">'+side+'<div class="cd-main">'+top+cdBody(cd,c)+'</div></div>';
};
function cdBody(cd,c){
  var ps=S.posts.filter(function(p){return p.client===c.id;});
  if(cd.tab==='review'){
    var open=ps.filter(function(p){return p.status==='review'||p.status==='feedback'||p.status==='approved';});
    var p=po(cd.post)||open[0];
    var h='<div class="row" style="margin-bottom:12px">'+open.map(function(x){return '<button type="button" class="btn sm" data-act="cdpost" data-id="'+x.id+'" aria-pressed="'+(p&&p.id===x.id)+'">'+esc(x.title)+'</button>';}).join('')+'</div>';
    if(!p)return h+'<div class="empty">Nothing waiting for you. We will email you when a post is ready.</div>';
    var st=p.status==='review'?pill('Sent for review',''):p.status==='approved'?pill('Approved','good'):pill('Changes requested','warn');
    var idx=open.indexOf(p)+1;
    h+='<div class="row" style="margin-bottom:12px">'+st+'<div class="tabs"><button type="button" data-act="cdmode" data-v="desktop" aria-pressed="'+(cd.mode==='desktop')+'">Desktop</button><button type="button" data-act="cdmode" data-v="mobile" aria-pressed="'+(cd.mode==='mobile')+'">Mobile</button></div></div>';
    h+='<div class="cd-grid"><div style="overflow-x:auto">'+U.liPreview(p,{mode:cd.mode,interactive:p.status==='review',sel:cd.sel})+'</div><div class="stack" style="gap:12px"><h2>Your comment</h2>';
    if(p.status==='review'){
      h+='<div class="card stack" style="gap:10px">'+(cd.selT?'<div><span class="ctx">On: "'+esc(cd.selT)+'"</span> <button type="button" class="btn sm" data-act="cpick" data-i="-1" data-t="">Clear</button></div>':'<div class="mut sm">General comment</div>')+'<label class="f">Comment<textarea id="cd_cm" placeholder="Type what you would change. Short is fine."></textarea></label></div><div class="mut sm">Select any line in the post to comment on it. Nothing is published until you approve and we schedule it.</div>';
    }
    if(p.comments.length)h+='<div class="list">'+p.comments.map(function(x){return '<div class="item"><div class="mn"><div class="t">'+esc(x.who)+'</div><div class="d">'+esc(x.t)+(x.on?' (on "'+esc(x.on)+'")':'')+'</div></div></div>';}).join('')+'</div>';
    h+='</div></div>';
    h+='<div class="cd-bar"><span class="mut">Version '+p.vers[0].n+' · Post '+idx+' of '+open.length+'</span>'+(p.status==='review'?'<span class="row"><button type="button" class="btn" data-act="cdchanges" data-id="'+p.id+'">Request changes</button><button type="button" class="btn pri" data-act="cdapprove" data-id="'+p.id+'">'+U.icon('tick')+' Approve this post</button></span>':'<span class="mut sm">No action needed on this post.</span>')+'</div>';
    return h;
  }
  if(cd.tab==='alerts')return '<div class="list">'+[['A new post is ready for review','Today'],['Your profile banner was updated','3 days ago'],['Welcome to your workspace','24 days ago']].map(function(r){return '<div class="item"><div class="mn"><div class="t">'+r[0]+'</div></div><div class="sd mut sm">'+r[1]+'</div></div>';}).join('')+'</div><div class="sm mut" style="margin-top:8px">The same alerts reach you by email.</div>';
  if(cd.tab==='calendar')return calendar(cd,c,ps);
  if(cd.tab==='files')return '<div class="list">'+c.assets.map(function(a){return '<div class="item"><div class="mn"><div class="t">'+esc(a[0])+'</div><div class="d">'+a[2]+'</div></div></div>';}).join('')+'</div><div class="sm mut" style="margin-top:8px">Upload brand files here. For video, paste a link to where you keep it.</div>';
  if(cd.tab==='handover')return '<div class="banner">Locked. Your handover pack (posts, images, approval history, stats) unlocks if you ever leave, with a 30-day download link.</div>';
  return '<div class="banner">Locked until billing is switched on.</div>';
}
var MN=['January','February','March','April','May','June','July','August','September','October','November','December'];
function calendar(cd,c,ps){
  var t=new Date(TODAY+'T12:00:00Z');
  if(!cd.cal)cd.cal={y:t.getUTCFullYear(),m:t.getUTCMonth()};
  var y=cd.cal.y,m=cd.cal.m;
  var first=new Date(Date.UTC(y,m,1,12)),dow=(first.getUTCDay()+6)%7,dim=new Date(Date.UTC(y,m+1,0,12)).getUTCDate();
  var ev={};
  function put(d,o){(ev[d]=ev[d]||[]).push(o);}
  ps.filter(function(p){return p.status!=='draft';}).forEach(function(p){put(p.date,{k:'post',id:p.id,t:p.title,s:p.status});});
  put(U.add(9),{k:'call',t:'Monthly check-in call (sample)'});put(U.add(12),{k:'due',t:'Brand assets due (sample)'});
  var cells=Math.ceil((dow+dim)/7)*7,h='';
  var stc={review:'',feedback:'warn',approved:'good',scheduled:'good',published:'mut'};
  var days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  h+='<div class="row" style="justify-content:space-between;margin-bottom:14px"><h2>'+MN[m]+' '+y+'</h2><div class="row"><button type="button" class="btn sm" data-act="calnav" data-d="-1" aria-label="Previous month">'+U.icon('left')+'</button><button type="button" class="btn sm" data-act="calnav" data-d="0">Today</button><button type="button" class="btn sm" data-act="calnav" data-d="1" aria-label="Next month">'+U.icon('right')+'</button></div></div>';
  h+='<div class="cal"><div class="cal-h">'+days.map(function(d){return '<div>'+d+'</div>';}).join('')+'</div><div class="cal-g">';
  for(var i=0;i<cells;i++){
    var dn=i-dow+1,inm=dn>=1&&dn<=dim;var dt=new Date(Date.UTC(y,m,dn,12));var iso=dt.getUTCFullYear()+'-'+('0'+(dt.getUTCMonth()+1)).slice(-2)+'-'+('0'+dt.getUTCDate()).slice(-2);
    var es=(ev[iso]||[]).map(function(e){return e.k==='post'?'<button type="button" class="ce '+stc[e.s]+'" data-act="calpost" data-id="'+e.id+'" title="'+esc(e.t)+'">'+esc(e.t)+'</button>':'<div class="ce '+(e.k==='call'?'':'mut')+'" title="'+esc(e.t)+'">'+esc(e.t)+'</div>';}).join('');
    h+='<div class="cd'+(inm?'':' out')+(iso===TODAY?' today':'')+'"><span class="dn">'+dt.getUTCDate()+'</span>'+es+'</div>';
  }
  h+='</div></div><div class="row" style="margin-top:12px;gap:14px"><span class="row sm mut"><span class="pill">Sent for review</span><span class="pill warn">Changes requested</span><span class="pill good">Approved or scheduled</span><span class="pill mut">Published</span></span></div>';
  return h;
}
U.acts.calnav=function(el){var d=+el.getAttribute('data-d');if(d===0){S.cd.cal=null;}else{var m=S.cd.cal.m+d,y=S.cd.cal.y;if(m<0){m=11;y--;}if(m>11){m=0;y++;}S.cd.cal={y:y,m:m};}U.render();};
U.acts.calpost=function(el){S.cd.post=el.getAttribute('data-id');S.cd.tab='review';S.cd.sel=null;S.cd.selT='';U.render();};
U.acts.cdsend=function(){S.cd.step='code';U.render();};
U.acts.cdsign=function(){S.cd.signed=true;U.render();};
U.acts.cdout=function(){S.cd.signed=false;S.cd.step='email';U.render();};
U.acts.cdtab=function(el){S.cd.tab=el.getAttribute('data-id');U.render();};
U.acts.cdpost=function(el){S.cd.post=el.getAttribute('data-id');S.cd.sel=null;S.cd.selT='';U.render();};
U.acts.cdmode=function(el){S.cd.mode=el.getAttribute('data-v');U.render();};
U.acts.cpick=function(el){var i=+el.getAttribute('data-i');var cm=document.getElementById('cd_cm');S.cd.draftC=cm?cm.value:'';S.cd.sel=i<0?null:i;S.cd.selT=el.getAttribute('data-t');U.render();var c2=document.getElementById('cd_cm');if(c2)c2.value=S.cd.draftC||'';};
function who(){return S.clients[0].person;}
U.acts.cdapprove=function(el){var p=po(el.getAttribute('data-id'));p.status='approved';p.since=TODAY;S.inbox.unshift({id:U.uid('i'),post:p.id,kind:'approved',text:who()+' approved "'+p.title+'" (v'+p.vers[0].n+')',at:TODAY,read:false});p.log=(p.log||[]);p.log.unshift('Approved by '+who()+' on '+fmt(TODAY));S.cd.sel=null;S.cd.selT='';U.save();U.render();U.alertDiscord('#alerts',who()+' approved "'+p.title+'".');};
U.acts.cdchanges=function(el){var p=po(el.getAttribute('data-id'));var t=(document.getElementById('cd_cm').value||'').trim();if(!t){U.toast('Add a comment so we know what to change.');return;}
  p.comments.push({who:who(),t:t,on:S.cd.selT||''});p.status='feedback';p.since=TODAY;S.inbox.unshift({id:U.uid('i'),post:p.id,kind:'feedback',text:who()+' asked for a change on "'+p.title+'"',at:TODAY,read:false});S.cd.sel=null;S.cd.selT='';U.save();U.render();U.alertDiscord('#alerts',who()+' requested changes on "'+p.title+'".');};
})();
