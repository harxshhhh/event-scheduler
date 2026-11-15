# Constraint-Based Event Scheduling and Reservation System

A full-stack web app that finds the best time slot for an event, based on room capacity, room bookings and participant availability.

Built for a BSc Artificial Intelligence final project at Anglia Ruskin University (MOD002691): *Evaluating the Impact of AI-Assisted Development on the Design and Implementation of a Full-Stack Web Application.* The app is the case study. The project looks at how AI assistance affected development time, bugs and code quality.

## Features
- Sign up, log in and log out (JWT authentication)
- Create events with a title, duration and capacity
- Enter your availability
- Automatic scheduling: the system picks the best slot for each event
- Dashboard of your events with status (pending or scheduled)
- Light, dark and auto themes
- English, Spanish and French

## How the scheduler works
1. Generate hourly candidate time slots.
2. Remove any slot that breaks a hard constraint:
   - time clash with another booking
   - room capacity or room already booked
   - participants not available
3. Score the remaining slots: 60% room fit and 40% participant availability.
4. Pick the highest-scoring slot.

## Tech stack
| Layer | Technology |
| --- | --- |
| Frontend | React, Vite |
| Backend | Node.js, Express 5 (REST API) |
| Database | PostgreSQL 16 (Docker) |
| Auth | JSON Web Tokens, bcryptjs |

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

## Project structure
```
backend/      Express API, scheduling engine, routes
frontend/     React app
database/     SQL schema and seed data
docker-compose.yml
```

## How AI was used
Most of the code was generated with AI assistance under my direction. I designed the scheduling rules, checked each change in the real files, tested the results and fixed bugs. Every task was logged in a development log (time spent, whether AI was used, problems found), which is the data for the evaluation in my report.

## Ethics
Ethics application ETH2526-3817, rated Green (low risk), no ethical approval required.

## Author
Harsh Punia, supervised by Dr Mahmud Hasan.
