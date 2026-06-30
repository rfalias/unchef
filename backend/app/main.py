from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.auth import auth_backend, current_active_user, fastapi_users
from app.config import settings
from app.database import engine
from app.models import Base
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Backfill columns added after initial schema creation
        for ddl in [
            "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'",
            "ALTER TABLE users ADD COLUMN claude_api_key TEXT",
        ]:
            try:
                await conn.execute(text(ddl))
            except Exception:
                pass  # Column already exists
        # Branding / app settings table
        await conn.execute(text(
            "CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)"
        ))
        for k, v in [("app_name", "Uninspired Chef"), ("app_icon", "🥗")]:
            await conn.execute(
                text("INSERT OR IGNORE INTO app_settings (key, value) VALUES (:k, :v)"),
                {"k": k, "v": v},
            )
        # Ensure at least one admin exists
        result = await conn.execute(text("SELECT COUNT(*) FROM users WHERE role = 'admin'"))
        if result.scalar_one() == 0:
            await conn.execute(
                text("UPDATE users SET role = 'admin' WHERE id = (SELECT MIN(id) FROM users WHERE 1)")
            )
    yield


app = FastAPI(title="Food App", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth routes (public)
app.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/api/v1/auth/jwt",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/api/v1/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/api/v1/users",
    tags=["users"],
)

# Protected API routes
app.include_router(
    api_router,
    prefix="/api/v1",
    dependencies=[Depends(current_active_user)],
)


@app.get("/health")
async def health():
    return {"status": "ok"}
