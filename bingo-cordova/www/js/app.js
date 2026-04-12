import { options } from "../data/options.js";
import { tasks } from "../data/task.js";

const wartosci = ['3000', '3000', '1500', '1500', '1500', '800', '600', '600','200', '100','50'];
const turnieje = ['Mistrzostwa Polski', 'Polish Open Championships', 'WDSF World Open', 'Puchar Polski', 'WDSF International Open', 'WDSF Open', 'WDSF Rising Stars', 'A Klasa', 'B Klasa','C Klasa', 'D Klasa'];
const btn = document.getElementById('btnCalc');

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const weekInfoEl = document.getElementById("weekInfo");
const newBoardBtn = document.getElementById("newBoardBtn");
const goldenCountEl = document.getElementById("goldenCount");
const rerollBtn = document.getElementById("rerollBtn");
const rerollsInfoEl = document.getElementById("rerollsInfo");
const taskBtn = document.getElementById("taskbtn");
const taskBox = document.getElementById("task");
const taskListEl = document.getElementById("taskList");

const SIZE = 5;
const TILES_COUNT = SIZE * SIZE;

function boot() {
  init();
  if (window.cordova) {
    scheduleMondayNotification();
  }
}

if (window.cordova) {
  document.addEventListener("deviceready", boot, false);
} else {
  document.addEventListener("DOMContentLoaded", boot);
}

function getWeekKey() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
function vibrate(ms = 25) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rerollsKey() { return "bingo-rerolls-" + getWeekKey(); }
function bingoRewardKey() { return "bingo-rewarded-" + getWeekKey(); }
function goldenRewardKey() { return "golden-rewarded-" + getWeekKey(); }

function getRerolls() {
  return parseInt(localStorage.getItem(rerollsKey()) || "3", 10);
}
function setRerolls(v) {
  localStorage.setItem(rerollsKey(), String(Math.max(0, v)));
  updateRerollsUI();
}
function addRerolls(n) {
  setRerolls(getRerolls() + n);
}
function updateRerollsUI() {
  if (!rerollsInfoEl) return;
  rerollsInfoEl.textContent = `Rerolle w tym tygodniu: ${getRerolls()}`;
}

function storageKeyForWeek(weekKey) {
  return `bingo:${weekKey}`;
}

function loadBoard(weekKey) {
  const raw = localStorage.getItem(storageKeyForWeek(weekKey));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveBoard(weekKey, board) {
  localStorage.setItem(storageKeyForWeek(weekKey), JSON.stringify(board));
}

function createNewBoard(weekKey) {
  if (options.length < TILES_COUNT) {
    throw new Error(`Masz ${options.length} opcji, a potrzebujesz minimum ${TILES_COUNT}.`);
  }

  const picked = shuffle(options).slice(0, TILES_COUNT);
  const board = picked.map(text => ({ text, checked: false }));

  saveBoard(weekKey, board);
  return board;
}

function renderBoard(board) {
  boardEl.innerHTML = "";
  board.forEach((tile, idx) => {
    const div = document.createElement("div");
    div.className = "tile" + (tile.checked ? " checked" : "");
    div.textContent = tile.text;

    div.addEventListener("click", () => {
      if (rerollMode) {
    const r = getRerolls();
    if (r <= 0) {
      statusEl.textContent = "Brak rerolli w tym tygodniu 😅";
      setRerollMode(false);
      return;
    }

    const newText = pickNewTileText(board, tile.text);
    if (!newText) {
      statusEl.textContent = "Brak nowych tekstów do wylosowania (za mało opcji).";
      setRerollMode(false);
      return;
    }

    tile.text = newText;
    tile.checked = false;
    setRerolls(r - 1);
    saveBoard(getWeekKey(), board);
    setRerollMode(false);
    renderBoard(board);
    checkWin(board);
    goldenBingo(board);
    return;
  }

  tile.checked = !tile.checked;
  vibrate(tile.checked ? 30 : 15);
  const weekKey = getWeekKey();
  saveBoard(weekKey, board);
  renderBoard(board);
  checkWin(board);
  goldenBingo(board);
});

    boardEl.appendChild(div);
  });
}

function hasWonThisWeek() {
  const week = getWeekKey();
  return localStorage.getItem("bingo-won-" + week) === "1";
}
function setWonThisWeek() {
  const week = getWeekKey();
  localStorage.setItem("bingo-won-" + week, "1");
}

function checkWin(board) {
  const checked = board.map(t => t.checked);

  const lines = [];

  for (let r = 0; r < SIZE; r++) {
    lines.push([...Array(SIZE)].map((_, c) => r * SIZE + c));
  }
  for (let c = 0; c < SIZE; c++) {
    lines.push([...Array(SIZE)].map((_, r) => r * SIZE + c));
  }
  lines.push([0, 6, 12, 18, 24]);
  lines.push([4, 8, 12, 16, 20]);

  const hasBingo = lines.some(line => line.every(i => checked[i]));

  if (hasBingo) {
    statusEl.textContent = "🎉 BINGO! Wygrałeś😄";

    if (!hasWonThisWeek()) {
      setWonThisWeek();
      vibrate(120);
      startConfetti(2500);
      if (hasBingo && localStorage.getItem(bingoRewardKey()) !== "1") {
      localStorage.setItem(bingoRewardKey(), "1");
      addRerolls(1);
      }
    }
  } else {
    statusEl.textContent = "";
  }
}

function getGoldenCount() {
  return parseInt(localStorage.getItem("goldenCount") || "0", 10);
}
function setGoldenCount(v) {
  localStorage.setItem("goldenCount", String(v));
}
function updateGoldenCountUI() {
  if (!goldenCountEl) return;
  goldenCountEl.textContent = `Złote Bingo: ${getGoldenCount()}`;
}

function hasGoldenThisWeek() {
  const week = getWeekKey();
  return localStorage.getItem("bingo-golden-" + week) === "1";
}
function setGoldenThisWeek() {
  const week = getWeekKey();
  localStorage.setItem("bingo-golden-" + week, "1");
}

function init() {
  const weekKey = getWeekKey();
  weekInfoEl.textContent = `Tydzień: ${weekKey}`;
  updateGoldenCountUI();
  updateRerollsUI();

rerollBtn.addEventListener("click", () => {
  if (getRerolls() <= 0) {
    statusEl.textContent = "Brak rerolli w tym tygodniu 😅";
    return;
  }
  statusEl.textContent = "Kliknij kafelek, który chcesz przerollować.";
  setRerollMode(true);
});
  let board = loadBoard(weekKey);
  if (!board) {
    board = createNewBoard(weekKey);
  }
  if (hasGoldenThisWeek()) boardEl.classList.add("golden");
  else boardEl.classList.remove("golden");
  renderBoard(board);
  checkWin(board);
  goldenBingo(board);
 if (newBoardBtn) {
  newBoardBtn.addEventListener("click", () => {
    alert("Nową planszę dostaniesz w kolejnym tygodniu 🙂");
  });
}

    let weeklyTasks = loadTasks(weekKey);
  if (!weeklyTasks) {
    weeklyTasks = createNewTasks(weekKey);
  }

  renderTasks(weeklyTasks);

 if (taskBtn && taskBox) {
  taskBtn.addEventListener("click", () => {
    taskBox.hidden = !taskBox.hidden;
  });
}

btn.addEventListener('click', function(){

     const existCalc= document.getElementById('Calc');

     if(existCalc){
          existCalc.remove();
          return;
     }
     const bodyC = document.createElement("div");
     bodyC.id = "Calc";

     const fragment1 = document.createElement("div");
     fragment1.id = "fragment";
     const label1 = document.createElement("label");
     label1.id = "labelek";
     label1.textContent=" Podaj Swoje Miejsce: ";
     const inpucik = document.createElement("input");
     inpucik.id = "miejsce";

     const fragment2 = document.createElement("div");
     fragment2.id = "fragment2";
     const label2 = document.createElement("label");
     label2.id = "labelek";
     label2.textContent=" Rodzaj Turnieju: ";
     const wybor = document.createElement("Select");
     wybor.id = "turniej";

     const btnprzelicz = document.createElement("button");
     btnprzelicz.id = "przelicznik";
     btnprzelicz.textContent="Kalkuluj";

     const fragment3 = document.createElement("div");
     fragment3.id = "fragment3";
     const label3 = document.createElement("label");
     label3.id = "labelek";
     label3.textContent=" Punkty: "; 
     const para = document.createElement("p");
     para.id = "punkty";



     const boarding = document.getElementById('board');
     boarding.before(bodyC);
     document.getElementById('Calc').appendChild(fragment1);
     document.getElementById('fragment').appendChild(label1);
     document.getElementById('fragment').appendChild(inpucik);
     document.getElementById('Calc').appendChild(fragment2);
     document.getElementById('fragment2').appendChild(label2);
     document.getElementById('fragment2').appendChild(wybor);
     const opcja = [];
     for(let i = 0; i<turnieje.length; i++){
           opcja[i] = document.createElement("option");
           opcja[i].textContent = turnieje[i];
           opcja[i].value = wartosci[i];
           document.getElementById('turniej').appendChild(opcja[i]);
     }
     document.getElementById('Calc').appendChild(btnprzelicz);
     document.getElementById('Calc').appendChild(fragment3);
     document.getElementById('fragment3').appendChild(label3);
     document.getElementById('fragment3').appendChild(para);

     document.getElementById('przelicznik').addEventListener('click', function() {

     const przeliczone = Math.round( document.getElementById('turniej').value * (1/Math.sqrt(document.getElementById('miejsce').value) + 1.05 ** (1-document.getElementById('miejsce').value))/2);
     document.getElementById('punkty').textContent=przeliczone;
     });
});
}

function taskStorageKeyForWeek(weekKey) {
  return `bingo-tasks:${weekKey}`;
}

function loadTasks(weekKey) {
  const raw = localStorage.getItem(taskStorageKeyForWeek(weekKey));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveTasks(weekKey, weeklyTasks) {
  localStorage.setItem(taskStorageKeyForWeek(weekKey), JSON.stringify(weeklyTasks));
}

function createNewTasks(weekKey) {
  if (tasks.length < 3) {
    throw new Error(`Masz ${tasks.length} zadań, a potrzebujesz minimum 3.`);
  }

  const picked = shuffle(tasks).slice(0, 3);
  const weeklyTasks = picked.map(text => ({ text, checked: false }));

  saveTasks(weekKey, weeklyTasks);
  return weeklyTasks;
}

function renderTasks(weeklyTasks) {
  taskListEl.innerHTML = "";

  weeklyTasks.forEach((task, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "task-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `task-${index}`;
    checkbox.checked = task.checked;
    

    const label = document.createElement("label");
    label.htmlFor = `task-${index}`;
    label.textContent = task.text;

    checkbox.addEventListener("change", () => {
      task.checked = checkbox.checked;
      saveTasks(getWeekKey(), weeklyTasks);
    
    });

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);
    taskListEl.appendChild(wrapper);
  });
}

const confettiCanvas = document.getElementById("confetti");
const ctx = confettiCanvas.getContext("2d");
let confettiParticles = [];
let confettiRunning = false;

function resizeConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeConfetti);
resizeConfetti();

function startConfetti(durationMs = 2500) {
  if (confettiRunning) return;
  confettiRunning = true;

  confettiCanvas.style.display = "block";
  confettiParticles = Array.from({ length: 160 }, () => ({
    x: Math.random() * confettiCanvas.width,
    y: -20 - Math.random() * confettiCanvas.height * 0.3,
    vx: (Math.random() - 0.5) * 3,
    vy: 2 + Math.random() * 4,
    r: 3 + Math.random() * 5,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.2,
    a: 0.8 + Math.random() * 0.2
  }));

  const start = performance.now();

  function tick(now) {
    const t = now - start;
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    ctx.fillStyle = "#D4AF37";
    for (const p of confettiParticles) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.vy += 0.02; 
      p.vx *= 0.999;

      ctx.save();
      ctx.globalAlpha = p.a * (0.7 + 0.3 * Math.abs(Math.sin(p.rot * 6)));
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
      ctx.restore();

      if (p.x < -50) p.x = confettiCanvas.width + 50;
      if (p.x > confettiCanvas.width + 50) p.x = -50;
    }

    if (t < durationMs) {
      requestAnimationFrame(tick);
    } else {
      confettiCanvas.style.display = "none";
      confettiRunning = false;
    }
  }

  requestAnimationFrame(tick);
}

function nextMondayAt(hour = 9, minute = 0) {
  const now = new Date();
  const d = new Date(now);
  d.setSeconds(0, 0);
  d.setHours(hour, minute, 0, 0);

  const day = d.getDay();
  let daysToAdd = (8 - day) % 7;
  if (daysToAdd === 0 && d <= now) daysToAdd = 7; 
    d.setDate(d.getDate() + daysToAdd);
  return d;
}

function scheduleMondayNotification() {
  if (!window.cordova || !cordova.plugins || !cordova.plugins.notification) return;

  const notif = cordova.plugins.notification.local;

  notif.requestPermission((granted) => {
    if (!granted) return;

    const first = nextMondayAt(9, 0);

    notif.cancel(1001, () => {
      notif.schedule({
        id: 1001,
        title: "Nowa plansza Bingo!",
        text: "Wygenerowano nową planszę na ten tydzień 🎯",
        trigger: { firstAt: first, every: "week" },
        foreground: true
      });
    });
  });
}

let rerollMode = false;

function setRerollMode(on) {
  rerollMode = on;
  boardEl.classList.toggle("reroll-mode", on);
  if (rerollBtn) rerollBtn.textContent = on ? "Wybierz kafelek…" : "🎲 Reroll kafelka";
}

function pickNewTileText(board, oldText) {
  const used = new Set(board.map(t => t.text));
  used.delete(oldText);

  const candidates = options.filter(t => !used.has(t));
  if (candidates.length === 0) return null;

  return candidates[Math.floor(Math.random() * candidates.length)];
}

function goldenBingo(board) {
  const allChecked = board.every(t => t.checked);

  if (!allChecked) return;

  if (hasGoldenThisWeek()) return;

  setGoldenThisWeek();
  boardEl.classList.add("golden");

  const next = getGoldenCount() + 1;
  setGoldenCount(next);
  updateGoldenCountUI();

  statusEl.textContent = `✨ ZŁOTE BINGO! (${next}) ✨`;
  if (localStorage.getItem(goldenRewardKey()) !== "1") {
  localStorage.setItem(goldenRewardKey(), "1");
  addRerolls(3);
  }
  vibrate(200);
  startConfetti(5000);
}
