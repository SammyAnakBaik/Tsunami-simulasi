// js/game.js
const Game = (() => {
  let scene, camera, renderer, clock;
  let elapsed=0, paused=false, started=false, over=false;
  let difficulty='normal';
  let quakeTriggered=false, warnTriggered=false, waveTriggered=false, phase3Done=false;
  let startTime=0;

  // ── BOOT ─────────────────────────────────────────────
  window.addEventListener('DOMContentLoaded',()=>{
    MobileCtrl.init();
    fakeLoad(()=>{
      document.getElementById('loadingScreen').classList.add('hidden');
      document.getElementById('diffScreen').classList.remove('hidden');
      document.getElementById('diffNext').onclick=()=>{
        document.getElementById('diffScreen').classList.add('hidden');
        document.getElementById('introScreen').classList.remove('hidden');
      };
    });
  });

  function fakeLoad(cb) {
    const steps=[
      [8,'Membangun kota Banda Aceh...'],
      [22,'Menyiapkan sistem tsunami...'],
      [40,'Membuat NPC warga...'],
      [58,'Mengcompile shader 3D...'],
      [72,'Menginisialisasi audio...'],
      [88,'Menyiapkan kontrol mobile...'],
      [100,'Siap! Selamat datang.'],
    ];
    let i=0;
    (function step(){
      if(i>=steps.length){setTimeout(cb,500);return;}
      UI.setLoad(steps[i][0],steps[i][1]); i++;
      setTimeout(step,220+Math.random()*200);
    })();
  }

  function setDifficulty(d) { difficulty=d; }

  function showIntro() {
    document.getElementById('diffScreen').classList.add('hidden');
    document.getElementById('introScreen').classList.remove('hidden');
  }

  // ── THREE.JS INIT ─────────────────────────────────────
  function initThree() {
    scene=new THREE.Scene();
    scene.fog=new THREE.Fog(0xbbe8f0,60,380);

    camera=new THREE.PerspectiveCamera(CFG.CAM_FOV, window.innerWidth/window.innerHeight, 0.1, 800);

    const canvas=document.getElementById('gameCanvas');
    renderer=new THREE.WebGLRenderer({ canvas, antialias:!MobileCtrl.isMobile(), powerPreference:'high-performance' });
    renderer.setSize(window.innerWidth,window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MobileCtrl.isMobile()?1.5:2));
    renderer.shadowMap.enabled=!MobileCtrl.isMobile(); // disable shadows on mobile for perf
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.15;

    window.addEventListener('resize',()=>{
      camera.aspect=window.innerWidth/window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth,window.innerHeight);
    });

    clock=new THREE.Clock();
  }

  // ── START GAME ────────────────────────────────────────
  function startGame() {
    document.getElementById('introScreen').classList.add('hidden');

    initThree();
    Audio.init();
    Audio.ensure();

    const diff=DIFFICULTY[difficulty];
    const npcCount=diff.npcCount;

    World.init(scene);
    NPCSystem.init(scene, npcCount);
    Player.init(camera, scene);

    const waveTime=CFG.WAVE_TIME/diff.waveTimeMul;
    Tsunami.init(scene, diff.waveSpeedMul);

    Missions.init();

    UI.showHUD();
    UI.updateNPCCount(0, npcCount);

    Audio.playAmbience();
    started=true;
    startTime=Date.now();

    if(!MobileCtrl.isMobile()) setTimeout(()=>Player.lock(), 300);

    requestAnimationFrame(loop);
  }

  // ── GAME LOOP ─────────────────────────────────────────
  function loop() {
    if(over) return;
    requestAnimationFrame(loop);
    const dt=Math.min(clock.getDelta(), 0.05);
    if(paused) return;
    elapsed+=dt;

    World.updateOcean(elapsed);
    Player.update(dt);
    UI.updateClock(elapsed);
    UI.checkNarratives(elapsed);

    const playerPos=Player.getPosition();
    NPCSystem.update(dt, playerPos, Tsunami.isActive(), Tsunami.getWaveZ());

    runTimeline(elapsed);

    if(Tsunami.isActive()) {
      const res=Tsunami.update(dt, playerPos);
      if(res==='caught' && !over) endGame('lose');
      if(res==='safe' && !over) endGame('win');
    }

    if(!over && Missions.isEvacuated()) endGame('win');

    renderer.render(scene, camera);
  }

  // ── TIMELINE ─────────────────────────────────────────
  function runTimeline(t) {
    const diff=DIFFICULTY[difficulty];
    const warnT=CFG.WARN_TIME/diff.waveTimeMul;
    const waveT=CFG.WAVE_TIME/diff.waveTimeMul;

    if(!quakeTriggered && t>=CFG.QUAKE_TIME) {
      quakeTriggered=true; doEarthquake();
    }
    if(!warnTriggered && t>=warnT) {
      warnTriggered=true; doWaterRecede();
    }
    if(!waveTriggered && t>=waveT) {
      waveTriggered=true; doTsunami();
    }
  }

  function doEarthquake() {
    Player.startQuake();
    Audio.playEarthquake();
    World.flashEQ();
    UI.shakeScreen(2);
    UI.spawnDust(35);
    UI.showNarrative('07:58 WIB','🌍 GEMPA DAHSYAT! 9,1 Skala Richter! Bumi bergetar hampir 10 menit!',9000);
    NPCSystem.triggerEarthquakePanic();
    Missions.completeEarthquakePhase();
  }

  function doWaterRecede() {
    Audio.playWaterRecede();
    Audio.playAlert();
    UI.showNarrative('07:59 WIB','⚠️ Air laut surut drastis! Ini TANDA BAHAYA tsunami! LARI ke dataran tinggi SEKARANG!',9000);
    UI.setMissionBadge('PERINGATAN','Air laut surut — Bahaya tsunami!');
    Missions.advanceToPhase3();
    NPCSystem.triggerFlee(Player.getPosition());
  }

  function doTsunami() {
    Tsunami.trigger();
    Audio.playAlert();
    UI.showWaveHUD();
    UI.setMissionBadge('🌊 TSUNAMI!','Lari ke zona evakuasi — SEKARANG!');
    UI.shakeScreen(3);
    UI.spawnDust(50);
  }

  // ── END GAME ──────────────────────────────────────────
  function endGame(result) {
    if(over) return;
    over=true;
    Player.unlock();
    Audio.stop();

    const elapsed2=(Date.now()-startTime)/1000;
    const mins=Math.floor(elapsed2/60), secs=Math.floor(elapsed2%60);
    const timeStr=`${mins}m${secs}s`;
    const npcSaved=NPCSystem.getRescued();
    const total=NPCSystem.getTotal();
    const score=Missions.getScore();
    const stats={ npc:`${npcSaved}/${total}`, score, time:timeStr };

    if(result==='lose') {
      Audio.playGameOver();
      const fact=HISTORY_FACTS[Math.floor(Math.random()*HISTORY_FACTS.length)];
      setTimeout(()=>UI.showGameOver(`${fact.label}: ${fact.val}`, stats), 1800);
    } else {
      Audio.playWin();
      const pct=npcSaved/total;
      const endKey=pct>=0.8?'perfect':pct>=0.4?'good':'bare';
      setTimeout(()=>UI.showEndScreen(endKey, stats), 1800);
    }
  }

  // ── CONTROLS ──────────────────────────────────────────
  function togglePause() {
    paused=!paused;
    if(paused){ UI.showPause(); Player.unlock(); }
    else { UI.hidePause(); if(!MobileCtrl.isMobile()) setTimeout(()=>Player.lock(),100); }
  }
  function resume()  { if(paused) togglePause(); }
  function restart() { location.reload(); }
  function isPaused()  { return paused; }
  function isStarted() { return started; }

  return { setDifficulty, showIntro, startGame, togglePause, resume, restart, isPaused, isStarted, endGame };
})();
