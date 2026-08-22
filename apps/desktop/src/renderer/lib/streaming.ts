import { Atom } from "effect/unstable/reactivity";

export interface PendingReply {
  readonly chatId: string;
  readonly content: string;
  readonly fotoId?: string | undefined;
  readonly answerId?: string | undefined;
  readonly freeText?: string | undefined;
  readonly mode: "classical" | "llm";
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

export interface IntentPrediction {
  readonly ensemble: string;
  readonly tree: {
    readonly intent: string;
    readonly confidence: number;
    readonly path: ReadonlyArray<string>;
  };
  readonly bayes: {
    readonly intent: string;
    readonly confidence: number;
    readonly top: ReadonlyArray<{
      readonly intent: string;
      readonly probability: number;
    }>;
  };
  readonly mlp: {
    readonly intent: string;
    readonly confidence: number;
  };
}

export interface RulesResult {
  readonly applied: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly conclusion: string;
    readonly priority: number;
    readonly explanation: string;
  }>;
  readonly conclusion: string | null;
}

export interface EvidenceResult {
  readonly symptoms: ReadonlyArray<string>;
  readonly plant_parts: ReadonlyArray<string>;
  readonly colors: ReadonlyArray<string>;
  readonly duration?: string | null;
  readonly severity: string;
}

export interface DecisionResult {
  readonly hypotheses: Readonly<Record<string, number>>;
  readonly top_hypothesis: string;
  readonly confidence: number;
}

export interface DetectionPrediction {
  readonly disease_id: string | null;
  readonly disease_name: string;
  readonly confidence: number;
}

export interface DetectionResult {
  readonly archivo?: string | null;
  readonly status?: string | null;
  readonly enfermedad?: string | null;
  readonly id_enfermedad?: string | null;
  readonly descripcion?: string | null;
  readonly confianza?: number | null;
  readonly severidad?: string | null;
  readonly recomendacion?: string | null;
  readonly top_predictions?: ReadonlyArray<DetectionPrediction>;
}

export interface ChatContext {
  readonly question: DialogueQuestion | null;
  readonly knowledge?: {
    readonly query?: string;
    readonly found?: boolean;
    readonly algorithm?: string;
    readonly node?: string;
    readonly path?: ReadonlyArray<string>;
    readonly cost?: number | null;
    readonly response?: string | null;
  } | null;
  readonly intent_policy?: {
    readonly action: string;
    readonly must_have: ReadonlyArray<string>;
    readonly max_questions: number;
  } | null;
  readonly sentiment?: {
    readonly label: string;
    readonly probas: Readonly<Record<string, number>>;
    readonly confidence: number;
  } | null;
  readonly policy?: {
    readonly tone: string;
    readonly verbosity: string;
    readonly must_not_confirm_diagnosis: boolean;
    readonly ask_for_evidence_if_empty: boolean;
    readonly learner_state?: string;
    readonly selected_source?: LearnerDecision["action"];
  } | null;
  readonly bayesian?: {
    readonly hypotheses: Readonly<Record<string, number>>;
    readonly top_hypothesis: string | null;
    readonly confidence: number;
    readonly evidence: ReadonlyArray<unknown>;
  } | null;
  readonly intent?: IntentPrediction | null;
  readonly rules?: RulesResult | null;
  readonly evidence?: EvidenceResult | null;
  readonly decision?: DecisionResult | null;
  readonly detection?: DetectionResult | null;
}

export const pendingReplyAtom = Atom.make<PendingReply | null>(null).pipe(Atom.keepAlive);

export const streamTextAtom = Atom.make<string>("").pipe(Atom.keepAlive);
export const dialogueQuestionAtom = Atom.make<DialogueQuestion | null>(null).pipe(Atom.keepAlive);
export const learnerDecisionAtom = Atom.make<LearnerDecision | null>(null).pipe(Atom.keepAlive);

// Último contexto completo recibido del backend (SSE event: context).
export const contextAtom = Atom.make<ChatContext | null>(null).pipe(Atom.keepAlive);
