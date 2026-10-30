(function(){
'use strict';
var U=window.U,S=U.S,esc=U.esc,pill=U.pill,TODAY=U.TODAY,diff=U.diff,fmt=U.fmt,lab=U.lab,head=U.head,opt=U.opt,icon=U.icon,STAGES=U.STAGES,POST_ST=U.POST_ST;
function cl(id){return S.clients.filter(function(c){return c.id===id;})[0];}
function po(id){return S.posts.filter(function(c){return c.id===id;})[0];}
function stPill(s){var m={draft:'mut',review:'',feedback:'warn',approved:'good',scheduled:'solid',published:'ink'};return pill(lab(POST_ST,s),m[s]||'');}

/* ---------- linkedin preview (shared with Client door) ---------- */
U.liPreview=function(p,o){
  var c=cl(p.client);o=o||{};
  var w=o.mode==='mobile'?340:520;
  var tok=p.body.match(/[^.!?\n]+[.!?]*|\s+/g)||[p.body];
  var hits={};(p.comments||[]).forEach(function(x){if(x.on)hits[x.on.trim()]=1;});
  var body=tok.map(function(t,i){
    if(!t.trim())return esc(t);
    var cls=(hits[t.trim()]?'hit':'')+(o.sel===i?' sel':'');
    return o.interactive?'<span role="button" tabindex="0" data-act="cpick" data-i="'+i+'" data-t="'+esc(t.trim())+'" class="'+cls+'" style="cursor:pointer">'+esc(t)+'</span>':'<span class="'+cls+'">'+esc(t)+'</span>';
  }).join('');
  return '<div class="li" style="max-width:'+w+'px"><div class="h"><div class="av">'+esc(U.initials(c.person))+'</div><div><div class="nm">'+esc(c.person)+'</div><div class="hl">'+esc(c.headline)+'</div><div class="hl">Draft preview</div></div></div><div class="bd">'+body+'</div><div class="ft"><span>Like</span><span>Comment</span><span>Repost</span><span>Send</span></div></div>';
};

/* ---------- CLIENTS ---------- */
var CTABS=[['overview','Overview'],['profile','Profile'],['posts','Posts'],['outreach','Outreach templates'],['assets','Brand assets'],['guides','Guides'],['uploads','Uploads'],['approvals','Approvals'],['access','Access'],['offboard','Offboarding']];
U.screens.clients=function(){
  var c=S.ui.client?cl(S.ui.client):null;
  if(!c){
    var h=head('Clients','One card per client: plan, delivery status, what is due, and what we are waiting on.','<span class="pill mut">Sample clients</span>');
    h+='<div class="grid g2">'+S.clients.map(function(c){
      var ps=S.posts.filter(function(p){return p.client===c.id;});
      var sch=ps.filter(function(p){return p.status==='approved'||p.status==='scheduled';}).length;
      var pub=ps.filter(function(p){return p.status==='published';}).length;
      var days=['M','T','W','T','F','S','S'];var dow=(new Date().getDay()+6)%7;
      var wk=days.map(function(d,i){var on=ps.some(function(p){var k=diff(p.date,TODAY)+dow;return k===i&&p.status!=='draft';});return '<div>'+d+'<i class="'+(on?'on':'')+'"></i></div>';}).join('');
      return '<div class="card stack" style="gap:16px"><div class="row" style="gap:12px;flex-wrap:nowrap"><div class="u-av">'+esc(U.initials(c.name))+'</div><div style="min-width:0;flex:1"><h2>'+esc(c.name)+'</h2><div class="mut sm">'+esc(c.person)+' · '+esc(c.plan)+'</div></div>'+pill(c.status==='active'?'Active':c.status==='onboarding'?'Onboarding':'Leaving',c.status==='active'?'good':c.status==='onboarding'?'':'warn')+'</div>'
       +'<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px"><div class="tile q"><b class="tn">'+sch+'</b><span>Scheduled</span></div><div class="tile q"><b class="tn">'+ps.length+'</b><span>Posts</span></div><div class="tile q"><b class="tn">'+pub+'</b><span>Published</span></div></div>'
       +'<div class="week">'+wk+'</div><div class="mut sm">Waiting on: '+esc(c.waiting)+'</div>'
       +'<div class="row"><button type="button" class="btn" data-act="copen" data-id="'+c.id+'">Open workspace</button><button type="button" class="btn" data-act="cshare" data-id="'+c.id+'">Share</button></div></div>';
    }).join('')+'</div>';
    return '<div class="stack">'+h+'</div>';
  }
  var h2='<div class="row"><button type="button" class="btn sm" data-act="cback">All clients</button></div>'+head(c.name,esc(c.person)+' · '+esc(c.plan)+' · '+esc(c.headline),pill(c.status==='active'?'Active':c.status==='onboarding'?'Onboarding':'Leaving',c.status==='active'?'good':c.status==='onboarding'?'':'warn'));
  h2+='<div class="tabs" role="group" aria-label="Workspace">'+CTABS.map(function(t){return '<button type="button" data-act="ctab" data-id="'+t[0]+'" aria-pressed="'+(S.ui.ctab===t[0])+'">'+t[1]+'</button>';}).join('')+'</div>';
  return '<div class="stack">'+h2+'<div>'+ctab(c)+'</div></div>';
};
U.acts.cshare=function(el){S.cd.post=(S.posts.filter(function(p){return p.client===el.getAttribute('data-id')&&p.status==='review';})[0]||{}).id||S.cd.post;U.copy('https://review.unscrollable.studio/r/'+S.cd.post,el);};
U.acts.copen=function(el){S.ui.client=el.getAttribute('data-id');S.ui.ctab='overview';U.render();};
U.acts.cback=function(){S.ui.client=null;U.render();};
U.acts.ctab=function(el){S.ui.ctab=el.getAttribute('data-id');U.render();};
function list(rows){return '<div class="list">'+(rows.length?rows.join(''):'<div class="empty">Nothing here yet.</div>')+'</div>';}
function it(t,d,r){return '<div class="item"><div class="mn"><div class="t">'+esc(t)+'</div>'+(d?'<div class="d">'+esc(d)+'</div>':'')+'</div><div class="sd">'+(r||'')+'</div></div>';}
function ctab(c){
  var t=S.ui.ctab,ps=S.posts.filter(function(p){return p.client===c.id;});
  if(t==='overview'){
    var pct=Math.round(c.storage/500*100);
    return '<div class="grid g3"><div class="card tile"><b class="tn">'+ps.length+'</b><span>Posts</span></div><div class="card tile"><b class="tn">'+ps.filter(function(p){return p.status==='approved'||p.status==='scheduled';}).length+'</b><span>Approved or scheduled</span></div><div class="card tile"><b class="tn">'+c.members.length+'/5</b><span>People with access</span></div></div>'
     +'<div class="grid g2" style="margin-top:12px"><div class="card"><h3>Waiting on</h3><p style="margin:6px 0 0">'+esc(c.waiting)+'</p></div><div class="card"><h3>Storage</h3><div class="bar'+(pct>=70?' warn':'')+'" style="margin:10px 0 6px"><i style="width:'+pct+'%"></i></div><div class="sm mut">'+c.storage+' MB of about 500 MB per client estimate. Alert at 70 percent.</div></div></div>';
  }
  if(t==='profile')return '<div class="card"><h3 style="margin-bottom:8px">Profile optimization</h3>'+list(c.profile.map(function(r){return it(r[0],'',pill(r[1],r[1]==='Done'?'good':r[1]==='In review'?'warn':'mut'));}))+'</div>';
  if(t==='posts')return list(ps.map(function(p){return '<button type="button" class="item" data-act="postopen" data-id="'+p.id+'"><div class="mn"><div class="t">'+esc(p.title)+'</div><div class="d">Planned '+fmt(p.date)+'</div></div><div class="sd">'+stPill(p.status)+'</div></button>';}));
  if(t==='outreach')return list(c.templates.map(function(r){return it(r[0],'',pill(r[1],r[1]==='Approved'?'good':'mut'));}));
  if(t==='assets')return '<div class="banner" style="margin-bottom:10px">Logged once per client. Every post and template reuses them.</div>'+list(c.assets.map(function(r){return it(r[0],r[1]+' · '+r[2],'');}));
  if(t==='guides')return list(c.guides.map(function(r){return it(r[0],r[1],'');}));
  if(t==='uploads')return '<div class="banner" style="margin-bottom:10px">Clients upload here. Files go to R2 under one folder per client, with expiring download links. No raw video: link to where the client keeps it.</div>'+list(c.uploads.map(function(r){return it(r[0],r[1],'');}));
  if(t==='approvals'){var rows=[];ps.forEach(function(p){(p.log||[]).forEach(function(l){rows.push(it(p.title,l,''));});});S.inbox.forEach(function(i){var p=po(i.post);if(p&&p.client===c.id&&i.kind==='approved')rows.push(it(p.title,i.text+' · '+fmt(i.at),pill('Approved','good')));});return list(rows);}
  if(t==='access'){
    var ar=90-((diff(TODAY,c.since))%90);
    var h='<div class="card"><h3 style="margin-bottom:8px">People</h3><div class="list">'+c.members.map(function(m,i){return '<div class="item"><div class="mn"><div class="t">'+esc(m[0])+'</div><div class="d">'+esc(m[1])+'</div></div><button type="button" class="btn sm bad" data-act="mrem" data-i="'+i+'">Remove now</button></div>';}).join('')+'</div>'
     +'<div class="row" style="margin-top:10px"><div style="flex:1;min-width:180px"><label class="f">Add by work email<input id="mem" type="email" placeholder="name@company.com"></label></div><button type="button" class="btn pri" style="align-self:flex-end" data-act="madd">Add reviewer</button></div><div class="sm mut" style="margin-top:6px">Sign-in is an emailed code. No passwords. Max 5 people.</div></div>';
    h+='<div class="card" style="margin-top:12px"><h3>90-day access review</h3><p class="mut" style="margin:6px 0 10px">Next review in '+ar+' days. The app lists everyone with access and asks Tabish to confirm or remove.</p><button type="button" class="btn" data-act="mreview">Confirm everyone below</button></div>';
    var g=c.guests||[];
    h+='<div class="card" style="margin-top:12px"><h3 style="margin-bottom:8px">Guest links</h3>'+list(g.map(function(x,i){return it(x.url,'Reviewer · expires '+fmt(x.exp),'<button type="button" class="btn sm bad" data-act="grev" data-i="'+i+'">Revoke</button>');}))+'<div style="margin-top:10px"><button type="button" class="btn" data-act="gadd">Create 14-day guest link for the post in review</button></div></div>';
    return h;
  }
  if(t==='offboard'){
    var o=c.off;
    if(!o)return '<div class="card"><h3>Offboarding</h3><p class="mut" style="margin:6px 0 12px">One button creates a dated checklist. Nothing is deleted on day 0.</p><label class="f" style="max-width:420px">Exit reason (one line, required)<input id="oreason" placeholder="Why they are leaving"></label><div style="margin-top:12px"><button type="button" class="btn bad" data-act="ostart">Start offboarding</button></div></div>';
    var steps=[[0,'Set status to Leaving. Stop new posts being scheduled.'],[0,'Lock access to read only. Guest links expire now.'],[7,'Handover pack built: posts, images, approval history, comments, stats, invoices. One download link, valid 30 days.'],[7,'Written confirmation of what they own. Our access to their LinkedIn removed, shared logins changed, connected tools disconnected.'],[30,'Client access removed. Handover link expires.'],[90,'Delete client personal data and images. Keep invoices and signed terms. Tabish ticks this himself.']];
    var h3='<div class="banner warn" style="margin-bottom:10px">Offboarding started '+fmt(o.start)+'. Reason: '+esc(o.reason||'not given')+'</div><div class="list">'+steps.map(function(s,i){var due=U.add(s[0]+diff(o.start,TODAY));var d=!!(o.done&&o.done[i]);var w=U.when(due);var locked=i===5&&S.who!=='Tabish';
      return '<div class="item"><button type="button" class="chk" role="checkbox" aria-checked="'+d+'" aria-label="Done"'+(locked?' disabled':'')+' data-act="ostep" data-i="'+i+'">'+(d?icon('tick'):'')+'</button><div class="mn"><div class="t">Day '+s[0]+'</div><div class="d">'+esc(s[1])+'</div></div><div class="sd">'+pill(d?'Done':w.t,d?'good':w.c)+'</div></div>';}).join('')+'</div><div style="margin-top:10px"><button type="button" class="btn sm" data-act="ocancel">Cancel offboarding (prototype only)</button></div><div class="sm mut" style="margin-top:6px">Each step has an owner and a date. The app posts to Discord when a step is due or late.</div>';
    return h3;
  }
  return '';
}
U.acts.mrem=function(el){var c=cl(S.ui.client);var m=c.members.splice(+el.getAttribute('data-i'),1)[0];U.save();U.render();U.alertDiscord('#alerts','Access removed for '+m[0]+' on '+c.name+'. Takes effect instantly.');};
U.acts.madd=function(){var c=cl(S.ui.client),v=document.getElementById('mem').value.trim();if(!/^\S+@\S+\.\S+$/.test(v)){U.toast('Enter a valid work email.');return;}if(c.members.length>=5){U.toast('Maximum 5 people per client.');return;}c.members.push([v,'Reviewer']);U.save();U.render();};
U.acts.mreview=function(){U.toast('Review confirmed and logged. Next one in 90 days.');};
U.acts.gadd=function(){var c=cl(S.ui.client);c.guests=c.guests||[];c.guests.push({url:'review.unscrollable.studio/g/'+U.uid(''),exp:U.add(14)});U.save();U.render();};
U.acts.grev=function(el){var c=cl(S.ui.client);c.guests.splice(+el.getAttribute('data-i'),1);U.save();U.render();};
U.acts.ostart=function(){var c=cl(S.ui.client),r=document.getElementById('oreason').value.trim();if(!r){U.toast('Add an exit reason first.');return;}c.off={start:TODAY,reason:r,done:{}};c.status='leaving';U.save();U.render();U.alertDiscord('#alerts',c.name+' moved to Leaving. Checklist created.');};
U.acts.ostep=function(el){var c=cl(S.ui.client),i=+el.getAttribute('data-i');c.off.done[i]=!c.off.done[i];U.save();U.render();};
U.acts.ocancel=function(){var c=cl(S.ui.client);c.off=null;c.status='active';U.save();U.render();};

/* ---------- POSTS ---------- */
U.screens.posts=function(){
  var h=head('Posts','Calendar and status flow. Posts are published by hand: paste the post URL when it is live.');
  h+='<div class="board">'+POST_ST.map(function(s){var xs=S.posts.filter(function(p){return p.status===s[0];});
    return '<div class="col"><h3><span>'+s[1]+'</span><span class="pill mut tn">'+xs.length+'</span></h3>'+(xs.length?xs.map(function(p){var c=cl(p.client);return '<button type="button" class="item" data-act="postopen" data-id="'+p.id+'"><div class="mn"><div class="t">'+esc(p.title)+'</div><div class="d">'+esc(c.name)+' · '+fmt(p.date)+'</div></div></button>';}).join(''):'<div class="sm mut">Empty</div>')+'</div>';}).join('')+'</div>';
  return '<div class="stack">'+h+'</div>';
};
U.acts.postopen=function(el){S.route='posts';S.ui.sheet={type:'post',id:el.getAttribute('data-id'),mode:'desktop'};U.render();};
U.sheets.post=function(s){
  var p=po(s.id);if(!p)return '';var c=cl(p.client);
  var h='<div class="row" style="justify-content:space-between"><div><h2>'+esc(p.title)+'</h2><div class="sm mut">'+esc(c.name)+' · version '+p.vers[0].n+' · '+stPill(p.status)+'</div></div><button class="btn sm" type="button" data-act="closesheet">Close</button></div>';
  h+='<label class="f">Title<input id="p_title" value="'+esc(p.title)+'"></label><label class="f">Post text<textarea id="p_body" style="min-height:160px">'+esc(p.body)+'</textarea></label>';
  h+='<div class="row"><button type="button" class="btn" data-act="psave" data-id="'+p.id+'">Save as new version</button>';
  if(p.status==='draft'||p.status==='feedback')h+='<button type="button" class="btn pri" data-act="psend" data-id="'+p.id+'">Send for review</button>';
  if(p.status==='approved')h+='<button type="button" class="btn pri" data-act="psched" data-id="'+p.id+'">Mark scheduled</button>';
  h+='</div>';
  if(p.status==='scheduled'||p.status==='approved'){h+='<div class="row"><div style="flex:1;min-width:200px"><label class="f">Live post URL<input id="p_url" type="url" value="'+esc(p.url||'')+'" placeholder="https://www.linkedin.com/posts/..."></label></div><button type="button" class="btn" style="align-self:flex-end" data-act="ppub" data-id="'+p.id+'">Mark published</button></div>';}
  if(p.status==='review'){h+='<div class="banner">Review link: <b>review.unscrollable.studio/r/'+esc(p.id)+'</b> <button type="button" class="btn sm" data-act="copylink" data-id="'+p.id+'">Copy</button><br><span class="sm">Open the Client door at the top to review it as the client.</span></div>';}
  if(p.comments.length){h+='<div><div class="eyebrow" style="margin-bottom:6px">Client comments</div><div class="list">'+p.comments.map(function(x){return '<div class="item"><div class="mn"><div class="t">'+esc(x.who)+'</div><div class="d">'+esc(x.t)+(x.on?' (on "'+esc(x.on)+'")':'')+'</div></div></div>';}).join('')+'</div></div>';}
  h+='<div class="tabs"><button type="button" data-act="pmode" data-v="desktop" aria-pressed="'+(s.mode==='desktop')+'">Desktop</button><button type="button" data-act="pmode" data-v="mobile" aria-pressed="'+(s.mode==='mobile')+'">Mobile</button></div><div style="overflow-x:auto">'+U.liPreview(p,{mode:s.mode})+'</div>';
  h+='<div><div class="eyebrow" style="margin-bottom:6px">Versions</div>'+p.vers.map(function(v){return '<div class="sm"><span class="mut tn">v'+v.n+' · '+fmt(v.at)+'</span> · '+esc(v.t.slice(0,60))+'...</div>';}).join('')+'<div class="sm mut" style="margin-top:6px">Editing an approved post resets approval.</div></div>';
  return h;
};
U.acts.pmode=function(el){S.ui.sheet.mode=el.getAttribute('data-v');U.renderSheet();};
function readPost(p){p.title=document.getElementById('p_title').value.trim()||p.title;p.body=document.getElementById('p_body').value;}
U.acts.psave=function(el){var p=po(el.getAttribute('data-id'));var old=p.body;readPost(p);if(p.body!==old){p.vers.unshift({n:p.vers[0].n+1,at:TODAY,t:p.body});if(p.status==='approved'){p.status='draft';U.toast('Version saved. Approval reset because you edited an approved post.');}else U.toast('Version saved.');}U.save();U.renderSheet();U.render();};
U.acts.psend=function(el){var p=po(el.getAttribute('data-id'));readPost(p);if(p.body!==p.vers[0].t)p.vers.unshift({n:p.vers[0].n+1,at:TODAY,t:p.body});p.status='review';p.since=TODAY;U.save();U.renderSheet();U.render();U.alertDiscord('#alerts','"'+p.title+'" sent for review. Link ready to share.');};
U.acts.psched=function(el){var p=po(el.getAttribute('data-id'));p.status='scheduled';U.save();U.renderSheet();U.render();U.toast('Marked scheduled. You publish it by hand in LinkedIn.');};
U.acts.ppub=function(el){var p=po(el.getAttribute('data-id'));var u=document.getElementById('p_url').value.trim();if(!/^https?:\/\//.test(u)){U.toast('Paste the live post URL first.');return;}p.url=u;p.status='published';U.save();U.renderSheet();U.render();U.toast('Published. Locked.');};
U.acts.copylink=function(el){U.copy('https://review.unscrollable.studio/r/'+el.getAttribute('data-id'),el);};

/* ---------- INBOX ---------- */
U.screens.inbox=function(){
  var h=head('Inbox','Client feedback and approvals. One alert per post.','<button type="button" class="btn" data-act="readall">Mark all read</button>');
  h+=list(S.inbox.map(function(i){var p=po(i.post);return '<button type="button" class="item" data-act="inopen" data-id="'+i.id+'">'+(i.read?'<span style="width:8px"></span>':'<span class="dot"></span>')+'<div class="mn"><div class="t" style="'+(i.read?'font-weight:500':'')+'">'+esc(i.text)+'</div><div class="d">'+fmt(i.at)+'</div></div><div class="sd">'+pill(i.kind==='approved'?'Approved':'Feedback',i.kind==='approved'?'good':'warn')+'</div></button>';}));
  return '<div class="stack">'+h+'</div>';
};
U.acts.inopen=function(el){var i=S.inbox.filter(function(x){return x.id===el.getAttribute('data-id');})[0];i.read=true;U.save();S.ui.sheet={type:'post',id:i.post,mode:'desktop'};U.render();};
U.acts.readall=function(){S.inbox.forEach(function(i){i.read=true;});U.save();U.render();};

/* ---------- TEMPLATES ---------- */
U.screens.templates=function(){
  var h=head('Templates','Outreach and reply wording. Only approved wording should go out. Real text moves in from OUTBOUND_MESSAGES.md after Tabish approves it.');
  h+='<div class="banner warn">Wording below is placeholder text marked [Sample wording]. I did not write your voice. Bring the approved drafts in at migration.</div>';
  h+='<div class="grid g2">'+S.templates.map(function(t){return '<div class="card"><div class="row" style="justify-content:space-between"><h3>'+esc(t.title)+'</h3>'+pill(t.status==='approved'?'Approved':'Draft',t.status==='approved'?'good':'warn')+'</div><div class="sm mut" style="margin:2px 0 8px">'+esc(t.kind)+' · '+esc(t.owner)+'</div><div class="msgbox">'+esc(t.body)+'</div><div class="row" style="margin-top:8px"><button type="button" class="btn sm" data-act="tcopy" data-id="'+t.id+'">Copy</button>'+(t.status!=='approved'&&S.who==='Tabish'?'<button type="button" class="btn sm pri" data-act="tappr" data-id="'+t.id+'">Approve</button>':'')+'</div></div>';}).join('')+'</div>';
  return '<div class="stack">'+h+'</div>';
};
U.acts.tcopy=function(el){var t=S.templates.filter(function(x){return x.id===el.getAttribute('data-id');})[0];U.copy(t.body,el);};
U.acts.tappr=function(el){var t=S.templates.filter(function(x){return x.id===el.getAttribute('data-id');})[0];t.status='approved';U.save();U.render();};

/* ---------- AUDITS ---------- */
U.screens.audits=function(){
  var a=S.audit||{};
  var h=head('Audits','The pre-call profile audit: three fixes and one outbound angle. One page, ready to send or to turn into a weekly post.');
  h+='<div class="grid g2"><div class="card stack"><label class="f">Lead<select id="au_l"><option value="">Choose a lead</option>'+S.leads.filter(U.isOpen).map(function(l){return '<option value="'+l.id+'"'+(a.lead===l.id?' selected':'')+'>'+esc(l.name)+' ('+esc(l.company)+')</option>';}).join('')+'</select></label>'
   +[1,2,3].map(function(n){return '<label class="f">Fix '+n+'<input id="au_f'+n+'" value="'+esc((a.fixes||[])[n-1]||'')+'" placeholder="One change, one reason"></label>';}).join('')
   +'<label class="f">Outbound angle<textarea id="au_a" placeholder="The one angle to open the DM with">'+esc(a.angle||'')+'</textarea></label><div class="row"><button type="button" class="btn pri" data-act="aubuild">Build one-pager</button></div></div>'
   +'<div class="card"><div class="eyebrow">One-pager</div><div class="msgbox" id="au_out" style="margin-top:8px">'+esc(a.out||'Fill the form and press Build one-pager.')+'</div><div class="row" style="margin-top:8px"><button type="button" class="btn sm" data-act="aucopy">Copy</button><button type="button" class="btn sm" data-act="aulog">Log on lead and set stage to Audit sent</button></div></div></div>';
  return '<div class="stack">'+h+'</div>';
};
U.acts.aubuild=function(){var g=function(i){return document.getElementById(i).value.trim();};var lid=g('au_l');var l=S.leads.filter(function(x){return x.id===lid;})[0];var f=[g('au_f1'),g('au_f2'),g('au_f3')];
  if(!l){U.toast('Choose a lead.');return;}
  S.audit={lead:lid,fixes:f,angle:g('au_a'),out:'Profile audit for '+l.name+' ('+l.company+')\n\nThree fixes\n1. '+(f[0]||'[add]')+'\n2. '+(f[1]||'[add]')+'\n3. '+(f[2]||'[add]')+'\n\nOutbound angle\n'+(g('au_a')||'[add]')};U.save();U.render();};
U.acts.aucopy=function(el){if(S.audit)U.copy(S.audit.out,el);};
U.acts.aulog=function(){if(!S.audit){U.toast('Build the one-pager first.');return;}var l=S.leads.filter(function(x){return x.id===S.audit.lead;})[0];l.stage='audit';l.ball='them';U.logLead(l,'stage','Audit sent. Stage set to Audit sent.');U.save();U.toast('Logged on '+l.name+'.');};

/* ---------- BILLING ---------- */
U.screens.billing=function(){
  var h=head('Billing','Proposals, invoices, and who paid. Locked until the payment path is decided.');
  h+='<div class="banner warn">Blocked. No LLC, EIN, bank or Stripe yet, and no revenue recorded. This screen stays empty until the payment path is decided.</div>';
  h+='<div class="card"><h3 style="margin-bottom:8px">Payment path, in order</h3>'+list([['Register the Wyoming LLC','Not started'],['Get the EIN (about 4 to 6 weeks for non-US owners)','Not started'],['Open the bank account','Not started'],['Stripe or Wise for client payments','Not started']].map(function(r){return it(r[0],'',pill(r[1],'mut'));}))+'</div>';
  h+='<div class="grid g2"><div class="card"><h3>Proposals</h3><div class="empty" style="margin-top:8px">No proposals yet. Proposals from PROPOSALS_LOG.md move here later.</div></div><div class="card"><h3>Invoices</h3><div class="empty" style="margin-top:8px">No invoices. First client invoice is the first row.</div></div></div>';
  return '<div class="stack">'+h+'</div>';
};

/* ---------- STATS ---------- */
U.screens.stats=function(){
  var tot=S.stats.reduce(function(a,s){a.i+=+s.imps;a.c+=+s.comments;a.v+=+s.views;a.d+=+s.dms;return a;},{i:0,c:0,v:0,d:0});
  var srcs=[['Comments',14],['Inbound',3],['Referral',1],['Warm intros',2]];
  var h=head('Stats','Manual numbers per post and per lead source. Entered by hand, never scraped.');
  h+='<div class="grid g4">'+[['Impressions',tot.i],['Comments',tot.c],['Profile views',tot.v],['DMs started',tot.d]].map(function(r){return '<div class="card tile"><b class="tn">'+r[1].toLocaleString('en-US')+'</b><span>'+r[0]+'</span></div>';}).join('')+'</div>';
  h+='<div class="grid g2"><div class="card"><h3 style="margin-bottom:10px">Leads by source (sample)</h3><div class="list">'+U.bars(srcs)+'</div></div><div class="card"><h3 style="margin-bottom:8px">Add a post result</h3><div class="stack"><label class="f">Post<input id="st_p"></label><div class="two"><label class="f">Impressions<input id="st_i" type="number" min="0"></label><label class="f">Comments<input id="st_c" type="number" min="0"></label></div><div class="two"><label class="f">Profile views<input id="st_v" type="number" min="0"></label><label class="f">DMs started<input id="st_d" type="number" min="0"></label></div><button type="button" class="btn pri" data-act="stadd">Add</button></div></div></div>';
  h+='<div class="card scroll"><table class="tbl"><thead><tr><th>Post</th><th>Impressions</th><th>Comments</th><th>Views</th><th>DMs</th></tr></thead><tbody>'+S.stats.map(function(s){return '<tr><td>'+esc(s.post)+'</td><td class="tn">'+s.imps+'</td><td class="tn">'+s.comments+'</td><td class="tn">'+s.views+'</td><td class="tn">'+s.dms+'</td></tr>';}).join('')+'</tbody></table></div>';
  h+='<div class="sm mut">Success is qualified conversations and calls booked, not impressions. Sample numbers.</div>';
  return '<div class="stack">'+h+'</div>';
};
U.acts.stadd=function(){var g=function(i){return document.getElementById(i).value.trim();};if(!g('st_p')){U.toast('Name the post.');return;}S.stats.unshift({id:U.uid('s'),post:g('st_p'),imps:+g('st_i')||0,comments:+g('st_c')||0,views:+g('st_v')||0,dms:+g('st_d')||0});U.save();U.render();};

/* ---------- CONTRACTORS ---------- */
U.screens.contractors=function(){
  var h=head('Contractors','Scope, pay per scope, delivered or not. No equity and no decision rights.');
  h+='<div class="grid g2">'+S.contractors.map(function(k){var w=U.when(k.due);return '<div class="card"><div class="row" style="justify-content:space-between"><h3>'+esc(k.name)+'</h3>'+pill(k.delivered?'Delivered':k.status,k.delivered?'good':'')+'</div><p class="mut" style="margin:6px 0">'+esc(k.scope)+'</p><div class="row">'+pill(k.rate,'mut')+pill('Due '+fmt(k.due),w.c)+'</div><div style="margin-top:10px"><button type="button" class="btn sm" data-act="kdone" data-id="'+k.id+'">'+(k.delivered?'Mark not delivered':'Mark delivered')+'</button></div></div>';}).join('')+'</div>';
  h+='<div class="sm mut">Contractors only see the clients and screens you grant them. They never see billing or other clients.</div>';
  return '<div class="stack">'+h+'</div>';
};
U.acts.kdone=function(el){var k=S.contractors.filter(function(x){return x.id===el.getAttribute('data-id');})[0];k.delivered=!k.delivered;U.save();U.render();};

/* ---------- DECISIONS ---------- */
U.screens.decisions=function(){
  var q=(S.ui.dq||'').toLowerCase(),f=S.ui.df||'All';
  var xs=S.decisions.filter(function(d){return (f==='All'||d.status===f)&&(!q||d.text.toLowerCase().indexOf(q)>=0);});
  var h=head('Decisions','Searchable log. Imported once from DECISIONS.md as read-only history, then new decisions are entered here.');
  h+='<div class="banner">A short sample of real entries from the project docs. The full log imports row by row, each reviewed by a person. A suggestion never becomes a decision on import.</div>';
  h+='<div class="row"><div style="flex:1;min-width:180px"><label class="f">Search<input id="dq" type="search" value="'+esc(S.ui.dq||'')+'"></label></div><label class="f">Status<select id="df"><option>All</option>'+opt([['decided','Decided'],['proposed','Proposed'],['open','Open']],f)+'</select></label></div>';
  h+='<div id="dl">'+dlist(xs)+'</div>';
  h+='<div class="card"><h3 style="margin-bottom:8px">Log a decision</h3><div class="row"><div style="flex:1;min-width:220px"><label class="f">What was decided<input id="dn"></label></div><label class="f">Who<select id="dw">'+opt(['Both','Tabish','Ali'],S.who)+'</select></label><button type="button" class="btn pri" style="align-self:flex-end" data-act="dadd">Add</button></div></div>';
  return '<div class="stack">'+h+'</div>';
};
function dlist(xs){return list(xs.map(function(d){return it(d.text,d.date+' · '+d.who,pill(d.status==='decided'?'Decided':d.status==='open'?'Open':'Proposed',d.status==='decided'?'good':d.status==='open'?'warn':''));}));}
document.addEventListener('input',function(e){if(e.target.id==='dq'){S.ui.dq=e.target.value;var el=document.getElementById('dl');if(el)el.innerHTML=dlist(S.decisions.filter(function(d){return (!S.ui.df||S.ui.df==='All'||d.status===S.ui.df)&&d.text.toLowerCase().indexOf(S.ui.dq.toLowerCase())>=0;}));}});
document.addEventListener('change',function(e){if(e.target.id==='df'){S.ui.df=e.target.value;U.render();}});
U.acts.dadd=function(){var v=document.getElementById('dn').value.trim();if(!v){U.toast('Write the decision.');return;}S.decisions.unshift({id:U.uid('d'),date:fmt(TODAY),text:v,status:'decided',who:document.getElementById('dw').value});U.save();U.render();};

/* ---------- SETTINGS ---------- */
U.screens.settings=function(){
  var h=head('Settings','Accounts, roles, and where alerts go.');
  h+='<div class="card scroll"><h3 style="margin-bottom:8px">Accounts and roles</h3><table class="tbl"><thead><tr><th>Person</th><th>Role</th><th>Sees</th></tr></thead><tbody><tr><td>Tabish</td><td>Founder, admin</td><td>Everything, Developer, final deletes</td></tr><tr><td>Ali</td><td>Founder</td><td>Everything except Developer</td></tr><tr><td>Mehak</td><td>Founder</td><td>Everything except Developer</td></tr><tr><td>Contractor (sample)</td><td>Contractor</td><td>Granted clients and screens only</td></tr></tbody></table><div class="sm mut" style="margin-top:8px">Sign-in is an emailed one-time code. Session stays 30 days on a phone.</div></div>';
  h+='<div class="card"><h3 style="margin-bottom:8px">Notifications</h3>'+list([['Discord #alerts','Approvals, feedback, stuck items, expiring links, offboarding steps'],['Discord #errors','Failed jobs and integrations, grouped, no spam'],['Monday all-clear','One line every Monday when everything passed'],['Client email','Review requests and approvals. Clients never see Discord']].map(function(r){return it(r[0],r[1],pill('On','good'));}))+'</div>';
  h+='<div class="card"><h3>Doors</h3><p class="mut" style="margin:6px 0 0">Back end: dark, founders only. Client door: light, private. Use the switch at the top to preview the Client door as a client sees it.</p></div>';
  return '<div class="stack">'+h+'</div>';
};

/* ---------- DEVELOPER ---------- */
var DEV=[['registry','Screens'],['data','Data'],['integrations','Integrations'],['expiry','Expiry'],['usage','Usage'],['access','Access'],['activity','Activity'],['changelog','Changelog'],['migration','Migration']];
function csvOf(rows){if(!rows.length)return '';var ks=Object.keys(rows[0]).filter(function(k){return typeof rows[0][k]!=='object';});return ks.join(',')+'\n'+rows.map(function(r){return ks.map(function(k){return '"'+String(r[k]==null?'':r[k]).replace(/"/g,'""')+'"';}).join(',');}).join('\n');}
U.screens.developer=function(){
  var h=head('Developer','Tabish only. Every screen, its data, its health, and its history.');
  h+='<div class="tabs" role="group" aria-label="Developer">'+DEV.map(function(t){return '<button type="button" data-act="dtab" data-id="'+t[0]+'" aria-pressed="'+(S.ui.dev===t[0])+'">'+t[1]+'</button>';}).join('')+'</div>';
  var t=S.ui.dev,b='';
  if(t==='registry'){b='<div class="banner" style="margin-bottom:10px">Flags switch a screen off without a redeploy. Try turning one off: it disappears from the sidebar.</div><div class="card scroll"><table class="tbl"><thead><tr><th>Screen</th><th>File</th><th>Version</th><th>Founders</th><th>Clients</th></tr></thead><tbody>'+U.SECTIONS.map(function(s){var f=S.flags[s[0]];return '<tr><td>'+s[1]+'</td><td class="mut">apps/back/'+s[0]+'.ts</td><td class="mut">0.1</td><td><button type="button" class="chk" role="checkbox" aria-checked="'+f.back+'" aria-label="Founders can see '+s[1]+'" data-act="flag" data-k="'+s[0]+'" data-w="back">'+(f.back?icon('tick'):'')+'</button></td><td>'+(s[0]==='posts'||s[0]==='inbox'||s[0]==='clients'?'<button type="button" class="chk" role="checkbox" aria-checked="'+f.client+'" aria-label="Clients can see '+s[1]+'" data-act="flag" data-k="'+s[0]+'" data-w="client">'+(f.client?icon('tick'):'')+'</button>':'<span class="mut">n/a</span>')+'</td></tr>';}).join('')+'</tbody></table></div>';}
  if(t==='data'){var T=[['leads',S.leads],['tasks',S.tasks],['clients',S.clients],['posts',S.posts],['decisions',S.decisions],['templates',S.templates],['inbox',S.inbox]];
    b='<div class="card scroll"><table class="tbl"><thead><tr><th>Table</th><th>Rows</th><th>Export</th></tr></thead><tbody>'+T.map(function(r){return '<tr><td>'+r[0]+'</td><td class="tn">'+r[1].length+'</td><td><button type="button" class="btn sm" data-act="dexp" data-t="'+r[0]+'" data-f="csv">CSV</button> <button type="button" class="btn sm" data-act="dexp" data-t="'+r[0]+'" data-f="json">JSON</button></td></tr>';}).join('')+'</tbody></table></div><div class="card" style="margin-top:12px"><div class="row" style="justify-content:space-between"><h3>Context export</h3><button type="button" class="btn sm" data-act="ctxcopy">Copy</button></div><p class="mut sm" style="margin:4px 0 8px">One Markdown snapshot to paste into the Claude project or Command, so the project stays current without double entry.</p><div class="msgbox" id="ctx">'+esc(ctxExport())+'</div></div><div id="expout"></div>';}
  if(t==='integrations'){var I=[['Discord webhooks','OK','5 min ago',''],['Email sender','Warning','1 hour ago','1 bounce on the last review request (sample)'],['Cloudflare D1','OK','2 min ago',''],['Cloudflare R2','OK','2 min ago',''],['Nightly backup','OK','03:00 today','Copied to second provider'],['Weekly health check','OK','Monday 08:00','Sign-in, save, approval, export, restore: pass']];
    b='<div class="card"><h3 style="margin-bottom:8px">Status (sample)</h3>'+list(I.map(function(r){return it(r[0],'Last run '+r[2]+(r[3]?' · '+r[3]:''),pill(r[1],r[1]==='OK'?'good':'warn'));}))+'</div><div class="card" style="margin-top:12px"><h3 style="margin-bottom:8px">Recent Discord alerts (from what you did in this prototype)</h3>'+list(S.alerts.slice(0,8).map(function(a){return it(a.ch,a.t,'');}))+'</div>';}
  if(t==='expiry'){var E=[['Domain unscrollable.studio',U.add(340),'Renew at Hostinger'],['Email sender API key',U.add(25),'Rotate'],['Discord webhook','','No expiry'],['Certificate','','Auto-renews']];
    var gl=[];S.clients.forEach(function(c){(c.guests||[]).forEach(function(g){E.push(['Guest link '+g.url,g.exp,c.name]);});});
    b='<div class="banner" style="margin-bottom:10px">Alerts at 30, 7 and 1 days before anything expires. Dates are samples.</div>'+list(E.map(function(r){var d=r[1]?diff(r[1],TODAY):null;var k=d===null?'mut':d<=1?'bad':d<=30?'warn':'good';return it(r[0],r[2]+(r[1]?' · '+fmt(r[1]):''),pill(d===null?'No date':d+' days',k));}));}
  if(t==='usage'){var Uq=[['Worker requests per day',3200,100000],['D1 row reads per day',41000,5000000],['D1 row writes per day',380,100000],['R2 storage (GB)',0.35,10]];
    b='<div class="banner warn" style="margin-bottom:10px">Free-tier limits are third-party figures and unverified. Alert at 70 percent. These usage numbers are samples.</div><div class="card"><div class="list">'+Uq.map(function(r){var p=r[1]/r[2]*100;return '<div><div class="row" style="justify-content:space-between"><span>'+r[0]+'</span><span class="mut sm tn">'+r[1].toLocaleString('en-US')+' of '+r[2].toLocaleString('en-US')+'</span></div><div class="bar'+(p>=70?' warn':'')+'" style="margin-top:6px"><i style="width:'+Math.max(p,1)+'%"></i></div></div>';}).join('')+'</div></div>';}
  if(t==='access'){b='<div class="card"><h3 style="margin-bottom:8px">Everyone with access</h3>'+list(S.clients.reduce(function(a,c){c.members.forEach(function(m){a.push(it(m[0],c.name+' · '+m[1],''));});return a;},[]).concat([it('Tabish','Founder, admin',''),it('Ali','Founder',''),it('Mehak','Founder','')]))+'</div>';}
  if(t==='activity'){var A=[];S.leads.forEach(function(l){l.events.forEach(function(e){A.push({d:e.d,t:l.name+': '+e.t});});});S.inbox.forEach(function(i){A.push({d:i.at,t:i.text});});A.sort(function(a,b){return a.d<b.d?1:-1;});
    b=list(A.slice(0,16).map(function(a){return it(a.t,fmt(a.d),'');}));}
  if(t==='changelog'){b=list([['0.1 Prototype','All screens clickable, sample data only','Today'],['0.0 Plan','Spec, plan, migration, tasks written','20 Oct']].map(function(r){return it(r[0],r[1],pill(r[2],'mut'));}))+'<div class="sm mut" style="margin-top:8px">In the real app every deploy adds one line here and ships to a preview link first, with one-click rollback.</div>';}
  if(t==='migration'){var M=[['Tasks','Claude artifact','Tasks','Phase 2, first'],['Radar','Claude artifact','Home','Phase 2'],['Leads','Lead Tracker + Ali\'s sheet','Leads','Phase 2, merge on profile URL'],['Decisions','DECISIONS.md','Decisions','Phase 2, history read-only'],['Templates','OUTBOUND_MESSAGES.md and others','Templates','After Tabish approves']];
    b='<div class="banner" style="margin-bottom:10px">Plan only. Nothing is migrated. Old tools stay read-only for 30 days after each switch. A tool is retired only when the parity report is signed.</div><div class="card scroll"><table class="tbl"><thead><tr><th>Source</th><th>From</th><th>Becomes</th><th>When</th><th>Parity</th></tr></thead><tbody>'+M.map(function(r){return '<tr><td>'+r[0]+'</td><td class="mut">'+r[1]+'</td><td>'+r[2]+'</td><td class="mut">'+r[3]+'</td><td>'+pill('Not run','mut')+'</td></tr>';}).join('')+'</tbody></table></div>';}
  return '<div class="stack">'+h+'<div>'+b+'</div></div>';
};
function ctxExport(){
  var lines=['# Context export '+TODAY,'','## Open and proposed decisions'].concat(S.decisions.filter(function(d){return d.status!=='decided';}).map(function(d){return '- ['+d.status+'] '+d.text;}));
  lines.push('','## Clients');S.clients.forEach(function(c){lines.push('- '+c.name+': '+c.status+', waiting on '+c.waiting);});
  lines.push('','## Open tasks');S.tasks.filter(function(t){return t.status!=='done';}).forEach(function(t){lines.push('- ['+t.owner+'] '+t.title+(t.due?' (due '+t.due+')':''));});
  lines.push('','## Leads by stage');STAGES.forEach(function(s){lines.push('- '+s[1]+': '+S.leads.filter(function(l){return l.stage===s[0];}).length);});
  return lines.join('\n');
}
U.acts.dtab=function(el){S.ui.dev=el.getAttribute('data-id');U.render();};
U.acts.flag=function(el){var f=S.flags[el.getAttribute('data-k')];var w=el.getAttribute('data-w');f[w]=!f[w];U.save();U.render();};
U.acts.ctxcopy=function(el){U.copy(ctxExport(),el);};
U.acts.dexp=function(el){var T={leads:S.leads,tasks:S.tasks,clients:S.clients,posts:S.posts,decisions:S.decisions,templates:S.templates,inbox:S.inbox};var rows=T[el.getAttribute('data-t')],f=el.getAttribute('data-f');var txt=f==='csv'?csvOf(rows):JSON.stringify(rows,null,1);var o=document.getElementById('expout');o.innerHTML='<div class="card" style="margin-top:12px"><div class="row" style="justify-content:space-between"><h3>'+esc(el.getAttribute('data-t'))+'.'+f+'</h3><button type="button" class="btn sm" id="expcopy">Copy</button></div><p class="sm mut" style="margin:4px 0 8px">Downloads are blocked in this preview, so copy the text. The real app downloads the file.</p><textarea readonly style="min-height:160px">'+esc(txt.slice(0,6000))+'</textarea></div>';document.getElementById('expcopy').addEventListener('click',function(){U.copy(txt,this);});};
})();
