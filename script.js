'use strict';

// 18 November 2026, 12:00 AM in Asia/Kolkata (UTC+05:30).
const BIRTHDAY_MOMENT = Date.UTC(2026, 10, 17, 18, 30, 0);
// Replace this single URL with the published address of Preeti's other birthday website.
const SECOND_BIRTHDAY_WEBSITE_URL = 'https://sagar-dev-sys.github.io/PREETI-BIRTHDAY-WORLD/';
const STORAGE_KEY = 'preeti-birthday-celebration-v1';
const SCENE_ORDER = ['countdown', 'calendar', 'welcome', 'wonderland', 'cake', 'final'];
const PREVIEW_MODE = new URLSearchParams(window.location.search).get('preview') === '1';
const PREVIEW_SCENES = ['countdown', 'calendar', 'welcome', 'cake', 'wonderland', 'final'];
const CONFETTI_COLORS = ['#DCCCF5', '#F7C8D5', '#E98BAA', '#FFFFFF', '#D8B779'];
const WISH_MESSAGES = [
  'May your 18th year be filled with happiness, courage, beautiful opportunities and countless reasons to smile.',
  'May you always find a little wonder in ordinary days and a bright path toward every dream you carry.',
  'Wishing you a year of kind people, brave beginnings, and moments that make your heart feel at home.',
  'May laughter find you often, hope stay close, and every new chapter bring something lovely.',
  'You deserve days full of warmth, chances to grow, and all the little things that make you feel loved.',
  'May this birthday be the first page of a year you will remember with a smile.'
];
const STAR_MESSAGES = [
  'Your kindness makes ordinary moments feel special.',
  'You bring a lovely light wherever you go.',
  'Your courage is bigger than you know.',
  'The way you care makes a real difference.',
  'You make people feel welcome just by being you.',
  'Your smile can brighten even a quiet day.',
  'You have a wonderful way of seeing the good.',
  'Your ideas deserve room to grow.',
  'You are allowed to take up space and shine.',
  'Your gentle heart is one of your superpowers.',
  'You make the world a little more beautiful.',
  'You can be proud of how far you have come.',
  'Your curiosity will take you to lovely places.',
  'There is no one else quite like you.',
  'Your laughter is a gift to the people around you.',
  'You are becoming someone remarkable, one day at a time.',
  'Your dreams are worth being patient and brave for.',
  'You are loved for exactly who you are.'
];
const MIRROR_MESSAGE = 'Today, the world celebrates another beautiful chapter of your life. Never forget how special your existence is. Keep smiling, keep growing and keep shining.';
const REDUCED_MOTION = Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

const scenes = Object.fromEntries(SCENE_ORDER.map((name) => [name, document.getElementById(`scene-${name}`)]));
const state = PREVIEW_MODE
  ? { scene: 'welcome', experiences: { jar: false, stars: false, mirror: false }, wishIndex: -1, starIndex: -1, candles: Array(18).fill(false), cut: false, cutPath: [] }
  : readSavedState();
let currentScene = 'countdown';
let previewSceneIndex = 0;
let countdownTimer = null;
let audioContext = null;
let soundEnabled = false;
let knifeEnabled = false;
let knifeDragging = false;
let knifePointerId = null;
let knifeGrabOffset = { x: 0, y: 0 };
let previousKnifePoint = null;
let cutPoints = [];
let calendarTimers = [];

function readSavedState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      scene: SCENE_ORDER.includes(saved.scene) ? saved.scene : 'welcome',
      experiences: {
        jar: Boolean(saved.experiences?.jar),
        stars: Boolean(saved.experiences?.stars),
        mirror: Boolean(saved.experiences?.mirror),
      },
      wishIndex: Number.isInteger(saved.wishIndex) ? saved.wishIndex : -1,
      starIndex: Number.isInteger(saved.starIndex) ? saved.starIndex : -1,
      candles: Array.isArray(saved.candles) ? Array.from({ length: 18 }, (_, index) => Boolean(saved.candles[index])) : Array(18).fill(false),
      cut: Boolean(saved.cut),
      cutPath: Array.isArray(saved.cutPath)
        ? saved.cutPath.filter((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y)).map(({ x, y }) => ({ x, y }))
        : [],
    };
  } catch {
    return { scene: 'welcome', experiences: { jar: false, stars: false, mirror: false }, wishIndex: -1, starIndex: -1, candles: Array(18).fill(false), cut: false, cutPath: [] };
  }
}

function saveState() {
  if (PREVIEW_MODE) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The celebration still works when storage is unavailable or disabled.
  }
}

function showScene(name) {
  currentScene = name;
  Object.entries(scenes).forEach(([sceneName, element]) => {
    const active = sceneName === name;
    element.hidden = !active;
    element.classList.toggle('is-active', active);
  });
  if (name !== 'countdown' && name !== 'calendar') {
    state.scene = name;
    saveState();
  }
  if (name === 'wonderland') restoreWonderland();
  if (name === 'welcome' || name === 'final') createConfetti(name === 'final' ? '.final-confetti' : '.welcome-confetti', name === 'final' ? 78 : 32);
  if (PREVIEW_MODE) updatePreviewNavigation();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function restoreWonderland() {
  const jarObject = document.getElementById('jar-object');
  const jarNote = document.getElementById('jar-note');
  const wishIsOpen = state.wishIndex >= 0 && state.wishIndex < WISH_MESSAGES.length;
  jarObject.classList.toggle('jar-scene-open', wishIsOpen);
  jarNote.hidden = !wishIsOpen;
  document.getElementById('another-wish').hidden = !wishIsOpen;
  document.getElementById('jar-hint').textContent = wishIsOpen ? 'A little wish, picked just for you.' : 'Tap the jar to open a little wish.';
  document.getElementById('wish-jar').setAttribute('aria-label', wishIsOpen ? 'Open the jar for another birthday wish' : 'Open the wish jar and reveal a birthday note');
  if (wishIsOpen) {
    document.getElementById('jar-message').textContent = WISH_MESSAGES[state.wishIndex];
    jarNote.classList.add('is-unfolding');
  }

  document.querySelectorAll('.star-choice').forEach((star) => {
    star.classList.toggle('is-active', Number(star.dataset.starIndex) === state.starIndex);
  });
  if (state.starIndex >= 0 && state.starIndex < STAR_MESSAGES.length) {
    document.getElementById('star-message').textContent = STAR_MESSAGES[state.starIndex];
  }

  const mirrorOpen = state.experiences.mirror;
  document.getElementById('mirror-button').classList.toggle('is-awake', mirrorOpen);
  document.getElementById('mirror-button').setAttribute('aria-expanded', String(mirrorOpen));
  document.getElementById('mirror-prompt').hidden = mirrorOpen;
  document.getElementById('mirror-message').hidden = !mirrorOpen;
  document.getElementById('mirror-hint').textContent = mirrorOpen ? 'A little reminder to carry with you.' : 'Tap the mirror to see your birthday message.';
  if (mirrorOpen) document.getElementById('mirror-message').textContent = MIRROR_MESSAGE;
  document.getElementById('companion-party').hidden = !Object.values(state.experiences).every(Boolean);
}

function markExperienceExplored(name) {
  state.experiences[name] = true;
  saveState();
  if (Object.values(state.experiences).every(Boolean)) {
    document.getElementById('companion-party').hidden = false;
  }
}

function revealNextWish() {
  state.wishIndex = (state.wishIndex + 1) % WISH_MESSAGES.length;
  const jarObject = document.getElementById('jar-object');
  const note = document.getElementById('jar-note');
  jarObject.classList.add('jar-scene-open');
  note.hidden = false;
  note.classList.remove('is-unfolding');
  void note.offsetWidth;
  note.classList.add('is-unfolding');
  document.getElementById('jar-message').textContent = WISH_MESSAGES[state.wishIndex];
  document.getElementById('another-wish').hidden = false;
  document.getElementById('jar-hint').textContent = 'A little wish, picked just for you.';
  document.getElementById('wish-jar').setAttribute('aria-label', 'Open the jar for another birthday wish');
  markExperienceExplored('jar');
}

function chooseStar(index) {
  state.starIndex = index;
  document.querySelectorAll('.star-choice').forEach((star) => {
    star.classList.toggle('is-active', Number(star.dataset.starIndex) === index);
  });
  document.getElementById('star-message').textContent = STAR_MESSAGES[index];
  markExperienceExplored('stars');
}

function buildStarrySky() {
  const field = document.getElementById('starfield');
  if (field.childElementCount) return;
  STAR_MESSAGES.forEach((_, index) => {
    const star = document.createElement('button');
    star.type = 'button';
    star.className = 'star-choice';
    star.dataset.starIndex = String(index);
    star.setAttribute('aria-label', `Reveal a birthday compliment from star ${index + 1}`);
    star.textContent = '✦';
    star.addEventListener('click', () => chooseStar(index));
    field.append(star);
  });
}

function updatePreviewNavigation() {
  const sceneIndex = PREVIEW_SCENES.indexOf(currentScene);
  if (sceneIndex >= 0) previewSceneIndex = sceneIndex;
  document.getElementById('preview-step').textContent = `${previewSceneIndex + 1} / ${PREVIEW_SCENES.length}`;
  document.getElementById('preview-previous').disabled = previewSceneIndex === 0;
  document.getElementById('preview-next').disabled = previewSceneIndex === PREVIEW_SCENES.length - 1;
}

function movePreviewScene(direction) {
  if (currentScene === 'calendar') clearCalendarTransition();
  previewSceneIndex = Math.max(0, Math.min(PREVIEW_SCENES.length - 1, previewSceneIndex + direction));
  const nextScene = PREVIEW_SCENES[previewSceneIndex];
  if (nextScene === 'calendar') startCalendarTransition();
  else showScene(nextScene);
}

function updateCountdown() {
  const remaining = BIRTHDAY_MOMENT - Date.now();
  if (remaining <= 0) {
    window.clearInterval(countdownTimer);
    startCalendarTransition();
    return;
  }
  const totalSeconds = Math.floor(remaining / 1000);
  document.getElementById('days').textContent = String(Math.floor(totalSeconds / 86400)).padStart(2, '0');
  document.getElementById('hours').textContent = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, '0');
  document.getElementById('minutes').textContent = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  document.getElementById('seconds').textContent = String(totalSeconds % 60).padStart(2, '0');
}

function createConfetti(selector, count) {
  const container = document.querySelector(selector);
  if (container.childElementCount) return;
  for (let index = 0; index < count; index += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
    piece.style.setProperty('--delay', `${Math.random() * 2.5}s`);
    piece.style.setProperty('--fall-time', `${3.2 + Math.random() * 3}s`);
    piece.style.setProperty('--drift', `${Math.round(Math.random() * 160 - 80)}px`);
    container.append(piece);
  }
}

const cakeArt = document.getElementById('cake-art');

// The cake is deliberately stationary. Its illustrated tiers, layered SVG shading,
// frosting and shadows create the depth without spinning the artwork like a poster.
function buildCakeDepth() {
  cakeArt.classList.add('cake-is-stationary');
}

function playTone(frequency = 660, delay = 0) {
  if (!soundEnabled) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.09, audioContext.currentTime + delay + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + delay + 0.32);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(audioContext.currentTime + delay);
    oscillator.stop(audioContext.currentTime + delay + 0.34);
  } catch {
    soundEnabled = false;
    updateSoundButton();
  }
}

function playChime() {
  [523.25, 659.25, 783.99].forEach((frequency, index) => playTone(frequency, index * 0.09));
}

function updateSoundButton() {
  const button = document.getElementById('sound-toggle');
  button.setAttribute('aria-pressed', String(soundEnabled));
  button.setAttribute('aria-label', soundEnabled ? 'Turn birthday sounds off' : 'Turn birthday sounds on');
  document.getElementById('sound-label').textContent = soundEnabled ? 'Sound on' : 'Sound off';
}

function buildCandles() {
  const layer = document.getElementById('candle-layer');
  for (let index = 0; index < 18; index += 1) {
    const candle = document.createElement('button');
    candle.type = 'button';
    candle.className = `candle${state.candles[index] ? ' is-out' : ''}`;
    candle.dataset.index = String(index);
    candle.setAttribute('aria-label', `Candle ${index + 1}${state.candles[index] ? ', extinguished' : ', lit'}`);
    candle.disabled = state.candles[index];
    const flame = document.createElement('span');
    flame.className = 'flame';
    flame.setAttribute('aria-hidden', 'true');
    candle.append(flame);
    candle.addEventListener('click', () => extinguishCandle(index));
    layer.append(candle);
  }
  updateCandleProgress();
}

function extinguishCandle(index) {
  if (state.candles[index]) return;
  state.candles[index] = true;
  const candle = document.querySelector(`.candle[data-index="${index}"]`);
  candle.classList.add('is-out');
  candle.disabled = true;
  candle.setAttribute('aria-label', `Candle ${index + 1}, extinguished`);
  playTone(480 + (index % 5) * 55);
  saveState();
  updateCandleProgress();
}

function updateCandleProgress() {
  if (state.candles.every(Boolean)) {
    document.getElementById('wish-copy').hidden = true;
    document.getElementById('cake-next').hidden = false;
  }
}

function cakePointFromEvent(event) {
  const stageRect = document.getElementById('cake-stage').getBoundingClientRect();
  const overlay = document.getElementById('cut-overlay');
  const svgPoint = overlay.createSVGPoint();
  svgPoint.x = event.clientX;
  svgPoint.y = event.clientY;
  const cakePoint = svgPoint.matrixTransform(overlay.getScreenCTM().inverse());
  return {
    x: cakePoint.x,
    y: cakePoint.y,
    stageX: (event.clientX - stageRect.left) * 700 / stageRect.width,
    stageY: (event.clientY - stageRect.top) * 510 / stageRect.height,
    clientX: event.clientX,
    clientY: event.clientY,
  };
}

function buildCutPath(points) {
  if (!points.length) return '';
  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  if (points.length === 1) return path;
  for (let index = 1; index < points.length - 1; index += 1) {
    const midpointX = (points[index].x + points[index + 1].x) / 2;
    const midpointY = (points[index].y + points[index + 1].y) / 2;
    path += ` Q ${points[index].x.toFixed(1)} ${points[index].y.toFixed(1)} ${midpointX.toFixed(1)} ${midpointY.toFixed(1)}`;
  }
  const last = points[points.length - 1];
  path += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return path;
}

function renderCutPath(points) {
  const path = buildCutPath(points);
  document.getElementById('cut-shadow').setAttribute('d', path);
  document.getElementById('cut-cream').setAttribute('d', path);
}

function setKnifeEnabled(enabled) {
  knifeEnabled = enabled && !state.cut;
  const stage = document.getElementById('cake-stage');
  const knife = document.getElementById('cake-knife');
  stage.classList.toggle('is-knife-enabled', knifeEnabled);
  knife.setAttribute('aria-disabled', String(!knifeEnabled));
  knife.tabIndex = knifeEnabled ? 0 : -1;
}

function setSliceLandingDistance() {
  const stage = document.getElementById('cake-stage');
  const bounds = stage.getBoundingClientRect();
  stage.style.setProperty('--slice-travel-x', `${bounds.width * 0.29}px`);
  stage.style.setProperty('--slice-travel-y', `${bounds.height * 0.22}px`);
}

function clearCutGesture() {
  cutPoints = [];
  renderCutPath(cutPoints);
  document.getElementById('cake-stage').classList.remove('cut-failed');
  document.getElementById('cut-feedback').hidden = true;
  document.getElementById('reset-cut').hidden = true;
}

function beginKnifeDrag(event) {
  if (!knifeEnabled || state.cut || (event.pointerType === 'mouse' && event.button !== 0)) return;
  event.preventDefault();
  clearCutGesture();
  const knife = event.currentTarget;
  const point = cakePointFromEvent(event);
  const stage = document.getElementById('cake-stage');
  const stageRect = stage.getBoundingClientRect();
  knifeGrabOffset = {
    x: point.stageX * stageRect.width / 700 - knife.offsetLeft,
    y: point.stageY * stageRect.height / 510 - knife.offsetTop,
  };
  knifeDragging = true;
  knifePointerId = event.pointerId;
  previousKnifePoint = point;
  stage.classList.add('is-dragging');
  knife.setPointerCapture(event.pointerId);
}

function moveKnife(event) {
  if (!knifeDragging || event.pointerId !== knifePointerId) return;
  event.preventDefault();
  const knife = event.currentTarget;
  const stage = document.getElementById('cake-stage');
  const stageRect = stage.getBoundingClientRect();
  const points = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [event];
  for (const sample of points) {
    const point = cakePointFromEvent(sample);
    const left = Math.max(0, Math.min(stageRect.width - knife.offsetWidth, point.stageX * stageRect.width / 700 - knifeGrabOffset.x));
    const top = Math.max(0, Math.min(stageRect.height - knife.offsetHeight, point.stageY * stageRect.height / 510 - knifeGrabOffset.y));
    knife.style.left = `${left}px`;
    knife.style.top = `${top}px`;
    if (previousKnifePoint) {
      const deltaX = point.clientX - previousKnifePoint.clientX;
      const deltaY = point.clientY - previousKnifePoint.clientY;
      if (Math.hypot(deltaX, deltaY) > 1) knife.style.setProperty('--knife-rotation', `${Math.atan2(deltaY, deltaX) * 180 / Math.PI}deg`);
    }
    previousKnifePoint = point;
    if (point.x >= 145 && point.x <= 555 && point.y >= 195 && point.y <= 414) {
      const last = cutPoints[cutPoints.length - 1];
      if (!last || Math.hypot(point.x - last.x, point.y - last.y) >= 2.5) {
        cutPoints.push({ x: point.x, y: point.y });
        renderCutPath(cutPoints);
      }
    }
  }
}

function finishKnifeDrag(event) {
  if (!knifeDragging || event.pointerId !== knifePointerId) return;
  event.preventDefault();
  knifeDragging = false;
  knifePointerId = null;
  previousKnifePoint = null;
  const stage = document.getElementById('cake-stage');
  stage.classList.remove('is-dragging');
  if (event.type === 'pointercancel') {
    failCutGesture();
    return;
  }
  const minX = cutPoints.length ? Math.min(...cutPoints.map((point) => point.x)) : 0;
  const maxX = cutPoints.length ? Math.max(...cutPoints.map((point) => point.x)) : 0;
  const minY = cutPoints.length ? Math.min(...cutPoints.map((point) => point.y)) : 0;
  const maxY = cutPoints.length ? Math.max(...cutPoints.map((point) => point.y)) : 0;
  let strokeLength = 0;
  for (let index = 1; index < cutPoints.length; index += 1) {
    strokeLength += Math.hypot(cutPoints[index].x - cutPoints[index - 1].x, cutPoints[index].y - cutPoints[index - 1].y);
  }
  if (strokeLength < 135 || (maxX - minX < 95 && maxY - minY < 95)) {
    failCutGesture();
    return;
  }
  completeCakeCut();
}

function failCutGesture() {
  const stage = document.getElementById('cake-stage');
  stage.classList.add('cut-failed');
  document.getElementById('cut-feedback').hidden = false;
  document.getElementById('reset-cut').hidden = false;
  playTone(330);
}

function resetCakeCut() {
  if (state.cut) return;
  clearCutGesture();
  const knife = document.getElementById('cake-knife');
  knife.style.left = '';
  knife.style.top = '';
  knife.style.setProperty('--knife-rotation', '-27deg');
  setKnifeEnabled(!document.getElementById('cut-controls').hidden);
}

function completeCakeCut() {
  state.cut = true;
  state.cutPath = cutPoints.map(({ x, y }) => ({ x, y }));
  saveState();
  setSliceLandingDistance();
  renderCutPath(state.cutPath);
  setKnifeEnabled(false);
  const stage = document.getElementById('cake-stage');
  stage.classList.add('is-cut');
  document.getElementById('cut-controls').hidden = true;
  document.getElementById('cut-done').hidden = false;
  createCakeConfetti();
  playChime();
}

function createCakeConfetti() {
  const container = document.querySelector('.cake-cut-confetti');
  if (container.childElementCount) return;
  for (let index = 0; index < 56; index += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.backgroundColor = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
    piece.style.setProperty('--delay', `${Math.random() * 0.3}s`);
    piece.style.setProperty('--drift', `${Math.round(Math.random() * 340 - 170)}px`);
    piece.style.setProperty('--rise', `${Math.round(Math.random() * 260 - 130)}px`);
    container.append(piece);
  }
}

const cakeKnife = document.getElementById('cake-knife');
cakeKnife.addEventListener('pointerdown', beginKnifeDrag);
cakeKnife.addEventListener('pointermove', moveKnife);
cakeKnife.addEventListener('pointerup', finishKnifeDrag);
cakeKnife.addEventListener('pointercancel', finishKnifeDrag);
document.getElementById('reset-cut').addEventListener('click', resetCakeCut);

document.getElementById('sound-toggle').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  updateSoundButton();
  if (soundEnabled) playChime();
});

document.getElementById('enter-wonderland-from-welcome').addEventListener('click', () => showScene('wonderland'));
document.getElementById('open-wonderland-from-cake').addEventListener('click', () => showScene('wonderland'));
document.getElementById('return-to-cake').addEventListener('click', () => showScene('cake'));

document.getElementById('wish-jar').addEventListener('click', revealNextWish);
document.getElementById('another-wish').addEventListener('click', revealNextWish);

document.getElementById('mirror-button').addEventListener('click', () => {
  const mirror = document.getElementById('mirror-button');
  mirror.classList.add('is-awake');
  mirror.setAttribute('aria-expanded', 'true');
  document.getElementById('mirror-prompt').hidden = true;
  document.getElementById('mirror-message').textContent = MIRROR_MESSAGE;
  document.getElementById('mirror-message').hidden = false;
  document.getElementById('mirror-hint').textContent = 'A little reminder to carry with you.';
  markExperienceExplored('mirror');
});

document.getElementById('blow-candles').addEventListener('click', () => {
  state.candles.forEach((extinguished, index) => {
    if (!extinguished) extinguishCandle(index);
  });
});

document.getElementById('start-cut').addEventListener('click', () => {
  document.getElementById('cake-next').hidden = true;
  document.getElementById('cut-controls').hidden = false;
  document.getElementById('wish-copy').hidden = true;
  window.setTimeout(() => {
    if (currentScene === 'cake') setKnifeEnabled(true);
  }, 220);
});

document.getElementById('celebrate').addEventListener('click', () => {
  playChime();
  showScene('final');
});

document.getElementById('second-surprise').addEventListener('click', () => {
  if (!SECOND_BIRTHDAY_WEBSITE_URL) return;
  window.open(SECOND_BIRTHDAY_WEBSITE_URL, '_blank', 'noopener,noreferrer');
});

document.getElementById('preview-previous').addEventListener('click', () => movePreviewScene(-1));
document.getElementById('preview-next').addEventListener('click', () => movePreviewScene(1));

buildCalendar();
buildStarrySky();
buildCandles();
buildCakeDepth();
updateSoundButton();

if (PREVIEW_MODE) {
  document.getElementById('preview-toolbar').hidden = false;
  showScene('welcome');
} else if (Date.now() >= BIRTHDAY_MOMENT) {
  const startingScene = ['countdown', 'calendar', 'welcome'].includes(state.scene) ? 'cake' : state.scene;
  showScene(startingScene);
  if (state.scene === 'cake') {
    document.getElementById('wish-copy').hidden = state.candles.every(Boolean);
    document.getElementById('cake-next').hidden = !state.candles.every(Boolean) || state.cut;
    document.getElementById('cut-controls').hidden = !state.candles.every(Boolean) || state.cut;
    document.getElementById('cut-done').hidden = !state.cut;
    if (state.cut) {
      document.getElementById('cake-stage').classList.add('is-cut');
      setSliceLandingDistance();
      renderCutPath(state.cutPath);
    }
    setKnifeEnabled(state.candles.every(Boolean) && !state.cut);
  }
} else {
  showScene('countdown');
  updateCountdown();
  countdownTimer = window.setInterval(updateCountdown, 1000);
}

function buildCalendar() {
  const grid = document.getElementById('calendar-grid');
  if (grid.childElementCount) return;
  ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((weekday) => {
    const label = document.createElement('span');
    label.className = 'calendar-weekday';
    label.textContent = weekday;
    grid.append(label);
  });
  const firstWeekday = new Date(Date.UTC(2026, 10, 1)).getUTCDay();
  for (let blank = 0; blank < firstWeekday; blank += 1) {
    const empty = document.createElement('span');
    empty.className = 'calendar-blank';
    empty.setAttribute('aria-hidden', 'true');
    grid.append(empty);
  }
  for (let date = 1; date <= 30; date += 1) {
    const cell = document.createElement('span');
    cell.className = `calendar-date${date === 18 ? ' is-birthday' : ''}`;
    cell.setAttribute('aria-label', date === 18 ? 'November 18, Preeti birthday' : `November ${date}`);
    const number = document.createElement('span');
    number.className = 'date-number';
    number.textContent = String(date);
    cell.append(number);
    if (date === 18) {
      const heart = document.createElement('span');
      heart.className = 'calendar-heart';
      heart.textContent = '♥';
      heart.setAttribute('aria-hidden', 'true');
      cell.append(heart);
    }
    grid.append(cell);
  }
}

function clearCalendarTransition() {
  calendarTimers.forEach((timer) => window.clearTimeout(timer));
  calendarTimers = [];
  const card = document.getElementById('calendar-card');
  const gateway = document.getElementById('heart-gateway');
  card.classList.remove('is-visible', 'is-glowing', 'is-heart-visible', 'is-fading');
  gateway.classList.remove('is-zooming');
  gateway.hidden = true;
}

function startCalendarTransition() {
  clearCalendarTransition();
  showScene('calendar');
  const card = document.getElementById('calendar-card');
  const gateway = document.getElementById('heart-gateway');
  const durations = REDUCED_MOTION
    ? { visible: 30, glow: 200, heart: 380, fade: 780, zoom: 900, welcome: 1120, finish: 1580 }
    : { visible: 80, glow: 1050, heart: 1850, fade: 3550, zoom: 4300, welcome: 4950, finish: 6000 };
  const schedule = (callback, delay) => calendarTimers.push(window.setTimeout(callback, delay));
  schedule(() => card.classList.add('is-visible'), durations.visible);
  schedule(() => card.classList.add('is-glowing'), durations.glow);
  schedule(() => card.classList.add('is-heart-visible'), durations.heart);
  schedule(() => card.classList.add('is-fading'), durations.fade);
  schedule(() => {
    gateway.hidden = false;
    gateway.classList.remove('is-zooming');
    void gateway.offsetWidth;
    gateway.classList.add('is-zooming');
  }, durations.zoom);
  schedule(() => showScene('cake'), durations.welcome);
  schedule(() => {
    gateway.classList.remove('is-zooming');
    gateway.hidden = true;
  }, durations.finish);
}