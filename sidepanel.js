// ===================================================================
// SIDE PANEL MODULE - FIXED FOR CURRENT CODEBASE
// ===================================================================

let sidePanelExpanded = false;
let allCardsExpanded = false;

function initializeSidePanel() {
  // Set initial state to expanded
  sidePanelExpanded = true;

  // Update toggle icon and floating button
  const toggleIcon = document.querySelector("#sidePanelToggle .toggle-icon");
  const floatingBtn = document.getElementById("sidePanelFloatingToggle");

  if (toggleIcon) toggleIcon.textContent = "▶";
  if (floatingBtn) floatingBtn.style.opacity = "0";

  setTimeout(() => {
    setupSidePanelEventListeners();
    updateSidePanelKPIs();
  }, 100);
}

function setupSidePanelEventListeners() {
  const toggleBtn = document.getElementById("sidePanelToggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", toggleSidePanel);
  }

  const expandAllBtn = document.getElementById("expandAllBtn");
  if (expandAllBtn) {
    expandAllBtn.addEventListener("click", toggleExpandAll);
  }

  const tabButtons = document.querySelectorAll(".side-panel-tab");
  tabButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      switchSidePanelTab(e.target.dataset.tab);
    });
  });
}

function toggleSidePanel() {
  const panel = document.getElementById("teamInsightsSidePanel");
  const toggleIcon = document.querySelector("#sidePanelToggle .toggle-icon");
  const floatingBtn = document.getElementById("sidePanelFloatingToggle");

  if (panel) {
    sidePanelExpanded = !sidePanelExpanded;

    if (sidePanelExpanded) {
      panel.classList.add("expanded");
      if (toggleIcon) toggleIcon.textContent = "▶";
      if (floatingBtn) floatingBtn.style.opacity = "0";
    } else {
      panel.classList.remove("expanded");
      if (toggleIcon) toggleIcon.textContent = "◀";
      if (floatingBtn) floatingBtn.style.opacity = "1";
    }
  }
}

function toggleKPICard(kpiId) {
  const card = document.querySelector(`[data-kpi="${kpiId}"]`);
  if (!card) return;

  const content = card.querySelector(".kpi-card-content");
  const arrow = card.querySelector(".kpi-expand-arrow");

  if (content && arrow) {
    const isExpanded = content.classList.contains("expanded");

    if (isExpanded) {
      content.classList.remove("expanded");
      arrow.textContent = "▶";
    } else {
      content.classList.add("expanded");
      arrow.textContent = "▼";
    }
  }
}

function toggleExpandAll() {
  const expandAllBtn = document.getElementById("expandAllBtn");
  const allCards = document.querySelectorAll(".collapsible-kpi-card");

  allCardsExpanded = !allCardsExpanded;

  allCards.forEach((card) => {
    const content = card.querySelector(".kpi-card-content");
    const arrow = card.querySelector(".kpi-expand-arrow");

    if (content && arrow) {
      if (allCardsExpanded) {
        content.classList.add("expanded");
        arrow.textContent = "▼";
      } else {
        content.classList.remove("expanded");
        arrow.textContent = "▶";
      }
    }
  });

  if (expandAllBtn) {
    expandAllBtn.textContent = allCardsExpanded
      ? "📊 Collapse All Metrics"
      : "📊 Expand All Metrics";
  }
}

function switchSidePanelTab(tabName) {
  document.querySelectorAll(".side-panel-tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");

  document.querySelectorAll(".side-panel-tab-content").forEach((content) => {
    content.classList.remove("active");
  });
  document.getElementById(`${tabName}Tab`).classList.add("active");

  // Load appropriate data based on tab
  if (tabName === "holidays") {
    renderMonthlyHolidays();
    renderYearlyHolidays();
  } else if (tabName === "annual") {
    renderAnnualKPICards();
  }
}

// Fixed KPI update function based on current codebase
function updateSidePanelKPIs() {
  // Check if required variables exist (from current codebase)
  if (
    typeof currentDate === "undefined" ||
    typeof teamMembers === "undefined" ||
    typeof holidayData === "undefined"
  ) {
    console.log("Missing required variables for side panel KPIs");
    setTimeout(updateSidePanelKPIs, 500);
    return;
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthKey = getKey(currentDate); // Use existing getKey function from utils.js
  const today = new Date();

  // 1. Team Size
  const teamSize = teamMembers.length;

  // 2. Calculate people on holiday today
  let onHolidayToday = 0;
  let onHolidayNames = [];
  if (year === today.getFullYear() && month === today.getMonth()) {
    const todayDay = today.getDate();
    teamMembers.forEach((member) => {
      const memberData = (holidayData[member] || {})[monthKey] || {};
      if (memberData[todayDay]) {
        onHolidayToday++;
        onHolidayNames.push(member);
      }
    });
  }

  // 3. Calculate total leave days for current month
  let totalLeaveDays = 0;
  teamMembers.forEach((member) => {
    const memberData = calculateMemberHolidays(member, year, month); // Use existing function
    totalLeaveDays += memberData.totalDays;
  });

  // 4. Calculate availability percentage
  const workingDays = getWorkingDaysInMonth(year, month); // Use existing function
  const totalWorkingCapacity = workingDays * teamMembers.length;
  const availabilityPercent =
    totalWorkingCapacity > 0
      ? Math.round(
          ((totalWorkingCapacity - totalLeaveDays) / totalWorkingCapacity) * 100
        )
      : 100;

  // 5. Calculate at-risk days (days with less than 3 people available)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let atRiskDays = 0;
  let atRiskDaysList = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    if (isWeekend(date)) continue; // Use existing isWeekend function

    const peopleOff = teamMembers.filter((member) => {
      const memberData = (holidayData[member] || {})[monthKey] || {};
      return memberData[d];
    }).length;

    const peopleAvailable = teamMembers.length - peopleOff;
    if (peopleAvailable < 3) {
      atRiskDays++;
      atRiskDaysList.push(`${d}/${month + 1} (${peopleAvailable} available)`);
    }
  }

  // 6. Calculate zero leave days
  let zeroLeaveDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    if (isWeekend(date)) continue;

    const anyoneOff = teamMembers.some((member) => {
      const memberData = (holidayData[member] || {})[monthKey] || {};
      return memberData[d];
    });

    if (!anyoneOff) zeroLeaveDays++;
  }

  // 7. No leave takers
  const noLeaveMembers = teamMembers.filter((member) => {
    const memberData = calculateMemberHolidays(member, year, month);
    return memberData.totalDays === 0;
  });

  // 8. Upcoming leave (next 7 days from today)
  const todayDate = today.getDate();
  const upcomingMembers = [];

  if (year === today.getFullYear() && month === today.getMonth()) {
    teamMembers.forEach((member) => {
      const memberData = (holidayData[member] || {})[monthKey] || {};
      let upcomingDays = 0;

      for (let d = todayDate; d <= Math.min(todayDate + 7, daysInMonth); d++) {
        if (memberData[d]) upcomingDays++;
      }

      if (upcomingDays > 0) {
        upcomingMembers.push({ name: member, days: upcomingDays });
      }
    });
  }

  // 9. Top leave takers this month
  const topTakers = teamMembers
    .map((member) => {
      const memberData = calculateMemberHolidays(member, year, month);
      return { name: member, days: memberData.totalDays };
    })
    .filter((m) => m.days > 0)
    .sort((a, b) => b.days - a.days);

  // 10. Calculate trend vs last month
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  let prevTotal = 0;
  teamMembers.forEach((member) => {
    const memberData = calculateMemberHolidays(member, prevYear, prevMonth);
    prevTotal += memberData.totalDays;
  });

  let trend = "";
  if (prevTotal === 0 && totalLeaveDays === 0) {
    trend = "No change";
  } else if (prevTotal === 0) {
    trend = "New leave this month";
  } else {
    const pct = Math.round(((totalLeaveDays - prevTotal) / prevTotal) * 100);
    trend = `${pct >= 0 ? "+" : ""}${pct}% vs last month`;
  }

  // 11. Special dates count (birthdays and anniversaries)
  // 11. Special dates with proper details
  let specialDates = 0;
  let specialDatesDetails = [];

  // Count birthdays this month and collect details
  // Count birthdays this month and collect details
  if (typeof birthdays !== "undefined" && birthdays) {
    Object.entries(birthdays).forEach(([member, birthDate]) => {
      // ✅ TIMEZONE-SAFE: Parse date components manually
      const [yearPart, monthPart, dayPart] = birthDate.split("-").map(Number);
      const birthMonth = monthPart - 1; // JavaScript months are 0-indexed
      const birthDay = dayPart;

      if (birthMonth === month) {
        specialDates++;
        specialDatesDetails.push({
          member: member,
          date: birthDay,
          type: "birthday",
          icon: "🎂",
          typeName: "Birthday",
        });
      }
    });
  }

  // Count anniversaries this month and collect details
  if (typeof anniversaries !== "undefined" && anniversaries) {
    Object.entries(anniversaries).forEach(([member, anniversaryData]) => {
      let checkMonth, dayToCheck, startYear;

      if (typeof anniversaryData === "string") {
        // ✅ TIMEZONE-SAFE: Parse date components manually
        const [year, month, day] = anniversaryData.split("-").map(Number);
        checkMonth = month - 1; // JavaScript months are 0-indexed
        dayToCheck = day;
        startYear = year;
      } else if (anniversaryData.monthDay) {
        const [monthNum, day] = anniversaryData.monthDay.split("-").map(Number);
        checkMonth = monthNum - 1;
        dayToCheck = day;
        startYear = anniversaryData.startYear;
      }

      if (checkMonth === month) {
        const years = year - startYear;
        if (years > 0) {
          specialDates++;
          specialDatesDetails.push({
            member: member,
            date: dayToCheck,
            type: "anniversary",
            icon: "🏆",
            typeName: `Anniversary (${years} Year${years !== 1 ? "s" : ""})`,
          });
        }
      }
    });
  }

  // Sort special dates by date
  specialDatesDetails.sort((a, b) => a.date - b.date);

  // Update special dates count
  updateElement("side-kpi-special-dates", specialDates);

  // Update special dates list with proper format
  const specialDatesListEl = document.getElementById(
    "side-kpi-special-dates-list"
  );
  if (specialDatesListEl) {
    if (specialDatesDetails.length === 0) {
      specialDatesListEl.innerHTML =
        '<div style="color:#9ca3af; font-style:italic; text-align:center; padding:12px 0;">No special dates this month</div>';
    } else {
      specialDatesListEl.innerHTML = specialDatesDetails
        .map(
          (item) => `
          <div class="special-date-item">
            <div class="special-date-name">${item.member}</div>
            <div class="special-date-type">${item.icon} ${
            item.typeName
          } - ${getOrdinal(item.date)}</div>
          </div>
        `
        )
        .join("");
    }
  }

  // UPDATE ALL KPI ELEMENTS
  updateElement("side-kpi-total-leave", totalLeaveDays);
  updateElement("side-kpi-total-leave-trend", trend);
  updateElement("side-kpi-avail-pct", availabilityPercent + "%");
  updateElement("side-kpi-off-today", onHolidayToday);
  updateElement(
    "side-kpi-off-today-names",
    onHolidayNames.length > 0
      ? onHolidayNames.join(", ")
      : "No one is off today"
  );
  updateElement("side-kpi-at-risk", atRiskDays);
  updateElement(
    "side-kpi-at-risk-list",
    atRiskDays > 0
      ? atRiskDaysList.slice(0, 3).join(", ") +
          (atRiskDaysList.length > 3 ? "..." : "")
      : "All days adequately staffed"
  );
  updateElement("side-kpi-zero-leave-days", `${zeroLeaveDays}/${workingDays}`);
  updateElement(
    "side-kpi-zero-leave-msg",
    zeroLeaveDays === workingDays ? "Perfect month!" : ""
  );
  updateElement("side-kpi-no-leave-members", noLeaveMembers.length);
  updateElement(
    "side-kpi-no-leave-members-list",
    noLeaveMembers.length > 0
      ? noLeaveMembers.join(", ")
      : "All have leave scheduled"
  );
  updateElement("side-kpi-upcoming-leave", upcomingMembers.length);
  updateElement(
    "side-kpi-upcoming-leave-names",
    upcomingMembers.length > 0
      ? upcomingMembers.map((m) => `${m.name} (${m.days}d)`).join(", ")
      : "No upcoming leave"
  );
  updateElement("side-kpi-top-leave-num", topTakers.length);
  updateElement(
    "side-kpi-top-leave-names",
    topTakers.length > 0
      ? topTakers
          .slice(0, 3)
          .map((t) => `${t.name}: ${t.days}d`)
          .join(", ")
      : "No leave taken"
  );
  updateElement("side-kpi-special-dates", specialDates);

  console.log("Side panel KPIs updated successfully");

  // Update holidays tab if it's currently active
  const holidaysTab = document.getElementById("holidaysTab");
  if (holidaysTab && holidaysTab.classList.contains("active")) {
    renderMonthlyHolidays();
    renderYearlyHolidays();
  }
}

function updateElement(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  } else {
    console.warn(`Element with id '${id}' not found`);
  }
}

// Auto-initialize
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeSidePanel);
} else {
  initializeSidePanel();
}

// Global filter state for yearly holidays
let currentYearlyFilter = "all";

function renderMonthlyHolidays() {
  const container = document.getElementById("monthlyHolidaysContent");
  if (!container) return;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthHolidays = [];

  // Get all holidays for current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateKey = formatDate(date);

    // Add public holidays
    const publicHolidays = getAllHolidaysForDate(date);
    publicHolidays.forEach((holiday) => {
      monthHolidays.push({
        date: day,
        name: holiday.name,
        type: "public",
        region: holiday.region,
      });
    });

    // Add custom holidays
    if (window.customHolidays && window.customHolidays[dateKey]) {
      monthHolidays.push({
        date: day,
        name: window.customHolidays[dateKey],
        type: "custom",
      });
    }
  }

  if (monthHolidays.length === 0) {
    container.innerHTML =
      '<div style="color: #9ca3af; font-style: italic; text-align: center; padding: 20px;">No holidays this month</div>';
    return;
  }

  // Sort by date
  monthHolidays.sort((a, b) => a.date - b.date);

  container.innerHTML = monthHolidays
    .map((holiday) => {
      const regionClass =
        holiday.type === "public" ? holiday.region.toLowerCase() : "custom";
      const regionText =
        holiday.type === "public" ? ` (${holiday.region})` : "";

      return `
      <div class="holiday-item-simple">
        <div class="holiday-region-dot ${regionClass}"></div>
        <span>${getOrdinal(holiday.date)} - ${holiday.name}${regionText}</span>
      </div>
    `;
    })
    .join("");
}

function renderYearlyHolidays() {
  const container = document.getElementById("yearlyHolidaysContent");
  if (!container) return;

  const year = currentDate.getFullYear();
  const yearlyHolidays = {};

  // Initialize months
  for (let month = 0; month < 12; month++) {
    const monthName = new Date(year, month, 1).toLocaleDateString("en-US", {
      month: "long",
    });
    yearlyHolidays[monthName] = [];
  }

  // Collect all holidays for the year
  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = new Date(year, month, 1).toLocaleDateString("en-US", {
      month: "long",
    });

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = formatDate(date);

      // Add public holidays
      const publicHolidays = getAllHolidaysForDate(date);
      publicHolidays.forEach((holiday) => {
        yearlyHolidays[monthName].push({
          date: day,
          name: holiday.name,
          type: "public",
          region: holiday.region,
        });
      });

      // Add custom holidays
      if (window.customHolidays && window.customHolidays[dateKey]) {
        yearlyHolidays[monthName].push({
          date: day,
          name: window.customHolidays[dateKey],
          type: "custom",
        });
      }
    }
  }

  // Filter holidays based on current filter
  const filteredHolidays = {};
  Object.keys(yearlyHolidays).forEach((monthName) => {
    filteredHolidays[monthName] = yearlyHolidays[monthName].filter(
      (holiday) => {
        if (currentYearlyFilter === "all") return true;
        if (currentYearlyFilter === "custom") return holiday.type === "custom";
        return (
          holiday.type === "public" && holiday.region === currentYearlyFilter
        );
      }
    );
  });

  // Render months with holidays
  const monthsWithHolidays = Object.keys(filteredHolidays).filter(
    (monthName) => filteredHolidays[monthName].length > 0
  );

  if (monthsWithHolidays.length === 0) {
    container.innerHTML =
      '<div style="color: #9ca3af; font-style: italic; text-align: center; padding: 20px;">No holidays found for selected filter</div>';
    return;
  }

  container.innerHTML = monthsWithHolidays
    .map((monthName) => {
      const holidays = filteredHolidays[monthName];

      return `
      <div class="holiday-month-section">
        <div class="holiday-month-title">${monthName}</div>
        ${holidays
          .map((holiday) => {
            const regionClass =
              holiday.type === "public"
                ? holiday.region.toLowerCase()
                : "custom";
            const regionText =
              holiday.type === "public" ? ` (${holiday.region})` : "";

            return `
            <div class="holiday-item-simple">
              <div class="holiday-region-dot ${regionClass}"></div>
              <span>${getOrdinal(holiday.date)} - ${
              holiday.name
            }${regionText}</span>
            </div>
          `;
          })
          .join("")}
      </div>
    `;
    })
    .join("");
}

function filterYearlyHolidays(filter) {
  currentYearlyFilter = filter;

  // Update filter tab states
  document.querySelectorAll(".holiday-filter-tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  document.querySelector(`[data-filter="${filter}"]`).classList.add("active");

  // Re-render yearly holidays
  renderYearlyHolidays();
}

// ===================================================================
// ANNUAL KPI CARDS
// ===================================================================

function renderAnnualKPICards() {
  const container = document.querySelector(".annual-kpi-cards-container");
  if (!container) return;

  const currentYear = new Date().getFullYear();
  const metrics = calculateAnnualMetricsSimple(currentYear);
  const teamAverage =
    teamMembers.length > 0
      ? (metrics.totalLeaveDays / teamMembers.length).toFixed(1)
      : 0;

  container.innerHTML = `
        <div class="collapsible-kpi-card trend" data-kpi="total-team">
            <div class="kpi-card-header" onclick="toggleKPICard('total-team')">
                <div class="kpi-header-left">
                    <span class="kpi-icon">📊</span>
                    <div class="kpi-header-info">
                        <div class="kpi-title">Total Team Days</div>
                        <div class="kpi-value">${metrics.totalLeaveDays}</div>
                    </div>
                </div>
                <span class="kpi-expand-arrow">▶</span>
            </div>
            <div class="kpi-card-content">
                <div class="kpi-detail">
                    <div class="kpi-description">Annual leave taken by entire team</div>
                </div>
            </div>
        </div>
        
        <div class="collapsible-kpi-card success" data-kpi="average-member">
            <div class="kpi-card-header" onclick="toggleKPICard('average-member')">
                <div class="kpi-header-left">
                    <span class="kpi-icon">📈</span>
                    <div class="kpi-header-info">
                        <div class="kpi-title">Average per Member</div>
                        <div class="kpi-value">${teamAverage}</div>
                    </div>
                </div>
                <span class="kpi-expand-arrow">▶</span>
            </div>
            <div class="kpi-card-content">
                <div class="kpi-detail">
                    <div class="kpi-description">Average annual leave days per team member</div>
                </div>
            </div>
        </div>
        
        <div class="collapsible-kpi-card warning" data-kpi="peak-month">
            <div class="kpi-card-header" onclick="toggleKPICard('peak-month')">
                <div class="kpi-header-left">
                    <span class="kpi-icon">🔥</span>
                    <div class="kpi-header-info">
                        <div class="kpi-title">Peak Month</div>
                        <div class="kpi-value">${metrics.peakMonth || "—"}</div>
                    </div>
                </div>
                <span class="kpi-expand-arrow">▶</span>
            </div>
            <div class="kpi-card-content">
                <div class="kpi-detail">
                    <div class="kpi-description">Month with highest team leave usage (${
                      metrics.peakMonthValue
                    } days total)</div>
                </div>
            </div>
        </div>
        
        <div class="collapsible-kpi-card info" data-kpi="most-active">
            <div class="kpi-card-header" onclick="toggleKPICard('most-active')">
                <div class="kpi-header-left">
                    <span class="kpi-icon">🎯</span>
                    <div class="kpi-header-info">
                        <div class="kpi-title">Most Active</div>
                        <div class="kpi-value">${
                          metrics.topLeaveTakers.length
                        }</div>
                    </div>
                </div>
                <span class="kpi-expand-arrow">▶</span>
            </div>
            <div class="kpi-card-content">
                <div class="kpi-detail">
                    <div class="kpi-member-list">${formatTopLeaveTakers(
                      metrics.topLeaveTakers
                    )}</div>
                    <div class="kpi-description">Team members with highest annual leave usage</div>
                </div>
            </div>
        </div>
        
        <div class="collapsible-kpi-card trend" data-kpi="least-active">
            <div class="kpi-card-header" onclick="toggleKPICard('least-active')">
                <div class="kpi-header-left">
                    <span class="kpi-icon">🟢</span>
                    <div class="kpi-header-info">
                        <div class="kpi-title">Least Active</div>
                        <div class="kpi-value">${
                          metrics.bottomLeaveTakers.length
                        }</div>
                    </div>
                </div>
                <span class="kpi-expand-arrow">▶</span>
            </div>
            <div class="kpi-card-content">
                <div class="kpi-detail">
                    <div class="kpi-member-list">${formatBottomLeaveTakers(
                      metrics.bottomLeaveTakers
                    )}</div>
                    <div class="kpi-description">Team members with lowest annual leave usage</div>
                </div>
            </div>
        </div>
        
        <div class="collapsible-kpi-card danger" data-kpi="busiest-months">
            <div class="kpi-card-header" onclick="toggleKPICard('busiest-months')">
                <div class="kpi-header-left">
                    <span class="kpi-icon">📅</span>
                    <div class="kpi-header-info">
                        <div class="kpi-title">Busiest Months</div>
                        <div class="kpi-value">${
                          metrics.topPeakMonths.length
                        }</div>
                    </div>
                </div>
                <span class="kpi-expand-arrow">▶</span>
            </div>
            <div class="kpi-card-content">
                <div class="kpi-detail">
                    <div class="kpi-member-list">${formatTopPeakMonths(
                      metrics.topPeakMonths
                    )}</div>
                    <div class="kpi-description">Months with highest team leave concentration</div>
                </div>
            </div>
        </div>
    `;
}

function calculateAnnualMetricsSimple(year) {
  const metrics = {
    totalLeaveDays: 0,
    memberStats: {},
    monthlyBreakdown: [],
    peakMonth: null,
    peakMonthValue: 0,
    topLeaveTakers: [],
    bottomLeaveTakers: [],
    topPeakMonths: [],
  };

  // Initialize member stats
  teamMembers.forEach((member) => {
    metrics.memberStats[member] = { totalDays: 0 };
  });

  // Calculate for each month
  for (let month = 0; month < 12; month++) {
    const monthDate = new Date(year, month, 1);
    const monthKey = getKey(monthDate);
    let monthTotal = 0;

    teamMembers.forEach((member) => {
      const memberData = (holidayData[member] || {})[monthKey] || {};
      const memberHolidays = calculateMemberHolidays(member, year, month);
      const memberMonthDays = memberHolidays.totalDays;

      metrics.memberStats[member].totalDays += memberMonthDays;
      monthTotal += memberMonthDays;
    });

    metrics.monthlyBreakdown.push({
      month: month,
      monthName: monthDate.toLocaleDateString("en-US", { month: "long" }),
      totalDays: monthTotal,
    });

    if (monthTotal > metrics.peakMonthValue) {
      metrics.peakMonthValue = monthTotal;
      metrics.peakMonth = monthDate.toLocaleDateString("en-US", {
        month: "long",
      });
    }
  }

  // Calculate totals
  metrics.totalLeaveDays = teamMembers.reduce((sum, member) => {
    return sum + metrics.memberStats[member].totalDays;
  }, 0);

  // Calculate top/bottom performers
  const memberLeaveList = teamMembers
    .map((member) => ({
      name: member,
      totalDays: metrics.memberStats[member].totalDays,
    }))
    .sort((a, b) => b.totalDays - a.totalDays);

  metrics.topLeaveTakers = memberLeaveList
    .filter((m) => m.totalDays > 0)
    .slice(0, 3);
  metrics.bottomLeaveTakers = memberLeaveList
    .filter((m) => m.totalDays > 0)
    .slice(-3)
    .reverse();
  metrics.topPeakMonths = metrics.monthlyBreakdown
    .filter((m) => m.totalDays > 0)
    .sort((a, b) => b.totalDays - a.totalDays)
    .slice(0, 3);

  return metrics;
}

function formatTopLeaveTakers(list) {
  if (list.length === 0) return '<span style="color:#bbb;">—</span>';
  return list
    .map(
      (member) =>
        `<span style="color:#1976d2;">${member.name}</span> <span style="color:#444; font-size:0.95em;">(${member.totalDays})</span>`
    )
    .join("<br>");
}

function formatBottomLeaveTakers(list) {
  if (list.length === 0) return '<span style="color:#bbb;">—</span>';
  return list
    .map(
      (member) =>
        `<span style="color:#22c55e;">${member.name}</span> <span style="color:#444; font-size:0.95em;">(${member.totalDays})</span>`
    )
    .join("<br>");
}

function formatTopPeakMonths(list) {
  if (list.length === 0) return '<span style="color:#bbb;">—</span>';
  return list
    .map(
      (month) =>
        `<span style="color:#f97316;">${month.monthName}</span> <span style="color:#444; font-size:0.95em;">(${month.totalDays})</span>`
    )
    .join("<br>");
}

function toggleAnnualDetail(detailId) {
  const element = document.getElementById(detailId + "Detail");
  if (element) {
    element.style.display = element.style.display === "none" ? "block" : "none";
  }
}

// Export functions
window.initializeSidePanel = initializeSidePanel;
window.updateSidePanelKPIs = updateSidePanelKPIs;
window.toggleSidePanel = toggleSidePanel;
window.toggleKPICard = toggleKPICard;
window.switchSidePanelTab = switchSidePanelTab;
window.renderMonthlyHolidays = renderMonthlyHolidays;
window.renderYearlyHolidays = renderYearlyHolidays;
window.filterYearlyHolidays = filterYearlyHolidays;
window.renderAnnualKPICards = renderAnnualKPICards;
window.toggleAnnualDetail = toggleAnnualDetail;
window.calculateAnnualMetricsSimple = calculateAnnualMetricsSimple;

