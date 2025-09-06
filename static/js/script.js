document.addEventListener('DOMContentLoaded', () => {
    // --- Global State & Variables ---
    const allTestData = {
        hyperactivityScore: 0,
        reactionTimes: [],
        avgReactionTime: 0,
        attentionHits: 0,
        attentionMisses: 0,
        attentionFalseClicks: 0,
        memoryScore: 0
    };

    let currentStep = 0;
    const wizardSteps = document.querySelectorAll('.wizard-step');
    const progressBar = document.querySelector('.progress-bar');

    // --- Wizard Navigation ---
    const navigateToStep = (stepIndex) => {
        if (wizardSteps[currentStep]) {
            wizardSteps[currentStep].classList.remove('active');
        }
        if (wizardSteps[stepIndex]) {
            wizardSteps[stepIndex].classList.add('active');
            currentStep = stepIndex;
            updateProgressBar();
        }
    };

    const updateProgressBar = () => {
        const progress = (currentStep / (wizardSteps.length - 1)) * 100;
        progressBar.style.width = `${progress}%`;
    };

    document.querySelectorAll('.next-btn').forEach(button => {
        button.addEventListener('click', () => {
            if (currentStep < wizardSteps.length - 1) {
                navigateToStep(currentStep + 1);
            }
        });
    });

    // --- Test 1: Hyperactivity Questionnaire ---
    const hyperactivityContent = document.getElementById('hyperactivity-content');
    const hyperactivityNextBtn = document.querySelector('#step-1 .next-btn');
    const questions = [
        "How often do you have trouble wrapping up the final details of a project, once the challenging parts have been done?",
        "How often do you have difficulty getting things in order when you have to do a task that requires organization?",
        "How often do you have problems remembering appointments or obligations?",
        "When you have a task that requires a lot of thought, how often do you avoid or delay getting started?",
        "How often do you fidget or squirm with your hands or feet when you have to sit down for a long time?",
        "How often do you feel overly active and compelled to do things, like you were driven by a motor?"
    ];

    questions.forEach((q, index) => {
        const questionItem = document.createElement('div');
        questionItem.className = 'question-item';
        questionItem.innerHTML = `
            <label>${index + 1}. ${q}</label>
            <div class="options" data-question-index="${index}">
                <label><input type="radio" name="q${index}" value="0"><span>Never</span></label>
                <label><input type="radio" name="q${index}" value="1"><span>Rarely</span></label>
                <label><input type="radio" name="q${index}" value="2"><span>Sometimes</span></label>
                <label><input type="radio" name="q${index}" value="3"><span>Often</span></label>
                <label><input type="radio" name="q${index}" value="4"><span>Very Often</span></label>
            </div>
        `;
        hyperactivityContent.appendChild(questionItem);
    });

    hyperactivityContent.addEventListener('change', (e) => {
        if (e.target.type === 'radio') {
            const answeredRadios = hyperactivityContent.querySelectorAll('input[type="radio"]:checked');
            if (answeredRadios.length === questions.length) {
                let totalScore = 0;
                answeredRadios.forEach(radio => totalScore += parseInt(radio.value));
                allTestData.hyperactivityScore = totalScore;
                hyperactivityNextBtn.disabled = false;
            }
        }
    });

    // --- Test 2: Reaction Time ---
    const reactionBox = document.getElementById('reaction-box');
    const reactionAvgEl = document.getElementById('reaction-avg');
    const reactionNextBtn = document.querySelector('#step-2 .next-btn');
    let reactionStartTime, reactionRounds = 0;
    const MAX_ROUNDS = 5;

    reactionBox.addEventListener('click', () => {
        if (reactionRounds >= MAX_ROUNDS) return;

        if (reactionBox.style.backgroundColor === 'rgb(46, 204, 113)') { // Green
            const endTime = new Date().getTime();
            const timeTaken = endTime - reactionStartTime;
            allTestData.reactionTimes.push(timeTaken);
            reactionRounds++;
            reactionBox.innerText = `Time: ${timeTaken}ms\nRound: ${reactionRounds}/${MAX_ROUNDS}`;
            reactionBox.style.backgroundColor = '#ef4444'; // Back to Red

            if (reactionRounds < MAX_ROUNDS) {
                setTimeout(startReactionTest, 1000 + Math.random() * 2000);
            } else {
                const sum = allTestData.reactionTimes.reduce((a, b) => a + b, 0);
                allTestData.avgReactionTime = sum / allTestData.reactionTimes.length;
                reactionAvgEl.textContent = allTestData.avgReactionTime.toFixed(0);
                reactionBox.innerText = 'Done!';
                reactionNextBtn.disabled = false;
            }
        } else if (reactionBox.innerText.includes('Click me to start')) {
            reactionBox.innerText = '...Wait for green';
            setTimeout(startReactionTest, 1000 + Math.random() * 2000);
        }
    });

    function startReactionTest() {
        reactionBox.style.backgroundColor = '#2ecc71'; // Green
        reactionStartTime = new Date().getTime();
    }

    // --- Test 3: Attention Span (Go/No-Go) ---
    const startAttentionBtn = document.getElementById('start-attention');
    const attentionStimulus = document.getElementById('attention-stimulus');
    const attentionNextBtn = document.querySelector('#step-3 .next-btn');
    const HITS_EL = document.getElementById('attention-hits');
    const MISSES_EL = document.getElementById('attention-misses');
    const FALSE_CLICKS_EL = document.getElementById('attention-false-clicks');
    let attentionTimeout, currentStimulusIsTarget = false, spacebarPressed = false;
    const ATTENTION_TEST_DURATION = 30000;

    startAttentionBtn.addEventListener('click', () => {
        startAttentionBtn.disabled = true;
        allTestData.attentionHits = 0; HITS_EL.textContent = 0;
        allTestData.attentionMisses = 0; MISSES_EL.textContent = 0;
        allTestData.attentionFalseClicks = 0; FALSE_CLICKS_EL.textContent = 0;
        currentStimulusIsTarget = false;

        const testInterval = setInterval(showStimulus, 1500);

        setTimeout(() => {
            clearInterval(testInterval);
            clearTimeout(attentionTimeout);
            if (currentStimulusIsTarget && !spacebarPressed) {
                allTestData.attentionMisses++;
                MISSES_EL.textContent = allTestData.attentionMisses;
            }
            attentionStimulus.style.opacity = '0';
            attentionNextBtn.disabled = false;
            document.removeEventListener('keydown', handleAttentionKeyPress);
        }, ATTENTION_TEST_DURATION);

        document.addEventListener('keydown', handleAttentionKeyPress);
    });

    const handleAttentionKeyPress = (e) => {
        if (e.code === 'Space' && !spacebarPressed) {
            spacebarPressed = true;
            if (currentStimulusIsTarget) {
                allTestData.attentionHits++;
            } else {
                allTestData.attentionFalseClicks++;
            }
            HITS_EL.textContent = allTestData.attentionHits;
            FALSE_CLICKS_EL.textContent = allTestData.attentionFalseClicks;
        }
    };

    function showStimulus() {
        if (currentStimulusIsTarget && !spacebarPressed) {
            allTestData.attentionMisses++;
            MISSES_EL.textContent = allTestData.attentionMisses;
        }
        spacebarPressed = false;
        if (Math.random() > 0.3) {
            currentStimulusIsTarget = true;
            attentionStimulus.style.backgroundColor = '#2ecc71';
            attentionStimulus.style.borderRadius = '50%';
        } else {
            currentStimulusIsTarget = false;
            attentionStimulus.style.backgroundColor = '#ef4444';
            attentionStimulus.style.borderRadius = '0';
        }
        attentionStimulus.style.opacity = '1';
        attentionTimeout = setTimeout(() => {
            attentionStimulus.style.opacity = '0';
        }, 1300);
    }

    // --- Test 4: Visual Memory ---
    const startMemoryBtn = document.getElementById('start-memory');
    const memoryGrid = document.getElementById('memory-grid');
    const memoryLevelEl = document.getElementById('memory-level');
    const memoryResultsBtn = document.getElementById('get-results-btn');
    let memorySequence = [], playerSequence = [], memoryLevel = 0, isPlayerTurn = false;

    for (let i = 0; i < 9; i++) {
        const tile = document.createElement('div');
        tile.className = 'memory-tile';
        tile.dataset.index = i;
        tile.addEventListener('click', () => handleTileClick(i));
        memoryGrid.appendChild(tile);
    }
    const memoryTiles = document.querySelectorAll('.memory-tile');

    startMemoryBtn.addEventListener('click', () => {
        startMemoryBtn.style.display = 'none';
        memoryLevel = 1;
        memorySequence = [];
        nextMemoryLevel();
    });

    function nextMemoryLevel() {
        isPlayerTurn = false;
        playerSequence = [];
        memoryLevelEl.textContent = memoryLevel;
        memorySequence.push(Math.floor(Math.random() * 9));
        showSequence();
    }

    async function showSequence() {
        for (const index of memorySequence) {
            await new Promise(resolve => setTimeout(resolve, 300));
            memoryTiles[index].classList.add('active');
            await new Promise(resolve => setTimeout(resolve, 600));
            memoryTiles[index].classList.remove('active');
        }
        isPlayerTurn = true;
    }

    function handleTileClick(index) {
        if (!isPlayerTurn) return;
        playerSequence.push(index);
        const lastIndex = playerSequence.length - 1;
        if (playerSequence[lastIndex] !== memorySequence[lastIndex]) {
            isPlayerTurn = false;
            memoryTiles[index].classList.add('player-wrong');
            allTestData.memoryScore = memoryLevel - 1;
            memoryLevelEl.textContent = `${allTestData.memoryScore} (Game Over)`;
            memoryResultsBtn.disabled = false;
            return;
        }
        memoryTiles[index].classList.add('player-correct');
        setTimeout(() => memoryTiles[index].classList.remove('player-correct'), 200);
        if (playerSequence.length === memorySequence.length) {
            memoryLevel++;
            setTimeout(nextMemoryLevel, 1000);
        }
    }

    // --- Final Step: Get Results from Backend ---
    memoryResultsBtn.addEventListener('click', async () => {
        navigateToStep(wizardSteps.length - 1);
        const loader = document.getElementById('loader');
        const resultsOutput = document.getElementById('results-output');
        loader.style.display = 'block';
        resultsOutput.style.display = 'none';

        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(allTestData)
            });
            if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
            const result = await response.json();
            
            // --- THIS IS THE KEY CHANGE ---
            // Use marked.parse() to convert Markdown to HTML
            resultsOutput.innerHTML = marked.parse(result.analysis);

        } catch (error) {
            console.error("Error fetching analysis:", error);
            resultsOutput.innerHTML = "Sorry, there was an error getting your analysis. Please try again later.";
        } finally {
            loader.style.display = 'none';
            resultsOutput.style.display = 'block';
        }
    });

    navigateToStep(0);
});