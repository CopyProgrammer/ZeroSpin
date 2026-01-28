// Core DOM Elements
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const wheelAssembly = document.getElementById('wheelAssembly');
const spinBtn = document.getElementById('spinBtn');

// Admin & UI Elements
const adminToggle = document.getElementById('adminToggle');
const adminPanel = document.getElementById('adminPanel');
const closeAdmin = document.getElementById('closeAdmin');
const prizeList = document.getElementById('prizeList');
const newPrizeInput = document.getElementById('newPrize');
const addPrizeBtn = document.getElementById('addPrize');

// Result Modal
const resultModal = document.getElementById('resultModal');
const resultText = document.getElementById('resultText');
const claimBtn = document.getElementById('claimBtn');

// State
let prizes = [];
let currentRotation = 0; // Degrees
let isSpinning = false;
let isDragging = false;
let velocity = 0;
let lastFrameTime = 0;
let friction = 0.99; // Air resistance for physics spin
let spinSound, winSound;

// Asset Palette (Deep Greens & Darks)
const colors = [
    '#0f3d2e', // Deepest Green
    '#1a1e1c', // Dark Grey/Black
    '#145a3a', // Primary Green
    '#252525', // Lighter Grey
    '#1f7a50', // Brighter Green
    '#111111'  // Near Black
];

// --- Audio System ---
function initSounds() {
    spinSound = new Audio('assets/sounds/spin.mp3');
    winSound = new Audio('assets/sounds/win.mp3');
    spinSound.loop = true;
    spinSound.volume = 0.5;

    // Error handling if files missing (Graceful degradation)
    spinSound.onerror = () => { spinSound = null; };
    winSound.onerror = () => { winSound = null; };
}

// --- Data Management ---
function loadPrizes() {
    const stored = localStorage.getItem('zeroday_prizes');
    if (stored) {
        prizes = JSON.parse(stored);
    } else {
        prizes = [
            'STICKER PACK',
            'COURSE GUIDE',
            'T-SHIRT',
            'USB KEY',
            'HACKME VOUCHER',
            'CTF PASS',
            'LANYARD',
            'RETRY'
        ];
        savePrizes();
    }
}

function savePrizes() {
    localStorage.setItem('zeroday_prizes', JSON.stringify(prizes));
}

// --- Rendering ---
function drawWheel() {
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const numPrizes = prizes.length;
    const arc = (Math.PI * 2) / numPrizes;

    // Clear
    ctx.clearRect(0, 0, width, height);

    prizes.forEach((prize, i) => {
        const angle = i * arc;

        // Slice
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angle, angle + arc);
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        ctx.strokeStyle = '#050807'; // Match bg for seamless look
        ctx.lineWidth = 4;
        ctx.stroke();

        // Text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle + arc / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#e0e0e0';
        ctx.font = 'bold 32px "Segoe UI", sans-serif';
        // Move text out to edge
        ctx.fillText(prize, radius - 40, 10);
        ctx.restore();
    });
}

// --- Physics Engine ---
function updateLoop(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    if (isSpinning || Math.abs(velocity) > 0.01) {
        // Apply velocity
        currentRotation += velocity * (deltaTime / 16); // Scale by approx 60fps

        // Apply friction
        velocity *= friction;

        // Visual update
        wheelAssembly.style.transform = `rotateZ(${currentRotation}deg)`;

        // Stop condition
        if (isSpinning && Math.abs(velocity) < 0.1) {
            finishSpin();
        }
    }

    if (!isDragging) {
        requestAnimationFrame(updateLoop);
    }
}

function startSpin() {
    if (isSpinning) return;

    isSpinning = true;
    spinBtn.disabled = true;
    wheelAssembly.style.cursor = 'grabbing';

    // Initial impulse
    // Random velocity between 20 and 40
    velocity = 30 + Math.random() * 20;

    if (spinSound) {
        spinSound.currentTime = 0;
        spinSound.play().catch(() => { });
    }
}

function finishSpin() {
    isSpinning = false;
    spinBtn.disabled = false;
    wheelAssembly.style.cursor = 'grab';
    velocity = 0;

    if (spinSound) {
        spinSound.pause();
    }

    // Calculate Winner
    // Normalise rotation to 0-360
    const degrees = currentRotation % 360;
    // CSS rotates clockwise. 0 degrees is at 3 o'clock usually in Canvas, 
    // BUT our drawing loop starts at 0 (3 o'clock).
    // The pointer is at 12 o'clock (270 degrees or -90 degrees).
    // Let's deduce the math:
    // If wheel rotates +90 deg, the segment at 0 moves to 90 (6 o'clock).
    // Pointer is fixed at top (270/-90).
    // We need to find which segment is under the pointer.
    // effective angle = (pointerPos - currentRotation) % 360

    // Simplified: logical angle under pointer
    // If wheel rotates N degrees, the angle under the pointer (which is static at -90deg/270deg)
    // is (270 - N) normalized.

    const numPrizes = prizes.length;
    const arcDeg = 360 / numPrizes;

    // Pointer is at 270 degrees (Top) relative to standard unit circle of Canvas (0 at Right)
    // wait, in CSS rotateZ(0) matches Canvas 0? No, let's normalize.
    // CSS Rotate(0) -> Canvas drawn as is. Item 0 is at [0, arc]. Center of Item 0 is at arc/2.
    // Canvas 0 is 3 o'clock.
    // Pointer is at 12 o'clock. = 270 degrees.
    // So if Rotation is 0, Pointer is over the segment at 270 deg.

    let pointerAngle = (270 - (degrees % 360) + 360) % 360;

    // Index = floor(angle / arc)
    const index = Math.floor(pointerAngle / arcDeg);
    const winner = prizes[index];

    // Show Result
    resultText.textContent = winner;
    resultModal.classList.remove('hidden');

    if (winSound) {
        winSound.play().catch(() => { });
    }
}

// --- Drag Interaction ---
let startY = 0;
let lastY = 0;
let lastTimestamp = 0;

function handleDragStart(e) {
    if (isSpinning) return;
    isDragging = true;
    const point = e.touches ? e.touches[0] : e;
    startY = point.clientY;
    lastY = startY;
    lastTimestamp = Date.now();
    velocity = 0;
    wheelAssembly.style.transition = 'none';
}

function handleDragMove(e) {
    if (!isDragging) return;
    const point = e.touches ? e.touches[0] : e;
    const deltaY = point.clientY - lastY;
    const now = Date.now();

    // Simple vertical drag mapping to rotation
    // Drag down (positive delta) -> Rotate? 
    // Let's say drag down on right side = CW. Drag down on left = CCW.
    // Too complex? Let's just do: Vertical swipe spins it.
    // Simpler: Just map dy to rotation directly for responsiveness.

    currentRotation += deltaY * 0.5;
    wheelAssembly.style.transform = `rotateZ(${currentRotation}deg)`;

    // Calculate instantaneous velocity for release
    const dt = now - lastTimestamp;
    if (dt > 0) {
        velocity = (deltaY * 0.5) / (dt / 16); // degrees per frame approx
    }

    lastY = point.clientY;
    lastTimestamp = now;
}

function handleDragEnd() {
    if (!isDragging) return;
    isDragging = false;

    // Resume physics loop with captured velocity
    // Cap velocity to avoid craziness
    if (Math.abs(velocity) > 50) velocity = 50 * Math.sign(velocity);

    // If velocity is high enough, treat as a spin
    if (Math.abs(velocity) > 2) {
        isSpinning = true;
        spinBtn.disabled = true;
        if (spinSound) spinSound.play().catch(() => { });
        requestAnimationFrame(updateLoop); // Ensure loop is running
    } else {
        // Friction will just stop it slowly if low velocity
        requestAnimationFrame(updateLoop);
    }
}

// --- Admin Logic ---
function renderPrizeList() {
    prizeList.innerHTML = '';
    prizes.forEach((prize, idx) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${prize}</span>
            <button class="delete-btn" data-index="${idx}">RECYCLE</button>
        `;
        prizeList.appendChild(li);
    });

    // Bind deletes
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = (e) => {
            const idx = parseInt(e.target.dataset.index);
            if (prizes.length > 2) {
                prizes.splice(idx, 1);
                savePrizes();
                renderPrizeList();
                drawWheel();
            } else {
                alert('INTEGRITY ERROR: Minimum 2 Sectors Required');
            }
        };
    });
}

// --- Event Listeners ---
spinBtn.addEventListener('click', startSpin);

// Drag/Swipe
wheelAssembly.addEventListener('mousedown', handleDragStart);
document.addEventListener('mousemove', handleDragMove);
document.addEventListener('mouseup', handleDragEnd);

wheelAssembly.addEventListener('touchstart', handleDragStart, { passive: false });
document.addEventListener('touchmove', handleDragMove, { passive: false });
document.addEventListener('touchend', handleDragEnd);

// Admin
adminToggle.addEventListener('click', () => {
    adminPanel.classList.remove('hidden');
    renderPrizeList();
});
closeAdmin.addEventListener('click', () => {
    adminPanel.classList.add('hidden');
});

addPrizeBtn.addEventListener('click', () => {
    const val = newPrizeInput.value.trim().toUpperCase();
    if (val && prizes.length < 20) {
        prizes.push(val);
        savePrizes();
        renderPrizeList();
        drawWheel();
        newPrizeInput.value = '';
    }
});

// Modal
claimBtn.addEventListener('click', () => {
    resultModal.classList.add('hidden');
    if (winSound) {
        winSound.pause();
        winSound.currentTime = 0;
    }
});

// Init
initSounds();
loadPrizes();
drawWheel();
requestAnimationFrame(updateLoop);

