// --- Global State Variables ---
let currentTemplate = 'sphere';
let particlesInitialized = false;
let currentGesture = 'none';

// --- MediaPipe Setup ---
const video = document.getElementById('video');

const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`,
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5,
});

hands.onResults(onResults);

const cameraMP = new Camera(video, {
    onFrame: async () => {
        await hands.send({ image: video });
    },
    width: 1280,
    height: 720,
});
cameraMP.start();

// --- MediaPipe Results Handler ---
function onResults(results) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // Get the landmarks for the first detected hand
        const landmarks = results.multiHandLandmarks[0];
        
        // Use the index finger tip (landmark index 8) for tracking
        const indexFingerTip = landmarks[8]; 
        
        // x and y are normalized coordinates (0 to 1) relative to the video feed
        const normalizedX = indexFingerTip.x;
        const normalizedY = indexFingerTip.y;
        
        // Update the hand position in 3D space
        updateHandPosition(normalizedX, normalizedY);
        
        // Detect gestures based on finger positions
        detectGesture(landmarks);
    } else {
        // Reset hand position if no hand is detected
        handPosition.set(1000, 1000, 1000); // Move hand far away
        currentGesture = 'none';
    }
}

// --- Coordinate Mapping (CRITICAL PART) ---
function updateHandPosition(normalizedX, normalizedY) {
    // 1. Convert normalized (0 to 1) screen coordinates to normalized device coordinates (NDC) (-1 to 1)
    const ndcX = normalizedX * 2 - 1;
    const ndcY = -(normalizedY * 2) + 1; // Y-axis is inverted (0 is top in screen, -1 is bottom in NDC)
    
    // 2. Use a Vector3 for the mouse position at the near plane (z=0.5)
    const vector = new THREE.Vector3(ndcX, ndcY, 0.5); 
    
    // 3. Unproject the vector: transform NDC to World Space (in front of the camera)
    vector.unproject(camera);

    // 4. Calculate a position 3 units away from the camera along the unprojected vector
    const dir = vector.sub(camera.position).normalize();
    const distance = 3.0; // Place the hand model about 3 units in front of the camera
    handPosition.copy(camera.position).add(dir.multiplyScalar(distance));
}

// --- Gesture Detection Logic ---
function detectGesture(landmarks) {
    // Check if the index finger tip (8) is above the index finger base (5)
    const indexFingerIsUp = landmarks[8].y < landmarks[5].y; 
    
    // Check if the thumb tip (4) is above the wrist (0) and far from the palm
    const thumbIsUp = landmarks[4].y < landmarks[0].y * 0.9; 
    
    // Simple "V-Sign" or "Pointing" gesture (Index up, others down)
    if (indexFingerIsUp && !thumbIsUp) {
        if (currentGesture !== 'pointing') {
            console.log('Gesture Detected: POINTING (Switch Template)');
            switchTemplate(); // Trigger particle switch
        }
        currentGesture = 'pointing';
    } 
    // Simple "Fist" gesture (All tips near their bases)
    else if (!indexFingerIsUp && landmarks[12].y > landmarks[9].y) { // Mid finger tip below base
        if (currentGesture !== 'fist') {
            console.log('Gesture Detected: FIST (Change Color)');
            // A closed fist could trigger a color change in the updateParticles loop
        }
        currentGesture = 'fist';
    } else {
        currentGesture = 'open';
    }
}

function switchTemplate() {
    // Cycle through templates
    if (currentTemplate === 'sphere') {
        currentTemplate = 'heart';
        generateHeartParticles();
    } else if (currentTemplate === 'heart') {
        currentTemplate = 'flower';
        generateFlowerParticles();
    } else {
        currentTemplate = 'sphere';
        generateSphereParticles();
    }
    // Re-bind the updated positions/colors to the geometry
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particlesGeometry.attributes.position.needsUpdate = true;
    particlesGeometry.attributes.color.needsUpdate = true;
}
// Function definitions from previous response are assumed (e.g., generateSphereParticles)

// --- Heart Shape Particle Template (Cardioid Formula Example) ---
function generateHeartParticles() {
    console.log('Generating Heart Particles...');
    const scale = 1.0; 
    
    for (let i = 0; i < particleCount; i++) {
        // Random parameter 't' for the 3D heart curve/surface
        const t = Math.random() * 2 * Math.PI; 
        const u = Math.random() * 2; // Second parameter for volume

        // Parametric equations for a heart shape (based on a modified cardioid/torus)
        const x = scale * 16 * Math.pow(Math.sin(t), 3) / 18;
        const y = scale * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 18;
        const z = scale * u * (Math.cos(t * 5) * 0.1); // Add a small Z component for 3D depth

        positions[i * 3 + 0] = x;
        positions[i * 3 + 1] = y - 1.5; // Move center down
        positions[i * 3 + 2] = z;

        // Color (e.g., pink/red)
        colors[i * 3 + 0] = 1.0;
        colors[i * 3 + 1] = 0.4;
        colors[i * 3 + 2] = 0.6;
    }
}

// --- Flower Shape Particle Template (Simplified based on a rosette) ---
function generateFlowerParticles() {
    console.log('Generating Flower Particles...');
    const numPetals = 6;
    const scale = 2.0;

    for (let i = 0; i < particleCount; i++) {
        // Random polar coordinates
        const theta = Math.random() * 2 * Math.PI;
        const r_base = scale * Math.random();
        
        // Rosette formula for the radius (r = a * cos(k * theta))
        const r_petal = scale * Math.cos(numPetals * theta / 2) * 0.5 + 0.5;

        // Apply rosette radius to the base radius for a petal structure
        const r = r_base * r_petal * 0.8;

        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        const z = Math.random() * 0.5 - 0.25; // Small depth

        positions[i * 3 + 0] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        // Color (e.g., yellow/orange)
        colors[i * 3 + 0] = 1.0;
        colors[i * 3 + 1] = 0.8;
        colors[i * 3 + 2] = 0.1;
    }
}
// ... (start of main.js)
// ... (existing code for setup and init)

function updateParticles() {
    const time = Date.now() * 0.001;

    for (let i = 0; i < particleCount; i++) {
        let i3 = i * 3;
        
        // --- 1. Movement/Expansion based on time ---
        // (Keep the slight movement/drift from the original code)
        // ...

        // --- 2. Hand Interaction (Color/Size) ---
        const dx = positions[i3 + 0] - handPosition.x;
        const dy = positions[i3 + 1] - handPosition.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const proximity = Math.max(0, 1 - dist / 2.0); // 1 when close, 0 when far

        // **GESTURE-BASED CONTROL:**
        if (currentGesture === 'fist') {
            // Closed fist: Set proximity to 1 regardless of distance (full color blast)
            // or apply a global effect like a massive expansion
            particleMaterial.size = 0.5; 
            
            // Temporary, dramatic color change
            colors[i3 + 0] = 1.0; // Full Red
            colors[i3 + 1] = 0.0;
            colors[i3 + 2] = 0.0;
        } else {
            // Hand Proximity Effect (Open/Pointing)
            
            // Color change based on closeness (e.g., transition to yellow/white)
            colors[i3 + 0] = THREE.MathUtils.lerp(colors[i3 + 0], 1.0, proximity * 0.1); 
            colors[i3 + 1] = THREE.MathUtils.lerp(colors[i3 + 1], 1.0, proximity * 0.1); 
            colors[i3 + 2] = THREE.MathUtils.lerp(colors[i3 + 2], 1.0, proximity * 0.1);
            
            // Size change
            particleMaterial.size = 0.05 + proximity * 0.1;
        }

        // Apply particle updates (position/color) to the geometry
        particlesGeometry.attributes.position.needsUpdate = true;
        particlesGeometry.attributes.color.needsUpdate = true;
    }
}

// ... (rest of the code for init and animate loops)