// Keyword retrieval, no language model and no external service.
const tokenize = (s) => String(s || "").toLowerCase().split(/[^\p{L}\p{N}\p{M}]+/u).filter((t) => t.length > 1);
const MIN_SCORE = 3;

// docs: [{ title, tags, text, lang, ... }]. Returns the top `limit` docs above MIN_SCORE (title x2, tags x3, text x1).
function rank(question, docs, limit = 2) {
  const q = new Set(tokenize(question));
  if (!q.size) return [];
  const scored = docs.map((d) => {
    let score = 0;
    for (const t of new Set(tokenize(d.title))) if (q.has(t)) score += 2;
    for (const t of new Set((d.tags || []).flatMap(tokenize))) if (q.has(t)) score += 3;
    for (const t of new Set(tokenize(d.text))) if (q.has(t)) score += 1;
    return { d, score };
  }).filter((x) => x.score >= MIN_SCORE).sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.d);
}

// Prefers documents in the asked language, falls back to any language.
function retrieve(question, docs, lang = "en", limit = 2) {
  const same = rank(question, docs.filter((d) => d.lang === lang), limit);
  return same.length ? same : rank(question, docs, limit);
}
module.exports = { tokenize, rank, retrieve, MIN_SCORE };
