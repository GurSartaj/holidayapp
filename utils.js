// ===================================================================
// SIMPLIFIED UTILITIES MODULE - FIXED
// Added missing getKey function and other utilities
// ===================================================================

// Date utilities
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(dateString) {
  // Parse YYYY-MM-DD format and create date in local timezone
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// MISSING FUNCTION - Add getKey function
function getKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

function isCurrentMonth(date) {
  // Always return true since we only show current month days now
  return true;
}

function getWorkingDaysInMonth(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let workingDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    if (!isWeekend(date)) {
      workingDays++;
    }
  }

  return workingDays;
}

function getDaysBetweenDates(startDate, endDate) {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  const firstDate = new Date(startDate);
  const secondDate = new Date(endDate);

  return Math.round(Math.abs((firstDate - secondDate) / oneDay));
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getMonthName(monthIndex) {
  return window.APP_CONFIG.CALENDAR.MONTHS[monthIndex];
}

function getDayName(dayIndex) {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[dayIndex];
}

// Array utilities
function groupBy(array, key) {
  return array.reduce((groups, item) => {
    const group = typeof key === "function" ? key(item) : item[key];
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {});
}

function sortBy(array, key, direction = "asc") {
  return [...array].sort((a, b) => {
    const aValue = typeof key === "function" ? key(a) : a[key];
    const bValue = typeof key === "function" ? key(b) : b[key];

    if (direction === "desc") {
      return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
    } else {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    }
  });
}

function unique(array) {
  return [...new Set(array)];
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// String utilities
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim("-");
}

function truncate(str, length, suffix = "...") {
  if (str.length <= length) return str;
  return str.substring(0, length) + suffix;
}

// Number utilities
function round(number, decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round(number * factor) / factor;
}

function clamp(number, min, max) {
  return Math.min(Math.max(number, min), max);
}

function percentage(part, total) {
  if (total === 0) return 0;
  return round((part / total) * 100, 1);
}

// Object utilities
function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map((item) => deepClone(item));

  const cloned = {};
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

function isEmpty(obj) {
  if (obj == null) return true;
  if (Array.isArray(obj) || typeof obj === "string") return obj.length === 0;
  return Object.keys(obj).length === 0;
}

function pick(obj, keys) {
  const result = {};
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

function omit(obj, keys) {
  const result = { ...obj };
  keys.forEach((key) => {
    delete result[key];
  });
  return result;
}

// Validation utilities
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

function isValidDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= end;
}

// Local storage utilities
function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Error saving to localStorage:", error);
    return false;
  }
}

function loadFromStorage(key, defaultValue = null) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error("Error loading from localStorage:", error);
    return defaultValue;
  }
}

function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error("Error removing from localStorage:", error);
    return false;
  }
}

// DOM utilities
function createElement(tag, className = "", textContent = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (textContent) element.textContent = textContent;
  return element;
}

function show(element) {
  if (element) element.style.display = "";
}

function hide(element) {
  if (element) element.style.display = "none";
}

function toggle(element) {
  if (element) {
    element.style.display = element.style.display === "none" ? "" : "none";
  }
}

// Animation utilities
function fadeIn(element, duration = 300) {
  if (!element) return;

  element.style.opacity = "0";
  element.style.display = "";

  let start = null;
  function animate(timestamp) {
    if (!start) start = timestamp;
    const progress = timestamp - start;
    const opacity = Math.min(progress / duration, 1);

    element.style.opacity = opacity;

    if (progress < duration) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

function fadeOut(element, duration = 300) {
  if (!element) return;

  let start = null;
  const initialOpacity = parseFloat(element.style.opacity) || 1;

  function animate(timestamp) {
    if (!start) start = timestamp;
    const progress = timestamp - start;
    const opacity = Math.max(initialOpacity - progress / duration, 0);

    element.style.opacity = opacity;

    if (progress < duration) {
      requestAnimationFrame(animate);
    } else {
      element.style.display = "none";
    }
  }

  requestAnimationFrame(animate);
}

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle utility
function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

function getOrdinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Export utilities to global scope
window.getKey = getKey; // FIXED: Export the missing getKey function
window.formatDate = formatDate;
window.parseDate = parseDate;
window.isWeekend = isWeekend;
window.isCurrentMonth = isCurrentMonth;
window.getWorkingDaysInMonth = getWorkingDaysInMonth;
window.getDaysBetweenDates = getDaysBetweenDates;
window.addDays = addDays;
window.getMonthName = getMonthName;
window.getDayName = getDayName;
window.groupBy = groupBy;
window.sortBy = sortBy;
window.unique = unique;
window.chunk = chunk;
window.capitalize = capitalize;
window.slugify = slugify;
window.truncate = truncate;
window.round = round;
window.clamp = clamp;
window.percentage = percentage;
window.deepClone = deepClone;
window.isEmpty = isEmpty;
window.pick = pick;
window.omit = omit;
window.isValidEmail = isValidEmail;
window.isValidDate = isValidDate;
window.isValidDateRange = isValidDateRange;
window.saveToStorage = saveToStorage;
window.loadFromStorage = loadFromStorage;
window.removeFromStorage = removeFromStorage;
window.createElement = createElement;
window.show = show;
window.hide = hide;
window.toggle = toggle;
window.fadeIn = fadeIn;
window.fadeOut = fadeOut;
window.debounce = debounce;
window.throttle = throttle;
window.getOrdinal = getOrdinal;
