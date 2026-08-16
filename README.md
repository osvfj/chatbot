# Cafebot

Cafebot es una aplicación de escritorio para asistir a caficultores en la identificación y el manejo de problemas del cafeto.

## Arquitectura

```text
React renderer
  ├── TanStack Query + fetch HTTP
  ├── Auth y estado visual
  └── SSE para respuestas del LLM
        │
        ▼
ml-core (FastAPI + SQLite)
  ├── JWT + bcrypt
  ├── chats, mensajes, álbumes y fotos
  ├── búsqueda, reglas, clasificadores y RL
  ├── detección visual SVM
  └── proxy SSE hacia OpenCode Zen/Go
```

El proceso main de Electron quedó reducido a crear la ventana. El antiguo RPC por `MessagePort` fue eliminado; el renderer consume directamente el backend.

## Módulos

- `apps/desktop`: aplicación Electron y UI React.
- `ml-core`: backend FastAPI y núcleo de razonamiento Python.
- `packages/sdk`: modelos de dominio que aún usa el renderer para mensajes.
- `packages/i18n`: traducciones generadas con Paraglide.
- `packages/ui`: componentes y tokens visuales compartidos.

## Desarrollo

```bash
corepack pnpm install
corepack pnpm ml:dev
corepack pnpm dev
```

El backend debe estar corriendo antes de iniciar las operaciones protegidas de la aplicación.

## Decisiones relevantes

- Python se mantiene para aprovechar scikit-learn, spaCy, pysentimiento, networkx y el modelo de visión del equipo.
- `uv` administra el entorno Python y fija Python 3.13 porque spaCy todavía no ofrece wheels compatibles con Python 3.14.
- SQLite almacena los metadatos; las imágenes se guardan como archivos en `ml-core/storage/`.
- Las fincas son las cuentas institucionales y los usuarios pertenecen a una finca.
- Un álbum se crea cuando un chat recibe su primera foto.
- El LLM recibe un contexto enriquecido con detección visual, intención, sentimiento y clasificación de los modelos clásicos.
