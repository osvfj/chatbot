import { Context, Effect, Layer, Queue, Stream } from "effect";
import { RpcSerialization, RpcServer } from "effect/unstable/rpc";
import type { FromClientEncoded, FromServerEncoded } from "effect/unstable/rpc/RpcMessage";

export interface IpcServerPort {
  on(event: "message", listener: (event: { data: string | Uint8Array }) => void): void;
  on(event: "close", listener: () => void): void;
  off(event: "message", listener: (event: { data: string | Uint8Array }) => void): void;
  postMessage(message: string | Uint8Array): void;
  start(): void;
  close(): void;
}

export class RpcPortHandoff extends Context.Service<
  RpcPortHandoff,
  { readonly bind: (port: IpcServerPort) => void }
>()("cafebot/RpcPortHandoff") {}

interface ActivePort {
  readonly port: IpcServerPort;
  readonly id: number;
  readonly parser: RpcSerialization.Parser;
  readonly handler: (event: { data: string | Uint8Array }) => void;
}

export const layerIpcServer: Layer.Layer<RpcServer.Protocol | RpcPortHandoff> = Layer.effectContext(
  Effect.gen(function* () {
    const portInbox = yield* Queue.make<IpcServerPort>();

    const protocol = yield* RpcServer.Protocol.make(
      Effect.fnUntraced(function* (writeRequest) {
        const serialization = yield* RpcSerialization.RpcSerialization;
        const disconnects = yield* Queue.make<number>();
        const inbound = yield* Queue.make<readonly [number, FromClientEncoded]>();
        let nextClientId = 0;
        let current: ActivePort | null = null;

        const bindPort = (newPort: IpcServerPort): void => {
          if (current) {
            current.port.off("message", current.handler);
            current.port.close();
            Effect.runSync(Queue.offer(disconnects, current.id));
          }
          const id = nextClientId++;
          const parser = serialization.makeUnsafe();
          const handler = (event: { data: string | Uint8Array }): void => {
            try {
              for (const message of parser.decode(event.data)) {
                Effect.runSync(Queue.offer(inbound, [id, message as FromClientEncoded]));
              }
            } catch {
              // Frame malformado: se descarta.
            }
          };
          newPort.on("message", handler);
          newPort.on("close", () => Effect.runSync(Queue.offer(disconnects, id)));
          newPort.start();
          current = { port: newPort, id, parser, handler };
        };

        yield* Effect.forkScoped(
          Stream.fromQueue(inbound).pipe(
            Stream.runForEach(([id, message]) =>
              id === current?.id ? writeRequest(id, message) : Effect.void,
            ),
          ),
        );
        yield* Effect.forkScoped(
          Stream.fromQueue(portInbox).pipe(
            Stream.runForEach((port) => Effect.sync(() => bindPort(port))),
          ),
        );
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            if (current) {
              current.port.off("message", current.handler);
              current.port.close();
            }
          }),
        );

        const send = (clientId: number, response: FromServerEncoded): Effect.Effect<void> =>
          Effect.sync(() => {
            if (current?.id === clientId) {
              const encoded = current.parser.encode(response);
              if (encoded !== undefined) {
                current.port.postMessage(encoded);
              }
            }
          });

        return {
          disconnects,
          send,
          end: () => Effect.void,
          clientIds: Effect.sync(() => new Set(current ? [current.id] : [])),
          initialMessage: Effect.succeedNone,
          supportsAck: true,
          supportsTransferables: false,
          supportsSpanPropagation: false,
        };
      }),
    ).pipe(Effect.provide(RpcSerialization.layerMsgPack));

    const handoff = {
      bind: (port: IpcServerPort): void => {
        Effect.runSync(Queue.offer(portInbox, port));
      },
    };

    return Context.make(RpcPortHandoff, handoff).pipe(Context.add(RpcServer.Protocol, protocol));
  }),
);
