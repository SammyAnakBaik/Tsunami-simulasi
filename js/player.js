// js/player.js
const Player = (() => {
  let cam, scene;
  let yaw=0, pitch=0, velY=0, onGround=false;
  let isLocked=false, quakeTimer=0;
  const keys={};
  const pos = new THREE.Vector3(0, CFG.PLAYER_H, 110);
  let _nearest=null;
  let footTimer=0;
  // Mobile input
  let mobileMove = { x:0, z:0 };
  let mobileRunning = false;

  function init(c, s) {
    cam=c; scene=s;
    cam.position.copy(pos);
    setupPointerLock();
    setupKeyboard();
    setupMouse();
  }

  function setupPointerLock() {
    const cv = document.getElementById('gameCanvas');
    cv.addEventListener('click', () => {
      if (!Game.isPaused() && Game.isStarted() && !MobileCtrl.isMobile()) cv.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      isLocked = document.pointerLockElement === document.getElementById('gameCanvas');
    });
  }

  function setupKeyboard() {
    document.addEventListener('keydown', e => {
      keys[e.code] = true;
      if (e.code==='Escape' && Game.isStarted()) Game.togglePause();
      if (e.code==='KeyE') tryInteract();
    });
    document.addEventListener('keyup', e => { keys[e.code]=false; });
  }

  function setupMouse() {
    document.addEventListener('mousemove', e => {
      if (!isLocked) return;
      yaw   -= e.movementX * CFG.CAM_SENS;
      pitch -= e.movementY * CFG.CAM_SENS;
      pitch  = Math.max(-Math.PI/2.4, Math.min(Math.PI/2.4, pitch));
    });
  }

  function update(dt) {
    applyGravity(dt);
    move(dt);
    applyCamera();
    checkNearest();
    updateCompass();
    if (quakeTimer>0) { applyQuake(dt); quakeTimer-=dt; }
  }

  function applyGravity(dt) {
    const gh = groundHeight(pos.x, pos.z);
    velY += CFG.GRAVITY * dt;
    pos.y += velY * dt;
    if (pos.y <= gh + CFG.PLAYER_H) { pos.y=gh+CFG.PLAYER_H; velY=0; onGround=true; }
    else onGround=false;
  }

  function move(dt) {
    const running = keys['ShiftLeft']||keys['ShiftRight']||mobileRunning;
    const spd = running ? CFG.PLAYER_RUN : CFG.PLAYER_SPEED;
    const fwd = new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
    const rgt = new THREE.Vector3( Math.cos(yaw),0,-Math.sin(yaw));
    const dir = new THREE.Vector3();

    // Keyboard
    if (keys['KeyW']||keys['ArrowUp'])    dir.addScaledVector(fwd, 1);
    if (keys['KeyS']||keys['ArrowDown'])  dir.addScaledVector(fwd,-1);
    if (keys['KeyA']||keys['ArrowLeft'])  dir.addScaledVector(rgt,-1);
    if (keys['KeyD']||keys['ArrowRight']) dir.addScaledVector(rgt, 1);

    // Mobile joystick
    if (mobileMove.x!==0||mobileMove.z!==0) {
      dir.addScaledVector(rgt, mobileMove.x);
      dir.addScaledVector(fwd,-mobileMove.z);
    }

    if (dir.lengthSq()>0) {
      dir.normalize();
      const next = pos.clone().addScaledVector(dir, spd*dt);
      if (!checkCollision(next)) pos.copy(next);

      // Footstep sounds
      footTimer-=dt;
      if (footTimer<=0) { Audio.playFootstep(); footTimer=running?0.28:0.45; }
    }

    if ((keys['Space']||false) && onGround) { velY=CFG.PLAYER_JUMP; onGround=false; }

    // Bounds
    pos.x=Math.max(-180,Math.min(180,pos.x));
    pos.z=Math.max(-155,Math.min(195,pos.z));
  }

  function applyCamera() {
    cam.position.copy(pos);
    cam.rotation.order='YXZ';
    cam.rotation.y=yaw; cam.rotation.x=pitch;
  }

  function applyQuake(dt) {
    const intensity = CFG.QUAKE_INT * Math.min(quakeTimer/CFG.QUAKE_DUR,1);
    cam.position.x+=(Math.random()-.5)*intensity*2.5;
    cam.position.y+=(Math.random()-.5)*intensity*1.2;
    cam.position.z+=(Math.random()-.5)*intensity*2.5;
  }

  function groundHeight(x,z) {
    const dHill=Math.sqrt(x*x+(z+115)*(z+115));
    if (dHill<75) { const t=Math.max(0,1-dHill/75); return t*t*14; }
    return Math.sin(x*0.03)*0.6+Math.cos(z*0.04)*0.4;
  }

  function checkCollision(next) {
    for (const obj of World.getCollidables()) {
      if (obj.type==='building') {
        const m=1.3;
        if (next.x>obj.x-obj.w/2-m && next.x<obj.x+obj.w/2+m &&
            next.z>obj.z-obj.d/2-m && next.z<obj.z+obj.d/2+m) return true;
      }
    }
    return false;
  }

  function checkNearest() {
    const all=[...World.getInteractables()];
    let best=null, bd=Infinity;
    for (const item of all) {
      if (item.used) continue;
      // Support both pos and position property
      const ipos = item.pos || item.position;
      if (!ipos) continue;
      const d=pos.distanceTo(ipos);
      if (d<item.r && d<bd) { best=item; bd=d; }
    }
    _nearest=best;
    if (best) UI.showInteract(best.label, MobileCtrl.isMobile());
    else UI.hideInteract();
  }

  function tryInteract() {
    if (!_nearest||_nearest.used) return;
    const item=_nearest;
    if (item.action==='rescue_npc' && item.npcRef && !item.npcRef.isRescued) {
      Missions.handleRescue(item.npcRef);
      item.used=true;
      UI.hideInteract();
    } else if (item.action==='evacuate') {
      Missions.handleEvacuate();
    } else if (item.action==='dialog') {
      UI.showDialog(item.npcRef, item);
    }
  }

  function updateCompass() {
    const safe=new THREE.Vector3(CFG.SAFE_ZONE.x, 0, CFG.SAFE_ZONE.z);
    const dir=safe.clone().sub(pos);
    dir.y=0; dir.normalize();
    const angle=Math.atan2(dir.x,dir.z)-yaw;
    const el=document.getElementById('safeArrow');
    if(el) el.style.transform=`rotate(${angle}rad)`;
  }

  function addMobileYaw(dx,dy) {
    yaw  -=dx*CFG.CAM_SENS*1.5;
    pitch-=dy*CFG.CAM_SENS*1.5;
    pitch=Math.max(-Math.PI/2.4,Math.min(Math.PI/2.4,pitch));
  }

  function setMobileMove(x,z) { mobileMove.x=x; mobileMove.z=z; }
  function setMobileRun(v)    { mobileRunning=v; }
  function mobileJump()       { if(onGround){velY=CFG.PLAYER_JUMP;onGround=false;} }
  function startQuake()       { quakeTimer=CFG.QUAKE_DUR; }
  function getPosition()      { return pos.clone(); }
  function getGroundH(x,z)    { return groundHeight(x,z); }
  function lock()             { document.getElementById('gameCanvas').requestPointerLock(); }
  function unlock()           { document.exitPointerLock(); }

  return { init, update, startQuake, getPosition, getGroundH, lock, unlock, tryInteract, addMobileYaw, setMobileMove, setMobileRun, mobileJump };
})();
