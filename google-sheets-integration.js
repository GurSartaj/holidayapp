// ═══════════════════════════════════════════════════════════════════
// GOOGLE SHEETS INTEGRATION - UPDATED FOR SIMPLIFIED APP
// Adapted to work with holidayData instead of holidays
// ═══════════════════════════════════════════════════════════════════

// Configuration - Update these URLs with your actual values
const GOOGLE_SHEET_ID = "15__VjTNQa2h2KHaZQ6PBAroPVcVgn762fSmgUZQ6Sco";
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwI5IXFiCw8bxW4QQQGQ457srM21F8I4UEARhwUCrF8iSjeHx95V43Zs5AUOopkNTFc5Q/exec";

// ═══════════════════════════════════════════════════════════════════
// CORE SYNC FUNCTIONS
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

    // Transform backend data structure to match your app's expected format
    const cleanData = {
      holidayData: data.holidays || {}, // Backend uses 'holidays', app expects 'holidayData'
      teamMembers: data.teamMembers || [...window.DEFAULT_TEAM_MEMBERS],
      customHolidays: data.customHolidays || {},
      specialDates: data.specialDates || { birthdays: {}, anniversaries: {} },
      publicHolidays: data.publicHolidays || {},
      memberProfiles: data.memberProfiles || {},
    };

    // Extract special dates for global variables
    if (cleanData.specialDates.birthdays) {
      cleanData.birthdays = cleanData.specialDates.birthdays;
    }
    if (cleanData.specialDates.anniversaries) {
      cleanData.anniversaries = cleanData.specialDates.anniversaries;
    }

    showSyncStatus("synced");
    return cleanData;
  } catch (error) {
    console.error("Error loading from Google Sheets:", error);
    showSyncStatus("error");
    return loadFromLocalStorage(); // Fallback to local
  }
}

// Save data to Google Sheets
function saveToGoogleSheets(dataType = "all", dataObject = null) {
  return (async () => {
    const url = APPS_SCRIPT_URL;
    if (!url) throw new Error("APPS_SCRIPT_URL missing");

    // Build data object - translate from app variables to backend format
    const data = {};

    if (dataType === "memberProfiles") {
      data.memberProfiles = dataObject ?? window.memberProfiles ?? {};
    } else if (dataType === "teamMembers") {
      data.teamMembers = dataObject ?? teamMembers ?? [];
    } else if (dataType === "holidays") {
      // App uses 'holidayData', backend expects 'holidays'
      data.holidays = dataObject ?? holidayData ?? {};
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
      // Complete sync - translate all variables
      data.holidays = holidayData ?? {}; // App variable to backend format
      data.teamMembers = teamMembers ?? [];
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

    showSyncStatus("syncing");

    try {
      // Smart transport logic
      const isLarge =
        dataType === "holidays" ||
        dataType === "all" ||
        payloadStr.length > 1800;

      if (!isLarge) {
        // GET path for small payloads
        const qs = new URLSearchParams({
          action: "write",
          dataType,
          payload: JSON.stringify(data),
        });
        const res = await fetch(`${url}?${qs.toString()}`, { method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        showSyncStatus("synced");
        saveToLocalStorage(dataType);
        return json;
      } else {
        // POST path for large payloads
        await fetch(url, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: payloadStr,
        });

        showSyncStatus("synced");
        saveToLocalStorage(dataType);
        return { success: true, transport: "post-no-cors" };
      }
    } catch (err) {
      console.error("saveToGoogleSheets error:", err);
      showSyncStatus("error");
      throw err;
    }
  })();
}

// ═══════════════════════════════════════════════════════════════════
// LOCAL STORAGE BACKUP FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function loadFromLocalStorage() {
  return {
    holidayData: JSON.parse(localStorage.getItem("holidays") || "{}"), // Note: localStorage uses 'holidays' key
    teamMembers: JSON.parse(localStorage.getItem("teamMembers") || "[]"),
    customHolidays: JSON.parse(localStorage.getItem("customHolidays") || "{}"),
    birthdays: JSON.parse(localStorage.getItem("birthdays") || "{}"),
    anniversaries: JSON.parse(localStorage.getItem("anniversaries") || "{}"),
    publicHolidays: JSON.parse(localStorage.getItem("publicHolidays") || "{}"),
    memberProfiles: JSON.parse(localStorage.getItem("memberProfiles") || "{}"),
  };
}

function saveToLocalStorage(dataType = "all") {
  if (dataType === "all" || dataType === "holidays") {
    localStorage.setItem("holidays", JSON.stringify(holidayData || {}));
  }
  if (dataType === "all" || dataType === "teamMembers") {
    localStorage.setItem("teamMembers", JSON.stringify(teamMembers || []));
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
  if (dataType === "all" || dataType === "publicHolidays") {
    localStorage.setItem(
      "publicHolidays",
      JSON.stringify(window.publicHolidays || {})
    );
  }
  if (dataType === "all" || dataType === "memberProfiles") {
    localStorage.setItem(
      "memberProfiles",
      JSON.stringify(window.memberProfiles || {})
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// SYNC STATUS INDICATOR
// ═══════════════════════════════════════════════════════════════════

function showSyncStatus(status) {
  let indicator = document.getElementById("sync-indicator");

  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id = "sync-indicator";
    document.body.appendChild(indicator);
  }

  indicator.className = "";

  switch (status) {
    case "syncing":
      indicator.className = "syncing";
      indicator.innerHTML = `
        <div class="sync-dot syncing"></div>
        <span>Syncing with Google Sheets...</span>
      `;
      indicator.style.display = "flex";
      break;
    case "synced":
      indicator.className = "synced";
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
      indicator.className = "error";
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

// ═══════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════

// Check online status
if (navigator.onLine) {
  console.log("✅ Google Sheets Integration loaded successfully");
  console.log("🌐 Online mode - Google Sheets sync enabled");
} else {
  console.log("📴 Offline mode - using localStorage only");
}

// Listen for online/offline events
window.addEventListener("online", () => {
  console.log("🌐 Back online - syncing with Google Sheets...");
  loadFromGoogleSheets();
});

window.addEventListener("offline", () => {
  console.log("📴 Gone offline - using localStorage");
});

// Export functions globally
window.loadFromGoogleSheets = loadFromGoogleSheets;
window.saveToGoogleSheets = saveToGoogleSheets;
window.showSyncStatus = showSyncStatus;
