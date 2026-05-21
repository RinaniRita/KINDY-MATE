FROM node:22-alpine

# Install pnpm globally
RUN npm install -g pnpm@9.15.4

WORKDIR /app/frontend

# Copy dependency definition and lock file for layer caching
COPY package.json pnpm-lock.yaml* ./

# Install dependencies at build-time
RUN pnpm install

# Copy all frontend files
COPY . .

# Expose Next.js default port
EXPOSE 3000

# Clear the host-mapped .next cache on every container startup, then launch the dev server.
# This prevents stale compiler cache from causing 404s on new/changed routes.
CMD ["sh", "-c", "rm -rf .next && pnpm dev --hostname 0.0.0.0"]
