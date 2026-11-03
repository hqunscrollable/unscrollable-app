(function(){
'use strict';
var KEY='uns-demo-v1';
var W=window; W.U={};
var $=function(id){return document.getElementById(id);};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function pad(n){return (n<10?'0':'')+n;}
function iso(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function add(n){var d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return iso(d);}
var TODAY=add(0);
function diff(a,b){return Math.round((Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/86400000);}
function fmt(d){if(!d)return '';return new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'});}
function uid(p){return p+Math.random().toString(36).slice(2,8);}
function first(n){return String(n||'').split(' ')[0];}
function initials(n){return String(n||'?').split(' ').map(function(x){return x[0];}).join('').slice(0,2).toUpperCase();}
W.U.esc=esc;W.U.add=add;W.U.TODAY=TODAY;W.U.diff=diff;W.U.fmt=fmt;W.U.uid=uid;W.U.first=first;W.U.initials=initials;W.U.$=$;

/* ---------- constants ---------- */
var STAGES=[['found','1st degree connection'],['warming','Warming'],['dm','DM sent'],['replied','Replied'],['audit','Audit sent'],['call','Call booked'],['proposal','Proposal sent'],['won','Won'],['lost','Lost']];
var SEGS=['yc','a16z','b2b tech','coach'];
var OWNERS=['Tabish','Ali','Mehak'];
var POST_ST=[['draft','Draft'],['review','Sent for review'],['feedback','Feedback'],['approved','Approved'],['scheduled','Scheduled'],['published','Published']];
var SECTIONS=[
 ['home','Today','home','Daily'],['leads','Leads','target','Daily'],['tasks','Tasks','check','Daily'],
 ['clients','Clients','users','Delivery'],['posts','Posts','file','Delivery'],['inbox','Inbox','inbox','Delivery'],['templates','Templates','layers','Delivery'],['audits','Audits','clip','Delivery'],
 ['onboarding','Onboarding','check','Agreements'],['ndas','NDAs','clip','Agreements'],['contracts','Contracts','file','Agreements'],
 ['billing','Billing','receipt','Business'],['stats','Stats','chart','Business'],['contractors','Contractors','brief','Business'],['decisions','Decisions','book','Business'],
 ['settings','Settings','sliders','System'],['developer','Developer','code','System']
];
W.U.STAGES=STAGES;W.U.SEGS=SEGS;W.U.OWNERS=OWNERS;W.U.POST_ST=POST_ST;W.U.SECTIONS=SECTIONS;
function lab(list,v){for(var i=0;i<list.length;i++){if(list[i][0]===v)return list[i][1];}return '';}
W.U.lab=lab;
var IC={
home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.8 0 4.5 1.8 4.5 4.5"/>',
file:'<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>',
inbox:'<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 2h6l1-2h5"/>',
target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
refresh:'<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>',
check:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/>',
clip:'<rect x="6" y="4" width="12" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 11h6M9 15h6"/>',
receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
brief:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3"/>',
book:'<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
sliders:'<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
code:'<path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/>',
layers:'<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
tick:'<path d="M5 12l4 4 10-10"/>',
cal:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',bell:'<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4"/>',folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',left:'<path d="M15 5l-7 7 7 7"/>',right:'<path d="M9 5l7 7-7 7"/>',
menu:'<path d="M4 7h16M4 12h16M4 17h16"/>'
};
function icon(n){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(IC[n]||'')+'</svg>';}
W.U.icon=icon;
var MARK='<svg viewBox="18 3 62 82" aria-hidden="true"><path d="M24 21 H38 V56 A12 12 0 0 0 62 56 V38 C62.5 27 64.5 19 66.8 15.8 Q68.6 13.4 70.6 16.6 C73.4 22 75.2 28 76 34 V56 A26 26 0 0 1 24 56 Z" fill="var(--mark-body)"/><circle cx="31" cy="16" r="11" fill="var(--mark-body)"/><circle cx="31" cy="16" r="4.2" fill="var(--mark-dot)"/></svg>';
W.U.MARK=MARK;
function pill(t,k){return '<span class="pill '+(k||'')+'">'+esc(t)+'</span>';}
W.U.pill=pill;

/* ---------- seed (sample data only, nothing real) ---------- */
function ev(d,k,t){return {d:add(d),k:k,t:t};}
function seed(){
  var L=[
   ['Maya Okafor','Co-founder','Pillar Labs','Tabish','replied','yc','us','outbound','Answer her question about the audit',0,'Replied yesterday. Asked what the audit covers.',2],
   ['Jordan Reyes','CEO','Northlane','Ali','dm','yc','them','outbound','Day 7 follow-up',-2,'Welcome sent, no reply yet.',0],
   ['Dev Malhotra','Founder','Quillpoint','Ali','warming','b2b tech','','outbound','Comment on his next post',1,'Two comments so far, he liked one.',0],
   ['Lena Fischer','CEO','Harbor Metrics','Tabish','audit','b2b tech','them','inbound','Audit sent, see how it lands',2,'Came in from a comment thread.',1],
   ['Tomas Rivera','Founder','Stackwell','Ali','found','yc','','outbound','Send welcome message',0,'Accepted the connection today.',0],
   ['Aisha Rahman','Founder','Fernbyte','Ali','call','b2b tech','us','outbound','Prep the audit for Thursday call',3,'Call booked. Wants to talk LinkedIn for hiring.',2],
   ['Chris Albright','Coach','Albright Growth','Tabish','proposal','coach','them','inbound','Waiting on proposal reply',-3,'Proposal sent, no reply.',3],
   ['Nora Lindqvist','CEO','Tidewise','Ali','found','a16z','','outbound','Check recent posts, then welcome',1,'',0],
   ['Ben Kowalski','Founder','Lattice Co','Ali','replied','b2b tech','us','outbound','Reply to his question',-1,'Asked who is behind the page.',1],
   ['Sofia Marin','Founder','Brightpath','Tabish','warming','yc','','outbound','Second comment on her launch post',2,'',0],
   ['Idris Bello','Founder','Cobalt Desk','Ali','lost','b2b tech','','outbound','',null,'Not now. Revisit in January.',2],
   ['Hana Sato','Founder','Orbit Notes','Tabish','dm','a16z','them','outbound','Day 14 follow-up',4,'Welcome sent 10 days ago.',1]
  ].map(function(r,i){
    return {id:'l'+i,name:r[0],title:r[1],company:r[2],owner:r[3],stage:r[4],seg:r[5],ball:r[6],dir:r[7],ref:'',step:r[8],date:r[9]===null?'':add(r[9]),note:r[10],touches:r[11],
      events:[ev(-12+i,'note','Added to the tracker'),ev(-5,'stage','Stage set to '+lab(STAGES,r[4]))],last:add(-(i%7)-(r[4]==='dm'?10:1))};
  });
  var T=[
   ['Restrict Lead Tracker and Radar sharing to named people','todo','Tabish','high','Systems',0,'Both artifacts are on "anyone with the link" and hold real names.'],
   ['Change Cloudflare uns password and turn on two-factor','todo','Tabish','high','Systems',1,''],
   ['Approve OUTBOUND_MESSAGES.md and the seven flags','doing','Tabish','high','Content',2,'Then say go on the first DMs.'],
   ['Write the call-ready offer: one line, price, what the call covers','todo','Tabish','high','Sales',3,''],
   ['Back up Documents\\Claude to another drive','todo','Tabish','normal','Systems',5,''],
   ['Send 5 to 10 real DM samples to the Content chat','todo','Ali','high','Content',2,'So his lines sound like him.'],
   ['Say which account comments for uns, and which comments were posted','todo','Ali','normal','Content',4,''],
   ['Confirm pilot rate and metric','blocked','Ali','normal','Sales',null,'Waiting on the offer line.'],
   ['Set up a password manager with both founders as admin','done','Tabish','normal','Systems',-2,'']
  ].map(function(r,i){return {id:'t'+i,title:r[0],status:r[1],owner:r[2],priority:r[3],area:r[4],due:r[5]===null?'':add(r[5]),notes:r[6],checks:[],created:add(-6),doneAt:r[1]==='done'?add(-2):''};});
  var C=[
   {id:'c1',name:'Meridian Forge',person:'Ravi Menon',headline:'Founder, Meridian Forge. Building billing tools for field teams.',plan:'Pilot, 90 days',status:'active',since:add(-24),waiting:'Approval on 1 post',storage:312,
    members:[['Ravi Menon','Owner'],['Sana Kapoor','Reviewer'],['Dan Ortiz','Viewer']],
    assets:[['Logo, SVG and PNG','logo','1.2 MB'],['Brand colors','color','4 KB'],['Fonts','font','880 KB'],['Founder photos (6)','photo','18 MB']],
    guides:[['10 content formats','Guide'],['Profile checklist','Guide']],uploads:[['Case study draft.docx','210 KB'],['Customer quote screenshots.zip','4.1 MB']],
    profile:[['Banner','Done'],['Headline','Done'],['About','In review'],['Featured','To do']],templates:[['Welcome message','Approved'],['Day 7 follow-up','Draft']]},
   {id:'c2',name:'Kestrel Works',person:'Imani Cole',headline:'CEO, Kestrel Works. Fleet software for small carriers.',plan:'Pilot, 90 days',status:'onboarding',since:add(-3),waiting:'Brand assets from client',storage:41,
    members:[['Imani Cole','Owner']],assets:[['Logo (waiting on client)','logo','0 KB']],guides:[['10 content formats','Guide']],uploads:[],
    profile:[['Banner','To do'],['Headline','To do'],['About','To do'],['Featured','To do']],templates:[]}
  ];
  var long1='Most founders write a LinkedIn post like a press release.\n\nThen they wonder why nobody comments.\n\nTry this instead. Say the thing you would say to a friend at a bad conference dinner.\n\nOne idea. Three short lines. A question at the end.';
  var long2='We lost a deal last month because our price page said "contact us".\n\nThe buyer wanted a number. We hid it.\n\nNow the number is on the page. Calls went up. Awkward calls went down.';
  var long3='A founder told me her profile "does nothing".\n\nIt did something. It told every visitor she was a "visionary leader".\n\nVisitors left. Rewrite the first line so a stranger knows what you do.';
  var P=[
   {id:'p1',client:'c1',title:'Press release vs friend at dinner',status:'review',since:add(-5),body:long1,date:add(2),url:'',vers:[{n:1,at:add(-6),t:long1}],comments:[]},
   {id:'p2',client:'c1',title:'The price page story',status:'feedback',since:add(-2),body:long2,date:add(4),url:'',vers:[{n:1,at:add(-4),t:long2}],comments:[{who:'Sana Kapoor',t:'Can we soften "hid it"? Legal read the last one.',on:'The buyer wanted a number.'}]},
   {id:'p3',client:'c1',title:'Visionary leader opener',status:'approved',since:add(-1),body:long3,date:add(1),url:'',vers:[{n:2,at:add(-1),t:long3}],comments:[]},
   {id:'p4',client:'c1',title:'Three lines and a question',status:'draft',since:add(0),body:'Draft idea. Three lines. One question.\n\n(Ali to write.)',date:add(6),url:'',vers:[{n:1,at:add(0),t:'Draft idea. Three lines. One question.'}],comments:[]},
   {id:'p5',client:'c1',title:'Launch week notes',status:'published',since:add(-8),body:'Launch week. What worked. What did not.\n\nOne list, no hype.',date:add(-8),url:'https://www.linkedin.com/posts/sample-1',vers:[{n:1,at:add(-9),t:'Launch week.'}],comments:[]},
   {id:'p6',client:'c2',title:'Why fleets still use spreadsheets',status:'draft',since:add(-1),body:'Fleet owners keep spreadsheets because spreadsheets never ask them to change.',date:add(8),url:'',vers:[{n:1,at:add(-1),t:'Fleet owners keep spreadsheets.'}],comments:[]}
  ];
  var IN=[
   {id:'i1',post:'p2',kind:'feedback',text:'Sana Kapoor asked for a change on "The price page story"',at:add(-2),read:false},
   {id:'i2',post:'p3',kind:'approved',text:'Ravi Menon approved "Visionary leader opener" (v2)',at:add(-1),read:false},
   {id:'i3',post:'p5',kind:'approved',text:'Ravi Menon approved "Launch week notes" (v1)',at:add(-9),read:true}
  ];
  var D=[
   ['11 Oct','Name: Unscrollable (working brand Unscrollable HQ)','decided','Both'],['11 Oct','Roles: front end Ali, back end Tabish','decided','Both'],
   ['11 Oct','Entity: Wyoming LLC, the venture\'s, not Ali\'s personal','decided','Both'],['16 Oct','Offer authority: Tabish has full authority. Ali owns how outbound runs day to day','decided','Both'],
   ['16 Oct','Both sign as Co-founder','decided','Both'],['16 Oct','One prospect, one sender, one lead magnet','decided','Both'],
   ['17 Oct','Ask Tabish before any message goes to a person','decided','Tabish'],['17 Oct','Lead systems: Google intake sheet plus Lead Tracker. Lead Desk retired','decided','Tabish'],
   ['--','Equity split and vesting','open','Both'],['--','Spending limit that needs both founders','open','Both'],['--','Stealth meaning on DMs and calls','open','Both'],['--','Deadlock rule (proposal: wait 7 days, then a third person)','proposed','Claude']
  ].map(function(r,i){return {id:'d'+i,date:r[0],text:r[1],status:r[2],who:r[3]};});
  var TP=[
   {id:'m1',kind:'First reply',title:'First reply pattern',owner:'Tabish',status:'approved',body:'Thank them. One self-aimed aside in brackets. One easy question about them. No pitch, no link, no calendar.'},
   {id:'m2',kind:'Welcome',title:'Welcome message (Tabish)',owner:'Tabish',status:'draft',body:'[Sample wording] Thanks for connecting, {first}. Quick one: do you want the short guide on LinkedIn for founders? Yes or no is fine.'},
   {id:'m3',kind:'Welcome',title:'Welcome message (Ali)',owner:'Ali',status:'draft',body:'[Sample wording] Good to connect, {first}. Want the 4-page guide I wrote? Reply yes and I will send it.'},
   {id:'m4',kind:'Follow-up',title:'Never replied: day 7, 14, 21',owner:'Both',status:'draft',body:'[Sample wording] Hey {first}, circling back on my last note. No pitch. What are you working on this month?'},
   {id:'m5',kind:'Follow-up',title:'Replied then quiet: day 4, 10, 17, 28, 42',owner:'Both',status:'draft',body:'[Sample wording] {first}, picking this up again. Did the guide help, or was it off the mark?'},
   {id:'m6',kind:'Audit',title:'Profile audit intro',owner:'Tabish',status:'draft',body:'[Sample wording] I looked at your profile. Three fixes and one angle for outreach, one page. Want it?'}
  ];
  var CT=[
   {id:'k1',name:'Design contractor A',scope:'Carousel batch, 6 slides each',rate:'Per scope',status:'In progress',due:add(5),delivered:false},
   {id:'k2',name:'Contractor B',scope:'Profile banners for 2 clients',rate:'Per scope',status:'Scoped',due:add(12),delivered:false}
  ];
  var ST=[
   {id:'s1',post:'Launch week notes',imps:4120,comments:31,views:210,dms:6},{id:'s2',post:'Visionary leader opener',imps:0,comments:0,views:0,dms:0}
  ];
  var RD=[
   {id:'r1',t:'Old Lead Desk artifact (retired 17 Oct)',area:'Old tools',state:'open'},
   {id:'r2',t:'Lead Tracker Prototype artifact',area:'Old tools',state:'open'},
   {id:'r3',t:'Sprint Board artifact',area:'Old tools',state:'open'}
  ];
  var flags={};SECTIONS.forEach(function(s){flags[s[0]]={back:true,client:s[0]==='posts'||s[0]==='inbox'};});
  return {leads:L,tasks:T,clients:C,posts:P,inbox:IN,decisions:D,templates:TP,contractors:CT,stats:ST,radar:RD,flags:flags,alerts:[],done:{}};
}
var S;
try{S=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){S=null;}
if(!S||!S.leads){S=seed();}
SECTIONS.forEach(function(x){S.flags=S.flags||{};if(!S.flags[x[0]])S.flags[x[0]]={back:true,client:false};});
S.who=(window.UNS_ME&&window.UNS_ME.name)||S.who||'Tabish';S.theme=(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';S.door='back';S.route='home';S.ui={leadView:'board',f:{owner:'All',seg:'All',dir:'All',q:'',due:false},taskF:'All',client:null,ctab:'overview',post:null,sheet:null,dev:'registry',draw:false};
S.cd={tab:'review',post:'p1',mode:'desktop',sel:null,signed:true,step:'email'};
W.U.S=S;
W.U.seed=seed;
function save(){try{var c={};for(var k in S){if(k!=='ui'&&k!=='cd'&&k!=='who'&&k!=='theme'&&k!=='door'&&k!=='route')c[k]=S[k];}localStorage.setItem(KEY,JSON.stringify(c));}catch(e){}}
W.U.save=save;
W.U.reset=function(){try{localStorage.removeItem(KEY);}catch(e){}var n=seed();for(var k in n){S[k]=n[k];}S.ui.client=null;S.ui.sheet=null;S.cd={tab:'review',post:'p1',mode:'desktop',sel:null,signed:true,step:'email'};render();toast('Sample data reset.');};

/* ---------- helpers used by screens ---------- */
W.U.toast=toast;
function toast(html){var t=document.createElement('div');t.className='toast';t.innerHTML=html;$('toasts').appendChild(t);setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},3800);}
W.U.alertDiscord=function(channel,text){S.alerts.unshift({at:new Date().toISOString(),ch:channel,t:text});S.alerts=S.alerts.slice(0,30);save();toast('<b>Discord '+esc(channel)+'</b><br>'+esc(text));};
W.U.copy=function(text,btn){var done=function(ok){if(btn){var o=btn.textContent;btn.textContent=ok?'Copied':'Select and copy';setTimeout(function(){btn.textContent=o;},1600);}};
  try{navigator.clipboard.writeText(text).then(function(){done(true);},function(){done(false);});}catch(e){done(false);}};
W.U.logLead=function(l,k,t){l.events.unshift({d:TODAY,k:k,t:t});l.last=TODAY;};
W.U.cadence=function(l){var never=(l.stage==='found'||l.stage==='warming'||l.stage==='dm');return never?[7,14,21]:[4,10,17,28,42];};
W.U.draft=function(l){
  var n=l.touches||0,c=W.U.cadence(l),never=c.length===3;
  var tp=null;S.templates.forEach(function(t){if((never&&t.id==='m4')||(!never&&t.id==='m5'))tp=t;});
  var body=(tp?tp.body:'[Sample wording]').replace('{first}',first(l.name));
  return {text:body,label:(never?'Never replied':'Replied then quiet')+', follow-up '+(n+1)+' of '+c.length,done:n>=c.length,status:tp?tp.status:'draft'};
};
W.U.openLead=function(id){S.ui.sheet={type:'lead',id:id};renderSheet();};
W.U.isOpen=function(l){return l.stage!=='won'&&l.stage!=='lost';};
W.U.when=function(d){if(!d)return {t:'No date',c:'mut',k:99999};var k=diff(d,TODAY);if(k<0)return {t:Math.abs(k)+'d late',c:'bad',k:k};if(k===0)return {t:'Today',c:'warn',k:0};return {t:fmt(d),c:'',k:k};};

/* ---------- shell ---------- */
function visibleSections(){
  return SECTIONS.filter(function(s){
    if((s[0]==='developer'||s[0]==='build')&&!(window.UNS_ME&&window.UNS_ME.is_dev))return false;
    return S.flags[s[0]].back;
  });
}
function navHtml(){
  var out='',last='';
  var due=W.U.liveDue?W.U.liveDue():S.leads.filter(function(l){return W.U.isOpen(l)&&l.date&&diff(l.date,TODAY)<=0&&(S.who==='Tabish'||l.owner===S.who);}).length;
  var unread=S.inbox.filter(function(i){return !i.read;}).length;
  visibleSections().forEach(function(s){
    if(s[3]!==last){out+='<div class="grp">'+s[3]+'</div>';last=s[3];}
    var cnt='';
    if(s[0]==='home'&&due)cnt='<span class="cnt hot">'+due+'</span>';
    if(s[0]==='inbox'&&unread)cnt='<span class="cnt hot">'+unread+'</span>';
    if(s[0]==='leads'&&W.U.watchDue&&W.U.watchDue())cnt='<span class="cnt">'+W.U.watchDue()+'</span>';
    if(!W.U.isLive(s[0]))cnt='<span class="pill mut" style="margin-left:auto">Demo</span>'+cnt;
    out+='<button type="button" data-act="nav" data-id="'+s[0]+'"'+(S.route===s[0]?' aria-current="page"':'')+'>'+icon(s[2])+'<span>'+s[1]+'</span>'+cnt+'</button>';
  });
  return out;
}
function render(){
  document.documentElement.setAttribute('data-door',S.door);document.documentElement.setAttribute('data-theme',S.theme);
  $('seg-theme').innerHTML='<button type="button" data-act="theme" data-id="light" aria-pressed="'+(S.theme==='light')+'">Light</button><button type="button" data-act="theme" data-id="dark" aria-pressed="'+(S.theme==='dark')+'">Dark</button>';
  var back=S.door==='back';
  $('seg-door').innerHTML='<button type="button" data-act="door" data-id="back" aria-pressed="'+back+'">Back end</button><button type="button" data-act="door" data-id="client" aria-pressed="'+(!back)+'">Client door</button>';
  $('who').value=S.who;$('who').disabled=!back;
  if(back){
    if(!S.flags[S.route]||!S.flags[S.route].back||((S.route==='developer'||S.route==='build')&&!(window.UNS_ME&&window.UNS_ME.is_dev)))S.route='home';
    $('nav').innerHTML=navHtml();
    $('whoTxt').textContent='Signed in as '+S.who+(S.who==='Tabish'?' (admin, Developer on)':' (founder)');
    $('topttl').textContent=lab(SECTIONS.map(function(s){return [s[0],s[1]];}),S.route);
    var fn=W.U.screens[S.route]||W.U.screens.home;
    $('main').innerHTML=(W.U.banner?W.U.banner():'')+fn();
  }else{
    $('main').innerHTML=(W.U.banner?W.U.banner():'')+W.U.clientDoor();
    $('topttl').textContent='Client door';
  }
  renderSheet();
  var sd=$('side');if(sd){sd.classList.toggle('open',S.ui.draw);}
}
W.U.render=render;
var H={sheet:false};   // true while an open sheet owns one extra history step, so the back gesture closes it
function sheetClosed(){var sh=$('sheet'),sc=$('scrim');sh.hidden=true;sc.hidden=true;if(H.sheet){H.sheet=false;try{history.back();}catch(e){}}}
function renderSheet(){
  var sh=$('sheet'),sc=$('scrim');
  if(!S.ui.sheet||S.door!=='back'){sheetClosed();return;}
  var f=W.U.sheets[S.ui.sheet.type];
  if(!f){sheetClosed();return;}
  if(!H.sheet){H.sheet=true;try{history.pushState({r:S.route,sheet:1},'',location.hash||('#'+S.route));}catch(e){}}
  var keep=sh.scrollTop;
  sh.innerHTML='<div class="in">'+f(S.ui.sheet)+'</div>';sh.hidden=false;sc.hidden=false;sh.scrollTop=keep;
}
W.U.renderSheet=renderSheet;
/* Each screen is a history step: back goes to the screen before, and on the first screen it leaves the app. */
function go(r){
  if(H.sheet){H.sheet=false;try{history.replaceState({r:r},'','#'+r);}catch(e){}}
  else if(r!==S.route){try{history.pushState({r:r},'','#'+r);}catch(e){}}
  S.route=r;S.ui.sheet=null;S.ui.client=null;S.ui.draw=false;render();window.scrollTo(0,0);
}
W.U.go=go;
window.addEventListener('popstate',function(e){
  var st=e.state||{};
  if(H.sheet&&!st.sheet){H.sheet=false;S.ui.sheet=null;var sh=$('sheet'),sc=$('scrim');sh.hidden=true;sc.hidden=true;return;}
  if(st.sheet)return;
  var r=st.r||(location.hash||'').replace('#','')||'home';
  if(S.door==='back'&&r!==S.route&&W.U.screens[r]){S.route=r;S.ui.sheet=null;S.ui.client=null;S.ui.draw=false;render();window.scrollTo(0,0);}
});
W.U.closeSheet=function(){S.ui.sheet=null;renderSheet();};
W.U.sheets={};W.U.screens={};W.U.acts={};

/* ---------- events ---------- */
document.addEventListener('click',function(e){
  var el=e.target.closest('[data-act]');
  if(!el){if(e.target.id==='scrim'){W.U.closeSheet();}return;}
  var a=el.getAttribute('data-act');
  if(a==='nav'){go(el.getAttribute('data-id'));return;}
  if(a==='door'){S.door=el.getAttribute('data-id');S.ui.sheet=null;S.ui.draw=false;render();return;}
  if(a==='theme'){S.theme=el.getAttribute('data-id');render();return;}
  if(a==='menu'){S.ui.draw=!S.ui.draw;render();return;}
  if(a==='reset'){W.U.reset();return;}
  var fn=W.U.acts[a];if(fn){fn(el,e);}
});
document.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target.getAttribute&&e.target.getAttribute('role')==='button'&&e.target.hasAttribute('data-act')){e.preventDefault();e.target.click();return;}
  if(e.key==='Escape'&&S.ui.sheet){W.U.closeSheet();}});
W.U.start=init;
function init(){
  $('who').addEventListener('change',function(){S.who=$('who').value;render();});
  var h=(location.hash||'').replace('#','');
  if(h==='client'){S.door='client';}else if(W.U.screens[h]){S.route=h;}
  render();
  try{history.replaceState({r:S.route},'','#'+(S.door==='client'?'client':S.route));}catch(e){}
}
})();
