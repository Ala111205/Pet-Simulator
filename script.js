import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

window.addEventListener("load", () => {
  const pageLoader = document.getElementById("pageLoader");
  const petSelection = document.getElementById("petSelection");

  petSelection.style.display = "none";

  const loader = new GLTFLoader();
  const petModels = ["/assets/pets/Mosasaur.glb", "/assets/pets/Mikie.glb"];
  let loadedCount = 0;

  petModels.forEach((path) => {
    loader.load(
      path,
      (gltf) => {
        loadedCount++;
        if (loadedCount === petModels.length) {
          // Both models are ready, hide loader
          pageLoader.classList.add("fade-out");
          setTimeout(() => {
            pageLoader.style.display = "none";
            petSelection.style.display = "flex";
            loadPetPreview(currentPetIndex);
            updateButtonState();
          }, 500);
        }
      },
      undefined,
      (error) => console.error(`❌ Error loading ${path}:`, error)
    );
  });
});

// === PET PREVIEW LOGIC (Selection Screen) ===
const petList = [
  { name: "Mosasaur", path: "/assets/pets/Mosasaur.glb", id: 1 },
  { name: "Mikie", path: "/assets/pets/Mikie.glb", id: 2 },
];

let currentPetIndex = 0;
let currentPreviewModel = null;

const previewCanvas = document.getElementById("petPreview");
const previewRenderer = new THREE.WebGLRenderer({ canvas: previewCanvas, alpha: true, antialias: true });
previewRenderer.setSize(previewCanvas.clientWidth, previewCanvas.clientHeight);
previewRenderer.setPixelRatio(window.devicePixelRatio);

const previewScene = new THREE.Scene();
const previewCamera = new THREE.PerspectiveCamera(
  45,
  previewCanvas.clientWidth / previewCanvas.clientHeight,
  0.1,
  100
);

previewScene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
const previewDirLight = new THREE.DirectionalLight(0xffffff, 1);
previewDirLight.position.set(2, 5, 2);
previewScene.add(previewDirLight);

const previewLoader = new GLTFLoader();

function loadPetPreview(index) {
  if (currentPreviewModel) previewScene.remove(currentPreviewModel);

  const pet = petList[index];

  previewLoader.load(
    pet.path,
    (gltf) => {
      const model = gltf.scene;
      previewScene.add(model);
      currentPreviewModel = model;

      // === Compute initial bounding box ===
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      // === Default size for desktop ===
      let desiredSize = 5;

      // Responsive adjustment
      if (window.matchMedia("(max-width: 500px)").matches) {
        desiredSize = 1; // smaller pet for mobile
      }

      // === Apply uniform scale ===
      const scale = desiredSize / maxDim;
      model.scale.setScalar(scale);

      // === Recalculate bounding box after scaling ===
      const scaledBox = new THREE.Box3().setFromObject(model);
      const scaledSize = scaledBox.getSize(new THREE.Vector3());
      const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

      // === Center and lift model to stay visible ===
      model.position.sub(scaledCenter);
      model.position.y += scaledSize.y * 0.1;

      if (window.matchMedia("(max-width: 500px)").matches) {
        model.position.y += scaledSize.y * 0.8;
      }

      // === Adjust camera distance dynamically ===
      const fov = previewCamera.fov * (Math.PI / 180);
      const cameraZ = (desiredSize / 2) / Math.tan(fov / 2) * 1.2;
      previewCamera.position.set(0, 1, cameraZ);
      previewCamera.lookAt(0, 0.5, 0);

      enableManualPreviewRotation(model);
      document.getElementById("petName").textContent = pet.name;
    },
    undefined,
    (err) => console.error("Error loading model:", pet.path, err)
  );
}

function enableManualPreviewRotation(model) {
  let isDragging = false;
  let previousX = 0;
  const rotationSpeed = 0.02;

  function renderPreview() {
    requestAnimationFrame(renderPreview);
    previewRenderer.render(previewScene, previewCamera);
  }
  renderPreview();

  previewCanvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    previousX = e.clientX;
  });
  window.addEventListener("mouseup", () => (isDragging = false));
  previewCanvas.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - previousX;
    model.rotation.y += deltaX * rotationSpeed;
    previousX = e.clientX;
  });

  // Touch events
  previewCanvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      previousX = e.touches[0].clientX;
    }
  });
  window.addEventListener("touchend", () => (isDragging = false));
  previewCanvas.addEventListener("touchmove", (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - previousX;
    model.rotation.y += deltaX * rotationSpeed;
    previousX = e.touches[0].clientX;
  });
}

// Pet navigation
function updateButtonState() {
  if (currentPetIndex === 0) {
    prevPet.classList.add("disabled");
  } else {
    prevPet.classList.remove("disabled");
  }

  if (currentPetIndex === petList.length - 1) {
    nextPet.classList.add("disabled");
  } else {
    nextPet.classList.remove("disabled");
  }
}

document.getElementById("selectPetBtn").addEventListener("click", () => {
  const selectedPet = petList[currentPetIndex];
  console.log("Selected Pet:", selectedPet.name);

  document.getElementById("petSelection").style.display = "none";
  document.getElementById("loadingScreen").style.display = "flex";

  // Pass selection into game logic
  loadPet(selectedPet.id);
});

// === Game Logic ===
const canvas = document.getElementById("petCanvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);

let userInteracted = false;

// === CAMERA ===
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 2.5, 6);

// === LIGHTS ===
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
scene.add(hemiLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(3, 10, 4);
dirLight.castShadow = true;
scene.add(dirLight);

// === GROUND ===
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: 0x555555 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// === ORBIT CONTROLS ===
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableZoom = false;

// Prevent vertical rotation (limit polar angle)
controls.minPolarAngle = Math.PI / 2.2;
controls.maxPolarAngle = Math.PI / 2; 

controls.minDistance = 4;
controls.maxDistance = 6;
controls.enablePan = false;

// Allow full horizontal rotation (left-right)
controls.minAzimuthAngle = -Infinity; 
controls.maxAzimuthAngle = Infinity;

controls.enableRotate = true;
controls.autoRotate = false;

// Keep camera focus slightly above pet center
controls.target.set(0, 1.2, 0);

controls.addEventListener("start", () => {
  userInteracted = true;
  controls.autoRotate = false;
});

// === GLOBALS ===
const loader = new GLTFLoader();
let pet, mixer, petStates = {}, currentAction = null;
let chooseMosasaurBtn, chooseMikieBtn;
let selectedPet = null;
let isReady = false;
let petState = "idle";
let isBusy = false;
let idleTimeout = null;
let energy = 100, sleepProgress = 0;
let anger = 100;
let happiness = 100;
let energyInterval = null, sleepInterval = null;
let angerInterval = null;
let happinessInterval = null;
let energyBeforeSleep = null;
let energyAlertShown = false;
let angerAlertShown = false;
let happinessAlertShown = false;
let angerSpan = null;
let happinessSpan = null;
let energySpan = null;


function adjustPetScale(pet) {
  if (window.innerWidth <= 360) {
    pet.scale.set(1.4, 1.4, 1.4);
  } else {
    pet.scale.set(1.5, 1.5, 1.5);
  }
}

// === PET SELECTION ===
const selectionUI = document.getElementById("petSelection");
const gameUI = document.getElementById("gameUI");
const loadingScreen = document.getElementById("loadingScreen");

function loadPet(id) {
  selectedPet = id;
  selectionUI.style.display = "none";
  gameUI.style.display = "block";
  loadingScreen.style.display = "flex";

  const petPath = `/assets/pets/${id === 1 ? "Mosasaur.glb" : "Mikie.glb"}`;
  loader.load(
    petPath,
    (gltf) => {
      pet = gltf.scene;
      pet.visible = false;

      requestAnimationFrame(() => adjustPetScale(pet));
      
      pet.traverse((child) => {
        if (child.isMesh) child.castShadow = true;
      });
      scene.add(pet);

      mixer = new THREE.AnimationMixer(pet);
      loadPetAnimations(id);
    },
    undefined,
    (err) => console.error("❌ Failed to load pet model:", err)
  );
}

function loadPetAnimations(id) {
  const actions = ["idle", "punch", "play", "sleep", "wakeup"];
  let loaded = 0;

  actions.forEach((act) => {
    const animPath = `/assets/actions/${act}(${id}).glb`;
    loader.load(
      animPath,
      (anim) => {
        const clip = anim.animations[0];
        petStates[act] = mixer.clipAction(clip);
        loaded++;
        if (loaded === actions.length) {
          // Start static in idle pose
          const idleAction = petStates["idle"];
          if (idleAction) {
              Object.values(petStates).forEach((act) => {
                act.stop();
                act.paused = true;
              });

            // Start only idle animation
            idleAction.paused = false;
            idleAction.reset().play();
            mixer.update(0.001);
            
            // Show pet and reset states
            pet.visible = true;
            petState = "idle";    
            isBusy = false;        
            updateButtonVisibility();

            isReady = true;

            loadingScreen.style.transition = "opacity 0.5s ease";
            loadingScreen.style.opacity = "0";
            setTimeout(() => {
              loadingScreen.style.display = "none";
              if (document.readyState === "complete") {
                onPetReady();
              } else {
                window.addEventListener("load", () => setTimeout(onPetReady, 100));
              }
            }, 500)

            console.log("[pet] Animations loaded, pet visible, state:", petState);
          }
        }
      },
      undefined,
      (err) => console.error("❌ Failed to load animation:", animPath, err)
    );
  });
}

function showAlert(message, duration = 2500, color = "red") {
  const alertBox = document.getElementById("gameAlert");
  if (!alertBox) return;

  alertBox.textContent = message;
  alertBox.style.background =
    color === "green"
      ? "rgba(76, 175, 80, 0.95)"
      : color === "yellow"
      ? "rgba(255, 193, 7, 0.95)"
      : "rgba(255, 80, 80, 0.95)";

  alertBox.classList.add("show");

  clearTimeout(alertBox.hideTimeout);
  alertBox.hideTimeout = setTimeout(() => {
    alertBox.classList.remove("show");
  }, duration);
}

function updateWarnings() {
  const angerLow = anger <= 20;
  const energyLow = energy <= 1;
  const energyFull = energy >= 99;
  const funLow = happiness <= 10;

  document.getElementById("punchWarn").style.display = angerLow ? "block" : "none";
  document.getElementById("sleepWarn").style.display = energyLow ? "block" : "none";
  document.getElementById("playWarn").style.display = funLow ? "block" : "none";

  // show full energy icon only when pet is fully charged
  document.getElementById("sleepFull").style.display = energyFull ? "block" : "none";
}

function playAction(actionName) {
  if (!mixer || !petStates[actionName]) return;

  Object.values(petStates).forEach((act) => {
    act.stop();
    act.enabled = false;
  });

  const action = petStates[actionName];
  action.enabled = true;
  action.reset();

  if (actionName === "sleep" || actionName === "wakeup") {
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
  } else {
    action.setLoop(THREE.LoopRepeat);
    action.clampWhenFinished = false;
  }

  if (currentAction && currentAction !== action) {
    currentAction.crossFadeTo(action, 0.3, false);
  }

  action.play();

  currentAction = action;

  petState = actionName;
  requestRender();
}

// === SMOOTH TRANSITION ===
function switchAnimation(from, to, duration = 0.3) {
  if (from === to) return;
  if (from) from.fadeOut(duration);
  to.reset().fadeIn(duration).play();
  currentAction = to;
  requestRender();
}

// === STATE LOGIC ===
function playState(state, onComplete) {
  if (!mixer || !petStates[state]) return;
  const next = petStates[state];
  const prev = currentAction;
  switchAnimation(prev, next);

  playAction(state);

  if (idleTimeout) clearTimeout(idleTimeout);

  if (["punch", "play"].includes(state)) {
    idleTimeout = setTimeout(() => {
      switchAnimation(petStates[state], petStates["idle"]);
      playAction("idle");
      petState = "idle";
      requestRender();
      if (onComplete) onComplete();
    }, 3000);
  } else if (state === "sleep") {
    setTimeout(() => {
      if (onComplete) onComplete();
      requestRender();
      updateButtonVisibility();
    }, 500);
  } else if (state === "wakeup") {
    idleTimeout = setTimeout(() => {
      switchAnimation(petStates[state], petStates["idle"]);
      playAction("idle");
      petState = "idle";
      updateButtonVisibility();
      updateEnergyBar();
      startEnergyDrain();
      requestRender();
      if (onComplete) onComplete();
    }, 5000);
  } else {
    if (onComplete) onComplete();
  }
}

// === ENERGY ===
const energyFill = document.getElementById("energyFill");

function startEnergyDrain() {
  clearInterval(energyInterval);

  const baseDrainRate = 100 / 1200; // ~20 min to drain fully

  energyInterval = setInterval(() => {
    if (["sleeping", "sleeping_transition", "wakeup"].includes(petState) || isBusy) return;

    const drain = baseDrainRate;
    energy = Math.max(energy - drain, 0);

    updateEnergyBar();
    updateStatsDisplay();
    updateWarnings();
    checkAlertResets();

    if (energy <= 1 && !energyAlertShown && !["sleeping", "wakeup"].includes(petState)) {
      energyAlertShown = true;
      stopEnergyDrain();
      showAlert("😴 Your pet is exhausted! Let it sleep.");
      stopCurrentAction();
      return;
    }
  }, 1000);
}

// Energydrain for punch and play
document.getElementById("playBtn").addEventListener("click", play);
document.getElementById("punchBtn").addEventListener("click", punch);

function performAction(action, energyCost, callback) {
  if (isBusy || petState === "sleeping" || energy <= 0) return;
  isBusy = true;
  petState = action;

  energy = Math.max(energy - energyCost, 0);
  updateEnergyBar();
  updateStatsDisplay();

  callback?.(() => {
    isBusy = false;
    petState = "idle";
  });
}

function play() {
  performAction("playing", 2, (done) => {
    stopHappinessDrain();

    const prevHappiness = happiness;
    happiness = Math.min(happiness + 25, 100);
    updateStatsDisplay();
    updateWarnings();
    console.log(`[play] Happiness increased ${prevHappiness} → ${happiness}%`);

    playState("play", () => {
      startHappinessDrain();
      done();
    });
  });
}

function punch() {
  performAction("punching", 1.5, (done) => {
    stopAngerDrain();

    const prevAnger = anger;
    anger = Math.min(anger + 25, 100);
    updateStatsDisplay();
    updateWarnings();
    console.log(`[punch] Anger increased ${prevAnger} → ${anger}%`);

    playState("punch", () => {
      startAngerDrain();
      done();
    });
  });
}

function stopEnergyDrain() {
  if (energyInterval) {
    clearInterval(energyInterval);
    energyInterval = null;
    console.log("[energy] drain stopped");
  }
}

function startSleepRecovery() {
  stopEnergyDrain();
  clearInterval(sleepInterval);

  petState = "sleeping";
  isBusy = true;
  updateButtonVisibility();

  const startEnergy = energy; // current energy when sleep begins
  const recoveryTarget = 100;
  const totalGain = recoveryTarget - startEnergy;

  // recovery duration depends on how tired the pet is
  let duration;
  if (startEnergy < 15) duration = 30;
  else if (startEnergy < 30) duration = 45;
  else if (startEnergy < 60) duration = 60;
  else duration = 80;

  const step = totalGain / duration;

  console.log(`[sleep] Recovering from ${startEnergy}% → 100% over ${duration}s`);

  sleepInterval = setInterval(() => {
    if (petState !== "sleeping") {
      clearInterval(sleepInterval);
      console.log("[sleep] Recovery interrupted (pet woke early)");
      return;
    }

    energy = Math.min(energy + step, 100);
    updateEnergyBar(); // keep filling visually with each tick
    updateWarnings();

    if (energy >= 100) {
      clearInterval(sleepInterval);
      console.log("[sleep] Full energy reached");
      playState("wakeup");
    }
  }, 1000);
}

function updateEnergyBar() {
  const value = Math.max(0, Math.min(energy, 100));
  energyFill.style.width = `${value}%`;
  energyFill.style.background =
    petState === "sleeping"
      ? "skyblue"
      : value > 60
      ? "limegreen"
      : value > 30
      ? "gold"
      : "red";
}

// === PET STATE MACHINE ===
function setPetState(newState) {
  console.log(`[STATE] Transition request: ${petState} → ${newState}`);

  console.log(`[DEBUG] setPetState called with: ${newState}, current: ${petState}, isBusy: ${isBusy}`);

  // --- Validation checks ---
  if (petState === "idle" && newState === "wakeup") {
    console.warn("[STATE] Invalid transition ignored: idle → wakeup");
    return false;
  }

  if (petState === "sleeping" && (newState === "punch" || newState === "play")) {
    showAlert("🐾 Your pet is sleeping. Wake it up to play or punch!");
    return;
  }

  if ((newState === "punch" || newState === "play") && energy <= 1) {
    console.log(`[CHECK] newState=${newState}, energy=${energy}, petState=${petState}`);
    showAlert("😴 Your pet is tired! It's time to sleep.");
    // disableActionButtons();
    stopCurrentAction();
    return false;
  }

  if (newState === "sleep" && energy >= 15) {
    showAlert("💤 Your pet isn't tired yet!");
    return false;
  }

  if (isBusy) {
    console.warn("[STATE] Ignored: already busy with another animation");
    return false;
  }

  isBusy = true;

  // --- SLEEP ---
if (newState === "sleep") {
    console.log("[STATE] Transition request: idle → sleep");

    stopEnergyDrain();

    // freeze current energy snapshot
    energyBeforeSleep = energy;
    console.log(`[sleep] Energy snapshot taken: ${energyBeforeSleep}%`);

    isBusy = true;
    playState("sleep", () => {
      console.log("[anim] Sleep animation finished, waiting 0.5s before recovery...");
      setTimeout(() => {
        if (petState !== "sleep" && petState !== "sleeping_transition") {
          console.warn("[sleep] Skipped recovery — state changed early");
          return;
        }

        petState = "sleeping";
        console.log("[sleep] Starting recovery now...");
        startSleepRecovery();
        isBusy = false;
        updateEnergyBar();
        updateButtonVisibility();
      }, 500);
    });

    petState = "sleeping_transition";
    updateButtonVisibility();
    return;
  } else if (newState === "wakeup") { // --- WAKEUP ---
      if (petState === "wakeup") {
        console.warn("[wakeup] Ignored: already waking up.");
        return;
      }

      if (!["sleeping", "sleeping_transition"].includes(petState)) {
        console.warn("[wakeup] Ignored: pet not in sleeping state.");
        return;
      }

      console.log("[STATE] Transition request: sleeping → wakeup");

      clearInterval(sleepInterval);
      stopEnergyDrain();

      let recovered = 0;
      if (sleepProgress > 0) {
        recovered = Math.round((sleepProgress / 100) * (100 - energy));
        energy = Math.min(energy + recovered, 100);
        sleepProgress = 0;
        console.log(`[sync] Recovered ${recovered}% → energy now ${energy}%`);
      }

      petState = "wakeup";
      isBusy = true;
      updateButtonVisibility();

      playState("wakeup");
      console.log("[anim] Wakeup animation started");

      const originalUpdate = updateEnergyBar;
      updateEnergyBar = () => {};

      setTimeout(() => {
        if (petState !== "wakeup") return;

        updateEnergyBar = originalUpdate;
        updateEnergyBar();

        petState = "idle";
        isBusy = false;
        // disableActionButtons();
        updateButtonVisibility();
        startEnergyDrain();

        console.log("[energy] Wakeup complete after 4s, energy:", energy);
      }, 4900);

      // enableActionButtons();
      return;
  } else { // --- OTHER STATES (play, punch, idle) ---
      playState(newState, () => {
        petState = "idle";
        isBusy = false;
        // enableActionButtons();
        updateButtonVisibility();
        updateEnergyBar();
        requestRender();
      });
    }

  return true;
}

function updateButtonVisibility() {
  const sleepBtn = document.querySelector(".sleep-container");
  const wakeupBtn = document.querySelector(".wakeup-container");

  if (petState === "sleeping") {
    sleepBtn.style.display = "none";
    wakeupBtn.style.display = "block";
    sleepContainer.classList.add("sleep-mode");
  } else if (petState === "wakeup") {
    sleepBtn.style.display = "none";
    wakeupBtn.style.display = "none";
    sleepContainer.classList.add("sleep-mode");
  } else {
    sleepBtn.style.display = "flex";
    wakeupBtn.style.display = "none";
    sleepContainer.classList.remove("sleep-mode");
  }
}

// === BUTTONS ===
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("punchBtn").addEventListener("click", () => setPetState("punch"));
  document.getElementById("playBtn").addEventListener("click", () => setPetState("play"));
  document.getElementById("sleepBtn").addEventListener("click", () => setPetState("sleep"));
  document.getElementById("wakeupBtn").addEventListener("click", () => setPetState("wakeup"));
});

// function disableActionButtons(except = []) {
//   document.querySelectorAll("#punchBtn, #playBtn").forEach(btn => {
//     if (!except.includes(btn.id)) btn.disabled = true;
//   });
// }

// function enableActionButtons() {
//   document.querySelectorAll("#punchBtn, #playBtn").forEach(btn => {
//     btn.disabled = false;
//   });
// }

function stopCurrentAction() {
  if (!mixer || !currentAction) return;

  const idle = petStates["idle"];
  if (!idle) {
    currentAction.paused = true;
    return;
  }

  // stop stray actions cleanly
  mixer.stopAllAction();

  // hold current pose
  currentAction.enabled = true;
  currentAction.setEffectiveWeight(1);
  currentAction.time = Math.min(
    currentAction.time,
    currentAction.getClip().duration - 0.001
  );
  mixer.update(0);

  // prepare idle
  idle.enabled = true;
  idle.setEffectiveWeight(1);
  idle.time = 0.02;
  idle.play();

  // instant micro-blend to sync skeletons (kills final jerk)
  idle.crossFadeFrom(currentAction, 0.001, false);
  mixer.update(0.016);

  // reinforce idle continuity
  idle.paused = true; 
  mixer.update(0.016);

  currentAction = idle;
  petState = "idle";
}

// === anger & Happiness Logic for Energy ===
// === anger DRAIN ===
function startAngerDrain() {
  clearInterval(angerInterval);
  const drainRate = 100 / 960;

  angerInterval = setInterval(() => {
    if (petState === "sleeping") return;

    anger = Math.max(anger - drainRate, 0);
    updateStatsDisplay();
    updateWarnings();

    if (anger <= 20 && !angerAlertShown && !["sleeping", "wakeup", "sleeping_transition"].includes(petState)) {
      angerAlertShown = true;
      stopAngerDrain();
      showAlert("😡 Your pet is angry! Take it for a punch.");
    }
  }, 1000);
}

function stopAngerDrain() {
  clearInterval(angerInterval);
  angerInterval = null;
}

// punch recovery 
function recoverAnger() {
  const gain = 30;
  anger = Math.min(anger + gain, 100);
  updateStatsDisplay();
  updateWarnings();
  checkAlertResets();
  console.log(`[anger] Recovered ${gain} → ${anger}%`);

  if (!angerInterval) startAngerDrain();
}

// === HAPPINESS DRAIN ===
function startHappinessDrain() {
  clearInterval(happinessInterval);
  const drainRate = 100/ 1020;

  happinessInterval = setInterval(() => {
    if (petState === "sleeping") return;

    happiness = Math.max(happiness - drainRate, 0);
    updateStatsDisplay();
    updateWarnings();

    if (happiness <= 10 && !happinessAlertShown && !["sleeping", "wakeup", "sleeping_transition"].includes(petState)) {
      happinessAlertShown = true;
      stopHappinessDrain();
      showAlert("😢 Your pet feels lonely! Play with it.");
    }
  }, 1000);
}

function stopHappinessDrain() {
  clearInterval(happinessInterval);
  happinessInterval = null;
}

// Play recovery
function recoverHappiness() {
  const gain = 25;
  happiness = Math.min(happiness + gain, 100);
  updateStatsDisplay();
  updateWarnings();
  checkAlertResets();
  console.log(`[play] Happiness increased ${gain} → ${happiness}%`);

  if (!happinessInterval) startHappinessDrain();
}

// === STATS UPDATE DISPLAY ===
function updateStatsDisplay() {
  if (!angerSpan || !happinessSpan || !energySpan) return;

  angerSpan.textContent = Math.round(anger);
  happinessSpan.textContent = Math.round(happiness);
  energySpan.textContent = Math.round(energy);

  checkAlertResets();
}

window.addEventListener("DOMContentLoaded", () => {
  const prevPet = document.getElementById("prevPet");
  const nextPet = document.getElementById("nextPet")

  prevPet.addEventListener("click", () => {
    if (currentPetIndex > 0) {
      currentPetIndex--;
      loadPetPreview(currentPetIndex);
    }
    updateButtonState();
  });

  nextPet.addEventListener("click", () => {
    if (currentPetIndex < petList.length - 1) {
      currentPetIndex++;
      loadPetPreview(currentPetIndex);
    }
    updateButtonState();
  });

  loadPetPreview(currentPetIndex);
  updateButtonState();

  angerSpan = document.getElementById("anger");
  happinessSpan = document.getElementById("happiness");
  energySpan = document.getElementById("energy");

  chooseMosasaurBtn = document.getElementById("chooseMosasaur");
  chooseMikieBtn = document.getElementById("chooseMikie");
  chooseMosasaurBtn.addEventListener("click", () => loadPet(1));
  chooseMikieBtn.addEventListener("click", () => loadPet(2));

  console.log("✅ DOM loaded, attaching button handlers");

  const punch = document.getElementById("punchBtn");
  const play = document.getElementById("playBtn");

  punch.addEventListener("click", () => {
    if (petState === "sleeping") return showAlert("🐾 Pet is sleeping!");
    const ok = setPetState("punch");
    if (!ok) return;
    recoverAnger(); 
  });

  play.addEventListener("click", () => {
    if (petState === "sleeping") return showAlert("🐾 Pet is sleeping!");
    const ok = setPetState("play");
    if (!ok) return; 
    recoverHappiness();
  });

  document.getElementById("sleepBtn").addEventListener("click", () => setPetState("sleep"));
  document.getElementById("wakeupBtn").addEventListener("click", () => setPetState("wakeup"));

  updateStatsDisplay(angerSpan, happinessSpan, energySpan);
});

// === ALERT RESET CHECKS ===
function checkAlertResets() {
  if (energy > 20 && energyAlertShown) {
    energyAlertShown = false;
  }

  if (anger > 20 && angerAlertShown) {
    angerAlertShown = false;
  }

  if (happiness > 10 && happinessAlertShown) {
    happinessAlertShown = false;
  }
}

function onPetReady() {
  if (!angerInterval && !happinessInterval && !energyInterval) {
    startAngerDrain();
    startHappinessDrain();
    startEnergyDrain();
  }

  console.log("[pet] Drain systems active:", {
    anger: !!angerInterval,
    happiness: !!happinessInterval,
    energy: !!energyInterval
  });
}

// === OPTIMIZED LOOP ===
const clock = new THREE.Clock();
let needsRender = true;

function animate() {
  requestAnimationFrame(animate);
  if (controls.enableDamping || controls.autoRotate) controls.update();

  if (!isReady) return;
  
  const delta = clock.getDelta();
  if (mixer && currentAction && !currentAction.paused) mixer.update(delta);

  renderer.render(scene, camera);
}
function requestRender() {
  needsRender = true;
}
animate();

// === RESIZE ===
window.addEventListener("resize", () => {
  if (pet) adjustPetScale(pet);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

updateButtonVisibility();
updateEnergyBar();