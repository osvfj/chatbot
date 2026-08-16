import { Atom } from "effect/unstable/reactivity";

export interface PendingReply {
  readonly chatId: string;
  readonly content: string;
  readonly fotoId?: string | undefined;
  readonly key: string;
}

export const pendingReplyAtom = Atom.make<PendingReply | null>(null).pipe(Atom.keepAlive);

export const streamTextAtom = Atom.make<string>("").pipe(Atom.keepAlive);
