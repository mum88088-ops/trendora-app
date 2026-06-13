/* ===== Trendora Admin logic ===== */

const $ = (id) => document.getElementById(id);

/** fetch مع إرسال كوكيز الجلسة (ضروري لتسجيل الدخول على HTTPS) */
function api(url, options = {}) {
  return fetch(url, { credentials: "same-origin", ...options });
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const me = await api("/api/me").then((r) => r.json()).catch(() => ({}));
    if (me.isAdmin) showApp();
    else showLogin();

    $("loginForm")?.addEventListener("submit", handleLogin);
    $("logoutBtn")?.addEventListener("click", handleLogout);

    document.querySelectorAll(".tab-btn").forEach((b) =>
      b.addEventListener("click", () => switchView(b.dataset.view, b))
    );
    $("newArticleTab")?.addEventListener("click", () => resetEditor());

    $("articleForm")?.addEventListener("submit", saveArticle);
    $("cancelEditBtn")?.addEventListener("click", () => switchTo("list"));
    $("revertBtn")?.addEventListener("click", revertEdit);

    $("uploadImageBtn")?.addEventListener("click", () => $("fImageFile")?.click());
    $("fImageFile")?.addEventListener("change", uploadImage);
    $("removeImageBtn")?.addEventListener("click", () => setImage(""));
    $("fImageUrl")?.addEventListener("input", (e) => setImage(e.target.value.trim()));

    document.querySelectorAll(".editor-toolbar button").forEach((b) =>
      b.addEventListener("click", () => insertSnippet(b.dataset.tag))
    );

    $("generateBtn")?.addEventListener("click", generateAI);
    $("useAiBtn")?.addEventListener("click", useAiResult);
    $("genImageBtn")?.addEventListener("click", generateImage);

    $("addCategoryForm")?.addEventListener("submit", addCategoryRow);
    $("saveCategoriesBtn")?.addEventListener("click", saveCategories);
    $("saveAdsBtn")?.addEventListener("click", saveAds);
    $("passwordForm")?.addEventListener("submit", changePassword);
  } catch (err) {
    console.error("Admin init error:", err);
    const errEl = $("loginError");
    if (errEl) errEl.textContent = "خطأ في تحميل لوحة التحكم. أعد تحميل الصفحة.";
  }
});

/* ---------- auth ---------- */
async function handleLogin(e) {
    e.preventDefault();
    const errEl = $("loginError");
    const btn = $("loginForm")?.querySelector('button[type="submit"]');
    if (errEl) errEl.textContent = "";
    if (btn) { btn.disabled = true; btn.textContent = "جارٍ الدخول..."; }

    try {
        const password = $("passwordInput").value;
        const res = await api("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
        });
        if (res.ok) {
            showApp();
        } else {
            const data = await res.json().catch(() => ({}));
            if (errEl) errEl.textContent = data.error || "كلمة المرور غير صحيحة";
        }
    } catch (err) {
        console.error(err);
        if (errEl) errEl.textContent = "تعذّر الاتصال بالخادم. أعد المحاولة.";
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = "دخول"; }
    }
}
async function handleLogout() {
    await api("/api/logout", { method: "POST" });
    showLogin();
}
function showLogin() {
    $("loginScreen").hidden = false;
    $("adminApp").hidden = true;
}
function showApp() {
    $("loginScreen").hidden = true;
    $("adminApp").hidden = false;
    loadArticles();
    loadAiProviders();
    loadSettings();
}

/* ---------- settings (categories / ads / password) ---------- */
let siteSettings = { categories: [], homepageCount: 4, adsense: {} };

async function loadSettings() {
    try {
        const res = await api("/api/admin/settings");
        if (res.status === 401) return handleUnauthorized();
        siteSettings = await res.json();
        fillCategoryDatalist();
    } catch {
        /* ignore */
    }
}

/** يملأ قائمة اقتراح التصنيفات في المحرر */
function fillCategoryDatalist() {
    const list = $("catList");
    if (!list) return;
    list.innerHTML = (siteSettings.categories || [])
        .map((c) => `<option value="${escapeHtml(c.name)}"></option>`)
        .join("");
}

function loadCategoriesView() {
    $("homepageCount").value = siteSettings.homepageCount || 4;
    renderCatManageList(siteSettings.categories || []);
    $("catSaveMsg").textContent = "";
}

function renderCatManageList(cats) {
    const ul = $("catManageList");
    ul.innerHTML = cats
        .map(
            (c, i) => `
        <li data-i="${i}">
            <span class="cat-ico">${escapeHtml(c.icon || "📌")}</span>
            <span class="cat-name">${escapeHtml(c.name)}</span>
            <button type="button" class="cat-del" data-i="${i}">حذف</button>
        </li>`
        )
        .join("");
    ul.querySelectorAll(".cat-del").forEach((btn) =>
        btn.addEventListener("click", () => {
            const i = Number(btn.dataset.i);
            siteSettings.categories.splice(i, 1);
            renderCatManageList(siteSettings.categories);
        })
    );
}

function addCategoryRow(e) {
    e.preventDefault();
    const name = $("newCatName").value.trim();
    const icon = $("newCatIcon").value.trim() || "📌";
    if (!name) return;
    if (!siteSettings.categories) siteSettings.categories = [];
    if (siteSettings.categories.some((c) => c.name === name)) {
        $("catSaveMsg").textContent = "هذا القسم موجود بالفعل.";
        return;
    }
    siteSettings.categories.push({ name, icon });
    $("newCatName").value = "";
    $("newCatIcon").value = "";
    renderCatManageList(siteSettings.categories);
    $("catSaveMsg").textContent = "تمت الإضافة — لا تنسَ الحفظ.";
}

async function saveCategories() {
    const msg = $("catSaveMsg");
    msg.textContent = "جارٍ الحفظ...";
    try {
        const res = await api("/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                categories: siteSettings.categories,
                homepageCount: Number($("homepageCount").value) || 4,
            }),
        });
        if (res.status === 401) return handleUnauthorized();
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "فشل الحفظ");
        siteSettings.categories = data.categories;
        siteSettings.homepageCount = data.homepageCount;
        fillCategoryDatalist();
        msg.textContent = "✓ تم حفظ الأقسام بنجاح.";
    } catch (err) {
        msg.textContent = err.message;
    }
}

function loadAdsView() {
    const a = siteSettings.adsense || {};
    $("adsClientId").value = a.clientId || "";
    $("adsVerification").value = a.verification || "";
    $("adsHeadCode").value = a.headCode || "";
    $("adsInArticle").value = a.inArticleCode || "";
    $("adsSaveMsg").textContent = "";
}

async function saveAds() {
    const msg = $("adsSaveMsg");
    msg.textContent = "جارٍ الحفظ...";
    try {
        const res = await api("/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                adsense: {
                    clientId: $("adsClientId").value.trim(),
                    verification: $("adsVerification").value,
                    headCode: $("adsHeadCode").value,
                    inArticleCode: $("adsInArticle").value,
                },
            }),
        });
        if (res.status === 401) return handleUnauthorized();
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "فشل الحفظ");
        siteSettings.adsense = data.adsense;
        msg.textContent = "✓ تم حفظ أكواد الإعلانات. ستظهر على الموقع فوراً.";
    } catch (err) {
        msg.textContent = err.message;
    }
}

async function changePassword(e) {
    e.preventDefault();
    const msg = $("pwSaveMsg");
    const next = $("newPassword").value;
    const confirm = $("confirmPassword").value;
    if (next !== confirm) {
        msg.textContent = "كلمتا المرور غير متطابقتين.";
        return;
    }
    msg.textContent = "جارٍ التغيير...";
    try {
        const res = await api("/api/admin/password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ current: $("currentPassword").value, next }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "فشل التغيير");
        $("passwordForm").reset();
        msg.textContent = "✓ تم تغيير كلمة المرور بنجاح.";
    } catch (err) {
        msg.textContent = err.message;
    }
}

/** يعيد المستخدم لشاشة الدخول إذا انتهت الجلسة (مثلاً بعد إعادة نشر Render) */
function handleUnauthorized() {
    showLogin();
    const errEl = $("loginError");
    if (errEl) errEl.textContent = "انتهت الجلسة. يرجى تسجيل الدخول من جديد.";
}

/* ---------- views ---------- */
function switchView(view, btn) {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    ["list", "editor", "ai", "categories", "ads", "security"].forEach(
        (v) => ($(`view-${v}`).hidden = v !== view)
    );
    if (view === "list") loadArticles();
    if (view === "categories") loadCategoriesView();
    if (view === "ads") loadAdsView();
}
function switchTo(view) {
    const btn = document.querySelector(`.tab-btn[data-view="${view}"]`);
    switchView(view, btn);
}

/* ---------- list ---------- */
async function loadArticles() {
    const tbody = $("articlesTbody");
    tbody.innerHTML = `<tr><td colspan="5" class="loading">جارٍ التحميل...</td></tr>`;
    try {
        const res = await api("/api/admin/articles");
        if (res.status === 401) return handleUnauthorized();
        const { articles } = await res.json();
        renderStats(articles);
        if (!articles.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="loading">لا توجد مقالات بعد. ابدأ بإنشاء مقال جديد.</td></tr>`;
            return;
        }
        tbody.innerHTML = articles.map(rowHtml).join("");
        bindRowActions();
    } catch {
        tbody.innerHTML = `<tr><td colspan="5" class="loading">تعذّر التحميل.</td></tr>`;
    }
}
function renderStats(articles) {
    const pub = articles.filter((a) => a.status === "published").length;
    const draft = articles.filter((a) => a.status === "draft").length;
    const hidden = articles.filter((a) => a.status === "hidden").length;
    $("stats").innerHTML =
        `<span>الكل: ${articles.length}</span>` +
        `<span>منشور: ${pub}</span>` +
        `<span>مسودة: ${draft}</span>` +
        `<span>مخفي: ${hidden}</span>`;
}
function rowHtml(a) {
    const statusLabel = { published: "منشور", draft: "مسودة", hidden: "مخفي" }[a.status] || a.status;
    return `
    <tr data-id="${a.id}">
        <td class="article-title-cell">${escapeHtml(a.title)}</td>
        <td>${escapeHtml(a.category)}</td>
        <td><span class="badge ${a.status}">${statusLabel}</span></td>
        <td>${formatDate(a.createdAt)}</td>
        <td>
            <div class="row-actions">
                <button data-act="edit">تحرير</button>
                ${a.status !== "published" ? `<button data-act="publish">نشر</button>` : ""}
                ${a.status !== "hidden" ? `<button data-act="hide">إخفاء</button>` : ""}
                <button data-act="view">عرض</button>
                <button data-act="delete" class="danger">حذف</button>
            </div>
        </td>
    </tr>`;
}
function bindRowActions() {
    document.querySelectorAll("#articlesTbody tr").forEach((tr) => {
        const id = tr.dataset.id;
        tr.querySelectorAll("button").forEach((btn) => {
            btn.addEventListener("click", () => rowAction(btn.dataset.act, id, tr));
        });
    });
}
async function rowAction(act, id, tr) {
    if (act === "edit") return editArticle(id);
    if (act === "view") {
        const { article } = await api(`/api/admin/articles/${id}`).then((r) => r.json());
        return window.open(`/article/${encodeURIComponent(article.slug)}`, "_blank");
    }
    if (act === "publish") return changeStatus(id, "published");
    if (act === "hide") return changeStatus(id, "hidden");
    if (act === "delete") {
        if (!confirm("هل أنت متأكد من حذف هذا المقال نهائياً؟")) return;
        await api(`/api/admin/articles/${id}`, { method: "DELETE" });
        loadArticles();
    }
}
async function changeStatus(id, status) {
    await api(`/api/admin/articles/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
    });
    loadArticles();
}

/* ---------- editor ---------- */
let editingOriginal = null; // نسخة المقال الأصلية للتراجع عن التعديلات

/** يطبّق بيانات مقال على حقول المحرر */
function fillEditorFields(article) {
    $("articleId").value = article.id || "";
    $("fTitle").value = article.title || "";
    $("fCategory").value = article.category || "";
    $("fAuthor").value = article.author || "";
    $("fExcerpt").value = article.excerpt || "";
    $("fContent").value = article.content || "";
    $("fTags").value = (article.tags || []).join(", ");
    $("fKeywords").value = (article.keywords || []).join(", ");
    $("fStatus").value = article.status || "published";
    setImage(article.image || "");
}

/** يضبط أزرار المحرر حسب الوضع: تحرير أو مقال جديد */
function setEditorMode(isEditing) {
    $("editorTitle").textContent = isEditing ? "تحرير المقال" : "مقال جديد";
    $("saveBtn").textContent = isEditing ? "حفظ التعديل" : "حفظ المقال";
    $("revertBtn").hidden = !isEditing;
}

function resetEditor() {
    editingOriginal = null;
    $("articleForm").reset();
    $("articleId").value = "";
    setImage("");
    $("saveMsg").textContent = "";
    setEditorMode(false);
}
async function editArticle(id) {
    const res = await api(`/api/admin/articles/${id}`);
    if (res.status === 401) return handleUnauthorized();
    const { article } = await res.json();
    if (!article) {
        alert("تعذّر تحميل المقال.");
        return;
    }
    editingOriginal = article;
    fillEditorFields(article);
    setEditorMode(true);
    $("saveMsg").textContent = "";
    $("saveMsg").className = "save-msg";
    switchTo("editor");
}

/** يعيد الحقول إلى آخر نسخة محفوظة (تراجع عن التعديلات غير المحفوظة) */
function revertEdit() {
    if (!editingOriginal) return;
    if (!confirm("التراجع عن كل التعديلات غير المحفوظة والعودة للنسخة الأصلية؟")) return;
    fillEditorFields(editingOriginal);
    const msg = $("saveMsg");
    msg.textContent = "تم التراجع عن التعديلات.";
    msg.className = "save-msg";
}
async function saveArticle(e) {
    e.preventDefault();
    const id = $("articleId").value;
    const payload = {
        title: $("fTitle").value.trim(),
        category: $("fCategory").value.trim() || "عام",
        author: $("fAuthor").value.trim() || "فريق التحرير",
        excerpt: $("fExcerpt").value.trim(),
        content: $("fContent").value.trim(),
        image: $("fImage").value.trim(),
        tags: $("fTags").value.split(",").map((t) => t.trim()).filter(Boolean),
        keywords: $("fKeywords").value.split(",").map((t) => t.trim()).filter(Boolean),
        status: $("fStatus").value,
    };
    if (!payload.title || !payload.content) {
        const msg = $("saveMsg");
        msg.textContent = "العنوان والمحتوى مطلوبان.";
        msg.className = "save-msg err";
        return;
    }
    const msg = $("saveMsg");
    msg.textContent = "جارٍ الحفظ...";
    msg.className = "save-msg";
    try {
        let res = await api(id ? `/api/admin/articles/${id}` : "/api/admin/articles", {
            method: id ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (res.status === 401) return handleUnauthorized();
        // إذا كنا نحرّر مقالاً لم يعد موجوداً، نحفظه كمقال جديد حتى لا يضيع المحتوى
        if (res.status === 404 && id) {
            res = await api("/api/admin/articles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
        }
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "تعذّر الحفظ");
        }
        msg.textContent = "✓ تم الحفظ بنجاح";
        msg.className = "save-msg ok";
        setTimeout(() => switchTo("list"), 700);
    } catch (err) {
        msg.textContent = err.message;
        msg.className = "save-msg err";
    }
}

/* ---------- image ---------- */
function setImage(url) {
    $("fImage").value = url || "";
    const preview = $("imagePreview");
    if (url) {
        preview.style.backgroundImage = `url('${url}')`;
        preview.innerHTML = "";
        $("removeImageBtn").hidden = false;
    } else {
        preview.style.backgroundImage = "";
        preview.innerHTML = "<span>لا توجد صورة</span>";
        $("removeImageBtn").hidden = true;
        $("fImageUrl").value = "";
    }
}
async function uploadImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("image", file);
    $("uploadImageBtn").textContent = "جارٍ الرفع...";
    try {
        const res = await api("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data.url) setImage(data.url);
        else alert(data.error || "فشل الرفع");
    } catch {
        alert("فشل رفع الصورة");
    } finally {
        $("uploadImageBtn").textContent = "رفع صورة";
    }
}

/* ---------- editor snippets ---------- */
function insertSnippet(tag) {
    const ta = $("fContent");
    const snippets = {
        h2: "\n<h2>عنوان فرعي</h2>\n",
        p: "\n<p>اكتب فقرة هنا...</p>\n",
        ul: "\n<ul>\n  <li>عنصر أول</li>\n  <li>عنصر ثانٍ</li>\n</ul>\n",
        blockquote: "\n<blockquote>اقتباس مميز</blockquote>\n",
    };
    const text = snippets[tag] || "";
    const start = ta.selectionStart;
    ta.value = ta.value.slice(0, start) + text + ta.value.slice(ta.selectionEnd);
    ta.focus();
}

/* ---------- AI ---------- */
let lastAi = null;

/** يحمّل أدوات الذكاء المتاحة (OpenAI / Gemini) ويملأ القوائم */
async function loadAiProviders() {
    const select = $("aiProvider");
    const imgSelect = $("aiImageProvider");
    const hint = $("aiProviderHint");
    try {
        const res = await api("/api/admin/ai/providers");
        if (res.status === 401) return handleUnauthorized();
        const { providers, diagnostics } = await res.json();

        const fill = (el) => {
            if (!el) return;
            el.innerHTML = "";
            providers.forEach((p) => {
                const opt = document.createElement("option");
                opt.value = p.id;
                opt.textContent = p.available ? p.name : `${p.name} (غير مفعّل)`;
                opt.disabled = !p.available;
                el.appendChild(opt);
            });
            const firstAvailable = providers.find((p) => p.available);
            if (firstAvailable) el.value = firstAvailable.id;
        };
        fill(select);
        fill(imgSelect);

        const firstAvailable = providers.find((p) => p.available);
        if (hint) {
            if (firstAvailable) {
                hint.textContent = "";
                hint.className = "field-hint";
            } else {
                let msg = "لا توجد أداة مفعّلة. أضف GEMINI_API_KEY (مجاني) أو OPENAI_API_KEY في إعدادات الخادم على Render، ثم أعد النشر (Manual Deploy).";
                if (diagnostics) {
                    const seen = (diagnostics.envKeysSeen || []).join("، ") || "لا شيء";
                    msg += ` — المتغيّرات التي يراها الخادم: [${seen}]. طول مفتاح Gemini: ${diagnostics.geminiKeyLength}، طول مفتاح OpenAI: ${diagnostics.openaiKeyLength}.`;
                }
                hint.textContent = msg;
                hint.className = "field-hint warn";
            }
        }
    } catch {
        if (select) select.innerHTML = `<option value="">تعذّر تحميل الأدوات</option>`;
        if (imgSelect) imgSelect.innerHTML = `<option value="">تعذّر التحميل</option>`;
    }
}

/** توليد صورة للمقال بالذكاء الاصطناعي */
async function generateImage() {
    const promptInput = $("aiImagePrompt");
    const status = $("aiImageStatus");
    const btn = $("genImageBtn");
    const provider = $("aiImageProvider")?.value || "";
    const prompt = (promptInput?.value.trim()) || $("fTitle")?.value.trim();
    if (!prompt) {
        if (status) { status.textContent = "اكتب وصفاً للصورة أو عنواناً للمقال أولاً."; status.className = "ai-status err"; }
        return;
    }
    if (btn) { btn.disabled = true; }
    if (status) { status.innerHTML = 'جارٍ توليد الصورة... قد يستغرق حتى 30 ثانية <span class="spinner"></span>'; status.className = "ai-status"; }
    try {
        const res = await api("/api/admin/ai/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, provider }),
        });
        if (res.status === 401) return handleUnauthorized();
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "فشل توليد الصورة");
        setImage(data.url);
        if (status) { status.textContent = "✓ تم توليد الصورة وتعيينها كصورة للمقال."; status.className = "ai-status ok"; }
    } catch (err) {
        if (status) { status.textContent = err.message; status.className = "ai-status err"; }
    } finally {
        if (btn) { btn.disabled = false; }
    }
}

async function generateAI() {
    const topic = $("aiTopic").value.trim();
    if (!topic) { setAiStatus("يرجى إدخال موضوع المقال.", true); return; }
    const provider = $("aiProvider")?.value || "";
    const btn = $("generateBtn");
    btn.disabled = true;
    setAiStatus('جارٍ توليد المقال... يُفضّل Gemini للسرعة. قد يستغرق 20–60 ثانية <span class="spinner"></span>');
    $("aiResult").hidden = true;
    try {
        const res = await api("/api/admin/ai/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                topic,
                category: $("aiCategory").value.trim(),
                length: $("aiLength").value,
                provider,
            }),
        });
        if (res.status === 401) return handleUnauthorized();
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "فشل التوليد");
        lastAi = data;
        $("aiPreview").innerHTML = `<h2>${escapeHtml(data.title)}</h2>${data.content}`;
        $("aiResult").hidden = false;
        setAiStatus("✓ تم التوليد بنجاح. راجع المقال ثم انقر للتحرير والنشر.");
    } catch (err) {
        setAiStatus(err.message, true);
    } finally {
        btn.disabled = false;
    }
}
function setAiStatus(html, isErr = false) {
    const el = $("aiStatus");
    el.innerHTML = html;
    el.className = isErr ? "ai-status err" : "ai-status";
}
function useAiResult() {
    if (!lastAi) return;
    resetEditor();
    $("fTitle").value = lastAi.title || "";
    $("fExcerpt").value = lastAi.excerpt || "";
    $("fContent").value = lastAi.content || "";
    $("fCategory").value = lastAi.category || $("aiCategory").value.trim() || "عام";
    $("fTags").value = (lastAi.tags || []).join(", ");
    $("fKeywords").value = (lastAi.keywords || lastAi.tags || []).join(", ");
    $("fStatus").value = "draft";
    switchTo("editor");
}

/* ---------- helpers ---------- */
function formatDate(iso) {
    try {
        return new Date(iso).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
    } catch { return ""; }
}
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
