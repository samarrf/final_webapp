Final project for CS 5244. A property management platform for small landlords: landlords track units, rent, and maintenance; tenants pay rent and submit requests through their own portal.

Everything runs in Docker, so you don't need to install PHP, MySQL, or anything else locally. The frontend runs separately via npm.

-- What you need first

- Docker Desktop (or Docker Engine + Compose on Linux)
- Node.js and npm
- Git

-- Step 1: Start the backend

```bash
git clone <repo-url>
cd <repo-folder>
docker compose up --build -d
```

First run takes a minute or two while MySQL initializes and loads the schema; after that, startups are fast.

-- Step 2: Check it's up

```bash
docker compose ps
```

You should see everything listed as `running` (mysql may briefly show "starting" before flipping to healthy).

**Note:** `http://localhost:8000` is the API only; there's no page to load at that root URL, so seeing a "Forbidden" error there is expected, not a problem. It only responds to real API paths (things like `http://localhost:8000/api/properties.php`). The actual app UI is the frontend, in the next step.

-- Step 3: Start the frontend

The frontend is a separate app and isn't started by Docker:

```bash
cd <frontend-folder>
npm install
npm run dev
```

Once it starts, open **http://localhost:5173** — that's the actual site. It talks to the API on port 8000 behind the scenes.

-- Login accounts

All accounts use the password `password123`.

| Role | Email |
| Landlord | samar@homeease.dev |
| Tenant | mchen@example.com |
| Tenant | jalvarez@example.com |
| Tenant | sokafor@example.com |

-- If something looks broken

```bash
docker compose logs php
```

This is usually the first place to look; most issues show up here as a PHP error or a failed DB connection.

-- Shutting it down

```bash
docker compose down
```

If you want to wipe all data and start completely fresh next time:

```bash
docker compose down -v
```

- Editing backend PHP files takes effect immediately; no restart needed.
- The API listens on port 8000; if that's already taken on your machine, open `docker-compose.yml` and change the left-hand number under the `php` service's `ports:` section.
- There's an optional script, `backend/scripts/expire_leases.php`, that expires old leases and frees up units. It's not automatic; run it manually if you want to see that behavior:
  ```bash
  docker compose exec php php scripts/expire_leases.php
  ```