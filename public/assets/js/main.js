/* ===== Trendora — Homepage logic ===== */

document.addEventListener("DOMContentLoaded", () => {
    initNav();
    setYear();

    const grid = document.getElementById("articleGrid");
    if (!grid) return;

    const params = new URLSearchParams(location.search);
    let currentCat = params.get("cat") || "all";
    let currentQuery = "";

    // sync active filter button with URL
    document.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.cat === currentCat);
        btn.addEventListener("click", () => {
            currentCat = btn.dataset.cat;
            document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            loadArticles(currentCat, currentQuery);
        });
    });

    const search = document.getElementById("searchInput");
    if (search) {
        let t;
        search.addEventListener("input", (e) => {
            clearTimeout(t);
            currentQuery = e.target.value.trim();
            t = setTimeout(() => loadArticles(currentCat, currentQuery), 250);
        });
    }

    loadArticles(currentCat, currentQuery);
});

async function loadArticles(category = "all", q = "") {
    const grid = document.getElementById("articleGrid");
    grid.innerHTML = `<div class="empty-state">جارٍ تحميل المقالات...</div>`;
    try {
        const url = new URL("/api/articles", location.origin);
        if (category && category !== "all") url.searchParams.set("category", category);
        if (q) url.searchParams.set("q", q);

        const res = await fetch(url);
        const data = await res.json();
        renderArticles(data.articles || []);
    } catch (err) {
        grid.innerHTML = `<div class="empty-state">تعذّر تحميل المقالات. تأكد من تشغيل الخادم.</div>`;
    }
}

function renderArticles(articles) {
    const grid = document.getElementById("articleGrid");
    if (!articles.length) {
        grid.innerHTML = `<div class="empty-state">لا توجد مقالات منشورة بعد.</div>`;
        return;
    }
    grid.innerHTML = articles
        .map((a) => {
            const img = a.image
                ? `<div class="card-image" style="background-image:url('${escapeAttr(a.image)}')"></div>`
                : `<div class="card-image placeholder"></div>`;
            return `
            <article class="article-card">
                <a href="/article/${encodeURIComponent(a.slug)}" class="card-image-link">${img}</a>
                <div class="card-body">
                    <span class="card-category">${escapeHtml(a.category)}</span>
                    <h3 class="card-title"><a href="/article/${encodeURIComponent(a.slug)}">${escapeHtml(a.title)}</a></h3>
                    <p class="card-excerpt">${escapeHtml(a.excerpt || "")}</p>
                    <div class="card-meta">
                        <span>${escapeHtml(a.author || "فريق التحرير")}</span>
                        <span>${formatDate(a.createdAt)}</span>
                    </div>
                </div>
            </article>`;
        })
        .join("");
}

/* ===== shared helpers ===== */
function initNav() {
    const navToggle = document.getElementById("navToggle");
    const mainNav = document.getElementById("mainNav");
    if (navToggle && mainNav) {
        navToggle.addEventListener("click", () => {
            const open = mainNav.classList.toggle("open");
            navToggle.setAttribute("aria-expanded", open ? "true" : "false");
        });
    }
}

function setYear() {
    const el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
}

function formatDate(iso) {
    try {
        return new Date(iso).toLocaleDateString("ar-EG", {
            year: "numeric", month: "long", day: "numeric",
        });
    } catch { return ""; }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function escapeAttr(str) {
    return String(str).replace(/'/g, "%27").replace(/"/g, "%22");
}
