/** أدوات مشتركة لسكربتات النشر */

export const SITE_URL = (process.env.SITE_URL || "https://trendora1.com").replace(/\/$/, "");
export const ADMIN_USER = process.env.ADMIN_USER || "";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
export const ONLY_CATEGORY = process.env.ONLY_CATEGORY || "";
export const DRY_RUN = process.env.DRY_RUN === "1";

/** يبني محتوى HTML نظيفاً من بنية منظّمة */
export function build(intro, sections, conclusion) {
  let html = `<p>${intro}</p>\n`;
  for (const s of sections) {
    html += `\n<h2>${s.h}</h2>\n`;
    if (s.p) for (const p of s.p) html += `<p>${p}</p>\n`;
    if (s.list) html += `<ul>\n${s.list.map((li) => `  <li>${li}</li>`).join("\n")}\n</ul>\n`;
    if (s.quote) html += `<blockquote>${s.quote}</blockquote>\n`;
  }
  html += `\n<h2>الخلاصة</h2>\n<p>${conclusion}</p>`;
  return html.trim();
}

export function img(id) {
  return `https://images.unsplash.com/photo-${id}?w=1280&q=75&auto=format&fit=crop`;
}

function cookieFromResponse(res) {
  const getAll = res.headers.getSetCookie?.bind(res.headers);
  const raw = getAll ? getAll() : [res.headers.get("set-cookie")].filter(Boolean);
  return raw.map((c) => c.split(";")[0]).join("; ");
}

async function login() {
  const res = await fetch(`${SITE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`فشل تسجيل الدخول (${res.status}): ${await res.text().catch(() => "")}`);
  const cookie = cookieFromResponse(res);
  if (!cookie) throw new Error("لم يصل كوكي الجلسة من الخادم.");
  return cookie;
}

async function createArticle(cookie, article) {
  const res = await fetch(`${SITE_URL}/api/admin/articles`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ ...article, status: "published", author: "فريق التحرير" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`(${res.status}) ${data.error || "خطأ غير معروف"}`);
  return data.article;
}

/** يشغّل عملية النشر لمجموعة مقالات */
export async function run(allArticles, label = "") {
  const articles = ONLY_CATEGORY
    ? allArticles.filter((a) => a.category === ONLY_CATEGORY)
    : allArticles;

  console.log(`\n  الموقع: ${SITE_URL}`);
  console.log(`  ${label}عدد المقالات: ${articles.length}${DRY_RUN ? "  (وضع التجربة)" : ""}`);
  if (ONLY_CATEGORY) console.log(`  القسم: ${ONLY_CATEGORY}`);
  console.log("");

  if (DRY_RUN) {
    let cat = "";
    articles.forEach((a, i) => {
      if (a.category !== cat) { cat = a.category; console.log(`\n  [${cat}]`); }
      console.log(`    ${i + 1}. ${a.title}`);
    });
    console.log("\n  ✓ وضع التجربة: لم يتم إنشاء أي مقال.\n");
    return;
  }

  if (!ADMIN_PASSWORD) {
    console.error('\n  ✗ شغّل: $env:ADMIN_PASSWORD="كلمة_المرور"; node <script>\n');
    process.exit(1);
  }

  let cookie;
  try {
    cookie = await login();
    console.log("  ✓ تم تسجيل الدخول بنجاح.\n");
  } catch (err) {
    console.error(`  ✗ ${err.message}\n`);
    process.exit(1);
  }

  let ok = 0;
  for (const [i, article] of articles.entries()) {
    try {
      const created = await createArticle(cookie, article);
      ok++;
      console.log(`  ✓ (${i + 1}/${articles.length}) [${article.category}] ${created.title}`);
    } catch (err) {
      console.error(`  ✗ (${i + 1}/${articles.length}) فشل «${article.title}»: ${err.message}`);
    }
  }
  console.log(`\n  انتهى. تم نشر ${ok} من ${articles.length} مقالاً.`);
  console.log(`  خريطة الموقع تُحدّث تلقائياً: ${SITE_URL}/sitemap.xml\n`);
}
