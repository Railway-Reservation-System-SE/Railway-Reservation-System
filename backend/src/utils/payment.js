// RRS-F-022: simulated payment gateway. There is no real processor:
// any well-formed paymentMethod counts as a successful charge.
const PAYMENT_METHODS = ['card', 'upi'];

function simulatePayment(paymentMethod, fare, passengerCount) {
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return { ok: false };
  }
  return { ok: true, totalFare: fare * passengerCount };
}

module.exports = { PAYMENT_METHODS, simulatePayment };