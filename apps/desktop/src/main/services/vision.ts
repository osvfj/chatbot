import { DateTime, Duration, Effect, Random } from "effect";
import { DetectionResult, coffeeDiseases, healthyDisease } from "@cafebot/sdk";

const fnv1a = (data: Uint8Array): number => {
  let hash = 0x811c9dc5;
  for (const byte of data) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const mulberry32 = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const analyzeImage = (
  fileName: string,
  data: Uint8Array,
): Effect.Effect<DetectionResult, never> =>
  Effect.gen(function* () {
    yield* Effect.sleep(Duration.millis(600 + Math.floor(Math.random() * 900)));
    const id = yield* Effect.sync(() => crypto.randomUUID());
    const random = mulberry32(fnv1a(data));

    const disease =
      random() < 0.12 ? healthyDisease.info : (yield* Random.choice(coffeeDiseases)).info;

    const confidence = 0.72 + random() * 0.26;
    const now = yield* DateTime.now;

    return new DetectionResult({
      id,
      fileName,
      disease,
      confidence,
      analyzedAt: now,
    });
  });
