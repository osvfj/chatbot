import { Effect, Layer, Queue, Stream } from "effect";
import { RpcClient, RpcSerialization } from "effect/unstable/rpc";
import type { FromClientEncoded, FromServerEncoded } from "effect/unstable/rpc/RpcMessage";

export interface IpcClientPort {
  onmessage: ((event: { data: string | Uint8Array }) => void) | null;
  postMessage: (message: string | Uint8Array) => void;
  start: () => void;
  close: () => void;
}

export const layerIpcClient = (port: IpcClientPort): Layer.Layer<RpcClient.Protocol> =>
  Layer.effect(
    RpcClient.Protocol,
    RpcClient.Protocol.make(
      Effect.fnUntraced(function* (write, _clientIds) {
        const serialization = yield* RpcSerialization.RpcSerialization;
        const parser = serialization.makeUnsafe();
        const inbound = yield* Queue.make<FromServerEncoded>();

        port.onmessage = (event) => {
          try {
            for (const decoded of parser.decode(event.data)) {
              Effect.runSync(Queue.offer(inbound, decoded as FromServerEncoded));
            }
          } catch {
            // Frame malformado: se descarta.
          }
        };
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            port.onmessage = null;
            port.close();
          }),
        );
        port.start();

        yield* Effect.forkScoped(
          Stream.fromQueue(inbound).pipe(Stream.runForEach((message) => write(0, message))),
        );

        const send = (_clientId: number, request: FromClientEncoded) =>
          Effect.sync(() => {
            const encoded = parser.encode(request);
            if (encoded !== undefined) {
              port.postMessage(encoded);
            }
          });

        return {
          send,
          supportsAck: true,
          supportsTransferables: false,
        };
      }),
    ),
  ).pipe(Layer.provide(RpcSerialization.layerMsgPack));
