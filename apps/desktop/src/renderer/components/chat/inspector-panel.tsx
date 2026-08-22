import { useAtomValue } from "@effect/atom-react";
import {
  BrainIcon,
  GitBranchIcon,
  NetworkIcon,
  ScaleIcon,
  ScanEyeIcon,
  SparklesIcon,
} from "lucide-react";
import { contextAtom } from "../../lib/streaming";

const FUENTE_ETIQUETA: Record<string, string> = {
  knowledge_guided: "Base de conocimientos",
  classification_guided: "Clasificación",
  llm_guided: "Estándar",
};

const ESTADO_DETECCION: Record<string, string> = {
  detected: "Detectado",
  uncertain: "No concluyente",
  confirmed_dialogue: "Confirmado por diálogo",
};

function Barra({ etiqueta, valor }: { readonly etiqueta: string; readonly valor: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 truncate text-muted-foreground">{etiqueta}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full bg-primary/70"
          style={{ width: `${Math.round(valor * 100)}%` }}
        />
      </span>
      <span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">
        {Math.round(valor * 100)}%
      </span>
    </div>
  );
}

function Seccion({
  icono,
  titulo,
  children,
}: {
  readonly icono: React.ReactNode;
  readonly titulo: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icono}
        {titulo}
      </p>
      {children}
    </div>
  );
}

export function InspectorPanel() {
  const context = useAtomValue(contextAtom);
  if (context === null) {
    return (
      <p className="px-6 py-2 text-xs text-muted-foreground">
        Envía un mensaje para ver el razonamiento interno del sistema.
      </p>
    );
  }

  const intent = context.intent ?? null;
  const bayes = context.bayesian ?? null;
  const decision = context.decision ?? null;
  const deteccion = context.detection ?? null;
  const reglas = context.rules?.applied ?? [];
  const fuente = context.policy?.selected_source;

  return (
    <div className="grid gap-2 px-6 py-2 lg:grid-cols-2">
      {intent !== null && (
        <Seccion icono={<BrainIcon className="size-3.5" />} titulo="Intención (ensemble)">
          <p className="mb-2 text-sm font-medium">
            {intent.ensemble}
            <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
              fuente: {FUENTE_ETIQUETA[fuente ?? "llm_guided"] ?? String(fuente)}
            </span>
          </p>
          <div className="space-y-1">
            <Barra etiqueta="árbol" valor={intent.tree.confidence} />
            <Barra etiqueta="naive bayes" valor={intent.bayes.confidence} />
            <Barra etiqueta="perceptrón ML" valor={intent.mlp.confidence} />
          </div>
          {intent.tree.path.length > 0 && (
            <details className="mt-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer">ruta del árbol de decisión</summary>
              <ol className="mt-1 space-y-0.5 pl-4">
                {intent.tree.path.map((paso) => (
                  <li key={paso} className="list-decimal">
                    {paso}
                  </li>
                ))}
              </ol>
            </details>
          )}
          {(context.evidence?.symptoms.length ?? 0) +
            (context.evidence?.colors.length ?? 0) +
            (context.evidence?.plant_parts.length ?? 0) >
            0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {[
                ...(context.evidence?.symptoms ?? []),
                ...(context.evidence?.colors ?? []),
                ...(context.evidence?.plant_parts ?? []),
              ].map((pista) => (
                <span
                  key={pista}
                  className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  {pista}
                </span>
              ))}
            </div>
          )}
        </Seccion>
      )}

      {deteccion !== null && (
        <Seccion icono={<ScanEyeIcon className="size-3.5" />} titulo="Detección visual">
          <p className="mb-2 text-sm font-medium">
            {deteccion.enfermedad ?? "Sin detección"}
            <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
              {ESTADO_DETECCION[deteccion.status ?? ""] ?? String(deteccion.status ?? "")}
            </span>
          </p>
          {(deteccion.confianza ?? 0) > 0 && (
            <Barra etiqueta="confianza" valor={deteccion.confianza ?? 0} />
          )}
          {(deteccion.top_predictions ?? []).length > 0 && (
            <div className="mt-2 space-y-1">
              {(deteccion.top_predictions ?? []).map((prediccion) => (
                <Barra
                  key={prediccion.disease_id ?? prediccion.disease_name}
                  etiqueta={prediccion.disease_name}
                  valor={prediccion.confidence}
                />
              ))}
            </div>
          )}
          {deteccion.severidad != null && deteccion.severidad.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">Severidad: {deteccion.severidad}</p>
          )}
        </Seccion>
      )}

      {bayes !== null &&
        bayes.top_hypothesis !== null &&
        Object.keys(bayes.hypotheses).length > 0 && (
          <Seccion icono={<ScaleIcon className="size-3.5" />} titulo="Decisión bayesiana">
            <div className="space-y-1">
              {Object.entries(bayes.hypotheses).map(([hipotesis, probabilidad]) => (
                <Barra key={hipotesis} etiqueta={hipotesis} valor={probabilidad} />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Confianza {Math.round(bayes.confidence * 100)}% · umbral de cierre 75%
            </p>
          </Seccion>
        )}

      {decision !== null && (
        <Seccion icono={<SparklesIcon className="size-3.5" />} titulo="Diagnóstico final">
          <p className="text-sm font-medium">{decision.top_hypothesis}</p>
          <Barra etiqueta="confianza" valor={decision.confidence} />
        </Seccion>
      )}

      {reglas.length > 0 && (
        <Seccion icono={<GitBranchIcon className="size-3.5" />} titulo="Regla aplicada">
          <ul className="space-y-1 text-xs">
            {reglas.map((regla) => (
              <li key={regla.id}>
                <span className="font-medium">{regla.name}</span>
                <span className="text-muted-foreground"> — {regla.explanation}</span>
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      {context.knowledge?.found === true && context.knowledge.path !== undefined && (
        <Seccion icono={<NetworkIcon className="size-3.5" />} titulo="Búsqueda en el grafo">
          <p className="text-xs text-muted-foreground">
            {(context.knowledge.algorithm ?? "astar").toUpperCase()} · costo{" "}
            {context.knowledge.cost ?? "—"}
          </p>
          <p className="mt-1 text-xs">{(context.knowledge.path ?? []).join(" → ")}</p>
        </Seccion>
      )}
    </div>
  );
}
