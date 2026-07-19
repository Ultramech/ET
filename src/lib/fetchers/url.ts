import { extractText, getDocumentProxy } from "unpdf";

// ---------------------------------------------------------------------------
// Real document fetcher. Pulls a public URL and extracts clean text from PDF
// or HTML. This is the front of the "universal ingestion" pipeline — the same
// path a scanned upload or an email would travel. Hardened with timeouts,
// size caps and content-type detection so a bad URL never hangs a request.
// ---------------------------------------------------------------------------

const MAX_BYTES = 40 * 1024 * 1024; // 40 MB safety cap
const UA = "Mozilla/5.0 (compatible; SutradharBot/1.0; +industrial-knowledge)";

export interface FetchedDoc {
  url: string;
  title: string;
  text: string;
  contentType: string;
  pages?: number;
  bytes: number;
}

export class FetchError extends Error {}

export async function fetchAndExtract(
  url: string,
  opts: { timeoutMs?: number } = {}
): Promise<FetchedDoc> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new FetchError("Invalid URL");
  }
  if (!/^https?:$/.test(parsed.protocol)) throw new FetchError("Only http(s) URLs allowed");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30000);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "*/*" },
      signal: controller.signal,
      redirect: "follow",
    });
  } catch (e) {
    clearTimeout(timer);
    throw new FetchError(`Network error: ${(e as Error).message}`);
  }
  clearTimeout(timer);

  if (!res.ok) throw new FetchError(`HTTP ${res.status} for ${url}`);

  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) throw new FetchError("Document exceeds size cap");

  const isPdf =
    contentType.includes("pdf") ||
    parsed.pathname.toLowerCase().endsWith(".pdf") ||
    (buf.length > 4 && buf[0] === 0x25 && buf[1] === 0x50); // %P

  if (isPdf) {
    const pdf = await getDocumentProxy(buf);
    const { text, totalPages } = await extractText(pdf, { mergePages: true });
    const clean = normalize(text);
    if (clean.length < 40) throw new FetchError("PDF produced no extractable text (likely scanned — needs OCR)");
    return {
      url,
      title: titleFromContent(clean) || titleFromUrl(parsed),
      text: clean,
      contentType: "application/pdf",
      pages: totalPages,
      bytes: buf.byteLength,
    };
  }

  // HTML / plain text
  const raw = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  if (contentType.includes("html") || /^\s*<!doctype html|<html/i.test(raw)) {
    const { title, text } = htmlToText(raw);
    const clean = normalize(text);
    if (clean.length < 40) throw new FetchError("Page produced no extractable text");
    return {
      url,
      title: title || titleFromUrl(parsed),
      text: clean,
      contentType: "text/html",
      bytes: buf.byteLength,
    };
  }

  // fallback: treat as plain text
  return {
    url,
    title: titleFromUrl(parsed),
    text: normalize(raw),
    contentType: contentType || "text/plain",
    bytes: buf.byteLength,
  };
}

function htmlToText(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1]).trim() : "";
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    // keep paragraph/heading breaks
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return { title, text: decodeEntities(body) };
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function normalize(s: string): string {
  return s
    .replace(/\r/g, "")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ *\n */g, "\n")
    .trim();
}

/** Derive a human title from the first meaningful line of extracted text. */
function titleFromContent(text: string): string | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length >= 4 && l.length <= 120);
  for (const l of lines.slice(0, 8)) {
    // skip page headers, pure numbers, ALL-CAPS boilerplate fragments
    if (/^\d+$/.test(l)) continue;
    if (/^(page|figure|table|report no)/i.test(l)) continue;
    const letters = l.replace(/[^a-z]/gi, "").length;
    if (letters < 4) continue;
    // collapse letter-spaced titles like "F I N A L  R E P O R T"
    const collapsed = l.replace(/\b([A-Za-z])(\s)(?=[A-Za-z]\b)/g, "$1");
    return collapsed.replace(/\s+/g, " ").trim();
  }
  return null;
}

function titleFromUrl(u: URL): string {
  const last = u.pathname.split("/").filter(Boolean).pop() || u.hostname;
  return decodeURIComponent(last).replace(/[-_]+/g, " ").replace(/\.\w+$/, "").trim() || u.hostname;
}
