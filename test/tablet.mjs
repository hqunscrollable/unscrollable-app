import { chromium } from 'playwright';
const B='http://localhost:8787',PW='test-pass-123456';
const sizes=[[744,1133],[768,1024],[820,1180],[834,1194],[1024,768],[1180,820],[1194,834]];
const routes=['home','leads','tasks','intake','settings','watchlist','followups','decisions','calendar'];
const br=await chromium.launch();
for(const [w,h] of sizes){
 const ctx=await br.newContext({viewport:{width:w,height:h},hasTouch:true,serviceWorkers:'block'});const pg=await ctx.newPage();
 await pg.goto(B+'/app/login.html');await pg.fill('#id','tabish');await pg.fill('#pw',PW);await pg.click('#go');await pg.waitForURL('**/app/');await pg.waitForTimeout(700);
 for(const r of routes){
  await pg.evaluate(r=>{location.hash='#'+r},r);await pg.waitForTimeout(500);
  const o=await pg.evaluate(()=>{const W=innerWidth;const bad=[];document.querySelectorAll('main *, .main *').forEach(e=>{const b=e.getBoundingClientRect();if(b.width&&b.right>W+1&&!e.closest('.board,.lboard,[style*="overflow"],.cal,table'))bad.push((e.className||e.tagName)+':'+Math.round(b.right))});
   const small=[];document.querySelectorAll('button,a,select,input').forEach(e=>{const b=e.getBoundingClientRect();if(b.width&&b.height&&b.height<36&&getComputedStyle(e).visibility!=='hidden'&&b.top>=0&&b.top<innerHeight)small.push(e.tagName)});
   return {sw:document.documentElement.scrollWidth,W,bad:bad.slice(0,4),small:small.length,route:location.hash}});
  console.log(w+'x'+h,r,JSON.stringify(o));
  if(['leads','home','tasks'].includes(r))await pg.screenshot({path:`/tmp/tab/${w}-${r}.png`});
 }
 await ctx.close();
}
await br.close();
