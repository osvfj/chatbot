import { Deferred, Effect, Layer } from "effect";
import { RpcClient } from "effect/unstable/rpc";
import type { IpcClientPort } from "../shared/rpc-client";
import { layerIpcClient } from "../shared/rpc-client";

const deferred = Effect.runSync(Deferred.make<MessagePort, never>());

window.addEventListener("message", (event) => {
  if (event.data === "rpc-port" && event.ports[0] !== undefined) {
    Effect.runFork(Deferred.succeed(deferred, event.ports[0]));
  }
});

const toClientPort = (port: MessagePort): IpcClientPort => {
  let onmessage: IpcClientPort["onmessage"] = null;
  port.onmessage = (event) => {
    onmessage?.({ data: event.data });
  };
  return {
    get onmessage() {
      return onmessage;
    },
    set onmessage(value) {
      onmessage = value;
    },
    postMessage: (message) => port.postMessage(message),
    start: () => port.start(),
    close: () => port.close(),
  };
};

export const layerRpcClient: Layer.Layer<RpcClient.Protocol> = Layer.unwrap(
  Deferred.await(deferred).pipe(
    Effect.map((port: MessagePort) => layerIpcClient(toClientPort(port))),
  ),
);
