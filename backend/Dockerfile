FROM python:3.11-slim

# Install system dependencies and clean up apt cache
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv globally
RUN pip install --no-cache-dir uv

WORKDIR /app/backend

# Copy python dependencies lock files for layer caching
COPY pyproject.toml uv.lock ./

# Pre-sync/install project dependencies
RUN uv sync --frozen --no-dev

# Copy the rest of the backend files
COPY . .

# Expose Django backend default port
EXPOSE 8000

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=config.settings.development

# Default startup command (will be overridden or run by docker-compose)
CMD ["uv", "run", "manage.py", "runserver", "0.0.0.0:8000"]
