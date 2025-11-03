// ===================================================================
// GANTT CHART MODULE
// team holiday visualization under calendar
// ===================================================================

// Simple Gantt Chart Renderer
function renderGantt() {
  const ganttTable = document.getElementById("ganttTable");
  if (!ganttTable) {
    console.log("Gantt table element not found");
    return;
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Create header
  let html = "<thead><tr><th>Team Member</th>";
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    const isWeekendDay = isWeekend(currentDate);
    let headerClasses = [];

    if (isWeekendDay) {
      headerClasses.push("weekend");
    }

    // Check if this is today
    const today = new Date();
    if (
      currentDate.getDate() === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    ) {
      headerClasses.push("today");
    }

    // Check for public holidays in header
    const dateKey = formatDate(currentDate);
    const publicHolidays = getAllHolidaysForDate(currentDate);

    const holidayRegions = [];
    publicHolidays.forEach((holiday) => {
      if (holiday.region === "US") holidayRegions.push("us");
      if (holiday.region === "UK") holidayRegions.push("uk");
      if (holiday.region === "IN") holidayRegions.push("in");
    });

    if (window.customHolidays && window.customHolidays[dateKey]) {
      holidayRegions.push("custom");
    }

    // Add multi-holiday class if multiple holidays
    if (holidayRegions.length > 1) {
      headerClasses.push("multi-holiday");
      headerClasses.push(`multi-${holidayRegions.sort().join("-")}`);
    } else if (holidayRegions.length === 1) {
      headerClasses.push(`${holidayRegions[0]}-holiday`);
    }
    const classString =
      headerClasses.length > 0 ? ` class="${headerClasses.join(" ")}"` : "";
    html += `<th${classString}>${day}</th>`;
  }
  html += "<th>Total</th></tr></thead><tbody>";

  // Create rows for each team member
  teamMembers.forEach((member) => {
    const memberData = calculateMemberHolidays(member, year, month);
    html += `<tr><td>${member}</td>`;

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const isWeekendDay = isWeekend(currentDate);
      let cellClasses = [];

      if (isWeekendDay) {
        cellClasses.push("weekend");
      }

      // Check for public holidays
      const dateKey = formatDate(currentDate);
      const publicHolidays = getAllHolidaysForDate(currentDate);

      publicHolidays.forEach((holiday) => {
        if (holiday.region === "US") cellClasses.push("us-holiday");
        if (holiday.region === "UK") cellClasses.push("uk-holiday");
        if (holiday.region === "IN") cellClasses.push("in-holiday");
      });

      // Check custom holidays
      if (window.customHolidays && window.customHolidays[dateKey]) {
        cellClasses.push("custom-holiday");
      }

      // ✅ FIXED: Parse date string manually without timezone conversion
      const holiday = memberData.holidayDates.find((h) => {
        const [yearPart, monthPart, dayPart] = h.date.split("-").map(Number);
        return dayPart === day;
      });

      let holidaySquare = "";
      let specialIcons = "";

      // Check for holiday square
      if (holiday) {
        const category = holiday.category || "PTO";
        let cellClass = "gantt-day-cell ";

        // Add type class
        if (holiday.type === "full") cellClass += "full-day ";
        else if (holiday.type === "morning") cellClass += "morning-half ";
        else if (holiday.type === "afternoon") cellClass += "afternoon-half ";

        // Add category class
        cellClass += `category-${category.toLowerCase()}`;

        holidaySquare = `<div class="${cellClass}"></div>`;
      }

      // Check for birthdays
      if (window.birthdays && window.birthdays[member]) {
        const birthDate = window.birthdays[member];
        const [birthYear, birthMonth, birthDay] = birthDate
          .split("-")
          .map(Number);
        if (birthMonth - 1 === month && birthDay === day) {
          specialIcons +=
            '<span class="gantt-special-icon birthday-icon">🎂</span>';
        }
      }

      // Check for anniversaries
      if (window.anniversaries && window.anniversaries[member]) {
        let anniversaryData = window.anniversaries[member];
        let anniversaryDate;

        // Handle both string and object formats
        if (typeof anniversaryData === "string") {
          anniversaryDate = anniversaryData;
        } else {
          anniversaryDate =
            anniversaryData.originalDate ||
            `${anniversaryData.startYear}-${anniversaryData.monthDay}`;
        }

        const [annYear, annMonth, annDay] = anniversaryDate
          .split("-")
          .map(Number);
        if (annMonth - 1 === month && annDay === day) {
          specialIcons +=
            '<span class="gantt-special-icon anniversary-icon">🏆</span>';
        }
      }

      // Build final cell content
      let cellContent = "";
      if (holidaySquare || specialIcons) {
        cellContent = '<div class="gantt-cell-content">';
        if (holidaySquare) cellContent += holidaySquare;
        if (specialIcons)
          cellContent += `<div class="gantt-special-icons">${specialIcons}</div>`;
        cellContent += "</div>";
      }

      const classString =
        cellClasses.length > 0 ? ` class="${cellClasses.join(" ")}"` : "";
      html += `<td${classString}>${cellContent}</td>`;
    }

    html += `<td><span class="total-badge">${memberData.totalDays}</span></td></tr>`;
  });

  html += "</tbody>";
  ganttTable.innerHTML = html;

  console.log("Gantt rendered successfully");
}

window.renderGantt = renderGantt;

// Export functions
window.renderGantt = renderGantt;
