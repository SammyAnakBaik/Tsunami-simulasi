// js/missions.js
const Missions = (() => {
  let phase=0, score=0, rescueCount=0, evacuated=false;
  let mainObjs=[], sideObjs=[];
  let decisionPending=null, decisionTimer=0;
  let sideCompleted=[];

  const PHASES=[
    {
      id:0, label:'FASE 1', title:'Gempa Dahsyat',
      main:[
        {id:'survive',  text:'Bertahan dari gempa'},
        {id:'observe',  text:'Amati kondisi laut'},
        {id:'warn',     text:'Peringatkan warga sekitar'},
      ],
    },
    {
      id:1, label:'FASE 2', title:'Tanda Bahaya',
      main:[
        {id:'rescue1', text:'Selamatkan warga (1/3)'},
        {id:'rescue2', text:'Selamatkan warga (2/3)'},
        {id:'rescue3', text:'Selamatkan warga (3/3)'},
      ],
    },
    {
      id:2, label:'FASE 3', title:'TSUNAMI!',
      main:[
        {id:'evac', text:'Capai zona evakuasi (masjid/bukit)'},
      ],
    },
  ];

  const SIDE_QUESTS=[
    { id:'hospital',  text:'Periksa papan peringatan darurat',  reward:150, pos:new THREE.Vector3(-74,0,2) },
    { id:'school',    text:'Bantu evakuasi anak sekolah',       reward:200, pos:new THREE.Vector3(62,0,6) },
    { id:'radio',     text:'Cari radio peringatan darurat',     reward:100, pos:new THREE.Vector3(5,0,40) },
  ];

  const DECISION_EVENTS=[
    {
      q:'Seorang lansia jatuh di jalan! Berhenti bantu atau terus lari?',
      choices:[
        { text:'🧓 Bantu lansia (berisiko)',    action:'help_elder',   score:300 },
        { text:'🏃 Terus lari ke zona aman',    action:'keep_running', score:50  },
      ],
    },
    {
      q:'Kamu melihat tas berisi obat-obatan di tepi jalan. Ambil atau tinggalkan?',
      choices:[
        { text:'💊 Ambil (mungkin berguna)',     action:'take_meds',    score:100 },
        { text:'💨 Tinggalkan, waktu lebih penting', action:'leave',    score:75  },
      ],
    },
  ];

  function init() {
    startPhase(0);
    initSideQuests();
  }

  function initSideQuests() {
    SIDE_QUESTS.forEach(sq => {
      World.getInteractables().push({
        pos: sq.pos, r:6,
        label: sq.text,
        action:'side_quest',
        questId: sq.id,
        get position() { return sq.pos; },
      });
    });
    UI.renderSideQuests(SIDE_QUESTS.map(s=>({ ...s, done:false })));
  }

  function startPhase(idx) {
    phase=idx;
    const p=PHASES[idx];
    mainObjs=p.main.map(o=>({...o,done:false}));
    UI.renderObjectives(mainObjs);
    UI.setPhase(p.label);
    UI.setMissionBadge('FASE BARU', p.title);
    if(idx===1) UI.showSidePanel(true);
  }

  function completeObj(id) {
    const o=mainObjs.find(x=>x.id===id);
    if(o&&!o.done){
      o.done=true; UI.renderObjectives(mainObjs);
      Audio.playObjectiveDone();
      addScore(100,'+100 Objektif');
    }
  }

  function handleRescue(npc) {
    if(npc.isRescued) return;
    rescueCount++;
    npc.followPlayer=true;
    npc.state='flee';
    Audio.playRescue();
    addScore(200,`+200 Selamatkan ${npc.name}!`);
    UI.showNarrative('','✅ '+npc.name+' diselamatkan! Ajak ke zona aman!',4000);

    const ids=['rescue1','rescue2','rescue3'];
    if(ids[rescueCount-1]) completeObj(ids[rescueCount-1]);
    UI.updateNPCCount(NPCSystem.getRescued(), NPCSystem.getTotal());

    // Decision event (random)
    if(rescueCount===2 && phase===1 && Math.random()<0.6) {
      scheduleDecision();
    }
  }

  function handleEvacuate() {
    if(evacuated) return;
    evacuated=true;
    completeObj('evac');
    addScore(500,'🏆 +500 Zona Aman!');
    Game.endGame('win');
  }

  function handleSideQuest(questId) {
    if(sideCompleted.includes(questId)) return;
    sideCompleted.push(questId);
    const sq=SIDE_QUESTS.find(s=>s.id===questId);
    if(!sq) return;
    addScore(sq.reward, `+${sq.reward} ${sq.text}`);
    UI.completeSideQuest(questId);
    Audio.playObjectiveDone();
    UI.showNarrative('','✅ Side Quest selesai: '+sq.text, 4000);
  }

  function scheduleDecision() {
    const ev=DECISION_EVENTS[Math.floor(Math.random()*DECISION_EVENTS.length)];
    decisionPending=ev;
    setTimeout(()=>UI.showDecision(ev, onDecisionChosen), 3000);
  }

  function onDecisionChosen(choice) {
    addScore(choice.score, `+${choice.score} Pilihan: ${choice.text.substring(0,20)}`);
    if(choice.action==='help_elder') {
      handleRescue({ isRescued:false, name:'Pak Tua', followPlayer:true, state:'flee' });
    }
    decisionPending=null;
  }

  function completeEarthquakePhase() {
    completeObj('survive');
    setTimeout(()=>completeObj('observe'),4000);
    setTimeout(()=>completeObj('warn'),7000);
    setTimeout(()=>startPhase(1),10000);
  }

  function advanceToPhase3() {
    if(phase<2) startPhase(2);
  }

  function addScore(pts, label) {
    score+=pts;
    UI.setScore(score);
    UI.showScorePop(label||'+'+pts);
  }

  function getScore()        { return score; }
  function getPhase()        { return phase; }
  function getRescueCount()  { return rescueCount; }
  function isEvacuated()     { return evacuated; }

  return { init, handleRescue, handleEvacuate, handleSideQuest, completeEarthquakePhase, advanceToPhase3, getScore, getPhase, getRescueCount, isEvacuated };
})();
