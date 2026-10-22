const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/trains?source=Bengaluru&destination=Chennai&travel_date=2026-10-25
router.get('/', (req, res) => {
  const { source, destination, travel_date: travelDate } = req.query;

  if (
    typeof source !== 'string' ||
    typeof destination !== 'string' ||
    typeof travelDate !== 'string' ||
    !source.trim() ||
    !destination.trim() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(travelDate)
  ) {
    return res.status(400).json({
      error: 'source, destination, and travel_date (YYYY-MM-DD) are required',
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
    `).all(source, destination, travelDate);

    return res.status(200).json({ trains });
  } catch (error) {
    console.error('Train search failed:', error.message);
    return res.status(500).json({ error: 'Unable to search trains' });
  }
});

module.exports = router;
