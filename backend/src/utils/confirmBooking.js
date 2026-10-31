const db = require('../db');
const { generatePnr } = require('./pnr');

// RRS-F-023 / RRS-NF-003: take the seats and write the booking in one transaction.
// The UPDATE's WHERE clause is the no-overbooking guard: it changes 0 rows when the
// requested seats no longer fit. Returns { pnr } on success, or null if sold out.
function confirmBooking({ userId, classId, trainId, className, travelDate, passengers, farePaid }) {
  const takeSeats = db.prepare(
    'UPDATE train_classes SET booked_seats = booked_seats + ? WHERE id = ? AND booked_seats + ? <= total_seats'
  );
  const insertBooking = db.prepare(
    `INSERT INTO bookings (pnr, user_id, train_id, class_name, travel_date, passengers_json, fare_paid, status)
     VALUES (?,?,?,?,?,?,?, 'CONFIRMED')`
  );
  const count = passengers.length;

  return db.transaction(() => {
    if (takeSeats.run(count, classId, count).changes === 0) return null;
    // PNR collisions are rare; retry a few times on the UNIQUE constraint.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const pnr = generatePnr();
      try {
        insertBooking.run(pnr, userId, trainId, className, travelDate, JSON.stringify(passengers), farePaid);
        return { pnr };
      } catch (err) {
        if (!String(err.code).startsWith('SQLITE_CONSTRAINT')) throw err;
      }
    }
    throw new Error('Could not generate a unique PNR');
  })();
}

module.exports = { confirmBooking };
