/* Thanaweya 2026 client search — works without server API */
(function () {
  const DATA_URLS = [
    "https://cdn.jsdelivr.net/gh/mum88088-ops/trendora-app@main/data/thanaweya-2026.tsv.gz",
    "https://raw.githubusercontent.com/mum88088-ops/trendora-app/main/data/thanaweya-2026.tsv.gz",
    "/data/thanaweya-2026.tsv.gz"
  ];
  let mapPromise = null;
  let resultsMap = null;

  function parseDegree(raw) {
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  async function loadMap() {
    if (resultsMap) return resultsMap;
    if (mapPromise) return mapPromise;
    mapPromise = (async () => {
      let lastErr;
      for (const url of DATA_URLS) {
        try {
          const res = await fetch(url, { cache: "force-cache" });
          if (!res.ok) throw new Error("HTTP " + res.status);
          const buf = await res.arrayBuffer();
          let text;
          if (typeof DecompressionStream !== "undefined") {
            const ds = new Response(buf).body.pipeThrough(new DecompressionStream("gzip"));
            text = await new Response(ds).text();
          } else {
            throw new Error("no DecompressionStream");
          }
          const map = new Map();
          for (const line of text.split(/\n/)) {
            if (!line) continue;
            const p = line.split("\t");
            if (p.length < 4) continue;
            const seat = String(p[0] || "").trim();
            if (!seat) continue;
            map.set(seat, { name: p[1] || "", total: parseDegree(p[2]), status: p[3] || "" });
          }
          resultsMap = map;
          return map;
        } catch (e) {
          lastErr = e;
        }
      }
      mapPromise = null;
      throw lastErr || new Error("تعذر تحميل قاعدة النتائج");
    })();
    return mapPromise;
  }

  async function lookupApi(seat) {
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, 4000);
    try {
      const res = await fetch("/api/thanaweya-results/" + encodeURIComponent(seat), {
        signal: controller.signal
      });
      if (!res.ok) throw new Error("api " + res.status);
      const data = await res.json();
      if (!data.result) throw new Error("empty");
      return data.result;
    } finally {
      clearTimeout(timer);
    }
  }

  async function lookupClient(seat) {
    const map = await loadMap();
    const row = map.get(seat);
    if (!row) return null;
    return {
      seating_no: seat,
      arabic_name: row.name,
      total_degree: row.total,
      student_case_desc: row.status,
    };
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const MAX_TOTAL = 320;

  function formatDegree(v) {
    if (v == null || v === "") return "—";
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    return Number.isInteger(n) ? String(n) : String(n);
  }

  function formatPercent(total) {
    const n = Number(total);
    if (!Number.isFinite(n)) return "—";
    const pct = (n / MAX_TOTAL) * 100;
    return pct.toFixed(2).replace(/\.00$/, "") + "%";
  }

  function statusTone(status) {
    const s = String(status || "");
    if (s.includes("ناجح")) return "tone-pass";
    if (s.includes("دور ثان")) return "tone-second";
    if (s.includes("راسب")) return "tone-fail";
    if (s.includes("غياب")) return "tone-absent";
    return "";
  }

  function renderResult(out, r) {
    const statusClass = statusTone(r.student_case_desc);
    const totalLabel = formatDegree(r.total_degree);
    const totalWithMax =
      totalLabel === "—" ? "—" : esc(totalLabel) + ' <small class="thanaweya-max">/ ' + MAX_TOTAL + "</small>";
    out.className = "thanaweya-search-result is-ok";
    out.innerHTML =
      '<div class="thanaweya-card ' + statusClass + '">' +
      '<div class="thanaweya-row"><span>رقم الجلوس</span><strong>' + esc(r.seating_no) + "</strong></div>" +
      '<div class="thanaweya-row"><span>الاسم</span><strong>' + esc(r.arabic_name) + "</strong></div>" +
      '<div class="thanaweya-row"><span>المجموع الكلي</span><strong>' + totalWithMax + "</strong></div>" +
      '<div class="thanaweya-row"><span>النسبة المئوية</span><strong class="thanaweya-percent">' + esc(formatPercent(r.total_degree)) + "</strong></div>" +
      '<div class="thanaweya-row"><span>الحالة</span><strong class="thanaweya-status">' + esc(r.student_case_desc) + "</strong></div>" +
      "</div>";
  }

  async function lookup(seat) {
    try {
      return await lookupApi(seat);
    } catch (_) {
      return await lookupClient(seat);
    }
  }

  function bind(root) {
    const box = (root || document).querySelector("#thanaweya-result-search");
    if (!box) return;
    if (box.dataset.bound === "cdn1") return;

    // Replace form to drop any previous API-only listeners from article.js
    let form = box.querySelector(".thanaweya-search-form");
    if (form) {
      const clone = form.cloneNode(true);
      form.parentNode.replaceChild(clone, form);
      form = clone;
    }
    const input = box.querySelector("#thanaweyaSeatInput, input[name='seat']");
    const out = box.querySelector(".thanaweya-search-result");
    if (!form || !input || !out) return;
    box.dataset.bound = "cdn1";

    loadMap().catch(function () {});

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const seat = String(input.value || "").trim().replace(/\D/g, "");
      if (!/^\d{5,10}$/.test(seat)) {
        out.hidden = false;
        out.className = "thanaweya-search-result is-error";
        out.innerHTML = "<p>يرجى إدخال رقم جلوس صحيح.</p>";
        return;
      }
      out.hidden = false;
      out.className = "thanaweya-search-result is-loading";
      out.innerHTML = "<p>جاري البحث... قد يستغرق التحميل الأول لحظات.</p>";
      try {
        const r = await lookup(seat);
        if (!r) {
          out.className = "thanaweya-search-result is-error";
          out.innerHTML = "<p>لم يتم العثور على نتيجة لهذا الرقم.</p>";
          return;
        }
        renderResult(out, r);
      } catch (err) {
        out.className = "thanaweya-search-result is-error";
        out.innerHTML = "<p>تعذر تحميل نتائج البحث حالياً. حاول مرة أخرى.</p>";
      }
    });
  }

  function boot() {
    bind(document);
  }

  window.__thanaweyaBind = bind;
  window.initThanaweyaSearch = bind;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  const obs = new MutationObserver(function () { bind(document); });
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
