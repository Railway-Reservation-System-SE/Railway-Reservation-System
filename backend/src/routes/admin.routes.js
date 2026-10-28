const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

const present = (v) => typeof v === 'string' && v.trim() !== '';

// RRS-F-050: admin adds a new train with its classes.
// Login required (RRS-SR-002). The admin-role check is added by RRS-SR-004.
router.post('/trains', auth, (req, res) => {
  const { number, name, source, destination, travelDate, classes } = req.body || {};

  if (![number, name, source, destination, travelDate].every(present)) {
    return res.status(400).json({ error: 'number, name, source, destination and travelDate are required' });
  }
  if (!Array.isArray(classes) || classes.length === 0) {
    return res.status(400).json({ error: 'at least one class is required' });
  }
  for (const c of classes) {
    if (!c || !present(c.class_name) || !(Number(c.fare) > 0) || !Number.isInteger(c.totalSeats) || c.totalSeats <= 0) {
      return res.status(400).json({ error: 'each class needs class_name, fare > 0 and totalSeats > 0' });
    }
  }

  const insertTrain = db.prepare(
    'INSERT INTO trains (number, name, source, destination, travel_date) VALUES (?,?,?,?,?)'
  );
  const insertClass = db.prepare(
    'INSERT INTO train_classes (train_id, class_name, fare, total_seats) VALUES (?,?,?,?)'
  );

  const create = db.transaction(() => {
    const result = insertTrain.run(number, name, source, destination, travelDate);
    const trainId = Number(result.lastInsertRowid);
    for (const c of classes) {
      insertClass.run(trainId, c.class_name, Number(c.fare), c.totalSeats);
    }
    return trainId;
  });

  try {
    return res.status(201).json({ id: create() });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;