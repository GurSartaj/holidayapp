// ═══════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// Helper functions and utilities used throughout the application
// ═══════════════════════════════════════════════════════════════════

// Date formatting utilities
function getKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
}

// Ordinal number formatting
function getOrdinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Helper function to get the staging key for current user/month
function getPendingKey() {
  const user = document.getElementById("userSelect").value;
  const monthKey = getKey(viewDate);
  return `${user}-${monthKey}`;
}

// Animation utility
function animateCountUp(id, target, suffix = "") {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const increment = Math.ceil(
    target / (window.UI_CONFIG?.COUNT_UP_INCREMENT_DIVISOR || 60)
  );
  function update() {
    current += increment;
    if (current > target) current = target;
    el.textContent = current + suffix;
    if (current < target) requestAnimationFrame(update);
  }
  update();
}

// Format member lists for display
function formatMemberList(names) {
  if (names.length <= 3) {
    return names.join(", ");
  } else {
    const columns = names.length >= 9 ? 3 : 2;
    return `
      <div style="
        display: grid; 
        grid-template-columns: repeat(${columns}, 1fr); 
        gap: 2px 12px; 
        text-align: left; 
        margin: 4px 0 0 0;
      ">
        ${names.map((name) => `<span>${name}</span>`).join("")}
      </div>
    `;
  }
}

// Working days calculation
function getWorkingDaysInMonth(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let workingDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
  }

  return workingDays;
}

// Holiday checking utilities
function isHoliday(date) {
  const year = date.getFullYear();
  const key = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

  const allHolidays = getAllHolidaysForYear(year);
  const holidaysArr = allHolidays[key] ? [...allHolidays[key]] : [];
  if (customHolidays[key]) {
    holidaysArr.push({
      name: customHolidays[key],
      region: "Custom",
    });
  }

  return holidaysArr;
}

// New Year UI Reset utility
function ensureNewYearUIReset() {
  const nowYear = new Date().getFullYear();
  const lastSeenYear = parseInt(
    localStorage.getItem("lastSeenYear") || "0",
    10
  );

  if (lastSeenYear !== nowYear) {
    window.currentDashboardView =
      window.DASHBOARD_CONFIG?.DEFAULT_VIEW || "monthly";
    window.selectedAnnualMember = null;

    const annualFilter = document.getElementById("annualMemberFilter");
    if (annualFilter) annualFilter.value = "";

    const yrSel = document.getElementById("yearFilter");
    if (yrSel) {
      if (typeof populateYearFilter === "function") populateYearFilter();
      Array.from(yrSel.options).forEach((opt) => {
        if (opt.value === String(nowYear)) yrSel.selected = true;
      });
    }

    localStorage.setItem("lastSeenYear", String(nowYear));
  }
}

// ═══════════════════════════════════════════════════════════════════
// INPUT SANITIZATION UTILITIES
// ═══════════════════════════════════════════════════════════════════

/**
 * Sanitizes user input to prevent XSS and formula injection
 * @param {string} input - User input to sanitize
 * @param {object} options - Sanitization options
 * @returns {string} - Sanitized input
 */
function sanitizeInput(input, options = {}) {
  if (typeof input !== "string") return input;

  let sanitized = input.trim();

  // Prevent formula injection for Google Sheets
  if (options.preventFormulas !== false) {
    if (
      sanitized.startsWith("=") ||
      sanitized.startsWith("+") ||
      sanitized.startsWith("-") ||
      sanitized.startsWith("@")
    ) {
      sanitized = "'" + sanitized; // Prefix with single quote to treat as text
    }
  }

  // Length limits to prevent UI breaking
  if (options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, "");

  return sanitized;
}

/**
 * Safely creates a text node with sanitized content
 * @param {string} text - Text to display
 * @returns {Text} - Safe text node
 */
function createSafeTextNode(text) {
  return document.createTextNode(sanitizeInput(text));
}

// Make functions globally available
window.sanitizeInput = sanitizeInput;
window.createSafeTextNode = createSafeTextNode;
