// js/tsunami.js
const Tsunami = (() => {
  let scene, active=false, triggered=false;
  let waveWall, floodPlane, debris=[], foamParticles=[];
  let waveZ=CFG.WAVE_START_Z, waveTime=0, waveSpeed=CFG.WAVE_SPEED_INIT;
  let floodLevel=-3;
  let speedMul=1;

  function init(s, mul) {
    scene=s; speedMul=mul||1;
    buildWave(); buildFlood(); buildDebris(); buildFoam();
  }

  function buildWave() {
    // Main wave face
    const geo=new THREE.PlaneGeometry(600,CFG.WAVE_H_MAX,40,16);
    const mat=new THREE.MeshPhongMaterial({
      color:0x0f3f6a, transparent:true, opacity:0.94, shininess:140, side:THREE.FrontSide
    });
    waveWall=new THREE.Mesh(geo,mat);
    waveWall.position.set(0,CFG.WAVE_H_MAX/2,CFG.WAVE_START_Z);
    waveWall.visible=false; scene.add(waveWall);

    // Foam crest
    const foam=new THREE.Mesh(
      new THREE.PlaneGeometry(602,6,50,4),
      new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.85})
    );
    foam.position.y=CFG.WAVE_H_MAX/2-3; waveWall.add(foam);

    // Secondary smaller wave
    const w2=new THREE.Mesh(
      new THREE.PlaneGeometry(600,CFG.WAVE_H_MAX*0.55,30,10),
      new THREE.MeshPhongMaterial({color:0x1a5580,transparent:true,opacity:0.88})
    );
    w2.position.set(0,(CFG.WAVE_H_MAX*0.55)/2,CFG.WAVE_START_Z+28);
    w2.visible=false; w2.name='wave2'; scene.add(w2);

    // Tertiary ripple
    const w3=new THREE.Mesh(
      new THREE.PlaneGeometry(600,CFG.WAVE_H_MAX*0.3,20,8),
      new THREE.MeshPhongMaterial({color:0x2266aa,transparent:true,opacity:0.8})
    );
    w3.position.set(0,(CFG.WAVE_H_MAX*0.3)/2,CFG.WAVE_START_Z+55);
    w3.visible=false; w3.name='wave3'; scene.add(w3);
  }

  function buildFlood() {
    floodPlane=new THREE.Mesh(
      new THREE.PlaneGeometry(700,700,2,2),
      new THREE.MeshPhongMaterial({color:0x0f2a45,transparent:true,opacity:0.88,shininess:60})
    );
    floodPlane.rotation.x=-Math.PI/2;
    floodPlane.position.set(0,floodLevel,350);
    floodPlane.visible=false; scene.add(floodPlane);
  }

  function buildDebris() {
    const mats=[
      new THREE.MeshLambertMaterial({color:0x8B6914}),
      new THREE.MeshLambertMaterial({color:0x888888}),
      new THREE.MeshLambertMaterial({color:0x5a4a3a}),
      new THREE.MeshLambertMaterial({color:0x9a7a50}),
    ];
    for (let i=0;i<80;i++) {
      const sz=0.4+Math.random()*3;
      const geos=[
        new THREE.BoxGeometry(sz,sz*0.3,sz*2.2),
        new THREE.BoxGeometry(sz*0.28,sz*0.28,sz*3.5),
        new THREE.BoxGeometry(sz,sz,sz*0.5),
      ];
      const m=new THREE.Mesh(geos[Math.floor(Math.random()*3)], mats[Math.floor(Math.random()*4)]);
      m.position.set((Math.random()-.5)*500,0,CFG.WAVE_START_Z+15+Math.random()*40);
      m.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,Math.random()*Math.PI);
      m.userData.spd=0.65+Math.random()*0.7;
      m.userData.bob=Math.random()*Math.PI*2;
      m.visible=false; scene.add(m); debris.push(m);
    }
  }

  function buildFoam() {
    // Floating foam patches
    for (let i=0;i<30;i++) {
      const f=new THREE.Mesh(
        new THREE.PlaneGeometry(2+Math.random()*4,1+Math.random()*2),
        new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.5+Math.random()*0.4,side:THREE.DoubleSide})
      );
      f.rotation.x=-Math.PI/2;
      f.position.set((Math.random()-.5)*500,0,CFG.WAVE_START_Z+5+Math.random()*60);
      f.userData.bob=Math.random()*Math.PI*2;
      f.visible=false; scene.add(f); foamParticles.push(f);
    }
  }

  function trigger() {
    if (triggered) return;
    triggered=true; active=true;
    waveWall.visible=true;
    floodPlane.visible=true;
    debris.forEach(d=>d.visible=true);
    foamParticles.forEach(f=>f.visible=true);
    const w2=scene.getObjectByName('wave2');
    const w3=scene.getObjectByName('wave3');
    if(w2)w2.visible=true; if(w3)w3.visible=true;
    World.setStormSky();
    Audio.playTsunamiApproach();
  }

  function update(dt, playerPos) {
    if (!active) return;
    waveTime+=dt;

    // Accelerate
    waveSpeed=Math.min(CFG.WAVE_SPEED_INIT+waveTime*1.8,CFG.WAVE_SPEED_MAX)*speedMul;

    // Move wave
    const moveAmt=waveSpeed*dt;
    waveZ-=moveAmt;
    waveWall.position.z=waveZ;
    const w2=scene.getObjectByName('wave2');
    const w3=scene.getObjectByName('wave3');
    if(w2)w2.position.z=waveZ+28;
    if(w3)w3.position.z=waveZ+55;

    // Animate wave face geometry
    const p=waveWall.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i);
      p.setZ(i,Math.sin(x*0.04+waveTime*2.5)*2.5+Math.cos(y*0.12+waveTime*1.8)*2+Math.sin(x*0.08-waveTime)*1);
    }
    p.needsUpdate=true; waveWall.geometry.computeVertexNormals();

    // Rising flood
    floodLevel=Math.min(floodLevel+0.06*dt*40,20);
    floodPlane.position.y=floodLevel;
    floodPlane.position.z=waveZ+120;

    // Debris
    debris.forEach(d=>{
      d.position.z-=waveSpeed*dt*d.userData.spd;
      d.position.y=floodLevel+Math.sin(waveTime*2.2+d.userData.bob)*0.5;
      d.rotation.y+=dt*0.4*d.userData.spd;
      d.rotation.x+=dt*0.15;
    });

    // Foam
    foamParticles.forEach(f=>{
      f.position.z-=waveSpeed*dt*0.8;
      f.position.y=floodLevel+0.1+Math.sin(waveTime*1.5+f.userData.bob)*0.3;
    });

    // Audio proximity
    const dist=Math.max(0,playerPos.z-waveZ);
    const vol=Math.max(0,1-dist/200);
    Audio.setWaveVolume(vol);

    // HUD
    UI.updateWave(dist,waveZ);

    // Screen blur / pressure as wave closes
    if(dist<80) {
      const intensity=(1-dist/80)*0.8;
      UI.setWaveBlur(intensity);
    }

    // Check caught
    if(playerPos.z>waveZ+1 && playerPos.y<floodLevel+1.5) return 'caught';

    // Check safe
    const dSafe=Math.sqrt((playerPos.x-CFG.SAFE_ZONE.x)**2+(playerPos.z-CFG.SAFE_ZONE.z)**2);
    if(dSafe<CFG.SAFE_ZONE.r && playerPos.y>5) return 'safe';

    return null;
  }

  function isActive() { return active; }
  function getWaveZ()  { return waveZ; }
  function getFloodLevel() { return floodLevel; }

  return { init, trigger, update, isActive, getWaveZ, getFloodLevel };
})();
