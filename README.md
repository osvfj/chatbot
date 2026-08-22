# Cafebot

Cafebot es una aplicación de escritorio para asistir a caficultores en la identificación y el manejo inicial de problemas del cafeto. Arquitectura híbrida: un núcleo clásico de IA realiza el análisis (PLN, clasificadores, reglas, búsqueda en grafo de conocimiento, inferencia bayesiana y Q-learning) y el usuario elige entre una respuesta determinista o una redacción final mediante LLM.

## Arquitectura

```text
Electron + React
  ├── autenticación y estado visual
  ├── chat, galería y captura de fotografías
  ├── inspector del razonamiento interno (predicción por fuente)
  ├── tarjeta de preguntas adaptativas
  ├── selector de modo: clásico / LLM
  └── HTTP + SSE
          │
          ▼
ml-core (FastAPI + SQLite)
  ├── JWT + bcrypt
  ├── chats, mensajes, álbumes, fotos y estados de diálogo
  ├── spaCy: tokenización, lematización y extracción de evidencia
  ├── pysentimiento: política de tono (solo texto llano)
  ├── CountVectorizer + árbol / Naive Bayes / MLP: intención
  ├── diálogo bayesiano: naive Bayes en espacio logarítmico con negación
  ├── Knowledge Graph: BFS, DFS y A* con documentos agronómicos
  ├── RuleEngine: reglas proposicionales y comparaciones ancladas al diagnóstico
  ├── QLearner: selección de fuente de contextualización con estados reducidos
  ├── SVM visual: HOG + HSV (descarga datasets públicos y entrena en segundo plano)
  ├── generador clásico o proxy LLM según el modo
  └── setup.js: bootstrap completo (uv, pnpm, backend, app)
```

El proceso principal de Electron se limita a crear la ventana. El renderer consume directamente FastAPI; el antiguo RPC por `MessagePort` fue eliminado.

## Modos De Respuesta

El selector del chat conserva el modo en `localStorage`:

- `classical`: respuesta determinista construida con intención, PLN, visión, Bayes, reglas y conocimiento del grafo. No realiza llamadas a un LLM.
- `llm`: ejecuta el mismo razonamiento previo y envía el contexto al proveedor LLM configurado para redactar la respuesta mediante SSE.

El LLM no reemplaza la visión, las reglas ni Bayes. Es únicamente un generador opcional en el último paso. El `QLearner` (estados reducidos como `diagnostico:con_knowledge`) selecciona la fuente de contextualización entre `knowledge_guided`, `classification_guided` y `llm_guided`, y se ajusta con la calificación del usuario (+1 útil / −1 no útil).

## Flujo Multimodal

1. El usuario escribe o adjunta una fotografía.
2. La foto se sube y el SVM produce una distribución visual.
3. El texto pasa por intención, PLN y sentimiento.
4. La política de intención puede exigir foto, evidencia o confirmación.
5. El diálogo bayesiano actualiza las hipótesis con cada respuesta y maneja negaciones en el texto libre.
6. Si visión y texto discrepan, se solicita otra foto con descripción.
7. La segunda predicción se fusiona con la observación inicial.
8. El grafo recupera conocimiento agronómico (A* por defecto; BFS y DFS vía `/search`).
9. Las reglas validan el diagnóstico y el perfil del usuario (p. ej. elegibilidad para asistencia técnica del MINAGRI).
10. Q-learning escoge la fuente de contextualización y persiste su tabla Q.
11. Se genera una respuesta clásica o LLM y se transmite por SSE; el inspector del renderer muestra la contribución de cada fuente.

## Módulos

- `apps/desktop`: Electron 43, React 19, TanStack Query y UI del chat (incluye el inspector del razonamiento interno).
- `ml-core`: backend FastAPI y núcleo de razonamiento Python (`uv` administra Python 3.13).
- `packages/sdk`: modelos visuales temporales usados por el renderer.
- `packages/ui`: componentes y tokens visuales compartidos.
- `packages/i18n`: traducciones Paraglide.
- `informe/`: documentación técnica y notebook de Google Colab (`GrupoNuevo_ProyectoFinal_IA.ipynb`) que reproduce los cinco componentes exigidos con el código real del repositorio.

## Desarrollo

### Bootstrap (recomendado)

```bash
corepack pnpm setup
```

`setup.js` prepara todo el entorno automáticamente: descarga y gestiona `uv`/Python, instala dependencias JS y Python (incluye el modelo spaCy `es_core_news_sm`), verifica el modelo de visión y arranca backend + app.

```bash
node setup.js --setup-only   # solo prepara el entorno, no arranca nada
```

### Manual

```bash
corepack pnpm install
corepack pnpm ml:dev     # Uvicorn con --reload en 127.0.0.1:8765
corepack pnpm dev        # electron-vite dev
```

Scripts de uso frecuente:

```bash
corepack pnpm build        # build de producción
corepack pnpm package      # electron-vite build + electron-builder
corepack pnpm type-check   # tsgo
corepack pnpm lint         # oxlint
corepack pnpm format       # oxfmt
```

El backend debe estar activo antes de las operaciones protegidas.

## Google Colab

El notebook `informe/GrupoNuevo_ProyectoFinal_IA.ipynb` clona el repositorio y ejecuta, con el código real (no una reimplementación paralela), los componentes exigidos en la declaración de la tarea: corpus de 125 frases en 20 intenciones, búsqueda BFS/DFS/A*, motor de 7 reglas, pipeline de NLP con normalización de modismos dominicanos, clasificadores (árbol, Naive Bayes, MLP) evaluados con validación cruzada, y Q-learning con ciclo de recompensa.

## Estado Y Limitaciones

- El diálogo bayesiano es inferencia naive Bayes real en espacio logarítmico, con manejo de negación en el texto libre; los pesos del catálogo son log-verosimilitudes fijas.
- El `RuleEngine` está integrado al chat y sus reglas quedan ancladas al diagnóstico; los hechos nulos no disparan comparaciones.
- A* se usa automáticamente; BFS y DFS están disponibles para comparación en `/search`.
- Q-learning es tabular con episodios por chat y crédito hacia atrás; todavía no aprende transiciones completas entre acciones.
- El SVM visual se entrena localmente (descarga de datasets públicos vía `kagglehub`); el repositorio no contiene todavía un manifiesto reproducible completo del dataset y particiones.
- El notebook de Colab asume un clon fresco del repositorio: re-ejecutar sus celdas en el mismo runtime acumula la tabla Q persistida.
- La aplicación es una herramienta de orientación y no reemplaza la inspección agronómica.

## Decisiones Relevantes

- Python se mantiene para scikit-learn, spaCy, pysentimiento, networkx y visión.
- `uv` administra Python 3.13.
- SQLite guarda metadatos; las imágenes se guardan como archivos.
- Los documentos Markdown del grafo contienen conocimiento agronómico y sus fuentes.
- Las respuestas estructuradas de botones no se clasifican como sentimiento.
- Las fotografías y conversaciones pertenecen a una finca y se protegen mediante JWT.