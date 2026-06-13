/* ===== Trendora — Homepage logic ===== */

/* قائمة الأقسام الموحّدة (تُستخدم في القائمة المنسدلة وأزرار الفلترة) */
const CATEGORIES = [
    { name: "آخر الأخبار", icon: "📰" },
    { name: "التعليم", icon: "🎓" },
    { name: "المعاشات", icon: "👴" },
    { name: "المرتبات والأجور", icon: "💰" },
    { name: "الوظائف والتوظيف", icon: "💼" },
    { name: "الاقتصاد والأسواق", icon: "📈" },
    { name: "أسعار الذهب والعملات", icon: "🪙" },
    { name: "الخدمات الحكومية", icon: "🏛️" },
    { name: "الصحة", icon: "🩺" },
    { name: "التقنية", icon: "💻" },
    { name: "الرياضة", icon: "⚽" },
    { name: "الفن والمشاهير", icon: "🎬" },
    { name: "السيارات", icon: "🚗" },
    { name: "الطقس", icon: "☀️" },
    { name: "أسلوب حياة", icon: "🌿" },
    { name: "عام", icon: "📌" },
];

document.addEventListener("DOMContentLoaded", () => {
    populateCategoryMenus();
    populateFilters();
    initNav();
    initContentModals();
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

/* يملأ كل قوائم "الأقسام" المنسدلة في الصفحات تلقائياً */
function populateCategoryMenus() {
    const menus = document.querySelectorAll(".dropdown-menu");
    if (!menus.length) return;
    const itemsHtml = CATEGORIES.map(
        (c) =>
            `<li><a href="/?cat=${encodeURIComponent(c.name)}"><span class="cat-ico">${c.icon}</span> ${escapeHtml(c.name)}</a></li>`
    ).join("");
    menus.forEach((menu) => {
        menu.innerHTML = itemsHtml;
        menu.classList.add("mega-menu");
    });
}

/* يبني أزرار الفلترة في الصفحة الرئيسية (الكل + الأقسام) */
function populateFilters() {
    const filters = document.getElementById("filters");
    if (!filters) return;
    filters.innerHTML =
        `<button class="filter-btn active" data-cat="all">الكل</button>` +
        CATEGORIES.map(
            (c) =>
                `<button class="filter-btn" data-cat="${escapeAttr(c.name)}"><span class="cat-ico">${c.icon}</span> ${escapeHtml(c.name)}</button>`
        ).join("");
}

function initNav() {
    const navToggle = document.getElementById("navToggle");
    const mainNav = document.getElementById("mainNav");
    if (navToggle && mainNav) {
        navToggle.addEventListener("click", () => {
            const open = mainNav.classList.toggle("open");
            navToggle.setAttribute("aria-expanded", open ? "true" : "false");
        });
    }

    // القوائم المنسدلة (الأقسام)
    const dropdowns = document.querySelectorAll(".has-dropdown");
    dropdowns.forEach((dd) => {
        const toggle = dd.querySelector(".dropdown-toggle");
        if (!toggle) return;
        toggle.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = dd.classList.contains("open");
            dropdowns.forEach((d) => d.classList.remove("open"));
            dd.classList.toggle("open", !isOpen);
            toggle.setAttribute("aria-expanded", !isOpen ? "true" : "false");
        });
    });
    // إغلاق القوائم عند النقر خارجها
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".has-dropdown")) {
            dropdowns.forEach((d) => d.classList.remove("open"));
        }
    });
}

function setYear() {
    const el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
}

/* ===== Modal popups for content pages (about/contact/privacy/terms) =====
   نُبقي على الصفحات الحقيقية لمحركات البحث وأدسنس، لكن عند توفّر JS نفتحها
   كنافذة منبثقة لتجربة أسرع وأسهل دون مغادرة الصفحة. */
const MODAL_PAGES = ["about.html", "contact.html", "privacy.html", "terms.html"];

function initContentModals() {
    const modal = buildModal();
    document.addEventListener("click", (e) => {
        const link = e.target.closest("a");
        if (!link) return;
        const href = link.getAttribute("href") || "";
        // تجاهل الروابط الخارجية أو ذات الأهداف الخاصة
        if (link.target === "_blank" || link.hasAttribute("data-no-modal")) return;
        let url;
        try { url = new URL(href, location.href); } catch { return; }
        if (url.origin !== location.origin) return;
        const file = url.pathname.split("/").pop();
        if (!MODAL_PAGES.includes(file)) return;
        e.preventDefault();
        openModal(modal, url.href, link.textContent.trim());
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeModal(modal);
    });
}

function buildModal() {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.setAttribute("hidden", "");
    overlay.innerHTML = `
        <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
            <button class="modal-close" aria-label="إغلاق">&times;</button>
            <h2 class="modal-title" id="modalTitle"></h2>
            <div class="modal-body"><p class="empty-state">جارٍ التحميل...</p></div>
        </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal(overlay);
    });
    overlay.querySelector(".modal-close").addEventListener("click", () => closeModal(overlay));
    return overlay;
}

async function openModal(overlay, href, title) {
    const body = overlay.querySelector(".modal-body");
    const titleEl = overlay.querySelector(".modal-title");
    titleEl.textContent = title || "";
    body.innerHTML = `<p class="empty-state">جارٍ التحميل...</p>`;
    overlay.removeAttribute("hidden");
    document.body.classList.add("modal-open");
    try {
        const res = await fetch(href);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const content = doc.querySelector(".page-content");
        if (content) {
            const h1 = content.querySelector("h1");
            if (h1) { titleEl.textContent = h1.textContent.trim(); h1.remove(); }
            body.innerHTML = content.innerHTML;
        } else {
            body.innerHTML = `<p class="empty-state">تعذّر تحميل المحتوى. <a href="${href}">فتح الصفحة</a></p>`;
        }
        body.scrollTop = 0;
    } catch {
        body.innerHTML = `<p class="empty-state">تعذّر تحميل المحتوى. <a href="${href}">فتح الصفحة</a></p>`;
    }
}

function closeModal(overlay) {
    overlay.setAttribute("hidden", "");
    document.body.classList.remove("modal-open");
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
