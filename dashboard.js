// ═══════════════════════════════════════════════════════════════════
// DASHBOARD MODULE
// Handles charts, metrics, KPIs, and dashboard rendering
// ═══════════════════════════════════════════════════════════════════

// Chart instances for cleanup
let leaveShareChart;
let availabilityChart;
let riskChart;

// Dashboard tab rendering
function renderDashboardTab() {
  if (!viewDate) return;

  updateMetrics();
  renderCharts();
  updateUserStats();
}

function renderCharts() {
  renderAvailabilityChart();
  renderAtRiskDaysChart();
  renderMultiMemberLeaveTrendChart();
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

  // — MEMBER STATS TABLE (side panel) - FIXED XSS VULNERABILITIES —
  const takenLeave = counts.filter((x) => x.days > 0);
  const minLeave = takenLeave.length
    ? Math.min(...takenLeave.map((x) => x.days))
    : 0;
  const minMembers = takenLeave
    .filter((x) => x.days === minLeave)
    .map((x) => x.name);
  const noneOff = counts.filter((x) => x.days === 0).length;
  const noneOffNames = counts.filter((x) => x.days === 0).map((x) => x.name);

  // FIX #1: Top Members (XSS-safe)
  const topMembersValueEl = document.getElementById("topMembersValue");
  if (topMembersValueEl && counts.length > 0) {
    topMembersValueEl.innerHTML = ""; // Clear first
    const nameDiv = document.createElement("div");
    nameDiv.textContent = counts[0].name; // XSS-safe
    topMembersValueEl.appendChild(nameDiv);
    topMembersValueEl.appendChild(document.createElement("br"));
    const spanEl = document.createElement("span");
    spanEl.style.fontSize = "0.92em";
    spanEl.style.color = "#555";
    spanEl.textContent = `(${counts[0].days} days)`;
    topMembersValueEl.appendChild(spanEl);
  }

  // FIX #2: Least Members (XSS-safe)
  const leastMembersValueEl = document.getElementById("leastMembersValue");
  if (leastMembersValueEl) {
    if (takenLeave.length) {
      leastMembersValueEl.innerHTML = ""; // Clear first
      const namesDiv = document.createElement("div");
      namesDiv.textContent = minMembers.join(", "); // XSS-safe
      leastMembersValueEl.appendChild(namesDiv);
      leastMembersValueEl.appendChild(document.createElement("br"));
      const spanEl = document.createElement("span");
      spanEl.style.fontSize = "0.92em";
      spanEl.style.color = "#555";
      spanEl.textContent = `(${minLeave} day${minLeave !== 1 ? "s" : ""})`;
      leastMembersValueEl.appendChild(spanEl);
    } else {
      leastMembersValueEl.textContent = "-";
    }
  }

  // FIX #3: No Leave Members (XSS-safe)
  const noLeaveMembersValueEl = document.getElementById("noLeaveMembersValue");
  if (noLeaveMembersValueEl) {
    noLeaveMembersValueEl.innerHTML = ""; // Clear first
    const countDiv = document.createElement("div");
    countDiv.textContent = `${noneOff} member${noneOff === 1 ? "" : "s"}`;
    noLeaveMembersValueEl.appendChild(countDiv);
    noLeaveMembersValueEl.appendChild(document.createElement("br"));
    const spanEl = document.createElement("span");
    spanEl.style.fontSize = "0.92em";
    spanEl.style.color = "#555";
    spanEl.textContent = noneOffNames.length
      ? formatMemberList(noneOffNames)
      : "-";
    noLeaveMembersValueEl.appendChild(spanEl);
  }

  // FIX #4: On Leave Today (XSS-safe)
  const onLeaveTodayValueEl = document.getElementById("onLeaveTodayValue");
  if (onLeaveTodayValueEl) {
    onLeaveTodayValueEl.innerHTML = ""; // Clear first
    const countDiv = document.createElement("div");
    countDiv.textContent = `${onLeave} member${onLeave === 1 ? "" : "s"}`;
    onLeaveTodayValueEl.appendChild(countDiv);
    onLeaveTodayValueEl.appendChild(document.createElement("br"));
    const spanEl = document.createElement("span");
    spanEl.style.fontSize = "0.92em";
    spanEl.style.color = "#555";
    spanEl.textContent = onLeaveNames;
    onLeaveTodayValueEl.appendChild(spanEl);
  }

  // — NEW KPI CARDS: Dashboard-Only (bottom row) - FIXED XSS —
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

    // FIX #5: Upcoming Names (XSS-safe)
    const upcomingNamesEl = document.getElementById("kpi-upcoming-leave-names");
    if (upcomingNamesEl) {
      if (upcomingMembers.length) {
        upcomingNamesEl.innerHTML = ""; // Clear first
        const containerDiv = document.createElement("div");
        containerDiv.style.fontSize = "0.96em";
        containerDiv.style.lineHeight = "1.6";
        containerDiv.style.textAlign = "center";
        containerDiv.style.wordBreak = "break-word";

        upcomingMembers.forEach((member, index) => {
          if (index > 0) {
            containerDiv.appendChild(document.createTextNode(", "));
          }
          const nameSpan = document.createElement("span");
          nameSpan.style.color = "#1976d2";
          nameSpan.textContent = member.name; // XSS-safe
          containerDiv.appendChild(nameSpan);

          const countSpan = document.createElement("span");
          countSpan.style.color = "#444";
          countSpan.style.fontSize = "0.95em";
          countSpan.textContent = ` (${member.count})`;
          containerDiv.appendChild(countSpan);
        });

        upcomingNamesEl.appendChild(containerDiv);
      } else {
        upcomingNamesEl.innerHTML = "<span style='color:#bbb;'>–</span>";
      }
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

      // FIX #6: Top Leave Names (XSS-safe)
      if (sorted.length) {
        topLeaveNamesEl.innerHTML = ""; // Clear first
        sorted.forEach((member, index) => {
          if (index > 0) {
            topLeaveNamesEl.appendChild(document.createElement("br"));
          }
          const nameSpan = document.createElement("span");
          nameSpan.style.color = "#1976d2";
          nameSpan.textContent = member.name; // XSS-safe
          topLeaveNamesEl.appendChild(nameSpan);

          const countSpan = document.createElement("span");
          countSpan.style.color = "#444";
          countSpan.style.fontSize = "0.95em";
          countSpan.textContent = ` (${member.days})`;
          topLeaveNamesEl.appendChild(countSpan);
        });
      } else {
        topLeaveNamesEl.innerHTML = "<span style='color:#bbb;'>–</span>";
      }
    }

    // FIX #7: Month Leave Members (XSS-safe)
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

      // Names, days, dates - XSS-safe
      if (monthLeaveMembers.length) {
        monthLeaveNamesEl.innerHTML = ""; // Clear first
        const containerDiv = document.createElement("div");
        containerDiv.style.fontSize = "0.96em";
        containerDiv.style.lineHeight = "1.6";
        containerDiv.style.textAlign = "center";
        containerDiv.style.wordBreak = "break-word";

        monthLeaveMembers.forEach((member, index) => {
          if (index > 0) {
            containerDiv.appendChild(document.createTextNode(", "));
          }
          const nameSpan = document.createElement("span");
          nameSpan.style.color = "#1976d2";
          nameSpan.textContent = member.name; // XSS-safe
          containerDiv.appendChild(nameSpan);

          const countSpan = document.createElement("span");
          countSpan.style.color = "#444";
          countSpan.style.fontSize = "0.95em";
          countSpan.textContent = ` (${member.days})`;
          containerDiv.appendChild(countSpan);
        });

        monthLeaveNamesEl.appendChild(containerDiv);
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

// Daily availability bar chart
function renderAvailabilityChart() {
  const ctx = document.getElementById("availabilityChart");
  if (!ctx) return;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthKey = getKey(viewDate);

  const labels = [];
  const availData = [];

  for (let day = 1; day <= daysInMonth; day++) {
    labels.push(String(day));

    const offCount = teamMembers.filter((member) =>
      hasLeaveOnDay(member, monthKey, day)
    ).length;

    availData.push(teamMembers.length - offCount);
  }

  const existingChart = Chart.getChart(ctx);
  if (existingChart) {
    existingChart.destroy();
  }

  window.availabilityChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Available",
          data: availData,
          backgroundColor: window.CHART_CONFIG?.COLORS?.SUCCESS || "#22c55e",
          borderColor: window.CHART_CONFIG?.COLORS?.GREEN || "#16a34a",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: teamMembers.length,
          title: { display: true, text: "Team Members Available" },
        },
        x: { title: { display: true, text: "Day of Month" } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              const available = context.parsed.y;
              const total = teamMembers.length;
              const percentage = Math.round((available / total) * 100);
              return `${available}/${total} available (${percentage}%)`;
            },
          },
        },
      },
    },
  });
}

// At-risk days chart
function renderAtRiskDaysChart() {
  const ctx = document.getElementById("atRiskChart");
  if (!ctx) return;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthKey = getKey(viewDate);
  const threshold = window.UI_CONFIG?.AVAILABILITY_THRESHOLD || 3;

  const labels = [];
  const data = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const offCount = teamMembers.filter((member) =>
      hasLeaveOnDay(member, monthKey, day)
    ).length;

    const available = teamMembers.length - offCount;

    if (available < threshold) {
      const date = new Date(year, month, day);
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        // Skip weekends
        labels.push(String(day));
        data.push(available);
      }
    }
  }

  const existingChart = Chart.getChart(ctx);
  if (existingChart) {
    existingChart.destroy();
  }

  window.riskChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: window.CHART_CONFIG?.COLORS?.DANGER || "#ef4444",
          borderColor: window.CHART_CONFIG?.COLORS?.RED || "#dc2626",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: teamMembers.length,
          title: { display: true, text: "Available Team Members" },
        },
        x: { title: { display: true, text: "At-Risk Days" } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              const available = context.parsed.y;
              return `Only ${available} available (below threshold)`;
            },
          },
        },
      },
    },
  });
}

// Multi-member trend chart (6-month view)
function renderMultiMemberLeaveTrendChart() {
  const ctx = document.getElementById("multiMemberTrendChart");
  if (!ctx) return;

  const currentDate = new Date(viewDate);
  const labels = [];
  const datasets = [];

  // Generate 6 months of data
  for (let i = 5; i >= 0; i--) {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - i,
      1
    );
    labels.push(
      date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
    );
  }

  // Create dataset for each team member
  teamMembers.forEach((member, index) => {
    const memberData = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      );
      const monthKey = getKey(date);
      const memberMonthData = (holidays[member] || {})[monthKey] || {};
      const days = calculateLeaveDays(memberMonthData);
      memberData.push(days);
    }

    datasets.push({
      label: member,
      data: memberData,
      borderColor: userColors[member],
      backgroundColor: userColors[member] + "20",
      borderWidth: 2,
      fill: false,
      tension: 0.1,
    });
  });

  const existingChart = Chart.getChart(ctx);
  if (existingChart) {
    existingChart.destroy();
  }

  window.multiMemberTrendChart = new Chart(ctx, {
    type: "line",
    data: { labels: labels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "Leave Days" },
        },
        x: { title: { display: true, text: "Month" } },
      },
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: { boxWidth: 12, padding: 8, font: { size: 11 } },
        },
      },
    },
  });
}

// Update user statistics panel
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

function showSaveSuccess() {
  const saveBtn = document.getElementById("saveBtn");
  if (!saveBtn) return;

  // Save original state
  const originalText = saveBtn.textContent;
  const originalBg = saveBtn.style.background;

  // Success animation
  saveBtn.textContent = "✓ Saved!";
  saveBtn.style.background =
    "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)";
  saveBtn.style.transform = "scale(1.05)";
  saveBtn.style.transition = "all 0.3s ease";
  saveBtn.disabled = true;

  // Reset after 2.5 seconds
  setTimeout(() => {
    saveBtn.textContent = originalText;
    saveBtn.style.background = originalBg;
    saveBtn.style.transform = "scale(1)";
    saveBtn.disabled = false;
  }, window.APP_TIMING?.SUCCESS_MESSAGE_DURATION || 2500);
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
        maintainAspectRatio: false,
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
    let holidayTitle = "";

    if (holidayMap[d]) {
      if (holidayMap[d].includes("UK")) holidayClass += " uk-holiday";
      if (holidayMap[d].includes("US")) holidayClass += " us-holiday";
      if (holidayMap[d].includes("IN") || holidayMap[d].includes("India"))
        holidayClass += " in-holiday";
      if (holidayMap[d].includes("Custom")) holidayClass += " custom-holiday";

      holidayTitle = holidayMap[d].join(" & ") + " Holiday";
    }

    if (dow === 0 || dow === 6) holidayClass += " weekend";

    html += `<th class="${holidayClass.trim()}" title="${holidayTitle}">${d}</th>`;
  }
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
        if (holidayMap[d].includes("IN") || holidayMap[d].includes("India"))
          cellClass += " in-holiday";

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

// Render the single multi-line leave trend chart
function renderMultiMemberLeaveTrendChart() {
  const canvas = document.getElementById("multiMemberLeaveTrendChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Gather data
  const now = viewDate || new Date();
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

// Make functions globally accessible
window.renderDashboardTab = renderDashboardTab;
window.updateMetrics = updateMetrics;
window.renderCharts = renderCharts;
window.updateUserStats = updateUserStats;
window.showSaveSuccess = showSaveSuccess;

window.updateQuickStatsPills = updateQuickStatsPills;
window.renderLeaveShareChart = renderLeaveShareChart;
window.renderDailyAvailabilityChart = renderDailyAvailabilityChart;
window.renderWeeklyAvailabilityChart = renderWeeklyAvailabilityChart;
window.renderCalendarHeatmap = renderCalendarHeatmap;
window.renderMemberLeaveBarChart = renderMemberLeaveBarChart;
window.renderEmployeeTilesWithSparklines = renderEmployeeTilesWithSparklines;
window.renderMonthlyGantt = renderMonthlyGantt;
window.renderGanttLegendMembers = renderGanttLegendMembers;
window.updateMonthlyView = updateMonthlyView;
window.updateNewPanelMetrics = updateNewPanelMetrics;
window.updateNewHolidayList = updateNewHolidayList;
window.updateSpecialDatesKPI = updateSpecialDatesKPI;
window.getPastNMonths = getPastNMonths;
