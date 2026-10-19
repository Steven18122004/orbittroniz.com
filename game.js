
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const host = $("game");

  if (!window.THREE) {
    $("start").innerHTML = "<h2>3D engine unavailable</h2><p>Check your internet connection and refresh.</p>";
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x85cefa);
  scene.fog = new THREE.Fog(0x85cefa, 35, 125);

  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 180);
  camera.position.set(0, 5, 10);

  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  host.insertBefore(renderer.domElement, host.firstChild);

  const hemi = new THREE.HemisphereLight(0xdff5ff, 0x52613c, 2.2);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0cf, 3);
  sun.position.set(-8, 14, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024,1024);
  scene.add(sun);

  const material = (color, roughness=.8, metalness=0) =>
    new THREE.MeshStandardMaterial({color,roughness,metalness});

  function box(w,h,d,mat,x=0,y=0,z=0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    m.position.set(x,y,z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  const hill = x => .5*Math.sin(x*.16)+.2*Math.sin(x*.38+1);
  const slope = x => (hill(x+.03)-hill(x-.03))/.06;

  // Rolling landscape
  const groundGeo = new THREE.PlaneGeometry(150,240,90,110);
  groundGeo.rotateX(-Math.PI/2);
  const pos = groundGeo.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i), z=pos.getZ(i);
    pos.setY(i,hill(x)*.5+.06*Math.sin(z*.15));
  }
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo,material(0x4e9850));
  ground.position.z=-55;
  ground.receiveShadow=true;
  scene.add(ground);

  // Distant mountains and sun
  const sunBall = new THREE.Mesh(
    new THREE.SphereGeometry(3,20,16),
    new THREE.MeshBasicMaterial({color:0xffe7a0})
  );
  sunBall.position.set(-15,18,-65);
  scene.add(sunBall);

  for(let i=0;i<15;i++){
    const h=7+(i%5)*2, w=7+(i%4)*2;
    const mountain=new THREE.Mesh(
      new THREE.ConeGeometry(w,h,5),
      material(i%2?0x638e9c:0x799aab)
    );
    mountain.position.set(-52+i*7,h/2-2,-72);
    scene.add(mountain);
  }

  // Buggy
  const car = new THREE.Group();
  const red = material(0xff4d35,.3,.25);
  const glass = material(0x80dcff,.2,.2);
  const dark = material(0x182333,.3,.1);
  const tireMat = material(0x171b20);
  const rimMat = material(0xc6d5df,.25,.65);
  const wheels = [];

  car.add(box(2.1,.6,3.1,red,0,.7,0));
  car.add(box(1.5,.75,1.45,glass,0,1.22,-.15));
  car.add(box(1.8,.15,1,dark,0,1.65,-.15));
  car.add(box(2,.16,.6,red,0,.96,1.12));
  car.add(box(1.7,.13,.25,dark,0,.47,-1.48));

  const lampMat = new THREE.MeshStandardMaterial({
    color:0xfff0b0,emissive:0xffba40,emissiveIntensity:1.2
  });
  car.add(box(.35,.16,.08,lampMat,-.68,.76,1.57));
  car.add(box(.35,.16,.08,lampMat,.68,.76,1.57));

  for(const x of [-.98,.98]){
    for(const z of [-1,1]){
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(.42,.42,.32,18),tireMat
      );
      tire.rotation.z=Math.PI/2;
      tire.position.set(x,.4,z);
      tire.castShadow=true;
      car.add(tire);
      wheels.push(tire);

      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(.21,.21,.34,16),rimMat
      );
      rim.rotation.z=Math.PI/2;
      rim.position.set(x*1.01,.4,z);
      car.add(rim);
    }
  }
  scene.add(car);
  car.position.set(0,1,0);

  // Repeating trees and roadside scenery
  const scenery=[];
  const trunkMat=material(0x775037);
  const leafMat=material(0x26794a);

  for(let i=0;i<42;i++){
    for(const side of [-1,1]){
      const tree=new THREE.Group();
      tree.add(new THREE.Mesh(
        new THREE.CylinderGeometry(.12,.18,1.1,7),trunkMat
      ));
      tree.children[0].position.y=.55;
      const leaves=new THREE.Mesh(
        new THREE.ConeGeometry(.9,1.8,7),leafMat
      );
      leaves.position.y=1.8;
      tree.add(leaves);
      tree.position.set(side*(7+(i%4)*1.8),.1,-i*6-10);
      scene.add(tree);
      scenery.push(tree);
    }
  }

  // Collectibles are recycled to create a long track
  const coins=[];
  const coinMat=new THREE.MeshStandardMaterial({
    color:0xffd82e,metalness:.75,roughness:.2,
    emissive:0x644100
  });

  for(let i=0;i<24;i++){
    const coin=new THREE.Mesh(
      new THREE.TorusGeometry(.38,.11,10,20),coinMat
    );
    coin.position.set((i%2?1:-1)*(1+(i%3)*.45),1.7,-14-i*10);
    coin.userData.baseY=coin.position.y;
    scene.add(coin);
    coins.push(coin);
  }

  const fuels=[];
  for(let i=0;i<5;i++){
    const fuel=new THREE.Group();
    fuel.add(box(.65,.85,.5,material(0x42ed80)));
    fuel.add(box(.3,.13,.53,material(0xf2ffdc),0,.15,.01));
    fuel.position.set(i%2?1.5:-1.5,1.1,-36-i*48);
    scene.add(fuel);
    fuels.push(fuel);
  }

  let running=false, ended=false;
  let fuel=100, totalCoins=0, distance=0, velocity=0;
  let travel=0, pitch=0;
  const keys=new Set();
  let gas=false, brake=false;
  let lastTime=performance.now();

  function reset(){
    running=true;ended=false;
    fuel=100;totalCoins=0;distance=0;velocity=0;travel=0;pitch=0;
    car.position.set(0,1,0);
    car.rotation.set(0,0,0);
    coins.forEach((o,i)=>{
      o.visible=true;
      o.position.z=-14-i*10;
    });
    fuels.forEach((o,i)=>{
      o.visible=true;
      o.position.z=-36-i*48;
    });
    $("start").classList.add("hidden");
    $("gameover").classList.add("hidden");
    updateHUD();
  }

  function finish(message){
    running=false;ended=true;
    $("reason").textContent=message;
    $("gameover").classList.remove("hidden");
  }

  function updateHUD(){
    $("distance").textContent=Math.floor(distance);
    $("coins").textContent=totalCoins;
    $("speed").textContent=Math.round(velocity*12);
    $("fuelBar").style.width=fuel+"%";
  }

  function update(dt){
    if(!running)return;

    const accelerating=gas||keys.has("arrowup")||keys.has("w");
    const braking=brake||keys.has("arrowdown")||keys.has("s")||keys.has(" ");

    if(accelerating)velocity+=5*dt;
    else velocity-=.8*dt;
    if(braking)velocity-=7*dt;
    velocity=THREE.MathUtils.clamp(velocity,0,17);

    travel+=velocity*dt*1.6;
    distance+=velocity*dt*2;
    fuel=Math.max(0,fuel-dt*(.45+velocity*.04));

    if(fuel<=0){
      finish("Out of fuel! Collect fuel cans on your next run.");
      updateHUD();
      return;
    }

    // Suspension-like bounce and terrain-following tilt
    const groundX=distance*.018;
    const targetPitch=THREE.MathUtils.clamp(-slope(groundX)*.3,-.3,.3);
    pitch=THREE.MathUtils.lerp(pitch,targetPitch,dt*4);
    car.position.y=1+hill(groundX)*.28+Math.sin(travel*1.6)*.025*velocity;
    car.rotation.z=pitch;
    car.rotation.y=THREE.MathUtils.lerp(car.rotation.y,accelerating?-.025:0,dt*3);
    wheels.forEach(w=>w.rotation.x-=velocity*dt*1.7);

    ground.position.z=-55+(travel%24);
    scenery.forEach(o=>{
      o.position.z+=velocity*dt*1.6;
      if(o.position.z>8)o.position.z=-245-Math.random()*15;
    });

    coins.forEach(o=>{
      o.position.z+=velocity*dt*1.6;
      o.rotation.y+=dt*2;
      o.position.y=o.userData.baseY+Math.sin(performance.now()*.002+o.position.z)*.12;

      if(o.visible && o.position.z>-1 && o.position.z<2 &&
         Math.abs(o.position.x-car.position.x)<2.2){
        o.visible=false;
        totalCoins++;
      }
      if(o.position.z>10){
        o.position.z-=240;
        o.visible=true;
      }
    });

    fuels.forEach(o=>{
      o.position.z+=velocity*dt*1.6;
      if(o.visible && o.position.z>-1 && o.position.z<2 &&
         Math.abs(o.position.x-car.position.x)<2.2){
        o.visible=false;
        fuel=Math.min(100,fuel+30);
      }
      if(o.position.z>10){
        o.position.z-=240;
        o.visible=true;
      }
    });

    camera.position.x=THREE.MathUtils.lerp(camera.position.x,car.position.x*.25,dt*2);
    camera.position.y=THREE.MathUtils.lerp(camera.position.y,4.5+car.position.y*.15,dt*2);
    camera.lookAt(0,1,-7);

    updateHUD();
  }

  function resize(){
    const w=host.clientWidth,h=host.clientHeight;
    renderer.setSize(w,h);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
  }

  function animate(now){
    requestAnimationFrame(animate);
    const dt=Math.min((now-lastTime)/1000,.04);
    lastTime=now;

    update(dt);

    if(!running){
      car.position.y=1+Math.sin(now*.0018)*.025;
      camera.lookAt(0,1,-7);
    }
    renderer.render(scene,camera);
  }

  function hold(id,setter){
    const el=$(id);
    const down=e=>{e.preventDefault();setter(true);};
    const up=e=>{e.preventDefault();setter(false);};
    el.addEventListener("pointerdown",down);
    ["pointerup","pointercancel","pointerleave"].forEach(
      event=>el.addEventListener(event,up)
    );
  }

  hold("gas",v=>gas=v);
  hold("brake",v=>brake=v);

  window.addEventListener("keydown",e=>{
    const k=e.key.toLowerCase();
    if(["arrowup","arrowdown"," "].includes(k))e.preventDefault();
    keys.add(k);
  });
  window.addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener("blur",()=>{gas=false;brake=false;keys.clear();});
  window.addEventListener("resize",resize);

  $("startBtn").addEventListener("click",reset);
  $("restartBtn").addEventListener("click",reset);

  resize();
  updateHUD();
  requestAnimationFrame(animate);
})();
