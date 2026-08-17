# ml-core

Backend FastAPI de Cafebot. Es la fuente de verdad para autenticación, fincas, chats, mensajes, álbumes, fotografías y razonamiento clásico. Expone dos modos de salida: respuesta determinista y respuesta opcional mediante LLM.

## Entorno

```bash
cd ml-core
uv sync
uv run uvicorn ml_core.server:app --host 127.0.0.1 --port 8765 --reload
```

El backend escucha en `127.0.0.1:8765`. El `lifespan` inicializa SQLite, carga modelos de intención y precarga el analizador de sentimiento para evitar que la primera solicitud sea lenta.

## Persistencia

SQLite se inicializa desde `src/ml_core/schema.sql` y se guarda en `src/ml_core/data/cafebot.db`. Las imágenes se almacenan como archivos. El modelo es:

```text
finca → usuarios
finca → chats → mensajes
chat  → álbum → fotos/detecciones
chat  → dialogo_estado → hipótesis/evidencia/foto inicial
```

`dialogo_estado` conserva pregunta activa, número de pregunta, hipótesis, evidencia, `vision_inicial` y la fotografía asociada.

## Chat Y Modos

`POST /chats/{chat_id}/chat` acepta `content`, `foto_id`, `answer_id`, `free_text` y `mode` (`classical` o `llm`). Siempre ejecuta la capa de razonamiento. Después:

- `classical`: `_classical_response` combina catálogo, reglas, conocimiento Markdown, detección, sentimiento y decisión bayesiana; `_stream_classical` fragmenta la respuesta para SSE.
- `llm`: el mismo contexto se convierte en mensajes y se envía mediante `httpx.stream` al endpoint configurable.

Antes de la respuesta se emite `event: context`, que contiene detección, intención, PLN, sentimiento, política, reglas, conocimiento, estado bayesiano, pregunta y decisión.

## Intención Y PLN

`core/classifiers.py` ejecuta en cada consulta:

- árbol de decisión con ruta explicable;
- Naive Bayes con probabilidades principales;
- MLP con clase y confianza;
- ensemble por mayoría.

`core/nlp.py` usa spaCy para normalizar, tokenizar y obtener lemas. `extract_evidence` extrae síntomas, colores, partes de la planta, duración y severidad. `_intent_policy` convierte la intención en requisitos: una intención `analizar_foto` sin foto produce `request_photo`; consultas de dominio solicitan conocimiento; entradas sin evidencia solicitan descripción.

## Sentimiento

`core/sentiment.py` usa `pysentimiento` en español. El texto libre negativo produce una política empática y breve. Las respuestas de botones no se clasifican como emoción. El modelo se precarga durante el arranque.

## Visión

`vision/detector.py` carga `src/ml_core/models/vision.joblib`. La extracción usa HOG y HSV en imágenes redimensionadas a `128x128`. `ML_CORE_VISION_MIN_CONFIDENCE` tiene por defecto `0.55`; debajo del umbral se conserva `top_predictions` y se marca `uncertain`.

El artefacto fue entrenado en Google Colab usando datasets Kaggle. El repositorio no contiene aún un manifiesto completo de hashes, particiones y versión exacta del entrenamiento.

## Bayes Y Discrepancias

`core/dialogue.py` mantiene una actualización heurística de scores. Las respuestas y el texto libre agregan pesos a hipótesis como `RUST`, `RED_SPIDER_MITE` y `HEALTHY`; luego se normalizan. No es todavía Bayes formal calibrado.

Si la confianza es menor que `0.75`, se continúa preguntando. Si la distancia entre la visión inicial y la evidencia conversacional alcanza aproximadamente `0.55`, se pide una segunda foto. La nueva visión se combina mediante media de scores y se actualiza la detección final del álbum.

## Knowledge Graph

`core/search.py` carga `data/knowledge.json` y documentos Markdown desde `data/knowledge/`. A-star se usa en `/chat`; BFS, DFS y A-star están disponibles en `/search`. Los documentos actuales cubren:

- roya;
- arañita roja;
- manejo integrado;
- diagnóstico diferencial.

El resultado incluye `found`, `node`, `path`, `cost`, `query` y el Markdown recuperado.

## Reglas

`core/rules.py` soporta `and`, `or`, `not`, igualdad, desigualdad y comparaciones numéricas. `_rule_facts` crea hechos desde texto y contexto visual, incluyendo estación, síntomas, sequía, plaga, porcentajes, sombra, enemigos naturales, caficultor y hectáreas.

Reglas cubiertas actualmente:

- roya en época de lluvias;
- cercospora con estrés hídrico;
- broca con infestación alta o baja;
- minador bajo umbral;
- ojo de gallo por sombra excesiva;
- elegibilidad de asistencia técnica.

También existe `POST /rules` para probar el motor directamente.

## Reinforcement Learning

`core/rl.py` conserva `q_table.json` y `feedback.jsonl`. El estado combina intención, confianza, conocimiento y sentimiento. Las acciones son:

- `knowledge_guided`;
- `classification_guided`;
- `llm_guided`.

El frontend muestra valoración positiva o negativa después de la respuesta. `/rate` actualiza la recompensa inmediata. Esto es actualmente un bandit contextual de un paso, no Q-learning con transición `s'` y descuento completo.

## Endpoints De Evaluación

- `/intent`: predicciones de árbol, Naive Bayes, MLP y ensemble.
- `/sentiment`: sentimiento en español.
- `/search`: BFS, DFS o A-star.
- `/rules`: evaluación de hechos.
- `/choose`: selección de estrategia del learner.
- `/rate`: actualización de recompensa.
- `/perceptron`: salida del MLP.
- `/metrics`: accuracy y F1 mediante validación cruzada.

## Variables De Entorno

- `OPENCODE_API_KEY`: clave para modo LLM.
- `ML_CORE_LLM_ENDPOINT`: endpoint LLM.
- `ML_CORE_LLM_MODEL`: modelo LLM.
- `ML_CORE_LLM_MOCK=1`: mock de streaming para desarrollo.
- `ML_CORE_SECRET`: clave JWT de al menos 32 bytes.
- `ML_CORE_VISION_MIN_CONFIDENCE`: umbral visual.

## Límites

La extracción PLN es léxica y no resuelve completamente negaciones. El ensemble es una votación simple. El detector visual no está calibrado ni validado todavía con suficientes fotos de celular. Las reglas son auditables, pero no todas funcionan como bloqueos duros posteriores a una respuesta LLM. El sistema es de orientación y requiere revisión técnica.
