import json
import os
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from ..core.sentiment import analyze as analyze_sentiment
from ..db import connect
from ..security import now_iso, require_user
from ..services import bundle

router = APIRouter()

SYSTEM_PROMPT = (
    "Eres Cafebot, un asistente experto en la detección y el manejo de enfermedades del cafeto "
    "(roya, cercospora, phoma, minador de la hoja y arañita roja). "
    "Responde en el mismo idioma del usuario, con un lenguaje claro y cercano. "
    "Ofrece consejos prácticos de manejo integrado cuando el tema lo requiera."
)

DEFAULT_ENDPOINT = os.environ.get("ML_CORE_LLM_ENDPOINT", "https://opencode.ai/zen/v1/chat/completions")
DEFAULT_MODEL = os.environ.get("ML_CORE_LLM_MODEL", "deepseek-v4-flash-free")
MOCK = os.environ.get("ML_CORE_LLM_MOCK") == "1"

MAX_HISTORIA = 20


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


def _get_foto(foto_id, finca_id):
    conn = connect()
    row = conn.execute(
        "SELECT * FROM foto WHERE id = ? AND finca_id = ?",
        (foto_id, finca_id),
    ).fetchone()
    conn.close()
    return row


def _historia(chat_id):
    conn = connect()
    rows = conn.execute(
        "SELECT rol, contenido FROM mensaje WHERE chat_id = ? ORDER BY creado_en ASC",
        (chat_id,),
    ).fetchall()
    conn.close()
    mensajes = []
    for r in rows:
        if r["rol"] in ("user", "assistant"):
            mensajes.append({"role": r["rol"], "content": r["contenido"]})
    return mensajes[-MAX_HISTORIA:]


def _contexto_deteccion(foto):
    if foto is None or not foto["disease_id"]:
        return None
    try:
        top_predictions = json.loads(foto["top_predictions"] or "[]")
    except (TypeError, json.JSONDecodeError):
        top_predictions = []
    return {
        "archivo": foto["nombre_archivo"],
        "status": foto["detector_status"],
        "enfermedad": foto["disease_name"],
        "id_enfermedad": foto["disease_id"],
        "descripcion": foto["description"],
        "confianza": foto["confidence"],
        "severidad": foto["severity"],
        "recomendacion": foto["advice"],
        "top_predictions": top_predictions,
    }


def _contexto_consulta(content, foto):
    bloques = [content]
    deteccion = _contexto_deteccion(foto)
    if deteccion:
        bloques.append("[Análisis de imagen]\n" + json.dumps(deteccion, ensure_ascii=False))
    prediccion = bundle.predict(content)
    sentimiento = analyze_sentiment(content)
    bloques.append(
        "[Clasificación de la consulta]\n"
        + json.dumps(
            {
                "intencion": prediccion,
                "sentimiento": sentimiento,
            },
            ensure_ascii=False,
        )
    )
    return {
        "prompt": "\n\n".join(bloques),
        "detection": deteccion,
        "intent": prediccion,
        "sentiment": sentimiento,
    }


def _persistir(chat_id, finca_id, rol, contenido, foto_id=None, sentimiento=None, intencion=None):
    mensaje_id = str(uuid4())
    conn = connect()
    conn.execute(
        "INSERT INTO mensaje (id, chat_id, finca_id, rol, contenido, sentimiento, intencion, foto_id, creado_en) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (mensaje_id, chat_id, finca_id, rol, contenido, sentimiento, intencion, foto_id, now_iso()),
    )
    conn.commit()
    conn.close()
    return mensaje_id


def _stream_mock():
    partes = ["El modelo de visión detectó la enfermedad. ", "Aquí van las recomendaciones de manejo integrado."]
    for parte in partes:
        chunk = {"choices": [{"delta": {"content": parte}}]}
        yield "data: " + json.dumps(chunk, ensure_ascii=False) + "\n\n"
    yield "data: [DONE]\n\n"


def _stream_zen(messages, api_key, model, endpoint):
    with httpx.stream(
        "POST",
        endpoint,
        json={"model": model, "messages": messages, "temperature": 0.7, "stream": True},
        headers={"content-type": "application/json", "authorization": "Bearer " + api_key, "accept": "text/event-stream"},
        timeout=90,
    ) as response:
        if response.status_code != 200:
            body = response.read().decode()
            yield "data: " + json.dumps({"error": {"type": "status_error", "message": f"{response.status_code}: {body[:300]}"}}) + "\n\n"
            return
        for linea in response.iter_lines():
            yield linea + "\n"


@router.post("/chats/{chat_id}/chat")
def chat(chat_id: str, body: dict, auth=Depends(require_user)):
    _get_chat(chat_id, auth["finca"])
    content = str(body.get("content", "")).strip()
    foto_id = body.get("foto_id")
    if not content:
        raise HTTPException(status_code=400, detail="content es obligatorio")
    api_key = str(body.get("apiKey") or os.environ.get("OPENCODE_API_KEY") or "public")
    model = str(body.get("model") or DEFAULT_MODEL)
    endpoint = str(body.get("endpoint") or DEFAULT_ENDPOINT)

    foto = _get_foto(foto_id, auth["finca"]) if foto_id else None
    _persistir(chat_id, auth["finca"], "user", content, foto_id=foto_id)

    historia = _historia(chat_id)
    if historia and historia[-1]["role"] == "user":
        historia = historia[:-1]
    contexto = _contexto_consulta(content, foto)
    mensajes = [{"role": "system", "content": SYSTEM_PROMPT}]
    mensajes += historia
    mensajes.append({"role": "user", "content": contexto["prompt"]})

    def generar():
        yield "event: context\n"
        yield "data: " + json.dumps(
            {
                "detection": contexto["detection"],
                "intent": contexto["intent"],
                "sentiment": contexto["sentiment"],
            },
            ensure_ascii=False,
        ) + "\n\n"
        if MOCK:
            stream = _stream_mock()
        else:
            stream = _stream_zen(mensajes, api_key, model, endpoint)
        texto = []
        for linea in stream:
            yield linea
            if linea.startswith("data: ") and linea != "data: [DONE]\n\n":
                try:
                    payload = json.loads(linea[6:])
                    delta = payload.get("choices", [{}])[0].get("delta", {}).get("content")
                    if delta:
                        texto.append(delta)
                except (json.JSONDecodeError, IndexError, AttributeError):
                    pass
        if texto:
            _persistir(chat_id, auth["finca"], "assistant", "".join(texto), foto_id=foto_id)

    return StreamingResponse(generar(), media_type="text/event-stream")
