export function fmtBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(2)} GB`;
}

export function fmtRate(bytesPerSecond) {
  return `${fmtBytes(bytesPerSecond)}/s`;
}

export function fmtPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export function fmtDate(epochSec) {
  if (!epochSec) return "-";
  return new Date(Number(epochSec) * 1000).toLocaleString();
}

export function fileName(filePath) {
  if (!filePath) return "-";
  const parts = String(filePath).split("/").filter(Boolean);
  return parts[parts.length - 1] || filePath;
}

export function parentLabel(filePath) {
  if (!filePath) return "root";
  const parts = String(filePath).split("/").filter(Boolean);
  if (parts.length <= 1) return "root";
  return parts.slice(0, -1).join(" / ");
}

export function parseDiagnostics(output) {
  return String(output || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export function greetingForHour(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Buenos dias";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function dateLabel(date = new Date()) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export async function api(url, options) {
  const controller = new AbortController();
  const timeoutMs = Number(options?.timeoutMs || 20000);
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { cache: "no-store", ...options, signal: controller.signal });
    const text = await response.text();
    let data = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        if (!response.ok) {
          throw new Error(text);
        }
        throw new Error("La API devolvio una respuesta invalida.");
      }
    }
    if (!response.ok) {
      throw new Error(data.error || "API error");
    }
    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("La solicitud tardo demasiado y fue cancelada.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
