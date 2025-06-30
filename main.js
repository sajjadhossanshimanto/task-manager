// --- Date-dependent Task Storage ---
function getTodayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
let selectedDate = getTodayStr();
let migrated = localStorage.getItem('tasksMigratedV2');
let oldTaskList = JSON.parse(localStorage.getItem("taskList")) || [];
let taskListByDate = JSON.parse(localStorage.getItem("taskListByDate")) || {};

// Migrate old tasks to today if not yet migrated
if (!migrated && oldTaskList.length > 0) {
  taskListByDate[selectedDate] = (taskListByDate[selectedDate] || []).concat(oldTaskList);
  localStorage.setItem("taskListByDate", JSON.stringify(taskListByDate));
  localStorage.removeItem("taskList");
  localStorage.setItem('tasksMigratedV2', '1');
}

// Always use date-based storage from now
function getTaskList() {
  return taskListByDate[selectedDate] || [];
}
function setTaskList(list) {
  taskListByDate[selectedDate] = list;
  localStorage.setItem("taskListByDate", JSON.stringify(taskListByDate));
}

// --- Category logic remains unchanged ---
let categories = JSON.parse(localStorage.getItem("categories")) || [
  { name: "General", color: "#00bfa5" }
];
function saveCategories() {
  localStorage.setItem("categories", JSON.stringify(categories));
}

function updateCurrentTime() {
  const now = new Date();
  document.getElementById("currentTime").innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  renderTasks();
}

// --- UI LABEL FOR SELECTED DATE ---
function updateSelectedDateLabel() {
  let label = document.getElementById('selectedDateLabel');
  if (!label) {
    label = document.createElement('div');
    label.id = 'selectedDateLabel';
    label.style = 'font-size:1.1em;font-weight:500;margin:10px 0 0 0;color:var(--accent-color)';
    document.querySelector('.task-column').insertBefore(label, document.getElementById('taskList'));
  }
  const d = new Date(selectedDate);
  label.textContent = `Tasks for ${d.toLocaleDateString(undefined, {year:'numeric',month:'short',day:'numeric'})}`;
}

// --- Collapse Completed Tasks Feature ---
let collapseCompleted = JSON.parse(localStorage.getItem('collapseCompleted')) || false;

function setCollapseCompleted(val) {
  collapseCompleted = val;
  localStorage.setItem('collapseCompleted', JSON.stringify(val));
  renderTasks();
}

function renderCollapseCompletedBtn() {
  let btn = document.getElementById('collapseCompletedBtn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'collapseCompletedBtn';
    btn.className = 'btn btn-secondary btn-sm mb-2';
    btn.style = 'margin-bottom:8px;';
    const taskCol = document.querySelector('.task-column');
    taskCol.insertBefore(btn, document.getElementById('taskList'));
  }
  btn.textContent = collapseCompleted ? 'Show Completed Tasks' : 'Collapse Completed Tasks';
  btn.onclick = () => setCollapseCompleted(!collapseCompleted);
}

function renderTasks() {
  renderCollapseCompletedBtn();
  const ul = document.getElementById("taskList");
  ul.innerHTML = "";
  let startTime = new Date();
  let taskList = getTaskList();
  taskList.forEach((task, index) => {
    if (collapseCompleted && task.completed) return; // Hide completed if collapsed
    const li = document.createElement("li");
    li.className = task.completed ? "completed" : "";
    const cat = categories.find(c => c.name === task.category);
    if (cat) li.style.borderLeft = `8px solid ${cat.color}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.onchange = () => {
      task.completed = checkbox.checked;
      setTaskList(taskList);
      renderTasks();
    };

    const textSpan = document.createElement("span");
    textSpan.className = "task-text";

    const nameSpan = document.createElement("span");
    nameSpan.className = "task-name";
    nameSpan.textContent = task.name;
    // Enable editing task name on double click
    nameSpan.ondblclick = () => {
      if (task.completed) return;
      const input = document.createElement("input");
      input.type = "text";
      input.value = task.name;
      input.style.width = Math.max(80, task.name.length * 10) + "px";
      input.style.fontSize = "1em";
      nameSpan.textContent = "";
      nameSpan.appendChild(input);
      input.focus();
      input.addEventListener("blur", () => {
        const newName = input.value.trim();
        if (newName) {
          task.name = newName;
          setTaskList(taskList);
          renderTasks();
        } else {
          renderTasks();
        }
      });
      input.addEventListener("keydown", e => {
        if (e.key === "Enter") input.blur();
        if (e.key === "Escape") renderTasks();
      });
    };

    const timeSpan = document.createElement("span");
    timeSpan.className = "task-time";

    const endTime = new Date(startTime.getTime() + task.duration * 60000);
    const hrs = Math.floor(task.duration / 60);
    const mins = task.duration % 60;
    const durationStr = `${hrs > 0 ? hrs + 'h ' : ''}${mins}m`;
    if (!task.completed) {
      timeSpan.textContent = `${durationStr} — Ends: ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      startTime = endTime;
    } else {
      timeSpan.textContent = `${durationStr}`;
    }

    timeSpan.ondblclick = () => {
      if (task.completed) return;
      const input = document.createElement("input");
      input.type = "number";
      input.min = "1";
      input.value = task.duration;
      input.style.width = "60px";
      input.style.fontSize = "0.85em";
      timeSpan.textContent = "";
      timeSpan.appendChild(input);
      input.focus();
      input.addEventListener("blur", () => {
        const newDuration = parseInt(input.value);
        if (!isNaN(newDuration) && newDuration > 0) {
          task.duration = newDuration;
          setTaskList(taskList);
          renderTasks();
        } else {
          renderTasks();
        }
      });
      input.addEventListener("keydown", e => {
        if (e.key === "Enter") input.blur();
        if (e.key === "Escape") renderTasks();
      });
    };

    textSpan.appendChild(nameSpan);
    textSpan.appendChild(timeSpan);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.innerHTML = "🗑️";
    deleteBtn.onclick = () => {
      taskList.splice(index, 1);
      setTaskList(taskList);
      renderTasks();
    };

    li.appendChild(checkbox);
    li.appendChild(textSpan);
    li.appendChild(deleteBtn);
    ul.appendChild(li);
  });
  
  renderTaskSummary();
  updateSelectedDateLabel();
}

function renderTaskSummary() {
  const summaryDiv = document.getElementById('taskSummaryContent');
  if (!summaryDiv) return;
  const taskList = getTaskList();
  if (!taskList.length) {
    summaryDiv.innerHTML = '<span style="color:#aaa;">No tasks for this date.</span>';
    return;
  }
  let totalMinutes = 0, completedMinutes = 0, leftMinutes = 0;
  let catMap = {};
  taskList.forEach(task => {
    totalMinutes += task.duration;
    if (!catMap[task.category]) catMap[task.category] = { total: 0, completed: 0 };
    catMap[task.category].total += task.duration;
    if (task.completed) {
      completedMinutes += task.duration;
      catMap[task.category].completed += task.duration;
    } else {
      leftMinutes += task.duration;
    }
  });
  const fmt = m => `${Math.floor(m/60)}h ${(m%60)}m`;
  let html = `<div class='row mb-2'>
    <div class='col-6'><b>Total Task Time:</b></div><div class='col-6 text-end'>${fmt(totalMinutes)}</div>
  </div>`;
  // Combined progress bar for completed/left
  const percent = totalMinutes ? Math.round((completedMinutes/totalMinutes)*100) : 0;
  html += `<div class='progress mb-1' style='height:14px;background:#222;'>
    <div class='progress-bar' role='progressbar' style='width:${percent}%;background:var(--accent-color);' aria-valuenow='${percent}' aria-valuemin='0' aria-valuemax='100'>
    </div>
  </div>
  <div class='d-flex justify-content-between mb-2' style='font-size:0.98em;'>
    <span style='color:#8bc34a'><b>Completed:</b> ${fmt(completedMinutes)}</span>
    <span style='color:#ffc107'><b>Left:</b> ${fmt(leftMinutes)}</span>
    <span style='color:#aaa;'>${percent}%</span>
  </div>`;
  html += `<div class='mb-2'><b>By Category:</b></div>`;
  html += `<div style='max-height:110px;overflow-y:auto;'>`;
  Object.entries(catMap).forEach(([cat, data]) => {
    const catObj = categories.find(c => c.name === cat);
    const color = catObj ? catObj.color : '#fff';
    html += `<div class='d-flex align-items-center mb-1' style='gap:8px;'>
      <span style='display:inline-block;width:14px;height:14px;border-radius:50%;background:${color};border:1px solid #fff;'></span>
      <span style='flex:1;'>${cat}</span>
      <span style='color:#8bc34a;'>${fmt(data.completed)}</span>
      <span style='color:#aaa;'>/</span>
      <span style='color:#ffc107;'>${fmt(data.total)}</span>
    </div>`;
  });
  html += `</div>`;
  summaryDiv.innerHTML = html;
}

function updateCategoryDropdown() {
  // Update sidebar list
  const list = document.getElementById("categoryList");
  list.innerHTML = categories.map((cat, idx) => `
    <div class="category-tag d-flex justify-content-between align-items-center">
      <div class="d-flex align-items-center">
        <div class="category-color" style="background:${cat.color}"></div>
        <span>${cat.name}</span>
      </div>
      ${cat.name !== "General" ? `<button class="btn btn-sm btn-outline-danger ms-2 py-0 px-2" onclick="deleteCategory(${idx})">🗑️</button>` : ""}
    </div>
  `).join("");

  // ✅ Update dropdown list
  const dropdown = document.getElementById("taskCategory");
  dropdown.innerHTML = categories.map(cat => `
    <option value="${cat.name}">${cat.name}</option>
  `).join("");
}

function handleTaskForm(e) {
  e.preventDefault();
  const name = document.getElementById('taskName').value;
  const duration = parseInt(document.getElementById('taskDuration').value);
  const category = document.getElementById('taskCategory').value;
  if (!name || isNaN(duration) || duration <= 0) {
    alert("Invalid input");
    return;
  }
  let taskList = getTaskList();
  taskList.push({ name, duration, completed: false, category });
  setTaskList(taskList);
  renderTasks();
  e.target.reset();
}


new Sortable(document.getElementById('taskList'), {
  animation: 150,
  onEnd: function(evt) {
    let taskList = getTaskList();
    const movedItem = taskList.splice(evt.oldIndex, 1)[0];
    taskList.splice(evt.newIndex, 0, movedItem);
    setTaskList(taskList);
    renderTasks();
  }
});

const paletteColors = ["#00bfa5", "#e91e63", "#ffc107", "#3f51b5", "#8bc34a", "#ff5722", "#9c27b0"];
let selectedColor = paletteColors[0];

function renderColorPalette() {
  const container = document.getElementById("colorPalette");
  container.innerHTML = "";
  paletteColors.forEach(color => {
    const swatch = document.createElement("div");
    swatch.className = "color-swatch";
    swatch.style.backgroundColor = color;
    if (color === selectedColor) swatch.classList.add("selected");
    swatch.onclick = () => {
      selectedColor = color;
      renderColorPalette();
    };
    container.appendChild(swatch);
  });

  const custom = document.getElementById("customColor");
  custom.value = selectedColor;
  custom.onchange = () => {
    selectedColor = custom.value;
    renderColorPalette();
  };
}

document.getElementById("categoryForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("newCategoryName");
  const name = nameInput.value.trim();
  if (!name) return;

  if (categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
    alert("Category already exists!");
    return;
  }

  categories.push({ name, color: selectedColor });
  saveCategories();
  updateCategoryDropdown();
  nameInput.value = "";
});
// Fix deleteCategory to check all dates for usage
function deleteCategory(index) {
  const catToDelete = categories[index].name;
  // Check all dates for tasks using this category
  let used = false;
  for (const date in taskListByDate) {
    if (Array.isArray(taskListByDate[date]) && taskListByDate[date].some(task => task.category === catToDelete)) {
      used = true;
      break;
    }
  }
  if (used) {
    alert("This category is used in tasks. Please reassign or delete those tasks first.");
    return;
  }
  if (!confirm(`Are you sure you want to delete category "${catToDelete}"?`)) return;
  categories.splice(index, 1);
  saveCategories();
  updateCategoryDropdown();
}
// Make deleteCategory globally accessible for inline onclick
window.deleteCategory = deleteCategory;


// --- Multi-Timer Logic ---
let timers = JSON.parse(localStorage.getItem('timers')) || [
  { total: 0, left: 0, state: 'idle' }
];
let activeTimerIdx = 0;
let timerInterval = null;

function saveTimers() {
  localStorage.setItem('timers', JSON.stringify(timers));
}

function updateTimerNavInfo() {
  document.getElementById('timerNavInfo').textContent = `Timer ${activeTimerIdx+1} / ${timers.length}`;
}

function updateTimerDisplay() {
  const t = timers[activeTimerIdx];
  const left = t.left;
  const hrs = String(Math.floor(left / 3600)).padStart(2, '0');
  const mins = String(Math.floor((left % 3600) / 60)).padStart(2, '0');
  const secs = String(left % 60).padStart(2, '0');
  const display = document.getElementById('timerDisplay');
  display.innerHTML = `<span class='timer-part' data-part='hrs'>${hrs}</span>:<span class='timer-part' data-part='mins'>${mins}</span>:<span class='timer-part' data-part='secs'>${secs}</span>`;
  if (t.state === 'running') {
    document.title = `${hrs}:${mins}:${secs} - Task Manager`;
  } else {
    document.title = 'Task Manager';
  }
  updateTimerNavInfo();
}

function setTimerBtns() {
  const btnGroup = document.getElementById('timerBtnGroup');
  btnGroup.innerHTML = '';
  const t = timers[activeTimerIdx];
  if (t.state === 'idle' || t.state === 'paused') {
    // Start button
    const startBtn = document.createElement('button');
    startBtn.className = 'btn btn-success btn-circle';
    startBtn.title = 'Start';
    startBtn.style = 'border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;';
    startBtn.innerHTML = "<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' fill='none' stroke='currentColor' stroke-width='2' viewBox='0 0 24 24'><polygon points='5 3 19 12 5 21 5 3'/></svg>";
    startBtn.onclick = startTimer;
    btnGroup.appendChild(startBtn);
  }
  if (t.state === 'running') {
    // Pause button
    const pauseBtn = document.createElement('button');
    pauseBtn.className = 'btn btn-warning btn-circle';
    pauseBtn.title = 'Pause';
    pauseBtn.style = 'border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;';
    pauseBtn.innerHTML = "<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' fill='none' stroke='currentColor' stroke-width='2' viewBox='0 0 24 24'><rect x='6' y='4' width='4' height='16'/><rect x='14' y='4' width='4' height='16'/></svg>";
    pauseBtn.onclick = pauseTimer;
    btnGroup.appendChild(pauseBtn);
    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn-danger btn-circle';
    resetBtn.title = 'Reset';
    resetBtn.style = 'border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;';
    resetBtn.innerHTML = "<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' fill='none' stroke='currentColor' stroke-width='2' viewBox='0 0 24 24'><path d='M1 4v6h6'/><path d='M3.51 15a9 9 0 1 0 2.13-9.36L1 10'/></svg>";
    resetBtn.onclick = resetTimer;
    btnGroup.appendChild(resetBtn);
  }
  if (t.state === 'paused') {
    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn-danger btn-circle';
    resetBtn.title = 'Reset';
    resetBtn.style = 'border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;';
    resetBtn.innerHTML = "<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' fill='none' stroke='currentColor' stroke-width='2' viewBox='0 0 24 24'><path d='M1 4v6h6'/><path d='M3.51 15a9 9 0 1 0 2.13-9.36L1 10'/></svg>";
    resetBtn.onclick = resetTimer;
    btnGroup.appendChild(resetBtn);
  }
}

function startTimer() {
  const t = timers[activeTimerIdx];
  if (t.left <= 0) return;
  t.state = 'running';
  setTimerBtns();
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    t.left = Math.max(0, t.left - 1);
    updateTimerDisplay();
    if (t.left <= 0) {
      clearInterval(timerInterval);
      t.state = 'idle';
      // Reset timer to original time when it stops
      t.left = t.total;
      updateTimerDisplay();
      setTimerBtns();
      const sound = document.getElementById('timerEndSound');
      sound.currentTime = 0;
      sound.play();
      // Show stop sound button
      document.getElementById('stopSoundBtn').style.display = '';
    }
    saveTimers();
  }, 1000);
  saveTimers();
}

function pauseTimer() {
  const t = timers[activeTimerIdx];
  t.state = 'paused';
  clearInterval(timerInterval);
  setTimerBtns();
  saveTimers();
}

function resetTimer() {
  const t = timers[activeTimerIdx];
  t.state = 'idle';
  clearInterval(timerInterval);
  t.left = t.total;
  updateTimerDisplay();
  setTimerBtns();
  saveTimers();
}

function switchTimer(idx) {
  if (idx < 0 || idx >= timers.length) return;
  clearInterval(timerInterval);
  activeTimerIdx = idx;
  updateTimerDisplay();
  setTimerBtns();
  saveTimers();
}

function addTimer() {
  timers.push({ total: 0, left: 0, state: 'idle' });
  switchTimer(timers.length - 1);
}

function removeTimer() {
  if (timers.length <= 1) return;
  timers.splice(activeTimerIdx, 1);
  if (activeTimerIdx >= timers.length) activeTimerIdx = timers.length - 1;
  switchTimer(activeTimerIdx);
}

document.getElementById('timerPrev').onclick = () => {
  switchTimer((activeTimerIdx - 1 + timers.length) % timers.length);
};
document.getElementById('timerNext').onclick = () => {
  switchTimer((activeTimerIdx + 1) % timers.length);
};
document.getElementById('addTimerBtn').onclick = addTimer;
document.getElementById('removeTimerBtn').onclick = removeTimer;
// Double click to set timer part
document.getElementById('timerDisplay').addEventListener('dblclick', function(e) {
    if (!e.target.classList.contains('timer-part')) return;
    const part = e.target.getAttribute('data-part');
    const current = e.target.textContent;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = part === 'hrs' ? '23' : '59';
    input.value = parseInt(current, 10);
    input.style.textAlign = 'center';
    input.style.background = '#222';
    input.style.color = '#fff';
    input.style.border = '1px solid #555';
    input.style.borderRadius = '6px';
    e.target.replaceWith(input);
    input.focus();
    input.select();
    input.addEventListener('blur', finishEdit);
    input.addEventListener('keydown', function(ev) {
      if (ev.key === 'Enter') input.blur();
      if (ev.key === 'Escape') finishEdit();
    });

    function finishEdit() {
      let val = parseInt(input.value, 10);
      if (isNaN(val) || val < 0) val = 0;
      if (part === 'hrs') val = Math.min(val, 23);
      else val = Math.min(val, 59);
    let t = timers[activeTimerIdx];
    let hrs = Math.floor(t.left / 3600);
    let mins = Math.floor((t.left % 3600) / 60);
    let secs = t.left % 60;
      if (part === 'hrs') hrs = val;
      if (part === 'mins') mins = val;
      if (part === 'secs') secs = val;
    t.total = hrs * 3600 + mins * 60 + secs;
    t.left = t.total;
    t.state = 'idle';
      updateTimerDisplay();
      setTimerBtns();
    saveTimers();
  }
});

// --- Stop Sound Button logic ---
document.addEventListener('DOMContentLoaded', function() {
  const stopSoundBtn = document.getElementById('stopSoundBtn');
  const timerEndSound = document.getElementById('timerEndSound');
  if (stopSoundBtn && timerEndSound) {
    stopSoundBtn.onclick = function() {
      timerEndSound.pause();
      timerEndSound.currentTime = 0;
      stopSoundBtn.style.display = 'none';
    };
    timerEndSound.addEventListener('ended', function() {
      stopSoundBtn.style.display = 'none';
    });
  }
});

// --- Calendar Logic: Add date selection ---
// Calendar Logic
const calendarMonth = document.getElementById('calendarMonth');
const calendarDays = document.getElementById('calendarDays');
const calendarDates = document.getElementById('calendarDates');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
let calDate = new Date();
calDate.setDate(1);

function renderCalendar() {
  calendarMonth.textContent = calDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  calendarDays.innerHTML = dayNames.map(d => `<th class='text-center' style='font-size:0.95em;color:#aaa;'>${d}</th>`).join('');
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let html = '<tr>';
  for (let i = 0; i < firstDay; i++) html += '<td></td>';
  for (let d = 1; d <= daysInMonth; d++) {
    const today = new Date();
    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    // Use local time for date string to avoid timezone issues
    const thisDate = new Date(year, month, d, 12, 0, 0, 0); // noon to avoid DST issues
    const thisDateStr = thisDate.toISOString().slice(0, 10);
    const isSelected = thisDateStr === selectedDate;

    let cellStyle = `padding:2px;cursor:pointer;position:relative;`;
    let circleBg = '';
    let circleColor = '';
    
    // Check if there are tasks for this date
    const hasTasks = Array.isArray(taskListByDate[thisDateStr]) && taskListByDate[thisDateStr].length > 0;
    if (isSelected) {
      circleBg = 'background: var(--accent-color); color: #fff;';
      circleColor = 'color: #fff;';
    } else if (isToday) {
      circleBg = 'background: #fff; color: var(--accent-color);';
      circleColor = 'color: var(--accent-color);';
    } else {
      circleBg = 'background: transparent; color: #fff;';
      circleColor = 'color: #fff;';
    }
    html += `<td class='text-center calendar-date-cell' style='${cellStyle}' data-date='${thisDateStr}'>
      <div style='display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;${circleBg};font-weight:600;transition:background 0.2s, color 0.2s;box-shadow:${isSelected ? '0 0 0 2px #fff' : ''};${hasTasks ? 'border:2px solid var(--accent-color);' : ''} ${circleColor}'>${d}</div>
    </td>`;
    if ((firstDay + d) % 7 === 0 && d !== daysInMonth) html += '</tr><tr>';
  }
  const lastDay = (firstDay + daysInMonth) % 7;
  for (let i = lastDay; i > 0 && i < 7; i++) html += '<td></td>';
  html += '</tr>';
  calendarDates.innerHTML = html;
  // Add click handlers for date selection
  document.querySelectorAll('.calendar-date-cell').forEach(cell => {
    cell.onclick = function() {
      selectedDate = this.getAttribute('data-date');
      renderTasks();
      renderCalendar();
      updateSelectedDateLabel();
    };
  });
}

prevMonthBtn.onclick = () => {
  calDate.setMonth(calDate.getMonth() - 1);
  renderCalendar();
};

nextMonthBtn.onclick = () => {
  calDate.setMonth(calDate.getMonth() + 1);
  renderCalendar();
};

// --- Initial render ---
updateTimerDisplay();
setTimerBtns();
updateTimerNavInfo();
renderColorPalette();

updateCurrentTime();
setInterval(updateCurrentTime, 60000);
updateCategoryDropdown();
renderTasks();
renderCalendar();
