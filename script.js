// ─── Force high-res, fully responsive charts ───

// Ensure requests variable is always defined to prevent errors in updateMetrics
if (typeof window.requests === "undefined") {
  window.requests = [];
}

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
      window.currentDashboardView =
        window.DASHBOARD_CONFIG?.DEFAULT_VIEW || "monthly"; // Set default
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

// Helpers

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

// 🎯 THE ONE AND ONLY CORRECT applyHalfDayVisuals FUNCTION
// Delete all 3 existing functions and replace with this one

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

document.addEventListener("DOMContentLoaded", () => {
  Chart.defaults.responsive = true;
  Chart.defaults.maintainAspectRatio = false;
  Chart.defaults.devicePixelRatio = 3;

  // Initialize dashboard view to monthly by default
  window.currentDashboardView =
    window.DASHBOARD_CONFIG?.DEFAULT_VIEW || "monthly";

  // Set up filter change handler
  const monthFilter = document.getElementById("monthFilter");
  if (monthFilter) {
    monthFilter.addEventListener("change", onMonthFilterChange);
  }

  // Initialize ALL core variables FIRST
  window.viewDate = new Date();
  window.holidays = JSON.parse(localStorage.getItem("holidays")) || {};

  migrateHolidayData();

  // Ensure teamMembers is available
  if (!window.teamMembers) {
    window.teamMembers = teamMembers;
  }

  // Ensure memberProfiles exist for every member and persist to Sheets
  if (!window.memberProfiles) window.memberProfiles = {};
  teamMembers.forEach((n) => ensureMemberProfile(n));
  saveMemberProfiles();

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

  // ── Jump-to Date popover wiring ───────────────────────────────
  const monthLabel = document.getElementById("monthYearDisplay");
  const pop = document.getElementById("jumpPopover");
  const goDateInput = document.getElementById("goDate");
  const btnGo = document.getElementById("btnGo");
  const btnToday = document.getElementById("btnToday");

  function openJump() {
    if (!pop) return;
    pop.hidden = false;
    setTimeout(() => goDateInput && goDateInput.focus(), 0);
  }
  function closeJump() {
    if (pop) pop.hidden = true;
  }

  function applyJump() {
    if (!goDateInput || !goDateInput.value) {
      closeJump();
      return;
    }
    // add T12:00 to avoid timezone drift when parsing yyyy-mm-dd
    const d = new Date(goDateInput.value + "T12:00:00");
    if (!isNaN(d)) {
      viewDate = d;
      buildCalendar();
      updateMonthlyView();
      renderSwiperMembers();
      document.dispatchEvent(new Event("monthChanged"));
    }
    closeJump();
  }

  if (monthLabel) {
    monthLabel.addEventListener("click", () =>
      pop.hidden ? openJump() : closeJump()
    );
    monthLabel.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pop.hidden ? openJump() : closeJump();
      }
    });
  }

  if (btnGo) btnGo.addEventListener("click", applyJump);
  if (btnToday)
    btnToday.addEventListener("click", () => {
      viewDate = new Date();
      buildCalendar();
      updateMonthlyView();
      renderSwiperMembers();
      document.dispatchEvent(new Event("monthChanged"));
      closeJump();
    });

  // click-outside to close
  document.addEventListener("click", (e) => {
    if (!pop || pop.hidden) return;
    if (!pop.contains(e.target) && e.target !== monthLabel) closeJump();
  });

  // keyboard shortcuts: g = open, t = today, Esc = close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeJump();
    const k = e.key.toLowerCase();
    if (k === "g") openJump();
    if (k === "t") {
      viewDate = new Date();
      buildCalendar();
      updateMonthlyView();
      renderSwiperMembers();
      document.dispatchEvent(new Event("monthChanged"));
      closeJump();
    }
  });

  if (window.saveBtn) {
    window.saveBtn.onclick = async function () {
      // Show saving state immediately
      const originalText = this.textContent;
      this.textContent = "Saving...";
      this.disabled = true;

      try {
        // Save the holidays (this will trigger the sync process)
        await saveHolidays();

        // Only show success after everything is complete
        showSaveSuccess();
      } catch (error) {
        console.error("Save failed:", error);
        this.textContent = originalText;
        this.disabled = false;
      }
    };
  }

  if (window.clearBtn) {
    window.clearBtn.onclick = function () {
      if (!confirm("Clear all holidays for this user this month?")) return;
      const user = userSelect.value;
      const key = getKey(viewDate);
      if (!holidays[user]) holidays[user] = {};
      holidays[user][key] = {};

      localStorage.setItem("holidays", JSON.stringify(holidays));

      // Sync to Google Sheets if available
      if (typeof saveToGoogleSheets === "function") {
        saveToGoogleSheets("holidays");
      }

      loadUserHolidays();
      updateMonthlyView();
    };
  }

  if (window.userSelect) {
    window.userSelect.onchange = function () {
      const user = userSelect.value;
      const currentUserName = document.getElementById("currentUserName");
      if (currentUserName) {
        currentUserName.textContent = user;
      }

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

  // Add Member handler
  // Add Member handler
  // Add Member handler
  const addMemberBtn = document.getElementById("addMemberBtn");
  if (addMemberBtn) {
    addMemberBtn.onclick = function () {
      const nameInput = document.getElementById("newMemberName");
      if (!nameInput) return;

      const name = nameInput.value.trim();
      if (!name) return alert("Please enter a member name.");
      if (teamMembers.includes(name)) return alert("Member already exists.");

      // 1. Add the new member to the list first
      teamMembers.push(name);

      // 2. Update all the UI elements
      updateUserColors();
      populateDropdown();
      renderMemberList();
      updateMonthlyView();
      buildCalendar();
      renderGanttLegendMembers();
      nameInput.value = "";

      // 3. Save the final, correct list once at the very end
      saveTeamMembers();
    };
  }
  // Add Holiday handler
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

      // Sync to Google Sheets if available
      if (typeof saveToGoogleSheets === "function") {
        saveToGoogleSheets("customHolidays");
      }

      renderCustomHolidayList();
      buildCalendar();
      updateHolidayList();
      dateInput.value = "";
      nameInput.value = "";
    };
  }

  // Initialize custom holiday list
  renderCustomHolidayList();

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
      }
    }, 500);
  }

  // Force admin initialization on page load
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

  // Initialize Gantt state
  initializeGanttState();

  // GOOGLE SHEETS SYNC - After everything is initialized
  // ════════ REPLACE THE GOOGLE SHEETS SYNC BLOCK IN DOMContentLoaded ════════

  // GOOGLE SHEETS SYNC - After everything is initialized
  // GOOGLE SHEETS SYNC - After everything is initialized
  // GOOGLE SHEETS SYNC - After everything is initialized
  if (typeof loadHolidaysFromSheets === "function") {
    setTimeout(() => {
      loadHolidaysFromSheets()
        .then((data) => {
          if (!data) {
            console.log("No data loaded, using existing state.");
            return;
          }

          console.log("Received data from integration layer:", data);

          // Update ALL global variables with proper validation
          if (data.holidays && typeof data.holidays === "object") {
            window.holidays = data.holidays;
            holidays = data.holidays;
          }

          if (
            data.teamMembers &&
            Array.isArray(data.teamMembers) &&
            data.teamMembers.length > 0
          ) {
            window.teamMembers = data.teamMembers;
            teamMembers = data.teamMembers;
          }

          // CRITICAL FIX: Custom holidays assignment with fallback logic
          // FIXED: Google Sheets is the source of truth
          if (data.customHolidays && typeof data.customHolidays === "object") {
            // Use whatever Google Sheets has (even if empty)
            console.log(
              "📥 Loading custom holidays from Google Sheets:",
              data.customHolidays
            );
            window.customHolidays = data.customHolidays;
            customHolidays = data.customHolidays;
            localStorage.setItem(
              "customHolidays",
              JSON.stringify(data.customHolidays)
            );
          } else {
            // Google Sheets has no custom holidays - clear app data
            console.log("🧹 Google Sheets empty - clearing custom holidays");
            window.customHolidays = {};
            customHolidays = {};
            localStorage.setItem("customHolidays", JSON.stringify({}));
          }
          if (data.specialDates) {
            if (data.specialDates.birthdays) {
              window.birthdays = data.specialDates.birthdays;
              birthdays = data.specialDates.birthdays;
            }
            if (data.specialDates.anniversaries) {
              window.anniversaries = data.specialDates.anniversaries;
              anniversaries = data.specialDates.anniversaries;
            }
          }

          if (data.publicHolidays && typeof data.publicHolidays === "object") {
            // Replace, don't merge - Google Sheets is source of truth
            console.log(
              "📥 Loading public holidays from Google Sheets:",
              data.publicHolidays
            );
            window.publicHolidays = data.publicHolidays; // Don't merge, replace
            publicHolidays = data.publicHolidays;
            localStorage.setItem(
              "publicHolidays",
              JSON.stringify(data.publicHolidays)
            );
          } else {
            // Google Sheets has no public holidays - clear user-added ones
            console.log("🧹 Google Sheets empty - clearing public holidays");
            window.publicHolidays = {};
            publicHolidays = {};
            localStorage.setItem("publicHolidays", JSON.stringify({}));
          }

          if (data.memberProfiles && typeof data.memberProfiles === "object") {
            window.memberProfiles = data.memberProfiles;
            memberProfiles = data.memberProfiles;
            localStorage.setItem(
              "memberProfiles",
              JSON.stringify(data.memberProfiles)
            );
          }

          console.log(
            "🔥 FINAL CHECK - customHolidays before UI rebuild:",
            customHolidays
          );

          // Rebuild UI components
          updateUserColors();
          populateDropdown();
          renderMemberList();
          buildCalendar(); // This should now show custom holidays with purple circles
          updateMonthlyView();
          renderMonthlyGantt();
          renderSwiperMembers();
          updateNewPanelMetrics();
          updateNewHolidayList();
          updateQuickStatsPills();
          updateSpecialDatesKPI();

          console.log("✅ UI rebuild complete");
        })
        .catch((error) => {
          console.error("Error loading from sheets:", error);
        });
    }, 1000);
  }
});

// ═══════════════════════════════════════════════════════════════════
// ADVANCED ADMIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

// Color and icon options for holidays
// Color and icon options for holidays (loaded from config)
const holidayColors = window.HOLIDAY_CONFIG?.COLORS || [
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
  "#f43f5e",
];

const holidayIcons = window.HOLIDAY_CONFIG?.ICONS || [
  "🎉",
  "🎊",
  "🎈",
  "🎁",
  "🎂",
  "🍰",
  "🥳",
  "🌟",
  "⭐",
  "✨",
  "🎯",
  "🏆",
  "🥇",
  "🎖️",
  "🏅",
  "👑",
  "🎭",
  "🎪",
  "🎨",
  "🎵",
  "🎶",
  "🎸",
  "🎤",
  "🎺",
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
  renderPublicHolidaysList();
}

// Initialize members mode
function initializeMembersMode() {
  renderCurrentMembersList();
  populateProfileMemberSelect();
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

    // REPLACE THE CORRUPTED HTML WITH THIS CORRECT VERSION:
    // Create safe DOM elements
    const content = document.createElement("div");
    content.className = "admin-member-content";

    const avatar = document.createElement("div");
    avatar.className = "admin-member-avatar";
    avatar.textContent = initials; // Safe - no HTML parsing

    const nameDiv = document.createElement("div");
    nameDiv.className = "admin-member-name";
    nameDiv.textContent = member; // XSS-safe - escapes HTML automatically

    const button = document.createElement("button");
    button.className = "admin-btn admin-btn-danger";
    button.textContent = "Remove";
    button.onclick = () => removeMemberAdvanced(member); // Safe function reference

    // Assemble the structure
    content.appendChild(avatar);
    content.appendChild(nameDiv);
    item.appendChild(content);
    item.appendChild(button);
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

  // 1. Add the new member to the list first
  teamMembers.push(name);
  ensureMemberProfile(name); // creates {role:"Team Member", hasPhoto:false}
  saveMemberProfiles(); // pushes to Sheets (creates tab if needed)

  // 2. Update all the UI elements
  updateUserColors();
  populateDropdown();
  renderCurrentMembersList();
  populateSpecialDateMemberDropdown();
  updateMonthlyView();
  buildCalendar();
  renderGanttLegendMembers();
  input.value = "";
  alert(`${name} has been added to the team!`);
  populateProfileMemberSelect();

  // 3. Save the final, correct list once at the very end
  saveTeamMembers();
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

  delete memberProfiles[memberName];
  saveMemberProfiles();
  populateProfileMemberSelect();

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
  // Sync to Google Sheets
  if (typeof saveToGoogleSheets === "function") {
    saveToGoogleSheets("customHolidays");
  }

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
    // Sync to Google Sheets
    if (typeof saveToGoogleSheets === "function") {
      saveToGoogleSheets("specialDates");
    }
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

  if (compactCurrentType === "public") {
    // Get the selected region from radio buttons
    const selectedRegionRadio = document.querySelector(
      'input[name="region"]:checked'
    );
    const selectedRegion = selectedRegionRadio
      ? selectedRegionRadio.value
      : "US";

    // Add to the publicHolidays object in the app
    compactSelectedDates.forEach((date) => {
      if (!publicHolidays[date]) {
        publicHolidays[date] = [];
      }
      const existingIndex = publicHolidays[date].findIndex(
        (h) => h.region === selectedRegion
      );
      if (existingIndex >= 0) {
        publicHolidays[date][existingIndex].name = name;
      } else {
        publicHolidays[date].push({
          name: name,
          region: selectedRegion,
        });
      }
    });

    // Save to localStorage first as a reliable fallback
    // Save to localStorage first as a reliable fallback
    localStorage.setItem("publicHolidays", JSON.stringify(publicHolidays));

    // Update global reference
    window.publicHolidays = publicHolidays;

    // Force calendar rebuild to show blue rings immediately
    buildCalendar();

    // Then, sync the new data to Google Sheets
    if (typeof saveToGoogleSheets === "function") {
      saveToGoogleSheets("publicHolidays", publicHolidays);
    }

    alert(
      `Created PUBLIC holiday: "${name}"\nRegion: ${selectedRegion}\nDates: ${Array.from(
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

    // These functions already save to localStorage and trigger the sync
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
  renderPublicHolidaysList();
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
// Function to populate the month filter dropdown (for MONTHLY view)
function populateMonthFilter() {
  console.log("🔍 populateMonthFilter called");

  const monthFilter = document.getElementById("monthFilter");
  if (!monthFilter) {
    console.error("❌ monthFilter element not found!");
    return;
  }

  // Clear existing options
  monthFilter.innerHTML = "";

  // Get the current viewed year (from viewDate or current date)
  const currentViewYear = window.viewDate
    ? window.viewDate.getFullYear()
    : new Date().getFullYear();
  const currentViewMonth = window.viewDate
    ? window.viewDate.getMonth()
    : new Date().getMonth();

  // Generate all 12 months for the current viewed year
  for (let month = 0; month < 12; month++) {
    const monthDate = new Date(currentViewYear, month, 1);
    const monthYear = monthDate.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
    const monthKey = `${currentViewYear}-${String(month + 1).padStart(2, "0")}`;

    const option = document.createElement("option");
    option.value = monthKey;
    option.textContent = monthYear;

    // Select the current viewed month
    if (month === currentViewMonth) {
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

    // Re-render the annual dashboard with the new year
    renderAnnualDashboard(selectedYear);
  }
}

// Global variable for filter state
let currentPublicHolidayFilter = "all";

// Filter public holidays by region
function filterPublicHolidays(region) {
  currentPublicHolidayFilter = region;

  // Update button states
  document.querySelectorAll(".region-filter-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.querySelector(`[data-region="${region}"]`).classList.add("active");

  // Re-render the list
  renderPublicHolidaysList();
}

// Render public holidays list
// Render public holidays list
function renderPublicHolidaysList() {
  const container = document.getElementById("publicHolidaysList");
  if (!container) return;

  container.innerHTML = "";

  const currentYear = new Date().getFullYear();
  const holidaysToShow = [];

  // Get combined holidays (permanent + user-added)
  const allHolidays = getAllHolidaysForYear(currentYear);

  // Collect all public holidays for current year
  Object.entries(allHolidays).forEach(([date, holidays]) => {
    const holidayYear = parseInt(date.split("-")[0]);
    if (holidayYear === currentYear) {
      holidays.forEach((holiday) => {
        // Check if this is a permanent holiday
        const monthDay = date.substring(5); // Get MM-DD part
        const isPermanent =
          PERMANENT_HOLIDAYS[monthDay] &&
          PERMANENT_HOLIDAYS[monthDay].some(
            (h) => h.name === holiday.name && h.region === holiday.region
          );

        holidaysToShow.push({
          date: date,
          name: holiday.name,
          region: holiday.region,
          isPermanent: isPermanent,
        });
      });
    }
  });

  // Filter by selected region
  const filteredHolidays =
    currentPublicHolidayFilter === "all"
      ? holidaysToShow
      : holidaysToShow.filter((h) => h.region === currentPublicHolidayFilter);

  if (filteredHolidays.length === 0) {
    const message =
      currentPublicHolidayFilter === "all"
        ? "No public holidays added yet."
        : `No ${currentPublicHolidayFilter} holidays added yet.`;
    container.innerHTML = `<p style="text-align: center; color: #64748b; padding: 20px;">${message}</p>`;
    return;
  }

  // Sort by date
  filteredHolidays.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Render each holiday
  filteredHolidays.forEach((holiday) => {
    const item = document.createElement("div");
    item.className = "public-holiday-item";

    const dateObj = new Date(holiday.date);
    const formattedDate = dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const regionClass = holiday.region.toLowerCase();

    item.innerHTML = `
      <div class="public-holiday-content">
        <div class="region-circle ${regionClass}"></div>
        <div>
          <div style="font-weight: 500;">${holiday.name}${
      holiday.isPermanent ? " 🔒" : ""
    }</div>
          <div style="font-size: 0.8rem; color: #64748b;">(${
            holiday.region
          }) ${formattedDate}${holiday.isPermanent ? " • Built-in" : ""}</div>
        </div>
      </div>
      ${
        holiday.isPermanent
          ? '<span style="font-size: 0.8rem; color: #64748b; font-style: italic;">Permanent</span>'
          : `<button class="admin-btn admin-btn-danger" onclick="removePublicHoliday('${holiday.date}', '${holiday.name}', '${holiday.region}')">Remove</button>`
      }
    `;

    container.appendChild(item);
  });
}

// Remove public holiday function
function removePublicHoliday(date, name, region) {
  if (!confirm(`Remove ${name} (${region}) from public holidays?`)) return;

  // Remove from publicHolidays object
  if (publicHolidays[date]) {
    publicHolidays[date] = publicHolidays[date].filter(
      (h) => !(h.name === name && h.region === region)
    );

    // Remove date key if no holidays left
    if (publicHolidays[date].length === 0) {
      delete publicHolidays[date];
    }
  }

  // Save to localStorage
  localStorage.setItem("publicHolidays", JSON.stringify(publicHolidays));
  window.publicHolidays = publicHolidays;

  // Sync to Google Sheets if available
  if (typeof saveToGoogleSheets === "function") {
    saveToGoogleSheets("publicHolidays", publicHolidays);
  }

  // Refresh displays
  buildCalendar();
  renderPublicHolidaysList();

  alert(`${name} removed from public holidays.`);
}

// Member Profile Management Functions

function populateProfileMemberSelect() {
  const select = document.getElementById("profileMemberSelect");
  if (!select) return;

  select.innerHTML = '<option value="">Select member to edit role...</option>';
  teamMembers.forEach((member) => {
    const option = document.createElement("option");
    option.value = member;
    option.textContent = member;
    select.appendChild(option);
  });
}

function loadMemberRole() {
  const photoCb = document.getElementById("memberPhotoCheckbox");
  const select = document.getElementById("profileMemberSelect");
  const roleInput = document.getElementById("memberRoleInput");
  const saveBtn = document.getElementById("saveRoleBtn");

  const memberName = select.value;

  if (!memberName) {
    roleInput.disabled = true;
    roleInput.value = "";
    saveBtn.disabled = true;
    if (photoCb) photoCb.checked = false;

    return;
  }

  roleInput.disabled = false;
  saveBtn.disabled = false;
  roleInput.value = getMemberRole(memberName);
  if (photoCb) photoCb.checked = !!memberProfiles[memberName]?.hasPhoto;
}

function saveMemberRole() {
  const memberName = document.getElementById("profileMemberSelect").value;
  const role = document.getElementById("memberRoleInput").value.trim();
  const photoCb = document.getElementById("memberPhotoCheckbox"); // 👈 NEW

  if (!memberName || !role) {
    alert("Please select a member and enter a role.");
    return;
  }

  // Save to profiles
  ensureMemberProfile(memberName);
  memberProfiles[memberName].role = role;
  if (photoCb) memberProfiles[memberName].hasPhoto = !!photoCb.checked;

  saveMemberProfiles();

  // Refresh member cards if they exist
  if (typeof renderSwiperMembers === "function") {
    renderSwiperMembers();
  }

  alert(`Role saved for ${memberName}!`);
}

function showSavedToast() {
  const el = document.getElementById("toast");
  if (!el) return;

  // Find the existing yellow sync toast/chip (try common ids/classes, fallback if missing)
  const syncEl =
    document.querySelector("#syncStatusToast") ||
    document.querySelector("[data-sync-toast]") ||
    document.querySelector(".sync-status") ||
    document.querySelector(".sync-toast");

  // Position saved toast just ABOVE the sync chip; otherwise default 18px
  let bottomPx = 18;
  if (syncEl) {
    const r = syncEl.getBoundingClientRect();
    const gap = 12;
    bottomPx = Math.max(18, window.innerHeight - r.top + gap);
  }
  el.style.setProperty("--toast-bottom", bottomPx + "px");

  // Message with timestamp
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  el.textContent = `Saved to Sheets ✓ ${hh}:${mm}:${ss}`;

  // Show
  el.hidden = false;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.classList.remove("show");
  }, 2500);
}

function toggleHolidayType(type) {
  compactCurrentType = type;
  const regionSection = document.getElementById("regionSection");
  const customStyleSection = document.getElementById("customStyleSection");

  if (type === "public") {
    regionSection.style.display = "block";
    if (customStyleSection) customStyleSection.style.display = "none";
  } else {
    regionSection.style.display = "none";
    if (customStyleSection) customStyleSection.style.display = "block";
  }

  updateCompactPreview();
}
