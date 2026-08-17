import json
import os
from uuid import uuid4
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from ..core.sentiment import analyze as analyze_sentiment
from ..core.dialogue import choose_question, discrepancy, question as dialogue_question, update as update_dialogue
from ..core.nlp import extract_evidence
from ..db import connect
from ..security import now_iso, require_user
from ..services import bundle, knowledge

CATALOG_PATH = Path(__file__).resolve().parent.parent / "data" / "catalog.json"
VISION_IDS = {"HEALTHY": "healthy", "RUST": "leaf-rust", "RED_SPIDER_MITE": "red-spider-mite"}
VISION_KEYS = {value: key for key, value in VISION_IDS.items()}
CATALOG = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))

router = APIRouter()

SYSTEM_PROMPT = (
    "Eres Cafebot, un asistente experto en la detección y el manejo de enfermedades del cafeto "
    "(hoja sana, roya y arañita roja en la detección visual actual). "
    "Responde en el mismo idioma del usuario, con un lenguaje claro y cercano. "
    "Ofrece consejos prácticos de manejo integrado cuando el tema lo requiera. "
    "La evidencia estructurada y la decisión externa del sistema tienen prioridad sobre tus propias suposiciones. "
    "No vuelvas a diagnosticar ignorando la decisión bayesiana. Responde de forma breve y accionable. "
    "Cuando exista conocimiento recuperado, úsalo como fuente principal y no inventes recomendaciones que lo contradigan."
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


def _contexto_consulta(content, foto, analyze_user_text=True):
    bloques = [content]
    deteccion = _contexto_deteccion(foto)
    if deteccion:
        bloques.append("[Análisis de imagen]\n" + json.dumps(deteccion, ensure_ascii=False))
    prediccion = bundle.predict(content)
    sentimiento = analyze_sentiment(content) if analyze_user_text else None
    evidence = extract_evidence(content) if analyze_user_text else {
        "symptoms": [],
        "plant_parts": [],
        "colors": [],
        "duration": None,
        "severity": "unknown",
    }
    knowledge_query = content
    if deteccion is not None:
        knowledge_query += " " + str(deteccion.get("enfermedad") or "") + " " + str(deteccion.get("id_enfermedad") or "")
    knowledge_query += " " + " ".join(evidence["symptoms"] + evidence["colors"] + evidence["plant_parts"])
    knowledge_result = knowledge.search(knowledge_query, "astar") if knowledge_query.strip() else {"found": False, "path": []}
    knowledge_result["query"] = knowledge_query
    policy = {
        "tone": "empathetic" if sentimiento is not None and sentimiento["label"] == "negativo" else "clear",
        "verbosity": "short" if sentimiento is not None and sentimiento["label"] == "negativo" else "normal",
        "must_not_confirm_diagnosis": deteccion is not None and deteccion["status"] != "detected",
        "ask_for_evidence_if_empty": not any(evidence[key] for key in ("symptoms", "plant_parts", "colors")),
    }
    bloques.append(
        "[Clasificación de la consulta]\n"
        + json.dumps(
            {
                "intencion": prediccion,
                "sentimiento": sentimiento,
                "evidencia_pln": evidence,
                "politica_dialogo": policy,
                "conocimiento_recuperado": knowledge_result,
            },
            ensure_ascii=False,
        )
    )
    return {
        "prompt": "\n\n".join(bloques),
        "detection": deteccion,
        "intent": prediccion,
        "sentiment": sentimiento,
        "evidence": evidence,
        "policy": policy,
        "knowledge": knowledge_result,
        "knowledge_query": knowledge_query,
    }


def _pregunta_diagnostico(foto):
    if foto is None or not foto["disease_id"]:
        return None
    return dialogue_question()


def _get_dialogue_state(chat_id, finca_id):
    conn = connect()
    row = conn.execute("SELECT * FROM dialogo_estado WHERE chat_id = ? AND finca_id = ?", (chat_id, finca_id)).fetchone()
    conn.close()
    return row


def _save_dialogue_state(chat_id, finca_id, foto_id, question_id, number, hypotheses, evidence, initial_vision=None):
    conn = connect()
    conn.execute(
        "INSERT INTO dialogo_estado (chat_id, finca_id, foto_id, pregunta_id, pregunta_numero, hipotesis, evidencia, vision_inicial, actualizado_en) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(chat_id) DO UPDATE SET foto_id=excluded.foto_id, pregunta_id=excluded.pregunta_id, pregunta_numero=excluded.pregunta_numero, hipotesis=excluded.hipotesis, evidencia=excluded.evidencia, vision_inicial=excluded.vision_inicial, actualizado_en=excluded.actualizado_en",
        (chat_id, finca_id, foto_id, question_id, number, json.dumps(hypotheses), json.dumps(evidence), json.dumps(initial_vision if initial_vision is not None else hypotheses), now_iso()),
    )
    conn.commit()
    conn.close()


def _clear_dialogue_state(chat_id):
    conn = connect()
    conn.execute("DELETE FROM dialogo_estado WHERE chat_id = ?", (chat_id,))
    conn.commit()
    conn.close()


def _update_final_photo(foto_id, decision):
    disease_id = VISION_IDS.get(decision["top_hypothesis"])
    if disease_id is None:
        return
    info = CATALOG.get(disease_id, {})
    top_predictions = [
        {"disease_id": VISION_IDS.get(key, key.lower()), "confidence": value}
        for key, value in sorted(decision["hypotheses"].items(), key=lambda item: -item[1])
    ]
    conn = connect()
    conn.execute(
        "UPDATE foto SET disease_id=?, disease_name=?, description=?, confidence=?, severity=?, advice=?, detector_status=?, top_predictions=? WHERE id=?",
        (disease_id, info.get("name", disease_id), info.get("description", ""), decision["confidence"], info.get("severity", ""), info.get("advice", ""), "confirmed_dialogue", json.dumps(top_predictions, ensure_ascii=False), foto_id),
    )
    conn.commit()
    conn.close()


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
            json={"model": model, "messages": messages, "temperature": 0.4, "stream": True},
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
    dialogue_state = _get_dialogue_state(chat_id, auth["finca"])
    if foto is None and dialogue_state is not None and dialogue_state["foto_id"]:
        foto = _get_foto(dialogue_state["foto_id"], auth["finca"])
    _persistir(chat_id, auth["finca"], "user", content, foto_id=foto_id)

    historia = _historia(chat_id)
    if historia and historia[-1]["role"] == "user":
        historia = historia[:-1]
    is_dialogue_answer = dialogue_state is not None
    analysis_text = str(body.get("free_text") or content) if is_dialogue_answer else content
    contexto = _contexto_consulta(analysis_text, foto, analyze_user_text=not is_dialogue_answer or bool(body.get("free_text")))
    pregunta = _pregunta_diagnostico(foto) if dialogue_state is None else None
    decision = None
    bayesian_state = None
    if dialogue_state is not None:
        try:
            hypotheses = json.loads(dialogue_state["hipotesis"])
            evidence = json.loads(dialogue_state["evidencia"])
        except (TypeError, json.JSONDecodeError):
            hypotheses, evidence = {}, []
        if foto_id and foto_id != dialogue_state["foto_id"]:
            followup_detection = _contexto_deteccion(foto)
            followup_hypotheses = {
                VISION_KEYS.get(item["disease_id"], item["disease_id"]): float(item["confidence"] or 0.0)
                for item in (followup_detection or {}).get("top_predictions", [])
                if item.get("disease_id")
            }
            if followup_hypotheses:
                keys = set(hypotheses) | set(followup_hypotheses)
                hypotheses = {
                    key: (float(hypotheses.get(key, 0.0)) + float(followup_hypotheses.get(key, 0.0))) / 2
                    for key in keys
                }
                evidence.append({"photo": foto_id, "vision": followup_hypotheses})
        answer_id = str(body.get("answer_id") or "")
        free_text = str(body.get("free_text") or content)
        free_text_evidence = extract_evidence(free_text)
        probabilities, top, confidence = update_dialogue(
            hypotheses,
            answer_id,
            free_text,
            dialogue_state["pregunta_id"],
        )
        evidence.append({"option": answer_id, "text": free_text, "pln": free_text_evidence})
        try:
            initial_vision = json.loads(dialogue_state["vision_inicial"])
        except (TypeError, json.JSONDecodeError):
            initial_vision = {}
        conflict = discrepancy(initial_vision, probabilities)
        bayesian_state = {
            "hypotheses": probabilities,
            "top_hypothesis": top,
            "confidence": confidence,
            "evidence": evidence,
            "visual_text_conflict": conflict,
        }
        next_number = int(dialogue_state["pregunta_numero"]) + 1
        if (confidence < 0.75 or conflict >= 0.55) and next_number <= 3:
            next_question = "photo_followup" if conflict >= 0.55 else choose_question(free_text_evidence, next_number, answer_id, probabilities)
            _save_dialogue_state(chat_id, auth["finca"], dialogue_state["foto_id"], next_question, next_number, probabilities, evidence)
            pregunta = dialogue_question(question_id=next_question, number=next_number)
        else:
            _clear_dialogue_state(chat_id)
            decision = {"hypotheses": probabilities, "top_hypothesis": top, "confidence": confidence, "evidence": evidence}
            _update_final_photo(dialogue_state["foto_id"], decision)
            contexto["prompt"] += "\n\n[Decisión bayesiana]\n" + json.dumps(decision, ensure_ascii=False)
    elif pregunta is not None:
        initial = contexto["detection"] or {}
        initial_hypotheses = {VISION_KEYS.get(item["disease_id"], item["disease_id"]): float(item["confidence"] or 0.0) for item in initial.get("top_predictions", []) if item.get("disease_id")}
        if not initial_hypotheses and initial.get("id_enfermedad"):
            initial_hypotheses = {initial["id_enfermedad"]: float(initial.get("confianza") or 0.0)}
        _save_dialogue_state(chat_id, auth["finca"], foto_id, pregunta["id"], 1, initial_hypotheses, [], initial_hypotheses)
        bayesian_state = {
            "hypotheses": initial_hypotheses,
            "top_hypothesis": max(initial_hypotheses, key=initial_hypotheses.get) if initial_hypotheses else None,
            "confidence": max(initial_hypotheses.values(), default=0.0),
            "evidence": [],
        }
    contexto["prompt"] += "\n\n[Estado interno de decisión; no mostrar literalmente al usuario]\n" + json.dumps(
        {
            "evidencia_pln": contexto["evidence"],
            "conocimiento_recuperado": contexto["knowledge"],
            "sentimiento": contexto["sentiment"],
            "politica_dialogo": contexto["policy"],
            "estado_bayesiano": bayesian_state,
        },
        ensure_ascii=False,
    )
    instrucciones = [SYSTEM_PROMPT]
    if decision is not None:
        instrucciones.append(
            "DECISIÓN AUTORITATIVA DEL ORQUESTADOR:\n"
            + json.dumps(decision, ensure_ascii=False)
            + "\nUsa esta hipótesis como conclusión del flujo. No presentes otras enfermedades como alternativas. "
            "Explica que es una orientación basada en la imagen y las respuestas del usuario."
        )
    if contexto["knowledge"].get("found"):
        instrucciones.append(
            "FUENTE AGRONÓMICA RECUPERADA Y PRIORITARIA:\n"
            + str(contexto["knowledge"].get("response") or "")
            + "\nUsa esta fuente para los hechos agronómicos. No agregues datos específicos, dosis, "
            "productos o afirmaciones que no estén respaldados por la fuente o por la decisión del orquestador. "
            "Si la fuente no responde algo, dilo claramente y recomienda consultar a un técnico."
        )
    if contexto["sentiment"] is not None and contexto["policy"]["tone"] == "empathetic":
        instrucciones.append(
            "POLÍTICA DE TONO: el usuario parece preocupado o frustrado. Valida brevemente su preocupación, "
            "pero mantén la respuesta técnica, directa y de máximo dos párrafos cortos."
        )
    mensajes = [{"role": "system", "content": "\n\n".join(instrucciones)}]
    mensajes += historia
    mensajes.append({"role": "user", "content": contexto["prompt"]})

    def generar():
        yield "event: context\n"
        yield "data: " + json.dumps(
            {
                "detection": contexto["detection"],
                "intent": contexto["intent"],
                "sentiment": contexto["sentiment"],
            "evidence": contexto["evidence"],
                "policy": contexto["policy"],
                "knowledge": contexto["knowledge"],
            "bayesian": bayesian_state,
                "question": pregunta,
                "decision": decision,
            },
            ensure_ascii=False,
        ) + "\n\n"
        if pregunta is not None:
            return
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
