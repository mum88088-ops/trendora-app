/* ===== Trendora — Single article logic ===== */

let siteAds = { clientId: "", inArticleCode: "" };

document.addEventListener("DOMContentLoaded", async () => {
    const slug = getSlug();
    if (!slug) {
        showError("لم يتم تحديد المقال.");
        return;
    }
    await loadAdsConfig();
    loadArticle(slug);
});

async function loadAdsConfig() {
    try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        siteAds = data.adsense || siteAds;
    } catch {
        /* ignore */
    }
}

/** يبني وحدة إعلانية: كود الأدمن المخصّص أو وحدة AdSense تلقائية، أو عنصر نائب */
function adUnit(extraClass) {
    if (siteAds.inArticleCode) {
        return `<div class="ad-container ${extraClass}">${siteAds.inArticleCode}</div>`;
    }
    if (siteAds.clientId) {
        return `<div class="ad-container ${extraClass}">
            <ins class="adsbygoogle" style="display:block;width:100%"
                data-ad-client="${siteAds.clientId}"
                data-ad-format="auto" data-full-width-responsive="true"></ins>
        </div>`;
    }
    return `<div class="ad-container ${extraClass}"><span class="ad-label">مساحة إعلانية</span></div>`;
}

/** يفعّل وحدات AdSense بعد إدراجها في الصفحة */
function activateAds() {
    if (!siteAds.clientId && !siteAds.inArticleCode) return;
    document.querySelectorAll(".adsbygoogle").forEach(() => {
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch {
            /* ignore */
        }
    });
}

function getSlug() {
    // supports /article/:slug  and  /article.html?slug=...  and  ?id=...
    const path = location.pathname.split("/").filter(Boolean);
    if (path[0] === "article" && path[1]) return decodeURIComponent(path[1]);
    const params = new URLSearchParams(location.search);
    return params.get("slug") || params.get("id");
}

async function loadArticle(slug) {
    const container = document.getElementById("articleContainer");
    try {
        const res = await fetch(`/api/articles/${encodeURIComponent(slug)}`);
        if (!res.ok) throw new Error("not found");
        const { article } = await res.json();
        renderArticle(article);
        updateSeo(article);
        loadSidebars(article);
    } catch {
        showError("المقال غير موجود أو غير منشور.");
    }
}

function renderArticle(a) {
    const container = document.getElementById("articleContainer");
    document.getElementById("crumbCat").textContent = a.category || "المقال";

    const image = a.image
        ? `<div class="article-featured-image" style="background-image:url('${a.image}')"></div>`
        : `<div class="article-featured-image placeholder"></div>`;

    const tags = (a.tags || [])
        .map((t) => `<span class="tag">#${escapeHtml(t)}</span>`)
        .join("");

    container.innerHTML = `
        <header class="article-header">
            <span class="card-category">${escapeHtml(a.category)}</span>
            <h1>${escapeHtml(a.title)}</h1>
            <div class="article-meta">
                <span>بقلم ${escapeHtml(a.author || "فريق التحرير")}</span>
                <span>${formatDate(a.createdAt)}</span>
                <span>${a.readingTime || 3} دقائق قراءة</span>
            </div>
        </header>
        ${image}
        <div class="article-content" id="articleBody">${injectAds(a.content || "")}</div>
        <footer class="article-footer">
            <div class="tags">${tags}</div>
        </footer>
        ${adUnit("ad-end")}
    `;
    activateAds();
}

// Insert in-article ad slots between paragraphs (after 2nd and around middle)
function injectAds(html) {
    const adSlot = adUnit("ad-in-article");
    const parts = html.split("</p>");
    if (parts.length < 4) return html;
    const mid = Math.floor(parts.length / 2);
    parts[1] += "</p>" + adSlot;
    parts[mid] += "</p>" + adSlot;
    return parts.join("</p>");
}

function updateSeo(a) {
    const url = `${location.origin}/article/${encodeURIComponent(a.slug)}`;
    document.title = `${a.title} | Trendora`;
    setAttr("metaDescription", "content", a.excerpt || a.title);

    const kw = (a.keywords && a.keywords.length ? a.keywords : a.tags) || [];
    if (kw.length) {
        let meta = document.querySelector('meta[name="keywords"]');
        if (!meta) {
            meta = document.createElement("meta");
            meta.setAttribute("name", "keywords");
            document.head.appendChild(meta);
        }
        meta.setAttribute("content", kw.join(", "));
    }
    setAttr("metaCanonical", "href", url);
    setAttr("ogTitle", "content", a.title);
    setAttr("ogDesc", "content", a.excerpt || a.title);
    setAttr("ogImage", "content", a.image ? location.origin + a.image : location.origin + "/assets/img/logo.svg");

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: a.title,
        description: a.excerpt || "",
        image: a.image ? location.origin + a.image : location.origin + "/assets/img/logo.svg",
        datePublished: a.createdAt,
        dateModified: a.updatedAt || a.createdAt,
        author: { "@type": "Organization", name: a.author || "Trendora" },
        publisher: {
            "@type": "Organization",
            name: "Trendora",
            logo: { "@type": "ImageObject", url: location.origin + "/assets/img/logo.svg" },
        },
        mainEntityOfPage: url,
    };
    const el = document.getElementById("jsonLd");
    if (el) el.textContent = JSON.stringify(jsonLd);
}

// يجلب كل المقالات مرة واحدة ويملأ: المقالات ذات الصلة + الشريط الجانبي
async function loadSidebars(current) {
    let articles = [];
    try {
        const res = await fetch("/api/articles");
        articles = (await res.json()).articles || [];
    } catch {
        articles = [];
    }

    const others = articles.filter((a) => a.slug !== current.slug);
    const sameCat = others.filter((a) => a.category === current.category);
    const byDateDesc = [...others].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    // مقالات ذات صلة (نفس القسم أولاً)
    const related = (sameCat.length ? sameCat : byDateDesc).slice(0, 3);
    renderRelatedGrid(related);

    // الشريط الجانبي
    renderSidebarList("sbNewest", byDateDesc.slice(0, 5));
    renderSidebarList("sbSimilar", (sameCat.length ? sameCat : byDateDesc).slice(0, 5));
    renderSidebarList("sbImportant", pickImportant(others, byDateDesc).slice(0, 5));
}

// "مقالات مهمة" = تنويع حسب الأقسام لإبراز محتوى متنوّع
function pickImportant(others, fallback) {
    const seen = new Set();
    const out = [];
    for (const a of others) {
        if (!seen.has(a.category)) {
            seen.add(a.category);
            out.push(a);
        }
    }
    return out.length ? out : fallback;
}

function renderRelatedGrid(related) {
    const grid = document.getElementById("relatedGrid");
    if (!grid) return;
    if (!related.length) {
        grid.innerHTML = `<div class="empty-state">لا توجد مقالات أخرى.</div>`;
        return;
    }
    grid.innerHTML = related
        .map((a) => {
            const img = a.image
                ? `<div class="card-image" style="background-image:url('${a.image}')"></div>`
                : `<div class="card-image placeholder"></div>`;
            return `
            <article class="article-card">
                <a href="/article/${encodeURIComponent(a.slug)}">${img}</a>
                <div class="card-body">
                    <span class="card-category">${escapeHtml(a.category)}</span>
                    <h3 class="card-title"><a href="/article/${encodeURIComponent(a.slug)}">${escapeHtml(a.title)}</a></h3>
                </div>
            </article>`;
        })
        .join("");
}

function renderSidebarList(id, items) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!items || !items.length) {
        el.innerHTML = `<li class="sb-empty">لا توجد مقالات.</li>`;
        return;
    }
    el.innerHTML = items
        .map((a) => {
            const slug = encodeURIComponent(a.slug);
            const thumbCls = a.image ? "sb-thumb" : "sb-thumb placeholder";
            const thumbStyle = a.image ? ` style="background-image:url('${a.image}')"` : "";
            return `
            <li class="sb-item">
                <a href="/article/${slug}" class="${thumbCls}"${thumbStyle} aria-hidden="true" tabindex="-1"></a>
                <div class="sb-text">
                    <span class="sb-cat">${escapeHtml(a.category || "")}</span>
                    <a href="/article/${slug}">${escapeHtml(a.title)}</a>
                </div>
            </li>`;
        })
        .join("");
}

function showError(msg) {
    const container = document.getElementById("articleContainer");
    container.innerHTML = `<p class="empty-state">${escapeHtml(msg)} <a href="/">العودة للرئيسية</a></p>`;
}

function setAttr(id, attr, value) {
    const el = document.getElementById(id);
    if (el) el.setAttribute(attr, value);
}
