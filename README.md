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
