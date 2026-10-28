export function buildBookingUrl(trainId, className, date) {
  return `/booking/${trainId}?class=${encodeURIComponent(className)}&date=${encodeURIComponent(date)}`;
}