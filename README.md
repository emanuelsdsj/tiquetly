# Tiquetly

An events and ticketing platform with three roles: organizer, customer,
and gatekeeper. The organizer builds events from an external catalog
(shows via Ticketmaster, movies via TMDb), the customer browses, reserves
a spot, and pays through a simulated flow, and the gatekeeper validates
the ticket at the door.

🇧🇷 [Leia em português](README.pt-BR.md)

> This README tracks the project as it's being built and does not
> describe the final product yet. The [Current state](#current-state)
> section says exactly what already works and what's missing.

## Contents

- [Stack](#stack)
- [Running the project](#running-the-project)
- [Environment variables](#environment-variables)
- [Test data (seed)](#test-data-seed)
- [Walking through the full flow](#walking-through-the-full-flow)
- [Current state](#current-state)
- [Design decisions](#design-decisions)

## Stack

- Backend: Python 3.12, FastAPI, SQLModel on top of SQLAlchemy, Alembic
  for migrations. SQLite in development, Postgres in production.
- Frontend: React with Vite, plain JavaScript (no TypeScript), React
  Router. Custom CSS, no UI kit.
- Authentication: JWT (`python-jose`) and password hashing with bcrypt
  (`passlib`).
- Development environment: devcontainer (Python 3.12 + Node 20 via
  feature).

## Running the project

### With the devcontainer (recommended)

1. Open the folder in VS Code. If the Dev Containers extension is
   installed, a prompt should offer to open it in the container: from
   that prompt or the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`),
   choose **Dev Containers: Rebuild and Reopen in Container** the first
   time (builds the image from scratch). After that, **Reopen in
   Container** is enough. `devcontainer up` from the CLI also works.
   Backend and frontend dependencies are installed automatically by
   `postCreateCommand`.
2. Copy `backend/.env.example` to `backend/.env` and fill in the API
   keys (see [Environment variables](#environment-variables)).
3. Run the migrations and start both servers:

   ```
   cd backend
   .venv/bin/alembic upgrade head
   .venv/bin/uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
   ```

   ```
   cd frontend
   npm install
   npm run dev
   ```

   The backend's `--host 0.0.0.0` is required for VS Code's automatic
   port forwarding to work from outside the container (the frontend
   already handles this on its own, `vite.config.js` sets
   `server.host = true`). Without that flag the server still starts
   fine, but nothing opens in the host browser.

4. Backend at http://localhost:8000 (interactive docs at `/docs`),
   frontend at http://localhost:5173.

### Without the devcontainer

Requires Python 3.12+ and Node 20+ installed on the machine.

```
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env   # fill in the API keys
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --reload --port 8000
```

```
cd frontend
npm install
npm run dev
```

### With Docker Compose

An alternative that doesn't depend on the devcontainer or installing
Python/Node on the machine: brings up backend, frontend, and a real
Postgres (not the local dev SQLite, see
[Design decisions](#design-decisions)) in three containers.

```
cp .env.example .env   # fill in the API keys and change the secrets
docker compose up --build
```

Frontend at http://localhost:5173, backend at http://localhost:8000.
Doesn't seed test data on its own; run the seed by hand once all three
services are up, if you want it:

```
docker compose exec backend python -m app.seed
```

> This path could not be tested with a real `docker compose up` during
> development: the devcontainer used to build the project has no Docker
> available inside it. The files were reviewed by hand and the
> `docker-compose.yml` validated as YAML, but not run end to end. See
> [Current state](#current-state).

## Environment variables

Backend (`backend/.env`, see `backend/.env.example`):

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Defaults to local SQLite, no setup needed. |
| `FRONTEND_ORIGIN` | Origin allowed by CORS, needs to match wherever the frontend runs. |
| `JWT_SECRET_KEY` | Secret for auth tokens. Generate your own value. |
| `QR_HMAC_SECRET` | Secret for the ticket QR signature. Generate your own value. |
| `TICKETMASTER_API_KEY` | Generate at [developer.ticketmaster.com](https://developer.ticketmaster.com). |
| `TMDB_API_KEY` | Generate at [developer.themoviedb.org](https://developer.themoviedb.org). |

Frontend (`frontend/.env`, see `frontend/.env.example`):

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Backend URL. The default already covers the local setup. |

Docker Compose (root `.env`, see [`.env.example`](.env.example), only
used by [`docker compose up`](#with-docker-compose)): the same six
variables above, plus the three below that assemble the compose
Postgres `DATABASE_URL`.

| Variable | Description |
| --- | --- |
| `POSTGRES_USER` | Compose Postgres user. |
| `POSTGRES_PASSWORD` | Compose Postgres password. |
| `POSTGRES_DB` | Compose Postgres database name. |

## Test data (seed)

With the migrations applied and the API keys filled in, run:

```
cd backend
.venv/bin/python -m app.seed
```

Creates (or reuses, if they already exist: safe to run more than once)
an organizer, two customers, a gatekeeper account, one published show
event (Ticketmaster), and one movie event (TMDb) with seats, with one of
the movie tickets already validated (so the gate screen has an
"already used" case to show, not just the happy path). The script calls
the real Ticketmaster and TMDb, the same path the organizer would use
through the screen, so both API keys need to be configured before
running it.

Credentials (same password for everyone, just to make testing easier):

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@tiquetly.com` | `tiquetly123` |
| Organizer | `organizador@tiquetly.com` | `tiquetly123` |
| Customer 1 | `cliente1@tiquetly.com` | `tiquetly123` |
| Customer 2 | `cliente2@tiquetly.com` | `tiquetly123` |
| Gatekeeper | `portaria@tiquetly.com` | `tiquetly123` |

## Walking through the full flow

After the seed, at http://localhost:5173:

1. **Organizer** (`organizador@tiquetly.com`): sign in, go to
   "Meus eventos" (My events), "Criar evento" (Create event) to publish
   another one from the catalog, or edit/unpublish the two that already
   exist.
2. **Customer** (`cliente1@tiquetly.com` or `cliente2@tiquetly.com`):
   search for an event on the home page, open it, reserve (quantity for
   `general` events, seat map for `seatmap` events), pay with the test
   card that approves (`4242 4242 4242 4242`) or the one that declines
   (`4000 0000 0000 0002`, releases the stock again). A pending
   reservation can also be cancelled before paying ("Desistir e
   cancelar reserva", give up and cancel reservation). Once approved,
   the ticket shows up under "Meus ingressos" (My tickets), with a QR
   code, a code to type in at the gate, and a button to copy the public
   sharing link; from there you can also cancel an already-paid
   reservation (releases the ticket and the seat/stock).
3. **Gatekeeper** (`portaria@tiquetly.com`): sign in, go to "Portaria"
   (Gate), pick today's event, validate by camera or by typing the code
   in. One ticket from the seeded movie event already shows as
   "already used" so you can test that outcome without validating the
   same ticket twice by hand.
4. **Admin** (`admin@tiquetly.com`, optional, see ADR 0023): sign in, go
   to "Admin", create a new organizer or gatekeeper account and sign in
   as it right away, no seed script or database access needed.

## Current state

What already works end to end:

- Authentication with the three roles the challenge asks for (organizer,
  customer, gatekeeper), customer registration, login, JWT. A fourth,
  optional role (admin) creates organizer and gatekeeper accounts from
  its own screen instead of only through the seed script, see ADR 0023.
- Integration with Ticketmaster Discovery and TMDb behind a shared
  catalog adapter.
- The organizer creates events from the catalog through its own screen,
  edits published ones, and unpublishes them.
- The customer browses, searches, and filters published events.
- Reservation by quantity or by seat map: movies are always seat map,
  shows default to quantity but switch to seat map automatically when
  Ticketmaster reports assigned seating for the picked event (see ADR
  0003's addendum). Both guaranteed to never sell the same spot twice
  under concurrency, and both with the option to cancel (before or
  after paying) and return the spot to stock.
- Simulated payment (approval and decline) with a test card, releases
  the stock again on decline or cancellation.
- Signed QR ticket (not forgeable) and the "My tickets" area.
- Ticket sharing via a public link, no login required.
- Gate screen: pick today's event, read by camera or type the code in
  by hand, the four outcomes (valid, invalid, already used, wrong
  event).
- Seed script with test users and events.

Written but not confirmed running end to end (see the limits below):

- `docker-compose.yml` (stretch goal): backend, frontend, and Postgres
  in three containers, see [With Docker Compose](#with-docker-compose).

Live demo (Vercel + Railway, see [Design decisions](#design-decisions)):
https://tiquetly.vercel.app/

No known bugs in the parts already implemented. Two known limits:

- The movie event created by the seed only shows up in the gate
  screen's "today" dropdown on the day the seed was run (the date is
  fixed at noon UTC at seed time, not recalculated afterward), so
  running the seed and testing the gate on different days requires
  running the seed again (idempotent for users and events that already
  exist, but it doesn't reschedule the date of an event that already
  exists).
- `docker-compose.yml` was not validated with a real `docker compose
  up`: the environment used to develop the project has no Docker
  available inside it (no Docker-in-Docker feature in the devcontainer).
  The files were reviewed by hand and the YAML parsed successfully, but
  there's no end-to-end run confirming the stack comes up clean.

This section will be fully revised before the final submission, as the
assignment asks.

## Design decisions

Recorded here in summary, the full history of alternatives considered
and discarded lives in the project's version control.

- Two catalog sources (Ticketmaster for shows, TMDb for movies) behind
  a shared adapter, so the rest of the backend never needs to know
  which of the two originated an event.
- Two reservation flows (quantity and seat map), because
  general-admission floor tickets and a movie screening are genuinely
  different products, forcing both into the same model would distort
  one side or the other.
- No real-time seat map: the screen is optimistic (shows a seat as free
  until someone tries to reserve it) and the server is the source of
  truth at reservation time, with a clear error if the seat was taken
  while the customer was choosing. The gain from a real-time channel
  doesn't pay for the added complexity at this project's size.
- A visual identity of its own (dark palette, Bebas Neue/IBM Plex
  typography, event cards shaped like a physical ticket stub), compared
  side by side with two other directions before being chosen, to avoid
  the generic default look of a tool-generated UI.
- Simulated payment through a fake card form with test numbers, instead
  of a single success button, to genuinely represent the two paths the
  assignment asks for (approval and decline).
- `docker-compose.yml` runs the backend against Postgres, not the local
  dev SQLite, to exercise the same database engine production uses
  (same choice as ADR 0002), instead of just repeating what the local
  setup already shows.
- The app itself has a real, dynamic English/Portuguese language switch
  (English default), backed by a hand-rolled dictionary and React
  Context rather than a library like `react-i18next`, in the same spirit
  as avoiding other dependencies elsewhere in the project. Backend
  domain errors carry a stable machine-readable code so the frontend can
  translate them too, not just the static screen text (ADR 0020). This
  is separate from the bilingual documentation (this README included),
  which is static markdown and has no such toggle, see the language link
  at the top of this file.
- A `pending` reservation that is never paid or cancelled expires on its
  own after 10 minutes, releasing the spot or seat back to stock. Checked
  lazily wherever the app already reads or writes an event's availability
  (reserving, paying, reloading the page), not a background job or
  scheduler, in the same spirit as the "no real-time channel" choice
  above (ADR 0024). The purchase screen shows a live countdown toward the
  same deadline, advisory only: the backend enforces it regardless of
  what the customer's own clock shows.
- A published event whose date has already passed drops out of the
  plain browse search automatically (a read-time filter, `status` keeps
  reading `published`, no unpublish happens on its own), so a customer
  never lands on something they cannot actually attend. The gate
  screen's own "today" query is unaffected, an event that already
  started is exactly what a gatekeeper needs to find there (ADR 0025).
