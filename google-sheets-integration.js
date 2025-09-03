// ═══════════════════════════════════════════════════════════════════
// GOOGLE SHEETS INTEGRATION FOR TEAM HOLIDAY TRACKER
// ═══════════════════════════════════════════════════════════════════

// Configuration - REPLACE WITH YOUR ACTUAL VALUES
// Configuration loaded from config.js
const GOOGLE_SHEET_ID =
  window.GOOGLE_CONFIG?.SHEET_ID ||
  "15__VjTNQa2h2KHaZQ6PBAroPVcVgn762fSmgUZQ6Sco";
const APPS_SCRIPT_URL =
  window.GOOGLE_CONFIG?.APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbwI5IXFiCw8bxW4QQQGQ457srM21F8I4UEARhwUCrF8iSjeHx95V43Zs5AUOopkNTFc5Q/exec";
// ═══════════════════════════════════════════════════════════════════
// GOOGLE SHEETS API FUNCTIONS - Using Google Apps Script Web App
// ═══════════════════════════════════════════════════════════════════

// Load all data from Google Sheets
async function loadFromGoogleSheets() {
  try {
    showSyncStatus("syncing");

    const response = await fetch(`${APPS_SCRIPT_URL}?action=read`, {
      method: "GET",
      mode: "cors",
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();

    // Ensure all required data structures exist
    // Ensure all required data structures exist
    const cleanData = {
      holidays: data.holidays || {},
      teamMembers: data.teamMembers || [],
      customHolidays: data.customHolidays || {},
      specialDates: data.specialDates || { birthdays: {}, anniversaries: {} },
      publicHolidays: data.publicHolidays || {},
      memberProfiles: data.memberProfiles || {},
    };

    // Validate team members
    if (
      !Array.isArray(cleanData.teamMembers) ||
      cleanData.teamMembers.length === 0
    ) {
      cleanData.teamMembers = [
        "Amy Aleman",
        "Amy Mangner",
        "Angie Lawrence",
        "Daria Cullen",
        "Derrick Sprague",
        "Diana Derrington",
        "Eric Ham",
        "Gina Long",
        "Gur Singh",
        "Jess McCarthy",
        "Leslie Silkwood",
        "Matt Gramlich",
        "Sean Manion",
        "Tony Thornberry",
      ];
    }

    showSyncStatus("synced");
    return cleanData;
  } catch (error) {
    console.error("Error loading from Google Sheets:", error);
    showSyncStatus("error");
    return loadFromLocalStorage(); // Fallback to local
  }
}

// WRITE to Apps Script using GET only (no CORS preflight, no red errors)
// Smart transport: GET for small payloads, POST(no-cors) for large ones.
// Also drives the sync toast: "syncing" → "synced"/"error".
// Smart transport: GET for small payloads (no preflight), POST(no-cors) for large ones.
// Also drives the sync toast: "syncing" → "synced"/"error".
function saveToGoogleSheets(dataType = "all", dataObject = null) {
  return (async () => {
    const url = APPS_SCRIPT_URL;
    if (!url) throw new Error("APPS_SCRIPT_URL missing in config.js");

    // Build the minimal data object for this write
    const data = {};
    if (dataType === "memberProfiles") {
      data.memberProfiles = dataObject ?? window.memberProfiles ?? {};
    } else if (dataType === "teamMembers") {
      data.teamMembers = dataObject ?? window.teamMembers ?? [];
    } else if (dataType === "holidays") {
      data.holidays = dataObject ?? window.holidays ?? {};
    } else if (dataType === "customHolidays") {
      data.customHolidays = dataObject ?? window.customHolidays ?? {};
    } else if (dataType === "specialDates") {
      data.specialDates = dataObject ?? {
        birthdays: window.birthdays ?? {},
        anniversaries: window.anniversaries ?? {},
      };
    } else if (dataType === "publicHolidays") {
      data.publicHolidays = dataObject ?? window.publicHolidays ?? {};
    } else if (dataType === "all") {
      data.holidays = window.holidays ?? {};
      data.teamMembers = window.teamMembers ?? [];
      data.customHolidays = window.customHolidays ?? {};
      data.specialDates = {
        birthdays: window.birthdays ?? {},
        anniversaries: window.anniversaries ?? {},
      };
      data.publicHolidays = window.publicHolidays ?? {};
      data.memberProfiles = window.memberProfiles ?? {};
    }

    const payload = { action: "write", dataType, data };
    const payloadStr = JSON.stringify(payload);

    // show the syncing toast
    if (typeof showSyncStatus === "function") showSyncStatus("syncing");

    try {
      // Use POST(no-cors) for big writes (holidays/all or long payloads), else GET
      const isLarge =
        dataType === "holidays" ||
        dataType === "all" ||
        payloadStr.length > 1800; // conservative GET limit

      if (!isLarge) {
        // ---- GET path (no preflight; readable response)
        const qs = new URLSearchParams({
          action: "write",
          dataType,
          payload: JSON.stringify(data),
        });
        const res = await fetch(`${url}?${qs.toString()}`, { method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        if (typeof showSyncStatus === "function") showSyncStatus("synced");
        if (typeof saveToLocalStorage === "function")
          saveToLocalStorage(dataType);
        return json;
      } else {
        // ---- POST path (no-cors). We can't read the response, but write succeeds.
        await fetch(url, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: payloadStr,
        });

        // Optional verification: re-read shortly after (non-blocking)
        setTimeout(() => {
          try {
            if (typeof loadFromGoogleSheets === "function")
              loadFromGoogleSheets();
          } catch (_) {}
        }, 800);

        if (typeof showSyncStatus === "function") showSyncStatus("synced");
        if (typeof saveToLocalStorage === "function")
          saveToLocalStorage(dataType);
        return { success: true, transport: "post-no-cors" };
      }
    } catch (err) {
      console.error("saveToGoogleSheets error:", err);
      if (typeof showSyncStatus === "function") showSyncStatus("error");
      throw err;
    }
  })();
}

// ═══════════════════════════════════════════════════════════════════
// LOCAL STORAGE FUNCTIONS (Backup/Fallback)
// ═══════════════════════════════════════════════════════════════════

function loadFromLocalStorage() {
  return {
    holidays: JSON.parse(localStorage.getItem("holidays") || "{}"),
    teamMembers: JSON.parse(localStorage.getItem("teamMembers") || "[]"),
    customHolidays: JSON.parse(localStorage.getItem("customHolidays") || "{}"),
    specialDates: {
      birthdays: JSON.parse(localStorage.getItem("birthdays") || "{}"),
      anniversaries: JSON.parse(localStorage.getItem("anniversaries") || "{}"),
    },
  };
}

function saveToLocalStorage(dataType = "all") {
  if (dataType === "all" || dataType === "holidays") {
    localStorage.setItem("holidays", JSON.stringify(window.holidays || {}));
  }
  if (dataType === "all" || dataType === "teamMembers") {
    localStorage.setItem(
      "teamMembers",
      JSON.stringify(window.teamMembers || [])
    );
  }
  if (dataType === "all" || dataType === "customHolidays") {
    localStorage.setItem(
      "customHolidays",
      JSON.stringify(window.customHolidays || {})
    );
  }
  if (dataType === "all" || dataType === "specialDates") {
    localStorage.setItem("birthdays", JSON.stringify(window.birthdays || {}));
    localStorage.setItem(
      "anniversaries",
      JSON.stringify(window.anniversaries || {})
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// REPLACEMENT FUNCTIONS FOR EXISTING CODE
// ═══════════════════════════════════════════════════════════════════

// Replace the existing saveHolidays function
window.saveHolidaysToSheets = async function () {
  try {
    // Show loading indicator
    const saveBtn = document.getElementById("saveBtn");
    const originalText = saveBtn ? saveBtn.textContent : "";
    if (saveBtn) {
      saveBtn.textContent = "Saving...";
      saveBtn.disabled = true;
    }

    // Save to Google Sheets
    await saveToGoogleSheets("holidays");
    if (typeof showSavedToast === "function") showSavedToast();

    // Show success
    if (saveBtn) {
      saveBtn.textContent = "Saved! ✓";
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
      }, 2000);
    }
  } catch (error) {
    console.error("Error saving holidays:", error);
    alert("Error saving to Google Sheets. Data saved locally as backup.");

    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) {
      saveBtn.textContent = "Save Holidays";
      saveBtn.disabled = false;
    }
  }
};

// Replace the existing loadHolidays function
window.loadHolidaysFromSheets = async function () {
  try {
    const data = await loadFromGoogleSheets();

    return data;
  } catch (error) {
    console.error("Error loading holidays:", error);
    // Use localStorage data if already loaded
    return loadFromLocalStorage();
  }
};

// ═══════════════════════════════════════════════════════════════════
// SYNC STATUS INDICATOR
// ═══════════════════════════════════════════════════════════════════

// Add sync status indicator
function showSyncStatus(status) {
  let indicator = document.getElementById("sync-indicator");

  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id = "sync-indicator";
    document.body.appendChild(indicator);
  }

  // Clear existing classes first
  indicator.className = "";

  switch (status) {
    case "syncing":
      indicator.className = "syncing"; // Add the class
      indicator.innerHTML = `
        <div class="sync-dot syncing"></div>
        <span>Syncing with Google Sheets...</span>
      `;
      indicator.style.display = "flex";
      break;
    case "synced":
      indicator.className = "synced"; // Add the class
      indicator.innerHTML = `
        <div class="sync-dot synced"></div>
        <span>Synced ✓</span>
      `;
      indicator.style.display = "flex";
      setTimeout(() => {
        if (indicator) {
          indicator.style.opacity = "0";
          setTimeout(() => {
            if (indicator) {
              indicator.style.display = "none";
              indicator.style.opacity = "1";
            }
          }, 300);
        }
      }, 3000);
      break;
    case "error":
      indicator.className = "error"; // Add the class
      indicator.innerHTML = `
        <div class="sync-dot error"></div>
        <span>Sync error - using local storage</span>
      `;
      indicator.style.display = "flex";
      setTimeout(() => {
        if (indicator) {
          indicator.style.opacity = "0";
          setTimeout(() => {
            if (indicator) {
              indicator.style.display = "none";
              indicator.style.opacity = "1";
            }
          }, 300);
        }
      }, 5000);
      break;
  }
}

// Add pulse animation
if (!document.getElementById("sync-animation-styles")) {
  const style = document.createElement("style");
  style.id = "sync-animation-styles";
  style.textContent = `
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
    `;
  document.head.appendChild(style);
}

// ═══════════════════════════════════════════════════════════════════
// AUTO-SAVE FUNCTIONALITY
// ═══════════════════════════════════════════════════════════════════

// Debounced auto-save function
let autoSaveTimeout;
function triggerAutoSave(dataType) {
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    saveToGoogleSheets(dataType);
  }, 2000); // Wait 2 seconds after last change
}

// ═══════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════

// Check if we're online
if (navigator.onLine) {
  console.log("Google Sheets Integration loaded successfully");
  console.log("Online mode - Google Sheets sync enabled");
} else {
  console.log("Offline mode - using localStorage only");
}

// Listen for online/offline events
window.addEventListener("online", () => {
  console.log("Back online - syncing with Google Sheets...");
  loadFromGoogleSheets();
});

window.addEventListener("offline", () => {
  console.log("Gone offline - using localStorage");
});

// Export for debugging
window.debugSheets = {
  load: loadFromGoogleSheets,
  save: saveToGoogleSheets,
  status: showSyncStatus,
};
