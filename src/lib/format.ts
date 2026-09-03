export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

/** "12.4 MB → 3.1 MB (−75%)" for a result card. */
export function formatDelta(before: number, after: number): string {
  const pct = before > 0 ? Math.round((1 - after / before) * 100) : 0;
  const sign = pct > 0 ? "−" : "+";
  return `${formatBytes(before)} → ${formatBytes(after)} (${sign}${Math.abs(pct)}%)`;
}

/** Strips the directory part of a native path (handles both separators). */
export function basename(path: string): string {
  const i = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return i === -1 ? path : path.slice(i + 1);
}

/** "report.pdf" → "report"; "archive.tar.gz" → "archive.tar". */
export function stem(name: string): string {
  const i = name.lastIndexOf(".");
  return i <= 0 ? name : name.slice(0, i);
}

export function extension(name: string): string {
  const i = name.lastIndexOf(".");
  return i <= 0 ? "" : name.slice(i + 1).toLowerCase();
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  return `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`;
}

/** Appends `ext` unless the name already ends with it (case-insensitive). */
export function ensureExtension(name: string, ext: string): string {
  const trimmed = name.trim() || `document.${ext}`;
  return trimmed.toLowerCase().endsWith(`.${ext}`) ? trimmed : `${trimmed}.${ext}`;
}
