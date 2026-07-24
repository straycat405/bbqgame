const tray = document.querySelector('#tray');
const grill = document.querySelector('#grill');
const plate = document.querySelector('#plate');
const scoreEl = document.querySelector('#score');
const timeEl = document.querySelector('#time');
const bestEl = document.querySelector('#best-score');
const comboEl = document.querySelector('#combo');
const instructionEl = document.querySelector('#instruction');
const startButton = document.querySelector('#start-button');
const heatLabel = document.querySelector('#heat-label');
const toast = document.querySelector('#toast');
const dropHint = document.querySelector('#drop-hint');
const plateMessage = document.querySelector('#plate-message');
const servedMeats = document.querySelector('#served-meats');
const assistToggle = document.querySelector('#assist-toggle');
const donenessGuide = document.querySelector('#doneness-guide');
const cookMeterFill = document.querySelector('#cook-meter-fill');
const cookMeterLabel = document.querySelector('#cook-meter-label');
const endScreen = document.querySelector('#end-screen');
const endScore = document.querySelector('#end-score');
const endMessage = document.querySelector('#end-message');
const rankingList = document.querySelector('#ranking-list');
const restartButton = document.querySelector('#restart-button');
const pauseButton = document.querySelector('#pause-button');
const pauseScreen = document.querySelector('#pause-screen');
const resumeButton = document.querySelector('#resume-button');

let score = 0, combo = 0, heat = 2, remaining = 60, running = false, paused = false, lastTime = 0;
let meats = [];
let assistEnabled = false;
let touchMeat = null, touchStart = { x: 0, y: 0 }, touchDragging = false, touchOriginal = null;
const bestKey = 'bbq-game-best-score';
const rankingKey = 'bbq-game-top-scores';
bestEl.textContent = localStorage.getItem(bestKey) || '0';

function makeMeat() {
  const meat = document.createElement('div');
  meat.className = 'meat';
  meat.dataset.state = 'tray'; meat.dataset.face = 'a'; meat.dataset.cookA = '0'; meat.dataset.cookB = '0';
  meat.style.left = `${7 + Math.random() * 45}%`; meat.style.top = `${10 + Math.random() * 62}%`;
  meat.style.transform = `rotate(${Math.random() * 38 - 19}deg)`;
  meat.addEventListener('pointerdown', handleMeatPointerDown);
  tray.append(meat); meats.push(meat);
}
function fillTray() { while (tray.children.length < 8) makeMeat(); }
function resetGame() {
  endScreen.hidden = true;
  pauseScreen.hidden = true; paused = false; pauseButton.disabled = false; pauseButton.textContent = '일시정지';
  score = 0; combo = 0; remaining = 60; running = true; lastTime = performance.now();
  meats.forEach(m => m.remove()); meats = []; fillTray();
  scoreEl.textContent = '0'; timeEl.textContent = '01:00'; comboEl.textContent = '불판 예열 완료!';
  instructionEl.textContent = isMobileLayout() ? '고기를 불판까지 끌어다 놓으세요' : '우클릭으로 고기를 불판에 올려 주세요'; startButton.textContent = '게임 중'; startButton.disabled = true;
  plateMessage.style.display = ''; plateMessage.innerHTML = '잘 익은 고기를<br />기다리고 있어요';
  servedMeats.replaceChildren();
}
function isMobileLayout() { return window.matchMedia('(max-width: 760px)').matches; }
function togglePause() {
  if (!running && !paused) return;
  if (running) {
    running = false; paused = true; pauseScreen.hidden = false; pauseButton.textContent = '계속하기';
    instructionEl.textContent = '게임이 일시정지되었습니다';
    return;
  }
  paused = false; running = true; lastTime = performance.now(); pauseScreen.hidden = true; pauseButton.textContent = '일시정지';
  instructionEl.textContent = isMobileLayout() ? '불판 고기를 완성 접시까지 끌어다 놓으세요' : '좌클릭으로 뒤집고, 우클릭으로 접시에 담으세요';
}
function getRankings() {
  try { return JSON.parse(localStorage.getItem(rankingKey) || '[]').filter(Number.isFinite); }
  catch { return []; }
}
function saveScoreToRankings(newScore) {
  const rankings = [...getRankings(), newScore].sort((a, b) => b - a).slice(0, 10);
  localStorage.setItem(rankingKey, JSON.stringify(rankings));
  return rankings;
}
function renderRankings(rankings) {
  rankingList.replaceChildren();
  rankings.forEach(value => {
    const item = document.createElement('li');
    const scoreValue = document.createElement('b'); scoreValue.textContent = `${value.toLocaleString()}점`;
    item.append(scoreValue); rankingList.append(item);
  });
  while (rankingList.children.length < 10) {
    const item = document.createElement('li'); item.innerHTML = '<span>—</span>'; rankingList.append(item);
  }
}
function handleMeatPointerDown(event) {
  const meat = event.currentTarget;
  if (!running || meat.dataset.state === 'served') return;
  if (event.pointerType === 'touch') { startTouchDrag(event); return; }
  if (event.button === 0) {
    if (meat.dataset.state === 'grill') flipMeat(meat);
    else showToast('불판 위 고기만 뒤집을 수 있어요');
    return;
  }
  if (event.button !== 2) return;
  event.preventDefault();
  if (meat.dataset.state === 'tray') placeOnGrill(meat);
  else if (meat.dataset.state === 'grill') serveMeat(meat);
}
function startTouchDrag(event) {
  event.preventDefault();
  touchMeat = event.currentTarget;
  touchStart = { x: event.clientX, y: event.clientY }; touchDragging = false;
  touchOriginal = { position: touchMeat.style.position, left: touchMeat.style.left, top: touchMeat.style.top, transform: touchMeat.style.transform };
  touchMeat.setPointerCapture(event.pointerId);
  touchMeat.addEventListener('pointermove', moveTouchDrag);
  touchMeat.addEventListener('pointerup', endTouchDrag, { once: true });
  touchMeat.addEventListener('pointercancel', cancelTouchDrag, { once: true });
}
function moveTouchDrag(event) {
  if (!touchMeat) return;
  if (!touchDragging && Math.hypot(event.clientX - touchStart.x, event.clientY - touchStart.y) > 8) {
    touchDragging = true; touchMeat.classList.add('dragging');
  }
  if (!touchDragging) return;
  touchMeat.style.position = 'fixed'; touchMeat.style.left = `${event.clientX - 37}px`; touchMeat.style.top = `${event.clientY - 24}px`;
}
function endTouchDrag(event) {
  const meat = touchMeat; if (!meat) return;
  meat.removeEventListener('pointermove', moveTouchDrag); meat.removeEventListener('pointercancel', cancelTouchDrag);
  if (!touchDragging) {
    if (meat.dataset.state === 'grill') flipMeat(meat);
    else showToast('고기를 끌어다 놓으세요');
    clearTouchDrag();
    return;
  }
  meat.classList.remove('dragging'); meat.style.pointerEvents = 'none';
  const target = document.elementFromPoint(event.clientX, event.clientY);
  meat.style.pointerEvents = '';
  const overGrill = target && (target === grill || grill.contains(target));
  const overPlate = target && (target === plate || plate.contains(target));
  let moved = false;
  if (overGrill && meat.dataset.state === 'tray') moved = placeOnGrill(meat);
  else if (overPlate && meat.dataset.state === 'grill') { serveMeat(meat); moved = true; }
  if (!moved && meat.isConnected) restoreTouchMeat(meat);
  clearTouchDrag();
}
function cancelTouchDrag() {
  if (touchMeat?.isConnected) restoreTouchMeat(touchMeat);
  clearTouchDrag();
}
function restoreTouchMeat(meat) {
  meat.classList.remove('dragging'); meat.style.position = touchOriginal.position; meat.style.left = touchOriginal.left; meat.style.top = touchOriginal.top; meat.style.transform = touchOriginal.transform;
}
function clearTouchDrag() { touchMeat = null; touchOriginal = null; touchDragging = false; }
function placeOnGrill(meat) {
  const grillingCount = grill.querySelectorAll('.meat').length;
  if (grillingCount >= 8) { showToast('불판이 가득 찼어요!'); return false; }
  meat.dataset.state = 'grill'; meat.className = 'meat';
  const column = grillingCount % 4, row = Math.floor(grillingCount / 4);
  const meatWidth = 74, meatHeight = 48, inset = 33;
  const innerWidth = grill.clientWidth - inset * 2 - meatWidth;
  const innerHeight = grill.clientHeight - inset * 2 - meatHeight;
  const left = inset + innerWidth * (column / 3);
  const top = inset + innerHeight * row;
  const rotations = [-5, 3, -2, 4, 3, -4, 4, -3];
  meat.style.position = 'absolute'; meat.style.left = `${left}px`; meat.style.top = `${top}px`; meat.style.transform = `rotate(${rotations[grillingCount]}deg)`;
  grill.append(meat); grill.classList.add('has-meat'); dropHint.style.opacity = '0'; instructionEl.textContent = isMobileLayout() ? '불판 고기를 완성 접시까지 끌어다 놓으세요' : '좌클릭으로 뒤집고, 우클릭으로 접시에 담으세요';
  return true;
}
function serveMeat(meat) {
  const cookA = Number(meat.dataset.cookA), cookB = Number(meat.dataset.cookB); let points = 0;
  const perfectA = cookA >= 42 && cookA <= 66, perfectB = cookB >= 42 && cookB <= 66;
  if (perfectA && perfectB) { points = 30 + combo * 3; combo++; showToast(`양면 완벽! +${points}`); comboEl.textContent = `양면 완벽!  콤보 ×${combo}`; }
  else if (cookA >= 28 && cookA <= 80 && cookB >= 28 && cookB <= 80) { points = 15; combo = 0; showToast('양면 잘 익었어요! +15'); comboEl.textContent = '양면 굽기 성공!'; }
  else { points = -5; combo = 0; showToast(cookA > 80 || cookB > 80 ? '한 면이 너무 탔어요! -5' : '양면을 더 구워야 해요! -5'); comboEl.textContent = '뒤집어 양면을 구워보세요!'; }
  score = Math.max(0, score + points); scoreEl.textContent = score; meat.dataset.state='served'; meat.remove();
  addServedMeat(cookA, cookB); plateMessage.style.display = 'none'; grill.classList.toggle('has-meat', [...grill.querySelectorAll('.meat')].length > 0);
  if (meats.filter(m => m.dataset.state === 'served').length % 2 === 0) fillTray();
}
function addServedMeat(cookA, cookB) {
  const served = document.createElement('i'); served.className = 'plate-meat';
  const count = servedMeats.children.length;
  const spots = [[28,37,-18],[55,24,16],[45,56,4],[17,60,28],[65,52,-27],[34,15,37],[70,68,14],[12,25,-35]];
  const [left, top, rotation] = spots[count % spots.length];
  served.style.left = `${left}%`; served.style.top = `${top}%`; served.style.transform = `rotate(${rotation}deg)`;
  const lessCookedSide = Math.min(cookA, cookB);
  served.style.setProperty('--sprite-frame', lessCookedSide < 16 ? '0%' : lessCookedSide < 42 ? '33.33%' : lessCookedSide <= 66 ? '66.66%' : '100%');
  if (cookA > 80 || cookB > 80) served.style.filter = 'brightness(.7) saturate(.7)';
  servedMeats.append(served);
}
function flipMeat(meat) {
  meat.dataset.face = meat.dataset.face === 'a' ? 'b' : 'a';
  meat.classList.remove('just-flipped'); void meat.offsetWidth; meat.classList.add('just-flipped');
  const visibleCook = Number(meat.dataset.face === 'a' ? meat.dataset.cookA : meat.dataset.cookB);
  setMeatAppearance(meat, visibleCook);
  showToast('뒤집기!'); comboEl.textContent = '뒤집었어요. 반대 면을 굽는 중!';
}
function setMeatAppearance(meat, cook) {
  const frame = cook < 16 ? '0%' : cook < 42 ? '33.33%' : cook <= 66 ? '66.66%' : '100%';
  meat.style.setProperty('--sprite-frame', frame);
  meat.classList.toggle('cooking', cook >= 16 && cook < 42);
  meat.classList.toggle('perfect', cook >= 42 && cook <= 66);
  meat.classList.toggle('burnt', cook > 80);
}
function updateAssist() {
  if (!assistEnabled) return;
  const cookingMeats = [...grill.querySelectorAll('.meat')];
  const meat = cookingMeats.at(-1);
  if (!meat) { cookMeterFill.style.width = '0%'; cookMeterLabel.textContent = '불판이 비었어요'; return; }
  const underside = meat.dataset.face === 'a' ? Number(meat.dataset.cookB) : Number(meat.dataset.cookA);
  cookMeterFill.style.width = `${Math.min(100, underside)}%`;
  cookMeterLabel.textContent = underside < 28 ? '덜 익음' : underside <= 66 ? '적당함' : underside <= 80 ? '많이 익음' : '탐';
}
function showToast(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 850); }
function gameLoop(now) {
  if (running) {
    const delta = (now - lastTime) / 1000; lastTime = now; remaining = Math.max(0, remaining - delta);
    const seconds = Math.ceil(remaining); timeEl.textContent = `00:${String(seconds).padStart(2,'0')}`;
    grill.querySelectorAll('.meat').forEach(meat => {
      const underside = meat.dataset.face === 'a' ? 'cookB' : 'cookA';
      const cookingRates = [0, 1.6, 2.7, 4.1];
      const cook = Number(meat.dataset[underside]) + delta * cookingRates[heat]; meat.dataset[underside] = cook.toFixed(2);
      const visibleCook = Number(meat.dataset[meat.dataset.face === 'a' ? 'cookA' : 'cookB']);
      setMeatAppearance(meat, visibleCook);
    });
    updateAssist();
    if (!remaining) finishGame();
  }
  requestAnimationFrame(gameLoop);
}
function finishGame() {
  running = false; paused = false; pauseScreen.hidden = true; pauseButton.disabled = true; startButton.disabled = false; startButton.textContent = '다시 굽기';
  const best = Math.max(score, Number(localStorage.getItem(bestKey) || 0)); localStorage.setItem(bestKey, best); bestEl.textContent = best;
  comboEl.textContent = `오늘의 점수 ${score}점`; instructionEl.textContent = '다시 굽기를 눌러 새로운 불판을 시작하세요'; showToast('시간 종료!');
  const rankings = saveScoreToRankings(score);
  endScore.textContent = `${score.toLocaleString()}점`;
  endMessage.textContent = rankings[0] === score ? '새로운 개인 최고 기록입니다!' : '다음 판에는 더 완벽하게 구워보세요.';
  renderRankings(rankings);
  endScreen.hidden = false;
}
document.querySelectorAll('[data-heat]').forEach(button => button.addEventListener('click', () => { heat = Number(button.dataset.heat); document.querySelectorAll('[data-heat]').forEach(b => b.classList.toggle('active', b === button)); heatLabel.textContent = ['','약불','보통 불','강불'][heat]; }));
assistToggle.addEventListener('click', () => { assistEnabled = !assistEnabled; assistToggle.setAttribute('aria-pressed', assistEnabled); assistToggle.innerHTML = `익힘도 보조 <b>${assistEnabled ? '켬' : '끔'}</b>`; donenessGuide.classList.toggle('is-hidden', !assistEnabled); updateAssist(); });
window.addEventListener('contextmenu', event => {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}, { capture: true });
startButton.addEventListener('click', resetGame);
restartButton.addEventListener('click', resetGame);
pauseButton.addEventListener('click', togglePause);
resumeButton.addEventListener('click', togglePause);
window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && endScreen.hidden) { event.preventDefault(); togglePause(); }
});
fillTray(); requestAnimationFrame(gameLoop);
