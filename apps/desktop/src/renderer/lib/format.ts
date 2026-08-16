import { DateTime } from "effect";
import * as m from "@cafebot/i18n";

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
  new Intl.DateTimeFormat(m.getLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(DateTime.toDate(utc));

export const severityLabel = (severity: string): string => {
  switch (severity) {
    case "none":
      return m.severityNone();
    case "low":
      return m.severityLow();
    case "medium":
      return m.severityMedium();
    case "high":
      return m.severityHigh();
    default:
      return m.severityNone();
  }
};
