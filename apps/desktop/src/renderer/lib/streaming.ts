import { Atom } from "effect/unstable/reactivity";

export interface PendingReply {
  readonly chatId: string;
  readonly content: string;
  readonly fotoId?: string | undefined;
  readonly answerId?: string | undefined;
  readonly freeText?: string | undefined;
  readonly key: string;
}

export interface DialogueQuestion {
  readonly id: string;
  readonly text: string;
  readonly options: ReadonlyArray<{ readonly id: string; readonly label: string }>;
  readonly allow_free_text: boolean;
  readonly question_number: number;
  readonly max_questions: number;
}

export interface LearnerDecision {
  readonly state: string;
  readonly action: "knowledge_guided" | "classification_guided" | "llm_guided";
}

export const pendingReplyAtom = Atom.make<PendingReply | null>(null).pipe(Atom.keepAlive);

export const streamTextAtom = Atom.make<string>("").pipe(Atom.keepAlive);
export const dialogueQuestionAtom = Atom.make<DialogueQuestion | null>(null).pipe(Atom.keepAlive);
export const learnerDecisionAtom = Atom.make<LearnerDecision | null>(null).pipe(Atom.keepAlive);
