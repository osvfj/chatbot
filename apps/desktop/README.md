# Desktop

Aplicación Electron 43 + React 19 para Cafebot.

## Responsabilidades

- Mostrar el chat, galería, autenticación y ajustes.
- Guardar el token JWT en `localStorage`.
- Consumir `ml-core` mediante HTTP.
- Consumir respuestas del chat mediante SSE.
- Mantener la respuesta parcial del LLM mientras el usuario cambia de pestaña.
- Mostrar Markdown, detecciones y álbumes.

## Flujo de chat

1. El usuario inicia sesión o registra una finca.
2. El primer mensaje crea un chat en `ml-core`.
3. El renderer envía el mensaje a `POST /chats/{id}/chat`.
4. `ChatStreamer` consume el SSE y actualiza el texto progresivamente.
5. `ml-core` persiste el mensaje del usuario y la respuesta del assistant.

Cuando se adjunta una imagen, primero se sube a `POST /chats/{id}/photos`. El backend ejecuta el detector disponible, guarda el resultado y devuelve el `foto_id`. Ese ID se envía luego al endpoint de chat para que el backend agregue la detección al contexto del LLM.

## Estado y consultas

- TanStack Query maneja auth, historial, chats, álbumes, fotos y uploads.
- Los atoms de Effect conservan únicamente estado visual y mensajes renderizados.
- `ChatStreamer` vive en el layout de la aplicación, no dentro de la ruta de chat; por eso cambiar a Galería no cancela el stream.
- Las imágenes protegidas se descargan con `fetch` y se convierten en object URLs antes de mostrarse en un `<img>`.

## OpenCode

Los ajustes de OpenCode se almacenan en `localStorage`: cuenta Zen o Go, API key, modelo y endpoint derivado de la cuenta. La configuración viaja en cada request de chat.

## Comandos

```bash
corepack pnpm --filter @cafebot/desktop dev
corepack pnpm --filter @cafebot/desktop type-check
corepack pnpm --filter @cafebot/desktop build
```

La aplicación necesita `ml-core` activo en `http://127.0.0.1:8765`.

## Estado de migración

El proceso main ya no contiene el servidor RPC ni los servicios de chat, visión o LLM. `@cafebot/sdk` todavía se importa desde el renderer para crear `ChatMessage` y `MessageAttachment`; esos tipos pueden reemplazarse después por DTOs planos del backend.
