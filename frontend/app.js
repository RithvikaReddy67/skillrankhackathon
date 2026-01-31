const API = "http://127.0.0.1:8001";

let lastQuery = "";

function el(id) {
  return document.getElementById(id);
}

function showHome() {
  el("home").classList.remove("hidden");
  el("results").classList.add("hidden");
}

function showResults() {
  el("home").classList.add("hidden");
  el("results").classList.remove("hidden");
}

async function loadStatus() {
  try {
    const r = await fetch(`${API}/status`);
    const d = await r.json();
    let msg = d.message || `Indexed ${d.indexed_count?.toLocaleString() || "—"} products`;
    if (d.llm_available) msg += " • LLM on";
    el("status").textContent = msg;
    const ph = el("query");
    if (ph) ph.placeholder = `Search ${(d.indexed_count || 34000).toLocaleString()} products...`;
  } catch (e) {
    const s = el("status");
    if (s) s.textContent = "Backend not running";
  }
}

async function loadSuggestions() {
  try {
    const r = await fetch(`${API}/suggest`);
    const d = await r.json();
    const list = d.suggestions || [];
    const container = el("suggestions");
    if (!container) return;
    container.innerHTML = list
      .map((s) => `<button type="button" data-query="${s.replace(/"/g, "&quot;")}">${escapeHtml(s)}</button>`)
      .join("");
    container.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        el("query").value = btn.dataset.query;
        runSearch(el("query").value);
      });
    });
  } catch (_) {
    const c = el("suggestions");
    if (c) c.innerHTML = "";
  }
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function runSearch(q) {
  if (!q || !q.trim()) return;
  lastQuery = q.trim();
  el("queryResults").value = lastQuery;
  showResults();
  const minRating = parseFloat(el("filterRating")?.value || 0);
  const priceMin = el("filterPriceMin")?.value ? parseInt(el("filterPriceMin").value, 10) : null;
  const priceMax = el("filterPriceMax")?.value ? parseInt(el("filterPriceMax").value, 10) : null;

  const params = new URLSearchParams({ q: lastQuery, min_rating: minRating });
  if (priceMin != null && !isNaN(priceMin)) params.set("price_min", priceMin);
  if (priceMax != null && !isNaN(priceMax)) params.set("price_max", priceMax);

  const start = performance.now();
  fetch(`${API}/search?${params}`)
    .then((res) => res.json())
    .then((data) => {
      const ms = Math.round(performance.now() - start);
      renderQueryDisplay(lastQuery);
      renderUnderstanding(data.query_understanding || {});
      const latencyEl = el("latency");
      if (latencyEl) latencyEl.textContent = `Results in ${ms}ms`;
      const listEl = el("resultsList");
      if (listEl) {
        if (data.results?.length) {
          listEl.innerHTML = renderResults(data.results);
        } else {
          listEl.innerHTML = '<p class="loading">No results. Try different filters or query.</p>';
        }
      }
    })
    .catch((err) => {
      const listEl = el("resultsList");
      if (listEl) listEl.innerHTML = `<p class="error">Search failed: ${escapeHtml(err.message)}</p>`;
      const latencyEl = el("latency");
      if (latencyEl) latencyEl.textContent = "";
    });
}

function renderQueryDisplay(query) {
  const elm = el("queryDisplay");
  if (elm) elm.innerHTML = `<strong>Query:</strong> ${escapeHtml(query)}`;
}

function renderUnderstanding(u) {
  const lines = [];
  if (u.summary && u.llm_used) lines.push(escapeHtml(u.summary));
  if (u.budget != null) lines.push(`Budget: ₹${Number(u.budget).toLocaleString()}`);
  if (u.use_case && u.use_case !== "general use") {
    let useCase = u.use_case;
    if (useCase === "video editing") useCase += " (needs GPU, RAM)";
    lines.push(`Use case: ${escapeHtml(useCase)}`);
  }
  if (u.price_conscious) lines.push("Price-conscious buyer");
  const container = el("understanding");
  if (!container) return;
  if (u.llm_error) {
    container.innerHTML =
      "<h3>System understands</h3><p class=\"llm-error\">" + escapeHtml(u.llm_error) + "</p><ul>" +
      (lines.length ? lines.map((l) => "<li>" + l + "</li>").join("") : "<li>General product search</li>") + "</ul>";
    return;
  }
  if (lines.length === 0) {
    container.innerHTML = "<h3>System understands</h3><ul><li>General product search</li></ul>";
    return;
  }
  container.innerHTML =
    "<h3>System understands</h3><ul>" + lines.map((l) => "<li>" + l + "</li>").join("") + "</ul>";
}

function renderResults(results) {
  return results
    .map(
      (p, i) => `
    <article class="card">
      <h3>${i + 1}. ${escapeHtml(p.name)}</h3>
      <div class="meta">
        <span>Relevance: ${p.relevance}%</span>
        <span>Price: ₹${Number(p.price).toLocaleString()}</span>
        <span>Brand: ${escapeHtml(p.brand || "")}</span>
        <span>Rating: ${p.rating}/5</span>
      </div>
      <p class="why"><strong>Why matched:</strong> ${escapeHtml(p.why || "")}</p>
      <ul class="match-factors">${(p.match_factors || []).map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>
    </article>
  `
    )
    .join("");
}

function init() {
  loadStatus();

  const qInput = el("query");
  const qResults = el("queryResults");
  if (qInput) {
    qInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") runSearch(qInput.value);
    });
  }
  el("btnSearch")?.addEventListener("click", () => runSearch(qInput?.value));

  if (qResults) {
    qResults.addEventListener("keydown", (e) => {
      if (e.key === "Enter") runSearch(qResults.value);
    });
  }
  el("btnSearchResults")?.addEventListener("click", () => runSearch(qResults?.value));

  el("btnApplyFilters")?.addEventListener("click", () => {
    const q = qResults?.value || lastQuery;
    if (q) runSearch(q);
  });

  loadSuggestions();
}

init();
