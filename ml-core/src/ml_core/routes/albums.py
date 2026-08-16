from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from ..db import connect
from ..security import now_iso, require_user
from ..vision import detector

STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "storage"

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


@router.get("/albums")
def list_albums(auth=Depends(require_user)):
    conn = connect()
    rows = conn.execute(
        "SELECT a.id, a.chat_id, a.titulo, a.creado_en, "
        "(SELECT COUNT(*) FROM foto f WHERE f.album_id = a.id) as foto_count, "
        "(SELECT f.id FROM foto f WHERE f.album_id = a.id ORDER BY f.creado_en ASC LIMIT 1) as preview_foto_id "
        "FROM album a WHERE a.finca_id = ? ORDER BY a.creado_en DESC",
        (auth["finca"],),
    ).fetchall()
    conn.close()
    return {"albums": [dict(r) for r in rows]}


@router.post("/chats/{chat_id}/photos")
def upload_photo(
    chat_id: str,
    file: UploadFile = File(...),
    auth=Depends(require_user),
):
    _get_chat(chat_id, auth["finca"])
    foto_id = str(uuid4())
    nombre_archivo = file.filename or "foto.jpg"
    ext = Path(nombre_archivo).suffix or ".jpg"
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    path = STORAGE_DIR / (foto_id + ext)
    bytes_data = file.file.read()
    with path.open("wb") as out:
        out.write(bytes_data)

    deteccion = detector.detect(bytes_data)
    disease_id = ""
    disease_name = ""
    confidence = 0.0
    severity = ""
    advice = ""
    if deteccion is not None:
        disease_id = deteccion["disease_id"]
        disease_name = deteccion["disease_name"]
        confidence = deteccion["confidence"]
        severity = deteccion["severity"] or ""
        advice = deteccion["advice"] or ""

    conn = connect()
    album = conn.execute("SELECT id FROM album WHERE chat_id = ?", (chat_id,)).fetchone()
    if album is None:
        album_id = str(uuid4())
        titulo = "Álbum de " + nombre_archivo
        conn.execute(
            "INSERT INTO album (id, chat_id, finca_id, titulo, creado_en) VALUES (?, ?, ?, ?, ?)",
            (album_id, chat_id, auth["finca"], titulo, now_iso()),
        )
    else:
        album_id = album["id"]
    conn.execute(
        "INSERT INTO foto (id, album_id, chat_id, finca_id, archivo, nombre_archivo, mime, disease_id, disease_name, confidence, severity, advice, creado_en) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            foto_id,
            album_id,
            chat_id,
            auth["finca"],
            str(path),
            nombre_archivo,
            file.content_type or "image/jpeg",
            disease_id,
            disease_name,
            confidence,
            severity,
            advice,
            now_iso(),
        ),
    )
    conn.commit()
    conn.close()
    return {
        "id": foto_id,
        "album_id": album_id,
        "chat_id": chat_id,
        "nombre_archivo": nombre_archivo,
        "disease_id": disease_id,
        "disease_name": disease_name,
        "confidence": confidence,
        "severity": severity,
        "detector_disponible": detector.available(),
    }


@router.get("/photos/{foto_id}")
def get_photo(foto_id: str, auth=Depends(require_user)):
    conn = connect()
    row = conn.execute(
        "SELECT * FROM foto WHERE id = ? AND finca_id = ?",
        (foto_id, auth["finca"]),
    ).fetchone()
    conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Foto no encontrada")
    return FileResponse(row["archivo"], media_type=row["mime"])
