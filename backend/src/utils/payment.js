// RRS-F-022: simulated payment gateway. There is no real processor:
// any well-formed paymentMethod counts as a successful charge.
// Accepted values are case-insensitive so the UI labels (UPI, Card, NetBanking) match.
const PAYMENT_METHODS = ['card', 'upi', 'netbanking'];

function simulatePayment(paymentMethod, fare, passengerCount) {
  const method = typeof paymentMethod === 'string' ? paymentMethod.trim().toLowerCase() : '';
  if (!PAYMENT_METHODS.includes(method)) {
    return { ok: false };
  }
  return { ok: true, totalFare: fare * passengerCount };
}

module.exports = { PAYMENT_METHODS, simulatePayment };