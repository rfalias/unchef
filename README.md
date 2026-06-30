# Uninspired Chef

A self-hosted recipe manager and aisle-aware shopping list app. Import recipes from any URL, organize your grocery store's aisles with keywords, and generate shopping lists sorted by aisle order for an efficient trip.

## Features

- **Recipe import** — paste any URL and the app parses it automatically (JSON-LD fast path for 300+ sites, Claude AI fallback for others)
- **Manual recipe entry** — add and edit recipes with ingredients, instructions, and tags
- **Aisle-aware shopping lists** — define your actual store layout (aisle names, order, keywords); items are automatically matched and sorted by aisle position
- **Ingredient deduplication** — combining multiple recipes on one list merges duplicates and sums amounts
- **Aisle pinning** — override which aisle an item belongs to; pins are remembered per store so future lists are correct automatically
- **Drag-to-reorder aisles** — rearrange your store layout with drag and drop
- **AI keyword suggestions** — optionally use Claude to suggest keywords for each aisle
- **Branding** — admins can set the app name and icon (emoji or uploaded image)
- **Dark UI** — responsive, mobile-friendly dark theme
- **Auth** — local accounts with JWT tokens; first user to register becomes admin

## Quick start — pull from ghcr.io

**Requirements:** Docker and Docker Compose.

```bash
# 1. Grab just the compose file and env template
curl -O https://raw.githubusercontent.com/rfalias/unchef/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/rfalias/unchef/main/.env.example

# 2. Create your .env
cp .env.example .env

# 3. Fill in the required values
#    Generate a secret:  python3 -c "import secrets; print(secrets.token_hex(32))"
nano .env

# 4. Pull and start
docker compose pull
docker compose up -d
```

The app is available at `http://localhost` (or the `PORT` you set). Register the first account — it is automatically granted admin access.

## Quick start — build from source

```bash
git clone https://github.com/rfalias/unchef.git
cd unchef

cp .env.example .env
nano .env   # set JWT_SECRET at minimum

docker compose up -d --build
```

## Configuration

### `.env` (Docker Compose)

| Variable      | Default  | Description |
|---------------|----------|-------------|
| `JWT_SECRET`  | —        | **Required.** Long random string used to sign tokens. Generate with `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `GHCR_REPO`   | —        | **Required to pull.** e.g. `ghcr.io/youruser/uninspired-chef` |
| `IMAGE_TAG`   | `latest` | Pin a specific release, e.g. `v1.2.0` |
| `PORT`        | `80`     | Host port the app is served on |

### Backend env (inside `backend/.env`, dev only)

| Variable               | Default                                        | Description |
|------------------------|------------------------------------------------|-------------|
| `DATABASE_URL`         | `sqlite+aiosqlite:///./food_app.db`            | SQLAlchemy async DB URL |
| `CORS_ORIGINS`         | `["http://localhost:5173"]`                    | JSON array of allowed origins |
| `JWT_SECRET`           | —                                              | Must match the compose value |
| `JWT_LIFETIME_SECONDS` | `2592000` (30 days)                            | Token lifetime |

## Development setup

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

Requires Node.js ≥ 20.

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server runs on `http://localhost:5173` and proxies `/api` to `localhost:8000`.

## Data persistence

The SQLite database lives in a Docker named volume (`db_data`) and survives container restarts and upgrades.

**Backup:**
```bash
docker compose exec backend sqlite3 /data/food_app.db ".backup /data/backup.db"
docker compose cp backend:/data/backup.db ./backup.db
```

**Restore:**
```bash
docker compose cp ./backup.db backend:/data/food_app.db
docker compose restart backend
```

## Roles

| Role    | Permissions |
|---------|-------------|
| `user`  | Manage recipes, stores, and shopping lists |
| `admin` | All of the above + manage users, roles, and app branding |

The first account registered is automatically promoted to admin. Additional accounts can be promoted via **Admin → User Management**.

## Optional: Claude AI integration

Admins can add a Claude API key under **Settings → Claude API Key**. This enables:
- AI recipe import for sites without structured data
- AI-suggested aisle keywords

Without a key the app works fully; AI features are simply hidden.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, SQLAlchemy 2 (async), SQLite, fastapi-users |
| Frontend | React, Vite, TypeScript, Tailwind CSS, TanStack Query |
| Recipe parsing | recipe-scrapers, BeautifulSoup4, JSON-LD |
| AI | Anthropic Claude (optional) |
| Aisle matching | rapidfuzz (fuzzy keyword matching) |
| Container | Docker Compose, nginx, uvicorn |
