# Kindy-Mate 🎈

Your child's AI-powered learning and safety companion. Bridging the gap between fun education and parental peace of mind.

## Architecture

This project is built using a modern decoupled architecture:

1. **Frontend (Next.js 15+)**
   - Feature-Sliced Design (FSD)
   - Tailwind CSS v4 Global Design System
   - Lives in `/frontend`
   - Served by the `frontend` Docker service

2. **Backend (Django 5.1 + Python 3.11)**
   - Modular Apps: Authentication, Profiles, Learning, Gamification, AI Agent, Activity Logger
   - Postgres & Redis
   - Managed with `uv`
   - Lives in `/backend`
   - Served by the `backend` Docker service

## Getting Started

The local development stack runs through Docker Compose. You do not need to install or run `uv`, `pnpm`, Postgres, or Redis directly on your machine.

Make sure you have [Docker](https://www.docker.com/) installed.

### 1. Environment
Copy `.env.example` to `.env` and configure any local or optional AI provider keys:

```bash
cp .env.example .env
```

On Windows PowerShell:

```bash
Copy-Item .env.example .env
```

### 2. Start the App
Build and start the full stack:

```bash
docker compose up --build
```

This starts:

- `db`: PostgreSQL on `localhost:5432`
- `redis`: Redis on `localhost:6379`
- `backend`: Django API on `http://localhost:8000`
- `frontend`: Next.js app on `http://localhost:3000`

During backend startup, Docker Compose runs migrations and seeds demo/curated content automatically:

```bash
uv run manage.py migrate
uv run manage.py seed_demo
uv run manage.py seed_curated_content
```

Visit `http://localhost:3000` to use the application.

### 3. Useful Commands

Run the stack in the background:

```bash
docker compose up -d --build
```

View service logs:

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

Run a Django management command inside the backend container:

```bash
docker compose exec backend uv run manage.py <command>
```

Stop the stack:

```bash
docker compose down
```

Reset local database data:

```bash
docker compose down -v
docker compose up --build
```

## Troubleshooting & Common Issues

### 1. Dynamic Routing Returns 404 (Stale Cache)
In development, Next.js (with Turbopack) caches route maps inside the `.next` directory. Since this folder is mapped to the host disk, a compiler crash (e.g. from missing or ignored library imports) can cause Next.js to get stuck serving a cached "404 Not Found" state even after the code has been corrected and the Docker container restarted.

**Solution:**
Wipe the dynamic compiler cache folder on the host and restart the service:
```bash
# 1. Stop the frontend container
docker compose stop frontend

# 2. Delete the cache folder on the host
# (On Windows Powershell):
Remove-Item -Recurse -Force ./frontend/.next
# (On macOS/Linux):
rm -rf ./frontend/.next

# 3. Start the container back up (forces a fresh from-scratch compilation)
docker compose start frontend
```

### 2. Child Mission Loading Screen Freezes
If a custom child mission sub-component (such as `MathPicturesMission` or a custom mascot action) throws a runtime exception or handles un-seeded/unmounted states improperly during render, React's render loop can halt before updating the page shell. This leaves the `"Milo đang mở nhiệm vụ cho cậu..."` loading screen visible.

**Solution / Safety Features:**
*   A **3-second backup timer** is integrated inside `MissionDetail.tsx` that forcefully sets `loading` to `false` even if the backend fetch hangs.
*   Check the browser's JavaScript developer console (`F12`) to catch the specific component runtime crash (e.g. division by zero, undefined layout states, or unseeded properties).

