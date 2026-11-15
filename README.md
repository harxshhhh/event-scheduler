# Constraint-Based Event Scheduling and Reservation System

A full-stack web app that finds the best time slot and room for an event, based on room capacity, room bookings, participant availability and event priority.

Built for a BSc Artificial Intelligence final project at Anglia Ruskin University (MOD002691): *Evaluating the Impact of AI-Assisted Development on the Design and Implementation of a Full-Stack Web Application.* The app is the case study. The project looks at how AI assistance affected development time, bugs and code quality.

## Features
- Sign up, log in and log out (JWT authentication)
- Create events with a title, duration, time window, room capacity and participants (mandatory or optional)
- **Event priority:** low, normal or high. When events compete for the same slot or room, higher priority is scheduled first
- Enter your weekly availability
- Automatic scheduling: the system picks the best slot and room for an event
- **Schedule all pending:** schedules every pending event at once, highest priority first
- Dashboard of your events with status (pending or scheduled), priority and scheduled time
- Clear reasons when no feasible schedule exists
- Light, dark and auto themes
- Four languages: English, Spanish, French and German

## How the scheduler works
1. Generate hourly candidate time slots inside the requested window.
2. Remove any slot that breaks a hard constraint:
   - **Participant availability:** every mandatory participant must be free (if nobody is marked mandatory, everyone must be free).
   - **Time clash:** no participant may already be in an overlapping scheduled event.
   - **Room:** the room must be big enough and not already booked.
3. Score the remaining options: 60% room fit and 40% availability of optional participants.
4. Pick the highest-scoring option. If none is left, the event stays pending and the reasons are returned.

**Priorities:** `POST /api/schedule-pending` schedules pending events one at a time in this order: priority (3 high, 2 normal, 1 low), then oldest first. A high-priority event therefore gets first pick of slots and rooms, and lower-priority events fit around it.

## Tech stack
| Layer | Technology |
| --- | --- |
| Frontend | React, Vite |
| Backend | Node.js, Express 5 (REST API) |
| Database | PostgreSQL 16 (Docker) |
| Auth | JSON Web Tokens, bcryptjs |
| Tests | Node.js built-in test runner (`node --test`) |

## Run it locally
**You need:** Docker Desktop and Node.js 18 or newer.

1. **Start the database** from the project root:
   ```bash
   docker compose up -d
   ```
2. **Start the backend:**
   ```bash
   cd backend
   cp .env.example .env     # then edit the values in .env
   npm install
   npm run dev
   ```
   The API runs on http://localhost:4000.
3. **Start the frontend** in a second terminal:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open http://localhost:5173.

The `.env` file is not in this repository. Copy `backend/.env.example` and set your own values, including a long random `JWT_SECRET`.

**Existing database?** If you created the database before the priority feature was added, add the column once:
```bash
docker exec -it scheduler_db psql -U scheduler_user -d scheduler_db -c "ALTER TABLE events ADD COLUMN priority SMALLINT NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3);"
```
A fresh `docker compose up` creates it automatically.

## Run the tests
```bash
cd backend
npm test
```
The 14 tests use an in-memory stand-in for the database, so they run in under a second and don't need Docker. They cover:
- conflicting availability between participants
- participant availability (including a Sunday regression test)
- room capacity limits and rooms that are already booked
- participants who already have an overlapping event
- cases where no feasible schedule exists
- scheduling priorities (a high-priority event created later wins a contested slot)

## API overview
All routes need a login token (`Authorization: Bearer <token>`) except register and login.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | Create an account, log in |
| GET | `/api/auth/me` | Current user |
| GET, POST | `/api/events` | List events, create an event (with `priority` 1 to 3) |
| GET, PUT, DELETE | `/api/events/:id` | Read, update or delete an event |
| POST | `/api/events/:id/schedule` | Run the scheduler for one event |
| POST | `/api/schedule-pending` | Schedule all pending events, highest priority first |

## Project structure
```
backend/
  src/
    routes/       Express routes (auth, events, schedule, availability, rooms, users)
    scheduler/    Scheduling engine (candidate slots, constraints, scoring, priorities)
    middleware/   JWT authentication
    db/           Database connection
  test/           Scheduler tests and fake database
frontend/
  src/
    pages/        Dashboard, Create Event, Availability, Settings, Login
    i18n/         English, Spanish, French and German text
    api/          API client
database/init/    SQL schema and seed data
docker-compose.yml
```

## How AI was used
Most of the code was generated with AI assistance under my direction. I designed the scheduling rules, checked each change in the real files, tested the results and fixed bugs. Every task was logged in a development log (time spent, whether AI was used, problems found), which is the data for the evaluation in my report. A small number of features are being built with and without AI so the two can be compared.

## Ethics
Ethics application ETH2526-3817, rated Green (low risk), no ethical approval required.

## Author
Harsh Punia, supervised by Dr Mahmud Hasan.
