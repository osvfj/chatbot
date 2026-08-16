from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from ..db import connect
from ..security import now_iso, require_user

router = APIRouter()


def _get_chat(chat_id, finca_id):
    conn = connect()
    row = conn.execute(
        "SELECT * FROM chat WHERE id = ? AND finca_id = ?",
        (chat_id, finca_id),
    ).fetchone()
    conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Chat no encontrado")
    return row


@router.get("/chats")
def list_chats(auth=Depends(require_user)):
    conn = connect()
    rows = conn.execute(
        "SELECT c.id, c.titulo, c.creado_en, "
        "(SELECT COUNT(*) FROM foto f WHERE f.chat_id = c.id) as foto_count "
        "FROM chat c WHERE c.finca_id = ? ORDER BY c.creado_en DESC",
        (auth["finca"],),
    ).fetchall()
    conn.close()
    return {"chats": [dict(r) for r in rows]}


@router.post("/chats")
def create_chat(body: dict, auth=Depends(require_user)):
    titulo = str(body.get("titulo", "")).strip()
    if not titulo:
        raise HTTPException(status_code=400, detail="Falta el título")
    chat_id = str(uuid4())
    conn = connect()
    conn.execute(
        "INSERT INTO chat (id, finca_id, titulo, creado_en) VALUES (?, ?, ?, ?)",
        (chat_id, auth["finca"], titulo, now_iso()),
    )
    conn.commit()
    conn.close()
    return {"id": chat_id, "finca_id": auth["finca"], "titulo": titulo, "foto_count": 0}


@router.get("/chats/{chat_id}/messages")
def list_messages(chat_id: str, auth=Depends(require_user)):
    _get_chat(chat_id, auth["finca"])
    conn = connect()
    rows = conn.execute(
        "SELECT id, rol, contenido, sentimiento, intencion, creado_en "
        "FROM mensaje WHERE chat_id = ? ORDER BY creado_en ASC",
        (chat_id,),
    ).fetchall()
    conn.close()
    return {"messages": [dict(r) for r in rows]}


def _opt_str(value):
    if value is None:
        return None
    return str(value)


@router.post("/chats/{chat_id}/messages")
def add_message(chat_id: str, body: dict, auth=Depends(require_user)):
    _get_chat(chat_id, auth["finca"])
    rol = str(body.get("rol", ""))
    contenido = str(body.get("contenido", ""))
    if rol not in ("user", "assistant") or not contenido:
        raise HTTPException(status_code=400, detail="rol y contenido son obligatorios")
    mensaje_id = str(uuid4())
    sentimiento = _opt_str(body.get("sentimiento"))
    intencion = _opt_str(body.get("intencion"))
    conn = connect()
    conn.execute(
        "INSERT INTO mensaje (id, chat_id, finca_id, rol, contenido, sentimiento, intencion, creado_en) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (mensaje_id, chat_id, auth["finca"], rol, contenido, sentimiento, intencion, now_iso()),
    )
    conn.commit()
    conn.close()
    return {
        "id": mensaje_id,
        "chat_id": chat_id,
        "rol": rol,
        "contenido": contenido,
        "sentimiento": sentimiento,
        "intencion": intencion,
    }
