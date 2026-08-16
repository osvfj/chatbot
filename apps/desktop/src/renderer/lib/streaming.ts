import { Effect, Stream } from "effect";
import { AsyncResult, Atom } from "effect/unstable/reactivity";
import { ChatDelta } from "@cafebot/sdk";
import { Api } from "../services/api";
import { zenAccountAtom, zenApiKeyAtom, zenEndpoint, zenModelAtom } from "./zen-settings";

export interface PendingReply {
  readonly content: string;
  readonly context: string;
  readonly key: string;
}

export const pendingReplyAtom = Atom.make<PendingReply | null>(null).pipe(Atom.keepAlive);

export type StreamChunks = { readonly done: boolean; readonly items: ReadonlyArray<ChatDelta> };
export type StreamResult = AsyncResult.AsyncResult<StreamChunks, unknown>;

export const streamingResultAtom = Api.runtime
  .pull((get) => {
    const pending = get(pendingReplyAtom);
    if (pending === null) {
      return Stream.never;
    }
    const apiKey = get(zenApiKeyAtom);
    const model = get(zenModelAtom);
    const account = get(zenAccountAtom);
    const prompt =
      pending.context.length === 0 ? pending.content : `${pending.content}\n\n${pending.context}`;
    const payload = {
      content: prompt,
      endpoint: zenEndpoint(account),
      ...(apiKey.length === 0 ? {} : { apiKey }),
      ...(model.length === 0 ? {} : { model }),
    };
    return Stream.unwrap(Effect.map(Api, (client) => client("SendMessage", payload)));
  })
  .pipe(Atom.keepAlive);
