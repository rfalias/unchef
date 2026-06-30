from fastapi import APIRouter, Depends, HTTPException, status
from fastapi_users.password import PasswordHelper
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth import current_active_user
from app.models.user import User
from app.schemas.user import PasswordChange

router = APIRouter(prefix="/users", tags=["users"])

_pw = PasswordHelper()


@router.post("/me/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_own_password(
    body: PasswordChange,
    current_user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_db),
):
    valid, _ = _pw.verify_and_update(body.current_password, current_user.hashed_password)
    if not valid:
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    user = await db.get(User, current_user.id)
    user.hashed_password = _pw.hash(body.new_password)
    await db.commit()
