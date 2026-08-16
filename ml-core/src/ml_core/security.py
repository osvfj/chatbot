import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Header, HTTPException

SECRET = os.environ.get("ML_CORE_SECRET", "dev-secret-cambiar")
ALGORITHM = "HS256"


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def hash_password(password):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password, hashed):
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(user_id, finca_id):
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "finca": finca_id,
        "iat": now,
        "exp": now + timedelta(days=7),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)


def decode_token(token):
    return jwt.decode(token, SECRET, algorithms=[ALGORITHM])


def require_user(authorization: str = Header(default="")):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Falta token de autorización")
    try:
        payload = decode_token(authorization[7:])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    return payload
