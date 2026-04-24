// js/npc.js
const NPCSystem = (() => {
  let scene, npcs = [], rescued = 0;
  const SAFE = new THREE.Vector3(CFG.SAFE_ZONE.x, 0, CFG.SAFE_ZONE.z);

  const STATES = { IDLE:'idle', WALK:'walk', PANIC:'panic', RUN:'run', FLEE:'flee', RESCUED:'rescued', DEAD:'dead' };

  class NPC {
    constructor(id, x, z, name) {
      this.id = id; this.name = name;
      this.state = STATES.IDLE;
      this.pos = new THREE.Vector3(x, 0, z);
      this.vel = new THREE.Vector3();
      this.targetPos = null;
      this.stateTimer = 0;
      this.dialogCooldown = 0;
      this.isRescued = false;
      this.followPlayer = false;
      this.mesh = buildNPCMesh();
      this.mesh.position.copy(this.pos);
      this.mesh.userData.npcId = id;
      scene.add(this.mesh);
      this.idleTimer = Math.random() * 3;
      this.panicPhase = 0;
      this.speed = 2.5 + Math.random() * 1.5;
    }

    update(dt, playerPos, tsunamiActive, waveZ) {
      this.stateTimer += dt;
      this.dialogCooldown = Math.max(0, this.dialogCooldown - dt);
      if (this.isRescued || this.state === STATES.DEAD) return;

      // Drown check
      if (tsunamiActive && this.pos.z > waveZ - 2) {
        this.state = STATES.DEAD;
        this.mesh.visible = false;
        return;
      }

      switch (this.state) {
        case STATES.IDLE:    this.updateIdle(dt, playerPos, tsunamiActive); break;
        case STATES.WALK:    this.updateWalk(dt); break;
        case STATES.PANIC:   this.updatePanic(dt, tsunamiActive); break;
        case STATES.RUN:     this.updateRun(dt); break;
        case STATES.FLEE:    this.updateFlee(dt, playerPos); break;
      }

      // Apply velocity
      this.pos.addScaledVector(this.vel, dt);
      this.pos.y = 0;
      this.mesh.position.copy(this.pos);

      // Face movement direction
      if (this.vel.lengthSq() > 0.01) {
        this.mesh.rotation.y = Math.atan2(this.vel.x, this.vel.z);
      }

      // Bobbing animation (simulate walking)
      if (this.vel.lengthSq() > 0.1) {
        this.mesh.position.y = Math.abs(Math.sin(this.stateTimer * 8)) * 0.08;
      }
    }

    updateIdle(dt, playerPos, tsunamiActive) {
      this.vel.set(0,0,0);
      this.idleTimer -= dt;
      if (this.idleTimer <= 0) {
        // Random wander
        if (Math.random() < 0.5) {
          this.targetPos = this.pos.clone().add(new THREE.Vector3((Math.random()-.5)*20, 0, (Math.random()-.5)*20));
          this.state = STATES.WALK;
          this.stateTimer = 0;
        }
        this.idleTimer = 2 + Math.random() * 4;
      }
      if (tsunamiActive) { this.state = STATES.PANIC; this.panicPhase = 0; }
    }

    updateWalk(dt) {
      if (!this.targetPos) { this.state = STATES.IDLE; return; }
      const dir = this.targetPos.clone().sub(this.pos);
      if (dir.length() < 1.5) { this.state = STATES.IDLE; this.idleTimer = 1 + Math.random()*2; this.vel.set(0,0,0); return; }
      dir.normalize().multiplyScalar(this.speed * 0.6);
      this.vel.copy(dir);
    }

    updatePanic(dt, tsunamiActive) {
      this.panicPhase += dt;
      // Phase 1: confused spinning
      if (this.panicPhase < 2) {
        this.vel.set(Math.sin(this.panicPhase * 8) * 2, 0, Math.cos(this.panicPhase * 5) * 2);
        if (this.dialogCooldown <= 0) {
          this.say(NPC_DIALOGS.scared[Math.floor(Math.random()*NPC_DIALOGS.scared.length)]);
          this.dialogCooldown = 3;
        }
      } else {
        // Phase 2: run to safe zone
        this.state = STATES.FLEE;
      }
    }

    updateRun(dt) {
      if (!this.targetPos) { this.state = STATES.IDLE; return; }
      const dir = this.targetPos.clone().sub(this.pos);
      if (dir.length() < 2) { this.state = STATES.IDLE; this.vel.set(0,0,0); return; }
      dir.normalize().multiplyScalar(this.speed * 1.2);
      this.vel.copy(dir);
    }

    updateFlee(dt, playerPos) {
      // If following player
      if (this.followPlayer && playerPos) {
        const dir = playerPos.clone().sub(this.pos);
        dir.y = 0;
        if (dir.length() > 3) {
          dir.normalize().multiplyScalar(this.speed * 1.3);
          this.vel.copy(dir);
        } else {
          this.vel.set(0,0,0);
        }
        // Check if reached safe zone
        const dSafe = this.pos.distanceTo(SAFE);
        if (dSafe < CFG.SAFE_ZONE.r) { this.rescue(); }
        return;
      }
      // Flee to safe zone on own
      const dir = SAFE.clone().sub(this.pos);
      dir.y = 0;
      if (dir.length() < 3) { this.rescue(); return; }
      dir.normalize().multiplyScalar(this.speed);
      // Add some randomness so NPCs don't stack
      dir.x += (Math.random()-.5) * 0.8;
      dir.z += (Math.random()-.5) * 0.8;
      this.vel.copy(dir);
    }

    rescue() {
      if (this.isRescued) return;
      this.isRescued = true;
      this.state = STATES.RESCUED;
      this.vel.set(0,0,0);
      this.mesh.visible = false;
      rescued++;
    }

    say(text) {
      // Emit speech bubble via UI
      if (typeof UI !== 'undefined') UI.showSpeechBubble(this.name, text, this.mesh.position);
    }

    startEarthquakePanic() {
      this.state = STATES.PANIC;
      this.panicPhase = 0;
      Audio.playScream();
    }

    triggerFlee(playerPos) {
      if (this.isRescued) return;
      // AI decision: some follow player, some flee alone
      this.state = STATES.FLEE;
      this.followPlayer = Math.random() < 0.4;
    }
  }

  function buildNPCMesh() {
    const g = new THREE.Group();
    const colors = [0xc68642, 0xd2956a, 0xb05a20, 0xa0825a];
    const clothColors = [0x3a5a8a, 0x8a3a3a, 0x3a8a5a, 0x8a7a3a, 0x5a3a8a, 0x1a4a6a];
    const skin = new THREE.MeshLambertMaterial({ color: colors[Math.floor(Math.random()*colors.length)] });
    const cloth = new THREE.MeshLambertMaterial({ color: clothColors[Math.floor(Math.random()*clothColors.length)] });
    const dark = new THREE.MeshLambertMaterial({ color: 0x222222 });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.82, 0.3), cloth);
    body.position.y = 0.92; g.add(body);
    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 8), skin);
    head.position.y = 1.58; g.add(head);
    // Arms
    [-0.28, 0.28].forEach(ax => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.22), cloth);
      arm.position.set(ax, 0.82, 0); g.add(arm);
    });
    // Legs
    [-0.13, 0.13].forEach(lx => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.65, 0.26), dark);
      leg.position.set(lx, 0.33, 0); g.add(leg);
    });
    // Shadow disc
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.3, 12), new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:0.25 }));
    shadow.rotation.x = -Math.PI/2; shadow.position.y = 0.01; g.add(shadow);

    g.traverse(m => { if (m.isMesh) m.castShadow = true; });
    return g;
  }

  function init(s, count) {
    scene = s; npcs = []; rescued = 0;
    // Spawn positions spread around the city
    const spawnZone = [
      [20,55],[30,40],[-25,35],[50,25],[15,70],[-40,50],[60,15],
      [-10,48],[45,65],[-55,30],[0,40],[35,20],[-20,60],[55,45],
    ];
    const names = [...NPC_NAMES].sort(()=>Math.random()-.5);
    for (let i=0; i<Math.min(count, spawnZone.length); i++) {
      const [x,z] = spawnZone[i];
      const npc = new NPC(i, x + (Math.random()-.5)*8, z + (Math.random()-.5)*8, names[i]);
      npcs.push(npc);

      // Add rescuable interactable
      World.getInteractables().push({
        pos: npc.pos, r: 4,
        label: `Ajak ${npc.name} lari!`,
        action: 'rescue_npc',
        npcRef: npc,
        get position() { return npc.pos; },
      });
    }
  }

  function update(dt, playerPos, tsunamiActive, waveZ) {
    npcs.forEach(npc => npc.update(dt, playerPos, tsunamiActive, waveZ));
  }

  function triggerEarthquakePanic() {
    npcs.forEach((npc, i) => setTimeout(() => npc.startEarthquakePanic(), i * 200 + Math.random()*500));
  }

  function triggerFlee(playerPos) {
    npcs.forEach((npc, i) => setTimeout(() => npc.triggerFlee(playerPos), i * 150));
  }

  function getRescued()  { return rescued; }
  function getTotal()    { return npcs.length; }
  function getNPCs()     { return npcs; }

  return { init, update, triggerEarthquakePanic, triggerFlee, getRescued, getTotal, getNPCs };
})();
