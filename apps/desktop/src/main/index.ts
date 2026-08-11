import { join } from "node:path";
import { Effect, Layer, ManagedRuntime } from "effect";
import { RpcServer } from "effect/unstable/rpc";
import { app, BrowserWindow, MessageChannelMain, type MessagePortMain } from "electron";
import { AllRpcs } from "../shared/rpc";
import { layerIpcServer, RpcPortHandoff, type IpcServerPort } from "./ipc-server";
import { sendMessage } from "./services/chat";
import { analyzeImage } from "./services/vision";

const HandlersLive = AllRpcs.toLayer(
  Effect.sync(() => ({
    SendMessage: (payload: { readonly content: string }) => sendMessage(payload.content),
    AnalyzeImage: (payload: { readonly fileName: string; readonly data: Uint8Array }) =>
      analyzeImage(payload.fileName, payload.data),
  })),
);

const Live: Layer.Layer<RpcPortHandoff | RpcServer.Protocol> = RpcServer.layer(AllRpcs, {
  disableFatalDefects: true,
}).pipe(Layer.provide(HandlersLive), Layer.provideMerge(layerIpcServer));

const runtime = ManagedRuntime.make(Live);

const toServerPort = (port: MessagePortMain): IpcServerPort => {
  const wrapped = new Map<
    (...args: ReadonlyArray<unknown>) => void,
    (messageEvent: { data: unknown }) => void
  >();
  const on = ((event: "message" | "close", listener: (...args: ReadonlyArray<unknown>) => void) => {
    if (event === "message") {
      const handler = (messageEvent: { data: unknown }): void =>
        listener({ data: messageEvent.data });
      wrapped.set(listener, handler);
      port.on("message", handler);
    } else {
      port.on("close", listener as () => void);
    }
  }) as IpcServerPort["on"];
  const off = ((_event: "message", listener: (...args: ReadonlyArray<unknown>) => void) => {
    const handler = wrapped.get(listener);
    if (handler !== undefined) {
      port.off("message", handler);
      wrapped.delete(listener);
    }
  }) as IpcServerPort["off"];
  return {
    on,
    off,
    postMessage: (message) => port.postMessage(message),
    start: () => port.start(),
    close: () => port.close(),
  };
};

const createWindow = (bind: (port: IpcServerPort) => void): void => {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: "#faf8f2",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.on("ready-to-show", () => window.show());

  window.webContents.on("did-finish-load", () => {
    const channel = new MessageChannelMain();
    window.webContents.postMessage("rpc-port", null, [channel.port2]);
    bind(toServerPort(channel.port1));
  });

  const devServerUrl = process.env.ELECTRON_RENDERER_URL;
  if (devServerUrl !== undefined) {
    void window.loadURL(devServerUrl);
  } else {
    void window.loadFile(join(__dirname, "../renderer/index.html"));
  }
};

app.whenReady().then(
  () =>
    runtime.runPromise(RpcPortHandoff).then((handoff) => {
      createWindow(handoff.bind);
      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow(handoff.bind);
        }
      });
    }),
  (cause) => {
    console.error("No se pudo iniciar el servidor RPC de Cafebot", cause);
    app.quit();
  },
);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    void runtime.dispose().finally(() => app.quit());
  }
});
