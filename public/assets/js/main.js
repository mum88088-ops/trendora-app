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
            `<li><a href="/?cat=${encodeURIComponent(c.name)}"><span class="cat-ico">${c.icon || "📌"}</span> ${escapeHtml(c.name)}</a></li>`
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
                    `<button class="filter-btn" data-cat="${escapeAttr(c.name)}"><span class="cat-ico">${c.icon || "📌"}</span> ${escapeHtml(c.name)}</button>`
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
