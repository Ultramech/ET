// Batch-ingests every URL in the manifest through the running app's real
// /api/ingest/url endpoint (fetch -> extract -> ontology extraction -> graph
// -> persist to disk). Concurrency-limited, fault-tolerant, resumable-ish.
//
//   node scripts/ingest-real.mjs [--limit N] [--concurrency C]

import { ALL_URLS } from "./manifest.mjs";

const BASE = process.env.BASE || "http://localhost:3000";
const args = process.argv.slice(2);
const getArg = (f, d) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : d;
};
const LIMIT = Number(getArg("--limit", ALL_URLS.length));
const CONCURRENCY = Number(getArg("--concurrency", 3));
const RETRIES = Number(getArg("--retries", 5));

const urls = ALL_URLS.slice(0, LIMIT);
let done = 0,
  ok = 0,
  fail = 0,
  skip = 0,
  chunks = 0,
  entities = 0;
const failures = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ingest(url) {
  let lastErr = "";
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(`${BASE}/api/ingest/url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(90000),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429 || res.status >= 500 || /HTTP 429|HTTP 5/.test(data.error || "")) {
        // rate limited / transient — exponential backoff with jitter
        lastErr = data.error || `HTTP ${res.status}`;
        await sleep(Math.min(20000, 1500 * 2 ** attempt) + Math.random() * 1500);
        continue;
      }
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      done++;
      if (data.duplicate) {
        skip++;
        return `↺ already ingested · ${(data.document?.title || url).slice(0, 54)}`;
      }
      ok++;
      chunks += data.document?.chunks || 0;
      entities += data.newEntities?.length || 0;
      return `✓ ${(data.document?.type || "?").padEnd(11)} ${(data.document?.title || url).slice(0, 54)} · ${data.document?.chunks || 0} chunks, ${data.newEntities?.length || 0} ent${data.source?.pages ? `, ${data.source.pages}pg` : ""}`;
    } catch (e) {
      lastErr = e.message;
      if (attempt < RETRIES) {
        await sleep(Math.min(20000, 1500 * 2 ** attempt) + Math.random() * 1500);
        continue;
      }
    }
  }
  done++;
  fail++;
  failures.push({ url, error: lastErr });
  return `✗ ${lastErr.slice(0, 38).padEnd(38)} ${url.split("/").pop()}`;
}

async function pool(items, size, worker) {
  const queue = [...items];
  const runners = Array.from({ length: size }, async () => {
    while (queue.length) {
      const item = queue.shift();
      const line = await worker(item);
      console.log(`[${String(done).padStart(3)}/${urls.length}] ${line}`);
    }
  });
  await Promise.all(runners);
}

console.log(`\n🧩 Ingesting ${urls.length} real documents into Sutradhar (concurrency ${CONCURRENCY})`);
console.log(`   target: ${BASE}\n`);
const t0 = Date.now();
await pool(urls, CONCURRENCY, ingest);
const secs = ((Date.now() - t0) / 1000).toFixed(0);

console.log(`\n──────────────────────────────────────────────`);
console.log(`Done in ${secs}s · ✓ ${ok} new · ↺ ${skip} skipped · ✗ ${fail} failed`);
console.log(`Total: ~${chunks} chunks, ~${entities} entity mentions extracted`);
if (failures.length) {
  console.log(`\nFirst failures:`);
  failures.slice(0, 8).forEach((f) => console.log(`  ${f.error} — ${f.url.split("/").pop()}`));
}

// print live corpus stats
try {
  const stats = await (await fetch(`${BASE}/api/stats`)).json();
  console.log(`\n📊 Corpus now: ${stats.documents} documents · ${stats.nodes} graph nodes · ${stats.edges} edges`);
  console.log(`   by type:`, stats.docsByType);
} catch {}
