# Cafebot — AGENTS.md

Chatbot de escritorio para la detección de enfermedades del cafeto. Proyecto de IA
(capa UI) que actualmente usa servicios simulados en el proceso principal, pensado
para ser reemplazados por un modelo real de visión por computadora.

## Stack

- Monorepo pnpm workspaces (`apps/*` + `packages/*`)
- Electron 43 + electron-vite 5 + Vite 7
- React 19 + Tailwind CSS v4 + shadcn/ui (style `base-nova`, base `base-ui`)
- Effect v4 (`4.0.0-beta.106`) con Reactividad y RPC integrados:
  - `effect/unstable/reactivity` — atoms (`Atom.make`, `Atom.fn`, `Atom.keepAlive`)
  - `effect/unstable/rpc` — RPC sobre `MessagePort` (sin HTTP)
  - `@effect/atom-react` — hooks (`useAtom`, `useAtomValue`, `useAtomSet`)
- Type-check con **tsgo** (`@typescript/native-preview`); edición con
  `@effect/language-service`
- Lint/formato con oxlint 1.x + oxfmt

## Comandos

```bash
corepack pnpm dev            # arranca el desktop (electron-vite dev)
corepack pnpm build          # electron-vite build
corepack pnpm type-check     # tsgo en sdk, ui y desktop
corepack pnpm lint           # oxlint . (errores)
corepack pnpm format         # oxfmt (escribe en el lugar)
corepack pnpm format:check   # verificación de formato
corepack pnpm package        # electron-vite build + electron-builder
```

Usa `corepack pnpm` (pnpm 11.21.0 fijado en `packageManager`); no instales pnpm
global nuevo.

## Estructura

```
packages/sdk        Dominio compartido: catálogo de enfermedades, esquemas (Schema.Class)
packages/ui         Design system: globals.css con tema de café, componentes shadcn/ui
apps/desktop
  src/main          Proceso principal (Effect program + RpcServer sobre MessagePortMain)
  src/preload       Reenvía el MessagePort al renderer (contextIsolation + sandbox)
  src/shared        Contratos RPC (RpcGroup/Rpc.make) + adaptador de puerto cliente
  src/renderer      React app: atoms, chat, galería estilo Pinterest
    lib/atoms.ts    Estado global (messagesAtom, detectionsAtom, secciones, mutaciones)
    services/api.ts Api = AtomRpc.Service — convierte cada RPC en atoms
    components/chat|gallery|layout
```

## Convenciones críticas

1. **Sin casts peligrosos.** Prohibido `Record<string, unknown>`, `as unknown`,
   `as unknown as X`, `as any` y comparaciones con `typeof`. Se aplican vía
   oxlint: `typescript/no-restricted-types` + plugin propio en
   `oxlint-plugins/cafebot.js` (`no-unknown-assertions`, `no-record-string-unknown`,
   `no-typeof-guards`) + `no-explicit-any`. Prefiere `as const` y anotaciones
   explícitas; usa `Predicate`/`Option`/`Schema` en vez de guards `typeof`.
2. **Schemas v4 (importante).** La API publicada de effect beta.106 difiere de @main:
   - `Schema.Literals([...])` para uniones (no `Schema.Literal(a, b)`)
   - `Schema.TaggedClass<X>()("Tag", fields)` — un solo call con (tag, fields)
   - `Schema.Class<X>("Name")(fields)` — curried
   - UUID: `Schema.String.check(Schema.isUUID())`
   - Rango: `Schema.Number.check(Schema.isBetween({ minimum, maximum }))`
   - Fechas: `Schema.DateTimeUtcFromDate` (no `FromSelf`); los valores son
     `DateTime.Utc`, usa `yield* DateTime.now` o `Effect.runSync(DateTime.now)`
3. **RPC:** los handlers se componen con `AllRpcs.toLayer(Effect.sync(() => ({ ... })))`;
   el server es `RpcServer.layer(AllRpcs, { disableFatalDefects: true })`. El puerto
   se entrega en `did-finish-load` vía `MessageChannelMain`; ambos adaptadores usan
   `Queue` + `Stream.fromQueue` (no Mailbox) y `serialization.makeUnsafe()` (no
   `unsafeMake()`).
4. **Atoms:** el estado de UI vive en atoms (`Atom.keepAlive`); los ViewModels
   (hooks) exponen setters de `useAtom`. Mutaciones: `useAtom(fn, { mode: "promiseExit" })`
   → `await send({ payload })` → `Exit.isSuccess`; `AsyncResult.isWaiting(result)`
   para estados de carga (ej. indicador "escribiendo…").
5. **Import de `.ts` entre paquetes:** requiere `allowImportingTsExtensions`
   (ya activo en los tsconfigs; todos los proyectos compilan con `noEmit`).
6. `Cause.squash(cause)` devuelve `unknown` en v4: usa `String(...)` antes de mostrarlo.

## Pendiente (roadmap)

- Reemplazar `services/vision.ts` (mock determinista por hash) y `services/chat.ts`
  (respuestas por palabras clave) por inferencia real (ONNX/TensorFlow.js en main).
- Persistir detecciones e historial (KVS del main + `Atom.kvs` del lado renderer).
- Streaming de respuestas vía `RpcSchema.Stream` + `Atom.pull`.
- Exportar reportes (QuestPDF) y reporte Kardex.
