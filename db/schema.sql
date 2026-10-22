
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'passenger'
                  CHECK (role IN ('passenger', 'admin')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trains (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    number       TEXT NOT NULL,
    name         TEXT NOT NULL,
    source       TEXT NOT NULL,
    destination  TEXT NOT NULL,
    travel_date  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS train_classes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    train_id     INTEGER NOT NULL REFERENCES trains(id),
    class_name   TEXT NOT NULL CHECK (class_name IN ('SL', '3A', '2A')),
    fare         REAL NOT NULL,
    total_seats  INTEGER NOT NULL,
    booked_seats INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bookings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    pnr             TEXT NOT NULL UNIQUE,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    train_id        INTEGER NOT NULL REFERENCES trains(id),
    class_name      TEXT NOT NULL,
    travel_date     TEXT NOT NULL,
    passengers_json TEXT NOT NULL,
    fare_paid       REAL NOT NULL,
    status          TEXT NOT NULL DEFAULT 'CONFIRMED'
                    CHECK (status IN ('CONFIRMED', 'CANCELLED')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
