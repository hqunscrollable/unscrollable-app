(function(){
'use strict';
var U=window.U,S=U.S,esc=U.esc,pill=U.pill,TODAY=U.TODAY,diff=U.diff,fmt=U.fmt,lab=U.lab,STAGES=U.STAGES,SEGS=U.SEGS,OWNERS=U.OWNERS,icon=U.icon;
function head(t,sub,actions){return '<div class="head"><div><h1>'+esc(t)+'</h1>'+(sub?'<div class="sub">'+sub+'</div>':'')+'</div><div class="row">'+(actions||'')+'</div></div>';}
U.head=head;
function opt(list,v,blank){var o='';if(blank)o+='<option value="">Not set</option>';list.forEach(function(x){var val=Array.isArray(x)?x[0]:x,l=Array.isArray(x)?x[1]:x;o+='<option value="'+esc(val)+'"'+(val===v?' selected':'')+'>'+esc(l)+'</option>';});return o;}
U.opt=opt;
function findL(id){return S.leads.filter(function(l){return l.id===id;})[0];}
function findT(id){return S.tasks.filter(function(l){return l.id===id;})[0];}
function mine(o){return S.who==='Tabish'||o===S.who||o==='Both';}

/* ---------- HOME ---------- */
U.screens.home=function(){
  var needs=[],wait=[];
  S.tasks.forEach(function(t){if(t.status!=='done'&&t.status!=='blocked'&&t.due&&diff(t.due,TODAY)<=1&&(t.owner===S.who||t.owner==='Both'))needs.push({k:'task',id:t.id,t:t.title,d:'Task, '+t.owner+(t.due?' · due '+fmt(t.due):''),w:U.when(t.due)});});
  S.leads.forEach(function(l){if(U.isOpen(l)&&l.date&&diff(l.date,TODAY)<=0&&l.owner===S.who)needs.push({k:'lead',id:l.id,t:l.name+' ('+l.company+')',d:l.step||'No next step',w:U.when(l.date)});});
  S.posts.forEach(function(p){if(p.status==='feedback')needs.push({k:'post',id:p.id,t:'Feedback on "'+p.title+'"',d:'Client asked for a change',w:{t:'New',c:'warn'}});});
  S.leads.forEach(function(l){if(U.isOpen(l)&&l.ball==='them')wait.push({k:'lead',id:l.id,t:l.name,d:'Waiting on them. '+(l.step||''),w:U.when(l.date)});});
  S.posts.forEach(function(p){if(p.status==='review')wait.push({k:'post',id:p.id,t:'"'+p.title+'" waiting on the client',d:'Sent '+diff(TODAY,p.since)+' days ago',w:{t:diff(TODAY,p.since)>3?'Stuck':'Waiting',c:diff(TODAY,p.since)>3?'bad':''}});});
  var stale=S.leads.filter(function(l){return U.isOpen(l)&&diff(TODAY,l.last)>=7;});
  var radar=S.radar.filter(function(r){return r.state==='open';});
  var h=head('Home','What needs you now, what is waiting on others, and what has gone quiet.','<span class="pill mut">Replaces Uns Radar</span>');
  if(needs.length)h+='<div class="banner"><b>'+needs.length+' item'+(needs.length>1?'s':'')+' need you now.</b> '+needs.filter(function(x){return x.k==='post';}).length+' with client feedback, the rest are tasks and follow-ups.</div>';
  h+='<div class="grid g4">'+tile(needs.length,'Needs me now',needs.length?'hot':'')+tile(wait.length,'Waiting on others','')+tile(stale.length,'Gone quiet (7+ days)','')+tile(S.inbox.filter(function(i){return !i.read;}).length,'Unread in Inbox','')+'</div>';
  h+='<section><h2 style="margin-bottom:8px">Needs me now</h2><div class="list">'+(needs.length?needs.map(row).join(''):'<div class="empty">Nothing needs you right now.</div>')+'</div></section>';
  h+='<section><h2 style="margin-bottom:8px">Waiting on others</h2><div class="list">'+(wait.length?wait.slice(0,8).map(row).join(''):'<div class="empty">Nobody owes you anything.</div>')+'</div></section>';
  h+='<section><h2 style="margin-bottom:8px">Gone quiet</h2><div class="list">'+(stale.length?stale.map(function(l){return row({k:'lead',id:l.id,t:l.name,d:'No touch since '+fmt(l.last)+'. '+lab(STAGES,l.stage),w:{t:diff(TODAY,l.last)+'d',c:'warn'}});}).join(''):'<div class="empty">Nothing stale.</div>')+'</div></section>';
  h+='<section><h2 style="margin-bottom:8px">Old files to keep or remove</h2><div class="list">'+(radar.length?radar.map(function(r){return '<div class="item"><div class="mn"><div class="t">'+esc(r.t)+'</div><div class="d">'+esc(r.area)+'</div></div><div class="row"><button class="btn sm" type="button" data-act="radar" data-id="'+r.id+'" data-v="keep">Keep</button><button class="btn sm bad" type="button" data-act="radar" data-id="'+r.id+'" data-v="remove">Remove</button></div></div>';}).join(''):'<div class="empty">All decided.</div>')+'</div></section>';
  return '<div class="stack">'+h+'</div>';
  function tile(n,l,c){return '<div class="card tile '+c+'"><b class="tn">'+n+'</b><span>'+l+'</span></div>';}
  function row(r){
    var chk=r.k==='task'?'<button type="button" class="chk" role="checkbox" aria-checked="false" aria-label="Mark done" data-act="taskdone" data-id="'+r.id+'">'+icon('tick')+'</button>':'';
    return '<div class="item">'+chk+'<button type="button" class="mn" style="background:none;border:0;text-align:left;padding:0" data-act="homeopen" data-k="'+r.k+'" data-id="'+r.id+'"><div class="t">'+esc(r.t)+'</div><div class="d">'+esc(r.d)+'</div></button><div class="sd">'+pill(r.w.t,r.w.c)+'</div></div>';
  }
};
U.acts.radar=function(el){var r=S.radar.filter(function(x){return x.id===el.getAttribute('data-id');})[0];if(r){r.state=el.getAttribute('data-v');U.save();U.render();U.toast(r.state==='keep'?'Kept.':'Marked for removal. Nothing is deleted until you remove it in the old tool.');}};
U.acts.taskdone=function(el){var t=findT(el.getAttribute('data-id'));if(t){t.status='done';t.doneAt=TODAY;U.save();U.render();}};
U.acts.homeopen=function(el){var k=el.getAttribute('data-k'),id=el.getAttribute('data-id');
  if(k==='lead'){S.route='leads';U.render();U.openLead(id);}
  else if(k==='post'){S.route='posts';S.ui.sheet={type:'post',id:id};U.render();}
  else{S.route='tasks';S.ui.sheet={type:'task',id:id};U.render();}};

/* ---------- LEADS ---------- */
function filtered(){
  var f=S.ui.f;
  return S.leads.filter(function(l){
    if(f.owner!=='All'&&l.owner!==f.owner)return false;
    if(f.seg!=='All'&&l.seg!==f.seg)return false;
    if(f.dir!=='All'&&l.dir!==f.dir)return false;
    if(f.due&&!(U.isOpen(l)&&l.date&&diff(l.date,TODAY)<=0))return false;
    if(f.q&&(l.name+' '+l.company+' '+l.note+' '+l.step).toLowerCase().indexOf(f.q.toLowerCase())<0)return false;
    return true;
  });
}
function leadCard(l){
  var w=U.when(l.date);
  return '<button type="button" class="item" data-act="lead" data-id="'+l.id+'"><div class="mn"><div class="t">'+esc(l.name)+'</div><div class="d">'+esc(l.company)+(l.title?' · '+esc(l.title):'')+'</div><div class="d" style="margin-top:4px">'+esc(l.step||'No next step yet')+'</div></div><div class="sd">'+(U.isOpen(l)?pill(w.t,w.c):'')+pill(l.owner||'No owner','mut')+(l.ball==='us'?pill('Waiting on us','warn'):'')+(l.ball==='them'?pill('Waiting on them',''):'')+'</div></button>';
}
function leadsMain(){
  var open=S.leads.filter(U.isOpen);
  var due=open.filter(function(l){return l.date&&diff(l.date,TODAY)<=0;});
  var usl=open.filter(function(l){return l.ball==='us';});
  var calls=S.leads.filter(function(l){return l.stage==='call';});
  var all=filtered();
  var f=S.ui.f;
  var h='<div class="grid g4">'+tl(open.length,'Open leads','')+tl(due.length,'Due or late',due.length?'hot':'')+tl(usl.length,'Waiting on us','')+tl(calls.length,'Calls booked','')+'</div>';
  h+='<div class="row"><div class="tabs" role="group" aria-label="View"><button type="button" data-act="lview" data-v="board" aria-pressed="'+(S.ui.leadView==='board')+'">Pipeline</button><button type="button" data-act="lview" data-v="list" aria-pressed="'+(S.ui.leadView==='list')+'">List</button><button type="button" data-act="lview" data-v="stats" aria-pressed="'+(S.ui.leadView==='stats')+'">Counts</button></div></div>';
  h+='<div class="row">'
   +'<div style="flex:1;min-width:180px"><label class="f">Search<input id="lq" type="search" value="'+esc(f.q)+'" placeholder="Name, company, note"></label></div>'
   +'<label class="f">Owner<select id="lo"><option>All</option>'+opt(OWNERS,f.owner)+'</select></label>'
   +'<label class="f">Segment<select id="ls"><option>All</option>'+opt(SEGS,f.seg)+'</select></label>'
   +'<label class="f">Source<select id="ld"><option>All</option>'+opt([['inbound','Inbound'],['outbound','Outbound']],f.dir)+'</select></label>'
   +'<button type="button" class="btn sm" data-act="ldue" aria-pressed="'+f.due+'" style="align-self:flex-end;'+(f.due?'background:var(--acc);color:var(--onacc);border-color:var(--acc)':'')+'">Due now only</button></div>';
  if(S.ui.leadView==='board'){
    h+='<div class="board">'+STAGES.map(function(s){
      var xs=all.filter(function(l){return l.stage===s[0];}).sort(function(a,b){return U.when(a.date).k-U.when(b.date).k;});
      return '<div class="col"><h3><span>'+s[1]+'</span><span class="pill mut tn">'+xs.length+'</span></h3>'+(xs.length?xs.map(leadCard).join(''):'<div class="d sm mut" style="padding:6px 2px">Empty</div>')+'</div>';
    }).join('')+'</div>';
  }else if(S.ui.leadView==='list'){
    h+='<div class="list">'+(all.length?all.sort(function(a,b){return stageIdx(a)-stageIdx(b)||U.when(a.date).k-U.when(b.date).k;}).map(leadCard).join(''):'<div class="empty">No leads match. Clear a filter.</div>')+'</div>';
  }else{
    h+='<div class="grid g2"><div class="card"><h3 style="margin-bottom:10px">By stage</h3><div class="list">'+bars(STAGES.map(function(s){return [s[1],S.leads.filter(function(l){return l.stage===s[0];}).length];}))+'</div></div>'
      +'<div class="card"><h3 style="margin-bottom:10px">By segment (open)</h3><div class="list">'+bars(SEGS.map(function(s){return [s,open.filter(function(l){return l.seg===s;}).length];}))+'</div><h3 style="margin:16px 0 10px">By owner (open)</h3><div class="list">'+bars(OWNERS.map(function(o){return [o,open.filter(function(l){return l.owner===o;}).length];}))+'</div><h3 style="margin:16px 0 10px">Inbound or outbound (open)</h3><div class="list">'+bars([['Inbound',open.filter(function(l){return l.dir==='inbound';}).length],['Outbound',open.filter(function(l){return l.dir==='outbound';}).length]])+'</div></div></div>';
  }
  return h;
  function tl(n,l,c){return '<div class="card tile '+c+'"><b class="tn">'+n+'</b><span>'+l+'</span></div>';}
}
function stageIdx(l){for(var i=0;i<STAGES.length;i++){if(STAGES[i][0]===l.stage)return i;}return 0;}
function bars(rows){var m=Math.max.apply(null,rows.map(function(r){return r[1];}).concat([1]));return rows.map(function(r){return '<div class="fr"><span>'+esc(r[0])+'</span><div class="bar"><i style="width:'+(r[1]/m*100)+'%"></i></div><em class="tn">'+r[1]+'</em></div>';}).join('');}
U.bars=bars;
U.screens.leads=function(){
  return '<div class="stack">'+head('Leads','Pipeline, due follow-ups, and who is waiting on whom. Click a lead to edit it, draft the next message, and log what you sent.','<button class="btn pri" type="button" data-act="newlead">Add lead</button>')
   +'<div class="banner">Sample data. These are made-up people. Nothing here is a real lead. At migration, the 22 real leads and Ali\'s intake sheet are imported once, then checked row by row.</div><div id="lm" class="stack">'+leadsMain()+'</div></div>';
};
function reLeads(){var m=document.getElementById('lm');if(m){var q=document.getElementById('lq');var had=q&&document.activeElement===q;m.innerHTML=leadsMain();if(had){var n=document.getElementById('lq');n.focus();n.setSelectionRange(n.value.length,n.value.length);}}}
document.addEventListener('input',function(e){if(e.target.id==='lq'){S.ui.f.q=e.target.value;reLeads();}});
document.addEventListener('change',function(e){var id=e.target.id;
  if(id==='lo'){S.ui.f.owner=e.target.value;reLeads();}
  if(id==='ls'){S.ui.f.seg=e.target.value;reLeads();}
  if(id==='ld'){S.ui.f.dir=e.target.value;reLeads();}
  if(id==='tf'){S.ui.taskF=e.target.value;U.render();}
});
U.acts.lview=function(el){S.ui.leadView=el.getAttribute('data-v');reLeads();};
U.acts.ldue=function(){S.ui.f.due=!S.ui.f.due;reLeads();};
U.acts.lead=function(el){U.openLead(el.getAttribute('data-id'));};
U.acts.newlead=function(){S.ui.sheet={type:'newlead'};U.renderSheet();};

/* lead sheet */
function formLead(l,isNew){
  return '<label class="f">Name<input id="f_name" value="'+esc(l.name||'')+'"></label>'
  +'<div class="two"><label class="f">Company<input id="f_company" value="'+esc(l.company||'')+'"></label><label class="f">Title<input id="f_title" value="'+esc(l.title||'')+'"></label></div>'
  +'<label class="f">Profile link<input id="f_url" type="url" value="'+esc(l.url||'')+'" placeholder="https://www.linkedin.com/in/..."></label>'
  +'<div class="two"><label class="f">Owner<select id="f_owner">'+opt(OWNERS,l.owner,true)+'</select></label><label class="f">Stage<select id="f_stage">'+opt(STAGES,l.stage||'found')+'</select></label></div>'
  +'<div class="two"><label class="f">Segment<select id="f_seg">'+opt(SEGS,l.seg,true)+'</select></label><label class="f">Waiting on<select id="f_ball">'+opt([['us','Us'],['them','Them']],l.ball,true)+'</select></label></div>'
  +'<div class="two"><label class="f">Inbound or outbound<select id="f_dir">'+opt([['inbound','Inbound'],['outbound','Outbound']],l.dir,true)+'</select></label><label class="f">Referred by<input id="f_ref" value="'+esc(l.ref||'')+'"></label></div>'
  +'<label class="f">Next step<input id="f_step" value="'+esc(l.step||'')+'"></label>'
  +'<label class="f">Next date<input id="f_date" type="date" value="'+esc(l.date||'')+'"></label>'
  +'<label class="f">Notes<textarea id="f_note">'+esc(l.note||'')+'</textarea></label>';
}
function readLead(l){
  var g=function(i){return document.getElementById(i).value.trim();};
  var oldStage=l.stage;
  l.name=g('f_name');l.company=g('f_company');l.title=g('f_title');l.url=g('f_url');l.owner=g('f_owner');l.stage=g('f_stage');l.seg=g('f_seg');l.ball=g('f_ball');l.dir=g('f_dir');l.ref=g('f_ref');l.step=g('f_step');l.date=g('f_date');l.note=g('f_note');
  if(oldStage&&oldStage!==l.stage)U.logLead(l,'stage','Stage changed to '+lab(STAGES,l.stage));
}
U.sheets.lead=function(s){
  var l=findL(s.id);if(!l)return '<p>Lead not found.</p>';
  var d=U.draft(l);
  var h='<div class="row" style="justify-content:space-between"><div><h2>'+esc(l.name||'Lead')+'</h2><div class="mut sm">'+esc(l.company)+' · '+esc(lab(STAGES,l.stage))+'</div></div><button class="btn sm" type="button" data-act="closesheet">Close</button></div>';
  h+='<div class="card tight"><div class="eyebrow">Next message</div><div class="sm mut" style="margin:4px 0 8px">'+esc(d.label)+(d.status!=='approved'?' · template is a draft':'')+'</div>'
   +(d.done?'<div class="empty">Cadence finished. Move the stage or park the lead.</div>':'<div class="msgbox">'+esc(d.text)+'</div><div class="row" style="margin-top:8px"><button type="button" class="btn sm" data-act="copydraft" data-id="'+l.id+'">Copy message</button><button type="button" class="btn sm pri" data-act="marksent" data-id="'+l.id+'">I sent it</button></div><div class="sm mut" style="margin-top:6px">The app never sends. You send it in LinkedIn, then press "I sent it" to log it and set the next date.</div>')
   +'</div>';
  h+='<div class="stage" role="group" aria-label="Stage">'+STAGES.slice(0,8).map(function(s,i){var ix=stageIdx(l);return '<button type="button" class="'+(i<ix?'done':i===ix?'now':'')+'" data-act="setstage" data-id="'+l.id+'" data-s="'+s[0]+'">'+esc(s[1])+'</button>';}).join('')+'</div>';
  h+='<div class="row"><button type="button" class="btn sm" data-act="nextstage" data-id="'+l.id+'">Move to next stage</button><button type="button" class="btn sm" data-act="toggleball" data-id="'+l.id+'">'+(l.ball==='us'?'Now waiting on them':'Now waiting on us')+'</button></div>';
  h+=formLead(l,false);
  h+='<div class="row" style="justify-content:space-between"><button type="button" class="btn bad" id="del" data-act="dellead" data-id="'+l.id+'">Delete</button><div class="row"><button type="button" class="btn" data-act="closesheet">Cancel</button><button type="button" class="btn pri" data-act="savelead" data-id="'+l.id+'">Save</button></div></div>';
  h+='<div><div class="eyebrow" style="margin:6px 0">Activity</div><div class="list">'+l.events.slice(0,8).map(function(e){return '<div class="sm"><span class="mut tn">'+fmt(e.d)+'</span> · '+esc(e.t)+'</div>';}).join('')+'</div></div>';
  return h;
};
U.sheets.newlead=function(){
  return '<div class="row" style="justify-content:space-between"><h2>New lead</h2><button class="btn sm" type="button" data-act="closesheet">Close</button></div>'+formLead({stage:'found',owner:S.who},true)
   +'<div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-act="closesheet">Cancel</button><button type="button" class="btn pri" data-act="createlead">Add lead</button></div>';
};
U.acts.closesheet=function(){U.closeSheet();};
U.acts.savelead=function(el){var l=findL(el.getAttribute('data-id'));if(!l)return;readLead(l);if(!l.name){U.toast('Add a name first.');return;}U.save();U.closeSheet();U.render();U.toast('Saved. In the real app this also writes to the activity log.');};
U.acts.createlead=function(){var l={id:U.uid('l'),events:[],touches:0,last:TODAY};readLead(l);if(!l.name){U.toast('Add a name first.');return;}U.logLead(l,'note','Added to the tracker');S.leads.unshift(l);U.save();U.closeSheet();U.render();};
U.acts.dellead=function(el){var b=el;if(b.getAttribute('data-sure')!=='1'){b.setAttribute('data-sure','1');b.textContent='Tap again to delete';return;}S.leads=S.leads.filter(function(l){return l.id!==el.getAttribute('data-id');});U.save();U.closeSheet();U.render();};
U.acts.setstage=function(el){var l=findL(el.getAttribute('data-id'));readLead(l);var s=el.getAttribute('data-s');if(l.stage!==s){l.stage=s;U.logLead(l,'stage','Stage changed to '+lab(STAGES,s));l.touches=0;}U.save();U.renderSheet();U.render();};
U.acts.nextstage=function(el){var l=findL(el.getAttribute('data-id'));readLead(l);var i=stageIdx(l);if(i<STAGES.length-3){l.stage=STAGES[i+1][0];U.logLead(l,'stage','Stage changed to '+lab(STAGES,l.stage));l.touches=0;}else{U.toast('Won and Lost are set by hand in the Stage field.');}U.save();U.renderSheet();U.render();};
U.acts.toggleball=function(el){var l=findL(el.getAttribute('data-id'));readLead(l);l.ball=l.ball==='us'?'them':'us';U.logLead(l,'note','Now waiting on '+(l.ball==='us'?'us':'them'));U.save();U.renderSheet();U.render();};
U.acts.copydraft=function(el){var l=findL(el.getAttribute('data-id'));U.copy(U.draft(l).text,el);};
U.acts.marksent=function(el){
  var l=findL(el.getAttribute('data-id'));readLead(l);var c=U.cadence(l),n=l.touches||0;
  U.logLead(l,'message','Follow-up '+(n+1)+' sent by '+S.who);l.touches=n+1;l.ball='them';
  if(l.touches<c.length){l.date=U.add(c[l.touches]-c[l.touches-1]);l.step='Follow-up '+(l.touches+1)+' of '+c.length;}
  else{l.date='';l.step='Cadence finished. Decide: park or close.';}
  U.save();U.renderSheet();U.render();U.toast('Logged. Next follow-up '+(l.date?fmt(l.date):'not set')+'.');
};

/* ---------- FOLLOW-UPS ---------- */
U.screens.followups=function(){
  var q=S.leads.filter(function(l){return U.isOpen(l)&&l.date&&diff(l.date,TODAY)<=0&&(S.who==='Tabish'||l.owner===S.who);}).sort(function(a,b){return U.when(a.date).k-U.when(b.date).k;});
  var up=S.leads.filter(function(l){return U.isOpen(l)&&l.date&&diff(l.date,TODAY)>0&&diff(l.date,TODAY)<=7&&(S.who==='Tabish'||l.owner===S.who);}).sort(function(a,b){return U.when(a.date).k-U.when(b.date).k;});
  var h=head('Follow-ups','Today\'s queue, built from Leads. The app writes nothing to LinkedIn. You copy, send, then log it.');
  h+='<div class="banner">Showing '+(S.who==='Tabish'?'everyone\'s':'your')+' due follow-ups. Cadence: never replied at day 7, 14, 21 then stop. Replied then quiet at day 4, 10, 17, 28, 42. Wording below is sample text until you approve the real templates.</div>';
  h+='<section><h2 style="margin-bottom:8px">Due today or late ('+q.length+')</h2><div class="list">'+(q.length?q.map(function(l){var d=U.draft(l),w=U.when(l.date);
    return '<div class="card"><div class="row" style="justify-content:space-between"><div><div class="t" style="font-weight:600">'+esc(l.name)+'</div><div class="sm mut">'+esc(l.company)+' · '+esc(lab(STAGES,l.stage))+' · '+esc(l.owner)+'</div></div>'+pill(w.t,w.c)+'</div><div class="sm mut" style="margin:8px 0 4px">'+esc(d.label)+'</div>'+(d.done?'<div class="empty">Cadence finished.</div>':'<div class="msgbox">'+esc(d.text)+'</div><div class="row" style="margin-top:8px"><button type="button" class="btn sm" data-act="copydraft" data-id="'+l.id+'">Copy message</button><button type="button" class="btn sm pri" data-act="fsent" data-id="'+l.id+'">I sent it</button><button type="button" class="btn sm" data-act="lead" data-id="'+l.id+'">Open lead</button></div>')+'</div>';}).join(''):'<div class="empty">Queue is empty. Nothing is due.</div>')+'</div></section>';
  h+='<section><h2 style="margin-bottom:8px">Next 7 days ('+up.length+')</h2><div class="list">'+(up.length?up.map(function(l){return '<button type="button" class="item" data-act="lead" data-id="'+l.id+'"><div class="mn"><div class="t">'+esc(l.name)+'</div><div class="d">'+esc(l.step)+'</div></div><div class="sd">'+pill(fmt(l.date),'')+'</div></button>';}).join(''):'<div class="empty">Nothing coming up.</div>')+'</div></section>';
  return '<div class="stack">'+h+'</div>';
};
U.acts.fsent=function(el){var l=findL(el.getAttribute('data-id'));var c=U.cadence(l),n=l.touches||0;U.logLead(l,'message','Follow-up '+(n+1)+' sent by '+S.who);l.touches=n+1;l.ball='them';
  if(l.touches<c.length){l.date=U.add(c[l.touches]-c[l.touches-1]);l.step='Follow-up '+(l.touches+1)+' of '+c.length;}else{l.date='';l.step='Cadence finished. Decide: park or close.';}
  U.save();U.render();U.toast('Logged. Next: '+(l.date?fmt(l.date):'none')+'.');};

/* ---------- TASKS ---------- */
var TS=[['todo','To do'],['doing','Doing'],['blocked','Blocked'],['done','Done']];
U.screens.tasks=function(){
  var f=S.ui.taskF,h=head('Tasks','Shared to-do list for Tabish and Ali.','<label class="f" style="flex-direction:row;align-items:center;gap:8px">Show<select id="tf" style="width:auto"><option>All</option>'+opt(OWNERS,f)+'</select></label><button class="btn pri" type="button" data-act="newtask">Add task</button>');
  var rows=S.tasks.filter(function(t){return f==='All'||t.owner===f||t.owner==='Both';});
  TS.forEach(function(s){
    var xs=rows.filter(function(t){return t.status===s[0];});
    h+='<section><h2 style="margin-bottom:8px">'+s[1]+' <span class="mut sm tn">'+xs.length+'</span></h2><div class="list">'+(xs.length?xs.map(function(t){
      var w=t.due&&t.status!=='done'?U.when(t.due):null;
      return '<div class="item"><button type="button" class="chk" role="checkbox" aria-checked="'+(t.status==='done')+'" aria-label="Toggle done" data-act="ttoggle" data-id="'+t.id+'">'+(t.status==='done'?icon('tick'):'')+'</button><button type="button" class="mn" style="background:none;border:0;text-align:left;padding:0" data-act="topen" data-id="'+t.id+'"><div class="t" style="'+(t.status==='done'?'text-decoration:line-through;color:var(--dim)':'')+'">'+esc(t.title)+'</div><div class="d">'+esc(t.area)+' · '+esc(t.owner)+(t.notes?' · '+esc(t.notes):'')+'</div></button><div class="sd">'+(t.priority==='high'?pill('High','bad'):'')+(w?pill(w.t,w.c):'')+'</div></div>';}).join(''):'<div class="empty">None.</div>')+'</div></section>';
  });
  return '<div class="stack">'+h+'</div>';
};
U.acts.ttoggle=function(el){var t=findT(el.getAttribute('data-id'));t.status=t.status==='done'?'todo':'done';t.doneAt=t.status==='done'?TODAY:'';U.save();U.render();};
U.acts.topen=function(el){S.ui.sheet={type:'task',id:el.getAttribute('data-id')};U.renderSheet();};
U.acts.newtask=function(){S.ui.sheet={type:'newtask'};U.renderSheet();};
function formTask(t){
  return '<label class="f">Title<input id="t_title" value="'+esc(t.title||'')+'"></label>'
  +'<div class="two"><label class="f">Status<select id="t_status">'+opt(TS,t.status||'todo')+'</select></label><label class="f">Owner<select id="t_owner">'+opt(['Tabish','Ali','Both'],t.owner||S.who)+'</select></label></div>'
  +'<div class="two"><label class="f">Priority<select id="t_pri">'+opt([['high','High'],['normal','Normal'],['low','Low']],t.priority||'normal')+'</select></label><label class="f">Area<select id="t_area">'+opt(['Setup','Brand','Sales','Content','Systems','Delivery','Other'],t.area||'Other')+'</select></label></div>'
  +'<label class="f">Due<input id="t_due" type="date" value="'+esc(t.due||'')+'"></label><label class="f">Details<textarea id="t_notes">'+esc(t.notes||'')+'</textarea></label>';
}
function readTask(t){var g=function(i){return document.getElementById(i).value.trim();};t.title=g('t_title');t.status=g('t_status');t.owner=g('t_owner');t.priority=g('t_pri');t.area=g('t_area');t.due=g('t_due');t.notes=g('t_notes');if(t.status==='done'&&!t.doneAt)t.doneAt=TODAY;}
U.sheets.task=function(s){var t=findT(s.id);if(!t)return '';return '<div class="row" style="justify-content:space-between"><h2>Edit task</h2><button class="btn sm" type="button" data-act="closesheet">Close</button></div>'+formTask(t)+'<div class="row" style="justify-content:space-between"><button type="button" class="btn bad" data-act="deltask" data-id="'+t.id+'">Delete</button><div class="row"><button type="button" class="btn" data-act="closesheet">Cancel</button><button type="button" class="btn pri" data-act="savetask" data-id="'+t.id+'">Save</button></div></div>';};
U.sheets.newtask=function(){return '<div class="row" style="justify-content:space-between"><h2>New task</h2><button class="btn sm" type="button" data-act="closesheet">Close</button></div>'+formTask({})+'<div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-act="closesheet">Cancel</button><button type="button" class="btn pri" data-act="createtask">Add task</button></div>';};
U.acts.savetask=function(el){var t=findT(el.getAttribute('data-id'));readTask(t);if(!t.title){U.toast('Add a title.');return;}U.save();U.closeSheet();U.render();};
U.acts.createtask=function(){var t={id:U.uid('t'),checks:[],created:TODAY,doneAt:''};readTask(t);if(!t.title){U.toast('Add a title.');return;}S.tasks.unshift(t);U.save();U.closeSheet();U.render();};
U.acts.deltask=function(el){if(el.getAttribute('data-sure')!=='1'){el.setAttribute('data-sure','1');el.textContent='Tap again to delete';return;}S.tasks=S.tasks.filter(function(t){return t.id!==el.getAttribute('data-id');});U.save();U.closeSheet();U.render();};
})();
