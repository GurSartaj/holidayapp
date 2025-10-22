// ===================================================================
// COMPLETE DASHBOARD MODULE - WITH SEPARATE YEAR/MONTH FILTERS
// Based on your working code with separate filter functionality added
// ===================================================================

// Global variables for separate filters
let selectedDashboardYear = new Date().getFullYear();
let selectedDashboardMonth = new Date().getMonth();
let currentDashboardView = "monthly";

function updateDashboard() {
  updateMetrics();
  updateTeamStatus();
}

function updateMetrics() {
  const year = selectedDashboardYear;
  const month = selectedDashboardMonth;

  // Calculate total leave days for selected month/year
  let totalLeaveDays = 0;
  teamMembers.forEach((member) => {
    const memberData = calculateMemberHolidays(member, year, month);
    totalLeaveDays += memberData.totalDays;
  });

  // Calculate availability percentage
  const workingDays = getWorkingDaysInMonth(year, month);
  const totalWorkingCapacity = workingDays * teamMembers.length;
  const availabilityPercent =
    totalWorkingCapacity > 0
      ? Math.round(
          ((totalWorkingCapacity - totalLeaveDays) / totalWorkingCapacity) * 100
        )
      : 100;

  // Update metric displays
  updateMetricValue("totalLeave", Math.round(totalLeaveDays * 10) / 10);
  updateMetricValue("teamSize", teamMembers.length);
  updateMetricValue("availability", availabilityPercent + "%");
}

function updateMetricValue(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function updateTeamStatus() {
  const teamLeaveList = document.getElementById("teamLeaveList");
  if (!teamLeaveList) return;

  const year = selectedDashboardYear;
  const month = selectedDashboardMonth;

  // Clear existing content
  teamLeaveList.innerHTML = "";

  // Generate team status
  const teamStatus = teamMembers.map((member) => {
    const memberData = calculateMemberHolidays(member, year, month);
    return {
      name: member,
      totalDays: memberData.totalDays,
      holidays: memberData.holidayDates,
    };
  });

  // Sort by most leave days first
  teamStatus.sort((a, b) => b.totalDays - a.totalDays);

  if (teamStatus.every((member) => member.totalDays === 0)) {
    teamLeaveList.innerHTML =
      '<p class="text-center">No holidays scheduled for this month</p>';
    return;
  }

  teamStatus.forEach((member) => {
    if (member.totalDays > 0) {
      const memberElement = createTeamStatusElement(member);
      teamLeaveList.appendChild(memberElement);
    }
  });
}

function createTeamStatusElement(member) {
  const element = document.createElement("div");
  element.className = "team-member-status";

  const nameElement = document.createElement("div");
  nameElement.className = "member-name";
  nameElement.textContent = member.name;

  const leaveDaysElement = document.createElement("div");
  leaveDaysElement.className = "leave-days";
  leaveDaysElement.textContent = `${member.totalDays} day${
    member.totalDays !== 1 ? "s" : ""
  }`;

  element.appendChild(nameElement);
  element.appendChild(leaveDaysElement);

  return element;
}

// Calculate leave days function
function calculateLeaveDays(monthData) {
  if (!monthData || typeof monthData !== "object") return 0;

  let totalDays = 0;
  Object.values(monthData).forEach((leaveData) => {
    // Parse "type|category" format - extract just the type
    const leaveType =
      typeof leaveData === "string" ? leaveData.split("|")[0] : leaveData;

    if (leaveType === "full") {
      totalDays += 1;
    } else if (leaveType === "morning" || leaveType === "afternoon") {
      totalDays += 0.5;
    }
  });

  return totalDays;
}
// ===================================================================
// SEPARATE YEAR AND MONTH FILTER FUNCTIONS
// ===================================================================

function populateYearFilter() {
  const yearFilter = document.getElementById("yearFilter");
  if (!yearFilter) return;

  yearFilter.innerHTML = "";
  const currentYear = new Date().getFullYear();

  // Generate years from 2020 to current year + 2
  for (let year = 2020; year <= currentYear + 2; year++) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;

    if (year === selectedDashboardYear) {
      option.selected = true;
    }

    yearFilter.appendChild(option);
  }

  // Remove existing event listeners
  const newYearFilter = yearFilter.cloneNode(true);
  yearFilter.parentNode.replaceChild(newYearFilter, yearFilter);

  // Add event listener for year change
  newYearFilter.addEventListener("change", function () {
    selectedDashboardYear = parseInt(this.value);
    // Update currentDate for compatibility with existing functions
    currentDate = new Date(selectedDashboardYear, selectedDashboardMonth, 1);
    updateFilterDisplay();
    updateDashboard();
    renderAllDashboardCharts();
  });
}

function populateMonthFilter() {
  const monthFilter = document.getElementById("monthFilter");
  if (!monthFilter) return;

  monthFilter.innerHTML = "";

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  months.forEach((monthName, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = monthName;

    if (index === selectedDashboardMonth) {
      option.selected = true;
    }

    monthFilter.appendChild(option);
  });

  // Remove existing event listeners
  const newMonthFilter = monthFilter.cloneNode(true);
  monthFilter.parentNode.replaceChild(newMonthFilter, monthFilter);

  // Add event listener for month change
  newMonthFilter.addEventListener("change", function () {
    selectedDashboardMonth = parseInt(this.value);
    // Update currentDate for compatibility with existing functions
    currentDate = new Date(selectedDashboardYear, selectedDashboardMonth, 1);
    updateFilterDisplay();
    updateDashboard();
    renderAllDashboardCharts();
  });
}

function updateFilterDisplay() {
  const filterDisplay = document.getElementById("currentFilterDisplay");
  if (filterDisplay) {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    filterDisplay.textContent = `${monthNames[selectedDashboardMonth]} ${selectedDashboardYear}`;
  }
}

function initializeDashboardFilters() {
  // Initialize with current date
  const now = new Date();
  selectedDashboardYear = now.getFullYear();
  selectedDashboardMonth = now.getMonth();
  currentDate = new Date(selectedDashboardYear, selectedDashboardMonth, 1);

  // Set up both filters
  populateYearFilter();
  populateMonthFilter();
  updateFilterDisplay();

  // Force the dropdowns to show current values
  const yearFilter = document.getElementById("yearFilter");
  const monthFilter = document.getElementById("monthFilter");

  if (yearFilter) {
    yearFilter.value = selectedDashboardYear;
  }

  if (monthFilter) {
    monthFilter.value = selectedDashboardMonth;
  }
}

// ===================================================================
// DASHBOARD INITIALIZATION AND VIEW SWITCHING
// ===================================================================

// Initialize dashboard when tab is switched
function initializeDashboard() {
  console.log("Initializing dashboard...");
  initializeDashboardFilters();
  switchDashboardView("monthly");
}

// Main dashboard view switcher - both filters always visible
function switchDashboardView(view) {
  // Update button states
  document.querySelectorAll(".toggle-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  if (view === "monthly") {
    const monthlyBtn = document.getElementById("monthlyToggle");
    if (monthlyBtn) monthlyBtn.classList.add("active");
    currentDashboardView = "monthly";
  } else {
    const annualBtn = document.getElementById("annualToggle");
    if (annualBtn) annualBtn.classList.add("active");
    currentDashboardView = "annual";
  }

  // Update content visibility classes
  const container = document.querySelector(".dashboard-content");
  if (container) {
    container.className = `dashboard-content view-${view}`;
  }

  // Render all charts
  renderAllDashboardCharts();
}

// Render all 4 charts
function renderAllDashboardCharts() {
  console.log("Rendering all dashboard charts...");

  // Monthly Focus Charts (Left side)
  renderMonthlyLeaveDaysByMember();
  renderMonthlyDistribution();

  // Annual Focus Charts (Right side)
  renderTwelveMonthTrend();
  renderAnnualLeaveByMember();
}

// ===================================================================
// CHART RENDERING FUNCTIONS
// ===================================================================

// CHART 1: Monthly Leave Days by Member (for selected month/year)
function renderMonthlyLeaveDaysByMember() {
  const ctx = document.getElementById("cumulativeTrendChart");
  if (!ctx) {
    console.log("Canvas element cumulativeTrendChart not found");
    return;
  }

  const context = ctx.getContext("2d");
  const monthKey = `${selectedDashboardYear}-${String(
    selectedDashboardMonth + 1
  ).padStart(2, "0")}`;

  const memberLeaveData = teamMembers
    .map((member) => ({
      name: member,
      days: calculateLeaveDays((holidayData[member] || {})[monthKey] || {}),
      color: `hsl(${
        (teamMembers.indexOf(member) * 360) / teamMembers.length
      }, 70%, 50%)`,
    }))
    .filter((member) => member.days > 0)
    .sort((a, b) => b.days - a.days);

  // Destroy existing chart
  if (window.monthlyMemberChart) {
    window.monthlyMemberChart.destroy();
  }

  // If no one has leave, clear the chart
  if (memberLeaveData.length === 0) {
    window.monthlyMemberChart = null;
    console.log("No leave data for selected month");
    return;
  }

  const labels = memberLeaveData.map((m) => m.name);
  const data = memberLeaveData.map((m) => m.days);
  const backgroundColors = memberLeaveData.map((m) => m.color);

  window.monthlyMemberChart = new Chart(context, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Days Off",
          data: data,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors,
          borderWidth: 2,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          stepSize: 1,
          title: { display: true, text: "Days Off" },
        },
        x: {
          title: { display: true, text: "Members on Leave" },
          ticks: { maxRotation: 45, minRotation: 0 },
        },
      },
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `Leave Days - ${new Date(
            selectedDashboardYear,
            selectedDashboardMonth
          ).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const days = context.parsed.y;
              return `${context.label}: ${days} day${days !== 1 ? "s" : ""}`;
            },
          },
        },
      },
    },
  });
}

// CHART 2: Monthly Distribution (all 12 months for selected year)
function renderMonthlyDistribution() {
  const canvas = document.getElementById("annualLeavePatternChart");
  if (!canvas) {
    console.log("Canvas element annualLeavePatternChart not found");
    return;
  }

  const ctx = canvas.getContext("2d");

  if (window.monthlyDistributionChart) {
    window.monthlyDistributionChart.destroy();
  }

  // Calculate monthly totals for selected year
  const monthlyTotals = [];
  const monthLabels = [];

  for (let month = 0; month < 12; month++) {
    const date = new Date(selectedDashboardYear, month, 1);
    const monthKey = `${selectedDashboardYear}-${String(month + 1).padStart(
      2,
      "0"
    )}`;
    const monthName = date.toLocaleDateString("en-US", { month: "short" });

    let monthTotal = 0;
    teamMembers.forEach((member) => {
      const memberData = (holidayData[member] || {})[monthKey] || {};
      monthTotal += calculateLeaveDays(memberData);
    });

    monthlyTotals.push(monthTotal);
    monthLabels.push(monthName);
  }

  // Highlight the selected month
  const backgroundColors = monthlyTotals.map((_, index) =>
    index === selectedDashboardMonth ? "#667eea" : "#3b82f6"
  );

  window.monthlyDistributionChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: monthLabels,
      datasets: [
        {
          label: "Monthly Leave Days",
          data: monthlyTotals,
          backgroundColor: backgroundColors,
          borderColor: "#2563eb",
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `Monthly Distribution - ${selectedDashboardYear}`,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "Total Team Days" },
        },
        x: { title: { display: true, text: "Month" } },
      },
    },
  });
}

// CHART 3: 12-Month Team Leave Trend (Line chart for selected year)
function renderTwelveMonthTrend() {
  const canvas = document.getElementById("annualMonthlyTrendChart");
  if (!canvas) {
    console.log("Canvas element annualMonthlyTrendChart not found");
    return;
  }

  const ctx = canvas.getContext("2d");

  // Proper chart cleanup
  if (
    window.annualMonthlyTrendChart &&
    typeof window.annualMonthlyTrendChart.destroy === "function"
  ) {
    window.annualMonthlyTrendChart.destroy();
  }

  // Generate 12 months of data for selected year
  const monthLabels = [];
  for (let month = 0; month < 12; month++) {
    const date = new Date(selectedDashboardYear, month, 1);
    monthLabels.push(date.toLocaleDateString("en-US", { month: "short" }));
  }

  // Create dataset for each team member
  const datasets = teamMembers.map((member, index) => {
    const memberData = [];

    for (let month = 0; month < 12; month++) {
      const monthKey = `${selectedDashboardYear}-${String(month + 1).padStart(
        2,
        "0"
      )}`;
      const memberMonthData = (holidayData[member] || {})[monthKey] || {};
      const days = calculateLeaveDays(memberMonthData);
      memberData.push(days);
    }

    const memberColor = `hsl(${(index * 360) / teamMembers.length}, 70%, 50%)`;

    return {
      label: member,
      data: memberData,
      borderColor: memberColor,
      backgroundColor: memberColor.replace("50%", "30%"),
      fill: false,
      tension: 0.25,
      pointRadius: 3,
      pointHoverRadius: 5,
      borderWidth: 2,
    };
  });

  window.annualMonthlyTrendChart = new Chart(ctx, {
    type: "line",
    data: { labels: monthLabels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: { boxWidth: 18, font: { size: 11 } },
        },
        title: {
          display: true,
          text: `Team Leave Trend - ${selectedDashboardYear}`,
        },
        tooltip: { mode: "index", intersect: false },
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "Days Off" } },
        x: { title: { display: true, text: "Month" } },
      },
    },
  });
}

// CHART 4: Annual Leave by Member (Bar chart for selected year)
function renderAnnualLeaveByMember() {
  const canvas = document.getElementById("annualMemberComparisonChart");
  if (!canvas) {
    console.log("Canvas element annualMemberComparisonChart not found");
    return;
  }

  const ctx = canvas.getContext("2d");

  // Proper chart cleanup
  if (
    window.annualMemberComparisonChart &&
    typeof window.annualMemberComparisonChart.destroy === "function"
  ) {
    window.annualMemberComparisonChart.destroy();
  }

  // Calculate annual totals for each member for selected year
  const memberData = teamMembers.map((member) => {
    let annualTotal = 0;

    for (let month = 0; month < 12; month++) {
      const monthKey = `${selectedDashboardYear}-${String(month + 1).padStart(
        2,
        "0"
      )}`;
      const memberMonthData = (holidayData[member] || {})[monthKey] || {};
      annualTotal += calculateLeaveDays(memberMonthData);
    }

    return annualTotal;
  });

  const backgroundColors = teamMembers.map(
    (member, index) => `hsl(${(index * 360) / teamMembers.length}, 70%, 50%)`
  );

  window.annualMemberComparisonChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: teamMembers,
      datasets: [
        {
          label: "Annual Leave Days",
          data: memberData,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors,
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `Annual Leave by Member - ${selectedDashboardYear}`,
        },
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "Days Off" } },
        x: {
          ticks: { maxRotation: 45 },
          title: { display: true, text: "Team Member" },
        },
      },
    },
  });
}

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

function populateMonthFilter_old() {
  // Keeping your old function for compatibility - not used
  const monthFilter = document.getElementById("monthFilter");
  if (!monthFilter) return;
  // ... (your old implementation)
}

function populateYearFilter_old() {
  // Keeping your old function for compatibility - not used
  const yearFilter = document.getElementById("yearFilter");
  if (!yearFilter) return;
  // ... (your old implementation)
}

// Filter yearly holidays function for side panel compatibility
function filterYearlyHolidays(filter) {
  console.log("Filtering yearly holidays:", filter);

  // Update filter tab states
  document.querySelectorAll(".holiday-filter-tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  const activeTab = document.querySelector(`[data-filter="${filter}"]`);
  if (activeTab) activeTab.classList.add("active");

  // Re-render yearly holidays if the function exists
  if (typeof renderYearlyHolidays === "function") {
    renderYearlyHolidays();
  }
}

// ===================================================================
// EXPORTS
// ===================================================================

// Export all functions
window.initializeDashboard = initializeDashboard;
window.switchDashboardView = switchDashboardView;
window.updateDashboard = updateDashboard;
window.calculateLeaveDays = calculateLeaveDays;
window.populateMonthFilter = populateMonthFilter;
window.populateYearFilter = populateYearFilter;
window.filterYearlyHolidays = filterYearlyHolidays;
window.renderAllDashboardCharts = renderAllDashboardCharts;
window.selectedDashboardYear = selectedDashboardYear;
window.selectedDashboardMonth = selectedDashboardMonth;
window.updateFilterDisplay = updateFilterDisplay;
window.initializeDashboardFilters = initializeDashboardFilters;
