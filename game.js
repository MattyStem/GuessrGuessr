// Numblr – one guess per day, four progressive levels.
// Anti-gambling design: no retry prompts, no urgency, no rewards beyond progress.

const LEVELS = [
  { max: 20,    label: "Level 1" },
  { max: 100,   label: "Level 2" },
  { max: 1000,  label: "Level 3" },
  { max: 10000, label: "Level 4" },
];

// --- Daily seeded number generation ---
// Uses the calendar date as a seed so the target is the same for every player
// on the same day, but changes each midnight automatically.
function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function seededRandom(seed) {
  // Simple but adequate LCG variant
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function dateSeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function getDailyTarget(levelIndex) {
  const seed = dateSeed() + levelIndex * 9973; // offset per level
  return Math.floor(seededRandom(seed) * LEVELS[levelIndex].max) + 1;
}

// --- LocalStorage state ---
const STORAGE_KEY = "numblr_state";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getState() {
  const today = todayString();
  let state = loadState();

  if (!state) {
    state = {
      currentLevel: 0,
      guessDate: null,   // date string of last guess attempt
      guessedToday: false,
      lastResult: null,  // "correct" | "wrong" | null
    };
  }

  // New day → allow a new guess (but don't reset progress)
  if (state.guessDate !== today) {
    state.guessDate = today;
    state.guessedToday = false;
    state.lastResult = null;
  }

  return state;
}

// --- UI helpers ---
function $(id) { return document.getElementById(id); }

function renderLevel(state) {
  const level = LEVELS[state.currentLevel];

  $("level-label").textContent = level.label;
  $("level-range").textContent = `1 – ${level.max.toLocaleString()}`;
  $("level-progress").textContent =
    `Level ${state.currentLevel + 1} of ${LEVELS.length}`;

  const guessInput = $("guess-input");
  const guessBtn = $("guess-btn");
  const resultArea = $("result-area");

  guessInput.min = 1;
  guessInput.max = level.max;
  guessInput.value = "";

  if (state.guessedToday) {
    guessInput.disabled = true;
    guessBtn.disabled = true;

    if (state.lastResult === "correct") {
      resultArea.textContent =
        "Correct! Next level unlocked. You still only get one guess per day.";
      resultArea.className = "result success";
    } else {
      resultArea.textContent =
        "Not quite. Your guess for today has been used. Come back tomorrow.";
      resultArea.className = "result miss";
    }
  } else {
    guessInput.disabled = false;
    guessBtn.disabled = false;
    resultArea.textContent = "";
    resultArea.className = "result";
  }
}

function renderComplete() {
  $("game-area").innerHTML = `
    <p class="complete-msg">
      You've completed all four levels.<br>
      Come back tomorrow for new numbers.
    </p>`;
}

function render() {
  const state = getState();

  if (state.currentLevel >= LEVELS.length) {
    renderComplete();
    return;
  }

  renderLevel(state);
}

// --- Guess submission ---
function submitGuess() {
  const state = getState();
  if (state.guessedToday) return;

  const input = $("guess-input");
  const value = parseInt(input.value, 10);
  const level = LEVELS[state.currentLevel];

  if (isNaN(value) || value < 1 || value > level.max) {
    $("result-area").textContent =
      `Please enter a number between 1 and ${level.max.toLocaleString()}.`;
    $("result-area").className = "result warning";
    return;
  }

  const target = getDailyTarget(state.currentLevel);
  state.guessedToday = true;

  if (value === target) {
    state.lastResult = "correct";
    state.currentLevel += 1;
  } else {
    state.lastResult = "wrong";
  }

  saveState(state);
  render();
}

// --- Init ---
document.addEventListener("DOMContentLoaded", () => {
  render();

  // Elements may not exist when the game is already complete
  const btn = $("guess-btn");
  const input = $("guess-input");
  if (btn)   btn.addEventListener("click", submitGuess);
  if (input) input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitGuess();
  });
});
