// ─── Force high-res, fully responsive charts ───

// Ensure requests variable is always defined to prevent errors in updateMetrics
if (typeof window.requests === "undefined") {
  window.requests = [];
}
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.devicePixelRatio = 2; // ← bump this to 3 if you want even sharper

function animateCountUp(id, target, suffix = "") {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const increment = Math.ceil(target / 60);
  function update() {
    current += increment;
    if (current > target) current = target;
    el.textContent = current + suffix;
    if (current < target) requestAnimationFrame(update);
  }
  update();
}

// ADD THESE NEW LINES after existing global variables
let pendingHolidays = {}; // Staging area for unsaved calendar selections
let autoResetTimer = null; // Timer for auto-clearing selections
const AUTO_RESET_DELAY = 120000; // 2 minutes in milliseconds

function throwConfetti() {
  const confetti = document.getElementById("confetti");
  if (!confetti) return;
  confetti.innerHTML = "";
  for (let i = 0; i < 32; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.setProperty(
      "--c",
      ["#f43f5e", "#f59e42", "#60a5fa", "#22d3ee", "#bbf7d0", "#818cf8"][
        Math.floor(Math.random() * 6)
      ]
    );
    piece.style.left = `${Math.random() * 98}%`;
    piece.style.animationDelay = `${Math.random() * 0.5}s`;
    confetti.appendChild(piece);
  }
  setTimeout(() => {
    confetti.innerHTML = "";
  }, 1600);
}

(function ensureNewYearUIReset() {
  const nowYear = new Date().getFullYear();
  const lastSeenYear = parseInt(
    localStorage.getItem("lastSeenYear") || "0",
    10
  );

  if (lastSeenYear !== nowYear) {
    // UI resets
    window.currentDashboardView = "monthly";
    window.selectedAnnualMember = null;

    // If the dashboard is open, refresh filters/titles
    const annualFilter = document.getElementById("annualMemberFilter");
    if (annualFilter) annualFilter.value = "";

    const yrSel = document.getElementById("yearFilter");
    if (yrSel) {
      // repopulate & select current year if you have a helper
      if (typeof populateYearFilter === "function") populateYearFilter();
      Array.from(yrSel.options).forEach((opt) => {
        if (opt.value === String(nowYear)) yrSel.selected = true;
      });
    }

    localStorage.setItem("lastSeenYear", String(nowYear));
  }
})();

// Team members and colors (dynamic)
const defaultMembers = [
  "Amy Aleman",
  "Amy Mangner",
  "Angie Lawrence",
  "Daria Cullen",
  "Derrick Sprague",
  "Diana Derrington",
  "Eric Ham",
  "Gina Long",
  "Gur Singh",
  "Jess McCarthy",
  "Leslie Silkwood",
  "Matt Gramlich",
  "Sean Manion",
  "Tony Thornberry",
];

// Load from storage or use defaults
let teamMembers =
  JSON.parse(localStorage.getItem("teamMembers")) || defaultMembers.slice();

// Persist helper
function saveTeamMembers() {
  localStorage.setItem("teamMembers", JSON.stringify(teamMembers));
}

// Generate color map
let userColors = {};
function updateUserColors() {
  userColors = {};
  teamMembers.forEach((name, i) => {
    userColors[name] = `hsl(${i * 36}, 70%, 60%)`;
  });
}
updateUserColors();

// pull CSS variables into JS
const brandGreen = getComputedStyle(document.documentElement)
  .getPropertyValue("--brand-green")
  .trim();
const brandBlue = getComputedStyle(document.documentElement)
  .getPropertyValue("--brand-blue")
  .trim();
const brandRed = getComputedStyle(document.documentElement)
  .getPropertyValue("--brand-red")
  .trim();

// Custom holidays (dynamic)
let customHolidays = JSON.parse(localStorage.getItem("customHolidays")) || {};
// New data structures for birthdays, anniversaries, and enhanced holidays
let birthdays = JSON.parse(localStorage.getItem("birthdays")) || {};
let anniversaries = JSON.parse(localStorage.getItem("anniversaries")) || {};
let enhancedCustomHolidays =
  JSON.parse(localStorage.getItem("enhancedCustomHolidays")) || {};

function saveCustomHolidays() {
  localStorage.setItem("customHolidays", JSON.stringify(customHolidays));
}

// Save functions for new data
function saveBirthdays() {
  localStorage.setItem("birthdays", JSON.stringify(birthdays));
}

function saveAnniversaries() {
  localStorage.setItem("anniversaries", JSON.stringify(anniversaries));
}

function saveEnhancedCustomHolidays() {
  localStorage.setItem(
    "enhancedCustomHolidays",
    JSON.stringify(enhancedCustomHolidays)
  );
}

// Public holidays lookup
const publicHolidays = {
  "2025-01-01": [
    { name: "New Year's Day", region: "UK" },
    { name: "New Year's Day", region: "US" },
  ],
  "2025-05-05": [{ name: "Early May Bank Holiday", region: "UK" }],
  "2025-05-26": [
    { name: "Spring Bank Holiday", region: "UK" },
    { name: "Memorial Day", region: "US" },
  ],
  "2025-07-04": [{ name: "Independence Day", region: "US" }],
};

function switchTab(id) {
  // Hide all panels
  document
    .querySelectorAll(".tab-content")
    .forEach((el) => el.classList.add("hidden"));
  // Show the requested panel
  document.getElementById(id).classList.remove("hidden");

  // Deactivate all tabs
  document
    .querySelectorAll(".tab")
    .forEach((el) => el.classList.remove("active"));

  // Activate the correct tab button
  if (id === "calendarTab") {
    document.getElementById("tab-calendar").classList.add("active");
  } else if (id === "dashboardTab") {
    document.getElementById("tab-dashboard").classList.add("active");

    // Initialize dashboard properly
    if (!window.currentDashboardView) {
      window.currentDashboardView = "monthly"; // Set default
    }

    // Populate the correct dropdown based on current view
    if (window.currentDashboardView === "monthly") {
      populateMonthFilter();
    } else {
      populateYearFilter();
    }

    renderDashboardTab();

    // Show member filter only in annual view
    const filterContainer = document.getElementById(
      "annualMemberFilterContainer"
    );
    if (filterContainer) {
      filterContainer.style.display =
        window.currentDashboardView === "annual" ? "block" : "none";
    }
  } else if (id === "adminTab") {
    document.getElementById("tab-admin").classList.add("active");

    // Initialize admin functionality when admin tab is opened
    setTimeout(() => {
      if (document.getElementById("addHolidayAdvanced")) {
        document.getElementById("addHolidayAdvanced").onclick =
          addEnhancedHoliday;
      }
      if (document.getElementById("addMemberAdvanced")) {
        document.getElementById("addMemberAdvanced").onclick =
          addMemberAdvanced;
      }
      if (document.getElementById("addSpecialDate")) {
        document.getElementById("addSpecialDate").onclick = addSpecialDate;
      }

      // Initialize holidays mode
      if (typeof initializeHolidaysMode !== "undefined") {
        initializeHolidaysMode();
      }
    }, 100);
  }
}

function switchDashboardView(viewType) {
  window.selectedAnnualMember = null;

  // Reset dropdown
  const dropdown = document.getElementById("annualMemberFilter");
  if (dropdown) {
    dropdown.value = "";
  }

  const monthlyView = document.getElementById("monthlyDashboardView");
  const annualView = document.getElementById("annualDashboardView");
  const monthlyBtn = document.getElementById("monthlyViewBtn");
  const annualBtn = document.getElementById("annualViewBtn");

  if (!monthlyView || !annualView || !monthlyBtn || !annualBtn) {
    console.error("Dashboard view elements not found");
    return;
  }

  // Update button states
  monthlyBtn.classList.remove("active");
  annualBtn.classList.remove("active");

  // Update view states
  monthlyView.classList.remove("active");
  annualView.classList.remove("active");
  monthlyView.classList.add("hidden");
  annualView.classList.add("hidden");

  if (viewType === "annual") {
    // Show annual view
    annualView.classList.add("active");
    annualView.classList.remove("hidden");
    annualBtn.classList.add("active");
    window.currentDashboardView = "annual";

    // Update dashboard title
    const dashboardTitle = document.querySelector(".dashboard-header h2");
    if (dashboardTitle) {
      dashboardTitle.textContent = "📊 Annual Absence Dashboard";
    }

    // Populate YEAR dropdown for annual view
    populateYearFilter();

    // Render annual dashboard
    renderAnnualDashboard();
  } else {
    // Show monthly view (default)
    monthlyView.classList.add("active");
    monthlyView.classList.remove("hidden");
    monthlyBtn.classList.add("active");
    window.currentDashboardView = "monthly";

    // Update dashboard title
    const dashboardTitle = document.querySelector(".dashboard-header h2");
    if (dashboardTitle) {
      dashboardTitle.textContent = "📆 Monthly Absence Dashboard";
    }

    // Populate MONTH dropdown for monthly view
    populateMonthFilter();

    // Refresh monthly dashboard
    renderDashboardTab();
  }
}

// Helpers
function getKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isHoliday(d) {
  // Build the YYYY-MM-DD key
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;

  // Start with any public holidays on that date
  const holidaysArr = publicHolidays[key] ? [...publicHolidays[key]] : [];

  // Add a custom holiday if present
  if (customHolidays[key]) {
    holidaysArr.push({
      name: customHolidays[key],
      region: "Custom",
    });
  }

  return holidaysArr;
}

function getOrdinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Helper function to get the staging key for current user/month
function getPendingKey() {
  const user = document.getElementById("userSelect").value;
  const monthKey = getKey(viewDate);
  return `${user}-${monthKey}`;
}

// Clear pending selections and reload calendar
function clearPendingSelections() {
  const pendingKey = getPendingKey();

  if (pendingHolidays[pendingKey]) {
    delete pendingHolidays[pendingKey];
  }

  // Reload calendar to show only saved holidays
  loadUserHolidays();

  // Clear the auto-reset timer
  if (autoResetTimer) {
    clearTimeout(autoResetTimer);
    autoResetTimer = null;
  }

  console.log("✅ Pending selections cleared");
}

// Start/restart the auto-reset timer (2 minutes)
function startAutoResetTimer() {
  if (autoResetTimer) {
    clearTimeout(autoResetTimer);
  }

  autoResetTimer = setTimeout(() => {
    console.log("⏰ Auto-clearing pending selections after 2 minutes");
    clearPendingSelections();
  }, AUTO_RESET_DELAY);
}

// ADD THIS ENTIRE BLOCK TO YOUR JAVASCRIPT (around line 800)
// HALF-DAY LEAVE HELPER FUNCTIONS

// 1. MIGRATION FUNCTION - converts old array format to new object format
function migrateHolidayData() {
  let migrationNeeded = false;

  Object.keys(holidays).forEach((member) => {
    Object.keys(holidays[member] || {}).forEach((monthKey) => {
      const monthData = holidays[member][monthKey];

      // If it's still an array (old format), convert to object
      if (Array.isArray(monthData)) {
        console.log(`Migrating data for ${member} - ${monthKey}`);
        const newFormat = {};
        monthData.forEach((day) => {
          newFormat[day] = "full"; // Convert all existing to full days
        });
        holidays[member][monthKey] = newFormat;
        migrationNeeded = true;
      }
    });
  });

  if (migrationNeeded) {
    localStorage.setItem("holidays", JSON.stringify(holidays));
    console.log("✅ Holiday data migrated to new half-day format");
  } else {
    console.log("✅ No migration needed - data already in new format");
  }
}

// 2. HELPER FUNCTION - calculate total leave days (counting half-days as 0.5)
function calculateLeaveDays(memberLeaveData) {
  if (!memberLeaveData) return 0;

  // Handle old array format during transition
  if (Array.isArray(memberLeaveData)) {
    return memberLeaveData.length; // Old format: each item = 1 day
  }

  // New object format: sum up the values
  return Object.values(memberLeaveData).reduce((total, leaveType) => {
    if (leaveType === "full") return total + 1;
    if (leaveType === "morning" || leaveType === "afternoon")
      return total + 0.5;
    return total;
  }, 0);
}

// 3. HELPER FUNCTION - get leave details for a specific month
function getLeaveDetails(member, monthKey) {
  const memberData = holidays[member] || {};
  const monthData = memberData[monthKey] || {};

  // Handle old array format
  if (Array.isArray(monthData)) {
    return monthData.map((day) => ({ day: day, type: "full" }));
  }

  // New object format
  return Object.entries(monthData).map(([day, type]) => ({
    day: parseInt(day),
    type: type,
  }));
}

// 4. HELPER FUNCTION - check if a day has leave (any type)
function hasLeaveOnDay(member, monthKey, day) {
  const memberData = holidays[member] || {};
  const monthData = memberData[monthKey] || {};

  // Handle old array format
  if (Array.isArray(monthData)) {
    return monthData.includes(day);
  }

  // New object format
  return monthData.hasOwnProperty(day);
}

// 5. HELPER FUNCTION - get leave type for a specific day
function getLeaveTypeForDay(member, monthKey, day) {
  const memberData = holidays[member] || {};
  const monthData = memberData[monthKey] || {};

  // Handle old array format
  if (Array.isArray(monthData)) {
    return monthData.includes(day) ? "full" : null;
  }

  // New object format
  return monthData[day] || null;
}

function loadUserHolidays() {
  const userSelect = document.getElementById("userSelect");
  const currentUserName = document.getElementById("currentUserName");
  const calendarEl = document.getElementById("calendar");

  if (!userSelect || !currentUserName || !calendarEl) {
    console.error("Required elements not found for loadUserHolidays");
    return;
  }

  if (!userSelect.value) {
    console.error("No user selected");
    return;
  }

  const user = userSelect.value;
  currentUserName.textContent = user;

  if (!window.holidays) {
    window.holidays = {};
  }

  const key = getKey(viewDate);
  const monthData = (holidays[user] || {})[key] || {};

  calendarEl.querySelectorAll(".day").forEach((cell) => {
    const dayNum = parseInt(cell.dataset.day);

    // Clear ALL existing leave classes first
    cell.classList.remove(
      "holiday",
      "morning-half",
      "afternoon-half",
      "full-day"
    );

    // Check if this day has leave
    if (hasLeaveOnDay(user, key, dayNum)) {
      const leaveType = getLeaveTypeForDay(user, key, dayNum);

      if (leaveType === "morning") {
        cell.classList.add("morning-half");
        applyHalfDayVisuals(cell, "morning");
      } else if (leaveType === "afternoon") {
        cell.classList.add("afternoon-half");
        applyHalfDayVisuals(cell, "afternoon");
      } else if (leaveType === "full") {
        cell.classList.add("holiday", "full-day");
        applyHalfDayVisuals(cell, "full");
      } else {
        // Fallback for old data
        cell.classList.add("holiday", "full-day");
        applyHalfDayVisuals(cell, "full");
      }
    } else {
      // No leave - reset visuals
      applyHalfDayVisuals(cell, "none");
    }
  });
}
// 🎯 COMPLETE FIXED buildCalendar() FUNCTION
// Replace your entire buildCalendar function with this version

// 🎯 FIXED buildCalendar() - PRESERVES GANTT CHART
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
      cell.appendChild(starSpan);
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
        console.log("📝 Holiday selection staged (not saved yet)");
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

      // ❌ REMOVED: No immediate save or Gantt update
      console.log("📝 Half-day selection staged (not saved yet)");

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

// 🎯 THE ONE AND ONLY CORRECT applyHalfDayVisuals FUNCTION
// Delete all 3 existing functions and replace with this one

// 🎯 FIXED applyHalfDayVisuals - Preserves Original Child Element Positions
function applyHalfDayVisuals(cell, leaveType) {
  console.log(`Applying ${leaveType} to day ${cell.dataset.day}`);

  // Detect what type of holiday this cell represents
  let borderColor = "#dc3545"; // Default red border

  if (cell.classList.contains("us-holiday")) {
    borderColor = "#fd7e14"; // Orange for US holidays
    console.log("US Holiday detected, using orange border");
  } else if (cell.classList.contains("uk-holiday")) {
    borderColor = "#007bff"; // Blue for UK holidays
  } else if (cell.classList.contains("in-holiday")) {
    borderColor = "#28a745"; // Green for India holidays
  } else if (cell.classList.contains("custom-holiday")) {
    borderColor = "#6f42c1"; // Purple for custom holidays
  }

  // 🚀 FORCE OVERRIDE ALL EXISTING STYLES WITH setProperty
  if (leaveType === "morning") {
    // Morning half-day: top half red, preserve border
    cell.style.setProperty(
      "background",
      "linear-gradient(180deg, #dc3545 0%, #dc3545 50%, transparent 50%, transparent 100%)",
      "important"
    );
    cell.style.setProperty("border", `3px solid ${borderColor}`, "important");
    cell.style.setProperty("color", "white", "important");
    cell.style.setProperty("font-weight", "bold", "important");
    console.log("Applied morning half-day styling");
  } else if (leaveType === "afternoon") {
    // Afternoon half-day: bottom half red, preserve border
    cell.style.setProperty(
      "background",
      "linear-gradient(180deg, transparent 0%, transparent 50%, #dc3545 50%, #dc3545 100%)",
      "important"
    );
    cell.style.setProperty("border", `3px solid ${borderColor}`, "important");
    cell.style.setProperty("color", "white", "important");
    cell.style.setProperty("font-weight", "bold", "important");
    console.log("Applied afternoon half-day styling");
  } else if (leaveType === "full") {
    // Full day: completely red, preserve border
    cell.style.setProperty("background", "#dc3545", "important");
    cell.style.setProperty("border", `3px solid ${borderColor}`, "important");
    cell.style.setProperty("color", "white", "important");
    cell.style.setProperty("font-weight", "bold", "important");
    console.log("Applied full-day styling");
  } else {
    // No leave: reset to original styling but preserve holiday borders
    cell.style.removeProperty("background");
    cell.style.removeProperty("color");
    cell.style.removeProperty("font-weight");

    // 🔥 PRESERVE the original holiday border styling
    if (
      cell.classList.contains("us-holiday") ||
      cell.classList.contains("uk-holiday") ||
      cell.classList.contains("in-holiday") ||
      cell.classList.contains("custom-holiday")
    ) {
      cell.style.setProperty("border", `3px solid ${borderColor}`, "important");
    } else {
      cell.style.removeProperty("border");
    }
    console.log("Reset styling, preserved holiday border");
  }

  // 🎨 CHILD ELEMENTS: Only enhance visibility, DON'T change positioning
  const regionAbbrev = cell.querySelector(".region-abbrev");
  if (regionAbbrev) {
    if (leaveType !== "none" && leaveType !== "") {
      // Only enhance contrast - don't change position or layout
      regionAbbrev.style.setProperty(
        "background",
        "rgba(0, 0, 0, 0.9)",
        "important"
      );
      regionAbbrev.style.setProperty("color", "white", "important");
      regionAbbrev.style.setProperty(
        "text-shadow",
        "1px 1px 2px rgba(0,0,0,0.8)",
        "important"
      );
      regionAbbrev.style.setProperty("border-radius", "2px", "important");
      regionAbbrev.style.setProperty("padding", "1px 2px", "important");
      // ❌ DON'T set position or z-index - let it stay in original position
    } else {
      // Reset only the styling we added
      regionAbbrev.style.removeProperty("background");
      regionAbbrev.style.removeProperty("color");
      regionAbbrev.style.removeProperty("text-shadow");
      regionAbbrev.style.removeProperty("border-radius");
      regionAbbrev.style.removeProperty("padding");
    }
  }

  const customStar = cell.querySelector(".custom-star");
  if (customStar) {
    if (leaveType !== "none" && leaveType !== "") {
      // Only enhance visibility - don't change position
      customStar.style.setProperty(
        "text-shadow",
        "1px 1px 2px rgba(0,0,0,0.9)",
        "important"
      );
      customStar.style.setProperty(
        "filter",
        "drop-shadow(1px 1px 2px rgba(0,0,0,0.8))",
        "important"
      );
      // ❌ DON'T set position or z-index
    } else {
      customStar.style.removeProperty("text-shadow");
      customStar.style.removeProperty("filter");
    }
  }

  const tooltip = cell.querySelector(".tooltip");
  if (tooltip) {
    if (leaveType !== "none" && leaveType !== "") {
      tooltip.style.setProperty(
        "background",
        "rgba(0, 0, 0, 0.9)",
        "important"
      );
      tooltip.style.setProperty("color", "white", "important");
    } else {
      tooltip.style.removeProperty("background");
      tooltip.style.removeProperty("color");
    }
  }

  const specialIcons = cell.querySelector(".special-date-icons");
  if (specialIcons) {
    if (leaveType !== "none" && leaveType !== "") {
      // Only enhance visibility - don't change position or layout
      specialIcons.style.setProperty(
        "text-shadow",
        "1px 1px 2px rgba(0,0,0,0.9)",
        "important"
      );
      specialIcons.style.setProperty(
        "filter",
        "drop-shadow(1px 1px 2px rgba(0,0,0,0.8))",
        "important"
      );
      // ❌ DON'T set position or z-index - let it stay in original position
    } else {
      specialIcons.style.removeProperty("text-shadow");
      specialIcons.style.removeProperty("filter");
    }
  }
}

// 🔄 ENHANCED loadUserHolidays function (CRITICAL FOR GANTT)
function loadUserHolidays() {
  const userSelect = document.getElementById("userSelect");
  const currentUserName = document.getElementById("currentUserName");
  const calendarEl = document.getElementById("calendar");

  if (!userSelect || !currentUserName || !calendarEl) {
    console.error("Required elements not found for loadUserHolidays");
    return;
  }

  if (!userSelect.value) {
    console.error("No user selected");
    return;
  }

  const user = userSelect.value;
  currentUserName.textContent = user;

  if (!window.holidays) {
    window.holidays = {};
  }

  const key = getKey(viewDate);
  const savedData = (holidays[user] || {})[key] || {};

  // Get pending selections
  const pendingKey = getPendingKey();
  const pendingData = pendingHolidays[pendingKey] || {};

  // Merge saved and pending data (pending takes precedence)
  const combinedData = { ...savedData, ...pendingData };

  calendarEl.querySelectorAll(".day").forEach((cell) => {
    const dayNum = parseInt(cell.dataset.day);

    // Clear ALL existing leave classes first
    cell.classList.remove(
      "holiday",
      "morning-half",
      "afternoon-half",
      "full-day"
    );

    // Check if this day has leave (saved or pending)
    if (combinedData.hasOwnProperty(dayNum)) {
      const leaveType = combinedData[dayNum];

      if (leaveType === "morning") {
        cell.classList.add("morning-half");
        applyHalfDayVisuals(cell, "morning");
      } else if (leaveType === "afternoon") {
        cell.classList.add("afternoon-half");
        applyHalfDayVisuals(cell, "afternoon");
      } else if (leaveType === "full") {
        cell.classList.add("holiday", "full-day");
        applyHalfDayVisuals(cell, "full");
      } else {
        // Fallback for old data format
        cell.classList.add("holiday", "full-day");
        applyHalfDayVisuals(cell, "full");
      }
    } else {
      // No leave - ensure visual styling is cleared
      applyHalfDayVisuals(cell, "none");
    }
  });

  // ❌ REMOVED: Don't update Gantt here - only show saved holidays in Gantt
  console.log(`✅ Loaded holidays for ${user} (saved + pending selections)`);
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

// User-specific holiday functions
function populateDropdown() {
  const userSelect = document.getElementById("userSelect");
  const currentUserName = document.getElementById("currentUserName");

  if (!userSelect || !currentUserName) {
    console.error(
      "User select elements not found - userSelect:",
      !!userSelect,
      "currentUserName:",
      !!currentUserName
    );
    return;
  }

  if (!teamMembers || teamMembers.length === 0) {
    console.error("No team members found");
    return;
  }

  userSelect.innerHTML = "";
  teamMembers.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    userSelect.appendChild(opt);
  });

  if (teamMembers.length > 0) {
    currentUserName.textContent = teamMembers[0];
  }
}

function formatMemberList(names) {
  if (names.length <= 3) {
    // Short list: simple comma-separated
    return names.join(", ");
  } else {
    // Long list: display as a grid, 2 or 3 columns depending on count
    const columns = names.length >= 9 ? 3 : 2; // More columns for longer lists
    return `
      <div style="
        display: grid; 
        grid-template-columns: repeat(${columns}, 1fr); 
        gap: 2px 12px; 
        text-align: left; 
        margin: 4px 0 0 0;
      ">
        ${names.map((name) => `<span>${name}</span>`).join("")}
      </div>
    `;
  }
}

// REPLACE your existing saveHolidays() function with this updated version

function saveHolidays() {
  const user = userSelect.value;
  const key = getKey(viewDate);

  if (!holidays[user]) holidays[user] = {};

  // Build the new object format from calendar state
  const monthLeaveData = {};

  calendarEl.querySelectorAll(".day").forEach((cell) => {
    const day = parseInt(cell.dataset.day);

    // Check what type of leave this day has
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
    // If none of the above, the day has no leave (don't add to object)
  });

  // Save in new object format
  holidays[user][key] = monthLeaveData;
  localStorage.setItem("holidays", JSON.stringify(holidays));

  // CRITICAL: Reload the visual display after saving
  loadUserHolidays();
  updateMonthlyView();
}

function getWorkingDaysInMonth(year, month) {
  // month is 0-indexed (0 = January)
  let workingDays = 0;
  const totalDays = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= totalDays; d++) {
    const day = new Date(year, month, d).getDay();
    if (day >= 1 && day <= 5) workingDays++; // Mon-Fri
  }
  return workingDays;
}

function renderGanttLegendMembers() {
  const legend = document.getElementById("legendMembers");
  if (!legend) return;

  legend.innerHTML = teamMembers
    .map(
      (name) =>
        `<span title="${name}" style="display:inline-block;width:15px;height:15px;border-radius:3px;background:${userColors[name]};margin-right:3px;border:1px solid #999;vertical-align:middle;"></span>`
    )
    .join("");
}

function updateMonthlyView() {
  // Re-run metrics, stats, and the Gantt
  updateMetrics();
  updateUserStats();
  renderMonthlyGantt();
  renderGanttLegendMembers();
  // Update new panel
  updateNewPanelMetrics();
  updateNewHolidayList();
  updateQuickStatsPills();
  updateSpecialDatesKPI();
  renderSwiperMembers();
}

function updateMetrics() {
  const monthKey = getKey(viewDate);
  const monthName = viewDate.toLocaleString("default", { month: "long" });
  const daysInMonth = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth() + 1,
    0
  ).getDate();

  // — SUMMARY CALCULATIONS —
  const total = teamMembers.reduce((sum, m) => {
    const memberData = (holidays[m] || {})[monthKey] || {};
    return sum + calculateLeaveDays(memberData);
  }, 0);
  const avg = (total / teamMembers.length).toFixed(1);

  let peak = 0,
    peakDay = null,
    lowDays = 0,
    lowestAvail = teamMembers.length,
    lowestDay = null;

  for (let d = 1; d <= daysInMonth; d++) {
    const offCount = teamMembers.filter((m) => {
      return hasLeaveOnDay(m, monthKey, d);
    }).length;
    if (offCount > peak) {
      peak = offCount;
      peakDay = d;
    }
    const avail = teamMembers.length - offCount;
    if (avail < 3) lowDays++;
    if (avail < lowestAvail) {
      lowestAvail = avail;
      lowestDay = d;
    }
  }

  let zeroLeaveDays = 0;
  let totalWorkingDays = 0;
  let publicHolidayCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
    if (dt.getDay() === 0 || dt.getDay() === 6) continue;
    // Check if this day is a public holiday
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(dt.getDate()).padStart(2, "0")}`;
    if (publicHolidays[key]) {
      publicHolidayCount++;
      continue;
    }
    totalWorkingDays++;
    const offCount = teamMembers.filter((m) =>
      hasLeaveOnDay(m, monthKey, d)
    ).length;
    if (offCount === 0) zeroLeaveDays++;
  }
  const kpiZeroLeaveEl = document.getElementById("kpi-zero-leave-days");
  if (kpiZeroLeaveEl)
    kpiZeroLeaveEl.textContent = `${zeroLeaveDays}/${totalWorkingDays}`;
  // Add blue message for excluded public holidays
  const kpiZeroLeaveMsgEl = document.getElementById("kpi-zero-leave-msg");
  if (kpiZeroLeaveMsgEl) {
    if (publicHolidayCount > 0) {
      kpiZeroLeaveMsgEl.innerHTML = `<span style=\"color:#1976d2;font-size:0.92em;\">(excluding ${publicHolidayCount} public holiday${
        publicHolidayCount !== 1 ? "s" : ""
      })</span>`;
    } else {
      kpiZeroLeaveMsgEl.innerHTML = "";
    }
  }

  const noLeaveMembers = teamMembers.filter((m) => {
    const memberData = (holidays[m] || {})[monthKey] || {};
    return calculateLeaveDays(memberData) === 0;
  });
  const kpiNoLeaveMembersEl = document.getElementById("kpi-no-leave-members");
  if (kpiNoLeaveMembersEl)
    kpiNoLeaveMembersEl.textContent = noLeaveMembers.length || "0";
  const kpiNoLeaveMembersListEl = document.getElementById(
    "kpi-no-leave-members-list"
  );
  if (kpiNoLeaveMembersListEl)
    kpiNoLeaveMembersListEl.textContent =
      noLeaveMembers.length > 0 ? noLeaveMembers.join(", ") : "—";

  const totalHolidaysValueEl = document.getElementById("totalHolidaysValue");
  if (totalHolidaysValueEl) totalHolidaysValueEl.textContent = `${total} days`;
  const avgHolidaysValueEl = document.getElementById("avgHolidaysValue");
  if (avgHolidaysValueEl) avgHolidaysValueEl.textContent = `${avg} days`;
  const peakDaysValueEl = document.getElementById("peakDaysValue");
  if (peakDaysValueEl)
    peakDaysValueEl.innerHTML = peakDay
      ? `${getOrdinal(
          peakDay
        )} ${monthName}<br><span style="font-size:0.9em;color:#555;">(${peak} members)</span>`
      : "-";
  const lowAvailabilityValueEl = document.getElementById(
    "lowAvailabilityValue"
  );
  if (lowAvailabilityValueEl)
    lowAvailabilityValueEl.textContent = `${lowDays} days`;
  const lowestAvailabilityValueEl = document.getElementById(
    "lowestAvailabilityValue"
  );
  if (lowestAvailabilityValueEl)
    lowestAvailabilityValueEl.innerHTML = lowestDay
      ? `${getOrdinal(
          lowestDay
        )} ${monthName}<br><span style="font-size:0.92em;color:#555;">(only ${lowestAvail} available)</span>`
      : "-";

  const availByDay = Array.from({ length: daysInMonth }, (_, i) => {
    const offCount = teamMembers.filter((m) =>
      hasLeaveOnDay(m, monthKey, i + 1)
    ).length;
    return teamMembers.length - offCount;
  });

  const counts = teamMembers
    .map((m) => ({
      name: m,
      days: calculateLeaveDays((holidays[m] || {})[monthKey] || {}),
    }))
    .sort((a, b) => b.days - a.days);

  renderLeaveShareChart(
    counts.map((c) => c.days),
    counts.map((c) => c.name),
    counts.map((c) => userColors[c.name])
  );

  renderCalendarHeatmap(availByDay, "calendarHeatmapFull");
  renderDailyAvailabilityChart(availByDay);
  renderWeeklyAvailabilityChart(availByDay);
  renderEmployeeTilesWithSparklines();
  renderMemberLeaveBarChart();

  if (document.getElementById("atRiskChart")) {
    renderAtRiskDaysChart(availByDay, 3);
  }

  // — KPI CARDS: Main Dashboard Row —
  const workingDays = getWorkingDaysInMonth(
    viewDate.getFullYear(),
    viewDate.getMonth()
  );
  const maxCapacity = workingDays * teamMembers.length;
  const availPercent = Math.round(((maxCapacity - total) / maxCapacity) * 100);
  const gaugeEl = document.querySelector(".gauge");
  if (gaugeEl) {
    gaugeEl.dataset.percent = availPercent;
    gaugeEl.style.background = `conic-gradient(var(--brand-green) 0% ${availPercent}%, #e0e0e0 ${availPercent}% 100%)`;
  }
  const today = new Date();
  let onLeave = 0,
    onLeaveNames = "-";
  if (
    viewDate.getFullYear() === today.getFullYear() &&
    viewDate.getMonth() === today.getMonth()
  ) {
    const membersToday = teamMembers.filter((m) =>
      hasLeaveOnDay(m, monthKey, today.getDate())
    );
    onLeave = membersToday.length;
    onLeaveNames = membersToday.length ? formatMemberList(membersToday) : "-";
  }
  const kpiTotalEl = document.getElementById("kpi-total-leave");
  if (kpiTotalEl) {
    animateCountUp("kpi-total-leave", total);
    animateCountUp("kpi-avg-leave", avg);
    animateCountUp("kpi-avail-pct", availPercent, "%");
    const offEl = document.getElementById("kpi-off-today");
    if (offEl) {
      offEl.innerHTML = `
      ${onLeave}
      <span class="kpi-subtext" style="display:block; margin-top:6px; font-weight:400; font-size:0.33em; color:#1976d2;">
        ${
          Array.isArray(onLeaveNames)
            ? onLeaveNames.join(", ")
            : typeof onLeaveNames === "string"
            ? onLeaveNames
            : "-"
        }
      </span>
    `;
    }
    animateCountUp("kpi-at-risk", lowDays);
    const atRiskDaysList = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
      if (dt.getDay() === 0 || dt.getDay() === 6) continue;
      const offCount = teamMembers.filter((m) =>
        hasLeaveOnDay(m, monthKey, d)
      ).length;
      const avail = teamMembers.length - offCount;
      if (avail < 3) atRiskDaysList.push({ day: d, avail });
    }
    const atRiskListEl = document.getElementById("kpi-at-risk-list");
    if (atRiskListEl) {
      if (atRiskDaysList.length === 0) {
        atRiskListEl.innerHTML = `<span style="color:#43a047;">All working days meet threshold!</span>`;
      } else {
        atRiskListEl.innerHTML =
          atRiskDaysList
            .slice(0, 3)
            .map(
              (row) =>
                `<span style="margin-right:10px;color:#e53935 !important;">${getOrdinal(
                  row.day
                )}: <b>${row.avail} avail</b></span>`
            )
            .join("") +
          (atRiskDaysList.length > 3
            ? `<span style="color:#f44336;">+${
                atRiskDaysList.length - 3
              } more…</span>`
            : "");
      }
    }
    // Calculate trend versus last month
    const prevDate = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth() - 1,
      1
    );
    const prevKey = getKey(prevDate);
    const thisTotal = teamMembers.reduce(
      (s, m) => s + calculateLeaveDays((holidays[m] || {})[monthKey] || {}),
      0
    );
    const prevTotal = teamMembers.reduce(
      (s, m) => s + calculateLeaveDays((holidays[m] || {})[prevKey] || {}),
      0
    );

    let trendText;
    if (prevTotal === 0 && thisTotal === 0) {
      trendText = "—";
    } else if (prevTotal === 0 && thisTotal > 0) {
      trendText = "+∞% this month";
    } else {
      const pct = Math.round(((thisTotal - prevTotal) / prevTotal) * 100);
      trendText = (pct >= 0 ? "+" : "") + pct + "% this month";
    }
    const kpiTotalLeaveChangeEl = document.getElementById(
      "kpi-total-leave-change"
    );
    if (kpiTotalLeaveChangeEl) kpiTotalLeaveChangeEl.textContent = trendText;
  }

  // Call Gantt rendering BEFORE updating new panel
  renderMonthlyGantt();

  // — MEMBER STATS TABLE (side panel)
  const takenLeave = counts.filter((x) => x.days > 0);
  const minLeave = takenLeave.length
    ? Math.min(...takenLeave.map((x) => x.days))
    : 0;
  const minMembers = takenLeave
    .filter((x) => x.days === minLeave)
    .map((x) => x.name);
  const noneOff = counts.filter((x) => x.days === 0).length;
  const noneOffNames = counts.filter((x) => x.days === 0).map((x) => x.name);
  const topMembersValueEl = document.getElementById("topMembersValue");
  if (topMembersValueEl)
    topMembersValueEl.innerHTML = `${counts[0].name}<br><span style="font-size:0.92em;color:#555;">(${counts[0].days} days)</span>`;
  const leastMembersValueEl = document.getElementById("leastMembersValue");
  if (leastMembersValueEl)
    leastMembersValueEl.innerHTML = takenLeave.length
      ? `${minMembers.join(
          ", "
        )}<br><span style="font-size:0.92em;color:#555;">(${minLeave} day${
          minLeave !== 1 ? "s" : ""
        })</span>`
      : "-";
  const noLeaveMembersValueEl = document.getElementById("noLeaveMembersValue");
  if (noLeaveMembersValueEl)
    noLeaveMembersValueEl.innerHTML = `${noneOff} member${
      noneOff === 1 ? "" : "s"
    }<br><span style="font-size:0.92em;color:#555;">${
      noneOffNames.length ? formatMemberList(noneOffNames) : "-"
    }</span>`;
  const onLeaveTodayValueEl = document.getElementById("onLeaveTodayValue");
  if (onLeaveTodayValueEl)
    onLeaveTodayValueEl.innerHTML = `${onLeave} member${
      onLeave === 1 ? "" : "s"
    }<br><span style="font-size:0.92em;color:#555;">${onLeaveNames}</span>`;

  // — NEW KPI CARDS: Dashboard-Only (bottom row)
  if (document.getElementById("kpi-upcoming-leave")) {
    const todayDate = new Date().getDate();
    // Build upcoming leave: members with leave in next 7 days, and their leave count in that window
    const upcomingMembers = teamMembers
      .map((member) => {
        const memberData = (holidays[member] || {})[monthKey] || {};
        let count = 0;
        for (let d = todayDate; d <= todayDate + 7; d++) {
          if (hasLeaveOnDay(member, monthKey, d)) {
            count++;
          }
        }
        return { name: member, count };
      })
      .filter((x) => x.count > 0);

    document.getElementById("kpi-upcoming-leave").textContent =
      upcomingMembers.length;

    // Show names and leave count in a similar style to top leave takers
    const upcomingNamesEl = document.getElementById("kpi-upcoming-leave-names");
    if (upcomingNamesEl) {
      upcomingNamesEl.innerHTML = upcomingMembers.length
        ? `<div style="font-size:0.96em;line-height:1.6;text-align:center;word-break:break-word;">` +
          upcomingMembers
            .map(
              (x) =>
                `<span style="color:#1976d2;">${x.name}</span> <span style="color:#444; font-size:0.95em;">(${x.count})</span>`
            )
            .join(", ") +
          `</div>`
        : "<span style='color:#bbb;'>–</span>";
    }

    const topLeaveNumEl = document.getElementById("kpi-top-leave-num");
    const topLeaveNamesEl = document.getElementById("kpi-top-leave-names");

    if (topLeaveNumEl && topLeaveNamesEl) {
      const totals = teamMembers.map((member) => ({
        name: member,
        days: calculateLeaveDays((holidays[member] || {})[monthKey] || {}),
      }));
      const sorted = totals
        .filter((x) => x.days > 0)
        .sort((a, b) => b.days - a.days)
        .slice(0, 3);

      topLeaveNumEl.textContent = sorted.length;

      topLeaveNamesEl.innerHTML = sorted.length
        ? sorted
            .map(
              (x) =>
                `<span style="color:#1976d2;">${x.name}</span> <span style="color:#444; font-size:0.95em;">(${x.days})</span>`
            )
            .join("<br>")
        : "<span style='color:#bbb;'>–</span>";
    }

    // --- On Leave This Month KPI Card ---
    const monthLeaveNumEl = document.getElementById("kpi-month-leave-num");
    const monthLeaveNamesEl = document.getElementById("kpi-month-leave-names");
    if (monthLeaveNumEl && monthLeaveNamesEl) {
      // Get members who have any leave this month
      const monthLeaveMembers = teamMembers
        .map((member) => {
          const memberData = (holidays[member] || {})[monthKey] || {};
          const totalDays = calculateLeaveDays(memberData);
          return {
            name: member,
            days: totalDays,
            dates: Object.keys(memberData)
              .map((d) => parseInt(d))
              .sort((a, b) => a - b),
          };
        })
        .filter((x) => x.days > 0);

      // Number for the KPI
      monthLeaveNumEl.textContent = monthLeaveMembers.length;

      // Names, days, dates - 2 per row, comma separated
      if (monthLeaveMembers.length) {
        // Build a comma-separated string: Name (days)
        const namesString = monthLeaveMembers
          .map(
            (x) =>
              `<span style="color:#1976d2;">${x.name}</span> <span style="color:#444; font-size:0.95em;">(${x.days})</span>`
          )
          .join(", ");
        // Use CSS to wrap text within the card
        monthLeaveNamesEl.innerHTML = `<div style="font-size:0.96em;line-height:1.6;text-align:center;word-break:break-word;">${namesString}</div>`;
      } else {
        monthLeaveNamesEl.innerHTML = "<span style='color:#bbb;'>–</span>";
      }
    }

    const prevDate = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth() - 1,
      1
    );
    const prevKey = getKey(prevDate);
    const thisTotal = teamMembers.reduce(
      (s, m) => s + calculateLeaveDays((holidays[m] || {})[monthKey] || {}),
      0
    );
    const prevTotal = teamMembers.reduce(
      (s, m) => s + calculateLeaveDays((holidays[m] || {})[prevKey] || {}),
      0
    );
    const trendPct =
      prevTotal === 0
        ? "—"
        : Math.round(((thisTotal - prevTotal) / prevTotal) * 100) + "%";
    document.getElementById("kpi-monthly-trend").textContent = trendPct;

    const growthEl = document.getElementById("kpi-request-growth");
    if (growthEl) {
      if (!Array.isArray(requests)) {
        growthEl.textContent = "—";
      } else {
        const thisReq = requests.filter((r) => {
          const d = new Date(r.startDate);
          return (
            d.getFullYear() === viewDate.getFullYear() &&
            d.getMonth() === viewDate.getMonth()
          );
        }).length;
        const prevReq = requests.filter((r) => {
          const d = new Date(r.startDate);
          return (
            d.getFullYear() === prevDate.getFullYear() &&
            d.getMonth() === prevDate.getMonth()
          );
        }).length;
        growthEl.textContent =
          prevReq === 0
            ? "—"
            : Math.round(((thisReq - prevReq) / prevReq) * 100) + "%";
      }
    }
  }

  // — 6-Month Multi-Member Trend Chart
  renderMultiMemberLeaveTrendChart();

  // — Side-panel At-Risk Days KPI (legacy)
  const riskKpiContent = document.getElementById("riskKpiContent");
  const threshold = 3;
  const atRisk = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const offCount = teamMembers.filter((m) =>
      hasLeaveOnDay(m, monthKey, d)
    ).length;
    const avail = teamMembers.length - offCount;
    const dt = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
    if (avail < threshold && dt.getDay() !== 0 && dt.getDay() !== 6) {
      atRisk.push({ date: dt.toLocaleDateString(), avail });
    }
  }
  if (riskKpiContent) {
    if (atRisk.length === 0) {
      riskKpiContent.innerHTML = `
        <div class="risk-kpi-icon risk-kpi-icon-ok"><img src="https://cdn-icons-png.flaticon.com/512/190/190411.png" alt="Check" style="width:36px;height:36px;"/></div>
        <div class="risk-kpi-main risk-kpi-good">No At-Risk Days</div>
        <div class="risk-kpi-label">All working days meet availability</div>
      `;
    } else {
      riskKpiContent.innerHTML = `
        <div class="risk-kpi-icon"><img src="https://cdn-icons-png.flaticon.com/512/753/753345.png" alt="Alert" style="width:36px;height:36px;"/></div>
        <div class="risk-kpi-main risk-kpi-bad">${atRisk.length} at-risk</div>
        <div class="risk-kpi-label">Days below threshold</div>
        <div class="risk-kpi-list">
          ${atRisk
            .slice(0, 3)
            .map(
              (row) => `
            <div class="risk-kpi-list-row">
              <span>${row.date}</span>
              <span class="risk-kpi-pill">${row.avail}</span>
            </div>
          `
            )
            .join("")}
          ${
            atRisk.length > 3
              ? `<div class="risk-kpi-more">+${atRisk.length - 3} more…</div>`
              : ""
          }
        </div>
      `;
    }
  }

  // Update new panel at the end
  updateNewPanelMetrics();
  updateNewHolidayList();
  updateSpecialDatesKPI();
}

// Update Quick Stats Pills
function updateQuickStatsPills() {
  const monthKey = getKey(viewDate);
  const today = new Date();

  // 1. Team Size
  document.getElementById("stat-team-size").textContent = teamMembers.length;

  // 2. Members on Holiday This Month
  const membersWithHolidays = teamMembers.filter((member) => {
    const memberData = (holidays[member] || {})[monthKey] || {};
    return calculateLeaveDays(memberData) > 0;
  }).length;
  document.getElementById("stat-on-holiday").textContent = membersWithHolidays;

  // 3. Availability Percentage
  const totalHolidays = teamMembers.reduce((sum, m) => {
    const memberData = (holidays[m] || {})[monthKey] || {};
    return sum + calculateLeaveDays(memberData);
  }, 0);
  const workingDays = getWorkingDaysInMonth(
    viewDate.getFullYear(),
    viewDate.getMonth()
  );
  const maxCapacity = workingDays * teamMembers.length;
  const availPercent = Math.round(
    ((maxCapacity - totalHolidays) / maxCapacity) * 100
  );
  document.getElementById("stat-availability").textContent = availPercent + "%";

  // 4. Birthdays This Month
  let birthdaysThisMonth = 0;
  Object.entries(birthdays).forEach(([member, birthDate]) => {
    const birthDateObj = new Date(birthDate);
    if (birthDateObj.getMonth() === viewDate.getMonth()) {
      birthdaysThisMonth++;
    }
  });
  document.getElementById("stat-birthdays").textContent = birthdaysThisMonth;

  // 5. Anniversaries This Month
  let anniversariesThisMonth = 0;
  Object.entries(anniversaries).forEach(([member, anniversaryData]) => {
    let monthToCheck;

    // Handle both old and new data structures
    if (typeof anniversaryData === "string") {
      // Old format: "2020-03-15"
      const anniversaryDateObj = new Date(anniversaryData);
      monthToCheck = anniversaryDateObj.getMonth();
    } else {
      // New format: { startYear: 2020, monthDay: "03-15", originalDate: "2020-03-15" }
      const [month] = anniversaryData.monthDay.split("-").map(Number);
      monthToCheck = month - 1; // Convert to 0-based month
    }

    if (monthToCheck === viewDate.getMonth()) {
      anniversariesThisMonth++;
    }
  });
  document.getElementById("stat-anniversaries").textContent =
    anniversariesThisMonth;
  // 6. Off Today
  let offToday = 0;
  if (
    viewDate.getFullYear() === today.getFullYear() &&
    viewDate.getMonth() === today.getMonth()
  ) {
    offToday = teamMembers.filter((m) => {
      return hasLeaveOnDay(m, monthKey, today.getDate());
    }).length;
    document.getElementById("stat-off-today").textContent = offToday;
    updateSpecialDatesKPI();
  }
}

// 2) Populate the user-stats list
function updateUserStats() {
  const statsEl = document.getElementById("userStats");
  if (!statsEl) return; // Skip if old panel doesn't exist

  statsEl.innerHTML = "";
  const monthKey = getKey(viewDate);
  teamMembers.forEach((m) => {
    const days = calculateLeaveDays((holidays[m] || {})[monthKey] || {});
    const stat = document.createElement("div");
    stat.className = "member-stat";
    const dot = document.createElement("span");
    dot.className = "member-dot";
    dot.style.backgroundColor = userColors[m];
    stat.appendChild(dot);
    // create left and right spans for proper alignment
    const nameSpan = document.createElement("span");
    nameSpan.textContent = m;
    const daysSpan = document.createElement("span");
    daysSpan.textContent = `${days} day${days !== 1 ? "s" : ""}`;
    stat.appendChild(nameSpan);
    stat.appendChild(daysSpan);
    statsEl.appendChild(stat);
  });
}

// Pie chart instance (so you can update it later)
let leaveShareChart;

// Helper to render or update the pie chart
function renderLeaveShareChart(leaveCounts, memberNames, memberColors) {
  const ctx = document.getElementById("leaveShareChart");
  if (!ctx) return; // Skip if dashboard not available

  // CRITICAL FIX: Destroy existing chart first
  const existingChart = Chart.getChart(ctx);
  if (existingChart) {
    existingChart.destroy();
  }

  const context = ctx.getContext("2d");

  // Create new chart
  window.leaveShareChart = new Chart(context, {
    type: "pie",
    data: {
      labels: memberNames,
      datasets: [
        {
          data: leaveCounts,
          backgroundColor: memberColors,
          borderColor: "#fff",
          borderWidth: 2,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          display: false, // legend off for compactness
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const name = context.label;
              const days = context.parsed;
              return `${name}: ${days} day${days !== 1 ? "s" : ""}`;
            },
          },
        },
      },
    },
  });
}

// 3. Daily Availability Line Chart
// REPLACE your existing renderDailyAvailabilityChart() function with this fixed version

function renderDailyAvailabilityChart(availByDay) {
  const ctx = document.getElementById("dailyAvailChart");
  if (!ctx) return; // Skip if dashboard not available

  const context = ctx.getContext("2d");
  const daysInMonth = availByDay.length;

  // Build data with weekend/holiday awareness
  const chartData = [];
  const backgroundColors = [];
  const borderColors = [];
  const labels = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
    const dayOfWeek = dt.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Check if it's a public holiday
    const holidayKey = `${dt.getFullYear()}-${String(
      dt.getMonth() + 1
    ).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    const isPublicHoliday =
      publicHolidays[holidayKey] || customHolidays[holidayKey];

    labels.push(String(d));

    if (isWeekend) {
      // Weekend: 0 availability, gray color
      chartData.push(0);
      backgroundColors.push("#9e9e9e");
      borderColors.push("#757575");
    } else if (isPublicHoliday) {
      // Public Holiday: 0 availability, red color
      chartData.push(0);
      backgroundColors.push("#f44336");
      borderColors.push("#d32f2f");
    } else {
      // Working day: actual availability, blue color
      chartData.push(availByDay[d - 1]);
      backgroundColors.push("#2196f3");
      borderColors.push("#1976d2");
    }
  }

  if (window.dailyChart) {
    dailyChart.data.labels = labels;
    dailyChart.data.datasets[0].data = chartData;
    dailyChart.data.datasets[0].backgroundColor = backgroundColors;
    dailyChart.data.datasets[0].borderColor = borderColors;
    dailyChart.update();
  } else {
    window.dailyChart = new Chart(context, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Available Team Members",
            data: chartData,
            fill: true,
            tension: 0.3,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 2,
            pointBackgroundColor: backgroundColors,
            pointBorderColor: borderColors,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: teamMembers.length,
            title: {
              display: true,
              text: "Available Members",
            },
          },
          x: {
            title: {
              display: true,
              text: "Day of Month",
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                const day = context.parsed.x + 1;
                const dt = new Date(
                  viewDate.getFullYear(),
                  viewDate.getMonth(),
                  day
                );
                const dayOfWeek = dt.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const holidayKey = `${dt.getFullYear()}-${String(
                  dt.getMonth() + 1
                ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isPublicHoliday =
                  publicHolidays[holidayKey] || customHolidays[holidayKey];

                let suffix = "";
                if (isWeekend) {
                  suffix = " (Weekend)";
                } else if (isPublicHoliday) {
                  suffix = " (Public Holiday)";
                }

                return `Available: ${context.parsed.y}/${teamMembers.length}${suffix}`;
              },
            },
          },
        },
      },
    });
  }
}
// 4. Weekly Availability Bar Chart
function renderWeeklyAvailabilityChart(availByDay) {
  const ctx = document.getElementById("weeklyAvailChart");
  if (!ctx) return; // Skip if dashboard not available

  // CRITICAL FIX: Destroy existing chart first
  const existingChart = Chart.getChart(ctx);
  if (existingChart) {
    existingChart.destroy();
  }

  // group into weeks & compute averages
  const weeks = [];
  availByDay.forEach((v, i) => {
    const wk = Math.floor(i / 7);
    (weeks[wk] = weeks[wk] || []).push(v);
  });
  const labels = weeks.map((_, i) => `Wk${i + 1}`);
  const data = weeks.map(
    (w) => +(w.reduce((a, b) => a + b, 0) / w.length).toFixed(1)
  );

  // find the minimum avg
  const minAvg = Math.min(...data);

  // build a color array: red for worst week, blue for the rest
  const bgColors = data.map((val) => (val === minAvg ? "#f44336" : "#2196f3"));

  const context = ctx.getContext("2d");

  window.weeklyChart = new Chart(context, {
    type: "bar",
    data: { labels, datasets: [{ data, backgroundColor: bgColors }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, max: teamMembers.length } },
      plugins: { legend: { display: false } },
    },
  });
}

// Helper: Get past N months as [YYYY-MM] strings, newest last
function getPastNMonths(year, month, n) {
  const arr = [];
  for (let i = n - 1; i >= 0; i--) {
    let m = month - i;
    let y = year;
    while (m < 0) {
      m += 12;
      y -= 1;
    }
    arr.push(`${y}-${String(m + 1).padStart(2, "0")}`);
  }
  return arr;
}

// Render the single multi-line leave trend chart
function renderMultiMemberLeaveTrendChart() {
  const canvas = document.getElementById("multiMemberLeaveTrendChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Gather data
  const now = new Date();
  const months = getPastNMonths(now.getFullYear(), now.getMonth(), 6);
  const monthLabels = months.map((key) => {
    const d = new Date(key.split("-")[0], +key.split("-")[1] - 1, 1);
    return d.toLocaleString("default", { month: "short" });
  });

  // Create datasets: one per member
  const datasets = teamMembers.map((member) => {
    const memberHolidays = holidays[member] || {};
    const trend = months.map((mkey) =>
      calculateLeaveDays(memberHolidays[mkey] || {})
    );
    return {
      label: member,
      data: trend,
      fill: false,
      borderColor: userColors[member],
      backgroundColor: userColors[member],
      tension: 0.25,
      pointRadius: 3,
      pointHoverRadius: 5,
      borderWidth: 2,
      spanGaps: true,
    };
  });

  // Destroy old chart if exists
  if (window.multiMemberLeaveTrendChartObj) {
    window.multiMemberLeaveTrendChartObj.destroy();
  }

  // Create Chart.js multi-line chart
  window.multiMemberLeaveTrendChartObj = new Chart(ctx, {
    type: "line",
    data: {
      labels: monthLabels,
      datasets: datasets,
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: { boxWidth: 18, font: { size: 13 } },
        },
        title: {
          display: false,
        },
        tooltip: {
          mode: "nearest",
          intersect: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "Days Off" },
        },
        x: {
          title: { display: true, text: "Month" },
        },
      },
    },
  });
}

function renderCalendarHeatmap(availByDay, elementId = "calendarHeatmapFull") {
  const container = document.getElementById(elementId);
  if (!container) return; // Skip if dashboard not available

  container.innerHTML = ""; // clear old

  // 2.1 — Weekday headers
  ["S", "M", "T", "W", "T", "F", "S"].forEach((dow) => {
    const hdr = document.createElement("div");
    hdr.className = "heat-cell heat-header";
    hdr.textContent = dow;
    container.appendChild(hdr);
  });

  // 2.2 — Spacer blanks up to the 1st weekday
  const firstDay = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth(),
    1
  ).getDay();
  for (let i = 0; i < firstDay; i++) {
    const sp = document.createElement("div");
    sp.className = "heat-cell heat-spacer";
    container.appendChild(sp);
  }

  // 2.3 — Actual day‐cells
  availByDay.forEach((availableCount, idx) => {
    const dayNum = idx + 1;
    const cell = document.createElement("div");
    cell.className = "heat-cell";

    // weekend?
    const dt = new Date(viewDate.getFullYear(), viewDate.getMonth(), dayNum);
    if (dt.getDay() === 0 || dt.getDay() === 6) {
      cell.classList.add("weekend-cell");
    }

    // fill in day number
    cell.textContent = dayNum;

    // intensity = percent off
    const pctOff = (teamMembers.length - availableCount) / teamMembers.length;
    cell.style.setProperty("--alpha", pctOff.toFixed(2));

    // tooltip
    cell.title = `${teamMembers.length - availableCount} off`;

    container.appendChild(cell);
  });
}

// 6. Cumulative Leave Trend (Area)
function renderMemberLeaveBarChart() {
  const ctx = document.getElementById("cumulativeTrendChart");
  if (!ctx) return; // Skip if dashboard not available

  const context = ctx.getContext("2d");
  const monthKey = getKey(viewDate);

  // Get leave data for each member
  const memberLeaveData = teamMembers.map((member) => ({
    name: member,
    days: calculateLeaveDays((holidays[member] || {})[monthKey] || {}),
    color: userColors[member],
  }));

  // Sort by days (highest first) for better visualization
  memberLeaveData.sort((a, b) => b.days - a.days);

  const labels = memberLeaveData.map((m) => m.name);
  const data = memberLeaveData.map((m) => m.days);
  const backgroundColors = memberLeaveData.map((m) => m.color);
  const borderColors = memberLeaveData.map((m) => m.color);

  if (window.cumChart) {
    cumChart.data.labels = labels;
    cumChart.data.datasets[0].data = data;
    cumChart.data.datasets[0].backgroundColor = backgroundColors;
    cumChart.data.datasets[0].borderColor = borderColors;
    cumChart.update();
  } else {
    window.cumChart = new Chart(context, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Days Off",
            data: data,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            stepSize: 1,
            title: {
              display: true,
              text: "Days Off",
            },
          },
          x: {
            title: {
              display: true,
              text: "Team Members",
            },
            ticks: {
              maxRotation: 45,
              minRotation: 0,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const days = context.parsed.y;
                return `${context.label}: ${days} day${
                  days !== 1 ? "s" : ""
                } off`;
              },
            },
          },
        },
        elements: {
          bar: {
            borderRadius: 6,
          },
        },
      },
    });
  }
}

// 7. At-Risk Days Bar Chart
function renderAtRiskDaysChart(availByDay, threshold = 3) {
  const ctx = document.getElementById("atRiskChart");
  if (!ctx) return; // Skip if dashboard not available

  const labels = [],
    data = [];
  availByDay.forEach((av, i) => {
    if (av < threshold) {
      labels.push(String(i + 1));
      data.push(av);
    }
  });
  const context = ctx.getContext("2d");
  if (window.riskChart) {
    riskChart.data.labels = labels;
    riskChart.data.datasets[0].data = data;
    riskChart.update();
  } else {
    window.riskChart = new Chart(context, {
      type: "bar",
      data: { labels, datasets: [{ data, backgroundColor: brandRed }] },
      options: {
        scales: { y: { beginAtZero: true, max: teamMembers.length } },
        plugins: { legend: { display: false } },
      },
    });
  }
}

function renderMonthlyGantt() {
  const ganttContainer = document.getElementById("monthlyGantt");
  if (!ganttContainer) {
    console.error("Gantt container not found");
    return;
  }

  if (!window.viewDate) {
    console.error("viewDate not initialized");
    return;
  }

  if (!teamMembers || teamMembers.length === 0) {
    console.error("No team members available for Gantt");
    ganttContainer.innerHTML =
      '<p style="text-align: center; padding: 20px;">No team members to display</p>';
    return;
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthKey = getKey(viewDate); // ADD THIS LINE - was missing!

  // Map public holidays per day
  const holidayMap = {};
  Object.entries(publicHolidays).forEach(([date, infos]) => {
    const [y, m, d] = date.split("-").map(Number);
    if (y === year && m - 1 === month) {
      holidayMap[d] = infos.map((h) => h.region);
    }
  });

  // Add custom holidays
  Object.entries(customHolidays).forEach(([date, name]) => {
    const [y, m, d] = date.split("-").map(Number);
    if (y === year && m - 1 === month) {
      holidayMap[d] = (holidayMap[d] || []).concat("Custom");
    }
  });

  let html = '<div class="premium-gantt-table-container">';
  html += '<table class="premium-gantt-table"><thead><tr>';
  html += '<th class="member-cell" style="left:0;z-index:10;">Member</th>';

  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay();
    let holidayClass = "";
    if (holidayMap[d]) {
      if (holidayMap[d].includes("UK")) holidayClass += " uk-holiday";
      if (holidayMap[d].includes("US")) holidayClass += " us-holiday";
      if (holidayMap[d].includes("Custom")) holidayClass += " custom-holiday";
    }
    if (dow === 0 || dow === 6) holidayClass += " weekend";
    html += `<th class="${holidayClass.trim()}" title="${
      holidayMap[d] ? holidayMap[d].join(" & ") + " Holiday" : ""
    }">${d}</th>`;
  }
  html += '<th class="total-header">Total</th></tr></thead><tbody>';

  teamMembers.forEach((member) => {
    const initials = member
      .split(" ")
      .map((n) => n.charAt(0))
      .join("");

    html += `<tr><td class="member-cell">${member}</td>`;

    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month, d).getDay();
      let cellClass = "";
      if (holidayMap[d]) {
        if (holidayMap[d].includes("UK")) cellClass += " uk-holiday";
        if (holidayMap[d].includes("US")) cellClass += " us-holiday";
        if (holidayMap[d].includes("Custom")) cellClass += " custom-holiday";
      }
      if (dow === 0 || dow === 6) cellClass += " weekend";

      if (hasLeaveOnDay(member, monthKey, d)) {
        const memberData = (holidays[member] || {})[monthKey] || {};
        const leaveType = memberData[d];

        let avatarClass = "avatar";
        let badge = "";

        if (leaveType === "morning") {
          avatarClass = "avatar morning-half";
          badge = '<span class="time-badge morning-badge">AM</span>';
        } else if (leaveType === "afternoon") {
          avatarClass = "avatar afternoon-half";
          badge = '<span class="time-badge afternoon-badge">PM</span>';
        }

        html += `<td class="leave-cell${cellClass}">
    <div class="avatar-container">
      <div class="${avatarClass}" style="--member-color: ${userColors[member]}; font-size:0.82em;">${initials}</div>
      ${badge}
    </div>
  </td>`;
      } else {
        html += `<td class="blank-cell${cellClass}"></td>`;
      }
    }

    // Total cell with member color pill
    const memberData = (holidays[member] || {})[monthKey] || {};
    const totalDays = calculateLeaveDays(memberData);
    html += `<td class="total-cell"><span class="total-pill" style="background:${userColors[member]};">${totalDays}</span></td></tr>`;
  });

  html += "</tbody></table></div>";
  ganttContainer.innerHTML = html;
}
function renderMemberList() {
  const listEl = document.getElementById("memberList");
  if (!listEl) return;
  listEl.innerHTML = "";
  teamMembers.forEach((name) => {
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.padding = "4px 0";
    li.textContent = name;

    const btn = document.createElement("button");
    btn.textContent = "Remove";
    btn.style.background = "#f44336";
    btn.style.color = "#fff";
    btn.style.border = "none";
    btn.style.borderRadius = "4px";
    btn.style.padding = "2px 6px";
    btn.style.cursor = "pointer";
    btn.onclick = () => {
      if (!confirm(`Remove ${name}?`)) return;
      teamMembers = teamMembers.filter((m) => m !== name);
      saveTeamMembers();
      updateUserColors();
      populateDropdown();
      renderMemberList();
      updateMonthlyView();
      buildCalendar();
      renderGanttLegendMembers();
    };

    li.appendChild(btn);
    listEl.appendChild(li);
  });
}

function renderCustomHolidayList() {
  const listEl = document.getElementById("customHolidayList");
  if (!listEl) {
    console.log("customHolidayList element not found - skipping render");
    return; // Exit early if element doesn't exist
  }

  listEl.innerHTML = "";
  Object.entries(customHolidays).forEach(([date, name]) => {
    const li = document.createElement("li");
    li.className = "custom-holiday";
    li.textContent = `${new Date(date).toLocaleDateString()} – ${name}`;

    const btn = document.createElement("button");
    btn.textContent = "Remove";
    btn.style.background = "#f44336";
    btn.style.color = "#fff";
    btn.style.border = "none";
    btn.style.borderRadius = "4px";
    btn.style.padding = "2px 6px";
    btn.style.cursor = "pointer";
    btn.onclick = () => {
      if (!confirm(`Remove holiday on ${date}?`)) return;
      delete customHolidays[date];
      saveCustomHolidays();
      renderCustomHolidayList();
      buildCalendar();
      updateHolidayList();
    };

    li.appendChild(btn);
    listEl.appendChild(li);
  });
}

// Create sparklines for all employees for last 6 months
function renderEmployeeTilesWithSparklines() {
  const grid = document.getElementById("employeeTilesGrid");
  if (!grid) return;
  grid.innerHTML = "";
  const now = new Date();
  const months = getPastNMonths(now.getFullYear(), now.getMonth(), 6);
  const monthLabels = months.map((key) => {
    const d = new Date(key.split("-")[0], +key.split("-")[1] - 1, 1);
    return d.toLocaleString("default", { month: "short" });
  });

  teamMembers.forEach((member) => {
    // Count leave days for each of the last 6 months
    const memberHolidays = holidays[member] || {};
    const trend = months.map((mkey) =>
      calculateLeaveDays(memberHolidays[mkey] || {})
    );

    // Create card
    const card = document.createElement("div");
    card.className = "employee-tile-card";

    // Avatar (initials)
    const avatar = document.createElement("div");
    avatar.style = `
    width:40px;height:40px;border-radius:50%;
    background:${userColors[member]};
    color:#fff;font-size:1.13em;font-weight:700;
    display:flex;align-items:center;justify-content:center;margin-bottom:4px;box-shadow:0 1px 6px #1235;
  `;
    avatar.textContent = member
      .split(" ")
      .map((x) => x[0])
      .join("");
    card.appendChild(avatar);

    // Name
    const nameDiv = document.createElement("div");
    nameDiv.textContent = member;
    nameDiv.style = "font-weight:600;margin-bottom:7px;text-align:center;";
    card.appendChild(nameDiv);

    // Sparkline canvas
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 28;
    card.appendChild(canvas);

    // Data labels (months)
    const labelDiv = document.createElement("div");
    labelDiv.innerHTML = monthLabels.join(" ");
    labelDiv.style =
      "font-size:0.84em;color:#888;margin-top:4px;letter-spacing:1.5px;text-align:center;";
    card.appendChild(labelDiv);

    // Days off total
    const total = trend[trend.length - 1];
    const daysOff = document.createElement("div");
    daysOff.textContent = `This month: ${total} day${total === 1 ? "" : "s"}`;
    daysOff.style = "margin-top:2px;font-size:0.93em;color:#222;";
    card.appendChild(daysOff);

    grid.appendChild(card);

    // Draw the sparkline
    const ctx = canvas.getContext("2d");
    const w = canvas.width,
      h = canvas.height,
      n = trend.length;
    // Sparkline points: scale Y to max leave (for clarity, at least teamMembers.length/2)
    const maxY = Math.max(...trend, Math.ceil(teamMembers.length / 2), 1);
    ctx.strokeStyle = "#1976d2";
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * w;
      const y = h - (trend[i] / maxY) * h * 0.75 - 5;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Fill under line (soft blue)
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.globalAlpha = 0.17;
    ctx.fillStyle = "#2196f3";
    ctx.fill();
    ctx.globalAlpha = 1;
    // Dots
    ctx.fillStyle = "#1976d2";
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * w,
        y = h - (trend[i] / maxY) * h * 0.75 - 5;
      ctx.beginPath();
      ctx.arc(x, y, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// NEW HOLIDAY INSIGHTS PANEL JAVASCRIPT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

// Main panel collapse/expand
function toggleMainPanel() {
  const panel = document.getElementById("floatingPanel");
  const button = document.getElementById("mainPanelCollapseBtn");

  panel.classList.toggle("panel-collapsed");

  if (panel.classList.contains("panel-collapsed")) {
    button.innerHTML = "‹";
    button.style.transform = "rotate(180deg)";
  } else {
    button.innerHTML = "›";
    button.style.transform = "rotate(0deg)";
  }
}

// Individual accordion toggle
function toggleAccordion(cardId) {
  const card = document.getElementById(cardId);
  if (!card) return;

  const content = card.querySelector(".accordion-content");
  const arrow = card.querySelector(".accordion-arrow");

  card.classList.toggle("expanded");

  if (card.classList.contains("expanded")) {
    content.classList.add("expanded");
    arrow.style.transform = "rotate(90deg)";
  } else {
    content.classList.remove("expanded");
    arrow.style.transform = "rotate(0deg)";
  }
}

// Update metrics in new panel
function updateNewPanelMetrics() {
  const monthKey = getKey(viewDate);
  const monthName = viewDate.toLocaleString("default", { month: "long" });
  const daysInMonth = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth() + 1,
    0
  ).getDate();

  // Calculate metrics (reuse existing logic)
  const total = teamMembers.reduce((sum, m) => {
    const memberData = (holidays[m] || {})[monthKey] || {};
    return sum + calculateLeaveDays(memberData);
  }, 0);
  const avg = (total / teamMembers.length).toFixed(1);

  let peak = 0,
    peakDay = null,
    lowDays = 0,
    lowestAvail = teamMembers.length,
    lowestDay = null;

  for (let d = 1; d <= daysInMonth; d++) {
    const offCount = teamMembers.filter((m) =>
      hasLeaveOnDay(m, monthKey, d)
    ).length;
    if (offCount > peak) {
      peak = offCount;
      peakDay = d;
    }
    const avail = teamMembers.length - offCount;
    if (avail < 3) lowDays++;
    if (avail < lowestAvail) {
      lowestAvail = avail;
      lowestDay = d;
    }
  }

  // Update metrics in new panel
  const totalEl = document.getElementById("total-leave-metric");
  if (totalEl) totalEl.textContent = `${total} days`;

  const avgEl = document.getElementById("avg-leave-metric");
  if (avgEl) avgEl.textContent = `${avg} days`;

  const peakEl = document.getElementById("peak-absence-metric");
  if (peakEl)
    peakEl.textContent = peakDay ? `${getOrdinal(peakDay)} ${monthName}` : "–";

  const lowEl = document.getElementById("low-avail-metric");
  if (lowEl) lowEl.textContent = `${lowDays} days`;

  const lowestEl = document.getElementById("lowest-day-metric");
  if (lowestEl)
    lowestEl.textContent = lowestDay
      ? `${getOrdinal(lowestDay)} ${monthName}`
      : "–";

  // Update team stats
  const counts = teamMembers
    .map((m) => ({
      name: m,
      days: calculateLeaveDays((holidays[m] || {})[monthKey] || {}),
    }))
    .sort((a, b) => b.days - a.days);

  const takenLeave = counts.filter((x) => x.days > 0);
  const minLeave = takenLeave.length
    ? Math.min(...takenLeave.map((x) => x.days))
    : 0;
  const minMembers = takenLeave
    .filter((x) => x.days === minLeave)
    .map((x) => x.name);
  const noneOff = counts.filter((x) => x.days === 0).length;

  const topEl = document.getElementById("top-members-metric");
  if (topEl) topEl.textContent = counts[0]?.name || "–";

  const leastEl = document.getElementById("least-members-metric");
  if (leastEl)
    leastEl.textContent = takenLeave.length ? minMembers.join(", ") : "–";

  const noLeaveEl = document.getElementById("no-leave-metric");
  if (noLeaveEl)
    noLeaveEl.textContent = `${noneOff} member${noneOff === 1 ? "" : "s"}`;

  // Off today calculation
  const today = new Date();
  let onLeave = 0;
  if (
    viewDate.getFullYear() === today.getFullYear() &&
    viewDate.getMonth() === today.getMonth()
  ) {
    const membersToday = teamMembers.filter((m) =>
      hasLeaveOnDay(m, monthKey, today.getDate())
    );
    onLeave = membersToday.length;
  }
  const offTodayEl = document.getElementById("off-today-metric");
  if (offTodayEl)
    offTodayEl.textContent = `${onLeave} member${onLeave === 1 ? "" : "s"}`;
}

// Update holiday list in new panel
function updateNewHolidayList() {
  const listEl = document.getElementById("holiday-list-new");
  if (!listEl) return;

  listEl.innerHTML = "";
  const monthName = viewDate.toLocaleString("default", { month: "long" });
  const year = viewDate.getFullYear(),
    month = viewDate.getMonth() + 1;

  // Public holidays
  Object.entries(publicHolidays).forEach(([date, infos]) => {
    infos.forEach((info) => {
      const [y, m, d] = date.split("-").map(Number);
      if (y === year && m === month) {
        const item = document.createElement("div");
        item.className = "holiday-item";
        item.innerHTML = `
        <div class="holiday-icon holiday-${info.region.toLowerCase()}">
          ${
            info.region === "UK"
              ? "UK"
              : info.region === "US"
              ? "US"
              : info.region === "IN"
              ? "IN"
              : "⭐"
          }
        </div>
        <span>${getOrdinal(d)} ${monthName} - ${info.name}</span>
      `;
        listEl.appendChild(item);
      }
    });
  });

  // Custom holidays
  Object.entries(customHolidays).forEach(([date, name]) => {
    const [y, m, d] = date.split("-").map(Number);
    if (y === year && m === month) {
      const item = document.createElement("div");
      item.className = "holiday-item";
      item.innerHTML = `
      <div class="holiday-icon holiday-custom">⭐</div>
      <span>${getOrdinal(d)} ${monthName} - ${name}</span>
    `;
      listEl.appendChild(item);
    }
  });

  if (listEl.children.length === 0) {
    listEl.innerHTML =
      '<div class="holiday-item"><span style="color: #666; font-style: italic;">No holidays this month</span></div>';
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded - Starting initialization");
  // Initialize dashboard view to monthly by default
  window.currentDashboardView = "monthly";

  // Set up filter change handler
  const monthFilter = document.getElementById("monthFilter");
  if (monthFilter) {
    monthFilter.addEventListener("change", onMonthFilterChange);
  }

  // Initialize ALL core variables FIRST
  window.viewDate = new Date();
  console.log("Setting viewDate to:", window.viewDate);
  window.holidays = JSON.parse(localStorage.getItem("holidays")) || {};

  migrateHolidayData();

  // Ensure teamMembers is available
  if (!window.teamMembers) {
    window.teamMembers = teamMembers;
  }

  // Ensure userColors is available
  if (!window.userColors) {
    window.userColors = userColors;
    updateUserColors();
  }

  // Initialize DOM element references
  window.calendarEl = document.getElementById("calendar");
  window.userSelect = document.getElementById("userSelect");
  window.currentUserName = document.getElementById("currentUserName");
  window.monthYearDisplay = document.getElementById("monthYearDisplay");
  window.saveBtn = document.getElementById("saveBtn");
  window.prevBtn = document.getElementById("prevBtn");
  window.nextBtn = document.getElementById("nextBtn");
  window.clearBtn = document.getElementById("clearBtn");

  // Debug check
  console.log("Elements found:", {
    calendar: !!window.calendarEl,
    userSelect: !!window.userSelect,
    currentUserName: !!window.currentUserName,
    monthYearDisplay: !!window.monthYearDisplay,
    gantt: !!document.getElementById("monthlyGantt"),
  });
  console.log("Data available:", {
    teamMembers: teamMembers?.length || 0,
    holidays: Object.keys(window.holidays).length,
  });

  // Populate dropdown and initialize member list
  populateDropdown();
  renderMemberList();
  updateUserColors();

  // Set up event handlers
  if (window.prevBtn) {
    window.prevBtn.onclick = () => {
      viewDate.setMonth(viewDate.getMonth() - 1);
      buildCalendar();
      updateMonthlyView();
      renderSwiperMembers();
    };
  }

  if (window.nextBtn) {
    window.nextBtn.onclick = () => {
      viewDate.setMonth(viewDate.getMonth() + 1);
      buildCalendar();
      updateMonthlyView();
      renderSwiperMembers();
    };
  }

  if (window.saveBtn) {
    window.saveBtn.onclick = function () {
      const user = userSelect.value;
      const monthKey = getKey(viewDate);
      const pendingKey = getPendingKey();

      // Apply pending changes to actual holidays
      if (pendingHolidays[pendingKey]) {
        if (!holidays[user]) holidays[user] = {};
        if (!holidays[user][monthKey]) holidays[user][monthKey] = {};

        // Merge pending selections into saved holidays
        Object.assign(holidays[user][monthKey], pendingHolidays[pendingKey]);

        // Clear pending selections
        delete pendingHolidays[pendingKey];
      }

      // Save to localStorage
      localStorage.setItem("holidays", JSON.stringify(holidays));

      // Clear auto-reset timer
      if (autoResetTimer) {
        clearTimeout(autoResetTimer);
        autoResetTimer = null;
      }

      // NOW update Gantt and other views
      renderMonthlyGantt();
      updateMonthlyView();

      // Show confetti
      throwConfetti();

      console.log("✅ Holidays saved successfully and Gantt updated");
    };
  }

  if (window.clearBtn) {
    window.clearBtn.onclick = function () {
      if (!confirm("Clear all holidays for this user this month?")) return;

      const user = userSelect.value;
      const monthKey = getKey(viewDate);
      const pendingKey = getPendingKey();

      // Clear both saved and pending holidays
      if (!holidays[user]) holidays[user] = {};
      holidays[user][monthKey] = {};

      // Clear pending selections
      if (pendingHolidays[pendingKey]) {
        delete pendingHolidays[pendingKey];
      }

      // Clear auto-reset timer
      if (autoResetTimer) {
        clearTimeout(autoResetTimer);
        autoResetTimer = null;
      }

      localStorage.setItem("holidays", JSON.stringify(holidays));
      loadUserHolidays();
      updateMonthlyView();

      console.log("✅ All holidays cleared (saved and pending)");
    };
  }

  if (window.userSelect) {
    window.userSelect.onchange = function () {
      const user = userSelect.value;
      const currentUserName = document.getElementById("currentUserName");
      if (currentUserName) {
        currentUserName.textContent = user;
      }

      // Clear any pending selections for the previous user
      clearPendingSelections();

      // Force reload the calendar for the new user
      loadUserHolidays();
      updateMonthlyView();

      // Update the right panel metrics
      updateNewPanelMetrics();
      updateQuickStatsPills();
      updateSpecialDatesKPI();
    };
  }

  // Tab event handlers
  const tabCalendar = document.getElementById("tab-calendar");
  const tabDashboard = document.getElementById("tab-dashboard");
  const tabAdmin = document.getElementById("tab-admin");

  if (tabCalendar) tabCalendar.onclick = () => switchTab("calendarTab");
  if (tabAdmin) tabAdmin.onclick = () => switchTab("adminTab");
  if (tabDashboard)
    tabDashboard.onclick = () => {
      switchTab("dashboardTab");
      renderDashboardTab();
    };

  // Add Member handler (old admin)
  const addMemberBtn = document.getElementById("addMemberBtn");
  if (addMemberBtn) {
    addMemberBtn.onclick = function () {
      const nameInput = document.getElementById("newMemberName");
      if (!nameInput) return;

      const name = nameInput.value.trim();
      if (!name) return alert("Please enter a member name.");
      if (teamMembers.includes(name)) return alert("Member already exists.");

      teamMembers.push(name);
      saveTeamMembers();
      updateUserColors();
      populateDropdown();
      renderMemberList();
      updateMonthlyView();
      buildCalendar();
      renderGanttLegendMembers();
      nameInput.value = "";
    };
  }

  // Add Holiday handler (old admin)
  const addHolidayBtn = document.getElementById("addHolidayBtn");
  if (addHolidayBtn) {
    addHolidayBtn.onclick = function () {
      const dateInput = document.getElementById("newHolidayDate");
      const nameInput = document.getElementById("newHolidayName");
      if (!dateInput || !nameInput) return;

      const date = dateInput.value;
      const name = nameInput.value.trim();
      if (!date || !name) return alert("Select date and name.");

      const key = date;
      customHolidays[key] = name;
      saveCustomHolidays();
      renderCustomHolidayList();
      buildCalendar();
      updateHolidayList();
      dateInput.value = "";
      nameInput.value = "";
    };
  }

  // Initialize custom holiday list
  renderCustomHolidayList();

  // **CRITICAL: Build calendar and gantt on page load**
  // **CRITICAL: Build calendar and gantt on page load**
  console.log("Building calendar and gantt...");
  console.log("viewDate before buildCalendar:", window.viewDate);

  try {
    buildCalendar();
    console.log("buildCalendar completed successfully");

    updateMonthlyView();
    console.log("updateMonthlyView completed successfully");

    renderMonthlyGantt();
    console.log("renderMonthlyGantt completed successfully");

    renderGanttLegendMembers();
    console.log("renderGanttLegendMembers completed successfully");
  } catch (error) {
    console.error("Error during initial calendar build:", error);
    console.log("Attempting retry in 500ms...");

    // Try again after a short delay
    setTimeout(() => {
      try {
        console.log("Retry attempt starting...");
        buildCalendar();
        updateMonthlyView();
        renderMonthlyGantt();
        renderGanttLegendMembers();
        console.log("Retry attempt successful!");
      } catch (retryError) {
        console.error("Retry failed:", retryError);
        console.log("Manual debug - checking if elements exist:");
        console.log("calendar element:", !!document.getElementById("calendar"));
        console.log(
          "monthlyGantt element:",
          !!document.getElementById("monthlyGantt")
        );
        console.log("viewDate:", window.viewDate);
        console.log("teamMembers:", window.teamMembers?.length);
      }
    }, 500);
  }

  // FIX: Force admin initialization on page load (this is what makes it work!)
  setTimeout(() => {
    console.log("Forcing admin initialization...");
    if (typeof initializeHolidaysMode !== "undefined") {
      initializeHolidaysMode();
    }
  }, 200);

  // Auto-expand first accordion with delay
  setTimeout(() => {
    const firstAccordion = document.getElementById("monthly-summary-card");
    if (firstAccordion) {
      toggleAccordion("monthly-summary-card");
    }
  }, 800);

  // Initialize Swiper
  // Initialize Swiper
  renderSwiperMembers();
  const swiperEl = document.querySelector(".mySwiper");
  if (swiperEl) {
    window.swiper = new Swiper(".mySwiper", {
      effect: "coverflow",
      grabCursor: true,
      centeredSlides: true,
      slidesPerView: "auto",
      loop: true,
      coverflowEffect: {
        rotate: 33,
        stretch: 22,
        depth: 155,
        modifier: 1.7,
        slideShadows: false,
      },
      pagination: { el: ".swiper-pagination", clickable: true },
    });
  }

  // Update swiper when month changes
  document.addEventListener("monthChanged", () => {
    renderSwiperMembers();
    if (window.swiper) {
      window.swiper.update();
    }
  });

  console.log("Initialization complete");

  document.addEventListener("DOMContentLoaded", () => {
    // ... all your existing code ...

    // Initialize Gantt state
    initializeGanttState();

    console.log("Initialization complete");
  });
});

// ═══════════════════════════════════════════════════════════════════
// ADVANCED ADMIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

// Color and icon options for holidays
const holidayColors = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
];

const holidayIcons = [
  "🎉",
  "🎊",
  "🏖️",
  "🌟",
  "⭐",
  "🎈",
  "🎁",
  "🎀",
  "🌈",
  "☀️",
  "🌸",
  "🎯",
];

// Selected dates for multi-date picker
let selectedDates = [];
let selectedColor = "#8b5cf6";
let selectedIcon = "🎉";

// Admin mode switching
function switchAdminMode(clickedTab, targetId) {
  const container = clickedTab.closest(".advanced-admin-card");
  container
    .querySelectorAll(".admin-mode-tab")
    .forEach((tab) => tab.classList.remove("active"));
  container
    .querySelectorAll(".admin-mode-pane")
    .forEach((pane) => pane.classList.remove("active"));

  clickedTab.classList.add("active");
  document.getElementById(targetId).classList.add("active");

  // Initialize the specific mode
  if (targetId === "holidays-admin") {
    initializeHolidaysMode();
  } else if (targetId === "members-admin") {
    initializeMembersMode();
  } else if (targetId === "special-admin") {
    initializeSpecialDatesMode();
  }
}

// Initialize holidays mode
function initializeHolidaysMode() {
  initializeCompactHolidaysMode(); // Use new compact version
  renderExistingHolidaysList();
}

// Initialize members mode
function initializeMembersMode() {
  renderCurrentMembersList();
}

// Initialize special dates mode
function initializeSpecialDatesMode() {
  populateSpecialDateMemberDropdown();
  renderSpecialDatesList();
}

// Render color selector
function renderColorSelector() {
  const container = document.getElementById("colorSelector");
  if (!container) return;

  container.innerHTML = "";
  holidayColors.forEach((color, index) => {
    const colorDiv = document.createElement("div");
    colorDiv.className = "color-option";
    colorDiv.style.backgroundColor = color;
    if (index === 0) {
      colorDiv.classList.add("selected");
      selectedColor = color;
    }

    colorDiv.onclick = () => {
      container
        .querySelectorAll(".color-option")
        .forEach((opt) => opt.classList.remove("selected"));
      colorDiv.classList.add("selected");
      selectedColor = color;
    };

    container.appendChild(colorDiv);
  });
}

// Render icon selector
function renderIconSelector() {
  const container = document.getElementById("iconSelector");
  if (!container) return;

  container.innerHTML = "";
  holidayIcons.forEach((icon, index) => {
    const iconDiv = document.createElement("div");
    iconDiv.className = "icon-option";
    iconDiv.textContent = icon;
    if (index === 0) {
      iconDiv.classList.add("selected");
      selectedIcon = icon;
    }

    iconDiv.onclick = () => {
      container
        .querySelectorAll(".icon-option")
        .forEach((opt) => opt.classList.remove("selected"));
      iconDiv.classList.add("selected");
      selectedIcon = icon;
    };

    container.appendChild(iconDiv);
  });
}

// Multi-date calendar functionality
function renderMultiDateCalendar() {
  const container = document.getElementById("multiDateCalendar");
  if (!container) return;

  container.innerHTML = "";

  // Add day headers
  const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  dayHeaders.forEach((day) => {
    const header = document.createElement("div");
    header.className = "day-header";
    header.textContent = day;
    container.appendChild(header);
  });

  // Get current month info
  const today = new Date();
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Add empty cells for previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    const cell = document.createElement("div");
    cell.className = "day-cell other-month";
    cell.textContent = daysInPrevMonth - i;
    container.appendChild(cell);
  }

  // Add days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement("div");
    cell.className = "day-cell";
    cell.textContent = day;
    cell.dataset.date = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

    // Check if this date is already selected
    if (selectedDates.includes(cell.dataset.date)) {
      cell.classList.add("selected");
    }

    // Add click handler
    cell.onclick = () => toggleDateSelection(cell);

    container.appendChild(cell);
  }

  // Fill remaining cells with next month days
  const totalCells = container.children.length - 7; // Subtract header row
  const remainingCells = 42 - totalCells - 7; // 6 weeks * 7 days - current cells - headers
  for (let day = 1; day <= remainingCells; day++) {
    const cell = document.createElement("div");
    cell.className = "day-cell other-month";
    cell.textContent = day;
    container.appendChild(cell);
  }
}

// Toggle date selection
function toggleDateSelection(cell) {
  if (cell.classList.contains("other-month")) return;

  const date = cell.dataset.date;

  if (selectedDates.includes(date)) {
    // Remove date
    selectedDates = selectedDates.filter((d) => d !== date);
    cell.classList.remove("selected");
  } else {
    // Add date
    selectedDates.push(date);
    cell.classList.add("selected");
  }

  updateSelectedDatesDisplay();
}

// Update selected dates display
function updateSelectedDatesDisplay() {
  const container = document.getElementById("selectedDatesList");
  if (!container) return;

  if (selectedDates.length === 0) {
    container.innerHTML =
      '<span style="color: #94a3b8; font-style: italic;">No dates selected</span>';
    return;
  }

  container.innerHTML = "";
  selectedDates.sort().forEach((date) => {
    const tag = document.createElement("div");
    tag.className = "selected-date-tag";

    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    tag.innerHTML = `
      ${formattedDate}
      <span class="remove-date" onclick="removeDateFromSelection('${date}')">&times;</span>
    `;

    container.appendChild(tag);
  });
}

// Remove specific date from selection
function removeDateFromSelection(date) {
  selectedDates = selectedDates.filter((d) => d !== date);
  updateSelectedDatesDisplay();

  // Update calendar display
  const calendarCell = document.querySelector(`[data-date="${date}"]`);
  if (calendarCell) {
    calendarCell.classList.remove("selected");
  }
}

// Clear all selected dates
function clearSelectedDates() {
  selectedDates = [];
  updateSelectedDatesDisplay();

  // Update calendar display
  document.querySelectorAll(".day-cell.selected").forEach((cell) => {
    cell.classList.remove("selected");
  });
}

// Render current members list
function renderCurrentMembersList() {
  const container = document.getElementById("currentMembersList");
  if (!container) return;

  container.innerHTML = "";

  if (teamMembers.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: #64748b; padding: 20px;">No team members added yet.</p>';
    return;
  }

  teamMembers.forEach((member) => {
    const item = document.createElement("div");
    item.className = "admin-member-item";

    const initials = member
      .split(" ")
      .map((n) => n.charAt(0))
      .join("");

    item.innerHTML = `
      <div class="admin-member-content">
        <div class="admin-member-avatar">${initials}</div>
        <div class="admin-member-name">${member}</div>
      </div>
      <button class="admin-btn admin-btn-danger" onclick="removeMemberAdvanced('${member}')">
        Remove
      </button>
    `;

    container.appendChild(item);
  });
}

// Add new member
function addMemberAdvanced() {
  const input = document.getElementById("newMemberNameAdvanced");
  const name = input.value.trim();

  if (!name) {
    alert("Please enter a member name.");
    return;
  }

  if (teamMembers.includes(name)) {
    alert("Member already exists.");
    return;
  }

  teamMembers.push(name);
  saveTeamMembers();
  updateUserColors();
  populateDropdown();
  renderCurrentMembersList();
  populateSpecialDateMemberDropdown();
  updateMonthlyView();
  buildCalendar();
  renderGanttLegendMembers();

  input.value = "";
  alert(`${name} has been added to the team!`);
}

// Remove member
function removeMemberAdvanced(memberName) {
  if (!confirm(`Remove ${memberName} from the team?`)) return;

  teamMembers = teamMembers.filter((m) => m !== memberName);

  // Also remove their holidays, birthdays, and anniversaries
  delete holidays[memberName];
  delete birthdays[memberName];
  delete anniversaries[memberName];

  saveTeamMembers();
  localStorage.setItem("holidays", JSON.stringify(holidays));
  saveBirthdays();
  saveAnniversaries();

  updateUserColors();
  populateDropdown();
  renderCurrentMembersList();
  populateSpecialDateMemberDropdown();
  updateMonthlyView();
  buildCalendar();
  renderGanttLegendMembers();

  alert(`${memberName} has been removed from the team.`);
}

// Populate special date member dropdown
function populateSpecialDateMemberDropdown() {
  const select = document.getElementById("specialDateMember");
  if (!select) return;

  select.innerHTML = '<option value="">Select member...</option>';

  teamMembers.forEach((member) => {
    const option = document.createElement("option");
    option.value = member;
    option.textContent = member;
    select.appendChild(option);
  });
}

// Add enhanced holiday
function addEnhancedHoliday() {
  const nameInput = document.getElementById("holidayNameInput");
  const name = nameInput.value.trim();

  if (!name) {
    alert("Please enter a holiday name.");
    return;
  }

  if (selectedDates.length === 0) {
    alert("Please select at least one date.");
    return;
  }

  // Add holidays for each selected date
  selectedDates.forEach((date) => {
    enhancedCustomHolidays[date] = {
      name: name,
      color: selectedColor,
      icon: selectedIcon,
    };

    // Also add to regular customHolidays for backward compatibility
    customHolidays[date] = name;
  });

  saveEnhancedCustomHolidays();
  saveCustomHolidays();

  // Clear form
  nameInput.value = "";
  clearSelectedDates();

  // Refresh displays
  renderExistingHolidaysList();
  buildCalendar();
  updateHolidayList();
  updateNewHolidayList();

  alert(`Holiday "${name}" added for ${selectedDates.length} date(s)!`);
}

// Render existing holidays list
function renderExistingHolidaysList() {
  const container = document.getElementById("existingHolidaysList");
  if (!container) return;

  container.innerHTML = "";

  const holidays = Object.entries(enhancedCustomHolidays).concat(
    Object.entries(customHolidays)
      .filter(([date]) => !enhancedCustomHolidays[date])
      .map(([date, name]) => [date, { name, color: "#8b5cf6", icon: "🎉" }])
  );

  if (holidays.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: #64748b; padding: 20px;">No custom holidays added yet.</p>';
    return;
  }

  holidays
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .forEach(([date, holiday]) => {
      const item = document.createElement("div");
      item.className = "admin-member-item holiday-item";

      const dateObj = new Date(date);
      const formattedDate = dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      const holidayData =
        typeof holiday === "object"
          ? holiday
          : { name: holiday, color: "#8b5cf6", icon: "🎉" };

      item.innerHTML = `
      <div class="admin-member-content">
        <div class="admin-member-avatar" style="background: ${holidayData.color};">
          ${holidayData.icon}
        </div>
        <div>
          <div class="admin-member-name">${holidayData.name}</div>
          <div style="font-size: 0.85rem; color: #64748b;">${formattedDate}</div>
        </div>
      </div>
      <button class="admin-btn admin-btn-danger" onclick="removeEnhancedHoliday('${date}')">
        Remove
      </button>
    `;

      container.appendChild(item);
    });
}

// Remove enhanced holiday
function removeEnhancedHoliday(date) {
  const holidayName =
    enhancedCustomHolidays[date]?.name || customHolidays[date];

  if (
    !confirm(
      `Remove holiday "${holidayName}" on ${new Date(
        date
      ).toLocaleDateString()}?`
    )
  )
    return;

  delete enhancedCustomHolidays[date];
  delete customHolidays[date];

  saveEnhancedCustomHolidays();
  saveCustomHolidays();

  renderExistingHolidaysList();
  buildCalendar();
  updateHolidayList();
  updateNewHolidayList();

  alert(`Holiday "${holidayName}" has been removed.`);
}

// Add special date (birthday or anniversary)
function addSpecialDate() {
  const memberSelect = document.getElementById("specialDateMember");
  const typeSelect = document.getElementById("specialDateType");

  const member = memberSelect.value;
  const type = typeSelect.value;

  if (!member) {
    alert("Please select a team member.");
    return;
  }

  if (type === "birthday") {
    const dateInput = document.getElementById("birthdayDateInput");
    const date = dateInput.value;

    if (!date) {
      alert("Please select a birthday date.");
      return;
    }

    // Check if this member already has a birthday
    if (birthdays[member]) {
      if (
        !confirm(
          `${member} already has a birthday set. Do you want to update it?`
        )
      )
        return;
    }

    // Store birthday
    birthdays[member] = date;
    saveBirthdays();

    dateInput.value = "";
    alert(`Birthday for ${member} has been set!`);
  } else {
    // Anniversary
    const yearInput = document.getElementById("anniversaryYearInput");
    const dateInput = document.getElementById("anniversaryDateInput");

    const startYear = yearInput.value;
    const anniversaryDate = dateInput.value;

    if (!startYear || !anniversaryDate) {
      alert("Please select both start year and anniversary date.");
      return;
    }

    // Check if this member already has an anniversary
    if (anniversaries[member]) {
      if (
        !confirm(
          `${member} already has an anniversary set. Do you want to update it?`
        )
      )
        return;
    }

    // FIXED: Store anniversary with proper date format
    // Parse the selected date and extract month/day
    const dateObj = new Date(anniversaryDate);
    const month = dateObj.getMonth() + 1; // Get 1-based month
    const day = dateObj.getDate();

    // Create the anniversary date using the START YEAR (not the selected date year)
    const anniversaryFullDate = `${startYear}-${String(month).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;

    // Store in the NEW format for admin
    anniversaries[member] = {
      startYear: parseInt(startYear),
      monthDay: `${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0"
      )}`,
      originalDate: anniversaryFullDate,
    };

    saveAnniversaries();

    yearInput.value = new Date().getFullYear();
    dateInput.value = "";
    alert(
      `Work Anniversary for ${member} has been set! Started in ${startYear}.`
    );
  }

  // Clear form and refresh
  memberSelect.value = "";
  typeSelect.value = "birthday";
  toggleDateFields();
  renderSpecialDatesList();
  buildCalendar(); // This will refresh the calendar with new data
  updateSpecialDatesKPI(); // This will update the metrics
}

// Render special dates list
function renderSpecialDatesList() {
  const container = document.getElementById("specialDatesList");
  if (!container) return;

  container.innerHTML = "";

  const allSpecialDates = [];

  // Add birthdays
  Object.entries(birthdays).forEach(([member, date]) => {
    allSpecialDates.push({
      member,
      date,
      type: "birthday",
      icon: "🎂",
      color: "#ec4899",
      typeName: "Birthday",
    });
  });

  // Add anniversaries - FIXED to handle new data structure
  Object.entries(anniversaries).forEach(([member, anniversaryData]) => {
    let displayDate, startYear;

    // Handle both old and new data structures
    if (typeof anniversaryData === "string") {
      // Old format: "2020-03-15"
      displayDate = anniversaryData;
      const dateObj = new Date(anniversaryData);
      startYear = dateObj.getFullYear();
    } else {
      // New format: { startYear: 2020, monthDay: "03-15", originalDate: "2020-03-15" }
      // Use originalDate for display, or construct from monthDay if originalDate missing
      displayDate =
        anniversaryData.originalDate ||
        `${anniversaryData.startYear}-${anniversaryData.monthDay}`;
      startYear = anniversaryData.startYear;
    }

    allSpecialDates.push({
      member,
      date: displayDate,
      type: "anniversary",
      icon: "🎊",
      color: "#f59e0b",
      typeName: "Work Anniversary",
      startYear: startYear,
    });
  });

  if (allSpecialDates.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: #64748b; padding: 20px;">No special dates added yet.</p>';
    return;
  }

  // Sort by date
  allSpecialDates.sort((a, b) => new Date(a.date) - new Date(b.date));

  allSpecialDates.forEach((special) => {
    const item = document.createElement("div");
    item.className = `admin-member-item ${special.type}-item`;

    const dateObj = new Date(special.date);
    const formattedDate = dateObj.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });

    // Calculate years for anniversaries
    let yearText = "";
    if (special.type === "anniversary" && special.startYear) {
      const currentYear = new Date().getFullYear();
      const years = currentYear - special.startYear;
      if (years > 0) {
        yearText = ` (${years} year${years !== 1 ? "s" : ""})`;
      }
    }

    item.innerHTML = `
      <div class="admin-member-content">
        <div class="admin-member-avatar" style="background: ${special.color};">
          ${special.icon}
        </div>
        <div>
          <div class="admin-member-name">${special.member}</div>
          <div style="font-size: 0.85rem; color: #64748b;">
            ${special.typeName}: ${formattedDate}${yearText}
          </div>
        </div>
      </div>
      <button class="admin-btn admin-btn-danger" onclick="removeSpecialDate('${special.member}', '${special.type}')">
        Remove
      </button>
    `;

    container.appendChild(item);
  });
}

// Remove special date
function removeSpecialDate(member, type) {
  const typeName = type === "birthday" ? "Birthday" : "Work Anniversary";

  if (!confirm(`Remove ${typeName} for ${member}?`)) return;

  if (type === "birthday") {
    delete birthdays[member];
    saveBirthdays();
  } else {
    delete anniversaries[member];
    saveAnniversaries();
  }

  renderSpecialDatesList();
  buildCalendar();

  alert(`${typeName} for ${member} has been removed.`);
}

// Old accordion system (for backward compatibility)
document.querySelectorAll(".accordion-section").forEach((section) => {
  const header = section.querySelector(".header");
  if (header) {
    header.addEventListener("click", () => section.classList.toggle("open"));
  }
});

function renderDashboardTab() {
  // re-use your existing updateMetrics which also updates all charts
  updateMetrics();
}

const members = [
  {
    name: "Amy Aleman",
    avatar: "assets/team-photos/amy-aleman.jpeg",
    role: "Sr. Content & Proposal Manager (U.S.)",
    metric: "4 days leave", // This will be calculated dynamically
  },
  {
    name: "Amy Mangner",
    avatar: "assets/team-photos/amy-mangner.jpeg",
    role: "Sr. Content Manager, AI Initiatives (U.S.)",
    metric: "2 days leave",
  },
  {
    name: "Angie Lawrence",
    avatar: "assets/team-photos/angie-lawrence.jpeg",
    role: "Sr. Proposal Manager (U.S.)",
    metric: "3 days leave",
  },
  {
    name: "Daria Cullen",
    avatar: "assets/team-photos/daria-cullen.jpeg",
    role: "Sr. Proposal Manager (U.S.)",
    metric: "0 days leave",
  },
  {
    name: "Derrick Sprague",
    avatar: "assets/team-photos/derrick-sprague.jpeg",
    role: "Director, Bids and Proposals (U.S.)",
    metric: "1 day leave",
  },
  {
    name: "Diana Derrington",
    avatar: "assets/team-photos/diana-derrington.jpeg",
    role: "Sr. Proposal Manager (U.S.)",
    metric: "5 days leave",
  },
  {
    name: "Eric Ham",
    avatar: "assets/team-photos/eric-ham.jpeg",
    role: "Sr. Proposal Manager (U.S.)",
    metric: "2 days leave",
  },
  {
    name: "Gina Long",
    avatar: "assets/team-photos/gina-long.jpeg",
    role: "Manager, Proposal Team (U.S.)",
    metric: "0 days leave",
  },
  {
    name: "Gur Singh",
    avatar: "assets/team-photos/gur-singh.jpeg",
    role: "Proposal Manager (U.K.)",
    metric: "3 days leave",
  },
  {
    name: "Jess McCarthy",
    avatar: "assets/team-photos/jess-mccarthy.jpeg",
    role: "Proposal Team Lead (U.S.)",
    metric: "4 days leave",
  },
  {
    name: "Leslie Silkwood",
    avatar: "assets/team-photos/leslie-silkwood.jpeg",
    role: "Sr. Proposal Manager (U.S.)",
    metric: "1 day leave",
  },
  {
    name: "Matt Gramlich",
    avatar: "assets/team-photos/matt-gramlich.jpeg",
    role: "Manager, AI Content & Proposals (U.S.)",
    metric: "2 days leave",
  },
  {
    name: "Sean Manion",
    avatar: "assets/team-photos/sean-manion.jpeg",
    role: "Proposal Manager (U.S.)",
    metric: "0 days leave",
  },
  {
    name: "Tony Thornberry",
    avatar: "assets/team-photos/tony-thornberry.jpeg",
    role: "Principal Proposal Manager (U.S.)",
    metric: "3 days leave",
  },
];

// Render member cards
// Render member cards with real leave data
// Render member cards
function renderSwiperMembers() {
  const el = document.getElementById("swiperWrapper");
  if (!el) return; // Skip if swiper not available

  // Get current month key for leave calculations
  const monthKey = getKey(viewDate);

  // Update members array with real-time leave data
  const membersWithLeave = members.map((m) => {
    // Calculate actual leave days for current month
    const memberData = (holidays[m.name] || {})[monthKey] || {};
    const leaveDays = calculateLeaveDays(memberData);

    return {
      ...m,
      metric: `${leaveDays} day${leaveDays === 1 ? "" : "s"} leave`,
    };
  });

  el.innerHTML = membersWithLeave
    .map(
      (m) =>
        `<div class="swiper-slide">
    <img src="${m.avatar}" alt="${m.name}" />
    <div class="card-title">${m.name}</div>
    <div class="card-role">${m.role}</div>
    <div class="card-metrics">${m.metric}</div>
  </div>`
    )
    .join("");
}

// ═══════════════════════════════════════════════════════════════════
// COMPACT HOLIDAY CREATOR FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

let compactSelectedDates = new Set();
let compactSelectedColor = "#ef4444";
let compactSelectedIcon = "🎉";

// Generate compact calendar
function generateCompactCalendar() {
  const grid = document.getElementById("compactCalendarGrid");
  if (!grid) return;

  const today = new Date();
  const year = compactViewDate.getFullYear(); // Use compactViewDate
  const month = compactViewDate.getMonth(); // Use compactViewDate

  grid.innerHTML = "";

  // Headers
  const dayHeaders = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  dayHeaders.forEach((day) => {
    const header = document.createElement("div");
    header.className = "calendar-header";
    header.textContent = day;
    grid.appendChild(header);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = document.createElement("div");
    day.className = "calendar-day other-month";
    day.textContent = daysInPrevMonth - i;
    grid.appendChild(day);
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEl = document.createElement("div");
    dayEl.className = "calendar-day";
    dayEl.textContent = day;
    dayEl.onclick = () =>
      toggleCompactDate(
        dayEl,
        `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(
          2,
          "0"
        )}`
      );
    grid.appendChild(dayEl);
  }

  // Next month days
  const totalCells = grid.children.length - 7;
  const remainingCells = 35 - totalCells - 7;
  for (let day = 1; day <= remainingCells; day++) {
    const dayEl = document.createElement("div");
    dayEl.className = "calendar-day other-month";
    dayEl.textContent = day;
    grid.appendChild(dayEl);
  }
}

// Compact calendar view date (separate from main calendar)
let compactViewDate = new Date();

// Initialize compact calendar navigation
function initializeCompactCalendarNav() {
  const prevBtn = document.getElementById("compactPrevMonth");
  const nextBtn = document.getElementById("compactNextMonth");
  const monthYearDisplay = document.getElementById("compactMonthYearDisplay");

  if (!prevBtn || !nextBtn || !monthYearDisplay) return;

  // Set initial display
  updateCompactMonthYearDisplay();

  // Add event listeners
  prevBtn.onclick = () => {
    compactViewDate.setMonth(compactViewDate.getMonth() - 1);
    updateCompactMonthYearDisplay();
    generateCompactCalendar();
  };

  nextBtn.onclick = () => {
    compactViewDate.setMonth(compactViewDate.getMonth() + 1);
    updateCompactMonthYearDisplay();
    generateCompactCalendar();
  };
}

// Update the month/year display for compact calendar
function updateCompactMonthYearDisplay() {
  const display = document.getElementById("compactMonthYearDisplay");
  if (!display) return;

  const monthName = compactViewDate.toLocaleString("default", {
    month: "long",
  });
  const year = compactViewDate.getFullYear();
  display.textContent = `${monthName} ${year}`;
}

function toggleCompactDate(element, dateStr) {
  element.classList.toggle("selected");
  if (element.classList.contains("selected")) {
    compactSelectedDates.add(dateStr);
  } else {
    compactSelectedDates.delete(dateStr);
  }
  updateCompactSelectedDisplay();
  updateCompactCreateButton();
}

function updateCompactSelectedDisplay() {
  const display = document.getElementById("compactSelectedDatesDisplay");
  if (!display) return;

  const count = compactSelectedDates.size;

  if (count === 0) {
    display.innerHTML =
      '<span class="selected-count">0 dates selected</span> - Click dates above to select';
  } else {
    const dates = Array.from(compactSelectedDates)
      .sort()
      .map((date) => {
        return new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      });
    display.innerHTML = `<span class="selected-count">${count} dates selected:</span> ${dates.join(
      ", "
    )}`;
  }
}

function selectCompactColor(element) {
  document
    .querySelectorAll(".color-dot")
    .forEach((dot) => dot.classList.remove("selected"));
  element.classList.add("selected");
  compactSelectedColor = element.dataset.color;
  updateCompactPreview();
}

function selectCompactIcon(element) {
  document
    .querySelectorAll(".icon-option")
    .forEach((icon) => icon.classList.remove("selected"));
  element.classList.add("selected");
  compactSelectedIcon = element.dataset.icon;
  updateCompactPreview();
}

function updateCompactPreview() {
  const preview = document.getElementById("compactHolidayPreview");
  const iconEl = document.getElementById("compactPreviewIcon");
  const nameEl = document.getElementById("compactPreviewName");
  const nameInput = document.getElementById("holidayNameCompact");

  if (!preview || !iconEl || !nameEl || !nameInput) return;

  preview.style.background = compactSelectedColor;
  iconEl.textContent = compactSelectedIcon;
  nameEl.textContent = nameInput.value || "Holiday Name";
}

function updateCompactCreateButton() {
  const button = document.getElementById("compactCreateButton");
  const nameInput = document.getElementById("holidayNameCompact");

  if (!button || !nameInput) return;

  if (compactSelectedDates.size > 0 && nameInput.value.trim()) {
    button.disabled = false;
    button.textContent = `Create Holiday (${compactSelectedDates.size} dates)`;
  } else {
    button.disabled = true;
    button.textContent = "Create Holiday";
  }
}

function createCompactHoliday() {
  const nameInput = document.getElementById("holidayNameCompact");
  if (!nameInput) return;

  const name = nameInput.value.trim();
  if (!name || compactSelectedDates.size === 0) return;

  // Add holidays for each selected date
  compactSelectedDates.forEach((date) => {
    enhancedCustomHolidays[date] = {
      name: name,
      color: compactSelectedColor,
      icon: compactSelectedIcon,
    };
    // Also add to regular customHolidays for backward compatibility
    customHolidays[date] = name;
  });

  saveEnhancedCustomHolidays();
  saveCustomHolidays();

  // Clear form
  nameInput.value = "";
  compactSelectedDates.clear();
  document
    .querySelectorAll(".calendar-day.selected")
    .forEach((day) => day.classList.remove("selected"));

  // Refresh displays
  renderExistingHolidaysList();
  buildCalendar();
  updateHolidayList();
  updateNewHolidayList();
  updateCompactSelectedDisplay();
  updateCompactCreateButton();
  updateCompactPreview();

  alert(`Holiday "${name}" created successfully!`);
}

// Initialize compact holiday creator
function initializeCompactHolidaysMode() {
  generateCompactCalendar();

  // Listen for name input changes
  const nameInput = document.getElementById("holidayNameCompact");
  if (nameInput) {
    nameInput.addEventListener("input", () => {
      updateCompactPreview();
      updateCompactCreateButton();
    });
  }

  updateCompactPreview();
}

// ═══════════════════════════════════════════════════════════════════
// EXTENDED HOLIDAY CREATOR FUNCTIONS (PUBLIC + CUSTOM)
// ═══════════════════════════════════════════════════════════════════

let compactCurrentType = "custom";
let compactSelectedRegion = "US";

// Toggle between custom and public holiday types
function toggleHolidayType(type) {
  compactCurrentType = type;
  const regionSection = document.getElementById("regionSection");
  const customStyleSection = document.getElementById("customStyleSection");

  if (type === "public") {
    regionSection.style.display = "block";
    customStyleSection.style.display = "none";
  } else {
    regionSection.style.display = "none";
    customStyleSection.style.display = "block";
  }

  updateCompactPreview();
}

// Update the compact preview
function updateCompactPreview() {
  const preview = document.getElementById("compactHolidayPreview");
  const iconEl = document.getElementById("compactPreviewIcon");
  const nameEl = document.getElementById("compactPreviewName");
  const typeIndicator = document.getElementById("compactTypeIndicator");
  const nameInput = document.getElementById("holidayNameCompact");

  if (!preview || !iconEl || !nameEl || !typeIndicator || !nameInput) return;

  const regionRadio = document.querySelector('input[name="region"]:checked');
  compactSelectedRegion = regionRadio ? regionRadio.value : "US";

  if (compactCurrentType === "public") {
    preview.className = "preview-holiday public";
    preview.style.background = "#ef4444";

    const regionFlags = { US: "🇺🇸", UK: "🇬🇧", IN: "🇮🇳" };
    iconEl.textContent = regionFlags[compactSelectedRegion];
    typeIndicator.textContent = `${compactSelectedRegion} Public`;
  } else {
    preview.className = "preview-holiday custom";
    preview.style.background = compactSelectedColor;
    iconEl.textContent = compactSelectedIcon;
    typeIndicator.textContent = "Custom";
  }

  nameEl.textContent = nameInput.value || "Holiday Name";
}

// Update create button text
function updateCompactCreateButton() {
  const button = document.getElementById("compactCreateButton");
  const nameInput = document.getElementById("holidayNameCompact");

  if (!button || !nameInput) return;

  if (compactSelectedDates.size > 0 && nameInput.value.trim()) {
    button.disabled = false;
    const typeText = compactCurrentType === "public" ? "Public" : "Custom";
    button.textContent = `Create ${typeText} Holiday (${compactSelectedDates.size} dates)`;
  } else {
    button.disabled = true;
    button.textContent = "Create Holiday";
  }
}

// Create holiday (updated to handle both types)
function createCompactHoliday() {
  const nameInput = document.getElementById("holidayNameCompact");
  if (!nameInput) return;

  const name = nameInput.value.trim();
  if (!name || compactSelectedDates.size === 0) return;

  if (compactCurrentType === "public") {
    // Add to public holidays object
    compactSelectedDates.forEach((date) => {
      if (!publicHolidays[date]) {
        publicHolidays[date] = [];
      }

      // Check if this region already has a holiday on this date
      const existingIndex = publicHolidays[date].findIndex(
        (h) => h.region === compactSelectedRegion
      );
      if (existingIndex >= 0) {
        // Update existing
        publicHolidays[date][existingIndex].name = name;
      } else {
        // Add new
        publicHolidays[date].push({
          name: name,
          region: compactSelectedRegion,
        });
      }
    });

    // Save public holidays to localStorage
    localStorage.setItem("publicHolidays", JSON.stringify(publicHolidays));

    alert(
      `Created PUBLIC holiday: "${name}"\nRegion: ${compactSelectedRegion}\nDates: ${Array.from(
        compactSelectedDates
      ).join(", ")}`
    );
  } else {
    // Handle custom holidays (existing logic)
    compactSelectedDates.forEach((date) => {
      enhancedCustomHolidays[date] = {
        name: name,
        color: compactSelectedColor,
        icon: compactSelectedIcon,
      };
      customHolidays[date] = name;
    });

    saveEnhancedCustomHolidays();
    saveCustomHolidays();

    alert(
      `Created CUSTOM holiday: "${name}"\nColor: ${compactSelectedColor}\nIcon: ${compactSelectedIcon}\nDates: ${Array.from(
        compactSelectedDates
      ).join(", ")}`
    );
  }

  // Clear form and refresh displays
  resetCompactForm();
  refreshAllDisplays();
}

// Reset the compact form
function resetCompactForm() {
  const nameInput = document.getElementById("holidayNameCompact");
  if (nameInput) nameInput.value = "";

  compactSelectedDates.clear();
  document
    .querySelectorAll(".calendar-day.selected")
    .forEach((day) => day.classList.remove("selected"));

  // Reset to custom type
  const customRadio = document.querySelector('input[value="custom"]');
  if (customRadio) {
    customRadio.checked = true;
    toggleHolidayType("custom");
  }

  updateCompactSelectedDisplay();
  updateCompactCreateButton();
  updateCompactPreview();
}

// Refresh all calendar and panel displays
function refreshAllDisplays() {
  renderExistingHolidaysList();
  buildCalendar();
  updateHolidayList();
  updateNewHolidayList();
  updateMonthlyView();
}

// Initialize compact holiday creator (updated)
function initializeCompactHolidaysMode() {
  initializeCompactCalendarNav();
  generateCompactCalendar();

  // Listen for name input changes
  const nameInput = document.getElementById("holidayNameCompact");
  if (nameInput) {
    nameInput.addEventListener("input", () => {
      updateCompactPreview();
      updateCompactCreateButton();
    });
  }

  // Initialize public holidays from localStorage if available
  const savedPublicHolidays = localStorage.getItem("publicHolidays");
  if (savedPublicHolidays) {
    try {
      const parsed = JSON.parse(savedPublicHolidays);
      Object.assign(publicHolidays, parsed);
    } catch (e) {
      console.error("Failed to load saved public holidays:", e);
    }
  }

  updateCompactPreview();
}

// Toggle Gantt View Function
function toggleGanttView() {
  const container = document.getElementById("ganttContainer");
  const button = document.getElementById("ganttToggleBtn");
  const eyeIcon = document.getElementById("ganttEyeIcon");
  const toggleText = document.getElementById("ganttToggleText");
  const arrow = document.getElementById("ganttArrow");

  if (container.classList.contains("collapsed")) {
    // Expand - Show Gantt
    container.classList.remove("collapsed");
    button.classList.add("expanded");
    eyeIcon.textContent = "➖";
    toggleText.textContent = "Hide";
    arrow.textContent = "▲";

    // Save state
    localStorage.setItem("ganttExpanded", "true");
  } else {
    // Collapse - Hide Gantt
    container.classList.add("collapsed");
    button.classList.remove("expanded");
    eyeIcon.textContent = "➕";
    toggleText.textContent = "Show";
    arrow.textContent = "▼";

    // Save state
    localStorage.setItem("ganttExpanded", "false");
  }
}

// Initialize Gantt State on Page Load
function initializeGanttState() {
  const savedState = localStorage.getItem("ganttExpanded");

  if (savedState === "true") {
    // User previously had it expanded, so expand it
    toggleGanttView();
  }
  // Otherwise it stays collapsed by default (which matches your HTML)
}

// REPLACE your entire updateSpecialDatesKPI() function with this complete version

function updateSpecialDatesKPI() {
  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();

  const specialDatesThisMonth = [];

  // Check birthdays for current month
  Object.entries(birthdays).forEach(([member, birthDate]) => {
    const birthDateObj = new Date(birthDate);
    if (birthDateObj.getMonth() === currentMonth) {
      specialDatesThisMonth.push({
        member: member,
        date: birthDateObj.getDate(),
        type: "birthday",
        icon: "🎂",
        typeName: "Birthday",
      });
    }
  });

  // Check anniversaries for current month - UPDATED to handle new structure
  Object.entries(anniversaries).forEach(([member, anniversaryData]) => {
    let monthToCheck, dayToCheck, startYear;

    // Handle both old and new data structures
    if (typeof anniversaryData === "string") {
      // Old format: "2020-03-15"
      const anniversaryDateObj = new Date(anniversaryData);
      monthToCheck = anniversaryDateObj.getMonth();
      dayToCheck = anniversaryDateObj.getDate();
      startYear = anniversaryDateObj.getFullYear();
    } else {
      // New format: { startYear: 2020, monthDay: "03-15", originalDate: "2020-03-15" }
      const [month, day] = anniversaryData.monthDay.split("-").map(Number);
      monthToCheck = month - 1; // Convert to 0-based month
      dayToCheck = day;
      startYear = anniversaryData.startYear;
    }

    if (monthToCheck === currentMonth) {
      // Calculate years correctly using the actual start year
      const years = currentYear - startYear;

      // Only show if years > 0
      if (years > 0) {
        specialDatesThisMonth.push({
          member: member,
          date: dayToCheck,
          type: "anniversary",
          icon: "🎊",
          typeName: `${years} Year${years !== 1 ? "s" : ""}`,
          years: years,
        });
      }
    }
  });

  // Sort by date
  specialDatesThisMonth.sort((a, b) => a.date - b.date);

  // Update KPI value
  const kpiValueEl = document.getElementById("kpi-special-dates");
  if (kpiValueEl) {
    kpiValueEl.textContent = specialDatesThisMonth.length;
  }

  // Update KPI list with dates included
  const kpiListEl = document.getElementById("kpi-special-dates-list");
  if (kpiListEl) {
    if (specialDatesThisMonth.length === 0) {
      kpiListEl.innerHTML =
        '<div style="color:#999; font-style:italic; text-align:center; padding:10px 0;">No special dates this month</div>';
    } else {
      kpiListEl.innerHTML = specialDatesThisMonth
        .map(
          (item) => `
        <div class="special-date-item">
          <div class="special-date-name">${item.member}</div>
          <div class="special-date-type">
            ${item.icon} ${
            item.type === "birthday" ? "Birthday" : item.typeName
          } - ${getOrdinal(item.date)}
          </div>
        </div>
      `
        )
        .join("");
    }
  }
}

// Toggle between birthday and anniversary input fields
function toggleDateFields() {
  const type = document.getElementById("specialDateType").value;
  const birthdayRow = document.getElementById("birthdayDateRow");
  const anniversaryRow = document.getElementById("anniversaryDateRow");

  if (type === "birthday") {
    birthdayRow.style.display = "flex";
    anniversaryRow.style.display = "none";
  } else {
    birthdayRow.style.display = "none";
    anniversaryRow.style.display = "flex";
  }
}

// Populate year dropdown for anniversaries
function populateAnniversaryYears() {
  const yearSelect = document.getElementById("anniversaryYearInput");
  if (!yearSelect) return;

  yearSelect.innerHTML = "";

  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 50; // Go back 50 years

  for (let year = currentYear; year >= startYear; year--) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  }
}

// UPDATED: Add special date function
function addSpecialDate() {
  const memberSelect = document.getElementById("specialDateMember");
  const typeSelect = document.getElementById("specialDateType");

  const member = memberSelect.value;
  const type = typeSelect.value;

  if (!member) {
    alert("Please select a team member.");
    return;
  }

  if (type === "birthday") {
    const dateInput = document.getElementById("birthdayDateInput");
    const date = dateInput.value;

    if (!date) {
      alert("Please select a birthday date.");
      return;
    }

    // Check if this member already has a birthday
    if (birthdays[member]) {
      if (
        !confirm(
          `${member} already has a birthday set. Do you want to update it?`
        )
      )
        return;
    }

    // Store birthday
    birthdays[member] = date;
    saveBirthdays();

    dateInput.value = "";
    alert(`Birthday for ${member} has been set!`);
  } else {
    // Anniversary
    const yearInput = document.getElementById("anniversaryYearInput");
    const dateInput = document.getElementById("anniversaryDateInput");

    const startYear = yearInput.value;
    const anniversaryDate = dateInput.value;

    if (!startYear || !anniversaryDate) {
      alert("Please select both start year and anniversary date.");
      return;
    }

    // Check if this member already has an anniversary
    if (anniversaries[member]) {
      if (
        !confirm(
          `${member} already has an anniversary set. Do you want to update it?`
        )
      )
        return;
    }

    // Store anniversary with start year information
    const dateObj = new Date(anniversaryDate);
    const monthDay = `${String(dateObj.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(dateObj.getDate()).padStart(2, "0")}`;

    anniversaries[member] = {
      startYear: parseInt(startYear),
      monthDay: monthDay,
      // Keep original date format for backward compatibility
      originalDate: `${startYear}-${monthDay}`,
    };

    saveAnniversaries();

    yearInput.value = new Date().getFullYear();
    dateInput.value = "";
    alert(
      `Work Anniversary for ${member} has been set! Started in ${startYear}.`
    );
  }

  // Clear form and refresh
  memberSelect.value = "";
  typeSelect.value = "birthday";
  toggleDateFields();
  renderSpecialDatesList();
  buildCalendar();
}

// UPDATED: Initialize special dates mode
function initializeSpecialDatesMode() {
  populateSpecialDateMemberDropdown();
  populateAnniversaryYears();
  toggleDateFields(); // Set initial state
  renderSpecialDatesList();

  // Set up event handlers
  const addBtn = document.getElementById("addSpecialDate");
  const addAnnBtn = document.getElementById("addAnniversary");

  if (addBtn) addBtn.onclick = addSpecialDate;
  if (addAnnBtn) addAnnBtn.onclick = addSpecialDate; // Same function handles both
}

function updateHolidayList() {
  // Placeholder function to prevent the error
  console.log("📅 Holiday list update");
}

// Function to populate the month filter dropdown (for MONTHLY view)
function populateMonthFilter() {
  console.log("🔍 populateMonthFilter called");

  const monthFilter = document.getElementById("monthFilter");
  if (!monthFilter) {
    console.error("❌ monthFilter element not found!");
    return;
  }

  console.log("✅ monthFilter element found:", monthFilter);

  // Clear existing options
  monthFilter.innerHTML = "";
  console.log("🧹 Cleared existing options");

  // Get current date
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  console.log("📅 Current date info:", { currentMonth, currentYear });

  // Generate 12 months: 6 previous + current + 5 future
  for (let i = -6; i <= 5; i++) {
    const monthDate = new Date(currentYear, currentMonth + i, 1);
    const monthYear = monthDate.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
    const monthKey = `${monthDate.getFullYear()}-${String(
      monthDate.getMonth() + 1
    ).padStart(2, "0")}`;

    console.log(`📝 Creating option ${i}:`, { monthYear, monthKey });

    const option = document.createElement("option");
    option.value = monthKey;
    option.textContent = monthYear;

    // Select current month by default (when i === 0)
    if (i === 0) {
      option.selected = true;
      console.log("✅ Set as selected:", monthYear);
    }

    monthFilter.appendChild(option);
  }

  console.log("✅ Final dropdown options count:", monthFilter.children.length);
}

// Function to populate the year filter dropdown (for ANNUAL view)
function populateYearFilter() {
  const monthFilter = document.getElementById("monthFilter");
  if (!monthFilter) return;

  // Clear existing options
  monthFilter.innerHTML = "";

  // Get current year
  const currentYear = new Date().getFullYear();

  // Generate years (current year + 4 previous years = 5 years total)
  for (let i = 0; i < 5; i++) {
    const year = currentYear - i;

    const option = document.createElement("option");
    option.value = year.toString();
    option.textContent = year.toString();

    // Select current year by default
    if (i === 0) {
      option.selected = true;
    }

    monthFilter.appendChild(option);
  }
}

// Function to handle month/year filter change
function onMonthFilterChange() {
  const monthFilter = document.getElementById("monthFilter");
  if (!monthFilter) return;

  const selectedValue = monthFilter.value;
  if (!selectedValue) return;

  if (window.currentDashboardView === "monthly") {
    // Parse the selected month/year (format: "2025-07")
    const [year, month] = selectedValue.split("-").map(Number);

    // Update the global viewDate to the selected month
    window.viewDate = new Date(year, month - 1, 1); // month - 1 because Date uses 0-based months

    console.log(
      `📅 Dashboard month changed to: ${window.viewDate.toLocaleString(
        "default",
        { month: "long", year: "numeric" }
      )}`
    );

    // Re-render the monthly dashboard
    renderDashboardTab();
    updateMetrics();
    updateNewPanelMetrics();
    updateNewHolidayList();
    updateQuickStatsPills();
    updateSpecialDatesKPI();
  } else if (window.currentDashboardView === "annual") {
    // Handle year selection for annual view
    const selectedYear = parseInt(selectedValue);

    console.log(`📊 Annual dashboard year changed to: ${selectedYear}`);

    // Re-render the annual dashboard with the new year
    renderAnnualDashboard(selectedYear);
  }
}
