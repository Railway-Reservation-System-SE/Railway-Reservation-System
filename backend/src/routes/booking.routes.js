const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { isNonEmptyString, isValidDate, stripHtml } = require('../utils/validate');

const router = express.Router();

const present = isNonEmptyString;

// RRS-F-020: validate a booking request and look up the train class.
// Seat check, payment, PNR and concurrency guard are added by the next booking items.
// RRS-SR-003 booking half validates dates/ages and strips basic tags from names.
router.post('/', auth, (req, res) => {
  const { trainId, classType, travelDate, passengers } = req.body || {};

  if (
    !['string', 'number'].includes(typeof trainId) ||
    (typeof trainId === 'string' && !/^\d+$/.test(trainId)) ||
    !Number.isSafeInteger(Number(trainId)) ||
    Number(trainId) <= 0 ||
    trainId === null ||
    trainId === '' ||
    !present(classType) ||
    !isValidDate(travelDate) ||
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
      present(stripHtml(p.name)) &&
      typeof p.age === 'number' &&
      Number.isFinite(p.age) &&
      p.age >= 0 &&
      present(p.gender)
  );
  if (!validPassengers) {
    return res.status(400).json({ error: 'each passenger needs name, age and gender' });
  }

  // Preserve cleaned passenger values for later booking steps; no DB writes yet.
  req.body.passengers = passengers.map((p) => ({ ...p, name: stripHtml(p.name) }));

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
  }  // RRS-F-021: reject before payment or any DB write if there aren't enough seats.
  const seatsAvailable = trainClass.total_seats - trainClass.booked_seats;
  if (passengers.length > seatsAvailable) {
    return res.status(409).json({ error: 'Not enough seats available' });
  }

  // Interim: the request is valid and the class exists, but nothing is booked yet.
  // Seat check, payment and confirmation (201) are added by RRS-F-021/022/023.
  return res.status(501).json({ error: 'Booking not implemented yet' });
});

module.exports = router;
