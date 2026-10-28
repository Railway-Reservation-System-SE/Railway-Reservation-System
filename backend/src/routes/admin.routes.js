const express = require('express');
const db = require('../db');

const router = express.Router();

const present = (v) => typeof v === 'string' && v.trim() !== '';
const validClass = (c) =>
  c && present(c.class_name) && Number(c.fare) > 0 && Number.isInteger(c.totalSeats) && c.totalSeats > 0;
// RRS-F-050: admin adds a new train with its classes.
// Auth + admin-only checks are added by RRS-SR-004.
router.post('/trains', (req, res) => {
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
// RRS-F-051: update an existing train (only the provided fields) and upsert classes by class_name.
router.put('/trains/:id', (req, res) => {
  const id = Number(req.params.id);
  const train = db.prepare('SELECT id FROM trains WHERE id = ?').get(id);
  if (!train) {
    return res.status(404).json({ error: 'Train not found' });
  }

  const { number, name, source, destination, travelDate, classes } = req.body || {};
  const fields = { number, name, source, destination, travel_date: travelDate };

  for (const value of Object.values(fields)) {
    if (value !== undefined && !present(value)) {
      return res.status(400).json({ error: 'train fields must be non-empty text' });
    }
  }
  if (classes !== undefined && (!Array.isArray(classes) || !classes.every(validClass))) {
    return res.status(400).json({ error: 'each class needs class_name, fare > 0 and totalSeats > 0' });
  }

  const apply = db.transaction(() => {
    const sets = [];
    const values = [];
    for (const [column, value] of Object.entries(fields)) {
      if (value !== undefined) {
        sets.push(`${column} = ?`);
        values.push(value);
      }
    }
    if (sets.length > 0) {
      db.prepare(`UPDATE trains SET ${sets.join(', ')} WHERE id = ?`).run(...values, id);
    }

    for (const c of classes || []) {
      const existing = db
        .prepare('SELECT id, booked_seats FROM train_classes WHERE train_id = ? AND class_name = ?')
        .get(id, c.class_name);
      if (existing) {
        if (c.totalSeats < existing.booked_seats) {
          throw new Error('SEATS_BELOW_BOOKED');
        }
        db.prepare('UPDATE train_classes SET fare = ?, total_seats = ? WHERE id = ?')
          .run(Number(c.fare), c.totalSeats, existing.id);
      } else {
        db.prepare('INSERT INTO train_classes (train_id, class_name, fare, total_seats) VALUES (?,?,?,?)')
          .run(id, c.class_name, Number(c.fare), c.totalSeats);
      }
    }
  });

  try {
    apply();
    return res.status(200).json({ id });
  } catch (err) {
    if (err.message === 'SEATS_BELOW_BOOKED') {
      return res.status(400).json({ error: 'totalSeats cannot be below already booked seats' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});// RRS-F-051: delete a train unless it has CONFIRMED bookings.
router.delete('/trains/:id', (req, res) => {
  const id = Number(req.params.id);
  const train = db.prepare('SELECT id FROM trains WHERE id = ?').get(id);
  if (!train) {
    return res.status(404).json({ error: 'Train not found' });
  }

  const active = db
    .prepare("SELECT COUNT(*) AS n FROM bookings WHERE train_id = ? AND status = 'CONFIRMED'")
    .get(id).n;
  if (active > 0) {
    return res.status(409).json({ error: 'Train has active bookings' });
  }

  const remove = db.transaction(() => {
    db.prepare('DELETE FROM train_classes WHERE train_id = ?').run(id);
    db.prepare('DELETE FROM trains WHERE id = ?').run(id);
  });

  try {
    remove();
    return res.status(200).json({ message: 'Train deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});
module.exports = router;