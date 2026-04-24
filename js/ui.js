// js/ui.js
const UI = (() => {
  let narrTimer=null, missionTimer=null, decisionTimer=null, decisionCountdown=null;
  let sideData=[];
  let speechBubbles=[];

  // SCREENS
  function showScreen(id)  { document.getElementById(id)?.classList.remove('hidden'); }
  function hideScreen(id)  { document.getElementById(id)?.classList.add('hidden'); }
  function showHUD()       { showScreen('hud'); }
  function showPause()     { showScreen('pauseMenu'); setPauseFact(); }
  function hidePause()     { hideScreen('pauseMenu'); }
  function showGameOver(fact, stats) {
    showScreen('gameOver');
    set('goFact','📖 '+fact);
    set('goStats', buildStats(stats));
    buildEduList('eduList', EDU_TIPS);
  }
  function showEndScreen(endKey, stats) {
    const e=ENDINGS[endKey]||ENDINGS.good;
    showScreen('endScreen');
    set('endIco', e.ico); set('endTitle', e.title); set('endDesc', e.desc);
    set('endStats', buildStats(stats));
    set('endingCard', e.msg);
    buildFactsGrid();
    buildEduList('surviveList', SURVIVE_TIPS);
  }

  function buildStats(s) {
    if(!s) return '';
    return `<div class="go-stats">
      <div class="stat-pill"><span class="sv">${s.npc}</span>NPC Selamat</div>
      <div class="stat-pill"><span class="sv">${s.score}</span>Skor</div>
      <div class="stat-pill"><span class="sv">${s.time}</span>Waktu</div>
    </div>`;
  }

  function buildFactsGrid() {
    const g=document.getElementById('factsGrid'); if(!g)return;
    g.innerHTML=HISTORY_FACTS.map(f=>`<div class="fact-item"><strong>${f.val}</strong><br><span style="color:#888;font-size:.7rem">${f.label}</span></div>`).join('');
  }

  function buildEduList(id, tips) {
    const el=document.getElementById(id); if(!el)return;
    el.innerHTML=tips.map(t=>`<li>${t}</li>`).join('');
  }

  function setPauseFact() {
    const f=HISTORY_FACTS[Math.floor(Math.random()*HISTORY_FACTS.length)];
    set('pauseFact',`${f.label}: ${f.val}`);
  }

  // HUD
  function updateClock(secs) {
    const total=CFG.START_M*60+Math.floor(secs*CFG.TIME_SCALE);
    const h=CFG.START_H+Math.floor(total/3600)%24;
    const m=Math.floor(total%3600/60);
    set('clockTxt',`${pad(h)}:${pad(m)} WIB`);
  }
  function pad(n) { return String(n).padStart(2,'0'); }
  function setPhase(t)  { set('phaseTxt',t); }
  function setScore(n)  { set('scoreTxt',n.toLocaleString()); }
  function updateNPCCount(saved,total) { set('npcSaved',saved); set('npcTotal',total); }

  function showWaveHUD() { showScreen('waveHUD'); }
  function updateWave(dist,waveZ) {
    const max=400, pct=Math.min(100,(1-dist/max)*100);
    const fill=document.getElementById('waveFill');
    if(fill) fill.style.width=pct+'%';
    set('waveDistTxt', dist<5?'⚠️ SANGAT DEKAT!':`${Math.round(dist)}m`);
  }

  function setWaveBlur(t) {
    const b=document.getElementById('blurOverlay'); if(!b)return;
    if(t>0.1) b.classList.add('active'); else b.classList.remove('active');
  }

  function setMissionBadge(type,title) {
    const el=document.getElementById('missionBadge'); if(!el)return;
    el.classList.remove('hidden');
    set('mbType',type); set('mbTitle',title);
    clearTimeout(missionTimer);
    missionTimer=setTimeout(()=>el.classList.add('hidden'),4500);
  }

  // INTERACT
  function showInteract(label, mobile=false) {
    const el=document.getElementById('interactHint'); if(!el)return;
    el.classList.remove('hidden');
    set('iKey', mobile?'TAP':'E');
    set('iLabel',label);
  }
  function hideInteract() { hideScreen('interactHint'); }

  // DIALOG
  function showDialog(npc, item) {
    const box=document.getElementById('npcDialog'); if(!box)return;
    box.classList.remove('hidden');
    set('dlgName', npc?npc.name:'—');
    const dialogs=NPC_DIALOGS.asking;
    set('dlgText', dialogs[Math.floor(Math.random()*dialogs.length)]);
    const choices=document.getElementById('dlgChoices'); if(!choices)return;
    choices.innerHTML=[
      `<button class="dlg-btn" onclick="Player.tryInteract()">✅ Ajak berlari ke zona aman</button>`,
      `<button class="dlg-btn" onclick="UI.closeDialog()">✕ Tutup</button>`,
    ].join('');
  }
  function closeDialog() { hideScreen('npcDialog'); }

  // SPEECH BUBBLE (simple floating text via DOM)
  function showSpeechBubble(name, text, pos3d) {
    // Simple overlay text — shown briefly
    showNarrative('', `💬 ${name}: "${text}"`, 3000);
  }

  // NARRATIVE
  function showNarrative(time, text, dur=5500) {
    clearTimeout(narrTimer);
    const box=document.getElementById('narrativeBox'); if(!box)return;
    box.classList.remove('hidden');
    set('narrTime', time);
    set('narrTxt', text);
    narrTimer=setTimeout(()=>box.classList.add('hidden'),dur);
  }

  let lastNarrIdx=-1;
  function checkNarratives(elapsed) {
    for(let i=lastNarrIdx+1;i<NARRATIVES.length;i++){
      if(elapsed>=NARRATIVES[i].t){
        showNarrative(NARRATIVES[i].time, NARRATIVES[i].txt, 6500);
        lastNarrIdx=i;
      }
    }
  }

  // OBJECTIVES
  function renderObjectives(list) {
    const ul=document.getElementById('objList'); if(!ul)return;
    ul.innerHTML=list.map(o=>`<li class="${o.done?'done':''}"><span class="och">${o.done?'✓':'○'}</span>${o.text}</li>`).join('');
  }

  function renderSideQuests(list) {
    sideData=list;
    const ul=document.getElementById('sideList'); if(!ul)return;
    ul.innerHTML=list.map(s=>`<li id="sq_${s.id}"><span class="och">○</span>${s.text}</li>`).join('');
  }

  function completeSideQuest(id) {
    const el=document.getElementById('sq_'+id); if(!el)return;
    el.className='done'; el.innerHTML=`<span class="och">✓</span>${el.textContent}`;
  }

  function showSidePanel(v) {
    const el=document.getElementById('sidePanel'); if(el) el.classList.toggle('hidden',!v);
  }

  // SCORE POP
  function showScorePop(text) {
    const el=document.getElementById('scorePop'); if(!el)return;
    el.textContent=text; el.classList.remove('hidden');
    void el.offsetWidth; // reflow for animation
    el.style.animation='none'; void el.offsetWidth;
    el.style.animation='';
    el.classList.remove('hidden');
    setTimeout(()=>el.classList.add('hidden'),700);
  }

  // SCREEN SHAKE (CSS)
  function shakeScreen(intensity=1) {
    const b=document.body;
    b.style.animation='none'; void b.offsetWidth;
    const dur=0.4+intensity*0.2;
    const amp=intensity*6;
    b.style.cssText+=`animation:shake${Date.now()} ${dur}s ease both`;
    // Inject keyframe
    const style=document.createElement('style');
    const id=`sk${Date.now()}`;
    style.textContent=`@keyframes ${id}{0%,100%{transform:translate(0)}20%{transform:translate(${-amp}px,${amp*.5}px)}40%{transform:translate(${amp}px,${-amp*.5}px)}60%{transform:translate(${-amp*.5}px,${amp*.3}px)}80%{transform:translate(${amp*.5}px,${-amp*.3}px)}}`;
    document.head.appendChild(style);
    document.getElementById('shakeOverlay').style.animation=`${id} ${dur}s ease both`;
    setTimeout(()=>{ style.remove(); document.getElementById('shakeOverlay').style.animation=''; },dur*1000+100);
  }

  // DUST PARTICLES
  function spawnDust(count=20) {
    const layer=document.getElementById('dustLayer'); if(!layer)return;
    for(let i=0;i<count;i++){
      const d=document.createElement('div');
      d.className='dust';
      const sz=4+Math.random()*12;
      const x=Math.random()*100, y=Math.random()*100;
      const dx=(Math.random()-.5)*200, dy=(Math.random()-.5)*200;
      d.style.cssText=`width:${sz}px;height:${sz}px;left:${x}%;top:${y}%;--dx:${dx}px;--dy:${dy}px;animation-duration:${0.8+Math.random()*.8}s;animation-delay:${Math.random()*.3}s`;
      layer.appendChild(d);
      setTimeout(()=>d.remove(),1500);
    }
  }

  // DECISION
  function showDecision(ev, callback) {
    const modal=document.getElementById('decisionModal'); if(!modal)return;
    modal.classList.remove('hidden');
    set('decQ', ev.q);
    let t=10; set('decTimer',t);
    decisionCountdown=setInterval(()=>{
      t--; set('decTimer',t);
      if(t<=0){ clearInterval(decisionCountdown); choose(ev.choices[1]); }
    },1000);

    function choose(c) {
      clearInterval(decisionCountdown);
      modal.classList.add('hidden');
      callback(c);
    }

    const cc=document.getElementById('decChoices'); if(!cc)return;
    cc.innerHTML=ev.choices.map((c,i)=>
      `<button class="dec-btn" onclick="(${choose.toString()})(${JSON.stringify(c)})">${c.text}</button>`
    ).join('');
  }

  // LOADING
  function setLoad(pct,txt) {
    const b=document.getElementById('loadBar'); if(b)b.style.width=pct+'%';
    const t=document.getElementById('loadStatus'); if(t)t.textContent=txt;
  }

  // HELPERS
  function set(id,html) { const e=document.getElementById(id); if(e) e.innerHTML=html; }

  return {
    showHUD, showPause, hidePause, showGameOver, showEndScreen,
    updateClock, setPhase, setScore, updateNPCCount,
    showWaveHUD, updateWave, setWaveBlur, setMissionBadge,
    showInteract, hideInteract,
    showDialog, closeDialog, showSpeechBubble,
    showNarrative, checkNarratives,
    renderObjectives, renderSideQuests, completeSideQuest, showSidePanel,
    showScorePop, shakeScreen, spawnDust,
    showDecision, setLoad,
  };
})();
