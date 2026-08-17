# SDK

`@cafebot/sdk` contiene modelos de dominio basados en Effect Schema:

- `ChatMessage`;
- `MessageAttachment`;
- `ChatReply` y `ChatDelta` heredados del diseño RPC;
- `DetectionResult` y el catálogo original de enfermedades.

## Estado actual

El SDK ya **no** contiene el transporte RPC ni es utilizado por el proceso main. La comunicación principal ahora es:

```text
renderer → HTTP/SSE → ml-core
```

Sin embargo, el renderer todavía usa `ChatMessage` y `MessageAttachment` para el estado visual del chat. Por eso el paquete sigue siendo útil temporalmente.

El SDK no contiene la política de intención, el estado bayesiano, las reglas ni el transporte SSE. Esos contratos pertenecen actualmente al backend y a los tipos locales del renderer.

## Próxima limpieza

Cuando el renderer migre completamente a DTOs planos provenientes del backend, se podrá reemplazar `ChatMessage` y `MessageAttachment`, eliminar los tipos heredados del RPC y borrar `@cafebot/sdk` si no quedan imports.

No se elimina todavía para evitar mezclar esa limpieza con la migración de persistencia y auth.
