const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

const present = (v) => typeof v === 'string' && v.trim() !== '';

// RRS-F-020: validate a booking request and look up the train class.
// Seat check, payment, PNR and concurrency guard are added by the next booking items.
router.post('/', auth, (req, res) => {
  const { trainId, classType, travelDate, passengers } = req.body || {};

  if (
    !Number.isInteger(Number(trainId)) ||
    trainId === null ||
    trainId === '' ||
    !present(classType) ||
    !present(travelDate) ||
    !Array.isArray(passengers) ||
    passengers.length < 1 ||
    passengers.length > 4
  ) {
    return res
      .status(400)
      .json({ error: 'trainId, classType, travelDate and 1-4 passengers are required' });
  }

  const validPassengers = passengers.every(
    (p) =>
      p &&
      present(p.name) &&
      Number.isInteger(p.age) &&
      p.age > 0 &&
      present(p.gender)
  );
  if (!validPassengers) {
    return res.status(400).json({ error: 'each passenger needs name, age and gender' });
  }

  const trainClass = db
    .prepare(
      `SELECT tc.id, tc.train_id, tc.class_name, tc.fare, tc.total_seats, tc.booked_seats
       FROM train_classes AS tc
       JOIN trains AS t ON t.id = tc.train_id
       WHERE tc.train_id = ? AND tc.class_name = ? AND t.travel_date = ?`
    )
    .get(Number(trainId), classType, travelDate);

  if (!trainClass) {
    return res.status(404).json({ error: 'Train/class not found' });
  }

  // Later items extend this handler; for now report the matched class.
  return res.status(200).json({ trainClassId: trainClass.id });
});

module.exports = router;
