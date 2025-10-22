// ===================================================================
// SIMPLIFIED CONFIGURATION - FIXED
// Essential configuration
// ===================================================================

// Default team members
window.DEFAULT_TEAM_MEMBERS = [
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

// Application timing settings
window.APP_TIMING = {
  AUTO_RESET_DELAY: 120000, // 2 minutes for pending selections
  SUCCESS_MESSAGE_DURATION: 2500,
};

// Application settings
window.APP_CONFIG = {
  // Local storage keys
  STORAGE_KEYS: {
    HOLIDAYS: "holidays",
    TEAM_MEMBERS: "teamMembers",
    CUSTOM_HOLIDAYS: "customHolidays",
    PUBLIC_HOLIDAYS: "publicHolidays",
    BIRTHDAYS: "birthdays",
    ANNIVERSARIES: "anniversaries",
    ENHANCED_HOLIDAYS: "enhancedCustomHolidays",
  },

  // Calendar settings
  CALENDAR: {
    FIRST_DAY_OF_WEEK: 0, // 0 = Sunday, 1 = Monday
    MONTHS: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    DAYS: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  },

  // Holiday types
  HOLIDAY_TYPES: {
    FULL: "full",
    MORNING: "morning",
    AFTERNOON: "afternoon",
  },
};

// Permanent public holidays (recurring yearly)
window.PERMANENT_HOLIDAYS = {
  "01-01": [
    { name: "New Year's Day", region: "UK" },
    { name: "New Year's Day", region: "US" },
    { name: "New Year's Day", region: "IN" },
  ],
  "01-26": [{ name: "Republic Day", region: "IN" }],
  "07-04": [{ name: "Independence Day", region: "US" }],
  "08-15": [{ name: "Independence Day", region: "IN" }],
  "10-02": [{ name: "Gandhi Jayanti", region: "IN" }],
  "11-11": [{ name: "Veterans Day", region: "US" }],
  "12-25": [
    { name: "Christmas Day", region: "UK" },
    { name: "Christmas Day", region: "US" },
    { name: "Christmas Day", region: "IN" },
  ],
  "12-26": [{ name: "Boxing Day", region: "UK" }],
};

// Leave Categories Configuration
window.LEAVE_CATEGORIES = {
  PTO: {
    name: "PTO/Vacation",
    color: "#dc3545",
    emoji: "🔴",
  },
  Training: {
    name: "Training",
    color: "#3b82f6",
    emoji: "🔵",
  },
  Conference: {
    name: "Conference",
    color: "#10b981",
    emoji: "🟢",
  },
  Medical: {
    name: "Medical/Personal",
    color: "#8b5cf6",
    emoji: "🟣",
  },
  Other: {
    name: "Other",
    color: "#6b7280",
    emoji: "⚪",
  },
};

// Default category
window.DEFAULT_CATEGORY = "PTO";
