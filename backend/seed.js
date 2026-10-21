
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, '..', 'db', 'railway.db');
const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');

const db = new Database(dbPath);

// Create the tables from schema.sql
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

// Sample trains
const trains = [
  {
    number: '12627',
    name: 'Karnataka Express',
    source: 'Bengaluru',
    destination: 'New Delhi',
    travel_date: '2026-11-01',
    classes: [
      { class_name: 'SL', fare: 550, total_seats: 100 },
      { class_name: '3A', fare: 1450, total_seats: 60 },
      { class_name: '2A', fare: 2100, total_seats: 30 }
    ]
  },
  {
    number: '12628',
    name: 'Karnataka Express',
    source: 'New Delhi',
    destination: 'Bengaluru',
    travel_date: '2026-11-03',
    classes: [
      { class_name: 'SL', fare: 550, total_seats: 100 },
      { class_name: '3A', fare: 1450, total_seats: 60 },
      { class_name: '2A', fare: 2100, total_seats: 30 }
    ]
  },
  {
    number: '12007',
    name: 'Shatabdi Express',
    source: 'Bengaluru',
    destination: 'Chennai',
    travel_date: '2026-11-02',
    classes: [
      { class_name: 'SL', fare: 300, total_seats: 80 },
      { class_name: '3A', fare: 850, total_seats: 50 },
      { class_name: '2A', fare: 1200, total_seats: 25 }
    ]
  },
  {
    number: '12640',
    name: 'Brindavan Express',
    source: 'Chennai',
    destination: 'Bengaluru',
    travel_date: '2026-11-04',
    classes: [
      { class_name: 'SL', fare: 280, total_seats: 80 },
      { class_name: '3A', fare: 800, total_seats: 50 },
      { class_name: '2A', fare: 1150, total_seats: 25 }
    ]
  },
  {
    number: '12951',
    name: 'Mumbai Rajdhani',
    source: 'Mumbai',
    destination: 'New Delhi',
    travel_date: '2026-11-05',
    classes: [
      { class_name: 'SL', fare: 700, total_seats: 100 },
      { class_name: '3A', fare: 1800, total_seats: 60 },
      { class_name: '2A', fare: 2600, total_seats: 30 }
    ]
  }
];

const insertTrain = db.prepare(`
  INSERT INTO trains (number, name, source, destination, travel_date)
  VALUES (@number, @name, @source, @destination, @travel_date)
`);

const insertClass = db.prepare(`
  INSERT INTO train_classes
    (train_id, class_name, fare, total_seats, booked_seats)
  VALUES (?, ?, ?, ?, 0)
`);

const insertAdmin = db.prepare(`
  INSERT OR IGNORE INTO users (name, email, password_hash, role)
  VALUES (?, ?, ?, 'admin')
`);

const seed = db.transaction(() => {
  // WARNING: Resets all bookings, train classes, and trains.
  // Run only against a disposable development database.
  // Delete child records before parent records.
  db.prepare('DELETE FROM bookings').run();
  db.prepare('DELETE FROM train_classes').run();
  db.prepare('DELETE FROM trains').run();

  for (const train of trains) {
    const result = insertTrain.run({
      number: train.number,
      name: train.name,
      source: train.source,
      destination: train.destination,
      travel_date: train.travel_date
    });

    for (const seatClass of train.classes) {
      insertClass.run(
        result.lastInsertRowid,
        seatClass.class_name,
        seatClass.fare,
        seatClass.total_seats
      );
    }
  }

  const passwordHash = bcrypt.hashSync('admin123', 10);
  insertAdmin.run(
    'Railway Administrator',
    'admin@rrs.test',
    passwordHash
  );
});

try {
  seed();
  console.log('Database seeded successfully.');
  console.log('Admin email: admin@rrs.test');
  console.log('Admin password: admin123');
} catch (error) {
  console.error('Failed to seed database:', error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
