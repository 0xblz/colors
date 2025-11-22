// =============================================================================
// GLOBALS & CONFIGURATION
// =============================================================================

// Three.js scene objects
let scene, camera, renderer, controls;
let shapes = [];
let directionalLight, ambientLight;

// Responsive breakpoint and constants
const MOBILE_BREAKPOINT = 768;
const SHADOW_LIGHT_INTENSITY = 0.3;
const SHADOW_AMBIENT_INTENSITY = 0.8;
const NO_SHADOW_AMBIENT_INTENSITY = 1.0;
const COPY_FEEDBACK_DURATION = 1000;

// Main application parameters
const params = {
  colors: ['#fc91e1', '#fc91ac', '#fcac91'],
  harmonyMode: 'Analogous',
  baseHue: 0,
  saturation: 70,
  brightness: 70,
  spread: 30,
  shadowsEnabled: false,
  whiteBackground: false,

  // Generate random colors within aesthetic ranges
  regenerateColors() {
    this.baseHue = Math.floor(Math.random() * 360);
    this.saturation = Math.floor(Math.random() * 30) + 70; // 70-100
    this.brightness = Math.floor(Math.random() * 30) + 60; // 60-90

    updateGUIValues();
    updateColorsFromHarmony();
    updatePrimaryColorPicker();
  },

  // Copy all colors to clipboard with user feedback
  copyAllColors() {
    const formatted = this.colors.join(', ');
    navigator.clipboard.writeText(formatted).then(() => {
      const btn = document.getElementById('copyBtn');
      if (btn) {
        const original = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => (btn.textContent = original), COPY_FEEDBACK_DURATION);
      }
    });
  },

  // Toggle shadow rendering for performance/aesthetic control
  toggleShadows(value) {
    if (directionalLight) {
      directionalLight.intensity = value ? SHADOW_LIGHT_INTENSITY : 0;
    }
    if (ambientLight) {
      ambientLight.intensity = value ? SHADOW_AMBIENT_INTENSITY : NO_SHADOW_AMBIENT_INTENSITY;
    }
  }
};

// =============================================================================
// RESPONSIVE UTILITIES
// =============================================================================

// Get responsive values based on screen size
const getResponsiveValues = () => {
  const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  return {
    sphereRadius: isMobile ? 1.1 : 1.2,
    spacing: isMobile ? 2.5 : 3,
    cameraZ: isMobile ? 6 : 10
  };
};

// Update background color and GUI theme color
const updateBackgroundGradient = () => {
  const container = document.querySelector('.colors-container');
  if (!container) return;

  container.style.background = params.whiteBackground ? '#fff' : '#000';
  
  // Update GUI scrollbar color to match first color
  const gui = document.querySelector('.custom-gui');
  if (gui && params.colors[0]) {
    gui.style.setProperty('--primary-color', params.colors[0]);
  }
};

// =============================================================================
// THREE.JS SCENE INITIALIZATION
// =============================================================================

const init = () => {
  const container = document.querySelector('.colors-container');
  if (!container) return console.error('Missing .colors-container');

  // Initialize params from starting color
  const startColor = new THREE.Color(params.colors[0]);
  const hsl = {};
  startColor.getHSL(hsl);
  Object.assign(params, {
    baseHue: Math.round(hsl.h * 360),
    saturation: Math.round(hsl.s * 100),
    brightness: Math.round(hsl.l * 100)
  });

  // Scene setup
  scene = new THREE.Scene();

  // Camera setup with responsive positioning
  const { cameraZ } = getResponsiveValues();
  camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(cameraZ * 0.9, cameraZ * 0.15, cameraZ * 0.5);
  camera.lookAt(0, 0, 0);

  // Renderer setup with shadows
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Lighting setup
  setupLighting();

  // Orbit controls setup
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

  // Initialize UI and shapes
  updateBackgroundGradient();
  createShapes();
  setupGUI();

  // Handle window resize
  window.addEventListener('resize', () => {
    handleResize();
    updateShapesForScreenSize();
  });

  animate();
};

// Setup scene lighting (ambient + directional for shadows)
const setupLighting = () => {
  ambientLight = new THREE.AmbientLight(
    0xffffff, 
    params.shadowsEnabled ? SHADOW_AMBIENT_INTENSITY : NO_SHADOW_AMBIENT_INTENSITY
  );
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(
    0xffffff, 
    params.shadowsEnabled ? SHADOW_LIGHT_INTENSITY : 0
  );
  directionalLight.position.set(5, 10, 7.5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  scene.add(directionalLight);
};

// Handle viewport resize
const handleResize = () => {
  const container = document.querySelector('.colors-container');
  if (!container) return;
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
};

// =============================================================================
// SHAPE MANAGEMENT
// =============================================================================

// Clean up existing shapes
const disposeShapes = () => {
  shapes.forEach(shape => {
    shape.geometry.dispose();
    shape.material.dispose();
    scene.remove(shape);
  });
  shapes = [];
};

// Create sphere geometry based on current screen size
const createSphereGeometry = () => {
  const { sphereRadius } = getResponsiveValues();
  return new THREE.SphereGeometry(sphereRadius, 64, 64);
};

// Calculate horizontal position for a shape in the lineup
const calculateShapePosition = (index, spacing) => {
  const totalWidth = (params.colors.length - 1) * spacing;
  return index * spacing - totalWidth / 2;
};

// Create all color spheres in the scene
const createShapes = () => {
  disposeShapes();

  const { spacing } = getResponsiveValues();
  const geometry = createSphereGeometry();

  params.colors.forEach((color, i) => {
    const material = new THREE.MeshStandardMaterial({ 
      color,
      roughness: 0.5,
      metalness: 0.1
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.x = calculateShapePosition(i, spacing);
    sphere.castShadow = true;
    sphere.receiveShadow = true;

    scene.add(sphere);
    shapes.push(sphere);
  });
};

// Update shapes when screen size changes
const updateShapesForScreenSize = () => {
  const { spacing, cameraZ } = getResponsiveValues();
  const geometry = createSphereGeometry();

  shapes.forEach((shape, i) => {
    shape.geometry.dispose();
    shape.geometry = geometry;
    shape.position.x = calculateShapePosition(i, spacing);
  });

  // Update camera position for new screen size
  camera.position.set(cameraZ * 0.9, cameraZ * 0.15, cameraZ * 0.5);
};

// =============================================================================
// COLOR HARMONY GENERATION
// =============================================================================

// Generate colors based on selected harmony mode
const updateColorsFromHarmony = () => {
  // Normalize values to 0-1 range for Three.js
  const h = params.baseHue / 360;
  const s = params.saturation / 100;
  const l = params.brightness / 100;
  const spread = params.spread / 360;

  let newColors = [];

  switch (params.harmonyMode) {
    case 'Analogous':
      // Colors adjacent on the color wheel
      newColors = [
        new THREE.Color().setHSL((h - spread + 1) % 1, s, l),
        new THREE.Color().setHSL(h, s, l),
        new THREE.Color().setHSL((h + spread) % 1, s, l)
      ];
      break;

    case 'Complementary':
      // Base color + its opposite on the color wheel
      const comp = (h + 0.5) % 1;
      newColors = [
        new THREE.Color().setHSL(h, s, l),
        new THREE.Color().setHSL(h, s * 0.8, l * 1.1), // Lighter variation
        new THREE.Color().setHSL(comp, s, l)
      ];
      break;

    case 'Triadic':
      // Three colors evenly spaced around the color wheel
      newColors = [
        new THREE.Color().setHSL(h, s, l),
        new THREE.Color().setHSL((h + 0.333) % 1, s, l),
        new THREE.Color().setHSL((h + 0.667) % 1, s, l)
      ];
      break;
  }

  // Convert to hex and update shapes
  params.colors = newColors.map(c => `#${c.getHexString()}`);
  shapes.forEach((shape, i) => shape.material.color.set(params.colors[i]));
  updateBackgroundGradient();
  updateGUIColors();
  updatePrimaryColorPicker();
};

// Update color picker displays in GUI
const updateGUIColors = () => {
  params.colors.forEach((color, i) => {
    const colorInput = document.getElementById(`color${i}`);
    if (colorInput) colorInput.value = color;
  });
};

// Update primary color picker and hex input
const updatePrimaryColorPicker = () => {
  const picker = document.getElementById('primaryColorPicker');
  const hexInput = document.getElementById('hexInput');
  
  if (picker) picker.value = params.colors[0];
  if (hexInput) hexInput.value = params.colors[0].toUpperCase();
};

// Update all GUI slider values
const updateGUIValues = () => {
  const controls = [
    { id: 'baseHue', value: params.baseHue },
    { id: 'saturation', value: params.saturation },
    { id: 'brightness', value: params.brightness },
    { id: 'spread', value: params.spread }
  ];

  controls.forEach(({ id, value }) => {
    const input = document.getElementById(id);
    const display = document.getElementById(`${id}Value`);
    if (input) input.value = value;
    if (display) display.textContent = value;
  });
};

// Show/hide spread control based on harmony mode (only used in Analogous)
const updateSpreadVisibility = () => {
  const spreadControl = document.getElementById('spread')?.closest('.gui-control');
  if (spreadControl) {
    // Spread only applies to Analogous mode
    spreadControl.style.display = params.harmonyMode === 'Analogous' ? '' : 'none';
  }
};

// =============================================================================
// GUI SETUP
// =============================================================================

// Helper to setup a range slider with live value display
const setupRangeSlider = (id, paramKey, callback) => {
  const input = document.getElementById(id);
  const display = document.getElementById(`${id}Value`);
  
  if (input && display) {
    input.value = params[paramKey];
    display.textContent = params[paramKey];
    
    input.addEventListener('input', (e) => {
      params[paramKey] = parseInt(e.target.value);
      display.textContent = params[paramKey];
      callback();
    });
  }
};

// Helper to setup a checkbox
const setupCheckbox = (id, paramKey, callback) => {
  const checkbox = document.getElementById(id);
  if (checkbox) {
    checkbox.checked = params[paramKey];
    checkbox.addEventListener('change', (e) => {
      params[paramKey] = e.target.checked;
      callback(e.target.checked);
    });
  }
};

// Helper to setup a button
const setupButton = (id, callback) => {
  const button = document.getElementById(id);
  if (button) {
    button.addEventListener('click', callback);
  }
};

// Setup harmony mode dropdown
const setupHarmonyDropdown = () => {
  const harmonyMode = document.getElementById('harmonyMode');
  if (!harmonyMode) return;

  const modes = ['Analogous', 'Complementary', 'Triadic'];
  modes.forEach(mode => {
    const option = document.createElement('option');
    option.value = mode;
    option.textContent = mode;
    option.selected = mode === params.harmonyMode;
    harmonyMode.appendChild(option);
  });

  harmonyMode.addEventListener('change', (e) => {
    params.harmonyMode = e.target.value;
    updateSpreadVisibility();
    updateColorsFromHarmony();
  });
};

// Setup primary color picker
const setupPrimaryColorPicker = () => {
  const picker = document.getElementById('primaryColorPicker');
  if (!picker) return;

  // Initialize with first color
  picker.value = params.colors[0];

  picker.addEventListener('input', (e) => {
    updateFromPrimaryColor(e.target.value);
  });
};

// Setup hex input field
const setupHexInput = () => {
  const hexInput = document.getElementById('hexInput');
  if (!hexInput) return;

  // Initialize with first color
  hexInput.value = params.colors[0].toUpperCase();

  // Update as user types
  hexInput.addEventListener('input', (e) => {
    let value = e.target.value.trim();
    
    // Auto-add # if missing
    if (value && !value.startsWith('#')) {
      value = '#' + value;
      hexInput.value = value;
    }
    
    // Validate and update if valid hex
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      updateFromPrimaryColor(value);
    }
  });

  // Format on blur
  hexInput.addEventListener('blur', (e) => {
    let value = e.target.value.trim();
    if (!value.startsWith('#')) {
      value = '#' + value;
    }
    // Ensure uppercase
    hexInput.value = value.toUpperCase();
  });
};

// Update harmony colors from a primary color change
const updateFromPrimaryColor = (colorValue) => {
  // Convert picked color to HSL
  const color = new THREE.Color(colorValue);
  const hsl = {};
  color.getHSL(hsl);

  // Update params
  params.baseHue = Math.round(hsl.h * 360);
  params.saturation = Math.round(hsl.s * 100);
  params.brightness = Math.round(hsl.l * 100);

  // Update GUI and regenerate harmony
  updateGUIValues();
  updateColorsFromHarmony();
};

// Setup color pickers with click-to-copy functionality
const setupColorDisplays = () => {
  params.colors.forEach((color, i) => {
    const colorInput = document.getElementById(`color${i}`);
    if (colorInput) {
      colorInput.value = color;
      
      // Prevent the color picker from opening
      colorInput.addEventListener('click', (e) => {
        e.preventDefault();
        copyColorToClipboard(i);
      });
      
      // Also prevent mousedown to be extra safe
      colorInput.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });
    }
  });
};

// Copy individual color to clipboard with checkmark feedback
const copyColorToClipboard = (colorIndex) => {
  const color = params.colors[colorIndex];
  const colorInput = document.getElementById(`color${colorIndex}`);
  
  if (!colorInput) return;
  
  // Copy to clipboard
  navigator.clipboard.writeText(color).then(() => {
    // Get the checkmark element
    const wrapper = colorInput.closest('.gui-color-wrapper');
    const checkmark = wrapper?.querySelector('.gui-color-checkmark');
    
    if (checkmark) {
      // Show checkmark
      checkmark.classList.add('show');
      
      // Hide after 2 seconds
      setTimeout(() => {
        checkmark.classList.remove('show');
      }, 2000);
    }
  }).catch(err => {
    console.error('Failed to copy color:', err);
  });
};

// Initialize all GUI controls
const setupGUI = () => {
  // Primary color controls
  setupPrimaryColorPicker();
  setupHexInput();

  // Dropdown
  setupHarmonyDropdown();

  // Range sliders
  setupRangeSlider('baseHue', 'baseHue', updateColorsFromHarmony);
  setupRangeSlider('saturation', 'saturation', updateColorsFromHarmony);
  setupRangeSlider('brightness', 'brightness', updateColorsFromHarmony);
  setupRangeSlider('spread', 'spread', updateColorsFromHarmony);

  // Color displays
  setupColorDisplays();

  // Checkboxes
  setupCheckbox('whiteBackground', 'whiteBackground', updateBackgroundGradient);
  setupCheckbox('shadowsEnabled', 'shadowsEnabled', (checked) => params.toggleShadows(checked));

  // Buttons
  setupButton('generateBtn', () => params.regenerateColors());
  setupButton('copyBtn', () => params.copyAllColors());

  // Set initial visibility of conditional controls
  updateSpreadVisibility();
};

// =============================================================================
// ANIMATION LOOP
// =============================================================================

// Main animation loop - runs at ~60fps
const animate = () => {
  requestAnimationFrame(animate);
  
  // Update orbital controls with damping
  controls.update();

  // Render the scene
  renderer.render(scene, camera);
};

// =============================================================================
// APPLICATION STARTUP
// =============================================================================

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
