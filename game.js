(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const THREE = window.THREE;

  if (!THREE) {
    $("loading").textContent = "3D library failed to load. Check your internet connection and refresh.";
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8bc0e0);
  scene.fog = new THREE.Fog(0x8bc0e0, 100, 430);

  const camera = new THREE.PerspectiveCamera(
    65, innerWidth / innerHeight, 0.1, 1200
  );
  camera.position.set(0, 6, 13);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  $("game").prepend(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xe3f4ff, 0x55402b, 2));

  const sunlight = new THREE.DirectionalLight(0xffffff, 3);
  sunlight.position.set(-35, 70, 25);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(1024, 1024);
  sunlight.shadow.camera.left = -65;
  sunlight.shadow.camera.right = 65;
  sunlight.shadow.camera.top = 65;
  sunlight.shadow.camera.bottom = -65;
  scene.add(sunlight);

  const mat = (color, roughness = 0.8, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });

  const materials = {
    tire: mat(0x171c23),
    rubber: mat(0x090c10),
    glass: new THREE.MeshStandardMaterial({
      color: 0x67d8ff, metalness: 0.3, roughness: 0.2,
      transparent: true, opacity: 0.72
    }),
    dark: mat(0x182433),
    white: mat(0xf0f5fa),
    coin: new THREE.MeshStandardMaterial({
      color: 0xffc928, metalness: 0.8, roughness: 0.2,
      emissive: 0x5c3200
    }),
    fuel: mat(0x21e779, 0.4),
    fuelCap: mat(0x172b20)
  };

  let roadType = "dirt";
  let vehicleType = "buggy";
  let roadWidth = 12;
  let running = false;
  let paused = false;
  let ended = false;
  let speed = 0;
  let fuel = 100;
  let coins = 0;
  let distance = 0;
  let steering = 0;
  let steeringOffset = 0;
  let lastTime = 0;
  let toastTimer = 0;

  const keys = {};
  const touch = { left: false, right: false, gas: false, brake: false };
  const world = new THREE.Group();
  scene.add(world);

  const roadObjects = [];
  const collectibles = [];
  const scenery = [];
  let car;
  let wheels = [];
  let wheelMeshes = [];

  function roadCenter(z) {
    return Math.sin(z * 0.008) * 13 +
           Math.sin(z * 0.021) * 4;
  }

  function roadY(z) {
    if (roadType === "mountain") {
      return Math.sin(z * 0.025) * 1.4 +
             Math.sin(z * 0.009) * 2;
    }
    if (roadType === "snow") {
      return Math.sin(z * 0.012) * 0.7;
    }
    return Math.sin(z * 0.01) * 0.25;
  }

  function makeBox(parent, w, h, d, material, x, y, z) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d), material
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function createCar(type) {
    const group = new THREE.Group();
    const paint = type === "rally" ? mat(0xff453e, 0.3, 0.3) :
                  type === "monster" ? mat(0x9c58ff, 0.35, 0.25) :
                  mat(0x15d9ee, 0.3, 0.35);

    const bodyLength = type === "monster" ? 3.3 : 2.8;
    const bodyHeight = type === "monster" ? 1.05 : 0.65;
    const wheelRadius = type === "monster" ? 0.63 :
                        type === "rally" ? 0.38 : 0.46;

    makeBox(group, 1.9, bodyHeight, bodyLength, paint, 0, 0.8, 0);

    if (type === "buggy") {
      const barMaterial = mat(0x152f45, 0.4, 0.5);
      for (const x of [-0.72, 0.72]) {
        makeBox(group, 0.09, 1.15, 0.09, barMaterial, x, 1.4, -0.45);
        makeBox(group, 0.09, 1.15, 0.09, barMaterial, x, 1.4, 0.65);
      }
      makeBox(group, 1.5, 0.08, 0.09, barMaterial, 0, 1.95, -0.45);
      makeBox(group, 1.5, 0.08, 0.09, barMaterial, 0, 1.95, 0.65);
    } else {
      makeBox(
        group, 1.35, 0.65, 1.35,
        materials.glass, 0, 1.38, -0.2
      );
      makeBox(
        group, 1.75, 0.1, 0.5,
        paint, 0, 1.08, -0.98
      );
    }

    const headlight = mat(0xfff3bc, 0.25, 0.2);
    const tailLight = mat(0xff302e, 0.3);

    for (const x of [-0.62, 0.62]) {
      makeBox(group, 0.35, 0.16, 0.08, headlight, x, 0.85, -bodyLength / 2 - 0.03);
      makeBox(group, 0.3, 0.13, 0.08, tailLight, x, 0.85, bodyLength / 2 + 0.03);
    }

    wheels = [];
    wheelMeshes = [];

    for (const x of [-0.99, 0.99]) {
      for (const z of [-bodyLength * 0.31, bodyLength * 0.31]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.34, 16),
          materials.tire
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, wheelRadius, z);
        wheel.castShadow = true;
        group.add(wheel);

        const hub = new THREE.Mesh(
          new THREE.CylinderGeometry(wheelRadius * 0.43, wheelRadius * 0.43, 0.36, 12),
          paint
        );
        hub.rotation.z = Math.PI / 2;
        hub.position.copy(wheel.position);
        group.add(hub);

        wheels.push(wheel);
        wheelMeshes.push(hub);
      }
    }

    group.userData.paint = paint;
    group.userData.wheelRadius = wheelRadius;
    return group;
  }

  function createMountain(x, z, scale, color) {
    const mesh = new THREE.Mesh(
      new THREE.ConeGeometry(1, 1, 7),
      mat(color)
    );
    mesh.position.set(x, scale * 0.35, z);
    mesh.scale.set(scale * 1.5, scale, scale);
    mesh.castShadow = true;
    world.add(mesh);
    scenery.push(mesh);
  }

  function makeTree(x, z) {
    const tree = new THREE.Group();
    const snow = roadType === "snow";
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.23, 1.4, 7),
      mat(0x62442b)
    );
    trunk.position.y = 0.7;
    tree.add(trunk);

    const leafColor = snow ? 0xe6f2fa :
      roadType === "desert" ? 0x71843d : 0x246844;

    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.85 - i * 0.16, 1.6, 7),
        mat(leafColor)
      );
      cone.position.y = 1.3 + i * 0.65;
      tree.add(cone);
    }

    tree.position.set(x, roadY(z), z);
    world.add(tree);
    scenery.push(tree);
  }

  function makeRoad() {
    const groundColor =
      roadType === "snow" ? 0xe4edf4 :
      roadType === "desert" ? 0xcba36a :
      roadType === "asphalt" ? 0x52665b : 0x826747;

    const roadColor =
      roadType === "snow" ? 0x899ba9 :
      roadType === "desert" ? 0x8e795f :
      roadType === "asphalt" ? 0x242d38 : 0x66513d;

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1200, 1500),
      mat(groundColor)
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.4, -650);
    ground.receiveShadow = true;
    world.add(ground);
    roadObjects.push(ground);

    const segments = 250;
    const positions = [];
    const indices = [];
    const uvs = [];

    for (let i = 0; i <= segments; i++) {
      const z = 50 - i * 4;
      const center = roadCenter(z);
      const y = roadY(z);

      positions.push(center - roadWidth / 2, y, z);
      positions.push(center + roadWidth / 2, y, z);
      uvs.push(0, i / 8, 1, i / 8);

      if (i < segments) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position", new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setAttribute(
      "uv", new THREE.Float32BufferAttribute(uvs, 2)
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const road = new THREE.Mesh(geometry, mat(roadColor));
    road.receiveShadow = true;
    world.add(road);
    roadObjects.push(road);

    // Roadside edge strips
    for (const side of [-1, 1]) {
      const edgePositions = [];
      const edgeIndices = [];

      for (let i = 0; i <= segments; i++) {
        const z = 50 - i * 4;
        const center = roadCenter(z);
        const y = roadY(z) + 0.04;
        edgePositions.push(
          center + side * roadWidth / 2, y, z,
          center + side * (roadWidth / 2 + 0.35), y, z
        );

        if (i < segments) {
          const a = i * 2;
          edgeIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }

      const eg = new THREE.BufferGeometry();
      eg.setAttribute(
        "position", new THREE.Float32BufferAttribute(edgePositions, 3)
      );
      eg.setIndex(edgeIndices);
      eg.computeVertexNormals();

      const edge = new THREE.Mesh(
        eg,
        mat(roadType === "asphalt" ? 0xe7e7df : 0xc5a16e)
      );
      world.add(edge);
      roadObjects.push(edge);
    }

    // Dashed centre line on paved roads
    if (roadType === "asphalt") {
      for (let z = 35; z > -980; z -= 13) {
        const dash = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.06, 6),
          mat(0xffe9a1)
        );
        dash.position.set(roadCenter(z), roadY(z) + 0.07, z);
        world.add(dash);
        roadObjects.push(dash);
      }
    }

    // Distant scenery
    for (let i = 0; i < 25; i++) {
      const z = 20 - i * 42;
      createMountain(-80 - Math.random() * 70, z, 25 + Math.random() * 40,
        roadType === "snow" ? 0xb9d0de :
        roadType === "desert" ? 0x98744d : 0x48657b);
      createMountain(80 + Math.random() * 70, z - 10, 30 + Math.random() * 40,
        roadType === "snow" ? 0xd1e3ed :
        roadType === "desert" ? 0xa88456 : 0x38566b);
    }

    for (let i = 0; i < 55; i++) {
      const z = 20 - Math.random() * 980;
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = roadCenter(z) + side * (roadWidth / 2 + 5 + Math.random() * 35);
      if (roadType !== "desert") makeTree(x, z);
    }
  }

  function makeCoin(z, side) {
    const group = new THREE.Group();
    const coin = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.14, 8, 18),
      materials.coin
    );
    group.add(coin);

    const centre = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.09, 12),
      materials.coin
    );
    centre.rotation.x = Math.PI / 2;
    group.add(centre);

    group.position.set(roadCenter(z) + side, roadY(z) + 1.65, z);
    world.add(group);
    collectibles.push({ mesh: group, type: "coin", taken: false, z });
  }

  function makeFuel(z, side) {
    const group = new THREE.Group();
    makeBox(group, 0.65, 0.85, 0.48, materials.fuel, 0, 0.45, 0);
    makeBox(group, 0.27, 0.1, 0.12, materials.fuelCap, 0, 0.94, 0);
    makeBox(group, 0.14, 0.42, 0.07, materials.white, 0, 0.46, -0.25);

    group.position.set(roadCenter(z) + side, roadY(z), z);
    world.add(group);
    collectibles.push({ mesh: group, type: "fuel", taken: false, z });
  }

  function buildCollectibles() {
    for (let z = -22; z > -970; z -= 13) {
      const lane = (Math.random() - 0.5) * 6;
      makeCoin(z, lane);
      if (Math.random() < 0.6) makeCoin(z - 3, lane + 0.6);
      if (Math.random() < 0.23) makeFuel(z - 8, (Math.random() - 0.5) * 7);
    }
  }

  function clearWorld() {
    while (world.children.length) {
      const obj = world.children[0];
      world.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material && !Object.values(materials).includes(obj.material)) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    roadObjects.length = 0;
    collectibles.length = 0;
    scenery.length = 0;

    if (car) {
      scene.remove(car);
      car.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material && obj.material !== materials.tire &&
            obj.material !== materials.glass) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    }
  }

  function setupWorld() {
    clearWorld();

    if (roadType === "dirt") {
      roadType = "mountain";
    }

    roadWidth = roadType === "asphalt" ? 15 :
                roadType === "desert" ? 13 :
                roadType === "snow" ? 11 : 10;

    scene.background = new THREE.Color(
      roadType === "snow" ? 0xc4dceb :
      roadType === "desert" ? 0xf1bd79 :
      roadType === "asphalt" ? 0x8cb5db : 0x8bc0e0
    );
    scene.fog.color.copy(scene.background);

    makeRoad();
    buildCollectibles();

    car = createCar(vehicleType);
    scene.add(car);
    car.position.set(roadCenter(0), roadY(0), 0);
  }

  function showToast(message) {
    $("toast").textContent = message;
    $("toast").classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("toast").classList.remove("show"), 1400);
  }

  function updateHUD() {
    $("coins").textContent = coins;
    $("distance").textContent = Math.floor(distance);
    $("speed").textContent = Math.round(speed * 7);
    $("fuel-text").textContent = Math.ceil(fuel) + "%";
    $("fuel-bar").style.width = Math.max(0, fuel) + "%";
    $("fuel-bar").style.background = fuel < 25 ? "#ff4e59" : "#36e68b";
  }

  function finishGame(title) {
    if (ended) return;
    ended = true;
    running = false;
    $("end-title").textContent = title;
    $("final-distance").textContent = Math.floor(distance);
    $("final-coins").textContent = coins;
    $("game-over").classList.remove("hidden");
  }

  function startGame() {
    vehicleType = $("vehicle-select").value;
    roadType = $("road-select").value;

    setupWorld();
    speed = 0;
    fuel = 100;
    coins = 0;
    distance = 0;
    steering = 0;
    steeringOffset = 0;
    ended = false;
    paused = false;
    running = true;

    $("menu").classList.add("hidden");
    $("game-over").classList.add("hidden");
    $("pause-btn").textContent = "Ⅱ";
    $("loading").style.display = "none";
    updateHUD();
    lastTime = performance.now();
  }

  function getInput() {
    const left = keys.ArrowLeft || keys.KeyA || touch.left;
    const right = keys.ArrowRight || keys.KeyD || touch.right;
    const gas = keys.ArrowUp || keys.KeyW || keys.Space || touch.gas;
    const brake = keys.ArrowDown || keys.KeyS || touch.brake;

    steering = (right ? 1 : 0) - (left ? 1 : 0);
    return { gas, brake };
  }

  function update(dt, elapsed) {
    if (!running || paused || ended) return;

    const input = getInput();
    const maxSpeed = vehicleType === "monster" ? 13 :
                     vehicleType === "rally" ? 17 : 15;

    if (input.gas && fuel > 0) {
      speed += 9 * dt;
    } else {
      speed -= 2.1 * dt;
    }

    if (input.brake) speed -= 15 * dt;
    speed = THREE.MathUtils.clamp(speed, 0, maxSpeed);

    if (speed > 0.2) {
      fuel -= dt * (0.28 + speed * 0.028);
      distance += speed * dt * 2.1;
    }

    fuel = Math.max(0, fuel);

    steeringOffset += steering * dt * (2.4 + speed * 0.12);
    steeringOffset = THREE.MathUtils.clamp(steeringOffset, -roadWidth * 0.8, roadWidth * 0.8);

    const z = -distance * 1.3;
    const playerX = roadCenter(z) + steeringOffset;
    car.position.set(playerX, roadY(z), z);
    car.rotation.y = -steering * 0.14 - Math.atan2(
      roadCenter(z - 1) - roadCenter(z + 1), 2
    ) * 0.5;
    car.rotation.z = -steering * 0.06;
    car.rotation.x = Math.sin(z * 0.025) * 0.025;

    for (const wheel of wheels) wheel.rotation.x -= speed * dt * 0.7;
    for (const hub of wheelMeshes) hub.rotation.x -= speed * dt * 0.7;

    // Third-person chase camera
    const target = new THREE.Vector3(playerX, car.position.y + 1.4, z - 3);
    const cameraTarget = new THREE.Vector3(playerX, car.position.y + 6.5, z + 11);
    camera.position.lerp(cameraTarget, 1 - Math.exp(-3 * dt));
    camera.lookAt(target);

    // Animate and collect coins / fuel
    for (const item of collectibles) {
      if (item.taken) continue;

      item.mesh.rotation.y += dt * (item.type === "coin" ? 2.8 : 0.7);
      if (item.type === "coin") item.mesh.position.y =
        roadY(item.z) + 1.65 + Math.sin(elapsed * 3 + item.z) * 0.12;

      const dx = item.mesh.position.x - playerX;
      const dz = item.z - z;

      if (Math.abs(dx) < 1.9 && Math.abs(dz) < 2.8) {
        item.taken = true;
        world.remove(item.mesh);

        if (item.type === "coin") {
          coins++;
          showToast("+1 COIN 🪙");
        } else {
          fuel = Math.min(100, fuel + 32);
          showToast("FUEL REFILLED! ⚡");
        }
      }
    }

    if (Math.abs(steeringOffset) > roadWidth / 2 + 2.3) {
      speed = Math.max(0, speed - 7 * dt);
      if (Math.random() < 0.02) showToast("GET BACK ON THE ROAD!");
    }

    if (fuel <= 0 && speed < 1) finishGame("OUT OF FUEL!");
    if (distance >= 740) finishGame("FINISH LINE!");
    updateHUD();
  }

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000 || 0, 0.04);
    lastTime = now;

    update(dt, now / 1000);
    renderer.render(scene, camera);
  }

  function bindHold(id, property) {
    const button = $(id);
    const down = event => {
      event.preventDefault();
      touch[property] = true;
      try { button.setPointerCapture(event.pointerId); } catch (_) {}
    };
    const up = event => {
      event.preventDefault();
      touch[property] = false;
    };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    button.addEventListener("lostpointercapture", () => {
      touch[property] = false;
    });
    button.addEventListener("contextmenu", event => event.preventDefault());
  }

  bindHold("left-btn", "left");
  bindHold("right-btn", "right");
  bindHold("gas-btn", "gas");
  bindHold("brake-btn", "brake");

  addEventListener("keydown", event => {
    keys[event.code] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
      event.preventDefault();
    }
  });

  addEventListener("keyup", event => {
    keys[event.code] = false;
  });

  addEventListener("blur", () => {
    for (const key in keys) keys[key] = false;
    for (const key in touch) touch[key] = false;
  });

  $("start-btn").addEventListener("click", startGame);
  $("restart-btn").addEventListener("click", startGame);

  $("menu-btn").addEventListener("click", () => {
    running = false;
    paused = false;
    $("game-over").classList.add("hidden");
    $("menu").classList.remove("hidden");
  });

  $("pause-btn").addEventListener("click", () => {
    if (!running || ended) return;
    paused = !paused;
    $("pause-btn").textContent = paused ? "▶" : "Ⅱ";
    if (paused) showToast("PAUSED");
    lastTime = performance.now();
  });

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  });

  // Start with a 3D preview behind the game menu.
  setupWorld();
  $("loading").style.display = "none";
  requestAnimationFrame(animate);
})();
