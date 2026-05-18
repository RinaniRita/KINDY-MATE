# Kindy-Mate Deployment

## Local Development

Run database only when developing backend and frontend manually:

```powershell
docker compose up -d db redis
cd backend
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_demo
.\.venv\Scripts\python.exe manage.py runserver
```

```powershell
cd frontend
npx pnpm@9.15.4 install
npx pnpm@9.15.4 dev
```

## Local Competition Fallback

Run the full stack locally:

```powershell
docker compose up -d
```

Services:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api/v1`
- Django admin: `http://localhost:8000/admin`

## Online Competition Deployment

Recommended split:

- Frontend: Vercel
- Backend: Render, Railway, or Fly.io
- Database: managed PostgreSQL

Required env vars:

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG=false`
- `DJANGO_ALLOWED_HOSTS`
- `DATABASE_URL` or `POSTGRES_*`
- `CORS_ALLOWED_ORIGINS`
- `FRONTEND_URL`
- `NEXT_PUBLIC_API_URL`

AI providers remain optional for the MVP. Child-facing free chat is not part of the deployment.
