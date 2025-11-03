// ═══════════════════════════════════════════════════════════════════
// GOOGLE SHEETS INTEGRATION
//
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
      holidayData: data.holidays || {},
      teamMembers: data.teamMembers || [...window.DEFAULT_TEAM_MEMBERS],
      customHolidays: data.customHolidays || {},
      specialDates: data.specialDates || { birthdays: {}, anniversaries: {} },
      publicHolidays: data.publicHolidays || {},
      memberProfiles: data.memberProfiles || {},
      categoryData: data.categoryData || {},
    };

    // Extract special dates for global variables - WITH TIMEZONE PROTECTION
    if (cleanData.specialDates.birthdays) {
      cleanData.birthdays = {};
      Object.entries(cleanData.specialDates.birthdays).forEach(
        ([member, birthDate]) => {
          if (typeof birthDate === "string" && birthDate.includes("-")) {
            cleanData.birthdays[member] = birthDate;
          } else if (
            birthDate instanceof Date ||
            typeof birthDate === "object"
          ) {
            const dateObj = new Date(birthDate);
            const year = dateObj.getUTCFullYear();
            const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
            const day = String(dateObj.getUTCDate()).padStart(2, "0");
            cleanData.birthdays[member] = `${year}-${month}-${day}`;
          } else {
            cleanData.birthdays[member] = birthDate;
          }
        }
      );
    }

    if (cleanData.specialDates.anniversaries) {
      cleanData.anniversaries = {};
      Object.entries(cleanData.specialDates.anniversaries).forEach(
        ([member, anniversaryData]) => {
          if (typeof anniversaryData === "string") {
            cleanData.anniversaries[member] = anniversaryData;
          } else if (anniversaryData && typeof anniversaryData === "object") {
            if (anniversaryData.originalDate) {
              if (typeof anniversaryData.originalDate === "string") {
                cleanData.anniversaries[member] = anniversaryData;
              } else {
                const dateObj = new Date(anniversaryData.originalDate);
                const year = dateObj.getUTCFullYear();
                const month = String(dateObj.getUTCMonth() + 1).padStart(
                  2,
                  "0"
                );
                const day = String(dateObj.getUTCDate()).padStart(2, "0");
                cleanData.anniversaries[member] = {
                  ...anniversaryData,
                  originalDate: `${year}-${month}-${day}`,
                };
              }
            } else {
              cleanData.anniversaries[member] = anniversaryData;
            }
          }
        }
      );
    }

    // ✅ CRITICAL FIX: Sync localStorage with Google Sheets data
    // This ensures localStorage is ALWAYS up-to-date with the source of truth
    syncLocalStorageWithCleanData(cleanData);

    showSyncStatus("synced");
    return cleanData;
  } catch (error) {
    console.error("Error loading from Google Sheets:", error);
    showSyncStatus("error");

    // Only use localStorage as fallback if we're truly offline or can't reach server
    console.warn("⚠️ Using stale localStorage data - you may be offline");
    return loadFromLocalStorage();
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
      data.categoryData = window.categoryData ?? {};
    }

    const payload = { action: "write", dataType, data };
    const payloadStr = JSON.stringify(payload);

    // 🔍 DEBUG - Remove after testing
    console.log("=== SAVE DEBUG ===");
    console.log("dataType:", dataType);
    console.log("dataObject passed:", dataObject);
    console.log("data being sent:", data);
    console.log("payload size:", payloadStr.length);
    console.log("==================");

    showSyncStatus("syncing");

    try {
      const isLarge = payloadStr.length > 8000;

      if (!isLarge) {
        // GET path for small payloads - USE SAME FORMAT AS POST
        const qs = new URLSearchParams({
          action: "write",
          dataType,
          payload: JSON.stringify(data), // Changed from 'payload' to 'data'
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
    holidayData: JSON.parse(localStorage.getItem("holidays") || "{}"),
    teamMembers: JSON.parse(localStorage.getItem("teamMembers") || "[]"),
    customHolidays: JSON.parse(localStorage.getItem("customHolidays") || "{}"),
    birthdays: JSON.parse(localStorage.getItem("birthdays") || "{}"),
    anniversaries: JSON.parse(localStorage.getItem("anniversaries") || "{}"),
    publicHolidays: JSON.parse(localStorage.getItem("publicHolidays") || "{}"),
    memberProfiles: JSON.parse(localStorage.getItem("memberProfiles") || "{}"),
    categoryData: JSON.parse(localStorage.getItem("categoryData") || "{}"),
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
  if (dataType === "all" || dataType === "categoryData") {
    localStorage.setItem(
      "categoryData",
      JSON.stringify(window.categoryData || {})
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

// ═══════════════════════════════════════════════════════════════════
// SYNC LOCAL STORAGE WITH GOOGLE SHEETS DATA
// This ensures localStorage is always the same as Google Sheets
// ═══════════════════════════════════════════════════════════════════

function syncLocalStorageWithCleanData(cleanData) {
  // Overwrite ALL localStorage with fresh Google Sheets data
  localStorage.setItem("holidays", JSON.stringify(cleanData.holidayData || {}));
  localStorage.setItem(
    "teamMembers",
    JSON.stringify(cleanData.teamMembers || [])
  );
  localStorage.setItem(
    "customHolidays",
    JSON.stringify(cleanData.customHolidays || {})
  );
  localStorage.setItem("birthdays", JSON.stringify(cleanData.birthdays || {}));
  localStorage.setItem(
    "anniversaries",
    JSON.stringify(cleanData.anniversaries || {})
  );
  localStorage.setItem(
    "publicHolidays",
    JSON.stringify(cleanData.publicHolidays || {})
  );
  localStorage.setItem(
    "memberProfiles",
    JSON.stringify(cleanData.memberProfiles || {})
  );
  localStorage.setItem(
    "categoryData",
    JSON.stringify(cleanData.categoryData || {})
  );

  // Store last sync timestamp
  localStorage.setItem("lastSyncTime", new Date().toISOString());

  console.log(
    "✅ localStorage synced with Google Sheets at",
    new Date().toLocaleString()
  );
}

// Export functions globally
window.loadFromGoogleSheets = loadFromGoogleSheets;
window.saveToGoogleSheets = saveToGoogleSheets;
window.showSyncStatus = showSyncStatus;
window.syncLocalStorageWithCleanData = syncLocalStorageWithCleanData;
