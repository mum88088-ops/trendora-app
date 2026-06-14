/** تحديث صورة مقال زيادة المرتبات إلى صورة سحب نقود من ماكينة الصراف (ATM). */
const SITE_URL = (process.env.SITE_URL || "https://trendora1.com").replace(/\/$/, "");
const ADMIN_USER = process.env.ADMIN_USER || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const NEW_IMAGE =
  "https://images.unsplash.com/photo-1771527355678-49c169623a58?w=1280&q=75&auto=format&fit=crop";
const TITLE_MATCH = "زيادة المرتبات";

if (!ADMIN_PASSWORD) {
  console.error('\n  ✗ حدّد كلمة المرور: $env:ADMIN_PASSWORD="..."; node scripts/update-salary-image.mjs\n');
  process.exit(1);
}

function cookieFromResponse(res) {
  const getAll = res.headers.getSetCookie?.bind(res.headers);
  const raw = getAll ? getAll() : [res.headers.get("set-cookie")].filter(Boolean);
  return raw.map((c) => c.split(";")[0]).join("; ");
}

(async () => {
  const loginRes = await fetch(`${SITE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASSWORD }),
  });
  if (!loginRes.ok) throw new Error(`فشل تسجيل الدخول (${loginRes.status})`);
  const cookie = cookieFromResponse(loginRes);
  console.log("\n  ✓ تم تسجيل الدخول.");

  const listRes = await fetch(`${SITE_URL}/api/admin/articles`, { headers: { Cookie: cookie } });
  const { articles } = await listRes.json();
  const target = articles.find((a) => (a.title || "").includes(TITLE_MATCH));
  if (!target) throw new Error("لم يُعثر على مقال زيادة المرتبات.");

  const res = await fetch(`${SITE_URL}/api/admin/articles/${target.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ image: NEW_IMAGE }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`(${res.status}) ${data.error || "خطأ"}`);
  console.log(`  ✓ تم تحديث صورة المقال: ${data.article.title}`);
  console.log(`        الصورة الجديدة: ${data.article.image}\n`);
})().catch((err) => {
  console.error(`\n  ✗ ${err.message}\n`);
  process.exit(1);
});
