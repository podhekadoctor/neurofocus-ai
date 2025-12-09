let currentStep = 0;
const state = {
    audioAnalysis: null,
    reactionTimes: [],
    memoryScore: 0,
    stroopScore: 0,
    timeDiff: 0,
    mediaRecorder: null,
    audioChunks: []
};

function goToStep(step) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step-${step}`).classList.add('active');
    currentStep = step;
    if (step === 6) generateFinalReport();
}

// --- PHASE 1: AUDIO ---
const recordBtn = document.getElementById('record-btn');
const wave = document.getElementById('wave');
const statusText = document.getElementById('audio-status');

recordBtn.addEventListener('click', async () => {
    if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
        state.mediaRecorder.stop();
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            state.mediaRecorder = new MediaRecorder(stream);
            state.audioChunks = [];
            state.mediaRecorder.ondataavailable = e => state.audioChunks.push(e.data);
            state.mediaRecorder.onstop = async () => {
                wave.classList.add('hidden');
                recordBtn.textContent = "Analyzing...";
                recordBtn.disabled = true;
                const blob = new Blob(state.audioChunks, { type: 'audio/wav' });
                await uploadAudio(blob);
            };
            state.mediaRecorder.start();
            recordBtn.textContent = "Stop Recording";
            recordBtn.style.background = "#ef4444";
            wave.classList.remove('hidden');
            statusText.textContent = "Recording...";
        } catch (err) { alert("Microphone needed."); }
    }
});

async function uploadAudio(blob) {
    const formData = new FormData();
    formData.append('audio_data', blob);
    try {
        const res = await fetch('/analyze_audio', { method: 'POST', body: formData });
        const data = await res.json();
        state.audioAnalysis = data.analysis;
        setTimeout(() => goToStep(2), 1000);
    } catch (e) { console.error(e); }
}

// --- PHASE 2: REACTION ---
const reactionBox = document.getElementById('reaction-area');
const reactionStartOverlay = document.getElementById('reaction-start-overlay');
let rounds = 0, maxRounds = 5, startTime, waitingForGreen = false, reactionTimer;

function initReactionTest() {
    reactionStartOverlay.style.display = 'none';
    reactionBox.classList.remove('hidden');
    startReactionRound();
}

reactionBox.addEventListener('click', () => {
    if (waitingForGreen) {
        reactionBox.innerText = "Too Early!";
        clearTimeout(reactionTimer);
        waitingForGreen = false;
        setTimeout(startReactionRound, 1000);
        return;
    }
    if (reactionBox.classList.contains('go')) {
        state.reactionTimes.push(Date.now() - startTime);
        rounds++;
        document.getElementById('reaction-counter').innerText = `Round: ${rounds}/${maxRounds}`;
        reactionBox.classList.remove('go');
        reactionBox.innerText = "Done!";
        if (rounds >= maxRounds) setTimeout(() => goToStep(3), 1000);
        else setTimeout(startReactionRound, 1000);
    }
});

function startReactionRound() {
    reactionBox.className = 'reaction-box ready';
    reactionBox.innerText = "Wait...";
    waitingForGreen = true;
    reactionTimer = setTimeout(() => {
        reactionBox.className = 'reaction-box go';
        reactionBox.innerText = "CLICK!";
        waitingForGreen = false;
        startTime = Date.now();
    }, 1500 + Math.random() * 2000);
}

// --- PHASE 3: MEMORY ---
const memoryGrid = document.getElementById('memory-grid');
let memorySequence = [], playerSequence = [], memoryLevel = 0;

for (let i = 0; i < 9; i++) {
    const tile = document.createElement('div');
    tile.className = 'memory-tile';
    tile.dataset.index = i;
    tile.addEventListener('click', () => handleMemoryClick(i));
    memoryGrid.appendChild(tile);
}

function startMemoryTest() {
    document.getElementById('memory-start-btn').style.display = 'none';
    memoryGrid.classList.remove('hidden');
    memoryLevel = 1;
    memorySequence = [];
    nextMemoryRound();
}

function nextMemoryRound() {
    playerSequence = [];
    document.getElementById('memory-level-display').innerText = `Level: ${memoryLevel}`;
    memorySequence.push(Math.floor(Math.random() * 9));
    playSequence();
}

async function playSequence() {
    memoryGrid.style.pointerEvents = 'none';
    for (const index of memorySequence) {
        await new Promise(r => setTimeout(r, 400));
        memoryGrid.children[index].classList.add('active');
        await new Promise(r => setTimeout(r, 500));
        memoryGrid.children[index].classList.remove('active');
    }
    memoryGrid.style.pointerEvents = 'auto';
}

function handleMemoryClick(index) {
    const tile = memoryGrid.children[index];
    tile.classList.add('active');
    setTimeout(() => tile.classList.remove('active'), 200);
    playerSequence.push(index);
    if (playerSequence[playerSequence.length - 1] !== memorySequence[playerSequence.length - 1]) {
        tile.classList.add('wrong');
        state.memoryScore = memoryLevel - 1;
        setTimeout(() => goToStep(4), 500);
        return;
    }
    if (playerSequence.length === memorySequence.length) {
        memoryLevel++;
        setTimeout(nextMemoryRound, 1000);
    }
}

// --- PHASE 4: STROOP ---
const colors = ['red', 'blue', 'green'];
let stroopRounds = 0, stroopCorrect = 0, currentStroopInk = '';

function startStroopTest() {
    document.getElementById('stroop-start-btn').style.display = 'none';
    document.getElementById('stroop-game').classList.remove('hidden');
    nextStroopRound();
}

function nextStroopRound() {
    if (stroopRounds >= 5) {
        state.stroopScore = (stroopCorrect / 5) * 100;
        goToStep(5);
        return;
    }
    stroopRounds++;
    document.getElementById('stroop-counter').innerText = `Round: ${stroopRounds}/5`;
    const wordText = colors[Math.floor(Math.random() * colors.length)];
    currentStroopInk = colors[Math.floor(Math.random() * colors.length)];
    const wordEl = document.getElementById('stroop-word');
    wordEl.innerText = wordText;
    wordEl.style.color = currentStroopInk;
}

function handleStroop(selectedColor) {
    if (selectedColor === currentStroopInk) stroopCorrect++;
    nextStroopRound();
}

// --- PHASE 5: TIME PERCEPTION (FIXED) ---
const timeBtn = document.getElementById('time-btn');
let timeStart;
let timeTestActive = false;

timeBtn.addEventListener('mousedown', () => {
    if (timeBtn.disabled) return;
    timeStart = Date.now();
    timeTestActive = true;
    timeBtn.innerText = "Releasing in 10s...";
    timeBtn.classList.add('btn-held');
});

timeBtn.addEventListener('mouseup', () => {
    if (!timeTestActive || timeBtn.disabled) return;
    const duration = (Date.now() - timeStart) / 1000;
    timeTestActive = false;
    timeBtn.classList.remove('btn-held');
    timeBtn.disabled = true;
    state.timeDiff = duration - 10;
    document.getElementById('time-result').innerText = `You held for: ${duration.toFixed(2)}s`;
    setTimeout(() => goToStep(6), 1500);
});

// Safety if mouse leaves button while holding
timeBtn.addEventListener('mouseleave', () => {
    if (timeTestActive) {
        timeTestActive = false;
        timeBtn.innerText = "HOLD ME (Try Again)";
        timeBtn.classList.remove('btn-held');
    }
});

// --- FINAL REPORT & CHART ---
async function generateFinalReport() {
    try {
        const res = await fetch('/final_report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state)
        });
        const data = await res.json();
        
        document.querySelector('.loader').style.display = 'none';
        document.getElementById('final-report').innerHTML = marked.parse(data.markdown_report);
        renderChart(data.scores);
        
    } catch (e) { console.error(e); }
}

function renderChart(scores) {
    const ctx = document.getElementById('resultsChart').getContext('2d');
    document.querySelector('.chart-container').style.display = 'block';

    // Normalize for Chart (Visual Only)
    // Variability: <150 is good. We inverse it.
    const focusScore = Math.max(0, 100 - (scores.variability / 2)); 
    const memoryScore = (scores.memory / 10) * 100; 
    const inhibitionScore = scores.stroop;
    // Time: 0 diff is perfect (100).
    const timeScore = Math.max(0, 100 - (Math.abs(scores.time_diff) * 10)); 

    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Focus Stability', 'Working Memory', 'Impulse Control', 'Time Perception'],
            datasets: [{
                label: 'Cognitive Profile',
                data: [focusScore, memoryScore, inhibitionScore, timeScore],
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderColor: '#6366f1',
                pointBackgroundColor: '#fff',
                pointBorderColor: '#6366f1',
                borderWidth: 2
            }]
        },
        options: {
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    pointLabels: { color: '#cbd5e1', font: { size: 12 } },
                    ticks: { display: false, max: 100 }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}