
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  if (!window.THREE) {
    $("loading").textContent = "Could not load 3D engine. Check your internet and refresh.";
    return;
  }

  const T = THREE;
  const scene = new T.Scene();
  scene.background = new T.Color(0x8bc9e8);
  scene.fog = new T.Fog(0x8bc9e8, 95, 420);

  const camera = new T.PerspectiveCamera(65, innerWidth / innerHeight, .1, 1500);
  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  $("game").prepend(renderer.domElement);

  scene.add(new T.HemisphereLight(0xdff5ff, 0x52402c, 2.2));
  const sun = new T.DirectionalLight(0xffffff, 3);
  sun.position.set(-25, 55, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const material = (color, metalness = 0, roughness = .65, extra = {}) =>
    new T.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  const shared = {
    tire: material(0x10151c),
    rubber: material(0x05080c),
    glass: material(0x60cfff, .25, .2, { transparent: true, opacity: .78 }),
    coin: material(0xffcb35, .7, .2, { emissive: 0x664000 }),
    fuel: material(0x21ed85, .1, .35),
    white: material(0xffffff),
    dark: material(0x1b293b)
  };

  const CARS = [
    { id: "buggy", name: "Neon Buggy", price: 0, art: "🏎️", color: 0x15d9ee, max: 16, desc: "Balanced starter vehicle" },
    { id: "rally", name: "Rally Racer", price: 120, art: "🏁", color: 0xff443e, max: 20, desc: "Fast on every road" },
    { id: "monster", name: "Monster Truck", price: 220, art: "🚙", color: 0xa45bff, max: 14, desc: "Big wheels and a heavy body" },
    { id: "super", name: "Neon Supercar", price: 400, art: "🏎️", color: 0xffa629, max: 25, desc: "Highest top speed" }
  ];

  const storageKey = "orbittronizNeonGarageV2";
  let save = { bank: 0, unlocked: ["buggy"], selected: "buggy" };
  try {
    const old = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (old && typeof old === "object") {
      save.bank = Math.max(0, Number(old.bank) || 0);
      save.unlocked = Array.isArray(old.unlocked) ? old.unlocked : ["buggy"];
      save.unlocked = [...new Set(["buggy", ...save.unlocked.filter(id => CARS.some(c => c.id === id))])];
      save.selected = save.unlocked.includes(old.selected) ? old.selected : "buggy";
    }
  } catch (_) {}

  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(save)); } catch (_) {}
    updateWallet();
  }
  function updateWallet() {
    $("coins").textContent = save.bank;
    $("menu-coins").textContent = save.bank;
    $("garage-coins").textContent = save.bank;
  }

  const world = new T.Group();
  scene.add(world);
  let car = null, wheels = [], collectibles = [], obstacles = [];
  let road = "dirt", running = false, paused = false, ended = false;
  let speed = 0, fuel = 100, distance = 0, earned = 0, hits = 0;
  let offset = 0, steer = 0, lastTime = performance.now(), toastTimer;
  const keys = {};
  const touch = { left: false, right: false, gas: false, brake: false };

  const center = z => Math.sin(z * .008) * 10 + Math.sin(z * .019) * 3;
  const elevation = z => road === "dirt" ? Math.sin(z * .022) * 1.1 :
    road === "snow" ? Math.sin(z * .012) * .4 : 0;
  const roadWidth = () => road === "asphalt" ? 15 : road === "desert" ? 13 : 11;

  function box(parent, w, h, d, mat, x, y, z) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function makeCar(id) {
    const data = CARS.find(c => c.id === id) || CARS[0];
    const group = new T.Group();
    const paint = material(data.color, .38, .25);
    const monster = id === "monster";
    const supercar = id === "super";
    const length = monster ? 3.4 : 2.9;
    const radius = monster ? .65 : id === "rally" ? .4 : .47;

    box(group, supercar ? 1.9 : 1.85, monster ? 1.05 : .65,
      length, paint, 0, .82, 0);

    if (id === "buggy") {
      const bar = material(0x162b3d, .55, .35);
      for (const x of [-.7, .7]) {
        box(group, .08, 1.1, .08, bar, x, 1.4, -.45);
        box(group, .08, 1.1, .08, bar, x, 1.4, .65);
      }
      box(group, 1.45, .08, .08, bar, 0, 1.92, -.45);
      box(group, 1.45, .08, .08, bar, 0, 1.92, .65);
    } else {
      box(group, 1.3, .6, 1.35, shared.glass, 0, 1.35, -.15);
      box(group, 1.7, .12, .55, paint, 0, 1.04, -1.02);
      if (supercar) box(group, 1.55, .13, .6, paint, 0, 1.05, 1.18);
    }

    for (const x of [-.65, .65]) {
      box(group, .33, .15, .07, material(0xfff3b3, .1, .2), x, .85, -length / 2 - .03);
      box(group, .29, .14, .07, material(0xff292e), x, .85, length / 2 + .03);
    }

    wheels = [];
    for (const x of [-1, 1]) {
      for (const z of [-length * .31, length * .31]) {
        const wheel = new T.Mesh(
          new T.CylinderGeometry(radius, radius, .34, 18), shared.tire
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, radius, z);
        wheel.castShadow = true;
        group.add(wheel);
        const hub = new T.Mesh(
          new T.CylinderGeometry(radius * .42, radius * .42, .36, 12), paint
        );
        hub.rotation.z = Math.PI / 2;
        hub.position.copy(wheel.position);
        group.add(hub);
        wheels.push(wheel, hub);
      }
    }
    group.userData.maxSpeed = data.max;
    return group;
  }

  function sceneryTree(x, z) {
    const group = new T.Group();
    const trunk = new T.Mesh(new T.CylinderGeometry(.12, .23, 1.4, 7), material(0x68442a));
    trunk.position.y = .7;
    group.add(trunk);
    const green = road === "snow" ? 0xd8eaf4 : road === "desert" ? 0x819147 : 0x206c49;
    for (let i = 0; i < 3; i++) {
      const cone = new T.Mesh(new T.ConeGeometry(.9 - i * .15, 1.6, 7), material(green));
      cone.position.y = 1.25 + i * .6;
      group.add(cone);
    }
    group.position.set(x, elevation(z), z);
    world.add(group);
  }

  function mountain(x, z, scale) {
    const color = road === "snow" ? 0xb9d0df : road === "desert" ? 0x98724a : 0x48677e;
    const mesh = new T.Mesh(new T.ConeGeometry(1, 1, 7), material(color));
    mesh.position.set(x, scale * .35, z);
    mesh.scale.set(scale * 1.4, scale, scale);
    world.add(mesh);
  }

  function addCoin(z, lane) {
    const group = new T.Group();
    const ring = new T.Mesh(new T.TorusGeometry(.42, .13, 8, 18), shared.coin);
    group.add(ring);
    const centrePiece = new T.Mesh(new T.CylinderGeometry(.22, .22, .08, 12), shared.coin);
    centrePiece.rotation.x = Math.PI / 2;
    group.add(centrePiece);
    group.position.set(center(z) + lane, elevation(z) + 1.55, z);
    world.add(group);
    collectibles.push({ group, type: "coin", z, lane, used: false });
  }

  function addFuel(z, lane) {
    const group = new T.Group();
    box(group, .62, .8, .48, shared.fuel, 0, .42, 0);
    box(group, .26, .1, .12, shared.dark, 0, .87, 0);
    box(group, .13, .38, .06, shared.white, 0, .43, -.25);
    group.position.set(center(z) + lane, elevation(z), z);
    world.add(group);
    collectibles.push({ group, type: "fuel", z, lane, used: false });
  }

  function addObstacle(z, lane, type) {
    const group = new T.Group();
    if (type === "rock") {
      const rock = new T.Mesh(new T.DodecahedronGeometry(.8, 0), material(0x777d85));
      rock.scale.set(1.15, .8, .9);
      rock.position.y = .55;
      rock.castShadow = true;
      group.add(rock);
    } else if (type === "cone") {
      const cone = new T.Mesh(new T.ConeGeometry(.38, .95, 8), material(0xff762e));
      cone.position.y = .48;
      cone.castShadow = true;
      group.add(cone);
      box(group, .8, .12, .8, shared.dark, 0, .06, 0);
    } else if (type === "crate") {
      box(group, 1.15, 1.15, 1.15, material(0x98643d), 0, .58, 0);
      for (const s of [-1, 1]) box(group, .06, 1.05, .06, material(0xd7aa6c), s * .36, .58, -.59);
    } else {
      box(group, 2.3, .65, .65, material(0xff563c), 0, .38, 0);
      box(group, 2.4, .12, .72, material(0xe6edf4), 0, .5, 0);
    }
    group.position.set(center(z) + lane, elevation(z), z);
    world.add(group);
    obstacles.push({ group, z, lane, type, hit: false });
  }

  function buildWorld() {
    while (world.children.length) world.remove(world.children[0]);
    collectibles = [];
    obstacles = [];
    const width = roadWidth();

    const groundColor = road === "snow" ? 0xe1edf4 :
      road === "desert" ? 0xc9a06a : 0x52665a;
    const roadColor = road === "snow" ? 0x8499a8 :
      road === "desert" ? 0x8c795f : road === "asphalt" ? 0x242c38 : 0x66503a;

    const ground = new T.Mesh(new T.PlaneGeometry(1200, 1500), material(groundColor));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -.5, -650);
    ground.receiveShadow = true;
    world.add(ground);

    const positions = [], indices = [];
    const segments = 300;
    for (let i = 0; i <= segments; i++) {
      const z = 35 - i * 4;
      const x = center(z), y = elevation(z);
      positions.push(x - width / 2, y, z, x + width / 2, y, z);
      if (i < segments) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const roadMesh = new T.Mesh(geo, material(roadColor));
    roadMesh.receiveShadow = true;
    world.add(roadMesh);

    if (road === "asphalt") {
      for (let z = 28; z > -1180; z -= 14) {
        const dash = box(world, .16, .06, 6, material(0xffe7a1), center(z), elevation(z) + .05, z);
      }
    }

    for (let z = 25; z > -1120; z -= 38) {
      for (const side of [-1, 1]) {
        const x = center(z) + side * (width / 2 + 5 + Math.random() * 24);
        if (road !== "desert" && Math.random() > .2) sceneryTree(x, z);
        else mountain(x * 1.3, z, 25 + Math.random() * 35);
      }
    }

    for (let z = -20; z > -1120; z -= 14) {
      addCoin(z, (Math.random() - .5) * 5);
      if (Math.random() < .65) addCoin(z - 2, (Math.random() - .5) * 5);
      if (Math.random() < .18) addFuel(z - 5, (Math.random() - .5) * 6);

      if (z < -35 && Math.random() < .52) {
        const types = ["rock", "cone", "crate", "barrier"];
        addObstacle(z - 4, (Math.random() - .5) * (width - 3),
          types[Math.floor(Math.random() * types.length)]);
      }
    }

    car = makeCar(save.selected);
    scene.add(car);
    car.position.set(center(0), elevation(0), 0);
  }

  function showToast(text) {
    $("toast").textContent = text;
    $("toast").classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("toast").classList.remove("show"), 1250);
  }

  function updateHUD() {
    $("coins").textContent = save.bank;
    $("distance").textContent = Math.floor(distance);
    $("speed").textContent = Math.round(speed * 7);
    $("fuel-text").textContent = Math.ceil(fuel) + "%";
    $("fuel-bar").style.width = fuel + "%";
    $("fuel-bar").style.background = fuel < 25 ? "#ff485b" : "#39ee9a";
  }

  function showScreen(id) {
    for (const screen of ["menu", "garage", "game-over"]) $(screen).classList.add("hidden");
    if (id) $(id).classList.remove("hidden");
  }

  function fillVehicleSelect() {
    $("vehicle-select").innerHTML = CARS.filter(c => save.unlocked.includes(c.id))
      .map(c => `<option value="${c.id}">${c.name}</option>`).join("");
    $("vehicle-select").value = save.selected;
  }

  function renderGarage() {
    updateWallet();
    $("car-list").innerHTML = CARS.map(c => {
      const owned = save.unlocked.includes(c.id);
      const selected = save.selected === c.id;
      const affordable = save.bank >= c.price;
      const action = owned ? (selected ? "SELECTED" : "SELECT") :
        `BUY · 🪙 ${c.price}`;
      return `<article class="car-card">
        <div class="car-art">${c.art}</div>
        <h3>${c.name}</h3>
        <p>${c.desc}</p>
        <p>Top speed: ${c.max * 7} km/h</p>
        <div class="price">${owned ? "UNLOCKED" : "🪙 " + c.price + " COINS"}</div>
        <button data-car="${c.id}" ${selected || (!owned && !affordable) ? "disabled" : ""}>${action}</button>
      </article>`;
    }).join("");

    $("car-list").querySelectorAll("button[data-car]").forEach(button => {
      button.addEventListener("click", () => {
        const id = button.dataset.car;
        const data = CARS.find(c => c.id === id);
        if (!data) return;

        if (!save.unlocked.includes(id)) {
          if (save.bank < data.price) {
            showToast("NOT ENOUGH COINS!");
            return;
          }
          save.bank -= data.price;
          save.unlocked.push(id);
          showToast(data.name + " UNLOCKED!");
        }

        save.selected = id;
        persist();
        fillVehicleSelect();
        renderGarage();
      });
    });
  }

  function finish(title) {
    if (ended) return;
    ended = true;
    running = false;
    persist();
    $("result-title").textContent = title;
    $("final-distance").textContent = Math.floor(distance) + " m";
    $("final-earned").textContent = earned;
    $("final-hits").textContent = hits;
    showScreen("game-over");
  }

  function startGame() {
    road = $("road-select").value;
    save.selected = $("vehicle-select").value;
    if (!save.unlocked.includes(save.selected)) save.selected = "buggy";
    persist();
    fillVehicleSelect();

    if (car) {
      scene.remove(car);
      car.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material && o.material !== shared.tire &&
            o.material !== shared.glass) {
          if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
          else o.material.dispose();
        }
      });
    }

    speed = 0;
    fuel = 100;
    distance = 0;
    earned = 0;
    hits = 0;
    offset = 0;
    steer = 0;
    paused = false;
    ended = false;
    buildWorld();
    running = true;
    $("pause-btn").textContent = "Ⅱ";
    $("loading").style.display = "none";
    showScreen(null);
    updateHUD();
    lastTime = performance.now();
  }

  function inputState() {
    steer = (keys.ArrowRight || keys.KeyD || touch.right ? 1 : 0) -
            (keys.ArrowLeft || keys.KeyA || touch.left ? 1 : 0);
    return {
      gas: keys.ArrowUp || keys.KeyW || keys.Space || touch.gas,
      brake: keys.ArrowDown || keys.KeyS || touch.brake
    };
  }

  function update(dt, time) {
    if (!running || paused || ended) return;
    const input = inputState();
    const max = car.userData.maxSpeed;

    if (input.gas && fuel > 0) speed += 8.5 * dt;
    else speed -= 1.5 * dt;
    if (input.brake) speed -= 13 * dt;
    speed = T.MathUtils.clamp(speed, 0, max);

    if (speed > .1) {
      fuel = Math.max(0, fuel - dt * (.24 + speed * .025));
      distance += speed * dt * 2;
    }

    offset += steer * dt * (2.5 + speed * .09);
    offset = T.MathUtils.clamp(offset, -roadWidth() * .85, roadWidth() * .85);
    const z = -distance * 1.3;
    const x = center(z) + offset;
    car.position.set(x, elevation(z), z);
    car.rotation.y = -steer * .14 -
      Math.atan2(center(z - 1) - center(z + 1), 2) * .4;
    car.rotation.z = -steer * .055;
    car.rotation.x = Math.sin(z * .025) * .02;
    wheels.forEach(w => { w.rotation.x -= speed * dt * .8; });

    camera.position.lerp(new T.Vector3(x, car.position.y + 6.2, z + 11), 1 - Math.exp(-3 * dt));
    camera.lookAt(x, car.position.y + 1.1, z - 4);

    for (const item of collectibles) {
      if (item.used) continue;
      item.group.rotation.y += dt * (item.type === "coin" ? 2.5 : .6);
      if (item.type === "coin") item.group.position.y =
        elevation(item.z) + 1.55 + Math.sin(time * 3 + item.z) * .12;

      const dz = Math.abs(item.z - z);
      const dx = Math.abs(center(item.z) + item.lane - x);
      if (dz < 2.8 && dx < 1.65) {
        item.used = true;
        world.remove(item.group);
        if (item.type === "coin") {
          save.bank++;
          earned++;
          persist();
          showToast("+1 COIN 🪙");
        } else {
          fuel = Math.min(100, fuel + 35);
          showToast("FUEL +35% ⚡");
        }
      }
    }

    for (const obstacle of obstacles) {
      if (obstacle.hit) continue;
      const dz = Math.abs(obstacle.z - z);
      const dx = Math.abs(center(obstacle.z) + obstacle.lane - x);
      if (dz < 2.2 && dx < 1.8) {
        obstacle.hit = true;
        speed *= .35;
        fuel = Math.max(0, fuel - 6);
        hits++;
        showToast("CRASH! WATCH THE ROAD");
      }
    }

    if (Math.abs(offset) > roadWidth() / 2 + 2) {
      speed = Math.max(0, speed - 5 * dt);
    }
    if (fuel <= 0 && speed < 1) finish("OUT OF FUEL");
    else if (distance >= 850) finish("RACE COMPLETE!");
    updateHUD();
  }

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000 || 0, .04);
    lastTime = now;
    update(dt, now / 1000);
    renderer.render(scene, camera);
  }

  function hold(id, prop) {
    const b = $(id);
    const down = e => { e.preventDefault(); touch[prop] = true; };
    const up = e => { e.preventDefault(); touch[prop] = false; };
    b.addEventListener("pointerdown", down);
    b.addEventListener("pointerup", up);
    b.addEventListener("pointercancel", up);
    b.addEventListener("lostpointercapture", () => touch[prop] = false);
    b.addEventListener("contextmenu", e => e.preventDefault());
  }
  hold("left-btn", "left");
  hold("right-btn", "right");
  hold("gas-btn", "gas");
  hold("brake-btn", "brake");

  addEventListener("keydown", e => {
    keys[e.code] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
  });
  addEventListener("keyup", e => keys[e.code] = false);
  addEventListener("blur", () => {
    Object.keys(keys).forEach(k => keys[k] = false);
    Object.keys(touch).forEach(k => touch[k] = false);
  });

  $("start-btn").addEventListener("click", startGame);
  $("again-btn").addEventListener("click", startGame);
  $("garage-btn").addEventListener("click", () => {
    renderGarage();
    showScreen("garage");
  });
  $("result-garage").addEventListener("click", () => {
    renderGarage();
    showScreen("garage");
  });
  $("garage-back").addEventListener("click", () => {
    fillVehicleSelect();
    showScreen("menu");
  });
  $("result-menu").addEventListener("click", () => {
    fillVehicleSelect();
    showScreen("menu");
  });
  $("pause-btn").addEventListener("click", () => {
    if (!running || ended) return;
    paused = !paused;
    $("pause-btn").textContent = paused ? "▶" : "Ⅱ";
    showToast(paused ? "PAUSED" : "RACE RESUMED");
    lastTime = performance.now();
  });

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  });

  fillVehicleSelect();
  updateWallet();
  buildWorld();
  $("loading").style.display = "none";
  showScreen("menu");
  requestAnimationFrame(animate);
})();
