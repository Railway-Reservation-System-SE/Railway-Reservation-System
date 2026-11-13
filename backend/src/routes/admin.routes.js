const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { isNonEmptyString, isPositiveNumber, isValidDate, stripHtml } = require('../utils/validate');
const router = express.Router();
router.use(auth, requireAdmin);

const CLASS_NAMES = ['SL', '3A', '2A'];
const validClass = (c) =>
  c &&
  CLASS_NAMES.includes(c.class_name) &&
  isPositiveNumber(c.fare) &&
  Number.isSafeInteger(c.totalSeats) &&
  c.totalSeats > 0;
const parseTrainId = (value) => {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

// RRS-F-050: admin adds a new train with its classes.
// Auth + admin-only checks are added by RRS-SR-004.
router.post('/trains', (req, res) => {
  const { number, name, source, destination, travelDate, classes } = req.body || {};
  const cleanedFields = {
    number: stripHtml(number),
    name: stripHtml(name),
    source: stripHtml(source),
    destination: stripHtml(destination),
  };

  if (!Object.values(cleanedFields).every(isNonEmptyString)) {
    return res.status(400).json({ error: 'number, name, source, destination and travelDate are required' });
  }
  if (!isValidDate(travelDate)) {
    return res.status(400).json({ error: 'travelDate must be a valid date today or later (YYYY-MM-DD)' });
  }
  if (!Array.isArray(classes) || classes.length === 0) {
    return res.status(400).json({ error: 'at least one class is required' });
  }
  if (!classes.every(validClass)) {
    return res.status(400).json({ error: 'each class needs class_name (SL, 3A or 2A), fare > 0 and totalSeats > 0' });
  }

  const insertTrain = db.prepare(
    'INSERT INTO trains (number, name, source, destination, travel_date) VALUES (?,?,?,?,?)'
  );
  const insertClass = db.prepare(
    'INSERT INTO train_classes (train_id, class_name, fare, total_seats) VALUES (?,?,?,?)'
  );

  const create = db.transaction(() => {
    const result = insertTrain.run(
      cleanedFields.number,
      cleanedFields.name,
      cleanedFields.source,
      cleanedFields.destination,
      travelDate
    );
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
// UI-ADMIN support: list every train with its classes (not in the original API table).
router.get('/trains', (req, res) => {
  const trains = db.prepare('SELECT * FROM trains ORDER BY travel_date, id').all();
  const classesFor = db.prepare(
    'SELECT class_name, fare, total_seats, booked_seats FROM train_classes WHERE train_id = ? ORDER BY id'
  );
  return res.status(200).json(
    trains.map((t) => ({
      id: t.id,
      number: t.number,
      name: t.name,
      source: t.source,
      destination: t.destination,
      travelDate: t.travel_date,
      classes: classesFor.all(t.id).map((c) => ({
        class_name: c.class_name,
        fare: c.fare,
        totalSeats: c.total_seats,
        bookedSeats: c.booked_seats,
      })),
    }))
  );
});
router.put('/trains/:id', (req, res) => {
  const id = parseTrainId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'Invalid train ID' });
  }

  const train = db.prepare('SELECT id FROM trains WHERE id = ?').get(id);
  if (!train) {
    return res.status(404).json({ error: 'Train not found' });
  }

  const { number, name, source, destination, travelDate, classes } = req.body || {};
  const fields = {
    number: number === undefined ? undefined : stripHtml(number),
    name: name === undefined ? undefined : stripHtml(name),
    source: source === undefined ? undefined : stripHtml(source),
    destination: destination === undefined ? undefined : stripHtml(destination),
    travel_date: travelDate,
  };

  for (const value of Object.values(fields)) {
    if (value !== undefined && !isNonEmptyString(value)) {
      return res.status(400).json({ error: 'train fields must be non-empty text' });
    }
  }
  if (travelDate !== undefined && !isValidDate(travelDate)) {
    return res.status(400).json({ error: 'travelDate must be a valid date today or later (YYYY-MM-DD)' });
  }
  if (classes !== undefined && (!Array.isArray(classes) || !classes.every(validClass))) {
    return res
      .status(400)
      .json({ error: 'each class needs class_name (SL, 3A or 2A), fare > 0 and totalSeats > 0' });
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
});

// RRS-F-051: delete a train unless it has CONFIRMED bookings.
router.delete('/trains/:id', (req, res) => {
  const id = parseTrainId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'Invalid train ID' });
  }

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
    // Only CANCELLED bookings can remain here (CONFIRMED ones were rejected above).
    // They reference the train, so they must be removed before the train itself.
    db.prepare("DELETE FROM bookings WHERE train_id = ? AND status = 'CANCELLED'").run(id);
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

// RRS-F-052: list every booking (CONFIRMED and CANCELLED) for one train.
router.get('/trains/:id/bookings', (req, res) => {
  const id = parseTrainId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'Invalid train ID' });
  }

  const train = db.prepare('SELECT id FROM trains WHERE id = ?').get(id);
  if (!train) {
    return res.status(404).json({ error: 'Train not found' });
  }

  const rows = db
    .prepare('SELECT * FROM bookings WHERE train_id = ? ORDER BY created_at DESC, id DESC')
    .all(id);

  const bookings = rows.map((b) => {
    let passengers = [];
    try {
      passengers = JSON.parse(b.passengers_json);
    } catch (err) {
      passengers = [];
    }
    return {
      pnr: b.pnr,
      passengerNames: passengers.map((p) => p.name),
      classType: b.class_name,
      status: b.status,
      farePaid: b.fare_paid,
    };
  });

  return res.status(200).json(bookings);
});
module.exports = router;