// =============================================
// Blood Warriors ARIA — API Layer
// USE_MOCK toggle for switching between mock and real backend
// =============================================

const API_BASE = 'http://localhost:8000'; // Change localhost to Member B's IP address if needed
const USE_MOCK = false;

const MOCK_RESPONSES = {
  '/request-blood': {
    request_id: 'r1',
    matched_donors: [
      { donor_id: 'd1', name: 'Kiran Mehta', blood_group: 'A+', score: 0.91, eligible: true, distance_km: 2.1, total_donations: 8, role: 'Bridge Donor' },
      { donor_id: 'd2', name: 'Arjun Nair', blood_group: 'A+', score: 0.87, eligible: true, distance_km: 5.4, total_donations: 12, role: 'Bridge Donor' },
      { donor_id: 'd3', name: 'Neha Gupta', blood_group: 'A+', score: 0.76, eligible: true, distance_km: 8.0, total_donations: 5, role: 'Emergency Donor' },
      { donor_id: 'd9', name: 'Suresh Rao', blood_group: 'A+', score: 0.72, eligible: true, distance_km: 10.3, total_donations: 3, role: 'Bridge Donor' },
      { donor_id: 'd10', name: 'Meera Joshi', blood_group: 'A-', score: 0.68, eligible: true, distance_km: 12.1, total_donations: 6, role: 'Bridge Donor' },
      { donor_id: 'd11', name: 'Deepak Pandey', blood_group: 'O+', score: 0.61, eligible: true, distance_km: 15.7, total_donations: 2, role: 'Emergency Donor' },
      { donor_id: 'd12', name: 'Anita Mishra', blood_group: 'A+', score: 0.55, eligible: false, distance_km: 18.2, total_donations: 1, role: 'One-Time Donor' },
      { donor_id: 'd13', name: 'Rahul Chauhan', blood_group: 'O-', score: 0.49, eligible: true, distance_km: 22.4, total_donations: 9, role: 'Bridge Donor' },
    ]
  },
  '/donors': { donors: [] },
  '/admin/metrics': {
    total_active_donors: 4447,
    active_bridges: 786,
    inactive_donors: 682,
    eligible_now: 6464,
    one_time_donors: 1203,
    regular_donors: 3244,
    high_call_ratio: 187,
    requests_today: 3
  },
  '/chat': {
    reply: 'Hello! I am ARIA, your Blood Warriors AI assistant. How can I help you today?',
    donor_context: {}
  }
};

// Dynamic mock for blood group-specific requests
function getMockBloodRequest(bloodGroup, urgency) {
  const base = MOCK_RESPONSES['/request-blood'];
  // Simulate different scores for different blood groups
  const multiplier = urgency === 'high' ? 1.0 : urgency === 'medium' ? 0.9 : 0.8;
  return {
    request_id: 'r-' + Date.now().toString(36),
    blood_group: bloodGroup,
    urgency,
    matched_donors: base.matched_donors.map((d, i) => ({
      ...d,
      score: Math.min(0.99, parseFloat((d.score * multiplier * (1 - i * 0.02)).toFixed(2))),
      blood_group: i < 4 ? bloodGroup : d.blood_group // first few match exactly
    }))
  };
}

// Chat responses based on message content
function getMockChatReply(message) {
  const msg = message.toLowerCase();
  if (msg.includes('eligible') || msg.includes('donate') || msg.includes('when')) {
    return { reply: 'Your next eligible donation date is October 14, 2025. We\'d love to have you donate again! Every donation saves up to 3 lives. 🩸', donor_context: {} };
  }
  if (msg.includes('donation') || msg.includes('how many') || msg.includes('count')) {
    return { reply: 'You have made 8 donations so far. That\'s incredible — you\'re a true Blood Warrior saving lives! 🏆', donor_context: {} };
  }
  if (msg.includes('bridge') || msg.includes('patient')) {
    return { reply: 'You are currently a registered bridge donor for Priya Sharma (A+). Bridge donors provide life-saving recurring blood to Thalassemia patients. Your commitment is extraordinary! 💪', donor_context: {} };
  }
  if (msg.includes('coin') || msg.includes('reward') || msg.includes('points')) {
    return { reply: 'You currently have 450 coins! You can redeem them for health checkup discounts, event entries, and more. Keep donating to earn more! 🪙', donor_context: {} };
  }
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    return { reply: 'Hello! I\'m ARIA, your Blood Warriors AI assistant. Your blood group is A+ and you have 8 donations. How can I help you today? 😊', donor_context: {} };
  }
  return { reply: 'Thank you for being a Blood Warriors donor! Your contribution saves lives. Is there anything specific I can help you with — eligibility dates, your bridge patient, or rewards? 🩸', donor_context: {} };
}

export async function apiCall(path, method = 'GET', body = null) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 400 + Math.random() * 300)); // simulate latency

    // Handle specific mock paths
    if (path === '/request-blood' && body) {
      return getMockBloodRequest(body.blood_group || 'A+', body.urgency || 'medium');
    }
    if (path === '/chat' && body) {
      return getMockChatReply(body.message || '');
    }

    return MOCK_RESPONSES[path] || {};
  }

  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(API_BASE + path, opts);
    return res.json();
  } catch (err) {
    console.error(`API call failed: ${path}`, err);
    // Fallback to mock on error
    return MOCK_RESPONSES[path] || {};
  }
}

export { USE_MOCK, API_BASE };
