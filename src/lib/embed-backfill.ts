import { getStore, persist } from "./store";
import { embedTexts, caps } from "./ai/client";
import { invalidateIndex } from "./rag/retrieve";

// ---------------------------------------------------------------------------
// Backfills embeddings for every chunk that doesn't have one yet, in batches,
// so semantic (vector) retrieval activates over the whole corpus. Idempotent
// and resumable — safe to call repeatedly.
// ---------------------------------------------------------------------------

export async function backfillEmbeddings(
  opts: { seedOnly?: boolean; sliceSize?: number } = {}
): Promise<{ embedded: number; remaining: number; total: number }> {
  const store = getStore();
  if (!caps().embeddings) return { embedded: 0, remaining: 0, total: 0 };

  // collect chunks lacking embeddings. Cap per-document coverage: BM25 already
  // indexes every chunk exactly; vectors add semantic recall on the important
  // early content of each doc, keeping the persisted corpus compact.
  const PER_DOC = 30;
  // Seed (operating-plant) docs first — they carry the demo narrative and fit
  // comfortably in the free-tier embedding quota. Reference docs stay on BM25.
  const docs = opts.seedOnly
    ? store.documents.filter((d) => d.origin === "seed" || !d.origin)
    : [...store.documents].sort((a, b) => (a.origin === "seed" ? -1 : 0) - (b.origin === "seed" ? -1 : 0));

  const pending: { id: string; text: string }[] = [];
  let total = 0;
  for (const doc of docs) {
    doc.chunks.slice(0, PER_DOC).forEach((c) => {
      total++;
      if (!store.embeddings[c.id]) pending.push({ id: c.id, text: c.text });
    });
  }
  if (!pending.length) return { embedded: 0, remaining: 0, total };

  const slice = pending.slice(0, opts.sliceSize ?? 300);
  const vecs = await embedTexts(slice.map((p) => p.text));
  let embedded = 0;
  if (vecs) {
    slice.forEach((p, i) => {
      if (vecs[i]) {
        store.embeddings[p.id] = vecs[i];
        embedded++;
      }
    });
    invalidateIndex();
    persist();
  }
  return { embedded, remaining: pending.length - embedded, total };
}
