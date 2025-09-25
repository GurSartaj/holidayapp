// ===================================================================
// COMPLETE CALENDAR MODULE - FIXED
// All original functionality with proper variable management
// ===================================================================

// Initialize global variables if they don't exist
if (typeof window.pendingHolidays === "undefined") window.pendingHolidays = {};
if (typeof window.autoResetTimer === "undefined") window.autoResetTimer = null;
if (typeof window.publicHolidays === "undefined") window.publicHolidays = {};
if (typeof window.customHolidays === "undefined") window.customHolidays = {};
if (typeof window.enhancedCustomHolidays === "undefined")
  window.enhancedCustomHolidays = {};
if (typeof window.birthdays === "undefined") window.birthdays = {};
if (typeof window.anniversaries === "undefined") window.anniversaries = {};

// Function to mark today's date
function markTodaysDate() {
  const today = new Date();
  const todayString = formatDate(today);

  // Remove existing today class
  document.querySelectorAll(".calendar-day.today").forEach((day) => {
    day.classList.remove("today");
  });

  // Add today class to current date
  const todayCell = document.querySelector(`[data-date="${todayString}"]`);
  if (todayCell && isCurrentMonth(today)) {
    todayCell.classList.add("today");
  }
}

// Export the function
window.markTodaysDate = markTodaysDate;

function renderCalendar() {
  if (!calendarGrid || !monthYear) return;

  // Update month/year display
  monthYear.textContent = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Clear calendar grid
  calendarGrid.innerHTML = "";

  // Add day headers
  window.APP_CONFIG.CALENDAR.DAYS.forEach((day) => {
    const dayHeader = document.createElement("div");
    dayHeader.className = "day-header";
    dayHeader.textContent = day;
    calendarGrid.appendChild(dayHeader);
  });

  // Get calendar data for current month only
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); // What day of week does month start on

  // Add empty cells for days before the 1st of the month
  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-day empty-day";
    calendarGrid.appendChild(emptyCell);
  }

  // Generate actual days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayElement = createDayElement(date);
    calendarGrid.appendChild(dayElement);
  }

  // Load user holidays
  loadUserHolidays();
  loadHolidayDataFromStorage();

  // Update stats and other components
  updateQuickStatsPills();
  markTodaysDate();

  // Render Gantt
  setTimeout(() => {
    renderGantt();
  }, 100);

  if (typeof updateSidePanelKPIs === "function") {
    updateSidePanelKPIs();
  }
}

function createDayElement(date) {
  const dayElement = document.createElement("div");
  dayElement.className = "calendar-day";

  const dateString = formatDate(date);
  dayElement.dataset.date = dateString;
  dayElement.dataset.day = date.getDate();

  // Add day number
  const dayNumber = document.createElement("div");
  dayNumber.className = "day-number";
  dayNumber.textContent = date.getDate();
  dayElement.appendChild(dayNumber);

  // Add CSS classes based on date properties
  if (isWeekend(date)) {
    dayElement.classList.add("weekend");
  }

  if (!isCurrentMonth(date)) {
    dayElement.classList.add("other-month");
  }

  // Check for public holidays
  addPublicHolidays(dayElement, date);

  // Check for custom holidays
  addCustomHolidays(dayElement, date);

  // Check for special dates (birthdays/anniversaries)
  addSpecialDates(dayElement, date);

  // Add click handlers
  addCalendarEventHandlers(dayElement, date);

  return dayElement;
}

function addPublicHolidays(dayElement, date) {
  const dateKey = formatDate(date);
  const holidays = getAllHolidaysForDate(date);

  let regions = [];
  let holidayNames = [];

  holidays.forEach((holiday) => {
    regions.push(holiday.region);
    holidayNames.push(holiday.name);
  });

  // Apply region classes
  regions.forEach((region) => {
    if (region === "US") dayElement.classList.add("us-holiday");
    if (region === "UK") dayElement.classList.add("uk-holiday");
    if (region === "IN") dayElement.classList.add("in-holiday");
  });

  // Add region abbreviation
  if (regions.length > 0) {
    const regionAbbrev = document.createElement("div");
    regionAbbrev.className = "region-abbrev";
    regionAbbrev.textContent = regions
      .map((r) => (r === "IN" ? "IN" : r === "US" ? "US" : "UK"))
      .join("/");
    dayElement.appendChild(regionAbbrev);
  }

  // Add tooltip for holiday names
  if (holidayNames.length > 0) {
    const tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.textContent = holidayNames.join(", ");
    dayElement.appendChild(tooltip);
  }
}

function addCustomHolidays(dayElement, date) {
  const dateKey = formatDate(date);

  if (window.customHolidays[dateKey]) {
    dayElement.classList.add("custom-holiday");

    // Add tooltip
    const tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.textContent = window.customHolidays[dateKey];
    dayElement.appendChild(tooltip);
  }
}

function addSpecialDates(dayElement, date) {
  const birthdayPeople = [];
  const anniversaryPeople = [];

  // Check birthdays
  if (window.birthdays) {
    Object.entries(window.birthdays).forEach(([member, birthDate]) => {
      const birthDateObj = new Date(birthDate);
      if (
        birthDateObj.getMonth() === date.getMonth() &&
        birthDateObj.getDate() === date.getDate()
      ) {
        birthdayPeople.push(member);
      }
    });
  }

  // Check anniversaries
  if (window.anniversaries) {
    Object.entries(window.anniversaries).forEach(
      ([member, anniversaryData]) => {
        let monthToCheck, dayToCheck;

        if (typeof anniversaryData === "string") {
          const anniversaryDateObj = new Date(anniversaryData);
          monthToCheck = anniversaryDateObj.getMonth();
          dayToCheck = anniversaryDateObj.getDate();
        } else {
          const [month, day] = anniversaryData.monthDay.split("-").map(Number);
          monthToCheck = month - 1;
          dayToCheck = day;
        }

        if (monthToCheck === date.getMonth() && dayToCheck === date.getDate()) {
          anniversaryPeople.push(member);
        }
      }
    );
  }

  // Add icons if there are special dates
  if (birthdayPeople.length > 0 || anniversaryPeople.length > 0) {
    const iconsContainer = document.createElement("div");
    iconsContainer.className = "special-date-icons";

    if (birthdayPeople.length > 0) {
      const birthdayIcon = document.createElement("span");
      birthdayIcon.className = "birthday-icon";
      birthdayIcon.textContent = "🎂";
      birthdayIcon.title = `Birthday: ${birthdayPeople.join(", ")}`;
      iconsContainer.appendChild(birthdayIcon);
    }

    if (anniversaryPeople.length > 0) {
      const anniversaryIcon = document.createElement("span");
      anniversaryIcon.className = "anniversary-icon";
      anniversaryIcon.textContent = "🏆";
      anniversaryIcon.title = `Work Anniversary: ${anniversaryPeople.join(
        ", "
      )}`;
      iconsContainer.appendChild(anniversaryIcon);
    }

    dayElement.appendChild(iconsContainer);
  }
}

function addCalendarEventHandlers(dayElement, date) {
  const dayNum = parseInt(dayElement.dataset.day);

  // Left click: Full day toggle or modify existing
  dayElement.addEventListener("click", (e) => {
    if (e.detail === 1) {
      e.preventDefault();
      e.stopPropagation();

      if (!isCurrentMonth(date)) return;

      const user = userSelect.value;
      const pendingKey = getPendingKey();
      const monthKey = getKey(currentDate);

      if (!window.pendingHolidays[pendingKey]) {
        window.pendingHolidays[pendingKey] = {};
      }

      // Check if there's already a saved holiday for this day
      const savedHoliday =
        holidayData[user] &&
        holidayData[user][monthKey] &&
        holidayData[user][monthKey][dayNum];

      // Clear any existing classes
      dayElement.classList.remove(
        "morning-half",
        "afternoon-half",
        "full-day",
        "holiday"
      );

      if (savedHoliday || window.pendingHolidays[pendingKey][dayNum]) {
        // If there's a saved or pending holiday, remove it
        if (savedHoliday) {
          // Remove from saved data
          delete holidayData[user][monthKey][dayNum];
          saveToLocalStorage();
        }
        delete window.pendingHolidays[pendingKey][dayNum];
        applyHalfDayVisuals(dayElement, "none");
      } else {
        // Add new full day holiday
        dayElement.classList.add("holiday", "full-day");
        window.pendingHolidays[pendingKey][dayNum] = "full";
        applyHalfDayVisuals(dayElement, "full");
      }

      startAutoResetTimer();
      renderGantt(); // Update Gantt immediately
    }
  });

  // Right click: Half-day cycling or modify existing
  dayElement.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isCurrentMonth(date)) return;

    const user = userSelect.value;
    const pendingKey = getPendingKey();
    const monthKey = getKey(currentDate);

    if (!window.pendingHolidays[pendingKey]) {
      window.pendingHolidays[pendingKey] = {};
    }

    // Check current state (saved or pending)
    const savedHoliday =
      holidayData[user] &&
      holidayData[user][monthKey] &&
      holidayData[user][monthKey][dayNum];
    const currentLeaveType =
      window.pendingHolidays[pendingKey][dayNum] || savedHoliday;

    // Clear all classes
    dayElement.classList.remove(
      "holiday",
      "full-day",
      "morning-half",
      "afternoon-half"
    );

    // Cycle: none → morning → afternoon → none
    if (currentLeaveType === "morning") {
      dayElement.classList.add("afternoon-half");
      window.pendingHolidays[pendingKey][dayNum] = "afternoon";
      applyHalfDayVisuals(dayElement, "afternoon");

      // If modifying saved holiday, remove the old one
      if (savedHoliday) {
        delete holidayData[user][monthKey][dayNum];
        saveToLocalStorage();
      }
    } else if (currentLeaveType === "afternoon") {
      // Remove holiday completely
      if (savedHoliday) {
        delete holidayData[user][monthKey][dayNum];
        saveToLocalStorage();
      }
      delete window.pendingHolidays[pendingKey][dayNum];
      applyHalfDayVisuals(dayElement, "none");
    } else {
      // Set to morning
      dayElement.classList.add("morning-half");
      window.pendingHolidays[pendingKey][dayNum] = "morning";
      applyHalfDayVisuals(dayElement, "morning");

      // If modifying saved holiday, remove the old one
      if (savedHoliday) {
        delete holidayData[user][monthKey][dayNum];
        saveToLocalStorage();
      }
    }

    startAutoResetTimer();
    renderGantt(); // Update Gantt immediately
    return false;
  });
}

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
    // Clear all styling
    cell.style.removeProperty("background");
    cell.style.removeProperty("border");
    cell.style.removeProperty("color");
    cell.style.removeProperty("font-weight");
  }
}

function loadUserHolidays() {
  if (!userSelect || !calendarGrid) return;

  const user = userSelect.value;
  const key = getKey(currentDate);
  const userData = (holidayData[user] || {})[key] || {};
  const pendingKey = getPendingKey();
  const pendingData = window.pendingHolidays[pendingKey] || {};

  calendarGrid.querySelectorAll(".calendar-day").forEach((cell) => {
    const day = parseInt(cell.dataset.day);
    if (isNaN(day)) return;

    // Clear existing holiday classes
    cell.classList.remove(
      "holiday",
      "morning-half",
      "afternoon-half",
      "full-day"
    );

    // Check pending changes first, then saved data
    const leaveType = pendingData[day] || userData[day];

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

function getPendingKey() {
  const user = userSelect.value;
  const monthKey = getKey(currentDate);
  return `${user}-${monthKey}`;
}

function startAutoResetTimer() {
  if (window.autoResetTimer) {
    clearTimeout(window.autoResetTimer);
  }

  window.autoResetTimer = setTimeout(() => {
    clearPendingSelections();
  }, window.APP_TIMING.AUTO_RESET_DELAY);
}

function clearPendingSelections() {
  const pendingKey = getPendingKey();

  if (window.pendingHolidays[pendingKey]) {
    delete window.pendingHolidays[pendingKey];
  }

  loadUserHolidays();

  if (window.autoResetTimer) {
    clearTimeout(window.autoResetTimer);
    window.autoResetTimer = null;
  }
}

async function saveHolidays() {
  const user = userSelect.value;
  const key = getKey(currentDate);
  const pendingKey = getPendingKey();

  if (!holidayData[user]) holidayData[user] = {};

  // Get pending changes
  const pendingData = window.pendingHolidays[pendingKey] || {};

  // Apply pending changes to saved data
  holidayData[user][key] = { ...holidayData[user][key], ...pendingData };

  // Clear pending
  delete window.pendingHolidays[pendingKey];

  // Save to Google Sheets with fallback
  try {
    await saveToGoogleSheets("holidays");
  } catch (error) {
    console.error("Google Sheets save failed, using localStorage:", error);
    saveToLocalStorage();
  }

  // Reload to show saved state
  loadUserHolidays();
  updateDashboard();
  renderGantt();
  if (typeof updateSidePanelKPIs === "function") {
    updateSidePanelKPIs();
  }

  showMessage("✅ Holidays saved successfully");
}

function clearPendingHolidays() {
  clearPendingSelections();

  // Re-render Gantt to show cleared state - ADD THIS LINE
  renderGantt();

  showMessage("Pending selections cleared");
}

function calculateMemberHolidays(member, year, month) {
  const memberHolidays = holidayData[member] || {};
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthData = memberHolidays[monthKey] || {};

  let totalDays = 0;
  let holidayDates = [];

  Object.keys(monthData).forEach((day) => {
    const type = monthData[day];
    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

    if (type === "full") {
      totalDays += 1;
    } else {
      totalDays += 0.5;
    }

    holidayDates.push({
      date: dateString,
      type: type,
    });
  });

  return { totalDays, holidayDates };
}

// Load data from localStorage
function loadHolidayDataFromStorage() {
  try {
    const saved = localStorage.getItem(
      window.APP_CONFIG.STORAGE_KEYS.CUSTOM_HOLIDAYS
    );
    if (saved) window.customHolidays = JSON.parse(saved);

    const savedPublic = localStorage.getItem(
      window.APP_CONFIG.STORAGE_KEYS.PUBLIC_HOLIDAYS
    );
    if (savedPublic) window.publicHolidays = JSON.parse(savedPublic);

    const savedBirthdays = localStorage.getItem(
      window.APP_CONFIG.STORAGE_KEYS.BIRTHDAYS
    );
    if (savedBirthdays) window.birthdays = JSON.parse(savedBirthdays);

    const savedAnniversaries = localStorage.getItem(
      window.APP_CONFIG.STORAGE_KEYS.ANNIVERSARIES
    );
    if (savedAnniversaries)
      window.anniversaries = JSON.parse(savedAnniversaries);

    const savedEnhanced = localStorage.getItem(
      window.APP_CONFIG.STORAGE_KEYS.ENHANCED_HOLIDAYS
    );
    if (savedEnhanced)
      window.enhancedCustomHolidays = JSON.parse(savedEnhanced);
  } catch (error) {
    console.error("Error loading holiday data:", error);
  }
}

// Update Quick Stats Pills
function updateQuickStatsPills() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthKey = getKey(currentDate);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 1. Team Size
  document.getElementById("stat-team-size").textContent = teamMembers.length;

  // 2. Number of people taking leave this month
  const peopleOnLeave = teamMembers.filter((member) => {
    const memberData = (holidayData[member] || {})[monthKey] || {};
    return Object.keys(memberData).length > 0;
  }).length;
  document.getElementById("stat-people-on-leave").textContent = peopleOnLeave;

  // 3. Peak leave day (day with most people off)
  let maxPeopleOff = 0;
  let peakDay = null;

  for (let day = 1; day <= daysInMonth; day++) {
    const peopleOffToday = teamMembers.filter((member) => {
      const memberData = (holidayData[member] || {})[monthKey] || {};
      return memberData[day];
    }).length;

    if (peopleOffToday > maxPeopleOff) {
      maxPeopleOff = peopleOffToday;
      peakDay = day;
    }
  }

  document.getElementById("stat-peak-day").textContent = peakDay
    ? `${peakDay}`
    : "-";

  // 4. Overlap days (days with multiple people off)
  let overlapDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const peopleOffToday = teamMembers.filter((member) => {
      const memberData = (holidayData[member] || {})[monthKey] || {};
      return memberData[day];
    }).length;

    if (peopleOffToday > 1) {
      overlapDays++;
    }
  }

  document.getElementById("stat-overlap-days").textContent = overlapDays;

  // 5. Weekend spillover (leave on Fridays and Mondays)
  let weekendSpillover = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, 5=Friday, 6=Saturday

    if (dayOfWeek === 1 || dayOfWeek === 5) {
      // Monday or Friday
      const peopleOffToday = teamMembers.filter((member) => {
        const memberData = (holidayData[member] || {})[monthKey] || {};
        return memberData[day];
      }).length;

      if (peopleOffToday > 0) {
        weekendSpillover++;
      }
    }
  }

  document.getElementById("stat-weekend-spillover").textContent =
    weekendSpillover;

  console.log("Quick stats pills updated successfully");
}

function getAllHolidaysForDate(date) {
  const dateKey = formatDate(date);
  const monthDayKey = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

  let holidays = [];

  // Add permanent holidays
  if (window.PERMANENT_HOLIDAYS && window.PERMANENT_HOLIDAYS[monthDayKey]) {
    holidays = holidays.concat(window.PERMANENT_HOLIDAYS[monthDayKey]);
  }

  // Add user-added public holidays
  if (window.publicHolidays && window.publicHolidays[dateKey]) {
    holidays = holidays.concat(window.publicHolidays[dateKey]);
  }

  return holidays;
}

// Export the function
window.updateQuickStatsPills = updateQuickStatsPills;

// Export functions
window.renderCalendar = renderCalendar;
window.loadUserHolidays = loadUserHolidays;
window.calculateMemberHolidays = calculateMemberHolidays;
window.saveHolidays = saveHolidays;
window.clearPendingHolidays = clearPendingHolidays;
window.loadHolidayDataFromStorage = loadHolidayDataFromStorage;
