const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const wheelAssembly = document.getElementById('wheelAssembly');
const spinBtn = document.getElementById('spinBtn');
const resultModal = document.getElementById('resultModal');
const resultText = document.getElementById('resultText');

let prizes = ['STICKER PACK', 'USB KEY', 'T-SHIRT', 'HACKME VOUCHER', 'CTF PASS', 'RETRY'];
let currentRotation = 0;
let isSpinning = false;

// --- AUDIO SYSTEM (Procedural Sounds) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playClick() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function playWinSound() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

// --- WHEEL DRAWING ---
function drawWheel() {
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;
    const arc = (2 * Math.PI) / prizes.length;
    const colors = ["#0f3d2e", "#1a1e1c", "#145a3a", "#252525", "#1f7a50", "#111111"];

    ctx.clearRect(0, 0, size, size);
    prizes.forEach((prize, i) => {
        const angle = i * arc;
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, angle, angle + arc);
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        ctx.strokeStyle = "#050807";
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(angle + arc / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 34px Segoe UI";
        ctx.fillText(prize, radius - 40, 10);
        ctx.restore();
    });
}

// --- SPIN LOGIC ---
function initiateSpin() {
    if (isSpinning) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    isSpinning = true;
    spinBtn.disabled = true;

    const extraSpins = 7 + Math.random() * 5; 
    const randomStop = Math.random() * 360;
    const totalRotation = (extraSpins * 360) + randomStop;
    
    currentRotation += totalRotation;
    wheelAssembly.style.transform = `rotate(${currentRotation}deg)`;

    // Click sound effect during rotation
    let clickCount = 0;
    const totalClicks = 40;
    const interval = setInterval(() => {
        if (clickCount >= totalClicks) clearInterval(interval);
        playClick();
        clickCount++;
    }, 100);

    setTimeout(() => {
        isSpinning = false;
        spinBtn.disabled = false;
        calculateWinner();
    }, 5000);
}

function calculateWinner() {
    // Math to find the prize at the top (270 degrees)
    const actualRotation = currentRotation % 360;
    const arcSize = 360 / prizes.length;
    // Offset calculation for pointer at 12 o'clock
    const index = Math.floor(((360 - actualRotation % 360) + 270) % 360 / arcSize);
    
    resultText.textContent = prizes[index];
    resultModal.classList.remove('hidden');
    playWinSound();
}

// --- SETTINGS ---
const optionList = document.getElementById('optionList');
function updateSettingsList() {
    optionList.innerHTML = '';
    prizes.forEach((p, idx) => {
        const item = document.createElement('div');
        item.className = 'option-item';
        item.innerHTML = `<span>${p}</span><button onclick="removePrize(${idx})" style="color:red; background:none; border:none; cursor:pointer">X</button>`;
        optionList.appendChild(item);
    });
}

window.removePrize = (idx) => {
    prizes.splice(idx, 1);
    updateSettingsList();
    drawWheel();
};

document.getElementById('addBtn').onclick = () => {
    const input = document.getElementById('itemInput');
    if(input.value) {
        prizes.push(input.value.toUpperCase());
        input.value = '';
        updateSettingsList();
        drawWheel();
    }
};

// --- CONTROLS ---
spinBtn.onclick = initiateSpin;
document.getElementById('settingsBtn').onclick = () => {
    updateSettingsList();
    document.getElementById('settingsModal').classList.remove('hidden');
};
document.getElementById('closeModal').onclick = () => document.getElementById('settingsModal').classList.add('hidden');
document.getElementById('saveCloseBtn').onclick = () => document.getElementById('settingsModal').classList.add('hidden');
document.getElementById('claimBtn').onclick = () => resultModal.classList.add('hidden');

drawWheel();
