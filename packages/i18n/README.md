# i18n

Internacionalización de Cafebot con Paraglide.js.

## Locales

- `es`: español;
- `en`: inglés;
- `ht`: criollo haitiano.

Los mensajes fuente están en `messages/*.json`. Paraglide genera las funciones tipadas dentro de `src/paraglide/`.

## Flujo

1. Editar las tres fuentes JSON.
2. Ejecutar `pnpm --filter @cafebot/i18n compile`.
3. Consumir los mensajes desde `@cafebot/i18n`.

La interfaz usa `languageAtom` para mantener el locale seleccionado. Los prompts del LLM no cambian con cada locale: el system prompt es estático para preservar el prompt cache e indica que el modelo responda en el idioma del usuario.
