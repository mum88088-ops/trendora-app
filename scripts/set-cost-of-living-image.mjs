/**
 * يضبط صورة مقال «علاوة غلاء المعيشة 2026» على الصورة المولّدة بالذكاء الاصطناعي.
 * الاستخدام: $env:ADMIN_PASSWORD="كلمة_المرور"; node scripts/set-cost-of-living-image.mjs
 */
import { SITE_URL, ADMIN_USER, ADMIN_PASSWORD } from "./_helpers.mjs";

const IMAGE = `${SITE_URL}/assets/img/cost-of-living-2026.png`;
const MATCH = "علاوة غلاء المعيشة 2026";

function cookieFromResponse(res) {
  const getAll = res.headers.getSetCookie?.bind(res.headers);
  const raw = getAll ? getAll() : [res.headers.get("set-cookie")].filter(Boolean);
  return raw.map((c) => c.split(";")[0]).join("; ");
}
async function login() {
  const res = await fetch(`${SITE_URL}/api/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`فشل تسجيل الدخول (${res.status})`);
  return cookieFromResponse(res);
}

(async () => {
  if (!ADMIN_PASSWORD) {
    console.error('\n  ✗ شغّل: $env:ADMIN_PASSWORD="كلمة_المرور"; node scripts/set-cost-of-living-image.mjs\n');
    process.exit(1);
  }
  const cookie = await login();
  const res = await fetch(`${SITE_URL}/api/admin/articles`, { headers: { Cookie: cookie } });
  const { articles } = await res.json();

  const matches = articles.filter((a) => String(a.title || "").includes(MATCH));
  if (!matches.length) {
    console.error(`\n  ✗ لم يُعثر على مقال يطابق: «${MATCH}»\n`);
    process.exit(1);
  }
  console.log(`\n  وُجد ${matches.length} مقالاً مطابقاً. الصورة الجديدة:\n  ${IMAGE}\n`);

  for (const a of matches) {
    const r = await fetch(`${SITE_URL}/api/admin/articles/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ image: IMAGE }),
    });
    if (!r.ok) {
      console.error(`  ✗ فشل تحديث «${a.title}» (${r.status})`);
    } else {
      console.log(`  ✓ تم تحديث «${a.title}»`);
    }
  }
  console.log("");
})();
