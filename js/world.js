// js/world.js
const World = (() => {
  let scene;
  const interactables = [];
  const collidables = [];
  let oceanMesh, skyUniforms;
  let sunLight;

  function init(s) {
    scene = s;
    buildSky(); buildTerrain(); buildOcean();
    buildCity(); buildMosque(); buildEvacSign();
    buildVegetation(); buildLighting();
  }

  // SKY
  function buildSky() {
    skyUniforms = {
      topColor: { value: new THREE.Color(0x87ceeb) },
      botColor: { value: new THREE.Color(0xffecd2) },
    };
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(490, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, uniforms: skyUniforms,
        vertexShader: `varying vec3 vp; void main(){ vp=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
        fragmentShader: `uniform vec3 topColor,botColor; varying vec3 vp; void main(){ float h=normalize(vp).y; gl_FragColor=vec4(mix(botColor,topColor,max(pow(max(h,0.),0.7),0.)),1.); }`,
      })
    );
    scene.add(sky);
    // Sun sphere
    const sun = new THREE.Mesh(new THREE.SphereGeometry(7,16,16), new THREE.MeshBasicMaterial({ color:0xfffde7 }));
    sun.position.set(80, 180, -280);
    scene.add(sun);
  }

  function setStormSky() {
    skyUniforms.topColor.value.set(0x3a4a6a);
    skyUniforms.botColor.value.set(0x4a3a2a);
    scene.fog = new THREE.Fog(0x3a4050, 25, 200);
    if (sunLight) { sunLight.color.set(0x8090aa); sunLight.intensity = 0.5; }
  }

  // TERRAIN
  function buildTerrain() {
    const geo = new THREE.PlaneGeometry(600, 600, 80, 80);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      pos.setZ(i, Math.sin(x*0.03)*0.6 + Math.cos(y*0.04)*0.4);
    }
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0xc8a870 }));
    ground.rotation.x = -Math.PI/2; ground.receiveShadow = true;
    scene.add(ground);

    // Beach
    const beach = new THREE.Mesh(new THREE.PlaneGeometry(250,50), new THREE.MeshLambertMaterial({ color:0xe8d5a0 }));
    beach.rotation.x = -Math.PI/2; beach.position.set(0,0.01,175);
    scene.add(beach);

    // Hill (safe zone)
    const hill = new THREE.Mesh(new THREE.CylinderGeometry(45,75,14,20), new THREE.MeshLambertMaterial({ color:0x4a7a30 }));
    hill.position.set(0,7,-115);
    hill.castShadow = true; hill.receiveShadow = true;
    scene.add(hill);
    collidables.push({ type:'terrain', x:0, z:-115, r:45 });

    // Evacuation ring
    const ring = new THREE.Mesh(new THREE.RingGeometry(29,32,32), new THREE.MeshBasicMaterial({ color:0x00ff88, side:THREE.DoubleSide }));
    ring.rotation.x = -Math.PI/2; ring.position.set(0,0.05,-115);
    scene.add(ring);

    // Roads
    const roadMat = new THREE.MeshLambertMaterial({ color:0x333333 });
    const mkMat = new THREE.MeshBasicMaterial({ color:0xffffff });
    addRoad(0,0,8,250,'v',roadMat,mkMat);
    addRoad(0,30,250,8,'h',roadMat,mkMat);
    addRoad(-40,20,6,150,'v',roadMat,mkMat);
    addRoad(40,20,6,150,'v',roadMat,mkMat);
  }

  function addRoad(x,z,w,d,dir,mat,mk) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w,d), mat);
    r.rotation.x = -Math.PI/2; r.position.set(x,0.02,z); scene.add(r);
    // Dashed markings
    if (dir==='h') {
      for (let i=x-d/2; i<x+d/2; i+=10) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3,4.5), mk);
        m.rotation.x=-Math.PI/2; m.position.set(i,0.03,z); scene.add(m);
      }
    }
  }

  // OCEAN
  function buildOcean() {
    const geo = new THREE.PlaneGeometry(700,350,60,30);
    oceanMesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
      color:0x1a5f8c, shininess:90, transparent:true, opacity:0.9
    }));
    oceanMesh.rotation.x = -Math.PI/2;
    oceanMesh.position.set(0,-0.5,270);
    oceanMesh.name = 'ocean';
    scene.add(oceanMesh);
  }

  function updateOcean(t) {
    if (!oceanMesh) return;
    const pos = oceanMesh.geometry.attributes.position;
    for (let i=0; i<pos.count; i++) {
      const x=pos.getX(i), y=pos.getY(i);
      pos.setZ(i, Math.sin(x*0.07+t*1.5)*0.5+Math.cos(y*0.05+t)*0.4);
    }
    pos.needsUpdate=true; oceanMesh.geometry.computeVertexNormals();
  }

  // CITY
  function buildCity() {
    const defs = [
      // x,z,w,h,d,col
      [-42,82,12,5,10,0xd4a96a],[-22,87,8,4,8,0xc8956a],[12,84,14,6,11,0xc2856a],
      [36,80,10,7,12,0xb8906a],[58,82,9,5,9,0xcda06a],[-64,78,11,4,11,0xd0a06a],
      [-84,80,8,6,8,0xbf8a6a],[78,78,10,4,10,0xd2a070],
      [-52,42,16,9,13,0xe8e0d0],[-27,47,12,13,14,0xddd5c5],[6,44,10,7,10,0xe0d8c8],
      [32,40,16,11,14,0xd8d0c0],[62,46,12,8,12,0xe2d8c5],[-78,44,9,6,9,0xdccec0],
      [82,42,13,10,11,0xe0d5c0],[-55,15,10,8,10,0xddd0b8],[22,10,12,10,12,0xe0d4b8],
      [-18,14,9,6,9,0xd8ccb5],[48,14,10,7,10,0xdaceb5],[-92,12,8,5,8,0xd5c8b0],
      [92,10,9,6,9,0xd8cbb0],[-30,-25,14,8,12,0xe5ddd0],[30,-25,14,8,12,0xe5ddd0],
      // Hospital (white)
      [-74,2,18,11,16,0xffffff],
      // School
      [62,6,16,7,14,0xf5e6c8],
    ];
    defs.forEach(([x,z,w,h,d,c]) => {
      const mesh = makeBuilding(x,z,w,h,d,c);
      scene.add(mesh);
      collidables.push({ type:'building', x, z, w, d });
    });

    // Vehicles
    const cars = [
      [-16,27,0xcc3333],[22,27,0x3366cc],[48,27,0x33cc66],
      [-32,35,0xcccc33],[12,35,0xcc6633],[-5,62,0xaaaaaa],[9,62,0x884422],
      [30,55,0x2244aa],[-20,50,0x664433],
    ];
    cars.forEach(([x,z,c]) => {
      const car = makeCar(c); car.position.set(x,0,z);
      car.rotation.y = (Math.random()-.5)*0.4;
      scene.add(car);
    });
  }

  function makeBuilding(x,z,w,h,d,col) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshLambertMaterial({ color:col }));
    body.position.y=h/2; body.castShadow=true; body.receiveShadow=true; g.add(body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w+0.5,0.4,d+0.5), new THREE.MeshLambertMaterial({ color:0x7a6040 }));
    roof.position.y=h+0.2; g.add(roof);
    // Windows
    const wm = new THREE.MeshBasicMaterial({ color:0xadd8e6 });
    const cols=Math.max(1,Math.floor(w/3.5)), rows=Math.max(1,Math.floor(h/3.5));
    for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) {
      const win=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.1,0.1),wm);
      win.position.set(-w/2+1.8+c*3.2, 1.8+r*3.2, d/2+0.05); g.add(win);
    }
    g.position.set(x,0,z); return g;
  }

  function makeCar(col) {
    const g=new THREE.Group(), bm=new THREE.MeshLambertMaterial({color:col});
    const body=new THREE.Mesh(new THREE.BoxGeometry(2,0.85,4.2),bm); body.position.y=0.6; g.add(body);
    const top=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.75,2.3),bm); top.position.y=1.4; g.add(top);
    const wm=new THREE.MeshLambertMaterial({color:0x111});
    [[-0.9,0.35,-1.3],[0.9,0.35,-1.3],[-0.9,0.35,1.3],[0.9,0.35,1.3]].forEach(([wx,wy,wz])=>{
      const w=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,0.26,12),wm);
      w.rotation.z=Math.PI/2; w.position.set(wx,wy,wz); g.add(w);
    });
    return g;
  }

  // MOSQUE
  function buildMosque() {
    const g=new THREE.Group();
    const wm=new THREE.MeshLambertMaterial({color:0xfafafa});
    const dm=new THREE.MeshLambertMaterial({color:0x2ecc71});
    const body=new THREE.Mesh(new THREE.BoxGeometry(22,14,22),wm); body.position.y=7; g.add(body);
    const dome=new THREE.Mesh(new THREE.SphereGeometry(7,20,10,0,Math.PI*2,0,Math.PI/2),dm); dome.position.y=16; g.add(dome);
    [[-9,9],[ 9,9],[-9,-9],[9,-9]].forEach(([mx,mz])=>{
      const m=new THREE.Mesh(new THREE.CylinderGeometry(0.9,1.1,20,10),wm); m.position.set(mx,10,mz); g.add(m);
      const c=new THREE.Mesh(new THREE.ConeGeometry(1.2,4,10),dm); c.position.set(mx,21,mz); g.add(c);
    });
    g.position.set(0,0,-120);
    g.traverse(m=>{ if(m.isMesh){m.castShadow=true;m.receiveShadow=true;} });
    scene.add(g);

    // Interact point
    interactables.push({ pos:new THREE.Vector3(0,0,-103), r:10, label:'Masuk zona evakuasi aman', action:'evacuate' });
  }

  // EVAC SIGN
  function buildEvacSign() {
    const posts=[-60,-20,0,20,60];
    posts.forEach(x=>{
      const post=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,4,6), new THREE.MeshLambertMaterial({color:0x888}));
      post.position.set(x,2,-55); scene.add(post);
      const sign=new THREE.Mesh(new THREE.BoxGeometry(5,2.2,0.15), new THREE.MeshLambertMaterial({color:0x007733}));
      sign.position.set(x,4.5,-55); scene.add(sign);
    });
  }

  // VEGETATION
  function buildVegetation() {
    const pts=[
      [-95,-8],[-90,22],[-92,55],[94,-3],[90,28],[93,58],
      [-65,62],[-55,68],[55,68],[65,62],
      [-25,-42],[25,-42],[-35,-52],[35,-52],
      [5,-95],[-12,-108],[18,-100],[0,-85],[-20,-88],[20,-88],
      [110,0],[110,30],[110,60],[-110,0],[-110,30],[-110,60],
    ];
    pts.forEach(([x,z])=>{ scene.add(makePalm(x,z)); });
  }

  function makePalm(x,z) {
    const g=new THREE.Group(), ht=5+Math.random()*4;
    const trk=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.34,ht,7), new THREE.MeshLambertMaterial({color:0x8B6914}));
    trk.position.y=ht/2; g.add(trk);
    const lm=new THREE.MeshLambertMaterial({color:0x1a7a1a});
    for (let i=0;i<7;i++){
      const a=(i/7)*Math.PI*2;
      const lf=new THREE.Mesh(new THREE.ConeGeometry(1.8+Math.random()*.5,1.3,6),lm);
      lf.position.set(Math.cos(a)*1.8,ht+0.3,Math.sin(a)*1.8);
      lf.rotation.z=Math.PI/3; lf.rotation.y=a; g.add(lf);
    }
    g.position.set(x,0,z);
    g.traverse(m=>{if(m.isMesh)m.castShadow=true;});
    return g;
  }

  // LIGHTING
  function buildLighting() {
    scene.add(new THREE.AmbientLight(0xfff8e7,0.65));
    sunLight=new THREE.DirectionalLight(0xfff5cc,1.3);
    sunLight.position.set(80,200,-100); sunLight.castShadow=true;
    sunLight.shadow.mapSize.set(1024,1024);
    sunLight.shadow.camera.near=1; sunLight.shadow.camera.far=500;
    sunLight.shadow.camera.left=sunLight.shadow.camera.bottom=-150;
    sunLight.shadow.camera.right=sunLight.shadow.camera.top=150;
    scene.add(sunLight);
    scene.add(new THREE.HemisphereLight(0x87ceeb,0xc8a870,0.4));
  }

  function flashEQ() {
    const a=scene.children.find(c=>c.isAmbientLight);
    if(a){ const o=a.intensity; a.intensity=2.2; setTimeout(()=>a.intensity=o,150); }
  }

  function getInteractables() { return interactables; }
  function getCollidables()   { return collidables; }

  return { init, updateOcean, getInteractables, getCollidables, setStormSky, flashEQ };
})();
