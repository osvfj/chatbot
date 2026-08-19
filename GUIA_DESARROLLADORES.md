# Guía para desarrolladores — Cafebot

Esta guía documenta cómo trabajamos como equipo en el proyecto: arquitectura del sistema, cómo levantar el entorno de desarrollo, cómo está organizado el monorepo, y el flujo de Git que seguimos para que los cambios de cada integrante lleguen a `main` sin pisarse entre sí.

## 1. Qué es Cafebot

Cafebot es un chatbot de escritorio que ayuda a caficultores a identificar enfermedades y plagas del cafeto combinando visión por computadora, procesamiento de lenguaje natural, un motor de reglas, búsqueda sobre un grafo de conocimiento, inferencia bayesiana y aprendizaje por refuerzo.

## 2. Arquitectura general

El proyecto está dividido en dos componentes que se comunican por HTTP y streaming de eventos (SSE):

- **Renderer** (`apps/desktop`): aplicación de escritorio en Electron + React. El proceso `main` de Electron solo crea la ventana; no hay puente RPC entre el renderer y `main`, el renderer consume directamente el backend por HTTP.
- **ml-core** (`ml-core`): servicio en Python con FastAPI. Concentra todo el núcleo de razonamiento: clasificación de intención, motor de reglas, búsqueda en el grafo de conocimiento, diálogo bayesiano, aprendizaje por refuerzo, visión por computadora y persistencia en SQLite. También actúa de proxy SSE hacia el proveedor del modelo de lenguaje.

El LLM recibe en cada turno un contexto ya resuelto por los módulos clásicos (intención, detección visual, evidencia lingüística, conocimiento recuperado, reglas aplicadas y estado bayesiano). El LLM redacta en lenguaje natural, pero no tiene autoridad para contradecir lo que ya decidió el sistema simbólico.

## 3. Estructura del monorepo

```
chatbot/
├── apps/
│   └── desktop/          # App Electron + React (renderer)
├── ml-core/               # Backend FastAPI + núcleo de razonamiento en Python
│   └── src/ml_core/
│       ├── core/          # search.py, rules.py, rl.py, dialogue.py, nlp.py, classifiers.py
│       ├── vision/        # detector.py, features.py, train.py
│       ├── routes/        # endpoints de FastAPI
│       └── data/          # intents.json, knowledge.json, catalog.json, rules.json, modismos.json
├── packages/
│   ├── sdk/               # esquemas Effect Schema compartidos (mensajes, catálogo)
│   ├── i18n/               # traducciones (Paraglide) es / en / criollo haitiano
│   └── ui/                 # componentes y tokens de diseño compartidos
├── oxlint-plugins/         # reglas de lint propias del proyecto
└── informe/                 # informe técnico y documentación de entrega
```

## 4. Requisitos previos

- Node.js con `corepack` habilitado (usamos `pnpm` como gestor de paquetes).
- `uv` para el entorno Python de `ml-core`.
- Python 3.13 fijado explícitamente, porque spaCy todavía no publica wheels compatibles con 3.14.
- Git.

## 5. Cómo levantar el entorno de desarrollo

Instalar dependencias de todo el monorepo:

```
corepack pnpm install
```

Levantar el backend (`ml-core`), necesario antes de abrir la app de escritorio:

```
corepack pnpm ml:dev
```

Levantar la app de escritorio:

```
corepack pnpm dev
```

Si se prefiere levantar el backend directamente sin el script del monorepo:

```
cd ml-core
uv sync
uv run uvicorn ml_core.server:app --host 127.0.0.1 --port 8765 --reload
```

## 6. Variables de entorno relevantes

- `ML_CORE_SECRET`: secreto usado para firmar los tokens JWT de autenticación. El código trae un valor por defecto solo para desarrollo local; **es obligatorio definirlo como variable de entorno propia antes de cualquier despliegue real**, porque el valor por defecto es público en el código fuente.
- `ML_CORE_VISION_MIN_CONFIDENCE`: umbral mínimo de confianza del modelo de visión (por defecto 0.55). Por debajo de este valor, el sistema marca el resultado como no concluyente en vez de forzar un diagnóstico.

## 7. Endpoints útiles para depurar

- `GET /health`: confirma que el servicio está arriba.
- `GET /metrics`: tamaño del dataset, clases de intención y precisión (accuracy, F1 macro) de los tres clasificadores.
- `POST /intent`: clasifica una frase y devuelve el resultado de cada modelo (árbol, bayes, mlp) y el ensemble final.
- `POST /sentiment`: análisis de sentimiento de un texto.
- `POST /search`: búsqueda sobre el grafo de conocimiento (BFS, DFS o A*).
- `POST /rules`: evalúa el motor de reglas sobre un conjunto de hechos.
- `POST /rate`: registra retroalimentación (+1 / −1) para el aprendizaje por refuerzo.

## 8. Cómo agregar contenido al corpus (intenciones y conocimiento)

Cuando se necesite agregar una intención nueva:

1. Agregar entre 5 y 7 frases de ejemplo en `ml-core/src/ml_core/data/intents.json`, siguiendo el formato `{ "text": "...", "intent": "nombre_intencion" }`.
2. Si la intención corresponde a una enfermedad o plaga detectable por visión, agregar o revisar su entrada en `catalog.json`. Si es un tema de conocimiento general (prácticas, clima, programas de apoyo), agregar un nodo nuevo en `knowledge.json` dentro de `"nodes"`, con `keywords` y `response`, y conectarlo al grafo con al menos una arista nueva en `"edges"`.
3. Verificar que los archivos JSON sigan siendo válidos:
   ```
   python -c "import json; json.load(open('ml-core/src/ml_core/data/intents.json', encoding='utf-8'))"
   python -c "import json; json.load(open('ml-core/src/ml_core/data/knowledge.json', encoding='utf-8'))"
   ```
4. Borrar los modelos guardados para forzar el reentrenamiento con el corpus actualizado:
   ```
   rm -rf ml-core/models
   ```
5. Levantar el backend y confirmar que entrena sin errores, y revisar `/metrics` para verificar que la precisión no se haya degradado significativamente.

Si se agregan intenciones nuevas con vocabulario muy similar a intenciones existentes, es normal que la precisión baje si no se agregan suficientes frases de ejemplo por clase; en ese caso conviene sumar más ejemplos o revisar que el vocabulario distintivo de cada intención sea claro.

## 9. Flujo de trabajo con Git

Cada integrante trabaja sobre su propio fork del repositorio (`github.com/tu-usuario/chatbot`), con `origin` apuntando a su fork y `upstream` apuntando al repositorio del equipo (`osvfj/chatbot`).

Configuración inicial (una sola vez, si se trabaja desde un fork):

```
git remote add upstream https://github.com/osvfj/chatbot.git
```

Antes de empezar una tarea nueva, actualizar `main` local con lo último del equipo:

```
git checkout main
git pull upstream main
git push origin main
```

Crear una rama por cada tarea o funcionalidad, con nombre descriptivo:

```
git checkout -b feature/nombre-de-la-tarea
```

Al terminar, agregar solo los archivos que corresponden a esa tarea (evitar incluir `ml-core/uv.lock` u otros archivos generados automáticamente que no sean parte del cambio):

```
git add <archivos específicos>
git commit -m "Descripción clara del cambio"
git push origin feature/nombre-de-la-tarea
```

Abrir el Pull Request desde GitHub, dirigido hacia `osvfj/chatbot` → `main` (verificar que el "base" del PR sea el repositorio del equipo y no el propio fork). Describir brevemente qué se cambió y por qué.

Un integrante con permiso de escritura sobre `osvfj/chatbot` revisa el Pull Request (pestaña "Files changed") y lo mezcla con el botón **Merge pull request**. Después de cada mezcla, el resto del equipo actualiza su `main` local con `git pull upstream main` antes de seguir trabajando, para evitar conflictos innecesarios.

## 10. Convenciones de código

El proyecto usa `oxlint` y `oxfmt` para lint y formateo, configurados en `.oxlintrc.json` y `.oxfmtrc.json` en la raíz del monorepo, más reglas propias en `oxlint-plugins`. Antes de subir una rama, correr el lint y formateo del monorepo para mantener un estilo consistente entre integrantes.

## 11. Nota sobre la documentación existente

El archivo `AGENTS.md` del repositorio describe una arquitectura anterior del proyecto (comunicación entre `main` y el renderer por `MessagePort`), que ya no corresponde al código actual: el proceso `main` de Electron ya no expone ese puente, y el renderer habla directo por HTTP con `ml-core`. Si se retoma ese archivo, conviene actualizarlo para que refleje la arquitectura vigente y evitar confusión a quien se integre al proyecto más adelante.

## 12. Pendientes conocidos

- El modelo de visión fue entrenado con conjuntos de datos públicos, no con fotografías de fincas dominicanas; su desempeño en campo real debe validarse antes de cualquier uso productivo.
- La precisión de los clasificadores de intención bajó al ampliar el corpus de 12 a 20 intenciones sin aumentar proporcionalmente los ejemplos por clase; conviene seguir sumando frases reales por intención.
- El motor de reglas cubre actualmente siete reglas; se puede seguir ampliando para otras plagas y prácticas de manejo (nutrición, riego).
