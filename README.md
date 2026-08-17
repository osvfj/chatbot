# Cafebot

Cafebot es una aplicación de escritorio para asistir a caficultores en la identificación y el manejo inicial de problemas del cafeto. El proyecto fue construido como una arquitectura híbrida: los modelos clásicos realizan el análisis y el orquestador decide el siguiente paso; el usuario puede elegir si desea una respuesta determinista o una redacción mediante LLM.

## Arquitectura

```text
Electron + React
  ├── autenticación y estado visual
  ├── chat, galería y captura de fotografías
  ├── tarjeta de preguntas adaptativas
  ├── selector de modo: clásico / LLM
  └── HTTP + SSE
          │
          ▼
ml-core (FastAPI + SQLite)
  ├── JWT + bcrypt
  ├── chats, mensajes, álbumes, fotos y estados de diálogo
  ├── spaCy: tokenización y extracción de evidencia
  ├── pysentimiento: política de tono
  ├── árbol + Naive Bayes + MLP: intención
  ├── SVM visual: HOG + HSV
  ├── actualización bayesiana heurística y discrepancia multimodal
  ├── Knowledge Graph: BFS, DFS, A-star y Markdown agronómico
  ├── RuleEngine: reglas proposicionales y comparaciones
  ├── QLearner: selección de modo y feedback
  └── generador clásico o proxy LLM según el modo
```

El proceso principal de Electron se limita a crear la ventana. El renderer consume directamente FastAPI; el antiguo RPC por `MessagePort` fue eliminado.

## Modos De Respuesta

El selector del chat conserva el modo en `localStorage`:

- `classical`: respuesta determinista construida con intención, PLN, visión, Bayes, reglas y conocimiento Markdown. No realiza llamadas a un LLM.
- `llm`: ejecuta el mismo razonamiento previo y envía el contexto al proveedor LLM configurado para redactar la respuesta mediante SSE.

El LLM no reemplaza la visión, las reglas ni Bayes. Es únicamente un generador opcional en el último paso.

## Flujo Multimodal

1. El usuario escribe o adjunta una fotografía.
2. La foto se sube y el SVM produce una distribución visual.
3. El texto pasa por intención, PLN y sentimiento.
4. La política de intención puede exigir foto, evidencia o confirmación.
5. Las respuestas actualizan las hipótesis del diálogo.
6. Si visión y texto discrepan, se solicita otra foto con descripción.
7. La segunda predicción se fusiona con la observación inicial.
8. El grafo recupera conocimiento agronómico.
9. Q-learning escoge el modo de contextualización.
10. Se genera una respuesta clásica o LLM y se transmite por SSE.

## Módulos

- `apps/desktop`: Electron 43, React 19, TanStack Query y UI del chat.
- `ml-core`: backend FastAPI y núcleo de razonamiento Python.
- `packages/sdk`: modelos visuales temporales usados por el renderer.
- `packages/i18n`: traducciones Paraglide.
- `packages/ui`: componentes y tokens visuales compartidos.

## Desarrollo

```bash
corepack pnpm install
corepack pnpm ml:dev
corepack pnpm dev
```

`ml:dev` ejecuta Uvicorn con `--reload` en `127.0.0.1:8765`. El backend debe estar activo antes de las operaciones protegidas.

## Estado Y Limitaciones

- La actualización llamada Bayes es actualmente heurística: suma pesos de evidencia y normaliza scores; no es todavía una inferencia probabilística calibrada.
- El `RuleEngine` está integrado al chat, pero parte de las políticas aún vive en el orquestador.
- A-star se usa automáticamente; BFS y DFS están disponibles para comparación en `/search`.
- Q-learning selecciona modos de contextualización y usa recompensas de un paso; todavía no aprende transiciones completas entre acciones.
- El SVM fue entrenado externamente en Colab; el repositorio no contiene todavía un manifiesto reproducible completo del dataset y particiones.
- La aplicación es una herramienta de orientación y no reemplaza la inspección agronómica.

## Decisiones Relevantes

- Python se mantiene para scikit-learn, spaCy, pysentimiento, networkx y visión.
- `uv` administra Python 3.13.
- SQLite guarda metadatos; las imágenes se guardan como archivos.
- Los documentos Markdown del grafo contienen conocimiento agronómico y sus fuentes.
- Las respuestas estructuradas de botones no se clasifican como sentimiento.
- Las fotografías y conversaciones pertenecen a una finca y se protegen mediante JWT.
