const TIERS = ["S", "A", "B", "C", "D"];
let DATA = { meta: {}, papers: [] };

const $ = (id) => document.getElementById(id);

function authorLine(p) {
  const names = (p.authors || []).join(", ");
  return p.authors_extra ? `${names} +${p.authors_extra}` : names;
}

function card(p) {
  const tags = (p.tags || []).map((t) => `<span class="tag">${t}</span>`).join("");
  return `<article class="card">
    <h3>${esc(p.title)}</h3>
    <div class="authors">${esc(authorLine(p))}</div>
    <div class="meta"><span class="score">${Number(p.score).toFixed(1)}</span> · ${esc(p.cat)} · ${esc(p.date)}</div>
    <div class="tags">${tags}</div>
    <div class="links"><a href="${esc(p.abs)}" target="_blank" rel="noopener">abs</a><a href="${esc(p.pdf)}" target="_blank" rel="noopener">pdf</a></div>
  </article>`;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function filtered() {
  const q = $("q").value.trim().toLowerCase();
  const cat = $("cat").value;
  const tier = $("tier").value;
  const sort = $("sort").value;
  let list = DATA.papers.slice();
  if (cat) list = list.filter((p) => p.cat === cat);
  if (tier) list = list.filter((p) => p.tier === tier);
  if (q) {
    list = list.filter((p) => {
      const hay = `${p.title} ${authorLine(p)} ${p.id} ${p.cat} ${(p.tags || []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }
  list.sort((a, b) => {
    if (sort === "date") return (b.date || "").localeCompare(a.date || "") || (b.score - a.score);
    if (sort === "title") return (a.title || "").localeCompare(b.title || "");
    return (b.score - a.score) || (b.date || "").localeCompare(a.date || "");
  });
  return list;
}

function render() {
  const list = filtered();
  const by = Object.fromEntries(TIERS.map((t) => [t, []]));
  for (const p of list) {
    if (by[p.tier]) by[p.tier].push(p);
  }
  $("board").innerHTML = TIERS.map((t) => {
    const cards = by[t].map(card).join("");
    const n = by[t].length;
    return `<section class="row ${t}">
      <div class="row-label" title="${n} shown">${t}</div>
      <div class="cards">${cards || `<p class="meta" style="padding:.4rem">No ${t} papers in this filter.</p>`}</div>
    </section>`;
  }).join("");
  $("empty").hidden = list.length > 0;
}

function fillCats() {
  const cats = [...new Set(DATA.papers.map((p) => p.cat).filter(Boolean))].sort();
  const sel = $("cat");
  for (const c of cats) {
    const o = document.createElement("option");
    o.value = c; o.textContent = c;
    sel.appendChild(o);
  }
}

function fillStats() {
  const m = DATA.meta || {};
  const full = m.tiers_full || {};
  const shown = m.shown || DATA.papers.length;
  const ranked = m.ranked || 156256;
  const parts = [
    `<span class="pill">ranked <b>${ranked.toLocaleString()}</b></span>`,
    `<span class="pill">shown <b>${shown.toLocaleString()}</b></span>`,
    `<span class="pill">years <b>1990–2026</b></span>`,
  ];
  for (const t of TIERS) {
    if (full[t] != null) parts.push(`<span class="pill ${t}">${t} <b>${full[t].toLocaleString()}</b></span>`);
  }
  $("statbar").innerHTML = parts.join("");
}

async function main() {
  const res = await fetch("data/papers.json");
  const raw = await res.json();
  let stats = {};
  try {
    stats = await (await fetch("data/stats.json")).json();
  } catch (e) {
    stats = {};
  }
  if (Array.isArray(raw)) {
    DATA = {
      papers: raw,
      meta: {
        ranked: stats.total,
        shown: stats.displayed || raw.length,
        tiers_full: stats.count_by_potential_tier || {},
      },
    };
  } else {
    DATA = raw;
  }
  fillCats();
  fillStats();
  render();
  ["q", "cat", "tier", "sort"].forEach((id) => $(id).addEventListener("input", render));
  $("howto").onclick = () => $("modal").showModal();
  $("closeModal").onclick = () => $("modal").close();
}

main().catch((err) => {
  $("board").innerHTML = `<p class="empty">Failed to load papers.json: ${esc(err.message)}</p>`;
});
