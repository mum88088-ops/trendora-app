/* ===== Trendora — Single article logic ===== */

let siteAds = { clientId: "", inArticleCode: "" };

document.addEventListener("DOMContentLoaded", () => {
    const slug = getSlug();
    if (!slug) {
        showError("لم يتم تحديد المقال.");
        return;
    }
    // نجلب إعدادات الإعلانات بالتوازي مع المقال (دون انتظار) لتسريع العرض
    loadAdsConfig().then(() => activateAds());
    loadArticle(slug);
});

async function loadAdsConfig() {
    try {
        const cached = sessionStorage.getItem("pf:settings");
        if (cached) {
            const c = JSON.parse(cached);
            if (c && Date.now() - c.t < 30 * 60 * 1000) {
                siteAds = c.data.adsense || siteAds;
                return;
            }
        }
    } catch { /* ignore */ }
    try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        siteAds = data.adsense || siteAds;
        try { sessionStorage.setItem("pf:settings", JSON.stringify({ t: Date.now(), data })); } catch { /* ignore */ }
    } catch {
        /* ignore */
    }
}

/* يقرأ المقال المُحمّل مسبقاً (عند المرور على الرابط) لعرضٍ فوري */
function readPrefetchedArticle(slug) {
    try {
        const raw = sessionStorage.getItem("pf:article:" + slug);
        if (!raw) return null;
        const c = JSON.parse(raw);
        if (c && c.article && Date.now() - c.t < 5 * 60 * 1000) return c.article;
    } catch { /* ignore */ }
    return null;
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
    // عرض فوري من النسخة المُحمّلة مسبقاً إن وُجدت
    const cached = readPrefetchedArticle(slug);
    if (cached) {
        renderArticle(cached);
        updateSeo(cached);
        loadSidebars(cached);
    }
    try {
        const res = await fetch(`/api/articles/${encodeURIComponent(slug)}`);
        if (!res.ok) throw new Error("not found");
        const { article } = await res.json();
        if (!cached) {
            renderArticle(article);
            updateSeo(article);
            loadSidebars(article);
        }
    } catch {
        if (!cached) showError("المقال غير موجود أو غير منشور.");
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
    enhanceVideoEmbeds(container);
    initShareBar(a);
    initComments(a.slug || getSlug());
}

/* ===== أزرار المشاركة العائمة ===== */
function initShareBar(a) {
    const old = document.getElementById("shareFab");
    if (old) old.remove();

    const url = `${location.origin}/article/${encodeURIComponent(a.slug || getSlug())}`;
    const title = a.title || document.title;
    const eUrl = encodeURIComponent(url);
    const eTitle = encodeURIComponent(title);

    const fab = document.createElement("div");
    fab.className = "share-fab";
    fab.id = "shareFab";
    fab.innerHTML = `
        <div class="share-options" id="shareOptions">
            <a class="share-btn share-wa" href="https://wa.me/?text=${eTitle}%20${eUrl}" target="_blank" rel="noopener" aria-label="مشاركة على واتساب" title="واتساب">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.59 5.353l-.999 3.648 3.909-1.024zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
            </a>
            <a class="share-btn share-fb" href="https://www.facebook.com/sharer/sharer.php?u=${eUrl}" target="_blank" rel="noopener" aria-label="مشاركة على فيسبوك" title="فيسبوك">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a class="share-btn share-x" href="https://twitter.com/intent/tweet?url=${eUrl}&text=${eTitle}" target="_blank" rel="noopener" aria-label="مشاركة على X" title="X (تويتر)">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a class="share-btn share-tg" href="https://t.me/share/url?url=${eUrl}&text=${eTitle}" target="_blank" rel="noopener" aria-label="مشاركة على تيليجرام" title="تيليجرام">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            </a>
            <button type="button" class="share-btn share-copy" id="shareCopy" aria-label="نسخ الرابط" title="نسخ الرابط">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
            </button>
        </div>
        <button type="button" class="share-toggle" id="shareToggle" aria-label="مشاركة المقال" aria-expanded="false">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
        </button>
    `;
    document.body.appendChild(fab);

    const toggle = fab.querySelector("#shareToggle");
    toggle.addEventListener("click", async () => {
        // على الجوال: استخدم مشاركة النظام إن توفّرت
        if (navigator.share && window.matchMedia("(max-width: 720px)").matches) {
            try {
                await navigator.share({ title, url });
                return;
            } catch { /* المستخدم ألغى؛ نُظهر الأزرار */ }
        }
        const open = fab.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    fab.querySelector("#shareCopy").addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(url);
            flashShareCopy(fab, "تم نسخ الرابط");
        } catch {
            flashShareCopy(fab, url);
        }
    });
}

function flashShareCopy(fab, msg) {
    let tip = fab.querySelector(".share-tip");
    if (!tip) {
        tip = document.createElement("div");
        tip.className = "share-tip";
        fab.appendChild(tip);
    }
    tip.textContent = msg;
    tip.classList.add("show");
    setTimeout(() => tip.classList.remove("show"), 1800);
}

/* ===== التعليقات ===== */
function initComments(slug) {
    const form = document.getElementById("commentForm");
    if (!form) return;
    loadComments(slug);

    if (form.dataset.bound === "1") return;
    form.dataset.bound = "1";
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const nameEl = document.getElementById("commentName");
        const bodyEl = document.getElementById("commentBody");
        const msg = document.getElementById("commentMsg");
        const btn = document.getElementById("commentSubmit");
        const name = nameEl.value.trim();
        const body = bodyEl.value.trim();
        if (name.length < 2 || body.length < 2) {
            setCommentMsg(msg, "يرجى إدخال الاسم والتعليق.", "err");
            return;
        }
        btn.disabled = true;
        setCommentMsg(msg, "جارٍ الإرسال...", "");
        try {
            const res = await fetch(`/api/articles/${encodeURIComponent(slug)}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, body }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "تعذّر إرسال التعليق");
            bodyEl.value = "";
            setCommentMsg(msg, "تم نشر تعليقك. شكراً لمشاركتك!", "ok");
            loadComments(slug);
        } catch (err) {
            setCommentMsg(msg, err.message || "تعذّر إرسال التعليق", "err");
        } finally {
            btn.disabled = false;
        }
    });
}

function setCommentMsg(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = "comment-msg" + (type ? " " + type : "");
}

async function loadComments(slug) {
    const list = document.getElementById("commentsList");
    const countEl = document.getElementById("commentsCount");
    if (!list) return;
    try {
        const res = await fetch(`/api/articles/${encodeURIComponent(slug)}/comments`);
        const data = await res.json();
        const comments = data.comments || [];
        if (countEl) countEl.textContent = comments.length ? `(${comments.length})` : "";
        if (!comments.length) {
            list.innerHTML = `<p class="comments-empty">لا توجد تعليقات بعد. كن أول من يعلّق!</p>`;
            return;
        }
        list.innerHTML = comments
            .map((c) => {
                const initial = escapeHtml((c.name || "؟").trim().charAt(0));
                return `
                <div class="comment-item">
                    <div class="comment-avatar" aria-hidden="true">${initial}</div>
                    <div class="comment-body">
                        <div class="comment-head">
                            <span class="comment-author">${escapeHtml(c.name)}</span>
                            <span class="comment-date">${formatDate(c.createdAt)}</span>
                        </div>
                        <p class="comment-text">${escapeHtml(c.body)}</p>
                    </div>
                </div>`;
            })
            .join("");
    } catch {
        list.innerHTML = `<p class="comments-empty">تعذّر تحميل التعليقات.</p>`;
    }
}

/**
 * يحوّل تضمينات يوتيوب إلى مشغّل احترافي محمي:
 * - نطاق youtube-nocookie + إخفاء العلامة والفيديوهات المقترحة
 * - حجب شريط العنوان وزر المشاركة (طبقة علوية)
 * - منع القائمة بالزر الأيمن (نسخ الرابط/كود التضمين)
 */
function enhanceVideoEmbeds(root) {
    const wraps = (root || document).querySelectorAll(".video-embed");
    wraps.forEach((wrap) => {
        if (wrap.dataset.protected === "1") return;
        const iframe = wrap.querySelector("iframe");
        if (iframe) {
            const src = iframe.getAttribute("src") || "";
            const m = src.match(/(?:embed\/)([\w-]{11})/) || src.match(/[?&]v=([\w-]{11})/);
            if (m) {
                const id = m[1];
                const params = new URLSearchParams({
                    rel: "0",
                    modestbranding: "1",
                    iv_load_policy: "3",
                    playsinline: "1",
                    controls: "1",
                    fs: "1",
                });
                iframe.setAttribute("src", `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`);
                iframe.setAttribute("loading", "lazy");
            }
        }
        // طبقة علوية تحجب العنوان وزر المشاركة/المشاهدة لاحقاً
        if (!wrap.querySelector(".video-guard-top")) {
            const guard = document.createElement("div");
            guard.className = "video-guard-top";
            guard.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); });
            wrap.appendChild(guard);
        }
        // منع نسخ الرابط/كود التضمين عبر الزر الأيمن
        wrap.addEventListener("contextmenu", (e) => e.preventDefault());
        wrap.dataset.protected = "1";
    });
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
