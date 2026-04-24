// js/mobile.js
const MobileCtrl = (() => {
  let mobile=false;
  let joystickActive=false;
  let joystickOrigin={x:0,y:0};
  let lookOrigin={x:0,y:0};
  let lookActive=false;
  let lookTouchId=null;
  const MAX_JOYSTICK=50;

  function detect() {
    mobile = /Android|iPhone|iPad|iPod|Touch/i.test(navigator.userAgent) ||
             (navigator.maxTouchPoints>0 && window.innerWidth<1100) ||
             window.matchMedia('(pointer:coarse)').matches;
    return mobile;
  }

  function init() {
    mobile=detect();
    if(mobile) setupMobile();
    else setupDesktop();
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', ()=>setTimeout(handleResize,300));
  }

  function setupMobile() {
    // Show mobile UI
    ['joystickZone','lookZone','mobBtns'].forEach(id=>document.getElementById(id)?.classList.remove('hidden'));
    // Hide desktop stuff
    document.getElementById('crosshair')?.classList.add('hidden');

    // Update ctrl box to show touch controls
    const cb=document.getElementById('ctrlBox'); if(cb){
      const cg=document.createElement('div'); cg.className='ctrl-grid';
      const pairs=[['Joystick L','Bergerak'],['Drag Kanan','Lihat'],['🏃','Lari'],['↑','Lompat'],['E','Interaksi']];
      pairs.forEach(([k,v])=>{ cg.innerHTML+=`<span class="key">${k}</span><span class="val">${v}</span>`; });
      cb.innerHTML='<div class="ctrl-title">KONTROL SENTUH</div>';
      cb.appendChild(cg);
    }

    setupJoystick();
    setupLook();
    setupMobileButtons();
  }

  function setupDesktop() {
    // Show desktop ctrl hints
    const cb=document.getElementById('ctrlBox'); if(!cb)return;
    const cg=document.createElement('div'); cg.className='ctrl-grid';
    const pairs=[['WASD','Bergerak'],['Mouse','Lihat'],['Shift','Lari'],['Space','Lompat'],['E','Interaksi'],['ESC','Pause']];
    pairs.forEach(([k,v])=>{ cg.innerHTML+=`<span class="key">${k}</span><span class="val">${v}</span>`; });
    cb.innerHTML='<div class="ctrl-title">KONTROL</div>';
    cb.appendChild(cg);
  }

  function setupJoystick() {
    const zone=document.getElementById('joystickZone');
    const base=document.getElementById('jBase');
    const thumb=document.getElementById('jThumb');
    if(!zone||!base||!thumb)return;

    zone.addEventListener('touchstart',e=>{
      e.preventDefault();
      const t=e.changedTouches[0];
      joystickActive=true;
      joystickOrigin={x:t.clientX,y:t.clientY};
    },{passive:false});

    zone.addEventListener('touchmove',e=>{
      e.preventDefault();
      if(!joystickActive)return;
      const t=e.changedTouches[0];
      let dx=t.clientX-joystickOrigin.x;
      let dy=t.clientY-joystickOrigin.y;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist>MAX_JOYSTICK){ dx=dx/dist*MAX_JOYSTICK; dy=dy/dist*MAX_JOYSTICK; }
      thumb.style.transform=`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      Player.setMobileMove(dx/MAX_JOYSTICK, dy/MAX_JOYSTICK);
    },{passive:false});

    zone.addEventListener('touchend',e=>{
      e.preventDefault();
      joystickActive=false;
      thumb.style.transform='translate(-50%,-50%)';
      Player.setMobileMove(0,0);
    },{passive:false});
  }

  function setupLook() {
    const lz=document.getElementById('lookZone'); if(!lz)return;
    lz.addEventListener('touchstart',e=>{
      e.preventDefault();
      const t=e.changedTouches[0];
      lookActive=true; lookTouchId=t.identifier;
      lookOrigin={x:t.clientX,y:t.clientY};
    },{passive:false});
    lz.addEventListener('touchmove',e=>{
      e.preventDefault();
      for(let i=0;i<e.changedTouches.length;i++){
        const t=e.changedTouches[i];
        if(t.identifier===lookTouchId){
          Player.addMobileYaw(t.clientX-lookOrigin.x, t.clientY-lookOrigin.y);
          lookOrigin={x:t.clientX,y:t.clientY};
        }
      }
    },{passive:false});
    lz.addEventListener('touchend',e=>{
      e.preventDefault(); lookActive=false; lookTouchId=null;
    },{passive:false});
  }

  function setupMobileButtons() {
    const run=document.getElementById('mbRun');
    const jump=document.getElementById('mbJump');
    const act=document.getElementById('mbAct');
    const pause=document.getElementById('mbPause');
    if(run){
      run.addEventListener('touchstart',e=>{e.preventDefault();Player.setMobileRun(true);},{passive:false});
      run.addEventListener('touchend',e=>{e.preventDefault();Player.setMobileRun(false);},{passive:false});
    }
    if(jump){ jump.addEventListener('touchstart',e=>{e.preventDefault();Player.mobileJump();},{passive:false}); }
    if(act){  act.addEventListener('touchstart',e=>{e.preventDefault();Player.tryInteract();},{passive:false}); }
    if(pause){ pause.addEventListener('touchstart',e=>{e.preventDefault();Game.togglePause();},{passive:false}); }
  }

  function handleResize() {
    const canvas=document.getElementById('gameCanvas');
    if(!canvas)return;
    canvas.width=window.innerWidth;
    canvas.height=window.innerHeight;
    // Mobile landscape adjustments handled by CSS
  }

  function isMobile() { return mobile; }
  function runOn()    { Player.setMobileRun(true); }
  function runOff()   { Player.setMobileRun(false); }
  function jump()     { Player.mobileJump(); }

  return { init, detect, isMobile, runOn, runOff, jump };
})();

// Difficulty select helper
function selectDiff(el) {
  document.querySelectorAll('.diff-card').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
}
