/* ===== Trendora — Homepage logic ===== */

/* أقسام افتراضية تُستبدل بإعدادات الموقع من /api/settings */
let CATEGORIES = [
    { name: "آخر الأخبار", icon: "📰" },
    { name: "التعليم", icon: "🎓" },
    { name: "المعاشات", icon: "👴" },
    { name: "المرتبات والأجور", icon: "💰" },
];
let HOMEPAGE_COUNT = 4;
let SITE_ADS = { clientId: "", inArticleCode: "" };

document.addEventListener("DOMContentLoaded", async () => {
    await loadSiteSettings();
    populateCategoryMenus();
    populateFilters();
    renderTopAd();
    initNav();
    initContentModals();
    initContactForm();
    initInstantNav();
    initSpotlight();
    setYear();

    const grid = document.getElementById("articleGrid");
    if (!grid) return;

    const params = new URLSearchParams(location.search);
    let currentCat = params.get("cat") || "all";
    let currentQuery = "";

    bindFilterButtons();
    function bindFilterButtons() {
        document.querySelectorAll(".filter-btn").forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.cat === currentCat);
            btn.addEventListener("click", () => {
                currentCat = btn.dataset.cat;
                document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
                loadArticles(currentCat, currentQuery);
            });
        });
    }

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

/* ===== أيقونات الأقسام الاحترافية (SVG متجهي يتكيّف مع لون النص) ===== */
const _svg = (paths, extra = "") =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${extra}${paths}</svg>`;

const CATEGORY_ICONS = {
    "آخر الأخبار": _svg(`<path d="M19 20H6a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v13a2 2 0 0 0 2-2V9"/><path d="M8 8h6M8 12h6M8 16h4"/>`),
    "التعليم": _svg(`<path d="M22 9 12 5 2 9l10 4 10-4Z"/><path d="M6 11v5c0 1.2 2.7 3 6 3s6-1.8 6-3v-5"/><path d="M22 9v5"/>`),
    "المعاشات": _svg(`<path d="M12 3 5 6v5c0 4 3 7 7 8 4-1 7-4 7-8V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>`),
    "المرتبات والأجور": _svg(`<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 9v6M17.5 9v6"/>`),
    "الوظائف والتوظيف": _svg(`<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7"/><path d="M3 12.5h18"/>`),
    "الاقتصاد والأسواق": _svg(`<path d="M3 17l5-5 4 4 8-8"/><path d="M15 8h5v5"/>`),
    "أسعار الذهب والعملات": _svg(`<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>`),
    "الخدمات الحكومية": _svg(`<path d="M3 21h18"/><path d="M5 21V10M9.5 21V10M14.5 21V10M19 21V10"/><path d="M12 3 3.5 8h17L12 3Z"/>`),
    "الصحة": _svg(`<path d="M20.8 8.6a4.7 4.7 0 0 0-8.8-2.1 4.7 4.7 0 0 0-8.8 2.1c0 4.3 8.8 10.2 8.8 10.2s8.8-5.9 8.8-10.2Z"/><path d="M7 12h2l1.4-3 2 5L14 12h3"/>`),
    "التقنية": _svg(`<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>`),
    "الرياضة": _svg(`<path d="M8 4h8v3.5a4 4 0 0 1-8 0V4Z"/><path d="M8 5.5H5.2v1A3 3 0 0 0 8 9.4M16 5.5h2.8v1a3 3 0 0 1-2.8 2.9"/><path d="M12 11.5V16M9 20h6M10 16.5h4"/>`),
    "الفن والمشاهير": _svg(`<path d="M12 3.5l2.6 5.2 5.8.9-4.2 4 1 5.7L12 16.7 6.8 19.3l1-5.7-4.2-4 5.8-.9L12 3.5Z"/>`),
    "السيارات": _svg(`<path d="M3 14l1.6-5.1A2 2 0 0 1 6.5 7.5h11a2 2 0 0 1 1.9 1.4L21 14v3a1 1 0 0 1-1 1h-1.5M5.5 18H4a1 1 0 0 1-1-1v-3"/><path d="M3 14h18"/><circle cx="7.5" cy="18" r="1.6"/><circle cx="16.5" cy="18" r="1.6"/>`),
    "الطقس": _svg(`<circle cx="8" cy="7" r="3"/><path d="M8 1.5v1.6M3 7h-1.4M14.4 7H13M4.1 3.1l1 1M11.9 3.1l-1 1"/><path d="M17.5 13.6a3.3 3.3 0 0 0-6.5-.8A3 3 0 1 0 10.5 19H17a2.7 2.7 0 0 0 .5-5.4Z"/>`),
    "أسلوب حياة": _svg(`<path d="M4 9h12v4.5A4.5 4.5 0 0 1 11.5 18h-3A4.5 4.5 0 0 1 4 13.5V9Z"/><path d="M16 10h2.2a2.3 2.3 0 0 1 0 4.6H16"/><path d="M7 3.5v2M10 3.5v2M13 3.5v2M4 21h13"/>`),
    "عام": _svg(`<circle cx="12" cy="12" r="9"/><path d="M3.5 12h17M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18"/>`),
};
const DEFAULT_ICON = _svg(`<circle cx="12" cy="12" r="9"/><path d="M9 12h6M12 9v6"/>`);

function catIcon(name) {
    return CATEGORY_ICONS[name] || DEFAULT_ICON;
}

/* ===== الشريط الجانبي «الأبرز الآن»: يعرض مقالات مختارة ويبدّلها كل 20 ثانية
   ليرى الزائر تشكيلة واسعة من المقالات ويمنح الموقع طابعاً احترافياً ===== */
const SPOTLIGHT_VISIBLE = 5;
const SPOTLIGHT_INTERVAL = 20000;

async function initSpotlight() {
    const list = document.getElementById("spotlightList");
    if (!list) return;
    let articles = [];
    try {
        const res = await fetch("/api/articles");
        const data = await res.json();
        articles = data.articles || [];
    } catch {
        document.getElementById("homeAside")?.remove();
        return;
    }
    if (!articles.length) {
        document.getElementById("homeAside")?.remove();
        return;
    }

    let start = 0;
    const render = () => {
        const items = [];
        const n = Math.min(SPOTLIGHT_VISIBLE, articles.length);
        for (let i = 0; i < n; i++) items.push(articles[(start + i) % articles.length]);
        list.classList.add("is-fading");
        setTimeout(() => {
            list.innerHTML = items.map(spotlightItem).join("");
            list.classList.remove("is-fading");
            restartSpotProgress();
        }, 280);
    };

    render();
    if (articles.length > SPOTLIGHT_VISIBLE) {
        setInterval(() => {
            start = (start + SPOTLIGHT_VISIBLE) % articles.length;
            render();
        }, SPOTLIGHT_INTERVAL);
    }
}

function spotlightItem(a, i) {
    const thumb = a.image
        ? `<span class="spot-thumb" style="background-image:url('${escapeAttr(a.image)}')"></span>`
        : `<span class="spot-thumb placeholder"></span>`;
    return `
    <a class="spot-item" href="/article/${encodeURIComponent(a.slug)}">
        <span class="spot-rank">${i + 1}</span>
        ${thumb}
        <span class="spot-info">
            <span class="spot-cat"><span class="cat-ico">${catIcon(a.category)}</span> ${escapeHtml(a.category)}</span>
            <span class="spot-title">${escapeHtml(a.title)}</span>
            <span class="spot-date">${formatDate(a.createdAt)}</span>
        </span>
    </a>`;
}

function restartSpotProgress() {
    const bar = document.querySelector(".spot-progress i");
    if (!bar) return;
    bar.style.animation = "none";
    void bar.offsetWidth; // إعادة تشغيل الرسم المتحرك
    bar.style.animation = "";
}

/* ===== shared helpers ===== */

/* يجلب أقسام الموقع من الخادم (مع التراجع للأقسام الافتراضية عند الفشل)
   مع تخزين مؤقت في sessionStorage لتسريع التنقّل بين الصفحات */
async function loadSiteSettings() {
    try {
        const data = await getSettingsCached();
        if (Array.isArray(data.categories) && data.categories.length) {
            CATEGORIES = data.categories;
        }
        if (data.homepageCount) HOMEPAGE_COUNT = data.homepageCount;
        if (data.adsense) SITE_ADS = data.adsense;
    } catch {
        /* يبقى الافتراضي */
    }
}

/* تخزين إعدادات الموقع مؤقتاً (30 دقيقة) لتفادي إعادة الجلب عند كل تنقّل */
const SETTINGS_TTL = 30 * 60 * 1000;
async function getSettingsCached() {
    try {
        const raw = sessionStorage.getItem("pf:settings");
        if (raw) {
            const c = JSON.parse(raw);
            if (c && Date.now() - c.t < SETTINGS_TTL) return c.data;
        }
    } catch { /* ignore */ }
    const res = await fetch("/api/settings");
    const data = await res.json();
    try { sessionStorage.setItem("pf:settings", JSON.stringify({ t: Date.now(), data })); } catch { /* ignore */ }
    return data;
}

/* إعلان علوي في الصفحة الرئيسية */
function renderTopAd() {
    const slot = document.getElementById("topAdSlot");
    if (!slot) return;
    if (SITE_ADS.inArticleCode) {
        slot.innerHTML = `<div class="ad-container ad-leaderboard">${SITE_ADS.inArticleCode}</div>`;
    } else if (SITE_ADS.clientId) {
        slot.innerHTML = `<div class="ad-container ad-leaderboard">
            <ins class="adsbygoogle" style="display:block;width:100%"
                data-ad-client="${SITE_ADS.clientId}"
                data-ad-format="auto" data-full-width-responsive="true"></ins>
        </div>`;
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* ignore */ }
    }
    // بدون إعلان مضبوط: لا نعرض مساحة فارغة في الصفحة الرئيسية
}

/* يملأ كل قوائم "الأقسام" المنسدلة في الصفحات تلقائياً (كل الأقسام) */
function populateCategoryMenus() {
    const menus = document.querySelectorAll(".dropdown-menu");
    if (!menus.length) return;
    const itemsHtml = CATEGORIES.map(
        (c) =>
            `<li><a href="/?cat=${encodeURIComponent(c.name)}"><span class="cat-ico">${catIcon(c.name)}</span> ${escapeHtml(c.name)}</a></li>`
    ).join("");
    menus.forEach((menu) => {
        menu.innerHTML = itemsHtml;
        menu.classList.add("mega-menu");
    });
}

/* يبني أزرار الفلترة في الصفحة الرئيسية: الكل + أول HOMEPAGE_COUNT أقسام فقط */
function populateFilters() {
    const filters = document.getElementById("filters");
    if (!filters) return;
    const shown = CATEGORIES.slice(0, HOMEPAGE_COUNT);
    filters.innerHTML =
        `<button class="filter-btn active" data-cat="all">الكل</button>` +
        shown
            .map(
                (c) =>
                    `<button class="filter-btn" data-cat="${escapeAttr(c.name)}"><span class="cat-ico">${catIcon(c.name)}</span> ${escapeHtml(c.name)}</button>`
            )
            .join("");
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

/* ===== تنقّل فوري وسلس (مثل المواقع الإخبارية الكبرى) =====
   1) Speculation Rules: تُحمّل صفحات المقالات مسبقاً في الخلفية عند تمرير المؤشر
      فوق الرابط (في Chrome/Edge) فتفتح فوراً عند النقر.
   2) كحل بديل للمتصفحات الأخرى: نجلب الصفحة وبيانات المقال مسبقاً عند المرور/اللمس. */
const _prefetched = new Set();

function initInstantNav() {
    const supportsSR = "supports" in HTMLScriptElement && HTMLScriptElement.supports("speculationrules");
    if (supportsSR) addSpeculationRules();
    initHoverPrefetch(supportsSR);
}

function addSpeculationRules() {
    if (document.getElementById("trendora-spec-rules")) return;
    const rules = {
        prerender: [
            {
                source: "document",
                where: {
                    and: [
                        { href_matches: "/*" },
                        { not: { href_matches: "/admin*" } },
                        { not: { selector_matches: ".no-prefetch" } },
                        { not: { selector_matches: "[target=_blank]" } }
                    ]
                },
                eagerness: "moderate"
            }
        ]
    };
    const s = document.createElement("script");
    s.type = "speculationrules";
    s.id = "trendora-spec-rules";
    s.textContent = JSON.stringify(rules);
    document.body.appendChild(s);
}

function initHoverPrefetch(supportsSR) {
    const handler = (e) => {
        const link = e.target.closest("a");
        if (!link) return;
        if (link.target === "_blank" || link.classList.contains("no-prefetch")) return;
        const href = link.getAttribute("href") || "";
        if (!href.startsWith("/article/")) return;
        const slug = decodeURIComponent(href.split("/article/")[1] || "").split(/[?#]/)[0];
        if (slug) prefetchArticleApi(slug);
        if (!supportsSR) prefetchPage(link.href);
    };
    document.addEventListener("mouseover", handler, { passive: true });
    document.addEventListener("touchstart", handler, { passive: true });
}

function prefetchPage(url) {
    if (_prefetched.has(url)) return;
    _prefetched.add(url);
    const l = document.createElement("link");
    l.rel = "prefetch";
    l.href = url;
    document.head.appendChild(l);
}

/* يجلب بيانات المقال مسبقاً ويخزّنها لعرضها فوراً عند فتح المقال */
function prefetchArticleApi(slug) {
    const key = "pf:article:" + slug;
    if (_prefetched.has(key)) return;
    _prefetched.add(key);
    fetch(`/api/articles/${encodeURIComponent(slug)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
            if (data && data.article) {
                try {
                    sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), article: data.article }));
                } catch { /* ignore */ }
            }
        })
        .catch(() => { /* ignore */ });
}

/* نموذج اتصل بنا: يفتح بريد المستخدم بالرسالة جاهزة (بدون خادم بريد) */
function initContactForm() {
    const form = document.getElementById("contactForm");
    if (!form) return;
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("cName")?.value.trim() || "";
        const email = document.getElementById("cEmail")?.value.trim() || "";
        const message = document.getElementById("cMessage")?.value.trim() || "";
        const msgEl = document.getElementById("contactMsg");
        const subject = encodeURIComponent(`رسالة من ${name} عبر Trendora`);
        const body = encodeURIComponent(`الاسم: ${name}\nالبريد: ${email}\n\n${message}`);
        window.location.href = `mailto:info@trendora1.com?subject=${subject}&body=${body}`;
        if (msgEl) {
            msgEl.textContent = "تم فتح برنامج البريد لإرسال رسالتك. شكراً لتواصلك!";
            msgEl.className = "save-msg ok";
        }
        form.reset();
    });
}

/* ===== Modal popups for content pages (about/contact/privacy/terms) =====
   نُبقي على الصفحات الحقيقية لمحركات البحث وأدسنس، لكن عند توفّر JS نفتحها
   كنافذة منبثقة لتجربة أسرع وأسهل دون مغادرة الصفحة. */
const MODAL_PAGES = ["about.html", "contact.html", "privacy.html", "terms.html"];

// النافذة تُنشأ فقط عند الضغط على رابط، وتُزال تماماً عند الإغلاق
// (تضمن عدم ظهورها أبداً عند فتح الموقع)
let activeModal = null;

function initContentModals() {
    document.addEventListener("click", (e) => {
        const link = e.target.closest("a");
        if (!link) return;
        const href = link.getAttribute("href") || "";
        if (link.target === "_blank" || link.hasAttribute("data-no-modal")) return;
        let url;
        try { url = new URL(href, location.href); } catch { return; }
        if (url.origin !== location.origin) return;
        const file = url.pathname.split("/").pop();
        if (!MODAL_PAGES.includes(file)) return;
        e.preventDefault();
        openModal(url.href, link.textContent.trim());
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeModal();
    });
}

async function openModal(href, title) {
    closeModal(); // أغلق أي نافذة سابقة
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
        <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
            <button class="modal-close" aria-label="إغلاق" type="button">&times;</button>
            <h2 class="modal-title" id="modalTitle"></h2>
            <div class="modal-body"><p class="empty-state">جارٍ التحميل...</p></div>
        </div>`;
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal();
    });
    overlay.querySelector(".modal-close").addEventListener("click", closeModal);
    document.body.appendChild(overlay);
    document.body.classList.add("modal-open");
    activeModal = overlay;

    const body = overlay.querySelector(".modal-body");
    const titleEl = overlay.querySelector(".modal-title");
    titleEl.textContent = title || "";
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

function closeModal() {
    if (activeModal) {
        activeModal.remove();
        activeModal = null;
    }
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
