(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = 1200, H = 720;
  const roster = [
    {name:'Rivet', role:'THE SCRAPSHOT', color:'#ffb84d', dark:'#b76b35', hp:130, speed:205, damage:16, range:360, rate:.34, kind:'burst', icon:'⚙'},
    {name:'Luma', role:'STAR SPRINTER', color:'#f476a8', dark:'#b74675', hp:105, speed:255, damage:13, range:340, rate:.27, kind:'spray', icon:'✦'},
    {name:'Bruno', role:'IRON WALL', color:'#70c8e8', dark:'#3983a6', hp:190, speed:155, damage:20, range:300, rate:.52, kind:'heavy', icon:'⬟'},
    {name:'Zip', role:'QUICK DRAW', color:'#b18cff', dark:'#6b53bd', hp:115, speed:225, damage:12, range:440, rate:.19, kind:'rapid', icon:'⚡'},
    {name:'Moss', role:'WILD GARDENER', color:'#80d277', dark:'#398b53', hp:145, speed:185, damage:14, range:350, rate:.38, kind:'lob', icon:'❋'},
    {name:'Pip', role:'POCKET ROCKET', color:'#f6d05f', dark:'#c0922c', hp:120, speed:215, damage:22, range:420, rate:.58, kind:'rocket', icon:'✹'},
    {name:'Vex', role:'NIGHT SHIFT', color:'#7e96ff', dark:'#4858b1', hp:110, speed:225, damage:19, range:460, rate:.46, kind:'pierce', icon:'◈'},
    {name:'Bubbles', role:'SPLASH EXPERT', color:'#63d9cb', dark:'#2c9e9a', hp:135, speed:190, damage:15, range:380, rate:.42, kind:'splash', icon:'◉'},
    {name:'Tango', role:'CLOSE CALL', color:'#ff8172', dark:'#bd4b4d', hp:125, speed:235, damage:18, range:270, rate:.4, kind:'shotgun', icon:'✿'},
    {name:'Ollie', role:'THE TRICKSTER', color:'#d5a878', dark:'#94714d', hp:155, speed:195, damage:17, range:370, rate:.44, kind:'boomer', icon:'☄'}
  ];
  const keys = new Set(), pointers = new Map();
  const bounds = {x:38,y:94,w:1124,h:578};
  let screen = 'menu', selected = 0, player = null, bots = [], bullets = [], particles = [];
  let timer = 90, kills = 0, lives = 3, last = performance.now(), elapsed = 0;
  let mouse = {x:700,y:350}, mouseFire = false, joystick = null, soundOn = true, banner = 0, audioCtx = null;
  let obstacles = [];
  const rand = (a,b) => a + Math.random()*(b-a);
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const roundRect = (c,x,y,w,h,r,fill,stroke) => { c.beginPath(); c.roundRect(x,y,w,h,r); if(fill){c.fillStyle=fill;c.fill()} if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke()} };
  const text = (s,x,y,size,color='#fff',weight=700,align='left',font='Outfit') => {ctx.font=`${weight} ${size}px ${font}`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(s,x,y)};
  function resize(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}
  resize(); addEventListener('resize',resize);
  function pos(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
  function startMatch(){
    screen='game';timer=90;kills=0;lives=3;banner=2.2;bullets=[];particles=[];obstacles=makeMap();
    const b=roster[selected];player=makeEntity(600,384,b,true);player.super=0;player.aim=0;
    bots=[];for(let i=0;i<5;i++){const type=(selected+i+1+Math.floor(Math.random()*9))%roster.length;const p=spawnPoint(i);const bot=makeEntity(p.x,p.y,roster[type],false);bot.id=i;bot.ai=rand(0,2);bot.respawn=0;bots.push(bot)}
  }
  function makeEntity(x,y,data,isPlayer){return {x,y,data,isPlayer,r:isPlayer?22:21,hp:data.hp,maxHp:data.hp,cool:rand(.1,.8),alive:true,invuln:0,face:0,move:0,super:0,flash:0}}
  function spawnPoint(i){const spots=[{x:145,y:160},{x:1040,y:160},{x:150,y:585},{x:1048,y:580},{x:600,y:140}];return {...spots[i%spots.length]}}
  function makeMap(){return [
    {x:250,y:180,w:112,h:70,type:'rock'},{x:837,y:177,w:108,h:72,type:'rock'},
    {x:430,y:132,w:88,h:58,type:'bush'},{x:682,y:134,w:90,h:58,type:'bush'},
    {x:117,y:330,w:112,h:64,type:'bush'},{x:968,y:337,w:112,h:64,type:'bush'},
    {x:370,y:307,w:115,h:72,type:'rock'},{x:718,y:315,w:112,h:70,type:'rock'},
    {x:501,y:465,w:94,h:72,type:'bush'},{x:605,y:466,w:94,h:72,type:'bush'},
    {x:262,y:525,w:94,h:65,type:'rock'},{x:843,y:528,w:96,h:64,type:'rock'},
    {x:490,y:250,w:74,h:48,type:'bush'},{x:635,y:250,w:74,h:48,type:'bush'}
  ]}
  function obstacleAt(x,y,r=12){return obstacles.find(o=>x+r>o.x&&x-r<o.x+o.w&&y+r>o.y&&y-r<o.y+o.h)}
  function moveEntity(e,dx,dy){let nx=clamp(e.x+dx,bounds.x+e.r,bounds.x+bounds.w-e.r),ny=clamp(e.y+dy,bounds.y+e.r,bounds.y+bounds.h-e.r);if(!obstacleAt(nx,e.y,e.r))e.x=nx;if(!obstacleAt(e.x,ny,e.r))e.y=ny}
  function pointerDown(e){e.preventDefault();canvas.setPointerCapture(e.pointerId);const p=pos(e);pointers.set(e.pointerId,p);
    if(screen==='menu'){if(p.x>=558&&p.x<=1141&&p.y>=115&&p.y<=386){const col=Math.floor((p.x-558)/119),row=Math.floor((p.y-115)/143);if(col>=0&&col<5&&row>=0&&row<2){selected=row*5+col;return}}if(p.x<475&&p.y>565&&p.y<660){startMatch();return}if(p.x>985&&p.y>565&&p.y<680){startMatch();return}return}
    if(screen==='over'){if(p.y>520){screen='menu';return}}
    if(screen==='game'){
      if(p.x>1040&&p.y>555){useSuper();return}
      if(p.x<450&&p.y>285){joystick={id:e.pointerId,x:p.x,y:p.y,dx:0,dy:0};return}
      mouse=p;mouseFire=true;
    }
  }
  function pointerMove(e){const p=pos(e);if(pointers.has(e.pointerId))pointers.set(e.pointerId,p);if(joystick&&joystick.id===e.pointerId){joystick.dx=clamp((p.x-joystick.x)/65,-1,1);joystick.dy=clamp((p.y-joystick.y)/65,-1,1)}else{mouse=p;if(pointers.has(e.pointerId)&&screen==='game'&&e.pointerType==='mouse')mouseFire=true}}
  function pointerUp(e){pointers.delete(e.pointerId);if(joystick&&joystick.id===e.pointerId)joystick=null;mouseFire=false;}
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',pointerUp);canvas.addEventListener('contextmenu',e=>e.preventDefault());
  addEventListener('keydown',e=>{keys.add(e.key.toLowerCase());if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()))e.preventDefault();if(screen==='menu'&&e.key==='Enter')startMatch();if(screen==='menu'&&/^[1-9]$/.test(e.key))selected=Number(e.key)-1;if(screen==='menu'&&e.key==='0')selected=9;if(e.key===' '||e.key.toLowerCase()==='e')useSuper();if(e.key==='Escape'&&screen==='game')screen='menu'});
  addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  document.getElementById('soundBtn').addEventListener('click',()=>{soundOn=!soundOn;document.querySelector('#soundBtn span').textContent=soundOn?'Sound on':'Sound off';document.getElementById('soundBtn').style.opacity=soundOn?'1':'.65'});
  function useSuper(){if(screen!=='game'||!player||player.super<100||!player.alive)return;player.super=0;player.invuln=.45;particles.push({x:player.x,y:player.y,r:15,max:150,t:.5,color:player.data.color,ring:true});for(const b of bots){if(b.alive&&dist(player,b)<145){damage(b,player.data.damage*2.2,player);let a=Math.atan2(b.y-player.y,b.x-player.x);moveEntity(b,Math.cos(a)*38,Math.sin(a)*38)}}}
  function update(dt){elapsed+=dt;if(screen!=='game')return;timer-=dt;if(timer<=0){timer=0;finish(kills>=12)}if(kills>=12){finish(true);return}if(!player.alive){player.respawn-=dt;if(player.respawn<=0){if(lives<=0){finish(false);return}player.alive=true;player.hp=player.maxHp;player.x=600;player.y=384;player.invuln=1.6;player.super=Math.max(0,player.super-25)}}
    if(player.alive){player.invuln=Math.max(0,player.invuln-dt);player.cool-=dt;player.flash=Math.max(0,player.flash-dt);let mx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),my=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);if(joystick){mx=joystick.dx;my=joystick.dy}let n=Math.hypot(mx,my);if(n>1){mx/=n;my/=n}player.move=Math.hypot(mx,my);if(n>.1){player.face=Math.atan2(my,mx);moveEntity(player,mx*player.data.speed*dt,my*player.data.speed*dt)}let aim=Math.atan2(mouse.y-player.y,mouse.x-player.x);if(!joystick)player.face=aim;
      if((mouseFire||keys.has('j')||keys.has('k'))&&player.cool<=0){shoot(player,aim);player.cool=player.data.rate}
    }
    for(const b of bots){if(!b.alive){b.respawn-=dt;if(b.respawn<=0){const p=spawnPoint(b.id);b.x=p.x;b.y=p.y;b.hp=b.maxHp;b.alive=true;b.invuln=.8;b.cool=rand(.5,1.3)}continue}b.cool-=dt;b.invuln=Math.max(0,b.invuln-dt);b.flash=Math.max(0,b.flash-dt);if(!player.alive)continue;const d=dist(b,player),a=Math.atan2(player.y-b.y,player.x-b.x);b.face=a;b.ai-=dt;let strafe=Math.sin(elapsed*1.1+b.id*2.7);let vx=0,vy=0;if(d>270){vx=Math.cos(a);vy=Math.sin(a)}else if(d<155){vx=-Math.cos(a)*.75;vy=-Math.sin(a)*.75}vx+=Math.cos(a+Math.PI/2)*strafe*.65;vy+=Math.sin(a+Math.PI/2)*strafe*.65;let len=Math.hypot(vx,vy)||1;moveEntity(b,vx/len*b.data.speed*.55*dt,vy/len*b.data.speed*.55*dt);if(d<b.data.range*.84&&b.cool<=0){shoot(b,a);b.cool=b.data.rate*rand(1.15,1.75)}}
    for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];b.life-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.life<=0||b.x<bounds.x||b.x>bounds.x+bounds.w||b.y<bounds.y||b.y>bounds.y+bounds.h||obstacleAt(b.x,b.y,3)){if(b.splash)burst(b.x,b.y,b.owner,b.damage,68);bullets.splice(i,1);continue}if(b.owner.isPlayer){for(const t of bots){if(t.alive&&dist(b,t)<t.r+b.r){damage(t,b.damage,b.owner);if(b.splash)burst(b.x,b.y,b.owner,b.damage*.55,58);bullets.splice(i,1);break}}}else if(player.alive&&dist(b,player)<player.r+b.r){damage(player,b.damage,b.owner);if(b.splash)burst(b.x,b.y,b.owner,b.damage*.55,58);bullets.splice(i,1)}}
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.t-=dt;if(p.t<=0)particles.splice(i,1)}
  }
  function sfx(freq=260,duration=.055){if(!soundOn)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!audioCtx)audioCtx=new AC();if(audioCtx.state==='suspended')audioCtx.resume();const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type='square';osc.frequency.setValueAtTime(freq,audioCtx.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(70,freq*.55),audioCtx.currentTime+duration);gain.gain.setValueAtTime(.035,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);osc.connect(gain);gain.connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+duration)}catch(_){}}
  function shoot(owner,a){if(owner.isPlayer)sfx(owner.data.kind==='rocket'?150:270,.06);const d=owner.data;let count=1,spread=0,speed=520,damageValue=d.damage,life=d.range/speed,splash=0;if(d.kind==='burst'){count=3;spread=.17;damageValue*=.72;speed=510}else if(d.kind==='spray'){count=2;spread=.12;speed=500}else if(d.kind==='heavy'){speed=440;life*=.9}else if(d.kind==='rapid'){speed=570;damageValue*=.82}else if(d.kind==='lob'){speed=360;life*=1.08;splash=48}else if(d.kind==='rocket'){speed=410;splash=40}else if(d.kind==='pierce'){speed=650;life*=1.12}else if(d.kind==='splash'){speed=440;splash=56}else if(d.kind==='shotgun'){count=5;spread=.43;damageValue*=.55;speed=430;life*=.72}else if(d.kind==='boomer'){speed=460;life*=.82}
    for(let i=0;i<count;i++){const angle=a+(count===1?0:(i-(count-1)/2)*spread);bullets.push({x:owner.x+Math.cos(angle)*25,y:owner.y+Math.sin(angle)*25,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life,r:d.kind==='rocket'?7:5,damage:damageValue,owner,splash,boomer:d.kind==='boomer',color:d.color})}owner.flash=.12;owner.face=a;
  }
  function damage(target,amount,source){if(!target.alive||target.invuln>0)return;target.hp-=amount;target.flash=.18;if(source&&source.isPlayer)player.super=Math.min(100,player.super+amount*.48);if(target.hp<=0){target.hp=0;target.alive=false;for(let i=0;i<12;i++)particles.push({x:target.x,y:target.y,vx:rand(-120,120),vy:rand(-120,120),t:rand(.3,.7),r:rand(3,8),color:target.data.color});if(target.isPlayer){lives--;target.respawn=1.5;banner=1.5}else{kills++;target.respawn=1.7;banner=.8}}}
  function burst(x,y,owner,amount,radius){if(owner.isPlayer){for(const b of bots)if(b.alive&&Math.hypot(b.x-x,b.y-y)<radius)damage(b,amount,owner)}else if(player.alive&&Math.hypot(player.x-x,player.y-y)<radius)damage(player,amount,owner)}
  function finish(win){if(screen==='over')return;screen='over';result=win?'VICTORY!':'WIPEOUT';}
  let result='';
  function drawBackground(){ctx.fillStyle='#182a31';ctx.fillRect(0,0,W,H);ctx.fillStyle='#20393b';ctx.fillRect(bounds.x,bounds.y,bounds.w,bounds.h);ctx.save();ctx.beginPath();ctx.rect(bounds.x,bounds.y,bounds.w,bounds.h);ctx.clip();for(let x=bounds.x;x<bounds.x+bounds.w;x+=38)for(let y=bounds.y;y<bounds.y+bounds.h;y+=38){const n=((x*7+y*13)%37);ctx.fillStyle=n<8?'#25413f':n<17?'#223c3c':'#203a39';ctx.fillRect(x+(y%3),y+(x%5),2,2)}ctx.strokeStyle='#31504d';ctx.lineWidth=1;for(let x=bounds.x+18;x<bounds.x+bounds.w;x+=88){ctx.beginPath();ctx.moveTo(x,bounds.y);ctx.lineTo(x,bounds.y+bounds.h);ctx.stroke()}ctx.restore();
    // arena border and corner bolts
    ctx.strokeStyle='#69847c';ctx.lineWidth=5;ctx.strokeRect(bounds.x,bounds.y,bounds.w,bounds.h);for(const [x,y] of [[48,104],[1152,104],[48,662],[1152,662]]){ctx.fillStyle='#a1b39a';ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill()}
    for(const o of obstacles){if(o.type==='rock'){roundRect(ctx,o.x,o.y+7,o.w,o.h,15,'#15272c');roundRect(ctx,o.x,o.y,o.w,o.h-7,15,'#64776b','#829685');roundRect(ctx,o.x+8,o.y+7,o.w-16,9,5,'#819486')}else{ctx.fillStyle='#172c2e';ctx.beginPath();ctx.ellipse(o.x+o.w/2,o.y+o.h/2+8,o.w/2,o.h/2,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#397951';ctx.beginPath();ctx.ellipse(o.x+o.w/2,o.y+o.h/2,o.w/2,o.h/2,0,0,Math.PI*2);ctx.fill();for(let i=0;i<13;i++){const x=o.x+rand(5,o.w-5),y=o.y+rand(5,o.h-5);ctx.fillStyle=i%2?'#4b9861':'#5aa66a';ctx.beginPath();ctx.arc(x,y,rand(3,7),0,Math.PI*2);ctx.fill()}}}
  }
  function drawFighter(e){if(!e.alive)return;ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.face);const d=e.data;ctx.globalAlpha=e.invuln>0&&Math.floor(elapsed*14)%2===0?.45:1;
    ctx.fillStyle='#0d1b20aa';ctx.beginPath();ctx.ellipse(0,17,22,10,0,0,Math.PI*2);ctx.fill();
    // blaster arm points forward
    roundRect(ctx,7,-8,25,15,6,d.dark,'#263641');roundRect(ctx,23,-6,15,10,4,'#d7e1d7','#3a4b4c');
    ctx.fillStyle=d.color;ctx.beginPath();ctx.arc(0,0,21,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#243a3b';ctx.lineWidth=3;ctx.stroke();
    // distinctive helmet / hair silhouette
    ctx.fillStyle=d.dark;ctx.beginPath();ctx.arc(-3,-8,14,Math.PI,Math.PI*2);ctx.lineTo(12,1);ctx.lineTo(-16,1);ctx.closePath();ctx.fill();
    ctx.fillStyle='#f9ead0';ctx.beginPath();ctx.arc(5,1,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#20323a';ctx.beginPath();ctx.arc(7,0,2.2,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#263a3f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(4,4,7,.2,1.4);ctx.stroke();
    if(e.isPlayer){ctx.fillStyle='#fff4bc';ctx.beginPath();ctx.arc(-7,12,4,0,Math.PI*2);ctx.fill()}
    if(e.flash>0){ctx.globalAlpha=.7;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,22,0,Math.PI*2);ctx.fill()}
    ctx.restore();ctx.globalAlpha=1;
    // health bar
    if(!e.isPlayer||e.hp<e.maxHp){const w=e.isPlayer?54:42,x=e.x-w/2,y=e.y-34;roundRect(ctx,x,y,w,6,3,'#18262b');roundRect(ctx,x,y,w*clamp(e.hp/e.maxHp,0,1),6,3,e.hp/e.maxHp>.45?'#71df9b':'#ff716c')}
  }
  function drawHUD(){ctx.fillStyle='#13222c';ctx.fillRect(0,0,W,82);ctx.fillStyle='#203541';ctx.fillRect(0,80,W,3);
    // player identity
    roundRect(ctx,25,17,43,43,13,player.data.color);text(player.data.name[0],46,39,23,'#172831',900,'center');text(player.data.name.toUpperCase(),80,27,13,'#fff',800);text(player.data.role,80,47,9,'#94a9b5',800);
    roundRect(ctx,250,20,190,39,12,'#233844');text('✦  '+kills+' / 12',275,39,18,'#ffce65',800);text('TAKEDOWNS',340,39,9,'#b3c2ca',800);
    roundRect(ctx,486,20,228,39,12,'#233844');text('TIME',510,39,9,'#a8bbc3',800);text('⌛',548,39,16,'#f1cb67',700);text(`${Math.floor(timer/60)}:${String(Math.ceil(timer%60)).padStart(2,'0')}`,612,39,18,timer<15?'#ff7b71':'#fff',800,'center');
    text('LIVES',966,27,9,'#a8bbc3',800);for(let i=0;i<3;i++){ctx.fillStyle=i<lives?'#ff8274':'#3b4c52';ctx.beginPath();ctx.arc(1020+i*25,39,8,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffe2c4';ctx.lineWidth=1;ctx.stroke()}
    // super meter
    text('SUPER',1095,23,9,'#a8bbc3',800,'center');roundRect(ctx,1040,34,112,13,7,'#354850');roundRect(ctx,1040,34,112*player.super/100,13,7,player.super>=100?'#ffcc58':'#62cfaa');if(player.super>=100){ctx.strokeStyle='#ffe389';ctx.lineWidth=2;ctx.strokeRect(1038,32,116,17)}
  }
  function drawControls(){roundRect(ctx,24,624,280,34,11,'#172a30dd','#405b5b');text('WASD',45,641,11,'#ffcf68',800);text('MOVE',87,641,9,'#c0d0cc',700);text('MOUSE',140,641,11,'#ffcf68',800);text('AIM + FIRE',194,641,9,'#c0d0cc',700);roundRect(ctx,314,624,101,34,11,'#172a30dd','#405b5b');text('SPACE',342,641,10,'#ffcf68',800);text('SUPER',384,641,9,'#c0d0cc',700);
    roundRect(ctx,1042,612,132,48,15,player.super>=100?'#f2bd49':'#2c424a',player.super>=100?'#ffe08a':'#50676a');text(player.super>=100?'✦ READY':'SUPER',1108,630,12,player.super>=100?'#25343a':'#b0c1c4',900,'center');text('SPACE / TAP',1108,647,8,player.super>=100?'#33464a':'#93a7aa',800,'center');
    if(matchMedia('(pointer:coarse)').matches){ctx.globalAlpha=.24;ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(120,535,52,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(120,535,20,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(960,535,48,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}
  }
  function drawMenu(){const bg=ctx.createLinearGradient(0,0,1200,720);bg.addColorStop(0,'#1c323b');bg.addColorStop(.52,'#172b35');bg.addColorStop(1,'#213d3d');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);for(let i=0;i<55;i++){let x=(i*197+40)%1200,y=(i*113+27)%720;ctx.fillStyle=i%4?'#d9eac00b':'#f8c65c14';ctx.beginPath();ctx.arc(x,y,(i%3)+1,0,Math.PI*2);ctx.fill()}
    // left hero panel
    roundRect(ctx,28,25,493,670,24,'#1b3038','#42605e');text('THE SCRAPYARD',60,68,11,'#70d6b2',900);roundRect(ctx,60,86,33,3,2,'#70d6b2');text('PICK YOUR',60,128,38,'#f1f3e7',900);text('BRAWLER.',60,168,38,'#ffcb61',900);text('10 troublemakers. One tiny arena.',62,204,14,'#a8bdba',500,'left','DM Sans');
    // featured portrait stage
    ctx.fillStyle='#213b3d';ctx.beginPath();ctx.ellipse(281,377,163,139,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#385857';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(281,377,130,110,0,0,Math.PI*2);ctx.stroke();ctx.save();ctx.translate(281,355);ctx.scale(3.35,3.35);drawFighter({...makeEntity(0,0,roster[selected],true),face:.1,alive:true});ctx.restore();
    text(roster[selected].name.toUpperCase(),281,504,25,'#fff',900,'center');text(roster[selected].role,281,529,10,roster[selected].color,900,'center');
    // quick stats
    const d=roster[selected];[['HEALTH',d.hp/2],['SPEED',d.speed/3],['RANGE',d.range/5]].forEach((v,i)=>{let x=74+i*145;text(v[0],x,562,9,'#a8bdb8',800);roundRect(ctx,x,574,112,7,4,'#31484a');roundRect(ctx,x,574,112*clamp(v[1]/100,0,1),7,4,d.color)});
    roundRect(ctx,62,605,275,58,16,'#ffca5c');text('ENTER THE ARENA',199,627,15,'#263943',900,'center');text('CLICK TO PLAY  →',199,647,9,'#66552f',900,'center');text('01 / 10',446,635,10,'#9bb2ad',800,'center');
    // roster area
    text('CHOOSE YOUR CHAOS',559,63,12,'#eef5e5',900);text('Each fighter has their own style.',559,86,12,'#8da7a3',500,'left','DM Sans');
    for(let i=0;i<roster.length;i++){const col=i%5,row=Math.floor(i/5),x=558+col*119,y=115+row*143,d=roster[i],active=i===selected;roundRect(ctx,x,y,108,128,15,active?'#34524d':'#223a40',active?d.color:'#3a5758');if(active){ctx.globalAlpha=.16;roundRect(ctx,x+3,y+3,102,122,13,d.color);ctx.globalAlpha=1}
      ctx.fillStyle='#172c32';ctx.beginPath();ctx.arc(x+54,y+45,31,0,Math.PI*2);ctx.fill();ctx.save();ctx.translate(x+54,y+47);ctx.scale(1.05,1.05);drawFighter({...makeEntity(0,0,d,false),face:.05,alive:true});ctx.restore();text(String(i+1).padStart(2,'0'),x+14,y+16,8,'#94aaa6',800);text(d.name,x+54,y+91,12,active?'#fff':'#dce8df',900,'center');text(d.role,x+54,y+108,7,d.color,800,'center');
    }
    roundRect(ctx,558,416,583,57,14,'#20383d','#3a5656');text('QUICK TIP',577,434,9,'#ffca5c',900);text('Build your super by dealing damage, then unleash it with SPACE.',577,454,12,'#bfd0c5',600,'left','DM Sans');
    roundRect(ctx,558,487,583,61,14,'#20383d','#3a5656');text('HOW TO PLAY',577,506,9,'#70d6b2',900);text('Move with WASD • Aim and fire with your mouse • Get 12 takedowns!',577,527,12,'#bfd0c5',600,'left','DM Sans');
    text('MOVE',559,584,9,'#8fa8a3',800);text('WASD / ARROWS',609,584,10,'#d9e5d9',700);text('FIRE',782,584,9,'#8fa8a3',800);text('MOUSE / J',822,584,10,'#d9e5d9',700);text('SUPER',970,584,9,'#8fa8a3',800);text('SPACE / E',1020,584,10,'#d9e5d9',700);
    roundRect(ctx,558,613,583,55,15,'#67d3ae');text('▶',585,641,15,'#173b39',900);text('DROP INTO THE ARENA',848,641,16,'#173b39',900,'center');text('START',1104,641,10,'#27514a',900,'center');
  }
  function drawGame(){drawBackground();drawHUD();for(const b of bullets){ctx.fillStyle=b.color;ctx.shadowColor=b.color;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;if(b.splash){ctx.strokeStyle='#fff8';ctx.lineWidth=1;ctx.beginPath();ctx.arc(b.x,b.y,b.r+3,0,Math.PI*2);ctx.stroke()}}
    for(const p of particles){if(p.ring){ctx.globalAlpha=clamp(p.t/.5,0,1);ctx.strokeStyle=p.color;ctx.lineWidth=5;ctx.beginPath();ctx.arc(p.x,p.y,p.max*(1-p.t/.5)+p.r,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}else{ctx.globalAlpha=clamp(p.t/.7,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x+(p.vx||0)*(.7-p.t),p.y+(p.vy||0)*(.7-p.t),p.r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}}
    bots.forEach(drawFighter);if(player.alive)drawFighter(player);else{text('RESPAWNING…',600,365,16,'#fff',900,'center')}
    drawControls();if(banner>0){banner-=1/60;roundRect(ctx,440,92,320,36,12,'#12262ddd','#47645c');text(kills>=12?'TARGET COMPLETE!':`TAKEDOWN  ${kills} / 12`,600,110,13,'#ffda79',900,'center')}
  }
  function drawOver(){drawGame();ctx.fillStyle='#09161bcc';ctx.fillRect(0,0,W,H);roundRect(ctx,365,170,470,380,26,'#1b3038','#55716b');text(result,600,231,42,result==='VICTORY!'?'#ffcd5c':'#ff8172',900,'center');text(result==='VICTORY!'?'YOU OWN THE SCRAPYARD':'THE ARENA WINS THIS ROUND',600,276,12,'#bed0ca',800,'center');roundRect(ctx,463,323,274,74,16,'#263f43');text('✦  '+kills+' TAKEDOWNS',600,348,18,'#ffda79',900,'center');text('SURVIVED  '+Math.floor(90-timer)+' SECONDS',600,376,10,'#a8c0b9',800,'center');roundRect(ctx,458,429,284,64,16,'#ffca5c');text('BACK TO BRAWLERS',600,454,14,'#263943',900,'center');text('TAP / CLICK TO CONTINUE',600,477,9,'#6a5932',800,'center')}
  function frame(now){const dt=Math.min(.033,(now-last)/1000||0);last=now;if(screen==='game')update(dt);ctx.clearRect(0,0,W,H);if(screen==='menu')drawMenu();else if(screen==='game')drawGame();else drawOver();requestAnimationFrame(frame)}
  requestAnimationFrame(frame);
})();
