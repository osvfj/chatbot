import { Schema } from "effect";

export const CoffeeDiseaseId = Schema.Literals([
  "healthy",
  "leaf-rust",
  "cercospora",
  "ojo-de-gallo",
  "leaf-miner",
  "berry-borer",
]);

export type CoffeeDiseaseId = Schema.Schema.Type<typeof CoffeeDiseaseId>;

export const DiseaseSeverity = Schema.Literals(["none", "low", "medium", "high"]);

export class DiseaseInfo extends Schema.Class<DiseaseInfo>("DiseaseInfo")({
  id: CoffeeDiseaseId,
  name: Schema.NonEmptyString,
  description: Schema.NonEmptyString,
  advice: Schema.NonEmptyString,
  severity: DiseaseSeverity,
}) {}

export interface DiseaseEntry {
  readonly info: DiseaseInfo;
  readonly keywords: ReadonlyArray<string>;
}

const entry = (
  id: CoffeeDiseaseId,
  name: string,
  description: string,
  advice: string,
  severity: Schema.Schema.Type<typeof DiseaseSeverity>,
  keywords: ReadonlyArray<string>,
): DiseaseEntry => ({
  info: new DiseaseInfo({ id, name, description, advice, severity }),
  keywords,
});

export const healthyDisease: DiseaseEntry = entry(
  "healthy",
  "Hoja sana",
  "La hoja presenta un color verde uniforme, sin manchas, pústulas ni perforaciones visibles.",
  "Continúa con las prácticas de manejo integrado: revisa el cafetal cada 15 días y mantén una nutrición balanceada.",
  "none",
  ["sana", "saludable", "verde", "buena", "normal"],
);

export const leafRust: DiseaseEntry = entry(
  "leaf-rust",
  "Roya del cafeto",
  "Pústulas amarillo-anaranjadas en el envés de la hoja que liberan esporas y provocan defoliación.",
  "Podas fitosanitarias, control químico con fungicidas a base de cobre o triazoles en época de lluvias, y uso de variedades resistentes como Catimor o Castillo.",
  "high",
  ["roya", "oxido", "pustula", "naranja", "amarilla"],
);

export const cercospora: DiseaseEntry = entry(
  "cercospora",
  "Cercospora (mancha de hierro)",
  "Manchas circulares de color café con centro grisáceo y borde amarillento, típicas de la hoja.",
  "Regula la sombra, evita el estrés hídrico y aplica fungicidas protectantes. Mejora la nutrición con potasio y boro.",
  "medium",
  ["cercospora", "mancha", "hierro", "circulo", "cafe"],
);

export const ojoDeGallo: DiseaseEntry = entry(
  "ojo-de-gallo",
  "Ojo de gallo (Mycena citricolor)",
  "Lesiones circulares grises que se asemejan a un ojo, causadas por hongos de zonas de mucha sombra y humedad.",
  "Regula la sombra del cafetal, mejora la ventilación y aplica fungicidas de contacto en focos iniciales.",
  "medium",
  ["ojo de gallo", "ojo", "mycena", "gris", "sombrilla"],
);

export const leafMiner: DiseaseEntry = entry(
  "leaf-miner",
  "Minador de la hoja",
  "Galerías serpentinas y traslúcidas dentro del tejido foliar, causadas por larvas de insectos.",
  "Controla el estrés de la planta, favorece enemigos naturales y usa insecticidas específicos solo cuando el daño supera el umbral económico.",
  "low",
  ["minador", "galeria", "serpiente", "hoja minada"],
);

export const berryBorer: DiseaseEntry = entry(
  "berry-borer",
  "Broca del café",
  "Perforaciones visibles en los frutos, granos perforados con daño interno y caída prematura de cerezas.",
  "Realiza la recolección completa y oportuna, maneja los frutos caídos y aplica control biológico con Beauveria bassiana en fases tempranas.",
  "high",
  ["broca", "perforador", "fruto", "cereza", "granos"],
);

export const coffeeDiseases: readonly [DiseaseEntry, ...Array<DiseaseEntry>] = [
  leafRust,
  cercospora,
  ojoDeGallo,
  leafMiner,
  berryBorer,
];

export const diseaseCatalog: ReadonlyArray<DiseaseEntry> = [healthyDisease, ...coffeeDiseases];
