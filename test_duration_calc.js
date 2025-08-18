// Test the duration calculation logic from the reports tab
function calculateDuration(issuedAt, returnedAt) {
  if (!returnedAt) return null;
  const issued = new Date(issuedAt);
  const returned = new Date(returnedAt);
  const diffMs = returned.getTime() - issued.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  // Return actual duration, but ensure it's at least 1 minute only if less than 1
  return diffMinutes < 1 ? 1 : diffMinutes;
}

// Test with actual data from API
const issuedAt = "2025-08-18T20:19:59.196Z";
const returnedAt = "2025-08-18T22:37:58.451Z";
const storedDuration = 138;

const calculatedDuration = calculateDuration(issuedAt, returnedAt);
console.log("Testing Reports Tab Duration Calculation:");
console.log("Issued At:", issuedAt);
console.log("Returned At:", returnedAt);
console.log("Stored Duration (from API):", storedDuration);
console.log("Calculated Duration (frontend logic):", calculatedDuration);

// Test the fallback logic from line 210
const finalDuration = calculatedDuration !== null ? calculatedDuration : (storedDuration && storedDuration >= 1 ? storedDuration : 1);
console.log("Final Duration (with fallback):", finalDuration);

// Test CSV export logic (line 126)
const csvDuration = returnedAt ? (calculatedDuration ?? storedDuration) : null;
console.log("CSV Export Duration:", csvDuration);
