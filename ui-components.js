// ===================================================================
// SIMPLIFIED UI COMPONENTS MODULE
// Basic UI components and interactions without complex features
// ===================================================================

function populateUserDropdown() {
  if (!userSelect) return;

  // Clear existing options
  userSelect.innerHTML = "";

  // Add team members as options
  teamMembers.forEach((member) => {
    const option = document.createElement("option");
    option.value = member;
    option.textContent = member;
    userSelect.appendChild(option);
  });

  // Set current user
  if (teamMembers.length > 0) {
    currentUser = teamMembers[0];
    userSelect.value = currentUser;
  }
}

function renderMemberList() {
  const memberList = document.getElementById("memberList");
  if (!memberList) return;

  memberList.innerHTML = "";

  if (teamMembers.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.textContent = "No team members added yet";
    emptyMessage.style.fontStyle = "italic";
    emptyMessage.style.color = "#666";
    memberList.appendChild(emptyMessage);
    return;
  }

  teamMembers.forEach((member) => {
    const listItem = document.createElement("li");

    const nameSpan = document.createElement("span");
    nameSpan.textContent = member;
    listItem.appendChild(nameSpan);

    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    removeButton.className = "btn btn-danger btn-small";
    removeButton.onclick = () => removeMember(member);
    listItem.appendChild(removeButton);

    memberList.appendChild(listItem);
  });
}

async function addMember() {
  const input = document.getElementById("newMemberName");
  if (!input) return;

  const name = input.value.trim();

  if (!name) {
    showMessage("Please enter a member name", "error");
    return;
  }

  if (teamMembers.includes(name)) {
    showMessage("Member already exists", "error");
    return;
  }

  // Add member
  teamMembers.push(name);

  // Update UI
  populateUserDropdown();
  renderMemberList();
  updateDashboard();

  // Save data
  try {
    await saveToGoogleSheets("teamMembers");
  } catch (error) {
    console.error("Google Sheets save failed, using localStorage:", error);
    saveToLocalStorage();
  }

  // Clear input
  input.value = "";

  showMessage(`✅ Added ${name} to the team`);
}

async function removeMember(memberName) {
  if (
    !confirm(
      `Are you sure you want to remove ${memberName} from the team? This will also delete all their holiday data.`
    )
  ) {
    return;
  }

  // Remove member from team
  const index = teamMembers.indexOf(memberName);
  if (index > -1) {
    teamMembers.splice(index, 1);
  }

  // Remove member's holiday data
  if (holidayData[memberName]) {
    delete holidayData[memberName];
  }

  // Update current user if needed
  if (currentUser === memberName && teamMembers.length > 0) {
    currentUser = teamMembers[0];
  }

  // Update UI
  populateUserDropdown();
  renderMemberList();
  clearSelectedDates();
  renderCalendar();
  updateDashboard();

  // Save data
  try {
    await saveToGoogleSheets("teamMembers");
  } catch (error) {
    console.error("Google Sheets save failed, using localStorage:", error);
    saveToLocalStorage();
  }

  showMessage(`✅ Removed ${memberName} from the team`);
}

function createModal(title, content, actions = []) {
  // Remove existing modal if any
  const existingModal = document.querySelector(".modal-overlay");
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
    `;

  // Create modal content
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.style.cssText = `
        background: white;
        border-radius: 10px;
        padding: 20px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;

  // Add title
  if (title) {
    const titleElement = document.createElement("h3");
    titleElement.textContent = title;
    titleElement.style.marginBottom = "15px";
    modal.appendChild(titleElement);
  }

  // Add content
  if (typeof content === "string") {
    const contentElement = document.createElement("div");
    contentElement.innerHTML = content;
    modal.appendChild(contentElement);
  } else {
    modal.appendChild(content);
  }

  // Add actions
  if (actions.length > 0) {
    const actionsContainer = document.createElement("div");
    actionsContainer.style.cssText = `
            margin-top: 20px;
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        `;

    actions.forEach((action) => {
      const button = document.createElement("button");
      button.textContent = action.text;
      button.className = `btn ${action.class || "btn-secondary"}`;
      button.onclick = () => {
        if (action.handler) {
          action.handler();
        }
        closeModal();
      };
      actionsContainer.appendChild(button);
    });

    modal.appendChild(actionsContainer);
  }

  // Close on overlay click
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) {
      closeModal();
    }
  });

  // Close on escape key
  document.addEventListener("keydown", function escapeHandler(e) {
    if (e.key === "Escape") {
      closeModal();
      document.removeEventListener("keydown", escapeHandler);
    }
  });

  function closeModal() {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  return { modal, overlay, close: closeModal };
}

function showHelpModal() {
  const helpContent = `
        <div style="line-height: 1.6;">
            <h4>How to Use the Holiday Tracker</h4>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li><strong>Select Team Member:</strong> Choose a team member from the dropdown</li>
                <li><strong>Select Dates:</strong> Click on calendar dates to select them</li>
                <li><strong>Save Holidays:</strong> Click "Save Holidays" to confirm your selection</li>
                <li><strong>Change Holiday Type:</strong> Right-click on a date to cycle through full day, morning, and afternoon</li>
                <li><strong>View Dashboard:</strong> Switch to the Dashboard tab to see team metrics</li>
                <li><strong>Manage Team:</strong> Use the Admin tab to add/remove team members</li>
            </ul>
            
            <h4>Legend</h4>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li>🏖️ Full day holiday</li>
                <li>⏰ Half day holiday (morning or afternoon)</li>
                <li>Blue highlight: Selected dates</li>
                <li>Gray background: Weekends</li>
            </ul>
        </div>
    `;

  createModal("Help", helpContent, [{ text: "Close", class: "btn-primary" }]);
}

// Setup keyboard shortcuts
document.addEventListener("keydown", function (e) {
  // Help modal (F1 or Ctrl+?)
  if (e.key === "F1" || (e.ctrlKey && e.key === "?")) {
    e.preventDefault();
    showHelpModal();
  }

  // Clear selection (Escape)
  if (e.key === "Escape" && !document.querySelector(".modal-overlay")) {
    clearSelectedDates();
  }

  // Save selection (Ctrl+S)
  if (e.ctrlKey && e.key === "s") {
    e.preventDefault();
    saveSelectedDates();
  }
});

async function clearAllData() {
  if (
    !confirm(
      "⚠️ WARNING: This will delete ALL holiday data, custom holidays, public holidays, birthdays, and anniversaries.\n\nTeam members will NOT be deleted.\n\nAre you sure you want to continue?"
    )
  ) {
    return;
  }

  // Second confirmation
  if (
    !confirm(
      "⚠️ FINAL WARNING: This action CANNOT be undone!\n\nClick OK to permanently delete all data."
    )
  ) {
    return;
  }

  try {
    // Clear all data EXCEPT team members
    holidayData = {};
    window.customHolidays = {};
    window.publicHolidays = {};
    window.birthdays = {};
    window.anniversaries = {};
    window.pendingHolidays = {};

    // Clear from localStorage
    localStorage.removeItem("holidays");
    localStorage.removeItem("customHolidays");
    localStorage.removeItem("publicHolidays");
    localStorage.removeItem("birthdays");
    localStorage.removeItem("anniversaries");

    // Save to Google Sheets
    try {
      await saveToGoogleSheets("all");
      showMessage("✅ All data cleared successfully (team members preserved)");
    } catch (error) {
      console.error("Error clearing data:", error);
      showMessage(
        "⚠️ Data cleared locally, but Google Sheets sync failed",
        "error"
      );
    }

    // Refresh UI
    renderCalendar();
    updateDashboard();
    renderGantt();
    renderExistingHolidaysList();
    renderSpecialDatesList();

    if (typeof updateSidePanelKPIs === "function") {
      updateSidePanelKPIs();
    }
  } catch (error) {
    console.error("Error in clearAllData:", error);
    showMessage("❌ Error clearing data: " + error.message, "error");
  }
}

function exportData() {
  try {
    // Create CSV content
    let csvContent = "";

    // ============================================
    // HOLIDAYS CSV
    // ============================================
    csvContent += "=== HOLIDAY DATA ===\n";
    csvContent += "Team Member,Year-Month,Day,Leave Type,Category\n";

    // Export holiday data
    Object.keys(holidayData).forEach((member) => {
      Object.keys(holidayData[member]).forEach((monthKey) => {
        Object.keys(holidayData[member][monthKey]).forEach((day) => {
          const leaveData = holidayData[member][monthKey][day];
          const [type, category = "PTO"] = leaveData.split("|");
          csvContent += `"${member}","${monthKey}","${day}","${type}","${category}"\n`;
        });
      });
    });

    csvContent += "\n\n";

    // ============================================
    // TEAM MEMBERS CSV
    // ============================================
    csvContent += "=== TEAM MEMBERS ===\n";
    csvContent += "Team Member\n";
    teamMembers.forEach((member) => {
      csvContent += `"${member}"\n`;
    });

    csvContent += "\n\n";

    // ============================================
    // CUSTOM HOLIDAYS CSV
    // ============================================
    if (
      window.customHolidays &&
      Object.keys(window.customHolidays).length > 0
    ) {
      csvContent += "=== CUSTOM HOLIDAYS ===\n";
      csvContent += "Date,Holiday Name\n";
      Object.keys(window.customHolidays).forEach((date) => {
        csvContent += `"${date}","${window.customHolidays[date]}"\n`;
      });
      csvContent += "\n\n";
    }

    // ============================================
    // PUBLIC HOLIDAYS CSV
    // ============================================
    if (
      window.publicHolidays &&
      Object.keys(window.publicHolidays).length > 0
    ) {
      csvContent += "=== PUBLIC HOLIDAYS ===\n";
      csvContent += "Date,Holiday Name,Region\n";
      Object.keys(window.publicHolidays).forEach((date) => {
        window.publicHolidays[date].forEach((holiday) => {
          csvContent += `"${date}","${holiday.name}","${holiday.region}"\n`;
        });
      });
      csvContent += "\n\n";
    }

    // ============================================
    // BIRTHDAYS CSV
    // ============================================
    if (window.birthdays && Object.keys(window.birthdays).length > 0) {
      csvContent += "=== BIRTHDAYS ===\n";
      csvContent += "Team Member,Birthday Date\n";
      Object.keys(window.birthdays).forEach((member) => {
        csvContent += `"${member}","${window.birthdays[member]}"\n`;
      });
      csvContent += "\n\n";
    }

    // ============================================
    // ANNIVERSARIES CSV
    // ============================================
    if (window.anniversaries && Object.keys(window.anniversaries).length > 0) {
      csvContent += "=== WORK ANNIVERSARIES ===\n";
      csvContent += "Team Member,Anniversary Date,Start Year\n";
      Object.keys(window.anniversaries).forEach((member) => {
        const annData = window.anniversaries[member];
        const date = annData.originalDate || annData;
        const year = annData.startYear || "";
        csvContent += `"${member}","${date}","${year}"\n`;
      });
    }

    // Create blob
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    // Generate filename with current date
    const date = new Date();
    const filename = `holiday-tracker-backup-${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}.csv`;

    link.href = url;
    link.download = filename;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showMessage(`✅ Data exported successfully as ${filename}`);
  } catch (error) {
    console.error("Error exporting data:", error);
    showMessage("❌ Error exporting data: " + error.message, "error");
  }
}

// Make functions globally available
window.populateUserDropdown = populateUserDropdown;
window.renderMemberList = renderMemberList;
window.addMember = addMember;
window.removeMember = removeMember;
window.createModal = createModal;
window.showHelpModal = showHelpModal;
window.clearAllData = clearAllData;
window.exportData = exportData;
