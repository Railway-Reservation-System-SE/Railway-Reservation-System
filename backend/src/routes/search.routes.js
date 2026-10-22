
const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /trains/search?source=Bengaluru&destination=Chennai&date=2026-11-02
router.get('/search', (req, res) => {
  const { source, destination, date } = req.query;

  if (
    typeof source !== 'string' ||
    typeof destination !== 'string' ||
    typeof date !== 'string' ||
    !source.trim() ||
    !destination.trim() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return res.status(400).json({
      error: 'source, destination, and date (YYYY-MM-DD) are required',
    });
  }

  try {
    const trains = db.prepare(`
      SELECT
        t.id,
        t.number,
        t.name,
        t.source,
        t.destination,
        t.travel_date
      FROM trains AS t
      WHERE LOWER(TRIM(t.source)) = LOWER(TRIM(?))
        AND LOWER(TRIM(t.destination)) = LOWER(TRIM(?))
        AND t.travel_date = ?
      ORDER BY t.number ASC
    `).all(source, destination, date);

    const getClasses = db.prepare(`
      SELECT
        class_name,
        total_seats,
        booked_seats,
        MAX(total_seats - booked_seats, 0) AS available_seats
      FROM train_classes
      WHERE train_id = ?
      ORDER BY
        CASE class_name
          WHEN 'SL' THEN 1
          WHEN '3A' THEN 2
          WHEN '2A' THEN 3
          ELSE 4
        END
    `);

    const result = trains.map((train) => ({
      ...train,
      classes: getClasses.all(train.id).map((trainClass) => ({
        class_name: trainClass.class_name,
        total_seats: trainClass.total_seats,
        booked_seats: trainClass.booked_seats,
        available_seats: trainClass.available_seats,
      })),
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error('Train search failed:', error.message);
    return res.status(500).json({ error: 'Unable to search trains' });
  }
});

module.exports = router;
