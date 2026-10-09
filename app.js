const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FULL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHIFTS = [
  { id: "morning", label: "Morning", start: 7, end: 15, time: "7a–3p" },
  { id: "evening", label: "Evening", start: 15, end: 23, time: "3p–11p" },
  { id: "night", label: "Night", start: 23, end: 31, time: "11p–7a" },
];

const ROLES = [
  { id: "front", name: "Front desk", className: "front" },
  { id: "rooms", name: "Housekeeping", className: "rooms" },
  { id: "dining", name: "Food & beverage", className: "dining" },
  { id: "facilities", name: "Facilities", className: "facilities" },
  { id: "security", name: "Security", className: "security" },
];

const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const allDays = [0, 1, 2, 3, 4, 5, 6];
let weekStart = new Date(2026, 9, 12);
let occupancy = [61, 67, 82, 88, 79, 94, 71];
let schedule = null;
let notifyMode = "weekly";
let listView = false;
let toastTimer;

let staff = [
  { name: "Maya Chen", role: "front", skills: ["front"], dayOff: 2, maxHours: 40, tone: 0 },
  { name: "Ethan Brooks", role: "front", skills: ["front"], dayOff: 0, maxHours: 40, tone: 1 },
  { name: "Sofia Patel", role: "front", skills: ["front", "dining"], dayOff: 4, maxHours: 40, tone: 2 },
  { name: "Leo Martin", role: "front", skills: ["front"], dayOff: 6, maxHours: 40, tone: 3 },
  { name: "Nina Alvarez", role: "front", skills: ["front", "security"], dayOff: 1, maxHours: 40, tone: 1 },
  { name: "Amara Wilson", role: "rooms", skills: ["rooms"], dayOff: 0, maxHours: 40, tone: 2 },
  { name: "Noah Kim", role: "rooms", skills: ["rooms"], dayOff: 3, maxHours: 40, tone: 0 },
  { name: "Isla Thompson", role: "rooms", skills: ["rooms"], dayOff: 5, maxHours: 40, tone: 3 },
  { name: "Omar Hassan", role: "rooms", skills: ["rooms", "dining"], dayOff: 2, maxHours: 40, tone: 1 },
  { name: "Grace Park", role: "dining", skills: ["dining"], dayOff: 1, maxHours: 40, tone: 3 },
  { name: "Mateo Rivera", role: "dining", skills: ["dining"], dayOff: 4, maxHours: 40, tone: 0 },
  { name: "Ava Johnson", role: "dining", skills: ["dining", "front"], dayOff: 6, maxHours: 40, tone: 2 },
  { name: "Oliver Reed", role: "dining", skills: ["dining"], dayOff: 3, maxHours: 40, tone: 1 },
  { name: "Zara Ali", role: "facilities", skills: ["facilities"], dayOff: 5, maxHours: 40, tone: 2 },
  { name: "Finn Cooper", role: "facilities", skills: ["facilities", "security"], dayOff: 2, maxHours: 40, tone: 0 },
  { name: "Mila Foster", role: "facilities", skills: ["facilities"], dayOff: 1, maxHours: 40, tone: 3 },
  { name: "Theo Bennett", role: "security", skills: ["security"], dayOff: 1, maxHours: 40, tone: 3 },
  { name: "Lily Morgan", role: "security", skills: ["security"], dayOff: 4, maxHours: 40, tone: 2 },
  { name: "Ben Carter", role: "security", skills: ["security"], dayOff: 6, maxHours: 40, tone: 0 },
];

function formatDate(date, options) {
  return new Intl.DateTimeFormat("en", options).format(date);
}

function getWeekLabel() {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  const left = formatDate(weekStart, { month: "long", day: "numeric" });
  const right = formatDate(end, sameMonth ? { day: "numeric", year: "numeric" } : { month: "long", day: "numeric", year: "numeric" });
  return `${left}–${right}`;
}

function renderWeekLabel() {
  document.querySelector("#weekLabel").textContent = getWeekLabel();
  document.querySelector(".week-date div span").innerHTML = `Week ${getWeekNumber(weekStart)} <b>·</b> 7 days`;
  document.querySelector("#messageDate").textContent = `For ${formatDate(weekStart, { month: "short", day: "numeric" })}–${formatDate(new Date(weekStart.getTime() + 6 * 86400000), { day: "numeric" })}`;
  const dailySelect = document.querySelector("#notificationDay");
  if (dailySelect) {
    const selectedDay = dailySelect.value || "0";
    dailySelect.innerHTML = FULL_DAYS.map((day, index) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + index);
      return `<option value="${index}">${day}, ${formatDate(date, { month: "short", day: "numeric" })}</option>`;
    }).join("");
    dailySelect.value = selectedDay;
  }
}

function getWeekNumber(date) {
  const target = new Date(date.valueOf());
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  return 1 + Math.round(((target - firstThursday) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
}

function roleById(id) {
  return ROLES.find((role) => role.id === id) ?? ROLES[0];
}

function demandFor(day, shiftId, roleId) {
  const occ = occupancy[day];
  const weekend = day >= 5;
  if (roleId === "front") {
    if (shiftId === "night") return 1;
    return occ >= 88 && (shiftId === "morning" || shiftId === "evening") ? 2 : 1;
  }
  if (roleId === "rooms") {
    if (shiftId === "morning") return occ >= 80 ? 2 : 1;
    if (shiftId === "evening") return weekend && occ >= 75 ? 1 : 0;
    return 0;
  }
  if (roleId === "dining") {
    if (shiftId === "night") return 0;
    if (shiftId === "morning") return occ >= 86 ? 2 : 1;
    return occ >= 78 ? 2 : 1;
  }
  if (roleId === "facilities") {
    if (shiftId === "morning") return 1;
    return weekend && shiftId === "evening" ? 1 : 0;
  }
  if (roleId === "security") {
    if (shiftId === "night") return 1;
    return weekend && shiftId === "evening" ? 1 : 0;
  }
  return 0;
}

function buildSlots() {
  const slots = [];
  for (let day = 0; day < 7; day += 1) {
    for (const shift of SHIFTS) {
      for (const role of ROLES) {
        const count = demandFor(day, shift.id, role.id);
        for (let position = 0; position < count; position += 1) {
          slots.push({ day, shift, role, position });
        }
      }
    }
  }
  // Cover roles with the fewest qualified employees first, then busier days.
  slots.sort((a, b) => {
    const poolA = staff.filter((person) => person.skills.includes(a.role.id)).length;
    const poolB = staff.filter((person) => person.skills.includes(b.role.id)).length;
    return poolA - poolB || occupancy[b.day] - occupancy[a.day] || a.day - b.day || a.shift.start - b.shift.start;
  });
  return slots;
}

function absoluteShift(slot) {
  const start = slot.day * 24 + slot.shift.start;
  return { start, end: start + 8 };
}

function canTakeShift(person, slot, assigned) {
  if (!person.skills.includes(slot.role.id) || person.dayOff === slot.day) return false;
  if (person.hours + 8 > person.maxHours) return false;
  if (person.daysWorked.has(slot.day)) return false;
  const candidate = absoluteShift(slot);
  for (const previous of assigned) {
    const existing = absoluteShift(previous);
    const restBefore = candidate.start - existing.end;
    const restAfter = existing.start - candidate.end;
    if (restBefore >= 0 && restBefore < 11) return false;
    if (restAfter >= 0 && restAfter < 11) return false;
  }
  return true;
}

function generateSchedule() {
  const roster = Array.from({ length: 7 }, (_, day) => ({ day, shifts: {} }));
  for (const day of allDays) {
    for (const shift of SHIFTS) roster[day].shifts[shift.id] = [];
  }
  staff.forEach((person) => {
    person.hours = 0;
    person.daysWorked = new Set();
    person.assignments = [];
  });

  for (const slot of buildSlots()) {
    const candidates = staff.filter((person) => canTakeShift(person, slot, person.assignments));
    candidates.sort((a, b) => {
      const skillMatchA = a.role === slot.role.id ? 0 : 1;
      const skillMatchB = b.role === slot.role.id ? 0 : 1;
      return a.hours - b.hours || a.assignments.length - b.assignments.length || skillMatchA - skillMatchB || a.name.localeCompare(b.name);
    });
    const person = candidates[0] ?? null;
    const assignment = { ...slot, person };
    roster[slot.day].shifts[slot.shift.id].push(assignment);
    if (person) {
      person.hours += 8;
      person.daysWorked.add(slot.day);
      person.assignments.push(slot);
    }
  }
  schedule = roster;
  renderSchedule();
  renderMetrics();
  renderTeam();
  renderNotification();
  document.querySelector(".last-saved").innerHTML = '<span class="saved-dot"></span> Roster generated just now';
  showToast("Roster generated with availability and rest checks");
}

function roleClass(roleId) {
  return roleById(roleId).className;
}

function renderSchedule() {
  const grid = document.querySelector("#scheduleGrid");
  grid.classList.toggle("list-mode", listView);
  if (!schedule) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-illustration">▦</div><strong>Your next week, at a glance</strong><p>Generate a roster to see shift assignments matched to occupancy and availability.</p><button class="button button-primary" id="emptyGenerateButton">Generate first roster</button></div>';
    document.querySelector("#emptyGenerateButton").addEventListener("click", generateSchedule);
    return;
  }
  grid.innerHTML = schedule.map((dayPlan) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayPlan.day);
    const dayHeader = `<div class="day-header"><strong>${DAY_NAMES[dayPlan.day]} <span class="day-date">${date.getDate()}</span></strong><span>${formatDate(date, { month: "short" })}</span><span class="occupancy-pill">${occupancy[dayPlan.day]}% occ.</span></div>`;
    const shiftHtml = SHIFTS.map((shift) => {
      const assignments = dayPlan.shifts[shift.id];
      if (assignments.length === 0) return `<div class="shift-block"><div class="shift-heading">${shift.label}<span class="shift-count">—</span></div><div class="assignment-chip unfilled"><strong>No coverage needed</strong><span>${shift.time}</span></div></div>`;
      const covered = assignments.filter((item) => item.person).length;
      const chips = assignments.map((item) => {
        const role = item.role.name;
        if (!item.person) return `<div class="assignment-chip unfilled"><strong>Position open</strong><span>${role} · ${shift.time}</span></div>`;
        const safeName = escapeHtml(item.person.name);
        return `<div class="assignment-chip ${roleClass(item.role.id)}" title="${safeName} · ${role}"><strong>${safeName}</strong><span>${role} · ${shift.time}</span></div>`;
      }).join("");
      return `<div class="shift-block"><div class="shift-heading">${shift.label}<span class="shift-count">${covered}/${assignments.length}</span></div>${chips}</div>`;
    }).join("");
    return `<article class="day-column">${dayHeader}${shiftHtml}</article>`;
  }).join("");
}

function renderMetrics() {
  document.querySelector("#teamHourCapacity").textContent = staff.reduce((total, person) => total + person.maxHours, 0);
  if (!schedule) {
    document.querySelector("#coverageValue").textContent = "—";
    document.querySelector("#coverageDetail").textContent = "Generate a roster";
    document.querySelector("#coverageBar").style.width = "0%";
    document.querySelector("#understaffedValue").textContent = "—";
    document.querySelector("#understaffedDetail").textContent = "Across the week";
    document.querySelector("#hoursValue").textContent = "—";
    document.querySelector("#overtimeValue").textContent = "0h";
    document.querySelector("#fairnessValue").textContent = "—";
    return;
  }
  const assignments = schedule.flatMap((day) => SHIFTS.flatMap((shift) => day.shifts[shift.id]));
  const covered = assignments.filter((slot) => slot.person).length;
  const coverage = assignments.length ? Math.round((covered / assignments.length) * 100) : 100;
  const emptyPositions = assignments.length - covered;
  const understaffed = schedule.reduce((total, day) => total + SHIFTS.filter((shift) => {
    const slots = day.shifts[shift.id];
    return slots.length > 0 && slots.some((slot) => !slot.person);
  }).length, 0);
  const plannedHours = staff.reduce((total, person) => total + (person.hours ?? 0), 0);
  const overtime = staff.reduce((total, person) => total + Math.max(0, (person.hours ?? 0) - 40), 0);
  const capacity = staff.reduce((total, person) => total + person.maxHours, 0);
  const activeHours = staff.map((person) => person.hours ?? 0).filter((hours) => hours > 0);
  const mean = activeHours.length ? activeHours.reduce((sum, hours) => sum + hours, 0) / activeHours.length : 0;
  const deviation = activeHours.length ? Math.sqrt(activeHours.reduce((sum, hours) => sum + ((hours - mean) ** 2), 0) / activeHours.length) : 0;
  const fairness = Math.max(0, Math.min(100, Math.round(100 - deviation * 2.1)));
  document.querySelector("#coverageValue").textContent = `${coverage}%`;
  document.querySelector("#coverageDetail").textContent = `${covered} of ${assignments.length} positions`;
  document.querySelector("#coverageBar").style.width = `${coverage}%`;
  document.querySelector("#understaffedValue").textContent = understaffed;
  document.querySelector("#understaffedDetail").textContent = `${emptyPositions} open positions`;
  document.querySelector("#hoursValue").textContent = `${plannedHours}h`;
  document.querySelector("#teamHourCapacity").textContent = capacity;
  document.querySelector("#overtimeValue").textContent = `${overtime}h`;
  document.querySelector("#fairnessValue").textContent = `${fairness}%`;
}

function renderOccupancy() {
  const host = document.querySelector("#occupancyList");
  host.innerHTML = occupancy.map((value, index) => `<label class="occupancy-row"><span class="occupancy-day">${DAY_NAMES[index]}</span><span class="occupancy-range"><span style="width:${value}%"></span></span><input class="occupancy-input" aria-label="${FULL_DAYS[index]} occupancy percentage" type="number" min="0" max="100" value="${value}"></label>`).join("");
  host.querySelectorAll(".occupancy-input").forEach((input, index) => {
    input.addEventListener("change", () => {
      occupancy[index] = Math.min(100, Math.max(0, Number(input.value) || 0));
      if (schedule) {
        invalidateSchedule("Forecast changed · regenerate roster");
      }
      renderOccupancy();
    });
  });
}

function renderTeam() {
  document.querySelector("#teamCount").textContent = staff.length;
  document.querySelector("#teamTableBody").innerHTML = staff.map((person, index) => {
    const role = roleById(person.role);
    const availableDots = allDays.map((day) => `<i class="${day === person.dayOff ? "off" : ""}" title="${FULL_DAYS[day]}${day === person.dayOff ? " · weekly off" : " · available"}"></i>`).join("");
    const skills = person.skills.map((id) => roleById(id).name).join(", ");
    const currentHours = schedule ? `${person.hours ?? 0}h assigned` : "—";
    return `<tr><td><div class="team-person"><span class="staff-avatar alt-${person.tone ?? index % 4}">${initials(person.name)}</span>${escapeHtml(person.name)}</div></td><td><span class="role-badge ${role.className}"><i></i>${role.name}</span></td><td><div class="availability-dots" title="${skills}">${availableDots}</div></td><td><span class="weekly-limit">${currentHours}</span> <span class="muted-hours">/ ${person.maxHours}h</span></td><td>${FULL_DAYS[person.dayOff]}</td></tr>`;
  }).join("");
}

function currentMessage() {
  if (!schedule) return "Generate a roster to preview the team update.";
  if (notifyMode === "daily") {
    const day = Number(document.querySelector("#notificationDay").value) || 0;
    const date = new Date(weekStart);
    date.setDate(date.getDate() + day);
    const lines = [`Hi team — here’s your schedule for ${FULL_DAYS[day]}, ${formatDate(date, { month: "short", day: "numeric" })}:`];
    const shifts = SHIFTS.map((shift) => {
      const assigned = schedule[day].shifts[shift.id].filter((item) => item.person);
      return assigned.map((item) => `• ${item.person.name}: ${item.role.name}, ${shift.time}`).join("\n");
    }).filter(Boolean);
    lines.push(...(shifts.length ? shifts : ["No shifts are scheduled for this day."]));
    lines.push("Please check with your manager if you need a change.");
    return lines.join("\n");
  }
  const count = staff.filter((person) => (person.hours ?? 0) > 0).length;
  const total = staff.reduce((sum, person) => sum + (person.hours ?? 0), 0);
  return `Hi team — the roster for ${getWeekLabel()} is ready.\n${count} team members are scheduled for ${total} total hours. Open Shiftwell to see your shifts, role, and weekly day off.\nPlease contact your department head if anything needs to change.`;
}

function renderNotification() {
  document.querySelector("#messageBody").textContent = currentMessage();
  if (notifyMode === "daily") {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + (Number(document.querySelector("#notificationDay").value) || 0));
    document.querySelector("#messageDate").textContent = `For ${formatDate(date, { weekday: "long", month: "short", day: "numeric" })}`;
  } else {
    document.querySelector("#messageDate").textContent = `For ${formatDate(weekStart, { month: "short", day: "numeric" })}–${formatDate(new Date(weekStart.getTime() + 6 * 86400000), { day: "numeric" })}`;
  }
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function invalidateSchedule(message) {
  schedule = null;
  renderSchedule();
  renderMetrics();
  renderTeam();
  renderNotification();
  document.querySelector(".last-saved").innerHTML = `<span class="saved-dot"></span> ${message}`;
}

function populateStaffForm() {
  const roleSelect = document.querySelector('#staffForm select[name="role"]');
  roleSelect.innerHTML = ROLES.map((role) => `<option value="${role.id}">${role.name}</option>`).join("");
  const dayOffSelect = document.querySelector('#staffForm select[name="dayOff"]');
  dayOffSelect.innerHTML = FULL_DAYS.map((day, index) => `<option value="${index}">${day}</option>`).join("");
  document.querySelector("#skillOptions").innerHTML = ROLES.map((role) => `<label class="skill-choice"><input type="checkbox" value="${role.id}"> ${role.name}</label>`).join("");
  roleSelect.addEventListener("change", () => {
    document.querySelectorAll('#skillOptions input[type="checkbox"]').forEach((input) => { input.checked = input.value === roleSelect.value; });
  });
  document.querySelectorAll('#skillOptions input[type="checkbox"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (input.value === roleSelect.value && !input.checked) input.checked = true;
    });
  });
  document.querySelector('#skillOptions input[value="front"]').checked = true;
}

function addStaff(event) {
  event.preventDefault();
  const form = document.querySelector("#staffForm");
  const data = new FormData(form);
  const role = data.get("role");
  const skills = [...document.querySelectorAll('#skillOptions input:checked')].map((input) => input.value);
  if (!skills.includes(role)) skills.push(role);
  staff.push({ name: String(data.get("name")).trim(), role, skills, maxHours: Number(data.get("maxHours")), dayOff: Number(data.get("dayOff")), tone: staff.length % 4 });
  form.reset();
  document.querySelector('#staffForm select[name="role"]').value = ROLES[0].id;
  document.querySelectorAll('#skillOptions input[type="checkbox"]').forEach((input) => { input.checked = input.value === ROLES[0].id; });
  document.querySelector("#staffDialog").close();
  renderTeam();
  invalidateSchedule("Team changed · regenerate roster");
  showToast("Team member added. Generate a new roster.");
}

function bindEvents() {
  document.querySelector("#generateButton").addEventListener("click", generateSchedule);
  document.querySelector("#emptyGenerateButton").addEventListener("click", generateSchedule);
  document.querySelector("#addStaffButton").addEventListener("click", () => document.querySelector("#staffDialog").showModal());
  document.querySelector("#staffForm").addEventListener("submit", addStaff);
  document.querySelector("#resetOccupancy").addEventListener("click", () => {
    occupancy = [61, 67, 82, 88, 79, 94, 71];
    renderOccupancy();
    invalidateSchedule("Forecast reset · regenerate roster");
  });
  document.querySelector("#previousWeek").addEventListener("click", () => moveWeek(-7));
  document.querySelector("#nextWeek").addEventListener("click", () => moveWeek(7));
  document.querySelectorAll(".notify-tab").forEach((button) => button.addEventListener("click", () => {
    notifyMode = button.dataset.mode;
    document.querySelectorAll(".notify-tab").forEach((tab) => tab.classList.toggle("active", tab === button));
    document.querySelector("#notificationDay").classList.toggle("visible", notifyMode === "daily");
    renderNotification();
  }));
  document.querySelector("#notificationDay").addEventListener("change", renderNotification);
  document.querySelector(".notification-bell").addEventListener("click", () => document.querySelector("#notifications").scrollIntoView({ behavior: "smooth", block: "center" }));
  document.querySelector("#notifyButton").addEventListener("click", () => {
    if (!schedule) return showToast("Generate a roster before previewing staff updates.");
    document.querySelector("#notifications").scrollIntoView({ behavior: "smooth", block: "center" });
    showToast("Choose weekly or daily to preview the update.");
  });
  document.querySelector("#copyMessageButton").addEventListener("click", async () => {
    if (!schedule) return showToast("Generate a roster before copying a message.");
    try {
      await navigator.clipboard.writeText(currentMessage());
      showToast("Message preview copied");
    } catch {
      const text = document.querySelector("#messageBody").textContent;
      window.prompt("Copy this notification preview:", text);
    }
  });
  document.querySelectorAll(".view-option").forEach((button) => button.addEventListener("click", () => {
    listView = button.id === "listViewButton";
    document.querySelectorAll(".view-option").forEach((option) => option.classList.toggle("active", option === button));
    renderSchedule();
  }));
  document.querySelector("#viewTeamButton").addEventListener("click", () => document.querySelector("#team").scrollIntoView({ behavior: "smooth", block: "start" }));
}

function moveWeek(days) {
  weekStart.setDate(weekStart.getDate() + days);
  renderWeekLabel();
  invalidateSchedule("Week changed · regenerate roster");
}

function init() {
  renderWeekLabel();
  renderOccupancy();
  renderTeam();
  renderMetrics();
  renderNotification();
  populateStaffForm();
  bindEvents();
}

init();
