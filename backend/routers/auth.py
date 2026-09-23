"""Auth router — /auth/* endpoints (sync SQLAlchemy)."""
import uuid
import random
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from middleware.rbac import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, get_current_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory OTP store (production: Redis with TTL)
_otp_store: dict = {}


class RegisterRequest(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    password: str
    role: str = "tourist"


class LoginRequest(BaseModel):
    identifier: str
    password: Optional[str] = None   # ← now optional: email-only login allowed


class OTPVerifyRequest(BaseModel):
    identifier: str
    otp: str


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/register", status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if not body.phone and not body.email:
        raise HTTPException(400, "Phone or email required")
    from sqlalchemy import or_
    conditions = []
    if body.phone is not None:
        conditions.append(User.phone == body.phone)
    if body.email is not None:
        conditions.append(User.email == body.email)

    existing = db.query(User).filter(or_(*conditions)).first() if conditions else None
    if existing:
        raise HTTPException(409, "Account already exists with this phone/email")


    otp = str(random.randint(100000, 999999))
    identifier = body.phone or body.email
    _otp_store[identifier] = otp

    user = User(
        id=str(uuid.uuid4()),
        phone=body.phone,
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "Registration successful. OTP sent.",
        "user_id": user.id,
        "otp_demo": otp,  # REMOVE IN PRODUCTION
    }


@router.post("/verify-otp")
def verify_otp(body: OTPVerifyRequest, db: Session = Depends(get_db)):
    stored_otp = _otp_store.get(body.identifier)
    if not stored_otp or stored_otp != body.otp:
        raise HTTPException(401, "Invalid or expired OTP")
    del _otp_store[body.identifier]

    user = db.query(User).filter(
        (User.phone == body.identifier) | (User.email == body.identifier)
    ).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.is_verified = True
    db.commit()

    token_data = {"sub": user.id, "role": user.role}

    ranger_id = None
    if user.role == "rescue_team":
        from models.ranger import Ranger
        ranger = db.query(Ranger).filter(Ranger.user_id == user.id).first()
        if ranger:
            ranger_id = ranger.id

    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "token_type": "bearer",
        "user_id": user.id,
        "role": user.role,
        "ranger_id": ranger_id,
    }


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.phone == body.identifier) | (User.email == body.identifier)
    ).first()

    if not user:
        raise HTTPException(401, "No account found with this email/phone.")

    # Password is optional — skip check if not provided (demo/open mode)
    if body.password:
        if not verify_password(body.password, user.password_hash):
            raise HTTPException(401, "Incorrect password.")

    token_data = {"sub": user.id, "role": user.role}

    ranger_id = None
    if user.role == "rescue_team":
        from models.ranger import Ranger
        ranger = db.query(Ranger).filter(Ranger.user_id == user.id).first()
        if ranger:
            ranger_id = ranger.id

    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "token_type": "bearer",
        "user_id": user.id,
        "role": user.role,
        "ranger_id": ranger_id,
    }


@router.post("/refresh")
def refresh_token(body: RefreshRequest):
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(401, "Not a refresh token")
    token_data = {"sub": payload["sub"], "role": payload["role"]}
    return {
        "access_token": create_access_token(token_data),
        "token_type": "bearer",
    }


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user["sub"]).first()
    if not user:
        raise HTTPException(404, "User not found")
    return {
        "id": user.id,
        "phone": user.phone,
        "email": user.email,
        "role": user.role,
        "is_verified": user.is_verified,
        "created_at": user.created_at.isoformat(),
    }
