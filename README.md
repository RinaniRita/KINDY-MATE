# Kindy-Mate 🎈

Your child's AI-powered learning and safety companion. Bridging the gap between fun education and parental peace of mind.

## Architecture

This project is built using a modern decoupled architecture:

1. **Frontend (Next.js 15+)**
   - Feature-Sliced Design (FSD)
   - Tailwind CSS v4 Global Design System
   - Lives in `/frontend`
   - Run with `pnpm dev`

2. **Backend (Django 5.1 + Python 3.11)**
   - Modular Apps: Authentication, Profiles, Learning, Gamification, AI Agent, Activity Logger
   - Postgres & Redis
   - Managed with `uv`
   - Lives in `/backend`
   - Run with `uv run manage.py runserver`

## Getting Started

Make sure you have [Docker](https://www.docker.com/), [uv](https://github.com/astral-sh/uv), and [pnpm](https://pnpm.io/) installed.

### 1. Environment
Copy `.env.example` to `.env` and configure your local keys.

### 2. Services
Run the database layer via Docker:
```bash
docker-compose up -d
```

### 3. Backend Setup
```bash
cd backend
uv run manage.py migrate
uv run manage.py runserver
```

### 4. Frontend Setup
```bash
cd frontend
pnpm install
pnpm dev
```

Visit `http://localhost:3000` to see the application!

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

