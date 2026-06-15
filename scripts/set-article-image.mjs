/**
 * يضبط صورة مقال يطابق نصاً معيّناً في العنوان.
 * الاستخدام:
 *   $env:ADMIN_PASSWORD="كلمة_المرور"; $env:MATCH="جزء من العنوان"; $env:IMAGE="/assets/img/file.png"; node scripts/set-article-image.mjs
 * IMAGE يمكن أن يكون مساراً نسبياً (سيُضاف إليه رابط الموقع) أو رابطاً كاملاً.
 */
import { SITE_URL, ADMIN_USER, ADMIN_PASSWORD } from "./_helpers.mjs";

const MATCH = process.env.MATCH || "";
let IMAGE = process.env.IMAGE || "";
if (IMAGE && !/^https?:\/\//.test(IMAGE)) {
  IMAGE = `${SITE_URL}${IMAGE.startsWith("/") ? "" : "/"}${IMAGE}`;
}

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
  if (!ADMIN_PASSWORD || !MATCH || !IMAGE) {
    console.error('\n  ✗ مطلوب: ADMIN_PASSWORD و MATCH و IMAGE.\n');
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
    console.log(r.ok ? `  ✓ تم تحديث «${a.title}»` : `  ✗ فشل تحديث «${a.title}» (${r.status})`);
  }
  console.log("");
})();
