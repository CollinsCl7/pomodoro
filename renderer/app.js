const TIMERS = {
  pomodoro: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

let currentMode = 'pomodoro';
let timeLeft = TIMERS.pomodoro;
let totalTime = TIMERS.pomodoro;
let isRunning = false;
let isPaused = false;
let timerInterval = null;
let sessionCount = parseInt(localStorage.getItem('pomodoro_sessions') || '0');
let tickAudioCtx = null;

// DOM refs
const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');
const mainBtn = document.getElementById('mainBtn');
const resetBtn = document.getElementById('resetBtn');
const progressCircle = document.getElementById('progressCircle');
const sessionCountEl = document.getElementById('sessionCount');
const modeBtns = document.querySelectorAll('.mode-btn');
const appEl = document.getElementById('app');

const CIRCUMFERENCE = 2 * Math.PI * 88; // ~553

function updateDisplay() {
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  minutesEl.textContent = String(m).padStart(2, '0');
  secondsEl.textContent = String(s).padStart(2, '0');
  document.title = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} - 番茄钟`;

  const progress = totalTime > 0 ? timeLeft / totalTime : 0;
  progressCircle.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
}

function switchMode(mode) {
  if (isRunning) stopTimer();

  currentMode = mode;
  timeLeft = TIMERS[mode];
  totalTime = TIMERS[mode];

  // Update body class for styling
  document.body.classList.remove('break-mode', 'long-break');
  if (mode === 'shortBreak') document.body.classList.add('break-mode');
  if (mode === 'longBreak') document.body.classList.add('long-break');

  modeBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  mainBtn.textContent = '开始';
  isPaused = false;
  updateDisplay();
}

function startTimer() {
  if (timeLeft <= 0) return;

  isRunning = true;
  isPaused = false;
  mainBtn.textContent = '暂停';
  mainBtn.classList.add('running');

  timerInterval = setInterval(() => {
    timeLeft--;
    updateDisplay();

    if (timeLeft <= 0) {
      stopTimer();
      onTimerComplete();
    }
  }, 1000);
}

function pauseTimer() {
  isPaused = true;
  isRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
  mainBtn.textContent = '继续';
}

function stopTimer() {
  isRunning = false;
  isPaused = false;
  clearInterval(timerInterval);
  timerInterval = null;
  mainBtn.textContent = '开始';
  mainBtn.classList.remove('running');
}

function resetTimer() {
  stopTimer();
  timeLeft = TIMERS[currentMode];
  totalTime = TIMERS[currentMode];
  updateDisplay();
}

function onTimerComplete() {
  // Play sound
  playAlarm();

  const modeNames = { pomodoro: '专注', shortBreak: '短休', longBreak: '长休' };
  const modeName = modeNames[currentMode];

  let nextMode;
  let message;

  if (currentMode === 'pomodoro') {
    sessionCount++;
    localStorage.setItem('pomodoro_sessions', sessionCount);
    sessionCountEl.textContent = sessionCount;

    if (sessionCount % 4 === 0) {
      nextMode = 'longBreak';
      message = `🎉 已完成 ${sessionCount} 个番茄！休息一下吧 🌿`;
    } else {
      nextMode = 'shortBreak';
      message = '🍅 专注结束，休息一下吧 😌';
    }
  } else {
    nextMode = 'pomodoro';
    message = '☕ 休息结束，开始新的专注吧！';
  }

  // Show notification
  if (window.electronAPI) {
    window.electronAPI.notify('番茄钟', message);
  }

  playAlarm();
  switchMode(nextMode);
}

function playAlarm() {
  try {
    if (!tickAudioCtx) {
      tickAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = tickAudioCtx;
    const now = ctx.currentTime;

    // Play a pleasant alarm sequence
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.3);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    });
  } catch (e) {
    // Audio not available
  }
}

// === Event Listeners ===

mainBtn.addEventListener('click', () => {
  if (isRunning) {
    pauseTimer();
  } else if (isPaused) {
    startTimer();
  } else {
    startTimer();
  }
});

resetBtn.addEventListener('click', resetTimer);

modeBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    switchMode(btn.dataset.mode);
  });
});

if (window.electronAPI) {
  document.getElementById('minimizeBtn').addEventListener('click', () => {
    window.electronAPI.minimize();
  });
  document.getElementById('closeBtn').addEventListener('click', () => {
    window.electronAPI.close();
  });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    mainBtn.click();
  }
  if (e.code === 'Escape') {
    resetBtn.click();
  }
});

// Init
sessionCountEl.textContent = sessionCount;
updateDisplay();
