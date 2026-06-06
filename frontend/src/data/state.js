// =============================================
// Blood Warriors ARIA — State & Mock Data
// All mock data + auto-assignment logic
// =============================================

// Indian name pools for random generation
const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
  'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Advik', 'Pranav', 'Advaith',
  'Ananya', 'Diya', 'Myra', 'Sara', 'Aanya', 'Aadhya', 'Ira', 'Anika',
  'Priya', 'Neha', 'Pooja', 'Riya', 'Kavya', 'Tanvi', 'Meera', 'Shreya',
  'Rohan', 'Kiran', 'Vikram', 'Rajesh', 'Sunil', 'Amit', 'Deepak', 'Manish'
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Nair', 'Reddy', 'Kumar', 'Singh', 'Gupta',
  'Mehta', 'Kapoor', 'Joshi', 'Rao', 'Iyer', 'Pillai', 'Deshmukh',
  'Bhat', 'Chauhan', 'Mishra', 'Pandey', 'Thakur', 'Yadav', 'Sinha'
];

const LOCATIONS = [
  'Hyderabad', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune',
  'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Kochi', 'Indore'
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Helper: generate random name
function randomName() {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${first} ${last}`;
}

// Helper: generate random date within range
function randomFutureDate(minDays, maxDays) {
  const today = new Date();
  const days = minDays + Math.floor(Math.random() * (maxDays - minDays));
  today.setDate(today.getDate() + days);
  return today.toISOString().split('T')[0];
}

function randomPastDate(minDays, maxDays) {
  const today = new Date();
  const days = minDays + Math.floor(Math.random() * (maxDays - minDays));
  today.setDate(today.getDate() - days);
  return today.toISOString().split('T')[0];
}

// =============================================
// Patients
// (Moved to backend /patients/list endpoint)
// =============================================
export const patients = [];

// Bridge Cycle Engine
export function getCurrentBridgePair(patient) {
  const mainId = patient.bridgeCycle[patient.cycleIndex];
  const backupId = patient.bridgeCycle[(patient.cycleIndex + 1) % patient.bridgeCycle.length];
  return { mainId, backupId };
}

export function handleBridgeSkip(patientId, skippedDonorId) {
  const patient = patients.find(p => p.id === patientId);
  if (!patient) return;
  
  // Increment skip count
  patient.skipCount[skippedDonorId] = (patient.skipCount[skippedDonorId] || 0) + 1;
  
  const { mainId, backupId } = getCurrentBridgePair(patient);
  
  // If Main skipped, we just wait for backup (already handled in UI implicitly).
  // If BOTH Main and Backup skipped for this cycle, trigger emergency.
  // We simulate this by checking if both the current main and backup have skipped recently.
  if (skippedDonorId === backupId && patient.skipCount[mainId] > 0) {
    patient.emergencyMode = true;
    console.log(`[ARIA] Emergency Mode Activated for ${patient.name} due to double skip.`);
  }

  // Penalty rule: if skipped 2 times, move to back of the array
  if (patient.skipCount[skippedDonorId] >= 2) {
    const idx = patient.bridgeCycle.indexOf(skippedDonorId);
    if (idx > -1) {
      patient.bridgeCycle.splice(idx, 1);
      patient.bridgeCycle.push(skippedDonorId);
      patient.skipCount[skippedDonorId] = 0; // Reset after penalty
      console.log(`[ARIA] Penalty: ${skippedDonorId} moved to back of the line.`);
    }
  }
}

export function advanceBridgeCycle(patientId, donorWhoGaveId) {
  const patient = patients.find(p => p.id === patientId);
  if (!patient) return;
  
  const { mainId, backupId } = getCurrentBridgePair(patient);
  
  // If main gave, standard advance: next is main=backup, backup=next
  if (donorWhoGaveId === mainId) {
    patient.cycleIndex = (patient.cycleIndex + 1) % patient.bridgeCycle.length;
  } 
  // If backup gave, then next time the person who was SUPPOSED to give (main) is still main, 
  // and backup becomes the person AFTER the old backup.
  else if (donorWhoGaveId === backupId) {
    // The main hasn't given. They stay main for the next cycle.
    // The backup gave, so they shouldn't be backup next time.
    // We achieve this by shifting the backup to the back, or just skipping over them next time.
    // Easiest representation: swap main and backup in the array, then advance.
    const mIdx = patient.cycleIndex;
    const bIdx = (patient.cycleIndex + 1) % patient.bridgeCycle.length;
    
    // Swap
    [patient.bridgeCycle[mIdx], patient.bridgeCycle[bIdx]] = [patient.bridgeCycle[bIdx], patient.bridgeCycle[mIdx]];
    // Advance index so the original main is now at cycleIndex (as main again)
    patient.cycleIndex = (patient.cycleIndex + 1) % patient.bridgeCycle.length;
  }
}

// Auto-compute emergency mode (helper)
export function calculateEmergencyMode(patientList) {
  patientList.forEach(p => {
    p.emergencyMode = p.currentBridgeCount < p.requiredBridgesPerMonth;
    p.packedCellsNeeded = p.emergencyMode;
  });
}

// =============================================
// Donors
// (Moved to backend /donors/list endpoint)
// =============================================
export const donors = [];
// =============================================
// Outreach Log
// =============================================
export const outreachLog = [
  { id: 'ol1', donorId: 'd1', channel: 'whatsapp', sentAt: '2025-07-27', escalationTier: 1, responseReceived: true, responseText: 'YES, available', deliveryStatus: 'delivered' },
  { id: 'ol2', donorId: 'd6', channel: 'sms', sentAt: '2025-07-20', escalationTier: 1, responseReceived: false, deliveryStatus: 'sent' },
  { id: 'ol3', donorId: 'd6', channel: 'call', sentAt: '2025-07-21', escalationTier: 2, responseReceived: true, responseText: 'Will confirm later', deliveryStatus: 'completed' }
];

// =============================================
// Emergency Alerts (auto-generated based on patient data)
// =============================================
export const emergencyAlerts = [];

// =============================================
// Bridge Memberships
// =============================================
export const bridgeMemberships = [
  { id: 'bm1', patientId: 'p1', donorId: 'd1', role: 'main', status: 'active', joinedDate: '2024-06-01', lastDonationDate: '2025-07-14', rotationOrder: 1 },
  { id: 'bm2', patientId: 'p1', donorId: 'd2', role: 'main', status: 'active', joinedDate: '2024-06-15', lastDonationDate: '2025-07-28', rotationOrder: 2 },
  { id: 'bm3', patientId: 'p1', donorId: 'd3', role: 'backup', status: 'active', joinedDate: '2024-07-01', lastDonationDate: '2025-07-20', rotationOrder: 3 },
  { id: 'bm4', patientId: 'p2', donorId: 'd4', role: 'main', status: 'active', joinedDate: '2024-08-01', lastDonationDate: '2025-07-22', rotationOrder: 1 },
  { id: 'bm5', patientId: 'p2', donorId: 'd5', role: 'main', status: 'active', joinedDate: '2024-08-10', lastDonationDate: '2025-07-15', rotationOrder: 2 }
];

// =============================================
// Chat Messages
// =============================================
export const chatMessages = [
  { bridgeId: 'p1-d1', from: 'Kiran Mehta', text: "I'm available for the August 5 transfusion. Confirmed!", timestamp: '2025-07-28 10:30', type: 'donor' },
  { bridgeId: 'p1-d1', from: "Priya's Mother", text: "Thank you Kiran! Hospital confirmed at 4PM. Really appreciate your help.", timestamp: '2025-07-28 10:45', type: 'patient' },
  { bridgeId: 'p1-d2', from: 'Arjun Nair', text: 'Ready for my rotation on Aug 20. Will be there.', timestamp: '2025-07-27 15:20', type: 'donor' }
];

// =============================================
// Coupons
// =============================================
export const coupons = [
  { id: 'c1', code: 'HEALTHY25', discountType: 'percentage', discountValue: 25, validUntil: '2025-10-01', claimed: false, claimedBy: null },
  { id: 'c2', code: 'MARATHON24', discountType: 'free_event', discountValue: 100, validUntil: '2025-09-15', claimed: false, claimedBy: null },
  { id: 'c3', code: 'MEDPLUS50', discountType: 'fixed', discountValue: 50, validUntil: '2025-08-30', claimed: true, claimedBy: 'd1' },
  { id: 'c4', code: 'FITINDIA', discountType: 'percentage', discountValue: 15, validUntil: '2025-12-31', claimed: false, claimedBy: null }
];

// =============================================
// Events
// =============================================
export const events = [
  { id: 'e1', name: '🏃‍♂️ Blood Warriors Hyderabad Marathon', date: '2025-08-15', venue: 'Gachibowli Stadium', registeredDonors: ['d1', 'd4'], status: 'upcoming' },
  { id: 'e2', name: '🩸 Mega Donation Camp', date: '2025-09-05', venue: 'Nehru Zoological Park', registeredDonors: [], status: 'upcoming' },
  { id: 'e3', name: '💪 Thalassemia Awareness Walk', date: '2025-09-20', venue: 'Hussain Sagar', registeredDonors: ['d2'], status: 'upcoming' }
];

// =============================================
// Coin Transactions
// =============================================
export const coinTransactions = [
  { id: 'ct1', donorId: 'd1', amount: 50, type: 'donation', createdAt: '2025-07-14' },
  { id: 'ct2', donorId: 'd1', amount: 40, type: 'bridge_bonus', createdAt: '2025-07-14' },
  { id: 'ct3', donorId: 'd2', amount: 50, type: 'donation', createdAt: '2025-07-28' },
  { id: 'ct4', donorId: 'd2', amount: 40, type: 'bridge_bonus', createdAt: '2025-07-28' }
];

// =============================================
// Mock Failure Log (AI Learning)
// =============================================
export const MOCK_FAILURE_LOG = [
  { donor: 'D-5e56ef', event: 'No response after 3 calls', action: 'Upgraded to Tier 3', time: '2 hrs ago' },
  { donor: 'D-32a39c', event: 'Not donated in 1 year', action: 'Marked Inactive', time: '5 hrs ago' },
  { donor: 'D-ab1c2a', event: 'Missed scheduled bridge donation', action: 'Admin alerted', time: '8 hrs ago' },
  { donor: 'D-7f82b1', event: 'Failed to respond to emergency', action: 'Downgraded reliability', time: '12 hrs ago' },
  { donor: 'D-c4d091', event: 'Blackout period expired, no update', action: 'Auto-outreach initiated', time: '1 day ago' }
];

// =============================================
// "Become Bridge" / "Blood Need By" random prompts
// =============================================
export function generateBridgePrompts(count = 5) {
  const prompts = [];
  for (let i = 0; i < count; i++) {
    const patientName = randomName() + '-rn';
    const bloodGroup = BLOOD_GROUPS[Math.floor(Math.random() * BLOOD_GROUPS.length)];
    const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    const needByDate = randomFutureDate(3, 30);
    const becomeByDate = randomFutureDate(1, 14);
    const bridgesNeeded = 2 + Math.floor(Math.random() * 6);
    const currentBridges = Math.floor(Math.random() * bridgesNeeded);

    prompts.push({
      id: `bp-${i}`,
      patientName,
      bloodGroup,
      location,
      needByDate,
      becomeByDate,
      bridgesNeeded,
      currentBridges,
      urgency: currentBridges < bridgesNeeded / 2 ? 'high' : 'medium'
    });
  }
  return prompts;
}

// =============================================
// Auto Bridge Assignment Algorithm
// =============================================
export function autoAssignBridges(patient, allDonors) {
  // Get compatible donors (same blood group, active, not in blackout)
  const today = new Date();
  const compatible = allDonors.filter(d => {
    if (d.bloodGroup !== patient.bloodGroup) return false;
    if (d.activeStatus !== 'Active') return false;
    // Check blackout
    if (d.blackoutStart && d.blackoutEnd) {
      const start = new Date(d.blackoutStart);
      const end = new Date(d.blackoutEnd);
      if (today >= start && today <= end) return false;
    }
    return true;
  });

  // Sort by: next_eligible_date (null = available now = top), then reliability score
  compatible.sort((a, b) => {
    // Donors available now (null nextEligibleDate) come first
    const aAvailNow = !a.nextEligibleDate || new Date(a.nextEligibleDate) <= today;
    const bAvailNow = !b.nextEligibleDate || new Date(b.nextEligibleDate) <= today;

    if (aAvailNow && !bAvailNow) return -1;
    if (!aAvailNow && bAvailNow) return 1;

    // Both available or both not: sort by next eligible date (soonest first)
    if (!aAvailNow && !bAvailNow) {
      const aDate = new Date(a.nextEligibleDate);
      const bDate = new Date(b.nextEligibleDate);
      if (aDate < bDate) return -1;
      if (aDate > bDate) return 1;
    }

    // Tiebreaker: reliability score (highest first)
    return (b.reliabilityScore || 0) - (a.reliabilityScore || 0);
  });

  // Select top N needed
  const needed = patient.requiredBridgesPerMonth || 4;
  const selected = compatible.slice(0, needed);

  // First ceil(N/2) are main, rest are backup
  const mainCount = Math.ceil(selected.length / 2);
  const mainDonors = selected.slice(0, mainCount);
  const backupDonors = selected.slice(mainCount);

  return {
    mainDonors,
    backupDonors,
    totalAssigned: selected.length,
    totalNeeded: needed,
    fullyStaffed: selected.length >= needed
  };
}

// =============================================
// Helper Functions
// =============================================
export function canDonateNow(donor) {
  if (!donor.nextEligibleDate) return true;
  return new Date() >= new Date(donor.nextEligibleDate);
}

export function refreshDonorStatus(donorList) {
  donorList.forEach(d => {
    d.canDonate = canDonateNow(d);
  });
}

export function getReliabilityClass(score) {
  if (score >= 80) return 'reliability-high';
  if (score >= 60) return 'reliability-medium';
  return 'reliability-low';
}

export function getReliabilityText(score) {
  if (score >= 80) return 'High';
  if (score >= 60) return 'Medium';
  return 'Low';
}

// =============================================
// Recent Blood Requests (mock for admin view)
// =============================================
export const recentRequests = [
  { id: 'req-1', patientName: 'Priya Sharma', bloodGroup: 'A+', urgency: 'high', status: 'matched', matchedDonors: 3, timestamp: '2 hrs ago' },
  { id: 'req-2', patientName: 'Rohan Verma', bloodGroup: 'B+', urgency: 'medium', status: 'matched', matchedDonors: 5, timestamp: '5 hrs ago' },
  { id: 'req-3', patientName: 'Ananya Iyer-rn', bloodGroup: 'O+', urgency: 'high', status: 'pending', matchedDonors: 0, timestamp: '8 hrs ago' },
  { id: 'req-4', patientName: 'Kavya Deshmukh-rn', bloodGroup: 'AB+', urgency: 'low', status: 'matched', matchedDonors: 7, timestamp: '1 day ago' },
  { id: 'req-5', patientName: 'Ishaan Thakur-rn', bloodGroup: 'A-', urgency: 'medium', status: 'matched', matchedDonors: 2, timestamp: '1 day ago' }
];
