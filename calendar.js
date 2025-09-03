// ═══════════════════════════════════════════════════════════════════
// CALENDAR MODULE
// Handles calendar building, rendering, and user interactions
// ═══════════════════════════════════════════════════════════════════

// Calendar state management
let pendingHolidays = {};
let autoResetTimer = null;
const AUTO_RESET_DELAY = window.APP_TIMING?.AUTO_RESET_DELAY || 120000;

// Clear pending selections and reload calendar
function clearPendingSelections() {
  const pendingKey = getPendingKey();

  if (pendingHolidays[pendingKey]) {
    delete pendingHolidays[pendingKey];
  }

  loadUserHolidays();

  if (autoResetTimer) {
    clearTimeout(autoResetTimer);
    autoResetTimer = null;
  }
}

// Start/restart the auto-reset timer
function startAutoResetTimer() {
  if (autoResetTimer) {
    clearTimeout(autoResetTimer);
  }

  autoResetTimer = setTimeout(() => {
    clearPendingSelections();
  }, AUTO_RESET_DELAY);
}

// Apply visual styling for half-day leave
function applyHalfDayVisuals(cell, leaveType) {
  let borderColor = "#dc3545";

  if (cell.classList.contains("us-holiday")) {
    borderColor = "#fd7e14";
  } else if (cell.classList.contains("uk-holiday")) {
    borderColor = "#007bff";
  } else if (cell.classList.contains("in-holiday")) {
    borderColor = "#28a745";
  } else if (cell.classList.contains("custom-holiday")) {
    borderColor = "#6f42c1";
  }

  if (leaveType === "morning") {
    cell.style.setProperty(
      "background",
      "linear-gradient(180deg, #dc3545 0%, #dc3545 50%, transparent 50%, transparent 100%)",
      "important"
    );
    cell.style.setProperty("border", `3px solid ${borderColor}`, "important");
    cell.style.setProperty("color", "white", "important");
    cell.style.setProperty("font-weight", "bold", "important");
  } else if (leaveType === "afternoon") {
    cell.style.setProperty(
      "background",
      "linear-gradient(180deg, transparent 0%, transparent 50%, #dc3545 50%, #dc3545 100%)",
      "important"
    );
    cell.style.setProperty("border", `3px solid ${borderColor}`, "important");
    cell.style.setProperty("color", "white", "important");
    cell.style.setProperty("font-weight", "bold", "important");
  } else if (leaveType === "full") {
    cell.style.setProperty("background", "#dc3545", "important");
    cell.style.setProperty("border", `3px solid ${borderColor}`, "important");
    cell.style.setProperty("color", "white", "important");
    cell.style.setProperty("font-weight", "bold", "important");
  } else {
    cell.style.removeProperty("background");
    cell.style.removeProperty("border");
    cell.style.removeProperty("color");
    cell.style.removeProperty("font-weight");
  }
}

function buildCalendar() {
  // Check for required elements first
  const calendarEl = document.getElementById("calendar");
  const monthYearDisplay = document.getElementById("monthYearDisplay");

  if (!calendarEl || !monthYearDisplay) {
    console.error(
      "Calendar elements not found - calendarEl:",
      !!calendarEl,
      "monthYearDisplay:",
      !!monthYearDisplay
    );
    return;
  }

  if (!window.viewDate) {
    window.viewDate = new Date();
  }

  calendarEl.innerHTML = "";

  // Render weekdays
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((wd) => {
    const hdr = document.createElement("div");
    hdr.textContent = wd;
    calendarEl.appendChild(hdr);
  });

  const firstDay = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth(),
    1
  ).getDay();

  const totalDays = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth() + 1,
    0
  ).getDate();

  monthYearDisplay.textContent = `${viewDate.toLocaleString("default", {
    month: "long",
  })} ${viewDate.getFullYear()}`;

  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    calendarEl.appendChild(document.createElement("div"));
  }

  const today = new Date();

  for (let d = 1; d <= totalDays; d++) {
    const cell = document.createElement("div");
    cell.className = "day";
    cell.textContent = d;
    cell.dataset.day = d;

    const dt = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);

    if ([0, 6].includes(dt.getDay())) cell.classList.add("weekend");
    if (dt.toDateString() === today.toDateString()) cell.classList.add("today");

    // Check for public holidays
    const phs = isHoliday(dt);
    if (phs.length) {
      // Add border colors and abbreviations for public holidays
      phs.forEach((info) => {
        if (info.region === "US") {
          cell.classList.add("us-holiday");
        } else if (info.region === "UK") {
          cell.classList.add("uk-holiday");
        } else if (info.region === "IN") {
          cell.classList.add("in-holiday");
        } else if (info.region === "Custom") {
          cell.classList.add("custom-holiday");
        }
      });

      // Add region abbreviations
      const regionAbbrevs = phs
        .filter((h) => h.region !== "Custom")
        .map((h) => h.region)
        .join("/");

      if (regionAbbrevs) {
        const abbrevSpan = document.createElement("span");
        abbrevSpan.className = "region-abbrev";
        abbrevSpan.textContent = regionAbbrevs;
        cell.appendChild(abbrevSpan);
      }

      // Tooltip for holiday names
      const tip = document.createElement("div");
      tip.className = "tooltip";
      tip.textContent = phs
        .map((x) => x.name + " (" + x.region + ")")
        .join(", ");
      cell.appendChild(tip);
    }

    // Check for custom holidays
    // Check for custom holidays
    const customKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(dt.getDate()).padStart(2, "0")}`;

    if (customHolidays[customKey]) {
      cell.classList.add("custom-holiday");

      // Add star icon for custom holidays
      const starSpan = document.createElement("span");
      starSpan.className = "custom-star";
      starSpan.textContent = "⭐";
      starSpan.style.position = "absolute";
      starSpan.style.top = "2px";
      starSpan.style.right = "2px";
      starSpan.style.fontSize = "0.7em";
      starSpan.style.zIndex = "5";
      cell.appendChild(starSpan);

      // Add tooltip for custom holiday name
      const customTip = document.createElement("div");
      customTip.className = "tooltip";
      customTip.textContent = customHolidays[customKey];
      cell.appendChild(customTip);
    }

    // Check for birthdays and anniversaries
    const birthdayPeople = [];
    const anniversaryPeople = [];

    // Check birthdays (stored as YYYY-MM-DD, but we check MM-DD for recurring)
    Object.entries(birthdays).forEach(([member, birthDate]) => {
      const birthDateObj = new Date(birthDate);
      if (
        birthDateObj.getMonth() === dt.getMonth() &&
        birthDateObj.getDate() === dt.getDate()
      ) {
        birthdayPeople.push(member);
      }
    });

    // Check anniversaries (stored as YYYY-MM-DD, but we check MM-DD for recurring)
    Object.entries(anniversaries).forEach(([member, anniversaryData]) => {
      let monthToCheck, dayToCheck;

      // Handle both old and new data structures
      if (typeof anniversaryData === "string") {
        // Old format: "2020-03-15"
        const anniversaryDateObj = new Date(anniversaryData);
        monthToCheck = anniversaryDateObj.getMonth();
        dayToCheck = anniversaryDateObj.getDate();
      } else {
        // New format: { startYear: 2020, monthDay: "03-15", originalDate: "2020-03-15" }
        const [month, day] = anniversaryData.monthDay.split("-").map(Number);
        monthToCheck = month - 1; // Convert to 0-based month for comparison
        dayToCheck = day;
      }

      // Check if this anniversary falls on the current calendar day
      if (monthToCheck === dt.getMonth() && dayToCheck === dt.getDate()) {
        anniversaryPeople.push(member);
      }
    });

    // Add birthday and anniversary icons
    if (birthdayPeople.length > 0 || anniversaryPeople.length > 0) {
      const iconsContainer = document.createElement("div");
      iconsContainer.className = "special-date-icons";

      // Add birthday icon if there are birthdays
      if (birthdayPeople.length > 0) {
        const birthdayIcon = document.createElement("span");
        birthdayIcon.className = "birthday-icon";
        birthdayIcon.textContent = "🎂";
        birthdayIcon.title = `Birthday: ${birthdayPeople.join(", ")}`;
        iconsContainer.appendChild(birthdayIcon);
      }

      // Add anniversary icon if there are anniversaries
      if (anniversaryPeople.length > 0) {
        const anniversaryIcon = document.createElement("span");
        anniversaryIcon.className = "anniversary-icon";
        anniversaryIcon.textContent = "🏆";
        anniversaryIcon.title = `Work Anniversary: ${anniversaryPeople.join(
          ", "
        )}`;
        iconsContainer.appendChild(anniversaryIcon);
      }

      cell.appendChild(iconsContainer);
    }

    // 🚀 FIXED EVENT HANDLERS - SIMPLIFIED VERSION

    // LEFT CLICK: Full day toggle
    cell.addEventListener("click", (e) => {
      if (e.detail === 1) {
        // Single click only
        e.preventDefault();
        e.stopPropagation();

        const dayCell = e.target.closest(".day") || cell;
        const dayNum = parseInt(dayCell.dataset.day);
        const user = userSelect.value;
        const pendingKey = getPendingKey();

        // Initialize pending holidays structure
        if (!pendingHolidays[pendingKey]) {
          pendingHolidays[pendingKey] = {};
        }

        // Clear any half-day classes first
        dayCell.classList.remove("morning-half", "afternoon-half", "full-day");

        // Toggle full day in PENDING (not saved holidays)
        if (dayCell.classList.contains("holiday")) {
          dayCell.classList.remove("holiday");
          delete pendingHolidays[pendingKey][dayNum];
          applyHalfDayVisuals(dayCell, "none");
        } else {
          dayCell.classList.add("holiday", "full-day");
          pendingHolidays[pendingKey][dayNum] = "full";
          applyHalfDayVisuals(dayCell, "full");
        }

        // Start auto-reset timer
        startAutoResetTimer();

        // ❌ REMOVED: No immediate save or Gantt update
      }
    });

    // RIGHT CLICK: Half-day cycling
    cell.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const dayCell = e.target.closest(".day") || cell;
      const dayNum = parseInt(dayCell.dataset.day);
      const user = userSelect.value;
      const pendingKey = getPendingKey();

      // Initialize pending holidays structure
      if (!pendingHolidays[pendingKey]) {
        pendingHolidays[pendingKey] = {};
      }

      // Clear all leave classes first
      dayCell.classList.remove(
        "holiday",
        "full-day",
        "morning-half",
        "afternoon-half"
      );

      // Get current leave type from PENDING (not saved holidays)
      const currentLeaveType = pendingHolidays[pendingKey][dayNum];

      // Cycle through: none → morning → afternoon → none
      if (currentLeaveType === "morning") {
        // Currently morning, switch to afternoon
        dayCell.classList.add("afternoon-half");
        pendingHolidays[pendingKey][dayNum] = "afternoon";
        applyHalfDayVisuals(dayCell, "afternoon");
      } else if (currentLeaveType === "afternoon") {
        // Currently afternoon, clear all
        delete pendingHolidays[pendingKey][dayNum];
        applyHalfDayVisuals(dayCell, "none");
      } else {
        // Currently none, set to morning
        dayCell.classList.add("morning-half");
        pendingHolidays[pendingKey][dayNum] = "morning";
        applyHalfDayVisuals(dayCell, "morning");
      }

      // Start auto-reset timer
      startAutoResetTimer();
      return false;
    });

    calendarEl.appendChild(cell);
  }

  // 🔥 CRITICAL: Load user holidays FIRST before anything else
  loadUserHolidays();

  // 🔥 CRITICAL: Update other components with delay to ensure Gantt renders
  setTimeout(() => {
    updateHolidayList();
    updateNewPanelMetrics();
    updateNewHolidayList();
    updateQuickStatsPills();
    updateSpecialDatesKPI();
    renderMonthlyGantt(); // Explicitly call Gantt render
  }, 100);
}

// Load user holidays for current view
function loadUserHolidays() {
  if (!userSelect || !calendarEl) return;

  const user = userSelect.value;
  const key = getKey(viewDate);
  const userData = (holidays[user] || {})[key] || {};

  calendarEl.querySelectorAll(".day").forEach((cell) => {
    const day = parseInt(cell.dataset.day);
    if (isNaN(day)) return;

    cell.classList.remove(
      "holiday",
      "morning-half",
      "afternoon-half",
      "full-day"
    );

    const leaveType = userData[day];
    if (leaveType) {
      if (leaveType === "morning") {
        cell.classList.add("morning-half");
        applyHalfDayVisuals(cell, "morning");
      } else if (leaveType === "afternoon") {
        cell.classList.add("afternoon-half");
        applyHalfDayVisuals(cell, "afternoon");
      } else if (leaveType === "full") {
        cell.classList.add("holiday", "full-day");
        applyHalfDayVisuals(cell, "full");
      }
    } else {
      applyHalfDayVisuals(cell, "none");
    }
  });
}

// Navigation functions
function prevMonth() {
  viewDate.setMonth(viewDate.getMonth() - 1);
  buildCalendar();
  updateMonthlyView();
}

function nextMonth() {
  viewDate.setMonth(viewDate.getMonth() + 1);
  buildCalendar();
  updateMonthlyView();
}

// Main save function
async function saveHolidays() {
  const user = userSelect.value;
  const key = getKey(viewDate);

  if (!holidays[user]) holidays[user] = {};

  const monthLeaveData = {};

  calendarEl.querySelectorAll(".day").forEach((cell) => {
    const day = parseInt(cell.dataset.day);

    if (cell.classList.contains("morning-half")) {
      monthLeaveData[day] = "morning";
    } else if (cell.classList.contains("afternoon-half")) {
      monthLeaveData[day] = "afternoon";
    } else if (
      cell.classList.contains("holiday") ||
      cell.classList.contains("full-day")
    ) {
      monthLeaveData[day] = "full";
    }
  });

  holidays[user][key] = monthLeaveData;
  localStorage.setItem("holidays", JSON.stringify(holidays));

  // Wait for sheets sync to complete before finishing
  if (typeof saveHolidaysToSheets === "function") {
    await saveHolidaysToSheets();
  }

  loadUserHolidays();
  updateMonthlyView();
}

// 🎯 LEFT CLICK HANDLER WITH DATA PERSISTENCE
function handleLeftClick(e) {
  if (e.detail === 1) {
    // Single click only
    e.preventDefault();
    e.stopPropagation();

    const dayCell = e.target.closest(".day");
    if (!dayCell) return;

    const dayNum = parseInt(dayCell.dataset.day);
    const user = userSelect.value;
    const key = getKey(viewDate);

    if (!holidays[user]) holidays[user] = {};
    if (!holidays[user][key]) holidays[user][key] = {};

    // Clear any half-day classes first
    dayCell.classList.remove("morning-half", "afternoon-half", "full-day");

    // Toggle full day
    if (dayCell.classList.contains("holiday")) {
      dayCell.classList.remove("holiday");
      delete holidays[user][key][dayNum];
      applyHalfDayVisuals(dayCell, "none");
    } else {
      dayCell.classList.add("holiday", "full-day");
      holidays[user][key][dayNum] = "full";
      applyHalfDayVisuals(dayCell, "full");
    }

    // Auto-save changes
    localStorage.setItem("holidays", JSON.stringify(holidays));
  }
}

// 🎯 RIGHT CLICK HANDLER WITH DATA PERSISTENCE
function handleRightClick(e) {
  e.preventDefault();
  e.stopPropagation();

  // Get the actual day cell regardless of what was clicked
  const dayCell = e.target.closest(".day");
  if (!dayCell) return;

  const dayNum = parseInt(dayCell.dataset.day);
  const user = userSelect.value;
  const key = getKey(viewDate);

  if (!holidays[user]) holidays[user] = {};
  if (!holidays[user][key]) holidays[user][key] = {};

  // Clear all leave classes first
  dayCell.classList.remove(
    "holiday",
    "full-day",
    "morning-half",
    "afternoon-half"
  );

  // Get current leave type from data
  const currentLeaveType = holidays[user][key][dayNum];

  // Cycle through: none → morning → afternoon → none
  if (currentLeaveType === "morning") {
    // Currently morning, switch to afternoon
    dayCell.classList.add("afternoon-half");
    holidays[user][key][dayNum] = "afternoon";
    applyHalfDayVisuals(dayCell, "afternoon");
  } else if (currentLeaveType === "afternoon") {
    // Currently afternoon, clear all
    delete holidays[user][key][dayNum];
    applyHalfDayVisuals(dayCell, "none");
  } else {
    // Currently none, set to morning
    dayCell.classList.add("morning-half");
    holidays[user][key][dayNum] = "morning";
    applyHalfDayVisuals(dayCell, "morning");
  }

  // Auto-save changes
  localStorage.setItem("holidays", JSON.stringify(holidays));

  return false; // Prevent default context menu
}

// Make functions globally accessible
window.pendingHolidays = pendingHolidays;
window.clearPendingSelections = clearPendingSelections;
window.startAutoResetTimer = startAutoResetTimer;
window.applyHalfDayVisuals = applyHalfDayVisuals;
window.buildCalendar = buildCalendar;
window.loadUserHolidays = loadUserHolidays;
window.prevMonth = prevMonth;
window.nextMonth = nextMonth;
window.saveHolidays = saveHolidays;
window.handleLeftClick = handleLeftClick;
window.handleRightClick = handleRightClick;
