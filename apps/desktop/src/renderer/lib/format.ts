import { DateTime } from "effect";
import type { DiseaseInfo } from "@cafebot/sdk";

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;

export const formatTime = (utc: DateTime.Utc): string =>
  new Intl.DateTimeFormat("es", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(DateTime.toDate(utc));

export const severityLabel = (severity: DiseaseInfo["severity"]): string => {
  switch (severity) {
    case "none":
      return "Sin riesgo";
    case "low":
      return "Severidad baja";
    case "medium":
      return "Severidad media";
    case "high":
      return "Severidad alta";
  }
};
