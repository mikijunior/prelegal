from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    hash_password,
    require_current_user,
    verify_password,
)
from app.database import get_db
from app.models import User
from app.schemas import SignInRequest, SignUpRequest, TokenResponse, UserResponse

router = APIRouter(tags=["auth"])


@router.post("/auth/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(body: SignUpRequest, db: Session = Depends(get_db)):
    user = User(email=body.email, hashed_password=hash_password(body.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")
    db.refresh(user)
    token = create_access_token({"sub": user.email})
    return TokenResponse(access_token=token)


@router.post("/auth/signin", response_model=TokenResponse)
def signin(body: SignInRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user.email})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(require_current_user)):
    return current_user
