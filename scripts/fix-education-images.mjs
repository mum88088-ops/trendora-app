/**
 * يصلح صور مقالات التعليم التي لا تظهر (روابط Unsplash/LoremFlickr معطلة).
 * الاستخدام: $env:ADMIN_PASSWORD="كلمة_المرور"; node scripts/fix-education-images.mjs
 */
import { SITE_URL, ADMIN_USER, ADMIN_PASSWORD } from "./_helpers.mjs";

/** مطابقة جزء من العنوان → صورة فريدة ذات صلة */
const MAP = [
  { match: "الدروس الخصوصية وقواعد الغياب", kw: "tutor,classroom", lock: 7101 },
  { match: "الثانوية العامة 2026: دليل النتيجة", kw: "graduation,school", lock: 7102 },
  { match: "كيف تختار الكلية المناسبة", kw: "university,campus", lock: 7103 },
  { match: "نتيجة الشهادة الإعدادية 2026: رابط رسمي", kw: "exam,students", lock: 7104 },
  { match: "نتيجة الثانوية العامة 2026", kw: "highschool,exam", lock: 7105 },
  { match: "تنسيق الجامعات 2026", kw: "university,education", lock: 7106 },
  { match: "التعليم الفني", kw: "vocational,workshop", lock: 7107 },
  { match: "المنح الدراسية", kw: "scholarship,books", lock: 7108 },
  { match: "التحضير للامتحانات", kw: "study,desk", lock: 7109 },
  { match: "التعلم عن بُعد", kw: "laptop,online", lock: 7110 },
];

function img(kw, lock) {
  return `https://loremflickr.com/1280/720/${kw}?lock=${lock}`;
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
  if (!ADMIN_PASSWORD) {
    console.error('\n  ✗ شغّل: $env:ADMIN_PASSWORD="كلمة_المرور"; node scripts/fix-education-images.mjs\n');
    process.exit(1);
  }
  const cookie = await login();
  const res = await fetch(`${SITE_URL}/api/admin/articles`, { headers: { Cookie: cookie } });
  const { articles } = await res.json();
  const edu = articles.filter((a) => a.category === "التعليم");
  console.log(`\n  مقالات التعليم: ${edu.length}\n`);

  let ok = 0;
  for (const a of edu) {
    const title = String(a.title || "");
    const rule = MAP.find((m) => title.includes(m.match));
    const image = rule
      ? img(rule.kw, rule.lock)
      : img("school,education", 7200 + ok);
    const r = await fetch(`${SITE_URL}/api/admin/articles/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ image }),
    });
    if (r.ok) {
      ok++;
      console.log(`  ✓ ${title.slice(0, 55)}…\n     ${image}`);
    } else {
      console.error(`  ✗ فشل: ${title.slice(0, 40)} (${r.status})`);
    }
  }
  console.log(`\n  انتهى. حُدّث ${ok} مقالاً.\n`);
})();
