import { DateTime, Duration, Effect } from "effect";
import { ChatMessage, ChatReply } from "@cafebot/sdk";

interface KnowledgeEntry {
  readonly keywords: ReadonlyArray<string>;
  readonly reply: string;
  readonly suggestions: ReadonlyArray<string>;
}

const knowledgeBase: ReadonlyArray<KnowledgeEntry> = [
  {
    keywords: ["hola", "buenos dias", "buenas tardes", "buenas noches", "saludos"],
    reply:
      "¡Hola! Soy Cafebot, tu asistente para la detección de enfermedades del cafeto. Puedes describirme un síntoma, hacer preguntas sobre manejo o subir una foto de la hoja para analizarla.",
    suggestions: ["¿Qué es la roya?", "¿Cómo analizo una foto?", "Consejos de manejo"],
  },
  {
    keywords: ["roya", "oxido", "oxid", "pustula", "polvo amarillo", "naranja"],
    reply:
      "La roya del cafeto (Hemileia vastatrix) se manifiesta como pústulas amarillo-anaranjadas en el envés de la hoja, seguidas de defoliación severa. El control combina podas fitosanitarias, fungicidas a base de cobre o triazoles en época de lluvias y el uso de variedades resistentes como Catimor o Castillo.",
    suggestions: ["¿Cómo prevenir la roya?", "Fungicidas recomendados", "Variedades resistentes"],
  },
  {
    keywords: ["cercospora", "mancha de hierro", "mancha", "circulo"],
    reply:
      "La cercospora, o mancha de hierro, produce manchas circulares de color café con centro grisáceo y borde amarillento. Se favorece por estrés hídrico y sombra excesiva. Recomiendo regular la sombra, mantener una nutrición rica en potasio y boro, y aplicar fungicidas protectantes en focos iniciales.",
    suggestions: ["Nutrición del cafeto", "Manejo de sombra", "Subir foto para análisis"],
  },
  {
    keywords: ["ojo de gallo", "ojo", "mycena", "sombrilla", "gris"],
    reply:
      "El ojo de gallo (Mycena citricolor) aparece como lesiones circulares grises en zonas de mucha sombra y humedad. Reduce la sombra excesiva, mejora la ventilación del cafetal y aplica fungicidas de contacto sobre los focos iniciales.",
    suggestions: ["Regulación de sombra", "Fungicidas de contacto", "Subir foto para análisis"],
  },
  {
    keywords: ["minador", "galeria", "serpiente", "oruga"],
    reply:
      "El minador de la hoja deja galerías serpentinas y traslúcidas dentro del tejido foliar. Se controla favoreciendo enemigos naturales, evitando el estrés de la planta y aplicando insecticidas específicos solo cuando el daño supera el umbral económico.",
    suggestions: ["Control biológico", "Umbrales de daño", "Subir foto para análisis"],
  },
  {
    keywords: ["broca", "perforador", "fruto", "cereza", "grano"],
    reply:
      "La broca del café (Hypothenemus hampei) perfora los frutos y causa daños internos en el grano. El manejo integrado incluye recolección completa y oportuna, control de frutos caídos y aplicación de Beauveria bassiana en fases tempranas de infestación.",
    suggestions: ["Control biológico de broca", "Recolección oportuna", "Subir foto para análisis"],
  },
  {
    keywords: ["riego", "agua", "humedad", "sequia", "lluvia"],
    reply:
      "El café es sensible tanto al déficit como al exceso de agua. Mantén un drenaje adecuado, aplica riego en épocas secas evitando el encharcamiento y monitorea la humedad del suelo para reducir el estrés hídrico, que predispone a cercospora y minador.",
    suggestions: [
      "Enfermedades por estrés hídrico",
      "Consejos de riego",
      "Subir foto para análisis",
    ],
  },
  {
    keywords: ["fertil", "abono", "nutri", "potasio", "nitrogeno", "boro"],
    reply:
      "Una nutrición balanceada fortalece la planta frente a enfermedades. Prioriza análisis de suelo, aplica materia orgánica y asegura un suministro adecuado de potasio y boro, clave para prevenir cercospora y mantener hojas vigorosas.",
    suggestions: [
      "Plan de fertilización",
      "Enfermedades por deficiencias",
      "Subir foto para análisis",
    ],
  },
  {
    keywords: ["foto", "imagen", "analizar", "analisis", "subir", "detectar"],
    reply:
      "¡Claro! Usa el botón de adjuntar (clip) en la parte inferior del chat y selecciona una foto de la hoja del cafeto. En segundos te daré un diagnóstico con nivel de confianza, y la verás guardada en la galería.",
    suggestions: ["¿Qué enfermedades detectas?", "¿Cómo subo varias fotos?", "Consejos de manejo"],
  },
  {
    keywords: ["galeria", "muro", "pinterest", "guardada", "detectada"],
    reply:
      "En la sección Galería (ícono de imágenes en la barra lateral) encontrarás todas las fotos analizadas en un tablero estilo Pinterest, con la enfermedad detectada y el nivel de confianza de cada análisis.",
    suggestions: ["¿Qué enfermedades detectas?", "¿Cómo analizo una foto?", "Consejos de manejo"],
  },
];

const fallbackReply =
  "Entiendo tu consulta sobre el cultivo del café. Puedo ayudarte a identificar enfermedades a partir de fotos de las hojas y responder preguntas sobre manejo integrado (roya, cercospora, ojo de gallo, broca, minador). Cuéntame más detalles o sube una imagen para analizarla.";

const fallbackSuggestions = ["¿Qué es la roya?", "¿Cómo analizo una foto?", "Consejos de manejo"];

const findReply = (content: string): KnowledgeEntry => {
  const normalized = content.toLowerCase();
  for (const entry of knowledgeBase) {
    if (entry.keywords.some((keyword) => normalized.includes(keyword))) {
      return entry;
    }
  }
  return { keywords: [], reply: fallbackReply, suggestions: fallbackSuggestions };
};

export const sendMessage = (content: string): Effect.Effect<ChatReply, never> =>
  Effect.gen(function* () {
    yield* Effect.sleep(Duration.millis(450 + Math.floor(Math.random() * 550)));
    const id = yield* Effect.sync(() => crypto.randomUUID());
    const now = yield* DateTime.now;
    const entry = findReply(content);
    return new ChatReply({
      message: new ChatMessage({
        id,
        role: "assistant",
        content: entry.reply,
        sentAt: now,
      }),
      suggestions: entry.suggestions,
    });
  });
