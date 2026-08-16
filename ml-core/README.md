# ml-core

Backend FastAPI del proyecto. Es la fuente de verdad para autenticación, fincas, chats, mensajes, álbumes y fotos. También expone los componentes de razonamiento clásico y el proxy de streaming hacia OpenCode.

## Entorno

```bash
cd ml-core
uv sync
uv run python -m ml_core.server
```

`uv` instala un Python 3.13 administrado porque spaCy no tiene wheels para Python 3.14. La aplicación escucha en `127.0.0.1:8765`.

## Persistencia

SQLite se inicializa desde `src/ml_core/schema.sql` y se guarda en `src/ml_core/data/cafebot.db`. Las imágenes se guardan en `src/ml_core/storage/`; ambos artefactos están ignorados por Git.

El modelo de dominio es:

```text
finca → usuarios
finca → chats → mensajes
chat  → álbum lazy → fotos/detecciones
```

Un chat sin fotos no crea álbum. El álbum aparece cuando se sube la primera foto a ese chat.

## Auth

- `POST /auth/register`: crea finca y usuario admin.
- `POST /auth/login`: devuelve JWT.
- `GET /auth/me`: devuelve usuario y finca actuales.

Los endpoints de datos validan `Authorization: Bearer <token>`. El secret se lee de `ML_CORE_SECRET`; el valor por defecto solo sirve para desarrollo.

## Chat y contexto

`POST /chats/{chat_id}/chat` devuelve SSE. Antes de llamar al LLM, el backend construye un contexto con:

- historial reciente del chat;
- resultado de visión asociado a `foto_id`;
- intención del ensemble árbol/Bayes/MLP;
- sentimiento y probabilidades;
- prompt del usuario.

También emite un evento `event: context` para depuración. El mismo contexto se envía al LLM; el evento no es una respuesta ficticia.

## Visión

El detector usa `src/ml_core/models/vision.joblib`. El artefacto actual tiene estas clases reales:

- `HEALTHY`;
- `RUST`;
- `RED_SPIDER_MITE`.

Una confianza menor que `ML_CORE_VISION_MIN_CONFIDENCE` (por defecto `0.55`) produce `detector_status: "uncertain"` y conserva `top_predictions` sin presentar la clase ganadora como diagnóstico confirmado.

## Razonamiento

- `/intent`: árbol de decisión, Naive Bayes, MLP y ensemble.
- `/sentiment`: pysentimiento para español.
- `/search`: networkx con BFS, DFS y A*.
- `/rules`: motor de reglas proposicionales.
- `/rate` y `/choose`: tabla Q para seleccionar la fuente de respuesta.
- `/metrics`: comparación de accuracy y F1.

## Variables de entorno

- `OPENCODE_API_KEY`: key fallback del LLM.
- `ML_CORE_LLM_ENDPOINT`: endpoint fallback.
- `ML_CORE_LLM_MODEL`: modelo fallback.
- `ML_CORE_LLM_MOCK=1`: streaming ficticio para desarrollo.
- `ML_CORE_SECRET`: secret JWT.
- `ML_CORE_VISION_MIN_CONFIDENCE`: umbral visual.

## Entrenamiento visual

`collab.py` es un script local para copiar a Google Colab. No forma parte del flujo runtime ni se rastrea en Git. Descarga datasets, entrena el SVM, guarda `vision.joblib` y genera metadata.
