# Desktop

Aplicación Electron 43 + React 19 de Cafebot.

## Responsabilidades

- Mostrar autenticación, chat, galería y álbumes.
- Guardar el JWT en `localStorage`.
- Consumir `ml-core` mediante HTTP.
- Procesar eventos SSE.
- Seleccionar modo `Clásico` o `LLM`.
- Mostrar preguntas adaptativas y respuestas estructuradas.
- Permitir seleccionar archivos o abrir la cámara para fotografías de seguimiento.
- Mostrar feedback positivo o negativo para Q-learning.

## Flujo De Chat

1. El usuario inicia sesión o registra una finca.
2. El primer mensaje crea un chat en `ml-core`.
3. Una fotografía se sube a `POST /chats/{id}/photos`.
4. El backend ejecuta el SVM y devuelve `foto_id`.
5. El renderer envía el mensaje, `foto_id`, modo y respuestas estructuradas a `/chat`.
6. `ChatStreamer` procesa `event: context`.
7. La UI muestra pregunta, Bayes, reglas, conocimiento y sentimiento en consola.
8. La respuesta llega progresivamente mediante SSE.
9. El usuario puede valorar la última respuesta.

## Modos

El selector del encabezado ofrece:

- `Clásico`: respuesta determinista sin llamada LLM.
- `LLM`: el backend conserva el razonamiento clásico y usa el proveedor configurado para redactar.

La selección se guarda como `cafebot:chat-mode`.

## Preguntas Y Fotografías

Las preguntas aparecen dentro del historial. Las preguntas normales ofrecen opciones y texto libre. Cuando existe discrepancia visual-textual, la tarjeta solicita una descripción y ofrece:

- `Seleccionar fotografía`;
- `Abrir cámara`.

La nueva fotografía se sube, se analiza y se incorpora a la fusión de observaciones.

## Feedback

La última respuesta muestra 👍 y 👎. El frontend envía el estado y modo de contextualización a `/rate`, con recompensa `1` o `-1`. El backend persiste la tabla Q y el registro de feedback.

## Consola De Depuración

Durante `context`, el renderer agrupa:

- `[Cafebot] Actualización bayesiana`;
- `[Cafebot] Análisis de sentimiento`;
- `[Cafebot] Grafo de conocimiento`;
- `[Cafebot] Política de intención`.

Esto permite observar el back-and-forth antes de la respuesta final.

## Comandos

```bash
corepack pnpm --filter @cafebot/desktop dev
corepack pnpm --filter @cafebot/desktop type-check
corepack pnpm --filter @cafebot/desktop build
```

La aplicación necesita `ml-core` activo en `http://127.0.0.1:8765`.

El proceso main no contiene RPC ni servicios de chat, visión o LLM; el renderer utiliza temporalmente `@cafebot/sdk` para `ChatMessage` y `MessageAttachment`.
