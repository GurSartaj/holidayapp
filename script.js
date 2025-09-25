// ===================================================================
// MAIN APPLICATION SCRIPT - FIXED
// All original functionality without variable redeclaration errors
// ===================================================================

// Global variables (declared once)
let teamMembers = [];
let holidayData = {};
let currentDate = new Date();
let currentUser = "";
let viewDate = new Date();

// Initialize public holidays storage
if (typeof window.publicHolidays === "undefined") {
  window.publicHolidays =
    JSON.parse(localStorage.getItem("publicHolidays")) || {};
}

// DOM elements
let userSelect, monthYear, calendarGrid;

// ===================================================================
// INITIALIZATION
// ===================================================================

document.addEventListener("DOMContentLoaded", function () {
  initializeApp();
});

async function initializeApp() {
  // Get DOM elements first
  userSelect = document.getElementById("userSelect");
  monthYear = document.getElementById("monthYear");
  calendarGrid = document.getElementById("calendar-grid");

  // Try to load from Google Sheets first
  try {
    console.log("Loading data from Google Sheets...");
    const data = await loadFromGoogleSheets();

    if (data && data.holidayData) {
      // Update app variables with Google Sheets data
      holidayData = data.holidayData;
      teamMembers = data.teamMembers || [...window.DEFAULT_TEAM_MEMBERS];

      // Update global holiday variables
      window.customHolidays = data.customHolidays || {};
      window.birthdays = data.birthdays || {};
      window.anniversaries = data.anniversaries || {};
      window.publicHolidays = data.publicHolidays || {};

      console.log("✅ Data loaded from Google Sheets successfully");
    } else {
      throw new Error("No data received from Google Sheets");
    }
  } catch (error) {
    console.log("🔄 Google Sheets unavailable, using localStorage fallback");
    loadFromLocalStorage();
  }

  // Load additional holiday data from storage
  loadHolidayDataFromStorage();

  // Initialize UI components
  populateUserDropdown();
  renderCalendar();
  updateDashboard();

  // Set up event listeners
  setupEventListeners();
  updateMemberFlag();

  console.log("✅ App initialized successfully");
}

function setupEventListeners() {
  // User selection change
  if (userSelect) {
    userSelect.addEventListener("change", function () {
      currentUser = this.value;
      updateMemberFlag();
      renderCalendar();
    });
  }
}

// ===================================================================
// DATA MANAGEMENT
// ===================================================================

function loadFromLocalStorage() {
  try {
    // Load team members
    const savedTeamMembers = localStorage.getItem(
      window.APP_CONFIG.STORAGE_KEYS.TEAM_MEMBERS
    );
    if (savedTeamMembers) {
      teamMembers = JSON.parse(savedTeamMembers);
    } else {
      teamMembers = [...window.DEFAULT_TEAM_MEMBERS];
      saveToLocalStorage();
    }

    // Load holiday data
    const savedHolidays = localStorage.getItem(
      window.APP_CONFIG.STORAGE_KEYS.HOLIDAYS
    );
    if (savedHolidays) {
      holidayData = JSON.parse(savedHolidays);
    }

    // Set current user to first team member
    if (teamMembers.length > 0) {
      currentUser = teamMembers[0];
    }

    console.log("✅ Data loaded from localStorage");
  } catch (error) {
    console.error("❌ Error loading from localStorage:", error);
    // Reset to defaults
    teamMembers = [...window.DEFAULT_TEAM_MEMBERS];
    holidayData = {};
  }
}

function saveToLocalStorage() {
  try {
    localStorage.setItem(
      window.APP_CONFIG.STORAGE_KEYS.TEAM_MEMBERS,
      JSON.stringify(teamMembers)
    );
    localStorage.setItem(
      window.APP_CONFIG.STORAGE_KEYS.HOLIDAYS,
      JSON.stringify(holidayData)
    );

    console.log("✅ Data saved to localStorage");
  } catch (error) {
    console.error("❌ Error saving to localStorage:", error);
  }
}

// ===================================================================
// TAB SWITCHING
// ===================================================================

function switchTab(tabName) {
  // Hide all tab contents
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.remove("active");
  });

  // Remove active class from all tabs
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active");
  });

  // Show selected tab content
  const tabContent = document.getElementById(tabName);
  if (tabContent) {
    tabContent.classList.add("active");
  }

  // Add active class to selected tab button
  const tabButton = document.getElementById(`tab-${tabName}`);
  if (tabButton) {
    tabButton.classList.add("active");
  }

  // Update content based on tab
  switch (tabName) {
    case "calendar":
      renderCalendar();
      updateQuickStatsPills();
      break;
    case "dashboard":
      updateDashboard();
      populateMonthFilter();
      initializeDashboard();
      break;
    case "admin":
      renderMemberList();
      initializeAdminPanels();
      break;
  }
}

// ===================================================================
// CALENDAR NAVIGATION
// ===================================================================

function changeMonth(direction) {
  currentDate.setMonth(currentDate.getMonth() + direction);
  viewDate = new Date(currentDate);
  renderCalendar();
  updateDashboard();
  renderGantt();

  // Add this line to update sidepanel when month changes:
  setTimeout(() => updateSidePanelKPIs(), 100);
}

function getKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(dateString) {
  return new Date(dateString + "T00:00:00");
}

// ===================================================================
// ADMIN FUNCTIONALITY
// ===================================================================

function initializeAdminPanels() {
  // Initialize holiday creator
  renderExistingHolidaysList();

  // Initialize special dates
  populateSpecialDateMemberDropdown();
  renderSpecialDatesList();
}

function addCustomHoliday() {
  const nameInput = document.getElementById("holidayName");
  const dateInput = document.getElementById("holidayDate");

  const name = nameInput.value.trim();
  const date = dateInput.value;

  if (!name || !date) {
    showMessage("Please enter both name and date", "error");
    return;
  }

  // Add to custom holidays
  window.customHolidays[date] = name;

  // Save to localStorage
  localStorage.setItem(
    window.APP_CONFIG.STORAGE_KEYS.CUSTOM_HOLIDAYS,
    JSON.stringify(window.customHolidays)
  );

  // Clear form
  nameInput.value = "";
  dateInput.value = "";

  // Update UI
  renderExistingHolidaysList();
  renderCalendar();

  showMessage(`✅ Added custom holiday: ${name}`);
}

function renderExistingHolidaysList() {
  const container = document.getElementById("existingHolidaysList");
  if (!container) return;

  container.innerHTML = "";

  const allHolidays = [];

  // Add custom holidays
  Object.entries(window.customHolidays || {}).forEach(([date, name]) => {
    allHolidays.push({ date, name, type: "custom" });
  });

  // Add public holidays
  Object.entries(window.publicHolidays || {}).forEach(([date, holidays]) => {
    holidays.forEach((holiday) => {
      allHolidays.push({
        date,
        name: holiday.name,
        type: "public",
        region: holiday.region,
      });
    });
  });

  if (allHolidays.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: #666; padding: 20px;">No holidays added yet.</p>';
    return;
  }

  // Sort by date
  allHolidays.sort((a, b) => new Date(a.date) - new Date(b.date));

  allHolidays.forEach((holiday) => {
    const item = document.createElement("div");
    item.className = "holiday-item";

    const formattedDate = new Date(holiday.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const regionInfo = holiday.type === "public" ? ` (${holiday.region})` : "";
    const typeClass =
      holiday.type === "public"
        ? `holiday-${holiday.region?.toLowerCase()}`
        : "holiday-custom";

    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <div class="holiday-icon ${typeClass}">
          ${holiday.type === "public" ? holiday.region : "⭐"}
        </div>
        <div>
          <div style="font-weight: 600;">${holiday.name}${regionInfo}</div>
          <div style="font-size: 0.85rem; color: #666;">${formattedDate}</div>
        </div>
      </div>
      <button class="btn btn-danger btn-small" onclick="removeHoliday('${
        holiday.date
      }', '${holiday.type}', '${holiday.name}'${
      holiday.region ? `, '${holiday.region}'` : ""
    })">
        Remove
      </button>
    `;

    container.appendChild(item);
  });
}

function removeCustomHoliday(date) {
  const holidayName = window.customHolidays[date];

  if (!confirm(`Remove holiday "${holidayName}"?`)) return;

  delete window.customHolidays[date];
  localStorage.setItem(
    window.APP_CONFIG.STORAGE_KEYS.CUSTOM_HOLIDAYS,
    JSON.stringify(window.customHolidays)
  );

  renderExistingHolidaysList();
  renderCalendar();

  showMessage(`✅ Removed holiday: ${holidayName}`);
}

function populateSpecialDateMemberDropdown() {
  const select = document.getElementById("specialDateMember");
  if (!select) return;

  select.innerHTML = '<option value="">Select team member...</option>';

  teamMembers.forEach((member) => {
    const option = document.createElement("option");
    option.value = member;
    option.textContent = member;
    select.appendChild(option);
  });
}

async function addSpecialDate() {
  const memberSelect = document.getElementById("specialDateMember");
  const typeSelect = document.getElementById("specialDateType");

  const member = memberSelect.value;
  const type = typeSelect.value;

  if (!member) {
    showMessage("Please select a team member", "error");
    return;
  }

  if (type === "birthday") {
    const dateInput = document.getElementById("birthdayDateInput");
    const date = dateInput.value;

    if (!date) {
      showMessage("Please select a birthday date", "error");
      return;
    }

    if (window.birthdays && window.birthdays[member]) {
      if (!confirm(`${member} already has a birthday set. Update it?`)) return;
    }

    if (!window.birthdays) window.birthdays = {};
    window.birthdays[member] = date;
    try {
      await saveToGoogleSheets("specialDates");
    } catch (error) {
      console.error("Google Sheets save failed, using localStorage:", error);
      localStorage.setItem(
        window.APP_CONFIG.STORAGE_KEYS.BIRTHDAYS,
        JSON.stringify(window.birthdays)
      );
    }
    dateInput.value = "";
    showMessage(`✅ Birthday set for ${member}`);
  } else {
    // Anniversary
    const yearInput = document.getElementById("anniversaryYearInput");
    const dateInput = document.getElementById("anniversaryDateInput");

    const startYear = yearInput.value;
    const anniversaryDate = dateInput.value;

    if (!startYear || !anniversaryDate) {
      showMessage(
        "Please select both start year and anniversary date",
        "error"
      );
      return;
    }

    if (window.anniversaries && window.anniversaries[member]) {
      if (!confirm(`${member} already has an anniversary set. Update it?`))
        return;
    }

    const [year, month, day] = anniversaryDate.split("-");
    if (!window.anniversaries) window.anniversaries = {};
    window.anniversaries[member] = {
      startYear: parseInt(startYear),
      monthDay: `${month}-${day}`,
      originalDate: anniversaryDate,
    };

    try {
      await saveToGoogleSheets("specialDates");
    } catch (error) {
      console.error("Google Sheets save failed, using localStorage:", error);
      localStorage.setItem(
        window.APP_CONFIG.STORAGE_KEYS.ANNIVERSARIES,
        JSON.stringify(window.anniversaries)
      );
    }

    yearInput.value = "";
    dateInput.value = "";
    showMessage(`✅ Anniversary set for ${member}`);
  }

  renderSpecialDatesList();
  renderCalendar();
}

function renderSpecialDatesList() {
  const container = document.getElementById("specialDatesList");
  if (!container) return;

  container.innerHTML = "";

  const allSpecialDates = [];

  // Add birthdays
  if (window.birthdays) {
    Object.entries(window.birthdays).forEach(([member, date]) => {
      allSpecialDates.push({
        member,
        date,
        type: "birthday",
        icon: "🎂",
        typeName: "Birthday",
      });
    });
  }

  // Add anniversaries
  if (window.anniversaries) {
    Object.entries(window.anniversaries).forEach(
      ([member, anniversaryData]) => {
        let displayDate, startYear;

        if (typeof anniversaryData === "string") {
          displayDate = anniversaryData;
          startYear = new Date(anniversaryData).getFullYear();
        } else {
          displayDate =
            anniversaryData.originalDate ||
            `${anniversaryData.startYear}-${anniversaryData.monthDay}`;
          startYear = anniversaryData.startYear;
        }

        const currentYear = new Date().getFullYear();
        const years = currentYear - startYear;

        allSpecialDates.push({
          member,
          date: displayDate,
          type: "anniversary",
          icon: "🏆",
          typeName: `Work Anniversary (${years} year${years !== 1 ? "s" : ""})`,
        });
      }
    );
  }

  if (allSpecialDates.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: #666; padding: 20px;">No special dates added yet.</p>';
    return;
  }

  allSpecialDates.sort((a, b) => new Date(a.date) - new Date(b.date));

  allSpecialDates.forEach((special) => {
    const item = document.createElement("div");
    item.className = "holiday-item";

    const formattedDate = new Date(special.date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });

    item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="font-size: 1.2em;">${special.icon}</div>
                <div>
                    <div style="font-weight: 600;">${special.member}</div>
                    <div style="font-size: 0.85rem; color: #666;">${formattedDate} - ${special.typeName}</div>
                </div>
            </div>
            <button class="btn btn-danger btn-small" onclick="removeSpecialDate('${special.member}', '${special.type}')">
                Remove
            </button>
        `;

    container.appendChild(item);
  });
}

async function removeSpecialDate(member, type) {
  if (!confirm(`Remove ${type} for ${member}?`)) return;

  if (type === "birthday") {
    if (window.birthdays) {
      delete window.birthdays[member];
      localStorage.setItem(
        window.APP_CONFIG.STORAGE_KEYS.BIRTHDAYS,
        JSON.stringify(window.birthdays)
      );
    }
  } else {
    if (window.anniversaries) {
      delete window.anniversaries[member];
      try {
        await saveToGoogleSheets("specialDates");
      } catch (error) {
        console.error("Google Sheets save failed, using localStorage:", error);
        localStorage.setItem(
          window.APP_CONFIG.STORAGE_KEYS.BIRTHDAYS,
          JSON.stringify(window.birthdays)
        );
      }
    }
  }

  renderSpecialDatesList();
  renderCalendar();

  showMessage(`✅ Removed ${type} for ${member}`);
}

function toggleDateFields() {
  const type = document.getElementById("specialDateType").value;
  const birthdayFields = document.getElementById("birthdayFields");
  const anniversaryFields = document.getElementById("anniversaryFields");

  if (birthdayFields && anniversaryFields) {
    if (type === "birthday") {
      birthdayFields.style.display = "block";
      anniversaryFields.style.display = "none";
    } else {
      birthdayFields.style.display = "none";
      anniversaryFields.style.display = "block";
    }
  }
}

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

function showMessage(message, type = "success") {
  const messageEl = document.createElement("div");
  messageEl.textContent = message;
  messageEl.style.cssText = `
    position: fixed;
    top: 60px;
    left: 42%;
    transform: translateX(-50%);
        background: ${type === "success" ? "#4CAF50" : "#f44336"};
        color: white;
        padding: 12px 20px;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 1001;
        font-weight: 500;
    `;

  document.body.appendChild(messageEl);

  setTimeout(() => {
    if (messageEl.parentNode) {
      messageEl.parentNode.removeChild(messageEl);
    }
  }, 3000);
}

function getMemberColor(member) {
  const index = teamMembers.indexOf(member);
  return window.MEMBER_COLORS[index % window.MEMBER_COLORS.length];
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isCurrentMonth(date) {
  return (
    date.getMonth() === currentDate.getMonth() &&
    date.getFullYear() === currentDate.getFullYear()
  );
}

function getWorkingDaysInMonth(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let workingDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    if (!isWeekend(date)) {
      workingDays++;
    }
  }

  return workingDays;
}

function openDatePicker() {
  const modal = document.getElementById("datePickerModal");
  const yearSel = document.getElementById("yearPicker");
  const monthSel = document.getElementById("monthPicker");
  if (!modal || !yearSel || !monthSel) return;

  // Populate years (e.g., currentYear-5 .. currentYear+5)
  const currentYear = currentDate.getFullYear();
  yearSel.innerHTML = "";
  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    if (y === currentYear) opt.selected = true;
    yearSel.appendChild(opt);
  }

  // Populate months
  monthSel.innerHTML = "";
  APP_CONFIG.CALENDAR.MONTHS.forEach((m, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = m;
    if (i === currentDate.getMonth()) opt.selected = true;
    monthSel.appendChild(opt);
  });

  modal.classList.add("active"); // CSS has .date-picker-modal.active { display:flex; }
}

function closeDatePicker() {
  const modal = document.getElementById("datePickerModal");
  if (modal) modal.classList.remove("active");
}

function jumpToDate() {
  const year = parseInt(document.getElementById("yearPicker").value, 10);
  const month = parseInt(document.getElementById("monthPicker").value, 10);
  if (!isNaN(year) && !isNaN(month)) {
    currentDate = new Date(year, month, 1);
    renderCalendar();
    updateDashboard?.();
  }
  closeDatePicker();
}

function toggleGantt() {
  const ganttSection = document.getElementById("ganttSection");
  const toggleBtn = document.getElementById("ganttToggleBtn");
  const toggleIcon = toggleBtn.querySelector(".toggle-icon");

  if (ganttSection.classList.contains("collapsed")) {
    // Show gantt
    ganttSection.classList.remove("collapsed");
    toggleBtn.className = "gantt-toggle-btn hide-state";
    toggleIcon.textContent = "-";
    toggleBtn.innerHTML = '<span class="toggle-icon">-</span> Hide Gantt';
  } else {
    // Hide gantt
    ganttSection.classList.add("collapsed");
    toggleBtn.className = "gantt-toggle-btn show-state";
    toggleIcon.textContent = "+";
    toggleBtn.innerHTML = '<span class="toggle-icon">+</span> Show Gantt';
  }
}

function toggleHolidayType() {
  const radioButtons = document.querySelectorAll('input[name="holidayType"]');
  const regionSelection = document.getElementById("regionSelection");

  const selectedType = Array.from(radioButtons).find(
    (radio) => radio.checked
  ).value;

  if (selectedType === "public") {
    regionSelection.style.display = "block";
  } else {
    regionSelection.style.display = "none";
  }
}

async function addHoliday() {
  const nameInput = document.getElementById("holidayName");
  const dateInput = document.getElementById("holidayDate");
  const holidayType = document.querySelector(
    'input[name="holidayType"]:checked'
  ).value;

  const name = nameInput.value.trim();
  const date = dateInput.value;

  if (!name || !date) {
    showMessage("Please enter both name and date", "error");
    return;
  }

  if (holidayType === "custom") {
    // Add to custom holidays
    window.customHolidays[date] = name;
    try {
      await saveToGoogleSheets("customHolidays");
    } catch (error) {
      console.error("Google Sheets save failed, using localStorage:", error);
      localStorage.setItem(
        "customHolidays",
        JSON.stringify(window.customHolidays)
      );
    }
    showMessage(`✅ Added custom holiday: ${name}`);
  } else {
    // Add to public holidays
    const region = document.querySelector(
      'input[name="holidayRegion"]:checked'
    ).value;

    if (!window.publicHolidays[date]) {
      window.publicHolidays[date] = [];
    }

    window.publicHolidays[date].push({ name: name, region: region });
    try {
      await saveToGoogleSheets("publicHolidays");
    } catch (error) {
      console.error("Google Sheets save failed, using localStorage:", error);
      localStorage.setItem(
        "publicHolidays",
        JSON.stringify(window.publicHolidays)
      );
    }
    showMessage(`✅ Added public holiday: ${name} (${region})`);
  }

  // Clear form
  nameInput.value = "";
  dateInput.value = "";

  // Update displays
  renderExistingHolidaysList();
  renderCalendar();
}

async function removeHoliday(date, type, name, region = null) {
  if (!confirm(`Remove holiday "${name}"?`)) return;

  if (type === "custom") {
    delete window.customHolidays[date];
    try {
      await saveToGoogleSheets("customHolidays");
    } catch (error) {
      console.error("Google Sheets save failed, using localStorage:", error);
      localStorage.setItem(
        "customHolidays",
        JSON.stringify(window.customHolidays)
      );
    }
  } else {
    window.publicHolidays[date] = window.publicHolidays[date].filter(
      (h) => !(h.name === name && h.region === region)
    );
    if (window.publicHolidays[date].length === 0) {
      delete window.publicHolidays[date];
    }
    try {
      await saveToGoogleSheets("publicHolidays");
    } catch (error) {
      console.error("Google Sheets save failed, using localStorage:", error);
      localStorage.setItem(
        "publicHolidays",
        JSON.stringify(window.publicHolidays)
      );
    }
  }

  renderExistingHolidaysList();
  renderCalendar();
  showMessage(`✅ Removed holiday: ${name}`);
}

// ===================================================================
// ACCORDION FUNCTIONALITY
// ===================================================================

function toggleAccordion(sectionId) {
  const item = document.querySelector(`[data-section="${sectionId}"]`);
  const content = item.querySelector(".accordion-content");
  const arrow = item.querySelector(".accordion-arrow");

  const isExpanded = content.classList.contains("expanded");

  if (isExpanded) {
    // Collapse
    content.classList.remove("expanded");
    arrow.textContent = "▼";
    item.removeAttribute("data-expanded");
  } else {
    // Expand
    content.classList.add("expanded");
    arrow.textContent = "▲";
    item.setAttribute("data-expanded", "true");
  }
}

// Initialize accordion - expand first section by default
document.addEventListener("DOMContentLoaded", function () {
  // Set first section as expanded
  const firstItem = document.querySelector('[data-section="team"]');
  if (firstItem) {
    const content = firstItem.querySelector(".accordion-content");
    const arrow = firstItem.querySelector(".accordion-arrow");
    content.classList.add("expanded");
    arrow.textContent = "▲";
    firstItem.setAttribute("data-expanded", "true");
  }
});

// Update member flag when dropdown changes
function updateMemberFlag() {
  const flagName = document.getElementById("memberFlagName");
  if (flagName && currentUser) {
    flagName.textContent = currentUser;
  }
}

// Add this function to your script.js file

function exportData() {
  // Show year selection modal
  const yearOptions = [];
  const currentYear = new Date().getFullYear();

  // Generate year options (current year ± 3 years)
  for (let year = currentYear - 3; year <= currentYear + 3; year++) {
    yearOptions.push(year);
  }

  const yearSelect = document.createElement("select");
  yearSelect.style.cssText =
    "width: 100%; padding: 8px; margin: 10px 0; font-size: 1rem;";
  yearOptions.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    if (year === currentYear) option.selected = true;
    yearSelect.appendChild(option);
  });

  const selectContainer = document.createElement("div");
  selectContainer.innerHTML =
    '<p style="margin-bottom: 10px;">Select year for holiday report:</p>';
  selectContainer.appendChild(yearSelect);

  const modal = createModal("Export Holiday Report", selectContainer, [
    { text: "Cancel", class: "btn-secondary" },
    {
      text: "Export",
      class: "btn-primary",
      handler: () => generateReport(parseInt(yearSelect.value)),
    },
  ]);
}

function generateReport(selectedYear) {
  try {
    const filename = `Holiday_Report_${selectedYear}.csv`;

    // Generate all 12 months for selected year
    const months = [];
    for (let i = 0; i < 12; i++) {
      const monthKey = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
      const monthLabel = new Date(selectedYear, i, 1).toLocaleDateString(
        "en-US",
        { month: "short" }
      );
      months.push({ key: monthKey, label: monthLabel });
    }

    // Start building CSV content
    let csvContent = "";

    // Report header with better formatting
    const now = new Date();
    csvContent += `"Team Holiday Report ${selectedYear}"\n`;
    csvContent += `"Generated: ${now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })} at ${now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}"\n`;
    csvContent += `"Total Team Size: ${teamMembers.length}"\n`;
    csvContent += "\n";

    // Individual member breakdown with better header formatting
    csvContent += '"=== INDIVIDUAL MEMBER BREAKDOWN ==="\n';
    csvContent +=
      '"Team Member",' +
      months.map((m) => `"${m.label}"`).join(",") +
      ',"Annual Total"\n';

    // Calculate data for each team member
    const memberTotals = [];
    const monthlyTotals = new Array(12).fill(0);

    teamMembers.forEach((member) => {
      let row = member;
      let annualTotal = 0;

      months.forEach((month, index) => {
        const memberData = (holidayData[member] || {})[month.key] || {};

        // Calculate total days for this month
        let totalDays = 0;
        Object.values(memberData).forEach((leaveType) => {
          if (leaveType === "full") {
            totalDays += 1;
          } else if (leaveType === "morning" || leaveType === "afternoon") {
            totalDays += 0.5;
          }
        });

        annualTotal += totalDays;
        monthlyTotals[index] += totalDays;
        row += "," + (totalDays > 0 ? totalDays : "-");
      });

      row += "," + (annualTotal > 0 ? annualTotal : "-");
      csvContent += row + "\n";
      memberTotals.push({ member, total: annualTotal });
    });

    // Add spacing and monthly team summary
    csvContent += "\n";
    csvContent += '"=== MONTHLY TEAM SUMMARY ==="\n';
    csvContent += '"Month","Total Team Days","Average per Person"\n';

    months.forEach((month, index) => {
      const avgPerPerson =
        teamMembers.length > 0
          ? (monthlyTotals[index] / teamMembers.length).toFixed(1)
          : "0";
      const totalDisplay =
        monthlyTotals[index] > 0 ? monthlyTotals[index] : "-";
      const avgDisplay = monthlyTotals[index] > 0 ? avgPerPerson : "-";
      csvContent += `"${month.label}","${totalDisplay}","${avgDisplay}"\n`;
    });

    // Annual summary with better formatting
    const totalAnnualDays = monthlyTotals.reduce((sum, days) => sum + days, 0);
    const avgAnnualPerPerson =
      teamMembers.length > 0
        ? (totalAnnualDays / teamMembers.length).toFixed(1)
        : "0";

    csvContent += "\n";
    csvContent += '"=== ANNUAL SUMMARY ==="\n';
    csvContent += '"Metric","Value"\n';
    csvContent += `"Total Annual Leave Days","${totalAnnualDays}"\n`;
    csvContent += `"Average per Team Member","${avgAnnualPerPerson}"\n`;

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showMessage(`Comprehensive report exported: ${filename}`);
    } else {
      showMessage("Export not supported in this browser", "error");
    }
  } catch (error) {
    console.error("Export error:", error);
    showMessage("Export failed. Please try again.", "error");
  }
}

// Make function globally available
window.exportData = exportData;

// ===================================================================
// EXPORT FUNCTIONS
// ===================================================================

window.switchTab = switchTab;
window.changeMonth = changeMonth;
window.showMessage = showMessage;
window.getMemberColor = getMemberColor;
window.isWeekend = isWeekend;
window.isCurrentMonth = isCurrentMonth;
window.formatDate = formatDate;
window.parseDate = parseDate;
window.getWorkingDaysInMonth = getWorkingDaysInMonth;
window.addCustomHoliday = addCustomHoliday;
window.removeCustomHoliday = removeCustomHoliday;
window.addSpecialDate = addSpecialDate;
window.removeSpecialDate = removeSpecialDate;
window.toggleDateFields = toggleDateFields;
window.saveToLocalStorage = saveToLocalStorage;

// Export date picker functions
window.openDatePicker = openDatePicker;
window.closeDatePicker = closeDatePicker;
window.jumpToDate = jumpToDate;
window.toggleHolidayType = toggleHolidayType;
window.addHoliday = addHoliday;
window.removeHoliday = removeHoliday;
window.filterYearlyHolidays = filterYearlyHolidays;

// Export the function
window.toggleAccordion = toggleAccordion;
