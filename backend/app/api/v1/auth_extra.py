from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi_users import exceptions, schemas
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth import get_user_manager
from app.schemas.user import UserCreate, UserRead

router = APIRouter(tags=["auth"])


async def registration_enabled(db: AsyncSession) -> bool:
    row = await db.execute(
        text("SELECT value FROM app_settings WHERE key = 'allow_registration'")
    )
    val = row.scalar_one_or_none()
    # Default to enabled if the key hasn't been written yet
    return val != "false"


@router.get("/registration-open")
async def get_registration_open(db: AsyncSession = Depends(get_db)):
    return {"open": await registration_enabled(db)}


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(
    request: Request,
    user_create: UserCreate,
    db: AsyncSession = Depends(get_db),
    user_manager=Depends(get_user_manager),
):
    if not await registration_enabled(db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is currently disabled. Contact an admin.",
        )
    try:
        created_user = await user_manager.create(user_create, safe=True, request=request)
    except exceptions.UserAlreadyExists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="REGISTER_USER_ALREADY_EXISTS",
        )
    except exceptions.InvalidPasswordException as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "REGISTER_INVALID_PASSWORD", "reason": e.reason},
        )
    return schemas.model_validate(UserRead, created_user)
