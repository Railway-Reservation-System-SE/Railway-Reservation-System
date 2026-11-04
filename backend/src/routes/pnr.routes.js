const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// RRS-F-041: Return booking history for the authenticated passenger.
router.get('/me', auth, (req, res) => {
  const bookings = db
    .prepare(
      `SELECT
         b.pnr,
         b.status,
         t.number AS train_number,
         t.name AS train_name,
         t.source,
         t.destination,
         b.class_name,
         b.travel_date,
         b.fare_paid
       FROM bookings AS b
       JOIN trains AS t ON t.id = b.train_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC, b.id DESC`
    )
    .all(req.user.id);

  return res.status(200).json(
    bookings.map((booking) => ({
      pnr: booking.pnr,
      status: booking.status,
      train: {
        number: booking.train_number,
        name: booking.train_name,
        source: booking.source,
        destination: booking.destination,
      },
      classType: booking.class_name,
      travelDate: booking.travel_date,
      farePaid: booking.fare_paid,
    }))
  );
});

// RRS-F-040: Look up booking status using its PNR.
// Authentication is not required.
router.get('/pnr/:pnr', (req, res) => {
  const { pnr } = req.params;

  if (!/^\d{10}$/.test(pnr)) {
    return res.status(400).json({ error: 'Invalid PNR number' });
  }

  const booking = db
    .prepare(
      `SELECT
         b.pnr,
         b.status,
         b.class_name,
         b.travel_date,
         b.passengers_json,
         b.fare_paid,
         t.number AS train_number,
         t.name AS train_name,
         t.source,
         t.destination
       FROM bookings AS b
       JOIN trains AS t ON t.id = b.train_id
       WHERE b.pnr = ?`
    )
    .get(pnr);

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found for this PNR' });
  }

  let passengers;

  try {
    passengers = JSON.parse(booking.passengers_json);
  } catch {
    return res.status(500).json({ error: 'Unable to retrieve booking details' });
  }

  return res.status(200).json({
    pnr: booking.pnr,
    status: booking.status,
    train: {
      number: booking.train_number,
      name: booking.train_name,
      source: booking.source,
      destination: booking.destination,
    },
    classType: booking.class_name,
    travelDate: booking.travel_date,
    passengers,
    farePaid: booking.fare_paid,
  });
});

module.exports = router;
