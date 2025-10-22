// ===================================================================
// GANTT CHART MODULE
// Beautiful team holiday visualization under calendar
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
  // Create header
  let html = "<thead><tr><th>Team Member</th>";
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    const isWeekendDay = isWeekend(currentDate);
    let headerClasses = [];

    if (isWeekendDay) {
      headerClasses.push("weekend");
    }

    // Check for public holidays in header
    const dateKey = formatDate(currentDate);
    const publicHolidays = getAllHolidaysForDate(currentDate);

    publicHolidays.forEach((holiday) => {
      if (holiday.region === "US") headerClasses.push("us-holiday");
      if (holiday.region === "UK") headerClasses.push("uk-holiday");
      if (holiday.region === "IN") headerClasses.push("in-holiday");
    });

    if (window.customHolidays && window.customHolidays[dateKey]) {
      headerClasses.push("custom-holiday");
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

      const holiday = memberData.holidayDates.find((h) => {
        const holidayDate = new Date(h.date);
        return holidayDate.getDate() === day;
      });

      let cellContent = "";
      if (holiday) {
        const category = holiday.category || "PTO";
        let cellClass = "gantt-day-cell ";

        // Add type class
        if (holiday.type === "full") cellClass += "full-day ";
        else if (holiday.type === "morning") cellClass += "morning-half ";
        else if (holiday.type === "afternoon") cellClass += "afternoon-half ";

        // Add category class
        cellClass += `category-${category.toLowerCase()}`;

        cellContent = `<div class="${cellClass}"></div>`;
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
