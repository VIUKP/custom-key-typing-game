let wordList = [];
let keyMap = {};
let currentWord = "";
let currentIndex = 0;
let score = 0;
let timeLeft = 60;
let timerId = null;
let isPlaying = false;
let isStarted = false;
let currentLayoutType = 'JP'; // 'JP' or 'EN'

// Statistics
let correctKeystrokes = 0;
let totalKeystrokes = 0;

const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('score');
const wordDisplayEl = document.getElementById('word-display');
const resultOverlay = document.getElementById('result-overlay');
const finalStatsEl = document.getElementById('final-stats');
const restartBtn = document.getElementById('restart-btn');
const keyUpload = document.getElementById('key-upload');
const downloadBtn = document.getElementById('download-btn');
const resetDefaultBtn = document.getElementById('reset-default-btn');

// Layout Toggle elements
const useJpBtn = document.getElementById('use-jp-btn');
const useEnBtn = document.getElementById('use-en-btn');
const kbDisplayRows = document.querySelector('#kb-display .kb-rows');
const showSwapToggle = document.getElementById('show-swap-toggle');
const inputSwapToggle = document.getElementById('input-swap-toggle');

// Config elements
const toggleConfigBtn = document.getElementById('toggle-config-btn');
const configArea = document.getElementById('config-area');
const keyConfigTextarea = document.getElementById('key-config-textarea');
const saveConfigBtn = document.getElementById('save-config-btn');
const closeConfigBtn = document.getElementById('close-config-btn');

const JP_LAYOUT = [
    ["1","2","3","4","5","6","7","8","9","0","-","^","\\"],
    ["q","w","e","r","t","y","u","i","o","p","@","["],
    ["a","s","d","f","g","h","j","k","l",";",":","]"],
    ["z","x","c","v","b","n","m",",",".","/","\\"]
];

const EN_LAYOUT = [
    ["`","1","2","3","4","5","6","7","8","9","0","-","="],
    ["q","w","e","r","t","y","u","i","o","p","[","]","\\"],
    ["a","s","d","f","g","h","j","k","l",";","'"],
    ["z","x","c","v","b","n","m",",",".","/"]
];

const CODE_MAP = {
    "Digit1": "1", "Digit2": "2", "Digit3": "3", "Digit4": "4", "Digit5": "5",
    "Digit6": "6", "Digit7": "7", "Digit8": "8", "Digit9": "9", "Digit0": "0",
    "Minus": "-", "Equal": "=", "IntlYen": "\\", "BracketLeft": "[", "BracketRight": "]",
    "Backslash": "\\", "Semicolon": ";", "Quote": "'", "Comma": ",", "Period": ".", "Slash": "/",
    "KeyA": "a", "KeyB": "b", "KeyC": "c", "KeyD": "d", "KeyE": "e", "KeyF": "f",
    "KeyG": "g", "KeyH": "h", "KeyI": "i", "KeyJ": "j", "KeyK": "k", "KeyL": "l",
    "KeyM": "m", "KeyN": "n", "KeyO": "o", "KeyP": "p", "KeyQ": "q", "KeyR": "r",
    "KeyS": "s", "KeyT": "t", "KeyU": "u", "KeyV": "v", "KeyW": "w", "KeyX": "x",
    "KeyY": "y", "KeyZ": "z", "Backquote": "`", "IntlRo": "\\"
};

// Load Data
async function init() {
    try {
        const wordsRes = await fetch('word_list.txt');
        const wordsText = await wordsRes.text();
        wordList = wordsText.split(/\r?\n/).filter(w => w.trim() !== "");

        const savedLayout = localStorage.getItem('typingGameLayoutType');
        if (savedLayout) {
            currentLayoutType = savedLayout;
            updateLayoutToggleUI();
        }

        // Load swap toggle states
        const savedShowSwap = localStorage.getItem('typingGameShowSwap');
        if (savedShowSwap !== null) {
            showSwapToggle.checked = savedShowSwap === 'true';
        }
        const savedInputSwap = localStorage.getItem('typingGameInputSwap');
        if (savedInputSwap !== null) {
            inputSwapToggle.checked = savedInputSwap === 'true';
        }

        const savedMap = localStorage.getItem('typingGameKeyMap');
        if (savedMap !== null) {
            parseKeyMap(savedMap);
        } else {
            await resetToDefault();
        }

        renderKeyboard();
        nextWord();
    } catch (err) {
        console.error("Failed to load game data:", err);
        wordDisplayEl.textContent = "Error loading data.";
    }
}

async function resetToDefault() {
    try {
        const keysRes = await fetch('key_swap.txt');
        const keysText = keysRes.ok ? await keysRes.text() : "";
        parseKeyMap(keysText);
    } catch (e) {
        parseKeyMap("");
    }
}

function parseKeyMap(text) {
    keyMap = {};
    text.split(/\r?\n/).forEach(line => {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
            keyMap[parts[0]] = parts[1];
        }
    });
    localStorage.setItem('typingGameKeyMap', text);
    keyConfigTextarea.value = text;
    renderKeyboard();
}

function renderKeyboard() {
    const layout = currentLayoutType === 'JP' ? JP_LAYOUT : EN_LAYOUT;
    const isVisualSwap = showSwapToggle.checked;
    
    kbDisplayRows.innerHTML = '';
    layout.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'kb-row';
        row.forEach(physicalKey => {
            const keyDiv = document.createElement('div');
            keyDiv.className = 'key';
            const targetChar = isVisualSwap ? (keyMap[physicalKey] || physicalKey) : physicalKey;
            keyDiv.textContent = targetChar;
            keyDiv.dataset.physical = physicalKey;
            rowDiv.appendChild(keyDiv);
        });
        kbDisplayRows.appendChild(rowDiv);
    });
    highlightTargetKey();
}

function highlightTargetKey() {
    document.querySelectorAll('.key.highlight').forEach(el => el.classList.remove('highlight'));
    if (!currentWord || currentIndex >= currentWord.length) return;
    
    const targetChar = currentWord[currentIndex];
    
    document.querySelectorAll('.key').forEach(keyEl => {
        if (keyEl.textContent === targetChar) {
            keyEl.classList.add('highlight');
        }
    });
}

function updateLayoutToggleUI() {
    if (currentLayoutType === 'JP') {
        useJpBtn.classList.add('active');
        useEnBtn.classList.remove('active');
    } else {
        useEnBtn.classList.add('active');
        useJpBtn.classList.remove('active');
    }
}

function nextWord() {
    currentWord = wordList[Math.floor(Math.random() * wordList.length)];
    currentIndex = 0;
    renderWord();
    highlightTargetKey();
}

function renderWord() {
    wordDisplayEl.innerHTML = currentWord.split('').map((char, index) => {
        let className = 'char';
        if (index < currentIndex) className += ' correct';
        if (index === currentIndex) className += ' current';
        return `<span class="${className}">${char}</span>`;
    }).join('');
}

function startGame() {
    isStarted = true;
    isPlaying = true;
    timerId = setInterval(() => {
        timeLeft--;
        timerEl.textContent = timeLeft;
        if (timeLeft <= 0) endGame();
    }, 1000);
}

function endGame() {
    clearInterval(timerId);
    isPlaying = false;
    const kps = (correctKeystrokes / 60).toFixed(2);
    const accuracy = totalKeystrokes > 0 ? ((correctKeystrokes / totalKeystrokes) * 100).toFixed(1) : 0;
    resultOverlay.classList.remove('hidden');
    finalStatsEl.innerHTML = `
        <div><strong>Words:</strong> ${score}</div>
        <div><strong>Keystrokes (KPS):</strong> ${kps} keys/sec</div>
        <div><strong>Accuracy:</strong> ${accuracy}%</div>
    `;
}

function resetGame() {
    clearInterval(timerId);
    score = 0;
    timeLeft = 60;
    currentIndex = 0;
    correctKeystrokes = 0;
    totalKeystrokes = 0;
    isStarted = false;
    isPlaying = false;
    scoreEl.textContent = "Words: 0";
    timerEl.textContent = "60";
    resultOverlay.classList.add('hidden');
    nextWord();
}

function handleInput(e) {
    if (document.activeElement === keyConfigTextarea) return;
    if (e.key === 'Escape') {
        resetGame();
        return;
    }
    if (timeLeft <= 0) return;

    // 物理的なキー位置を特定 (e.code を使用)
    const physicalPos = CODE_MAP[e.code] || e.key.toLowerCase();
    
    // 入力の判定に使用する文字
    // Input Swap が ON の場合はアプリ側でスワップ、OFF の場合は OS の入力をそのまま使用
    const typedChar = inputSwapToggle.checked ? (keyMap[physicalPos] || physicalPos) : e.key;

    if (typedChar.length !== 1) return;

    const targetChar = currentWord[currentIndex];

    if (typedChar === targetChar) {
        if (!isStarted) startGame();
        
        totalKeystrokes++;
        correctKeystrokes++;
        currentIndex++;
        if (currentIndex >= currentWord.length) {
            score++;
            scoreEl.textContent = `Words: ${score}`;
            nextWord();
        } else {
            renderWord();
            highlightTargetKey();
        }
    } else if (isStarted) {
        totalKeystrokes++;
        
        // Highlight the key on the visual keyboard that matches the produced character
        const producedChar = typedChar.toLowerCase();
        const allKeys = document.querySelectorAll('.key');
        allKeys.forEach(keyEl => {
            if (keyEl.textContent.toLowerCase() === producedChar) {
                keyEl.classList.add('incorrect-highlight');
                setTimeout(() => {
                    keyEl.classList.remove('incorrect-highlight');
                }, 200);
            }
        });

        // Visual feedback for wrong key in word display
        const chars = wordDisplayEl.querySelectorAll('.char');
        if (chars[currentIndex]) {
            chars[currentIndex].classList.add('incorrect');
            setTimeout(() => {
                chars[currentIndex].classList.remove('incorrect');
            }, 200);
        }
    }
}

// Event Listeners
showSwapToggle.addEventListener('change', () => {
    localStorage.setItem('typingGameShowSwap', showSwapToggle.checked);
    renderKeyboard();
});

inputSwapToggle.addEventListener('change', () => {
    localStorage.setItem('typingGameInputSwap', inputSwapToggle.checked);
    renderKeyboard();
});

useJpBtn.addEventListener('click', () => {
    currentLayoutType = 'JP';
    localStorage.setItem('typingGameLayoutType', 'JP');
    updateLayoutToggleUI();
    renderKeyboard();
});

useEnBtn.addEventListener('click', () => {
    currentLayoutType = 'EN';
    localStorage.setItem('typingGameLayoutType', 'EN');
    updateLayoutToggleUI();
    renderKeyboard();
});

keyUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        parseKeyMap(event.target.result);
        alert("Custom layout loaded and saved locally!");
        resetGame();
    };
    reader.readAsText(file);
});

downloadBtn.addEventListener('click', () => {
    const mapText = localStorage.getItem('typingGameKeyMap') || "";
    const blob = new Blob([mapText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'key_swap.txt';
    a.click();
    URL.revokeObjectURL(url);
});

resetDefaultBtn.addEventListener('click', async () => {
    if (confirm("Reset layout to default?")) {
        await resetToDefault();
        alert("Layout reset to default!");
        resetGame();
    }
});

toggleConfigBtn.addEventListener('click', () => {
    configArea.classList.toggle('hidden');
});

closeConfigBtn.addEventListener('click', () => {
    configArea.classList.add('hidden');
});

saveConfigBtn.addEventListener('click', () => {
    const newConfig = keyConfigTextarea.value;
    parseKeyMap(newConfig);
    alert("Configuration saved and applied!");
    resetGame();
});

restartBtn.addEventListener('click', resetGame);
window.addEventListener('keydown', handleInput);

init();
