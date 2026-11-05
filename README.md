# Railway Reservation System

Problem Statement No. 15 — Group 5

A web-based railway reservation system: passengers can register, log in, search trains, book tickets (simulated payment, PNR generated), cancel bookings and check PNR status/history; admins manage trains and view bookings.

**Stack:** Node.js + Express, SQLite (better-sqlite3), React + Vite.

## Team

| Name | SRN | Role |
|------|-----|------|
| Simon C A (Scrum Master) | PES2UG24CS503 | Backend Developer (Auth & Booking/Payment) |
| Syed Obaid Faraz | PES2UG24CS546 | Backend Developer (Search, Cancellation, PNR/History) |
| Sudha | PES2UG24CS529 | Frontend Developer + Test Engineer |
| Tanisha Khoria | PES2UG24CS551 | Admin Module Developer + DevOps/QA Lead |

## Repository layout

```
backend/            Express API
frontend/           React + Vite app
db/                 schema.sql and the SQLite file (railway.db, gitignored)
.github/workflows/  CI (GitHub Actions)
```
## HTTPS and demo scope
 * This demo runs only on localhost over HTTP.
* Not enabling HTTPS is an intentional exception for this local demo, not a claim that localhost can't use HTTPS.
* An online deployment would need HTTPS configured and verified.

## How to run

### Prerequisites

- Node.js and npm
- Run these commands from the repository root.

### First-time setup

Install backend and frontend dependencies:

```powershell
npm --prefix backend install
npm --prefix frontend install
```

The backend needs `JWT_SECRET` for login and authenticated requests. If
`backend/.env` does not already exist, copy `backend/.env.example` to
`backend/.env` and replace the example value with a private development secret.
Keep `.env` local; it is ignored by Git.

A fresh checkout also needs a database schema and sample data. To initialize a
disposable development database, run:

```powershell
npm --prefix backend run seed
```

**Warning:** seeding deletes all existing bookings, train classes, and trains
before inserting sample data. Do not run it against a database whose data you
need to keep.

### Start the app

1. In a terminal at the repository root, start the backend and leave it running:

   ```powershell
   npm --prefix backend run dev
   ```

   The API listens on `http://localhost:4000`.

2. Open a second terminal at the repository root, start the frontend, and leave
   it running:

   ```powershell
   npm --prefix frontend run dev
   ```

   Vite prints the local frontend URL, normally `http://localhost:5173`.

3. Open the printed frontend URL in a browser. The backend health check is
   available at `http://localhost:4000/health` and should return
   `{"status":"ok"}`.

Keep both terminals running during a demo. If either process exits, restart it
with its command above. Stop a server with `Ctrl+C` in its own terminal when
you are finished.
