import sqlite3
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from ..db import connect
from ..security import create_token, hash_password, now_iso, require_user, verify_password

router = APIRouter()


def _serialize_usuario(row):
    return {
        "id": row["id"],
        "finca_id": row["finca_id"],
        "nombre": row["nombre"],
        "email": row["email"],
        "rol": row["rol"],
    }


@router.post("/auth/register")
def register(body: dict):
    finca_nombre = str(body.get("finca_nombre", "")).strip()
    region = str(body.get("region", "")).strip()
    nombre = str(body.get("nombre", "")).strip()
    email = str(body.get("email", "")).strip().lower()
    password = str(body.get("password", ""))
    if not finca_nombre or not nombre or not email or not password:
        raise HTTPException(status_code=400, detail="Faltan campos obligatorios")
    finca_id = str(uuid4())
    user_id = str(uuid4())
    conn = connect()
    try:
        conn.execute(
            "INSERT INTO finca (id, nombre, region, creada_en) VALUES (?, ?, ?, ?)",
            (finca_id, finca_nombre, region, now_iso()),
        )
        conn.execute(
            "INSERT INTO usuario (id, finca_id, nombre, email, password_hash, rol, creado_en) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (user_id, finca_id, nombre, email, hash_password(password), "admin", now_iso()),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="El email ya está registrado")
    finally:
        conn.close()
    return {
        "token": create_token(user_id, finca_id),
        "usuario": {"id": user_id, "finca_id": finca_id, "nombre": nombre, "email": email, "rol": "admin"},
        "finca": {"id": finca_id, "nombre": finca_nombre, "region": region},
    }


@router.post("/auth/login")
def login(body: dict):
    email = str(body.get("email", "")).strip().lower()
    password = str(body.get("password", ""))
    conn = connect()
    row = conn.execute(
        "SELECT u.id, u.finca_id, u.nombre, u.email, u.password_hash, u.rol, f.nombre as finca_nombre, f.region "
        "FROM usuario u JOIN finca f ON f.id = u.finca_id WHERE u.email = ?",
        (email,),
    ).fetchone()
    conn.close()
    if row is None or not verify_password(password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    return {
        "token": create_token(row["id"], row["finca_id"]),
        "usuario": _serialize_usuario(row),
        "finca": {"id": row["finca_id"], "nombre": row["finca_nombre"], "region": row["region"]},
    }


@router.get("/auth/me")
def me(auth=Depends(require_user)):
    conn = connect()
    row = conn.execute(
        "SELECT u.id, u.finca_id, u.nombre, u.email, u.rol, f.nombre as finca_nombre, f.region "
        "FROM usuario u JOIN finca f ON f.id = u.finca_id WHERE u.id = ?",
        (auth["sub"],),
    ).fetchone()
    conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"usuario": _serialize_usuario(row), "finca": {"id": row["finca_id"], "nombre": row["finca_nombre"], "region": row["region"]}}
