// ═══════════════════════════════════════════════════════════════════
// DATA MANAGER
// Handles data operations, calculations, and storage management
// ═══════════════════════════════════════════════════════════════════

// Global data variables
let holidays = JSON.parse(localStorage.getItem("holidays")) || {};
let customHolidays = JSON.parse(localStorage.getItem("customHolidays")) || {};
let birthdays = JSON.parse(localStorage.getItem("birthdays")) || {};
let anniversaries = JSON.parse(localStorage.getItem("anniversaries")) || {};
let enhancedCustomHolidays =
  JSON.parse(localStorage.getItem("enhancedCustomHolidays")) || {};

// Team management
const defaultMembers = window.TEAM_CONFIG?.DEFAULT_MEMBERS || [
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

let teamMembers =
  JSON.parse(localStorage.getItem("teamMembers")) || defaultMembers.slice();

// User colors management
let userColors = {};
function updateUserColors() {
  userColors = {};
  teamMembers.forEach((name, i) => {
    userColors[name] = `hsl(${i * 36}, 70%, 60%)`;
  });
}
updateUserColors();

// Team member persistence
function saveTeamMembers() {
  localStorage.setItem("teamMembers", JSON.stringify(teamMembers));
  window.teamMembers = teamMembers;

  if (typeof saveToGoogleSheets === "function") {
    saveToGoogleSheets("teamMembers", teamMembers);
  }
}

// Holiday data migration
function migrateHolidayData() {
  let migrationNeeded = false;

  Object.keys(holidays).forEach((member) => {
    Object.keys(holidays[member] || {}).forEach((monthKey) => {
      const monthData = holidays[member][monthKey];

      if (Array.isArray(monthData)) {
        const newFormat = {};
        monthData.forEach((day) => {
          newFormat[day] = "full";
        });
        holidays[member][monthKey] = newFormat;
        migrationNeeded = true;
      }
    });
  });

  if (migrationNeeded) {
    localStorage.setItem("holidays", JSON.stringify(holidays));
  }
}

// Leave calculation utilities
function calculateLeaveDays(memberLeaveData) {
  if (!memberLeaveData) return 0;

  if (Array.isArray(memberLeaveData)) {
    return memberLeaveData.length;
  }

  return Object.values(memberLeaveData).reduce((total, leaveType) => {
    if (leaveType === "full") return total + 1;
    if (leaveType === "morning" || leaveType === "afternoon")
      return total + 0.5;
    return total;
  }, 0);
}

// Leave details for specific month
function getLeaveDetails(member, monthKey) {
  const memberData = holidays[member] || {};
  const monthData = memberData[monthKey] || {};

  if (Array.isArray(monthData)) {
    return monthData.map((day) => ({ day: day, type: "full" }));
  }

  return Object.entries(monthData).map(([day, type]) => ({
    day: parseInt(day),
    type: type,
  }));
}

// Check if day has leave
function hasLeaveOnDay(member, monthKey, day) {
  const memberData = holidays[member] || {};
  const monthData = memberData[monthKey] || {};

  if (Array.isArray(monthData)) {
    return monthData.includes(day);
  }

  return monthData.hasOwnProperty(day);
}

// Get leave type for specific day
function getLeaveTypeForDay(member, monthKey, day) {
  const memberData = holidays[member] || {};
  const monthData = memberData[monthKey] || {};

  if (Array.isArray(monthData)) {
    return monthData.includes(day) ? "full" : "none";
  }

  return monthData[day] || "none";
}

// Save functions
function saveCustomHolidays() {
  localStorage.setItem("customHolidays", JSON.stringify(customHolidays));
  window.customHolidays = customHolidays;

  if (typeof saveToGoogleSheets === "function") {
    saveToGoogleSheets("customHolidays", customHolidays);
  }
}

function saveBirthdays() {
  localStorage.setItem("birthdays", JSON.stringify(birthdays));
  window.birthdays = birthdays;

  if (typeof saveToGoogleSheets === "function") {
    const specialDatesData = {
      birthdays: birthdays,
      anniversaries: anniversaries,
    };
    saveToGoogleSheets("specialDates", specialDatesData);
  }
}

function saveAnniversaries() {
  localStorage.setItem("anniversaries", JSON.stringify(anniversaries));
  window.anniversaries = anniversaries;

  if (typeof saveToGoogleSheets === "function") {
    const specialDatesData = {
      birthdays: birthdays,
      anniversaries: anniversaries,
    };
    saveToGoogleSheets("specialDates", specialDatesData);
  }
}

function saveEnhancedCustomHolidays() {
  localStorage.setItem(
    "enhancedCustomHolidays",
    JSON.stringify(enhancedCustomHolidays)
  );
}

// Public holidays data
// Permanent holidays that appear every year automatically
const PERMANENT_HOLIDAYS = {
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

// User-added public holidays (loaded from localStorage/Google Sheets)
let publicHolidays = JSON.parse(localStorage.getItem("publicHolidays")) || {};

// Function to get all holidays for a specific year (permanent + user-added)
function getAllHolidaysForYear(year) {
  const allHolidays = { ...publicHolidays };

  // Add permanent holidays for the specified year
  Object.entries(PERMANENT_HOLIDAYS).forEach(([monthDay, holidays]) => {
    const fullDate = `${year}-${monthDay}`;

    if (allHolidays[fullDate]) {
      // Merge with existing holidays (avoid duplicates)
      holidays.forEach((permHoliday) => {
        const exists = allHolidays[fullDate].some(
          (h) => h.name === permHoliday.name && h.region === permHoliday.region
        );
        if (!exists) {
          allHolidays[fullDate].push(permHoliday);
        }
      });
    } else {
      // Add new date with permanent holidays
      allHolidays[fullDate] = [...holidays];
    }
  });

  return allHolidays;
}

// Member profiles storage (roles only)
let memberProfiles = JSON.parse(localStorage.getItem("memberProfiles")) || {};

// Save member profiles
function saveMemberProfiles() {
  localStorage.setItem("memberProfiles", JSON.stringify(memberProfiles));

  if (typeof saveToGoogleSheets === "function") {
    saveToGoogleSheets("memberProfiles", memberProfiles);
  }
}

// Get member role with fallback
function getMemberRole(memberName) {
  return memberProfiles[memberName]?.role || "Team Member";
}

// Get member avatar path (auto-generated from name)
function getMemberAvatarPath(memberName) {
  const filename = memberName.toLowerCase().replace(/\s+/g, "-") + ".jpeg";
  return `assets/team-photos/${filename}`;
}

// Ensure memberProfiles exists
window.memberProfiles =
  JSON.parse(localStorage.getItem("memberProfiles")) || {};

// Save profiles + sync to Sheets
function saveMemberProfiles() {
  localStorage.setItem("memberProfiles", JSON.stringify(memberProfiles));
  if (typeof saveToGoogleSheets === "function") {
    saveToGoogleSheets("memberProfiles", memberProfiles);
  }
}
window.saveMemberProfiles = saveMemberProfiles;

// Ensure a profile entry exists for a name
function ensureMemberProfile(name, defaults = {}) {
  if (!window.memberProfiles) window.memberProfiles = {};
  if (!memberProfiles[name]) {
    memberProfiles[name] = {
      role: "Team Member",
      hasPhoto: false,
      ...defaults,
    };
  }
}
window.ensureMemberProfile = ensureMemberProfile;

// Make globally accessible
window.memberProfiles = memberProfiles;
window.saveMemberProfiles = saveMemberProfiles;
window.getMemberRole = getMemberRole;
window.getMemberAvatarPath = getMemberAvatarPath;

// Make data globally accessible
window.holidays = holidays;
window.customHolidays = customHolidays;
window.birthdays = birthdays;
window.anniversaries = anniversaries;
window.enhancedCustomHolidays = enhancedCustomHolidays;
window.teamMembers = teamMembers;
window.userColors = userColors;
window.publicHolidays = publicHolidays;
// Make permanent holidays globally accessible
window.PERMANENT_HOLIDAYS = PERMANENT_HOLIDAYS;
window.getAllHolidaysForYear = getAllHolidaysForYear;

// ─────────────────────────────────────────────────────────────
// MEMBER PROFILES (roles + photo-flag)  — GLOBAL + SHEETS SYNC
// ─────────────────────────────────────────────────────────────

function saveMemberProfiles() {
  localStorage.setItem("memberProfiles", JSON.stringify(memberProfiles));
  if (typeof saveToGoogleSheets === "function") {
    // triggers creation/update of the `memberProfiles` tab in Sheets
    saveToGoogleSheets("memberProfiles", memberProfiles);
  }
}

function getMemberRole(memberName) {
  return memberProfiles?.[memberName]?.role || "Team Member";
}

function getMemberAvatarPath(memberName) {
  const filename = memberName.toLowerCase().replace(/\s+/g, "-") + ".jpeg";
  return `assets/team-photos/${filename}`;
}

// ensure there is at least a default object for a member
function ensureMemberProfile(name, defaults = {}) {
  if (!memberProfiles[name]) {
    memberProfiles[name] = {
      role: "Team Member",
      hasPhoto: false,
      ...defaults,
    };
  }
}

// expose
window.memberProfiles = window.memberProfiles || memberProfiles;
window.saveMemberProfiles = saveMemberProfiles;
window.getMemberRole = getMemberRole;
window.getMemberAvatarPath = getMemberAvatarPath;
window.ensureMemberProfile = ensureMemberProfile;
