// Three.js globals
let scene, camera, renderer, controls, gui;
let shapes = [];
let directionalLight, ambientLight;

const params = {
  colors: ['#62aaf3', '#6262f3', '#aa62f3', '#f362f3', '#f362aa'],
  harmonyMode: 'Analogous',
  baseHue: 0,
  saturation: 70,
  brightness: 70,
  spread: 30,
  shadowsEnabled: true,
  whiteBackground: false,

  regenerateColors() {
    this.baseHue = Math.floor(Math.random() * 360);
    this.saturation = Math.floor(Math.random() * 30) + 70;
    this.brightness = Math.floor(Math.random() * 30) + 60;

    const folder = gui.__folders['Color Settings'];
    if (folder) {
      folder.__controllers.forEach(ctrl => {
        if (['baseHue', 'saturation', 'brightness'].includes(ctrl.property)) {
          ctrl.setValue(this[ctrl.property]);
        }
      });
    }

    updateColorsFromHarmony();
  },

  copyAllColors() {
    const formatted = this.colors.map((c, i) => `Color ${i + 1}: ${c}`).join(' - ');
    navigator.clipboard.writeText(formatted).then(() => {
      const btn = gui.__controllers.find(c => c.property === 'copyAllColors').__li;
      const original = btn.innerHTML;
      btn.innerHTML = original.replace('Copy All Colors', 'Copied!');
      setTimeout(() => (btn.innerHTML = original), 1000);
    });
  },

  toggleShadows(value) {
    if (directionalLight) {
      directionalLight.intensity = value ? 0.3 : 0;
    }
    if (ambientLight) {
      ambientLight.intensity = value ? 0.8 : 1.0;
    }
  }
};

// Utility
const getResponsiveValues = () => {
  const isMobile = window.innerWidth < 768;
  return {
    sphereRadius: isMobile ? 0.8 : 1.2,
    spacing: isMobile ? 2 : 3,
    cameraZ: isMobile ? 14 : 10
  };
};

const updateBackgroundGradient = () => {
  const container = document.querySelector('.colors-container');
  if (!container) return;

  container.style.background = params.whiteBackground ? '#fff' : '#000';
};

// Initialization
const init = () => {
  const container = document.querySelector('.colors-container');
  if (!container) return console.error('Missing .colors-container');

  const startColor = new THREE.Color(params.colors[0]);
  const hsl = {};
  startColor.getHSL(hsl);

  Object.assign(params, {
    baseHue: Math.round(hsl.h * 360),
    saturation: Math.round(hsl.s * 100),
    brightness: Math.round(hsl.l * 100)
  });

  scene = new THREE.Scene();

  const { cameraZ } = getResponsiveValues();
  camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(cameraZ * 0.9, cameraZ * 0.15, cameraZ * 0.5);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Add lighting for shadows
  ambientLight = new THREE.AmbientLight(0xffffff, params.shadowsEnabled ? 0.8 : 1.0);
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, params.shadowsEnabled ? 0.3 : 0);
  directionalLight.position.set(5, 10, 7.5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  scene.add(directionalLight);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  Object.assign(controls, {
    enableDamping: true,
    dampingFactor: 0.05,
    rotateSpeed: 0.5,
    enableZoom: false,
    enablePan: false,
    autoRotate: false,
    autoRotateSpeed: 1.0,
    minDistance: 5,
    maxDistance: 30
  });

  updateBackgroundGradient();
  createShapes();
  setupGUI();

  window.addEventListener('resize', () => {
    handleResize();
    updateShapesForScreenSize();
  });

  animate();
};

// Resize Handling
const handleResize = () => {
  const container = document.querySelector('.colors-container');
  if (!container) return;
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
};

// Shape Management
const createShapes = () => {
  shapes.forEach(shape => {
    shape.geometry.dispose();
    shape.material.dispose();
    scene.remove(shape);
  });
  shapes = [];

  const { sphereRadius, spacing } = getResponsiveValues();
  const geometry = new THREE.SphereGeometry(sphereRadius, 32, 32);
  const totalWidth = (params.colors.length - 1) * spacing;

  params.colors.forEach((color, i) => {
    const material = new THREE.MeshStandardMaterial({ 
      color,
      roughness: 0.5,
      metalness: 0.1
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.x = i * spacing - totalWidth / 2;
    sphere.castShadow = true;
    sphere.receiveShadow = true;

    scene.add(sphere);
    shapes.push(sphere);
  });
};

const updateShapesForScreenSize = () => {
  const { sphereRadius, spacing, cameraZ } = getResponsiveValues();
  const geometry = new THREE.SphereGeometry(sphereRadius, 32, 32);
  const totalWidth = (params.colors.length - 1) * spacing;

  shapes.forEach((shape, i) => {
    shape.geometry.dispose();
    shape.geometry = geometry;
    shape.position.x = i * spacing - totalWidth / 2;
  });

  camera.position.set(cameraZ * 0.9, cameraZ * 0.15, cameraZ * 0.5);
};

// Color Harmony Generation
const updateColorsFromHarmony = () => {
  const h = params.baseHue / 360;
  const s = params.saturation / 100;
  const l = params.brightness / 100;
  const spread = params.spread / 360;

  let newColors = [];

  switch (params.harmonyMode) {
    case 'Analogous':
      newColors = Array.from({ length: 5 }, (_, i) =>
        new THREE.Color().setHSL((h + spread * (i - 2) + 1) % 1, s, l)
      );
      break;

    case 'Complementary': {
      const comp = (h + 0.5) % 1;
      newColors = [
        new THREE.Color().setHSL(h, s, l),
        new THREE.Color().setHSL(h, s * 0.8, l * 1.1),
        new THREE.Color().setHSL(h, s * 0.6, l * 1.2),
        new THREE.Color().setHSL(comp, s, l),
        new THREE.Color().setHSL(comp, s * 0.8, l * 1.1)
      ];
      break;
    }

    case 'Triadic':
      newColors = Array.from({ length: 5 }, (_, i) => {
        const hue = (h + Math.floor(i / 2) * 0.333) % 1;
        const light = l * (1 + (i % 2) * 0.2);
        return new THREE.Color().setHSL(hue, s, light);
      });
      break;

    case 'Split Complementary': {
      const comp1 = (h + 0.5 - spread) % 1;
      const comp2 = (h + 0.5 + spread) % 1;
      newColors = [
        new THREE.Color().setHSL(h, s, l),
        new THREE.Color().setHSL(h, s * 0.8, l * 1.1),
        new THREE.Color().setHSL(comp1, s, l),
        new THREE.Color().setHSL(comp2, s, l),
        new THREE.Color().setHSL(comp2, s * 0.8, l * 1.1)
      ];
      break;
    }
  }

  params.colors = newColors.map(c => `#${c.getHexString()}`);
  shapes.forEach((shape, i) => shape.material.color.set(params.colors[i]));
  updateBackgroundGradient();
  updateGUIColors();
};

const updateGUIColors = () => {
  const folder = gui.__folders['Color Palette'];
  if (!folder) return;
  folder.__controllers.forEach(ctrl => {
    const i = parseInt(ctrl.property);
    if (!isNaN(i)) ctrl.setValue(params.colors[i]);
  });
};

// GUI
const setupGUI = () => {
  gui = new dat.GUI();

  const harmony = gui.addFolder('Color Settings');
  harmony.add(params, 'harmonyMode', ['Analogous', 'Complementary', 'Triadic', 'Split Complementary']).onChange(updateColorsFromHarmony);
  harmony.add(params, 'baseHue', 0, 360).step(1).onChange(updateColorsFromHarmony);
  harmony.add(params, 'saturation', 0, 100).step(1).onChange(updateColorsFromHarmony);
  harmony.add(params, 'brightness', 0, 100).step(1).onChange(updateColorsFromHarmony);
  harmony.add(params, 'spread', 0, 90).step(1).onChange(updateColorsFromHarmony);
  harmony.open();

  const palette = gui.addFolder('Color Palette');
  params.colors.forEach((color, i) => {
    palette.addColor(params.colors, i.toString()).name(`Color ${i + 1}`).onChange(val => {
      params.colors[i] = val;
      shapes[i].material.color.set(val);
      updateBackgroundGradient();
    });
  });
  palette.open();

  gui.add(params, 'whiteBackground').name('White Background').onChange(updateBackgroundGradient);
  gui.add(params, 'shadowsEnabled').name('Shadows').onChange(params.toggleShadows.bind(params));
  gui.add(params, 'regenerateColors').name('Generate Palette');
  gui.add(params, 'copyAllColors').name('Copy Palette');
};

// Animation Loop
const animate = () => {
  requestAnimationFrame(animate);
  controls.update();

  shapes.forEach(shape => {
    shape.rotation.x += 0.01;
    shape.rotation.y += 0.01;
  });

  renderer.render(scene, camera);
};

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
