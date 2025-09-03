// ═══════════════════════════════════════════════════════════════════
// APPLICATION CONFIGURATION
// Central configuration for Holiday Tracker application
// ═══════════════════════════════════════════════════════════════════

// Google Sheets Integration Configuration
const GOOGLE_CONFIG = {
  SHEET_ID: "15__VjTNQa2h2KHaZQ6PBAroPVcVgn762fSmgUZQ6Sco",
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbwI5IXFiCw8bxW4QQQGQ457srM21F8I4UEARhwUCrF8iSjeHx95V43Zs5AUOopkNTFc5Q/exec",
};

// Application Timing Configuration
const APP_TIMING = {
  AUTO_RESET_DELAY: 120000, // 2 minutes for pending selections
  ANIMATION_DURATION: 300, // Standard animation duration
  SUCCESS_MESSAGE_DURATION: 2500, // How long success messages show
  INITIALIZATION_DELAY: 1000, // Delay for Google Sheets sync
  ADMIN_INIT_DELAY: 200, // Admin initialization delay
  ACCORDION_EXPAND_DELAY: 800, // Auto-expand accordion delay
  DEBUG_DELAY: 2000, // Debug function delay
};

// Team Configuration
const TEAM_CONFIG = {
  DEFAULT_MEMBERS: [
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
  ],
};

// Chart Configuration
const CHART_CONFIG = {
  // Chart.js defaults
  RESPONSIVE: true,
  MAINTAIN_ASPECT_RATIO: false,
  DEVICE_PIXEL_RATIO: 2,

  // Brand colors (pulled from CSS variables)
  COLORS: {
    PRIMARY: "#1976d2",
    SECONDARY: "#2196f3",
    SUCCESS: "#4caf50",
    WARNING: "#ff9800",
    DANGER: "#f44336",
    GREEN: "#22c55e",
    BLUE: "#3b82f6",
    ORANGE: "#f59e0b",
    RED: "#ef4444",
  },

  // Chart-specific color schemes
  DURATION_CHART_COLORS: {
    BACKGROUND: ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"],
    BORDER: ["#16a34a", "#2563eb", "#d97706", "#dc2626"],
  },
};

// Holiday Creator Configuration
const HOLIDAY_CONFIG = {
  COLORS: [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#eab308",
    "#84cc16",
    "#22c55e",
    "#10b981",
    "#14b8a6",
    "#06b6d4",
    "#0ea5e9",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#a855f7",
    "#d946ef",
    "#ec4899",
    "#f43f5e",
  ],

  ICONS: [
    "🎉",
    "🎊",
    "🎈",
    "🎁",
    "🎂",
    "🍰",
    "🥳",
    "🌟",
    "⭐",
    "✨",
    "🎯",
    "🏆",
    "🥇",
    "🎖️",
    "🏅",
    "👑",
    "🎭",
    "🎪",
    "🎨",
    "🎵",
    "🎶",
    "🎸",
    "🎤",
    "🎺",
  ],
};

// UI Configuration
const UI_CONFIG = {
  // Risk assessment threshold
  AVAILABILITY_THRESHOLD: 3,

  // Animation settings
  COUNT_UP_INCREMENT_DIVISOR: 60,

  // Grid and layout
  MEMBER_LIST_COLUMNS: {
    SMALL: 2,
    LARGE: 3,
  },

  // Gantt chart settings
  GANTT_RESPONSIVE_BREAKPOINT: 768,
};

// Dashboard Configuration
const DASHBOARD_CONFIG = {
  DEFAULT_VIEW: "monthly",
  CHART_ANIMATION_DELAY: 100,

  // KPI Card styling
  ACCORDION_COLORS: {
    MONTHLY_SUMMARY: "linear-gradient(90deg, #2196f3, #1976d2)",
    PUBLIC_HOLIDAYS: "linear-gradient(90deg, #ff9800, #f57c00)",
    TEAM_STATS: "linear-gradient(90deg, #4caf50, #388e3c)",
    TEAM_MEMBERS: "linear-gradient(90deg, #9c27b0, #7b1fa2)",
  },
};

// Make configuration globally available
window.GOOGLE_CONFIG = GOOGLE_CONFIG;
window.APP_TIMING = APP_TIMING;
window.TEAM_CONFIG = TEAM_CONFIG;
window.CHART_CONFIG = CHART_CONFIG;
window.HOLIDAY_CONFIG = HOLIDAY_CONFIG;
window.UI_CONFIG = UI_CONFIG;
window.DASHBOARD_CONFIG = DASHBOARD_CONFIG;
