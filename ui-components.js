// ═══════════════════════════════════════════════════════════════════
// UI COMPONENTS MODULE
// Handles dropdowns, lists, admin forms, and UI interactions
// ═══════════════════════════════════════════════════════════════════

// Populate user dropdown
function populateDropdown() {
  if (!userSelect || !currentUserName) {
    return;
  }

  if (!teamMembers || teamMembers.length === 0) {
    return;
  }

  userSelect.innerHTML = "";
  teamMembers.forEach((member) => {
    const opt = document.createElement("option");
    opt.value = member;
    opt.textContent = member;
    userSelect.appendChild(opt);
  });

  if (teamMembers.length > 0) {
    currentUserName.textContent = teamMembers[0];
  }
}

// Render member list for admin
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
    btn.className = "remove-btn";
    btn.onclick = () => removeMember(name);
    li.appendChild(btn);
    listEl.appendChild(li);
  });
}

// Remove team member
function removeMember(name) {
  if (confirm(`Remove ${name} from the team?`)) {
    teamMembers = teamMembers.filter((m) => m !== name);
    updateUserColors();
    populateDropdown();
    renderMemberList();
    buildCalendar();
    saveTeamMembers();
  }
}

// Add new team member
function addMember() {
  const input = document.getElementById("newMemberName");
  if (!input) return;

  const name = input.value.trim();
  if (!name) {
    alert("Please enter a name.");
    return;
  }

  if (teamMembers.includes(name)) {
    alert("Member already exists.");
    return;
  }

  teamMembers.push(name);
  updateUserColors();
  populateDropdown();
  renderMemberList();
  buildCalendar();
  saveTeamMembers();
  input.value = "";
}

// Advanced member management
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
  updateUserColors();
  populateDropdown();
  renderCurrentMembersList();
  populateSpecialDateMemberDropdown();
  updateMonthlyView();
  buildCalendar();
  renderGanttLegendMembers();
  input.value = "";
  alert(`${name} has been added to the team!`);

  if (typeof saveToGoogleSheets === "function") {
    saveToGoogleSheets("teamMembers", teamMembers);
  }
}

// Remove member (advanced)
function removeMemberAdvanced(name) {
  if (confirm(`Are you sure you want to remove ${name} from the team?`)) {
    teamMembers = teamMembers.filter((m) => m !== name);

    delete holidays[name];
    delete birthdays[name];
    delete anniversaries[name];

    updateUserColors();
    populateDropdown();
    renderCurrentMembersList();
    populateSpecialDateMemberDropdown();
    updateMonthlyView();
    buildCalendar();
    renderGanttLegendMembers();

    localStorage.setItem("holidays", JSON.stringify(holidays));
    localStorage.setItem("birthdays", JSON.stringify(birthdays));
    localStorage.setItem("anniversaries", JSON.stringify(anniversaries));

    if (typeof saveToGoogleSheets === "function") {
      saveToGoogleSheets("teamMembers", teamMembers);
      saveToGoogleSheets("holidays", holidays);
      saveToGoogleSheets("specialDates", { birthdays, anniversaries });
    }

    alert(`${name} has been removed from the team.`);
  }
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

// Tab switching functionality
function switchTab(id) {
  document
    .querySelectorAll(".tab-content")
    .forEach((el) => el.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");

  document
    .querySelectorAll(".tab")
    .forEach((el) => el.classList.remove("active"));

  if (id === "calendarTab") {
    document.getElementById("tab-calendar").classList.add("active");
  } else if (id === "dashboardTab") {
    document.getElementById("tab-dashboard").classList.add("active");

    if (!window.currentDashboardView) {
      window.currentDashboardView =
        window.DASHBOARD_CONFIG?.DEFAULT_VIEW || "monthly";
    }

    if (window.currentDashboardView === "monthly") {
      populateMonthFilter();
    } else {
      populateYearFilter();
    }

    renderDashboardTab();

    const filterContainer = document.getElementById(
      "annualMemberFilterContainer"
    );
    if (filterContainer) {
      filterContainer.style.display =
        window.currentDashboardView === "annual" ? "block" : "none";
    }
  } else if (id === "adminTab") {
    document.getElementById("tab-admin").classList.add("active");

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

      if (typeof initializeHolidaysMode !== "undefined") {
        initializeHolidaysMode();
      }
    }, 100);
  }
}

// Dashboard view switching
function switchDashboardView(viewType) {
  window.selectedAnnualMember = null;

  const dropdown = document.getElementById("annualMemberFilter");
  if (dropdown) {
    dropdown.value = "";
  }

  const monthlyView = document.getElementById("monthlyDashboardView");
  const annualView = document.getElementById("annualDashboardView");
  const monthlyBtn = document.getElementById("monthlyViewBtn");
  const annualBtn = document.getElementById("annualViewBtn");

  if (!monthlyView || !annualView || !monthlyBtn || !annualBtn) {
    return;
  }

  monthlyBtn.classList.remove("active");
  annualBtn.classList.remove("active");
  monthlyView.classList.remove("active");
  annualView.classList.remove("active");
  monthlyView.classList.add("hidden");
  annualView.classList.add("hidden");

  if (viewType === "annual") {
    annualView.classList.add("active");
    annualView.classList.remove("hidden");
    annualBtn.classList.add("active");
    window.currentDashboardView = "annual";

    const dashboardTitle = document.querySelector(".dashboard-header h2");
    if (dashboardTitle) {
      dashboardTitle.textContent = "📊 Annual Absence Dashboard";
    }

    populateYearFilter();
    renderAnnualDashboard();
  } else {
    monthlyView.classList.add("active");
    monthlyView.classList.remove("hidden");
    monthlyBtn.classList.add("active");
    window.currentDashboardView =
      window.DASHBOARD_CONFIG?.DEFAULT_VIEW || "monthly";

    const dashboardTitle = document.querySelector(".dashboard-header h2");
    if (dashboardTitle) {
      dashboardTitle.textContent = "📅 Monthly Absence Dashboard";
    }

    populateMonthFilter();
    renderDashboardTab();
  }
}

// Month filter population
function populateMonthFilter() {
  const monthFilter = document.getElementById("monthFilter");
  if (!monthFilter) return;

  monthFilter.innerHTML = "";

  const currentViewYear = window.viewDate
    ? window.viewDate.getFullYear()
    : new Date().getFullYear();
  const currentViewMonth = window.viewDate
    ? window.viewDate.getMonth()
    : new Date().getMonth();

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

    if (month === currentViewMonth) {
      option.selected = true;
    }

    monthFilter.appendChild(option);
  }
}

// Year filter population
function populateYearFilter() {
  const monthFilter = document.getElementById("monthFilter");
  if (!monthFilter) return;

  monthFilter.innerHTML = "";
  const currentYear = new Date().getFullYear();

  for (let i = 0; i < 5; i++) {
    const year = currentYear - i;
    const option = document.createElement("option");
    option.value = year.toString();
    option.textContent = year.toString();

    if (i === 0) {
      option.selected = true;
    }

    monthFilter.appendChild(option);
  }
}

// Month/Year filter change handler
function onMonthFilterChange() {
  const monthFilter = document.getElementById("monthFilter");
  if (!monthFilter) return;

  const selectedValue = monthFilter.value;
  if (!selectedValue) return;

  if (window.currentDashboardView === "monthly") {
    const [year, month] = selectedValue.split("-").map(Number);
    window.viewDate = new Date(year, month - 1, 1);

    renderDashboardTab();
    updateMetrics();
    updateNewPanelMetrics();
    updateNewHolidayList();
    updateQuickStatsPills();
    updateSpecialDatesKPI();
  } else if (window.currentDashboardView === "annual") {
    const selectedYear = parseInt(selectedValue);
    renderAnnualDashboard(selectedYear);
  }
}

// Holiday list management
function updateHolidayList() {
  const listEl = document.getElementById("holidayList");
  if (!listEl) return;

  listEl.innerHTML = "";
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleDateString("en-US", { month: "long" });

  Object.entries(publicHolidays).forEach(([date, holidays]) => {
    const [y, m, d] = date.split("-").map(Number);
    if (y === year && m === month + 1) {
      holidays.forEach((info) => {
        const item = document.createElement("div");
        item.className = "holiday-item";
        item.innerHTML = `
          <div class="holiday-icon holiday-${
            info.region === "UK"
              ? "uk"
              : info.region === "US"
              ? "us"
              : info.region === "IN"
              ? "in"
              : "custom"
          }">
            ${
              info.region === "UK"
                ? "🇬🇧"
                : info.region === "US"
                ? "🇺🇸"
                : info.region === "IN"
                ? "🇮🇳"
                : "⭐"
            }
          </div>
          <span>${getOrdinal(d)} ${monthName} - ${info.name}</span>
        `;
        listEl.appendChild(item);
      });
    }
  });

  Object.entries(customHolidays).forEach(([date, name]) => {
    const [y, m, d] = date.split("-").map(Number);
    if (y === year && m === month + 1) {
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

// Accordion panel management
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

function renderCustomHolidayList() {
  const listEl = document.getElementById("customHolidayList");
  if (!listEl) {
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

function renderSwiperMembers() {
  const el = document.getElementById("swiperWrapper");
  if (!el) return;

  const monthKey = getKey(viewDate);

  const cards = teamMembers.map((memberName) => {
    const memberData = (holidays[memberName] || {})[monthKey] || {};
    const leaveDays = calculateLeaveDays(memberData);
    const role = getMemberRole(memberName);
    const initials = memberName
      .split(" ")
      .map((n) => n[0])
      .join("");

    const hasPhoto = !!(memberProfiles && memberProfiles[memberName]?.hasPhoto);
    const avatarPath = getMemberAvatarPath(memberName);

    const avatarHTML = hasPhoto
      ? `<img src="${avatarPath}" alt="${memberName}" loading="lazy" />`
      : `<div class="member-initials">${initials}</div>`;

    return `
      <div class="swiper-slide">
        ${avatarHTML}
        <div class="card-title">${memberName}</div>
        <div class="card-role">${role}</div>
        <div class="card-metrics">${leaveDays} day${
      leaveDays === 1 ? "" : "s"
    } leave</div>
      </div>`;
  });

  el.innerHTML = cards.join("");
}

// Make functions globally accessible
window.populateDropdown = populateDropdown;
window.renderMemberList = renderMemberList;
window.removeMember = removeMember;
window.addMember = addMember;
window.addMemberAdvanced = addMemberAdvanced;
window.removeMemberAdvanced = removeMemberAdvanced;
window.renderCurrentMembersList = renderCurrentMembersList;
window.switchTab = switchTab;
window.switchDashboardView = switchDashboardView;
window.populateMonthFilter = populateMonthFilter;
window.populateYearFilter = populateYearFilter;
window.onMonthFilterChange = onMonthFilterChange;
window.updateHolidayList = updateHolidayList;
window.toggleMainPanel = toggleMainPanel;
window.toggleAccordion = toggleAccordion;
window.renderCustomHolidayList = renderCustomHolidayList;
window.renderSwiperMembers = renderSwiperMembers;
