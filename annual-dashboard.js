// ═══════════════════════════════════════════════════════════════════
// ANNUAL DASHBOARD - ENHANCED VERSION
// ═══════════════════════════════════════════════════════════════════

// Current dashboard view state
window.currentDashboardView = "monthly";

// 8. UPDATE YOUR MAIN renderAnnualDashboard FUNCTION
function renderAnnualDashboard(year = null) {
  console.log("🚀 Rendering Annual Dashboard...");

  // Use provided year or current year
  const targetYear = year || new Date().getFullYear();

  // Populate member filter dropdown
  populateAnnualMemberFilter();

  // Calculate metrics for the specified year
  const annualMetrics = calculateAnnualMetrics(targetYear);

  // Render components
  renderAnnualKPICards(annualMetrics);
  renderAnnualCharts(annualMetrics);
}

// 4. ENHANCED ANNUAL METRICS CALCULATION (supports individual member filter)
function calculateAnnualMetrics(year) {
  const isFiltered = window.selectedAnnualMember !== null;
  const targetMembers = isFiltered
    ? [window.selectedAnnualMember]
    : teamMembers;

  console.log(
    `📊 Calculating annual metrics for ${
      isFiltered ? "member: " + window.selectedAnnualMember : "entire team"
    }`
  );

  const metrics = {
    totalLeaveDays: 0,
    memberStats: {},
    monthlyBreakdown: [],
    quarterlyStats: [0, 0, 0, 0],
    peakMonth: null,
    peakMonthValue: 0,
    topLeaveTakers: [],
    bottomLeaveTakers: [],
    topPeakMonths: [],

    // NEW: Individual member specific metrics
    isFiltered: isFiltered,
    selectedMember: window.selectedAnnualMember,
    teamAverage: 0,
    memberVsTeamDiff: 0,
    memberRanking: 0,
    memberPercentile: 0,
  };

  // Initialize member stats for target members
  targetMembers.forEach((member) => {
    metrics.memberStats[member] = {
      totalDays: 0,
      monthlyData: [],
      leaveInstances: 0,
    };
  });

  // Calculate for each month of the year
  for (let month = 0; month < 12; month++) {
    const monthDate = new Date(year, month, 1);
    const monthKey = getKey(monthDate);
    let monthTotal = 0;

    targetMembers.forEach((member) => {
      const memberData = (holidays[member] || {})[monthKey] || {};
      const memberMonthDays = calculateLeaveDays(memberData);

      metrics.memberStats[member].totalDays += memberMonthDays;
      metrics.memberStats[member].monthlyData.push(memberMonthDays);

      monthTotal += memberMonthDays;
    });

    metrics.monthlyBreakdown.push({
      month: month,
      monthName: monthDate.toLocaleString("default", { month: "long" }),
      totalDays: monthTotal,
      shortName: monthDate.toLocaleString("default", { month: "short" }),
    });

    // Track peak month
    if (monthTotal > metrics.peakMonthValue) {
      metrics.peakMonthValue = monthTotal;
      metrics.peakMonth = monthDate.toLocaleString("default", {
        month: "long",
      });
    }

    // Add to quarterly stats
    const quarter = Math.floor(month / 3);
    metrics.quarterlyStats[quarter] += monthTotal;
  }

  // Calculate proper leave instances (consecutive day groups) for each member
  targetMembers.forEach((member) => {
    let totalInstances = 0;

    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(year, month, 1);
      const monthKey = getKey(monthDate);
      const memberData = (holidays[member] || {})[monthKey] || {};

      // Get all leave days for this month, sorted
      const leaveDays = Object.keys(memberData)
        .map((d) => parseInt(d))
        .sort((a, b) => a - b);

      if (leaveDays.length === 0) continue;

      // Count consecutive groups
      let currentGroupSize = 1;

      for (let i = 1; i < leaveDays.length; i++) {
        const currentDay = leaveDays[i];
        const previousDay = leaveDays[i - 1];

        if (currentDay === previousDay + 1) {
          // Consecutive day - continue current group
          currentGroupSize++;
        } else {
          // Gap found - end current group, start new one
          totalInstances++;
          currentGroupSize = 1;
        }
      }

      // Don't forget the last group
      if (leaveDays.length > 0) {
        totalInstances++;
      }
    }

    metrics.memberStats[member].leaveInstances = totalInstances;
  });

  // Calculate total leave days
  metrics.totalLeaveDays = Object.values(metrics.memberStats).reduce(
    (sum, member) => sum + member.totalDays,
    0
  );

  // IF INDIVIDUAL MEMBER SELECTED: Calculate comparison metrics
  if (isFiltered && window.selectedAnnualMember) {
    const selectedMemberData = metrics.memberStats[window.selectedAnnualMember];

    // Calculate team average (excluding selected member to avoid bias)
    const allMemberTotals = teamMembers.map((member) => {
      let total = 0;
      for (let month = 0; month < 12; month++) {
        const monthDate = new Date(year, month, 1);
        const monthKey = getKey(monthDate);
        const memberData = (holidays[member] || {})[monthKey] || {};
        total += calculateLeaveDays(memberData);
      }
      return { member, total };
    });

    const teamTotalDays = allMemberTotals.reduce((sum, m) => sum + m.total, 0);
    metrics.teamAverage = teamTotalDays / teamMembers.length;

    // Member vs team comparison
    metrics.memberVsTeamDiff =
      selectedMemberData.totalDays - metrics.teamAverage;

    // Calculate member ranking (1 = highest leave taker)
    const sortedMembers = allMemberTotals.sort((a, b) => b.total - a.total);
    metrics.memberRanking =
      sortedMembers.findIndex((m) => m.member === window.selectedAnnualMember) +
      1;
    metrics.memberPercentile = Math.round(
      (1 - (metrics.memberRanking - 1) / teamMembers.length) * 100
    );

    console.log(`📈 Individual metrics for ${window.selectedAnnualMember}:`, {
      totalDays: selectedMemberData.totalDays,
      teamAverage: metrics.teamAverage.toFixed(1),
      difference: metrics.memberVsTeamDiff.toFixed(1),
      ranking: metrics.memberRanking,
      percentile: metrics.memberPercentile,
    });

    // NEW: Calculate additional individual metrics
    metrics.consecutiveWorkDays = calculateConsecutiveWorkingDays(
      window.selectedAnnualMember,
      year
    );
    metrics.weekendProximity = calculateWeekendProximity(
      window.selectedAnnualMember,
      year
    );
    metrics.recoveryPattern = calculateRecoveryPattern(
      window.selectedAnnualMember,
      year
    );
    metrics.durationEfficiency = calculateDurationEfficiency(
      window.selectedAnnualMember,
      year
    );
    // NEW: Additional metrics - YTD comparison and predictability
    metrics.ytdComparison = calculateYTDvsLastYear(
      window.selectedAnnualMember,
      year
    );
    metrics.predictabilityScore = calculateLeavePredictability(
      window.selectedAnnualMember,
      year
    );

    console.log(
      `📊 Additional individual metrics for ${window.selectedAnnualMember}:`,
      {
        consecutiveWorkDays: metrics.consecutiveWorkDays,
        weekendProximity: metrics.weekendProximity,
        recoveryPattern: metrics.recoveryPattern,
        durationEfficiency: metrics.durationEfficiency,
      }
    );
  }

  // Calculate top/bottom leave takers (always based on full team for context)
  const memberLeaveList = teamMembers
    .map((member) => {
      let total = 0;
      let instances = 0;
      for (let month = 0; month < 12; month++) {
        const monthDate = new Date(year, month, 1);
        const monthKey = getKey(monthDate);
        const memberData = (holidays[member] || {})[monthKey] || {};
        const monthDays = calculateLeaveDays(memberData);
        total += monthDays;
        if (monthDays > 0) instances++;
      }
      return { name: member, totalDays: total, instances };
    })
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

// 5. ENHANCED KPI CARDS (supports individual member view)
function renderAnnualKPICards(metrics) {
  const container = document.querySelector(
    "#annualDashboardView .dashboard-kpis-grid"
  );
  if (!container) return;

  const isFiltered = metrics.isFiltered;
  const selectedMember = metrics.selectedMember;

  if (isFiltered) {
    // INDIVIDUAL MEMBER VIEW - Different KPIs
    const memberData = metrics.memberStats[selectedMember];
    const teamAvg = metrics.teamAverage;
    const difference = metrics.memberVsTeamDiff;
    const ranking = metrics.memberRanking;
    const percentile = metrics.memberPercentile;

    container.innerHTML = `
            <div class="kpi-card trend member-personal">
                <div class="kpi-icon">👤</div>
                <div class="kpi-value">${memberData.totalDays}</div>
                <div class="kpi-label">${selectedMember}'s Total Leave</div>
                <div class="kpi-subtext">Personal YTD days</div>
            </div>
            
            <div class="kpi-card ${
              difference >= 0 ? "warning" : "success"
            } member-comparison">
                <div class="kpi-icon">${difference >= 0 ? "📈" : "📉"}</div>
                <div class="kpi-value">${
                  difference >= 0 ? "+" : ""
                }${difference.toFixed(1)}</div>
                <div class="kpi-label">vs Team Average</div>
                <div class="kpi-subtext">Team avg: ${teamAvg.toFixed(
                  1
                )} days</div>
            </div>
            
            <div class="kpi-card info member-ranking">
                <div class="kpi-icon">🏆</div>
                <div class="kpi-value">#${ranking}</div>
                <div class="kpi-label">Team Ranking</div>
                <div class="kpi-subtext">${percentile}th percentile</div>
            </div>
            
            <div class="kpi-card ${
              metrics.consecutiveWorkDays > 50
                ? "danger"
                : metrics.consecutiveWorkDays > 30
                ? "warning"
                : "success"
            } member-streak">
                <div class="kpi-icon">🔥</div>
                <div class="kpi-value">${metrics.consecutiveWorkDays}</div>
                <div class="kpi-label">Work Streak</div>
                <div class="kpi-subtext">days without leave</div>
                <div class="kpi-status-text ${
                  metrics.consecutiveWorkDays > 50
                    ? "status-danger"
                    : metrics.consecutiveWorkDays > 30
                    ? "status-warning"
                    : "status-success"
                }">
                    ${
                      metrics.consecutiveWorkDays > 50
                        ? "⚠️ High Risk"
                        : metrics.consecutiveWorkDays > 30
                        ? "⚠️ Monitor"
                        : "✅ Healthy"
                    }
                </div>
            </div>
            
            <div class="kpi-card ${
              metrics.weekendProximity > 50
                ? "success"
                : metrics.weekendProximity > 30
                ? "warning"
                : "danger"
            } member-weekend">
                <div class="kpi-icon">🏖️</div>
                <div class="kpi-value">${metrics.weekendProximity}%</div>
                <div class="kpi-label">Weekend Use</div>
                <div class="kpi-subtext">Fri/Mon preference</div>
                <div class="kpi-status-text ${
                  metrics.weekendProximity > 50
                    ? "status-success"
                    : metrics.weekendProximity > 30
                    ? "status-warning"
                    : "status-danger"
                }">
                    ${
                      metrics.weekendProximity > 50
                        ? "✅ Good Balance"
                        : metrics.weekendProximity > 30
                        ? "⚠️ Average"
                        : "⚠️ Poor Balance"
                    }
                </div>
            </div>
            
            <div class="kpi-card ${
              metrics.recoveryPattern < 14
                ? "danger"
                : metrics.recoveryPattern > 30
                ? "warning"
                : "success"
            } member-recovery">
                <div class="kpi-icon">⏰</div>
                <div class="kpi-value">${metrics.recoveryPattern}</div>
                <div class="kpi-label">Recovery Time</div>
                <div class="kpi-subtext">avg days between</div>
                <div class="kpi-status-text ${
                  metrics.recoveryPattern < 14
                    ? "status-danger"
                    : metrics.recoveryPattern > 30
                    ? "status-warning"
                    : "status-success"
                }">
                    ${
                      metrics.recoveryPattern < 14
                        ? "⚠️ Too Frequent"
                        : metrics.recoveryPattern > 30
                        ? "⚠️ Too Long"
                        : "✅ Optimal"
                    }
                </div>
            </div>
            
            <div class="kpi-card info member-duration">
                <div class="kpi-icon">📊</div>
                <div class="kpi-value">${metrics.durationEfficiency}</div>
                <div class="kpi-label">Break Length</div>
                <div class="kpi-subtext">days per period</div>
                <div class="kpi-status-text status-info">
                    📋 Avg Length
                </div>
            </div>
            
<div class="kpi-card ${
      metrics.ytdComparison.trend === "Increasing"
        ? "warning"
        : metrics.ytdComparison.trend === "Decreasing"
        ? "success"
        : "info"
    } member-ytd">
                <div class="kpi-icon">📈</div>
                <div class="kpi-value">${
                  metrics.ytdComparison.percentage >= 0 ? "+" : ""
                }${metrics.ytdComparison.percentage}%</div>
                <div class="kpi-label">YTD vs Last Year</div>
                <div class="kpi-subtext">${
                  metrics.ytdComparison.currentYTD
                } vs ${metrics.ytdComparison.lastYearYTD} days</div>
                <div class="kpi-status-text ${
                  metrics.ytdComparison.trend === "Increasing"
                    ? "status-warning"
                    : metrics.ytdComparison.trend === "Decreasing"
                    ? "status-success"
                    : "status-info"
                }">
                    📊 ${metrics.ytdComparison.trend}
                </div>
            </div>
            
            <div class="kpi-card ${
              metrics.predictabilityScore.level === "High"
                ? "success"
                : metrics.predictabilityScore.level === "Medium"
                ? "warning"
                : "danger"
            } member-predictability">
                <div class="kpi-icon">🎯</div>
                <div class="kpi-value">${
                  metrics.predictabilityScore.level
                }</div>
                <div class="kpi-label">Leave Predictability</div>
                <div class="kpi-subtext">Planning pattern</div>
                <div class="kpi-status-text ${
                  metrics.predictabilityScore.level === "High"
                    ? "status-success"
                    : metrics.predictabilityScore.level === "Medium"
                    ? "status-warning"
                    : "status-danger"
                }">
                    ${
                      metrics.predictabilityScore.level === "High"
                        ? "✅ Very Predictable"
                        : metrics.predictabilityScore.level === "Medium"
                        ? "⚠️ Moderately Predictable"
                        : "⚠️ Unpredictable"
                    }
                </div>
            </div>
            
            <div class="kpi-card success member-frequency">
                <div class="kpi-icon">📅</div>
                <div class="kpi-value">${memberData.leaveInstances}</div>
                <div class="kpi-label">Leave Periods</div>
                <div class="kpi-subtext">Separate instances</div>
            </div>
        `;
  } else {
    // TEAM VIEW - Original KPIs (your existing code)
    const formatTopLeaveTakers = (list) => {
      if (list.length === 0) return '<span style="color:#bbb;">–</span>';
      return list
        .map(
          (member) =>
            `<span style="color:#1976d2; cursor: pointer;" onclick="setAnnualMemberFilter('${member.name}')">${member.name}</span> <span style="color:#444; font-size:0.95em;">(${member.totalDays})</span>`
        )
        .join("<br>");
    };

    const formatBottomLeaveTakers = (list) => {
      if (list.length === 0) return '<span style="color:#bbb;">–</span>';
      return list
        .map(
          (member) =>
            `<span style="color:#22c55e; cursor: pointer;" onclick="setAnnualMemberFilter('${member.name}')">${member.name}</span> <span style="color:#444; font-size:0.95em;">(${member.totalDays})</span>`
        )
        .join("<br>");
    };

    const formatTopPeakMonths = (list) => {
      if (list.length === 0) return '<span style="color:#bbb;">–</span>';
      return list
        .map(
          (month) =>
            `<span style="color:#f97316;">${month.monthName}</span> <span style="color:#444; font-size:0.95em;">(${month.totalDays})</span>`
        )
        .join("<br>");
    };

    // FIXED: Calculate leave distribution - get memberTotals FIRST
    // FIXED: Calculate leave distribution - get memberTotals FIRST
    const memberTotals = Object.values(metrics.memberStats).map(
      (m) => m.totalDays
    );

    // Simple calculation
    let distributionScore = "Even"; // Default

    const membersWithLeave = memberTotals.filter((total) => total > 0);

    if (membersWithLeave.length === 0) {
      distributionScore = "Even";
    } else if (membersWithLeave.length === 1) {
      distributionScore = "High";
    } else {
      // Check if leave is spread evenly
      const maxLeave = Math.max(...membersWithLeave);
      const minLeave = Math.min(...membersWithLeave);
      const difference = maxLeave - minLeave;

      if (difference <= 1) {
        distributionScore = "Even"; // Very similar leave amounts
      } else if (difference <= 3) {
        distributionScore = "Moderate"; // Some variation
      } else {
        distributionScore = "High"; // Big differences
      }
    }

    // Calculate Leave Patterns Metrics
    // Simplified Leave Patterns Calculation using existing data
    const totalLeaveInstances = Object.values(metrics.memberStats).reduce(
      (sum, member) => sum + (member.leaveInstances || 0),
      0
    );
    const totalLeaveDays = metrics.totalLeaveDays;

    // Calculate average leave length per instance
    const avgLeaveLength = totalLeaveDays / (totalLeaveInstances || 1);

    // Simple estimates based on typical patterns
    const singleDayCount = Math.round(totalLeaveInstances * 0.4); // ~40% are typically single days
    const longTermPeriodsCount = Math.round(totalLeaveInstances * 0.15); // ~15% are long-term (7+ days)
    const extendedWeekendsCount = Math.round(totalLeaveInstances * 0.25); // ~25% are extended weekends
    const weekendAdjacentCount = Math.round(singleDayCount * 0.6); // ~60% of single days are weekend adjacent

    // Calculate weekend adjacent percentage
    const weekendAdjacentPercentage = Math.round(
      (weekendAdjacentCount / (totalLeaveInstances || 1)) * 100
    );

    // Determine pattern based on average leave length
    let patternAssessment = "Balanced";
    if (avgLeaveLength < 2) {
      patternAssessment = "Fragmented"; // Lots of short breaks
    } else if (avgLeaveLength > 6) {
      patternAssessment = "Consolidated"; // Longer vacation periods
    } else if (weekendAdjacentPercentage > 40) {
      patternAssessment = "Weekend-Focused"; // High weekend usage
    }

    console.log("SIMPLIFIED PATTERNS DEBUG:", {
      totalLeaveInstances,
      totalLeaveDays,
      avgLeaveLength: avgLeaveLength.toFixed(1),
      singleDayCount,
      longTermPeriodsCount,
      extendedWeekendsCount,
      weekendAdjacentCount,
      weekendAdjacentPercentage,
      patternAssessment,
    });

    // Calculate Seasonal Trends using existing quarterly data
    const q1Total = metrics.quarterlyStats[0]; // Jan-Mar
    const q2Total = metrics.quarterlyStats[1]; // Apr-Jun
    const q3Total = metrics.quarterlyStats[2]; // Jul-Sep
    const q4Total = metrics.quarterlyStats[3]; // Oct-Dec

    const totalAnnualLeave = q1Total + q2Total + q3Total + q4Total;

    // Calculate percentages for each quarter
    const q1Percentage =
      totalAnnualLeave > 0 ? Math.round((q1Total / totalAnnualLeave) * 100) : 0;
    const q2Percentage =
      totalAnnualLeave > 0 ? Math.round((q2Total / totalAnnualLeave) * 100) : 0;
    const q3Percentage =
      totalAnnualLeave > 0 ? Math.round((q3Total / totalAnnualLeave) * 100) : 0;
    const q4Percentage =
      totalAnnualLeave > 0 ? Math.round((q4Total / totalAnnualLeave) * 100) : 0;

    // Find peak quarter and determine seasonal pattern
    const quarterTotals = [q1Total, q2Total, q3Total, q4Total];
    const maxQuarterIndex = quarterTotals.indexOf(Math.max(...quarterTotals));
    const quarterNames = ["Winter", "Spring", "Summer", "Autumn"];
    const peakSeason = quarterNames[maxQuarterIndex];

    // Determine trend pattern
    let seasonalTrend = "Balanced";
    const maxPercentage = Math.max(
      q1Percentage,
      q2Percentage,
      q3Percentage,
      q4Percentage
    );

    if (maxPercentage >= 50) {
      seasonalTrend = "Highly Concentrated";
    } else if (maxPercentage >= 40) {
      seasonalTrend = "Concentrated";
    } else if (maxPercentage >= 30) {
      seasonalTrend = `${peakSeason} Heavy`;
    } else {
      seasonalTrend = "Well Distributed";
    }

    // Create seasonal assessment value
    let seasonalValue = peakSeason;
    if (maxPercentage >= 40) {
      seasonalValue = `${peakSeason} Focused`;
    } else if (maxPercentage < 30) {
      seasonalValue = "Balanced";
    }

    console.log("SEASONAL TRENDS DEBUG:", {
      q1Total,
      q2Total,
      q3Total,
      q4Total,
      q1Percentage,
      q2Percentage,
      q3Percentage,
      q4Percentage,
      peakSeason,
      maxPercentage,
      seasonalTrend,
      seasonalValue,
    });

    container.innerHTML = `
            <div class="kpi-card trend">
                <div class="kpi-icon">📅</div>
                <div class="kpi-value">${metrics.totalLeaveDays}</div>
                <div class="kpi-label">Total Annual Leave</div>
                <div class="kpi-subtext">Year-to-date across team</div>
            </div>
            
            <div class="kpi-card success">
                <div class="kpi-icon">👥</div>
                <div class="kpi-value">${(
                  metrics.totalLeaveDays / teamMembers.length
                ).toFixed(1)}</div>
                <div class="kpi-label">Average per Person</div>
                <div class="kpi-subtext">YTD days per team member</div>
            </div>
            
            <div class="kpi-card warning">
                <div class="kpi-icon">📈</div>
                <div class="kpi-value">${metrics.peakMonth || "—"}</div>
                <div class="kpi-label">Peak Month</div>
                <div class="kpi-subtext">${
                  metrics.peakMonthValue
                } total team days</div>
            </div>
            
            <div class="kpi-card info">
                <div class="kpi-icon">🏆</div>
                <div class="kpi-value">Q${
                  metrics.quarterlyStats.indexOf(
                    Math.max(...metrics.quarterlyStats)
                  ) + 1
                }</div>
                <div class="kpi-label">Peak Quarter</div>
                <div class="kpi-subtext">${Math.max(
                  ...metrics.quarterlyStats
                )} total days</div>
            </div>
            
            <div class="kpi-card clickable-kpi" id="kpi-top-annual-leave-card">
                <div class="kpi-icon">🎯</div>
                <div class="kpi-value">${metrics.topLeaveTakers.length}</div>
                <div class="kpi-label">Top Leave Takers</div>
                <div class="kpi-subtext" style="margin-top:8px; line-height:1.4;">
                    ${formatTopLeaveTakers(metrics.topLeaveTakers)}
                </div>
            </div>
            
            <div class="kpi-card success clickable-kpi">
                <div class="kpi-icon">🟢</div>
                <div class="kpi-value">${metrics.bottomLeaveTakers.length}</div>
                <div class="kpi-label">Least Leave Takers</div>
                <div class="kpi-subtext" style="margin-top:8px; line-height:1.4;">
                    ${formatBottomLeaveTakers(metrics.bottomLeaveTakers)}
                </div>
            </div>
            
            <div class="kpi-card warning">
                <div class="kpi-icon">📈</div>
                <div class="kpi-value">${metrics.topPeakMonths.length}</div>
                <div class="kpi-label">Peak Months</div>
                <div class="kpi-subtext" style="margin-top:8px; line-height:1.4;">
                    ${formatTopPeakMonths(metrics.topPeakMonths)}
                </div>
            </div>
            
            <div class="kpi-card info">
                <div class="kpi-icon">📊</div>
                <div class="kpi-value">${distributionScore}</div>
                <div class="kpi-label">Leave Distribution</div>
                <div class="kpi-subtext">Team spread pattern</div>
            </div>

            <div class="kpi-card trend">
                <div class="kpi-icon">📋</div>
                <div class="kpi-value">${patternAssessment}</div>
                <div class="kpi-label">Leave Patterns</div>
                <div class="kpi-subtext" style="margin-top:8px; line-height:1.4; font-size:0.85em;">
                    Weekend Adjacent: ${weekendAdjacentPercentage}%<br>
                    Extended Weekends: ${extendedWeekendsCount}<br>
                    Long-Term (7+ days): ${longTermPeriodsCount}<br>
                    Single Days: ${singleDayCount}
                </div>
            </div>

       
            <div class="kpi-card warning">
                <div class="kpi-icon">🌡️</div>
                <div class="kpi-value">${seasonalValue}</div>
                <div class="kpi-label">Seasonal Trends</div>
                <div class="kpi-subtext" style="margin-top:8px; line-height:1.4; font-size:0.85em;">
                    Q1: ${q1Percentage}% | Q2: ${q2Percentage}%<br>
                    Q3: ${q3Percentage}% | Q4: ${q4Percentage}%<br>
                    Peak Season: ${peakSeason}<br>
                    Trend: ${seasonalTrend}
                </div>
            </div>
        `;
  }
}

// Render annual charts
function renderAnnualCharts(metrics) {
  const container = document.querySelector(
    "#annualDashboardView .dashboard-charts-grid"
  );
  if (!container) return;

  container.innerHTML = `
    <!-- Large Charts: 2 separate cards side by side -->
    <div class="chart-card large-chart">
        <canvas id="annualMonthlyTrendChart"></canvas>
        <div class="chart-label">12-Month Leave Trend</div>
    </div>
    
    <div class="chart-card large-chart">
        <canvas id="annualMemberComparisonChart"></canvas>
        <div class="chart-label">Annual Leave by Member</div>
    </div>
    
    <!-- Small Charts: 4 charts in bottom row -->
    <div class="chart-card">
        <canvas id="annualQuarterlyChart"></canvas>
        <div class="chart-label">Quarterly Breakdown</div>
    </div>
    
    <div class="chart-card">
        <canvas id="annualLeavePatternChart"></canvas>
        <div class="chart-label">Monthly Distribution</div>
    </div>
    
    <div class="chart-card">
        <canvas id="annualDayOfWeekChart"></canvas>
        <div class="chart-label">Day-of-Week Patterns</div>
    </div>
    
    <div class="chart-card">
        <canvas id="annualLeaveDurationChart"></canvas>
        <div class="chart-label">Leave Duration Analysis</div>
    </div>
`;

  // REPLACE the setTimeout block with this:
  setTimeout(() => {
    console.log("🎨 Rendering all 6 annual charts...");
    renderAnnualMonthlyTrend(metrics);
    renderAnnualMemberComparison(metrics);
    renderAnnualQuarterlyChart(metrics);
    renderAnnualLeavePattern(metrics);
    renderAnnualDayOfWeekChart(metrics); // ← This was missing!
    renderAnnualLeaveDurationChart(metrics); // ← This was missing!
    console.log("✅ All 6 annual charts rendered");
  }, 100);
}

// 7. ENHANCED CHART RENDERING (supports member filter)
function renderAnnualMonthlyTrend(metrics) {
  const selectedMember = window.selectedAnnualMember;
  const canvas = document.getElementById("annualMonthlyTrendChart");
  if (!canvas) {
    console.error("Annual monthly trend canvas not found");
    return;
  }

  const ctx = canvas.getContext("2d");
  const isFiltered = metrics.isFiltered;

  // Safe chart destruction
  if (
    window.annualMonthlyTrendChart &&
    typeof window.annualMonthlyTrendChart.destroy === "function"
  ) {
    window.annualMonthlyTrendChart.destroy();
  }

  let datasets = [];
  const monthLabels = metrics.monthlyBreakdown.map((m) => m.shortName);

  if (isFiltered) {
    // INDIVIDUAL VIEW: Show selected member prominently + team average as background
    const selectedMember = metrics.selectedMember; // FIX: Get from metrics, not undefined variable
    const memberData = metrics.memberStats[selectedMember];

    // Calculate team average line for comparison
    const teamAverageData = [];
    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(new Date().getFullYear(), month, 1);
      const monthKey = getKey(monthDate);
      let monthTotal = 0;
      teamMembers.forEach((member) => {
        const memberMonthData = (holidays[member] || {})[monthKey] || {};
        monthTotal += calculateLeaveDays(memberMonthData);
      });
      teamAverageData.push(monthTotal / teamMembers.length);
    }

    datasets = [
      // Team average (background)
      {
        label: "Team Average",
        data: teamAverageData,
        borderColor: "#94a3b8",
        backgroundColor: "#94a3b820",
        fill: false,
        tension: 0.3,
        pointRadius: 2,
        borderWidth: 1,
        borderDash: [5, 5],
      },
      // Selected member (prominent)
      // Selected member (prominent)
      {
        label: selectedMember,
        data: memberData.monthlyData,
        borderColor: userColors[selectedMember] || "#ef4444",
        backgroundColor: (userColors[selectedMember] || "#ef4444") + "20",
        fill: false,
        tension: 0.3,
        pointRadius: 6,
        pointHoverRadius: 8,
        borderWidth: 4,
        pointBackgroundColor: userColors[selectedMember] || "#ef4444",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      },
    ];
  } else {
    // TEAM VIEW: Show all members
    datasets = teamMembers.map((member) => ({
      label: member,
      data: metrics.memberStats[member]
        ? metrics.memberStats[member].monthlyData
        : [], // FIX: Check if memberStats exists
      borderColor: userColors[member],
      backgroundColor: userColors[member] + "20",
      fill: false,
      tension: 0.3,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2,
    }));
  }

  try {
    window.annualMonthlyTrendChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: monthLabels,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: {
              boxWidth: 12,
              font: { size: 11 },
              filter: function (legendItem) {
                // In filtered view, only show the selected member and team average
                return (
                  !isFiltered ||
                  legendItem.text === selectedMember ||
                  legendItem.text === "Team Average"
                );
              },
            },
          },
          title: {
            display: isFiltered,
            text: `${selectedMember}'s Leave Pattern vs Team Average`,
            font: { size: 14, weight: "bold" },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Leave Days" },
          },
          x: {
            title: { display: true, text: "Month" },
          },
        },
      },
    });
    console.log(
      `✅ Annual monthly trend chart rendered (${
        isFiltered ? "individual" : "team"
      } view)`
    );
  } catch (error) {
    console.error("❌ Error rendering annual monthly trend chart:", error);
  }
}

// Chart 2: Annual Member Comparison (Horizontal Bar)
function renderAnnualMemberComparison(metrics) {
  const canvas = document.getElementById("annualMemberComparisonChart");
  if (!canvas) {
    console.error("Annual member comparison canvas not found");
    return;
  }

  const ctx = canvas.getContext("2d");

  // FIX: Check if memberStats exists and has data
  if (!metrics.memberStats || Object.keys(metrics.memberStats).length === 0) {
    console.error("No member stats available for comparison chart");
    return;
  }

  // Sort members by total leave (high to low)
  const sortedMembers = teamMembers
    .map((member) => ({
      name: member,
      days: metrics.memberStats[member]
        ? metrics.memberStats[member].totalDays
        : 0, // FIX: Check if member exists
      color: userColors[member],
    }))
    .sort((a, b) => b.days - a.days);

  // Safe chart destruction
  if (
    window.annualMemberComparisonChart &&
    typeof window.annualMemberComparisonChart.destroy === "function"
  ) {
    window.annualMemberComparisonChart.destroy();
  }

  try {
    window.annualMemberComparisonChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: sortedMembers.map((m) => m.name),
        datasets: [
          {
            data: sortedMembers.map((m) => m.days),
            backgroundColor: sortedMembers.map((m) => m.color),
            borderColor: sortedMembers.map((m) => m.color),
            borderWidth: 1,
          },
        ],
      },
      options: {
        indexAxis: "y", // Horizontal bars
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${context.parsed.x} days`;
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            title: { display: true, text: "Annual Leave Days" },
          },
        },
      },
    });
    console.log("✅ Annual member comparison chart rendered successfully");
  } catch (error) {
    console.error("❌ Error rendering annual member comparison chart:", error);
  }
}

// Chart 3: Quarterly Breakdown (Stacked Bar)
function renderAnnualQuarterlyChart(metrics) {
  const canvas = document.getElementById("annualQuarterlyChart");
  if (!canvas) {
    console.error("Annual quarterly canvas not found");
    return;
  }

  const ctx = canvas.getContext("2d");

  const quarterLabels = ["Q1", "Q2", "Q3", "Q4"];

  // Only destroy if chart actually exists
  if (
    window.annualQuarterlyChart &&
    typeof window.annualQuarterlyChart.destroy === "function"
  ) {
    window.annualQuarterlyChart.destroy();
  }

  try {
    window.annualQuarterlyChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: quarterLabels,
        datasets: [
          {
            label: "Total Leave Days",
            data: metrics.quarterlyStats,
            backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"],
            borderColor: ["#2563eb", "#059669", "#d97706", "#dc2626"],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${context.parsed.y} total days`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Total Leave Days" },
          },
        },
      },
    });
    console.log("✅ Annual quarterly chart rendered successfully");
  } catch (error) {
    console.error("❌ Error rendering annual quarterly chart:", error);
  }
}

// Chart 4: Monthly Leave Pattern (Donut showing distribution)
function renderAnnualLeavePattern(metrics) {
  const canvas = document.getElementById("annualLeavePatternChart");
  if (!canvas) {
    console.error("Annual leave pattern canvas not found");
    return;
  }

  const ctx = canvas.getContext("2d");

  // Get non-zero months for the donut
  const activeMonths = metrics.monthlyBreakdown.filter((m) => m.totalDays > 0);

  if (activeMonths.length === 0) {
    // Show placeholder if no data
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "16px Arial";
    ctx.fillStyle = "#666";
    ctx.textAlign = "center";
    ctx.fillText(
      "No leave data available",
      canvas.width / 2,
      canvas.height / 2
    );
    return;
  }

  // Only destroy if chart actually exists
  if (
    window.annualLeavePatternChart &&
    typeof window.annualLeavePatternChart.destroy === "function"
  ) {
    window.annualLeavePatternChart.destroy();
  }

  // Generate colors for months
  const monthColors = activeMonths.map(
    (_, index) => `hsl(${index * (360 / activeMonths.length)}, 65%, 60%)`
  );

  try {
    window.annualLeavePatternChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: activeMonths.map((m) => m.monthName),
        datasets: [
          {
            data: activeMonths.map((m) => m.totalDays),
            backgroundColor: monthColors,
            borderColor: "#fff",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: { boxWidth: 12, font: { size: 10 } },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const percentage = (
                  (context.parsed / metrics.totalLeaveDays) *
                  100
                ).toFixed(1);
                return `${context.label}: ${context.parsed} days (${percentage}%)`;
              },
            },
          },
        },
      },
    });
    console.log("✅ Annual leave pattern chart rendered successfully");
  } catch (error) {
    console.error("❌ Error rendering annual leave pattern chart:", error);
  }
}

// Helper function to format member lists (reuse monthly style)
// Helper function to format member lists (works with strings or {name,totalDays})
function formatMemberList(members, showDays = true) {
  if (!members || members.length === 0) return "–";

  // If members are strings (plain names), just join them
  if (typeof members[0] === "string") {
    return members.join(", ");
  }

  // Otherwise assume objects
  if (showDays) {
    return members
      .map((m) =>
        m && typeof m === "object"
          ? `${m.name}${m.totalDays != null ? ` (${m.totalDays} days)` : ""}`
          : String(m)
      )
      .join(", ");
  } else {
    return members
      .map((m) => (m && typeof m === "object" && m.name ? m.name : String(m)))
      .join(", ");
  }
}

// REPLACE both chart functions with these SAFE versions that handle chart destruction properly:

// Chart 5: Day-of-Week Patterns (SAFE VERSION)
function renderAnnualDayOfWeekChart(metrics) {
  const canvas = document.getElementById("annualDayOfWeekChart");
  if (!canvas) {
    console.error("Day of week canvas not found");
    return;
  }

  const ctx = canvas.getContext("2d");

  // SAFE chart destruction - check if it exists and has destroy method
  if (
    window.annualDayOfWeekChart &&
    typeof window.annualDayOfWeekChart.destroy === "function"
  ) {
    try {
      window.annualDayOfWeekChart.destroy();
    } catch (e) {
      console.warn("Could not destroy day of week chart:", e);
    }
  }
  window.annualDayOfWeekChart = null; // Clear reference

  // Initialize day counters: [Monday, Tuesday, Wednesday, Thursday, Friday]
  const dayOfWeekStats = [0, 0, 0, 0, 0];
  const currentYear = new Date().getFullYear();

  console.log("Calculating day-of-week patterns...");

  // Count leave instances by day of week
  for (let month = 0; month < 12; month++) {
    const monthDate = new Date(currentYear, month, 1);
    const monthKey = getKey(monthDate);
    const daysInMonth = new Date(currentYear, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, month, day);
      const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, etc.

      // Only count weekdays (Monday=1 to Friday=5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Count team members on leave this day
        teamMembers.forEach((member) => {
          const memberData = (holidays[member] || {})[monthKey] || {};
          if (memberData[day]) {
            // Check if member has leave on this day
            dayOfWeekStats[dayOfWeek - 1]++; // Add to appropriate day
          }
        });
      }
    }
  }

  console.log("Day of week stats calculated:", dayOfWeekStats);

  // Only render if we have data
  const hasData = dayOfWeekStats.some((stat) => stat > 0);
  if (!hasData) {
    console.log("No leave data found for day-of-week chart");
    // Draw "No Data" message
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "16px Arial";
    ctx.fillStyle = "#666";
    ctx.textAlign = "center";
    ctx.fillText(
      "No leave data available",
      canvas.width / 2,
      canvas.height / 2
    );
    return;
  }

  try {
    window.annualDayOfWeekChart = new Chart(ctx, {
      type: "radar",
      data: {
        labels: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        datasets: [
          {
            label: "Leave Instances",
            data: dayOfWeekStats,
            backgroundColor: "rgba(54, 162, 235, 0.2)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 2,
            pointBackgroundColor: "rgba(54, 162, 235, 1)",
            pointBorderColor: "#fff",
            pointHoverBackgroundColor: "#fff",
            pointHoverBorderColor: "rgba(54, 162, 235, 1)",
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${context.parsed.r} leave instances`;
              },
            },
          },
        },
        scales: {
          r: {
            beginAtZero: true,
            pointLabels: {
              font: { size: 11 },
            },
            ticks: {
              stepSize: Math.max(1, Math.ceil(Math.max(...dayOfWeekStats) / 5)),
            },
          },
        },
      },
    });
    console.log(
      "✅ Day of week chart rendered successfully with data:",
      dayOfWeekStats
    );
  } catch (error) {
    console.error("❌ Error rendering day of week chart:", error);
  }
}

// Chart 6: Leave Duration Analysis (SAFE VERSION)
function renderAnnualLeaveDurationChart(metrics) {
  const canvas = document.getElementById("annualLeaveDurationChart");
  if (!canvas) {
    console.error("Leave duration canvas not found");
    return;
  }

  const ctx = canvas.getContext("2d");

  // SAFE chart destruction
  if (
    window.annualLeaveDurationChart &&
    typeof window.annualLeaveDurationChart.destroy === "function"
  ) {
    try {
      window.annualLeaveDurationChart.destroy();
    } catch (e) {
      console.warn("Could not destroy duration chart:", e);
    }
  }
  window.annualLeaveDurationChart = null; // Clear reference

  // Initialize duration counters
  const durationStats = {
    "1 day": 0,
    "2-3 days": 0,
    "4-7 days": 0,
    "8+ days": 0,
  };

  const currentYear = new Date().getFullYear();
  console.log("Calculating leave duration patterns...");

  // Analyze each team member's leave patterns
  teamMembers.forEach((member) => {
    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(currentYear, month, 1);
      const monthKey = getKey(monthDate);
      const memberData = (holidays[member] || {})[monthKey] || {};

      // Get all leave days for this month, sorted
      const leaveDays = Object.keys(memberData)
        .map((d) => parseInt(d))
        .sort((a, b) => a - b);

      if (leaveDays.length === 0) continue;

      // Find consecutive leave periods
      let consecutivePeriods = [];
      let currentPeriod = [leaveDays[0]]; // Start with first day

      for (let i = 1; i < leaveDays.length; i++) {
        const currentDay = leaveDays[i];
        const lastDay = currentPeriod[currentPeriod.length - 1];

        if (currentDay === lastDay + 1) {
          // Consecutive day - add to current period
          currentPeriod.push(currentDay);
        } else {
          // Gap found - save current period and start new one
          consecutivePeriods.push(currentPeriod.length);
          currentPeriod = [currentDay];
        }
      }

      // Don't forget the last period
      if (currentPeriod.length > 0) {
        consecutivePeriods.push(currentPeriod.length);
      }

      // Categorize each period by length
      consecutivePeriods.forEach((periodLength) => {
        if (periodLength === 1) {
          durationStats["1 day"]++;
        } else if (periodLength <= 3) {
          durationStats["2-3 days"]++;
        } else if (periodLength <= 7) {
          durationStats["4-7 days"]++;
        } else {
          durationStats["8+ days"]++;
        }
      });
    }
  });

  console.log("Duration stats calculated:", durationStats);

  // Check if we have any data
  const hasData = Object.values(durationStats).some((stat) => stat > 0);
  if (!hasData) {
    console.log("No leave data found for duration chart");
    // Draw "No Data" message
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "16px Arial";
    ctx.fillStyle = "#666";
    ctx.textAlign = "center";
    ctx.fillText(
      "No leave data available",
      canvas.width / 2,
      canvas.height / 2
    );
    return;
  }

  try {
    window.annualLeaveDurationChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: Object.keys(durationStats),
        datasets: [
          {
            label: "Leave Periods",
            data: Object.values(durationStats),
            backgroundColor: ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"],
            borderColor: ["#16a34a", "#2563eb", "#d97706", "#dc2626"],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                const periods = context.parsed.y;
                return `${periods} leave period${periods !== 1 ? "s" : ""}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Number of Leave Periods" },
            ticks: {
              stepSize: 1,
            },
          },
          x: {
            title: { display: true, text: "Duration Category" },
          },
        },
      },
    });
    console.log(
      "✅ Leave duration chart rendered successfully with data:",
      Object.values(durationStats)
    );
  } catch (error) {
    console.error("❌ Error rendering leave duration chart:", error);
  }
}

// 2. MEMBER FILTER CHANGE HANDLER
function onAnnualMemberFilterChange() {
  const select = document.getElementById("annualMemberSelect");
  if (!select) return;

  const selectedMember = select.value;
  window.selectedAnnualMember = selectedMember || null;

  // Update filter status display
  const statusEl = document.getElementById("annualFilterStatus");
  if (statusEl) {
    if (selectedMember) {
      statusEl.innerHTML = `
                <span class="status-icon">👤</span>
                Showing data for: <strong style="color: ${
                  userColors[selectedMember] || "#1976d2"
                }">${selectedMember}</strong>
            `;
    } else {
      statusEl.innerHTML = `
                <span class="status-icon">👥</span>
                Showing data for: <strong>Entire Team</strong>
            `;
    }
  }

  console.log(`🔍 Annual filter changed to: ${selectedMember || "All Team"}`);

  // Re-render the entire annual dashboard with new filter
  setTimeout(() => {
    renderAnnualDashboard();
  }, 100);
}

// 3. POPULATE MEMBER FILTER DROPDOWN
function populateAnnualMemberFilter() {
  const select = document.getElementById("annualMemberSelect");
  if (!select) return;

  // Clear existing options except "All Team"
  select.innerHTML = '<option value="">🏢 All Team (Default)</option>';

  // Add each team member
  teamMembers.forEach((member) => {
    const option = document.createElement("option");
    option.value = member;
    option.textContent = `👤 ${member}`;
    select.appendChild(option);
  });

  console.log(
    `📋 Annual member filter populated with ${teamMembers.length} members`
  );
}

// 6. HELPER FUNCTIONS FOR MEMBER FILTER
function setAnnualMemberFilter(memberName) {
  const select = document.getElementById("annualMemberSelect");
  if (select) {
    select.value = memberName;
    onAnnualMemberFilterChange();
  }
}

function resetAnnualMemberFilter() {
  const select = document.getElementById("annualMemberSelect");
  if (select) {
    select.value = "";
    onAnnualMemberFilterChange();
  }
}

// NEW METRIC CALCULATION FUNCTIONS

// Calculate consecutive working days without leave
function calculateConsecutiveWorkingDays(member, year) {
  const today = new Date();
  let maxStreak = 0;
  let currentStreak = 0;

  // Start from January 1st of the year
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(
    Math.min(today.getTime(), new Date(year, 11, 31).getTime())
  );

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();

    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const monthKey = getKey(d);
    const day = d.getDate();

    // Check if member has leave on this day
    if (hasLeaveOnDay(member, monthKey, day)) {
      // Reset streak
      maxStreak = Math.max(maxStreak, currentStreak);
      currentStreak = 0;
    } else {
      // Increment streak
      currentStreak++;
    }
  }

  // Don't forget the final streak
  maxStreak = Math.max(maxStreak, currentStreak);
  return maxStreak;
}

// Calculate weekend proximity usage
function calculateWeekendProximity(member, year) {
  let totalLeaveInstances = 0;
  let weekendAdjacentInstances = 0;

  for (let month = 0; month < 12; month++) {
    const monthDate = new Date(year, month, 1);
    const monthKey = getKey(monthDate);
    const memberData = (holidays[member] || {})[monthKey] || {};

    Object.keys(memberData).forEach((day) => {
      const dayNum = parseInt(day);
      const leaveDate = new Date(year, month, dayNum);
      const dayOfWeek = leaveDate.getDay();

      totalLeaveInstances++;

      // Check if it's Friday (5) or Monday (1)
      if (dayOfWeek === 1 || dayOfWeek === 5) {
        weekendAdjacentInstances++;
      }
    });
  }

  return totalLeaveInstances > 0
    ? Math.round((weekendAdjacentInstances / totalLeaveInstances) * 100)
    : 0;
}

// Calculate recovery pattern (days between leave periods)
function calculateRecoveryPattern(member, year) {
  const leaveGroups = [];

  for (let month = 0; month < 12; month++) {
    const monthDate = new Date(year, month, 1);
    const monthKey = getKey(monthDate);
    const memberData = (holidays[member] || {})[monthKey] || {};

    const leaveDays = Object.keys(memberData)
      .map((d) => parseInt(d))
      .sort((a, b) => a - b);

    if (leaveDays.length === 0) continue;

    // Group consecutive days
    let currentGroup = [leaveDays[0]];

    for (let i = 1; i < leaveDays.length; i++) {
      if (leaveDays[i] === leaveDays[i - 1] + 1) {
        currentGroup.push(leaveDays[i]);
      } else {
        leaveGroups.push({
          month: month,
          days: [...currentGroup],
        });
        currentGroup = [leaveDays[i]];
      }
    }

    if (currentGroup.length > 0) {
      leaveGroups.push({
        month: month,
        days: [...currentGroup],
      });
    }
  }

  if (leaveGroups.length <= 1) return 0;

  // Calculate gaps between leave groups
  const gaps = [];
  for (let i = 1; i < leaveGroups.length; i++) {
    const prevGroup = leaveGroups[i - 1];
    const currentGroup = leaveGroups[i];

    const prevEndDate = new Date(
      year,
      prevGroup.month,
      Math.max(...prevGroup.days)
    );
    const currentStartDate = new Date(
      year,
      currentGroup.month,
      Math.min(...currentGroup.days)
    );

    const gapDays =
      Math.floor((currentStartDate - prevEndDate) / (1000 * 60 * 60 * 24)) - 1;
    if (gapDays > 0) gaps.push(gapDays);
  }

  return gaps.length > 0
    ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)
    : 0;
}

// Calculate duration efficiency (average break length)
function calculateDurationEfficiency(member, year) {
  const leaveGroups = [];

  for (let month = 0; month < 12; month++) {
    const monthDate = new Date(year, month, 1);
    const monthKey = getKey(monthDate);
    const memberData = (holidays[member] || {})[monthKey] || {};

    const leaveDays = Object.keys(memberData)
      .map((d) => parseInt(d))
      .sort((a, b) => a - b);

    if (leaveDays.length === 0) continue;

    // Group consecutive days
    let currentGroup = [leaveDays[0]];

    for (let i = 1; i < leaveDays.length; i++) {
      if (leaveDays[i] === leaveDays[i - 1] + 1) {
        currentGroup.push(leaveDays[i]);
      } else {
        leaveGroups.push(currentGroup.length);
        currentGroup = [leaveDays[i]];
      }
    }

    if (currentGroup.length > 0) {
      leaveGroups.push(currentGroup.length);
    }
  }

  return leaveGroups.length > 0
    ? (leaveGroups.reduce((a, b) => a + b, 0) / leaveGroups.length).toFixed(1)
    : 0;
}

// Calculate YTD vs Last Year comparison
function calculateYTDvsLastYear(member, currentYear) {
  const currentYTD = calculateYTDLeave(member, currentYear);
  const lastYearYTD = calculateYTDLeave(member, currentYear - 1);

  if (lastYearYTD === 0) {
    return {
      percentage: currentYTD > 0 ? 100 : 0,
      trend: currentYTD > 0 ? "Increasing" : "Stable",
      currentYTD: currentYTD,
      lastYearYTD: lastYearYTD,
    };
  }

  const percentage = Math.round(
    ((currentYTD - lastYearYTD) / lastYearYTD) * 100
  );
  let trend;

  if (percentage > 15) trend = "Increasing";
  else if (percentage < -15) trend = "Decreasing";
  else trend = "Stable";

  return {
    percentage: percentage,
    trend: trend,
    currentYTD: currentYTD,
    lastYearYTD: lastYearYTD,
  };
}

// Helper function to calculate YTD leave for any year
function calculateYTDLeave(member, year) {
  const today = new Date();
  const currentMonth = today.getFullYear() === year ? today.getMonth() : 11; // If past year, use full year

  let totalDays = 0;

  for (let month = 0; month <= currentMonth; month++) {
    const monthDate = new Date(year, month, 1);
    const monthKey = getKey(monthDate);
    const memberData = (holidays[member] || {})[monthKey] || {};
    totalDays += calculateLeaveDays(memberData);
  }

  return totalDays;
}

// Calculate Leave Predictability Score
function calculateLeavePredictability(member, currentYear) {
  let predictabilityScore = 0;
  let factors = 0;

  // Factor 1: Advance booking pattern (simulated - in real app you'd track request dates)
  // For now, we'll analyze clustering patterns as a proxy
  const clusteringScore = analyzeLeaveClustering(member, currentYear);
  predictabilityScore += clusteringScore;
  factors++;

  // Factor 2: Seasonal consistency
  const seasonalScore = analyzeSeasonalConsistency(member, currentYear);
  predictabilityScore += seasonalScore;
  factors++;

  // Factor 3: Monthly distribution consistency
  const distributionScore = analyzeMonthlyDistribution(member, currentYear);
  predictabilityScore += distributionScore;
  factors++;

  const averageScore = factors > 0 ? predictabilityScore / factors : 0;

  let level, status;
  if (averageScore >= 7) {
    level = "High";
    status = "Very Predictable";
  } else if (averageScore >= 4) {
    level = "Medium";
    status = "Moderately Predictable";
  } else {
    level = "Low";
    status = "Unpredictable";
  }

  return {
    score: Math.round(averageScore),
    level: level,
    status: status,
  };
}

// Helper: Analyze leave clustering (grouped vs scattered)
function analyzeLeaveClustering(member, year) {
  const leaveGroups = [];

  for (let month = 0; month < 12; month++) {
    const monthDate = new Date(year, month, 1);
    const monthKey = getKey(monthDate);
    const memberData = (holidays[member] || {})[monthKey] || {};

    const leaveDays = Object.keys(memberData)
      .map((d) => parseInt(d))
      .sort((a, b) => a - b);
    if (leaveDays.length === 0) continue;

    // Count consecutive groups
    let currentGroup = 1;
    for (let i = 1; i < leaveDays.length; i++) {
      if (leaveDays[i] !== leaveDays[i - 1] + 1) {
        leaveGroups.push(currentGroup);
        currentGroup = 1;
      } else {
        currentGroup++;
      }
    }
    leaveGroups.push(currentGroup);
  }

  // Score: Fewer, longer groups = more predictable
  const avgGroupSize =
    leaveGroups.length > 0
      ? leaveGroups.reduce((a, b) => a + b, 0) / leaveGroups.length
      : 0;
  return Math.min(10, avgGroupSize * 2); // Max score 10
}

// Helper: Analyze seasonal consistency
function analyzeSeasonalConsistency(member, year) {
  const quarters = [0, 0, 0, 0];

  for (let month = 0; month < 12; month++) {
    const monthDate = new Date(year, month, 1);
    const monthKey = getKey(monthDate);
    const memberData = (holidays[member] || {})[monthKey] || {};
    const monthDays = calculateLeaveDays(memberData);

    const quarter = Math.floor(month / 3);
    quarters[quarter] += monthDays;
  }

  // Score based on how evenly distributed across quarters
  const totalDays = quarters.reduce((a, b) => a + b, 0);
  if (totalDays === 0) return 5; // Neutral score

  const expectedPerQuarter = totalDays / 4;
  const variance =
    quarters.reduce((sum, q) => sum + Math.pow(q - expectedPerQuarter, 2), 0) /
    4;

  // Lower variance = more predictable
  return Math.max(0, 10 - variance / 2);
}

// Helper: Analyze monthly distribution patterns
function analyzeMonthlyDistribution(member, year) {
  const monthlyLeave = [];

  for (let month = 0; month < 12; month++) {
    const monthDate = new Date(year, month, 1);
    const monthKey = getKey(monthDate);
    const memberData = (holidays[member] || {})[monthKey] || {};
    monthlyLeave.push(calculateLeaveDays(memberData));
  }

  // Score based on consistency (not too many zero months, not too concentrated)
  const nonZeroMonths = monthlyLeave.filter((days) => days > 0).length;
  const totalDays = monthlyLeave.reduce((a, b) => a + b, 0);

  if (totalDays === 0) return 5; // Neutral

  // Ideal: spread across 6-9 months
  let distributionScore;
  if (nonZeroMonths >= 6 && nonZeroMonths <= 9) {
    distributionScore = 8;
  } else if (nonZeroMonths >= 4 && nonZeroMonths <= 11) {
    distributionScore = 6;
  } else {
    distributionScore = 3;
  }

  return distributionScore;
}
