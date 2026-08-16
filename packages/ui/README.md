# UI

Design system compartido de Cafebot basado en Tailwind CSS v4, Base UI y componentes estilo shadcn.

## Contenido

- tokens de color y tema en `src/styles/globals.css`;
- componentes reutilizables en `src/components/`;
- utilidades compartidas en `src/lib/`;
- hooks visuales en `src/hooks/`.

El paquete no conoce usuarios, fincas, chats ni modelos de ML. Solo contiene presentación y comportamiento visual reusable.

## Convenciones

- Los componentes exponen variantes mediante `class-variance-authority`.
- Las vistas de la aplicación reciben datos y callbacks; la persistencia vive en `ml-core` y TanStack Query.
- Los estilos de Markdown se mantienen en el renderer porque dependen del contenido de respuestas del chat.

## Uso

```tsx
import { Button } from "@cafebot/ui/components/button";
import "@cafebot/ui/globals.css";
```
