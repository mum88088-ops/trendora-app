/**
 * يضبط كود AdSense لإثبات ملكية الموقع.
 * الاستخدام: $env:ADMIN_PASSWORD="..."; node scripts/set-adsense.mjs
 */
import { SITE_URL, ADMIN_USER, ADMIN_PASSWORD } from "./_helpers.mjs";

const CLIENT = "ca-pub-9561095912527343";
const VERIFICATION = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}" crossorigin="anonymous"></script>`;

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
    console.error('\n  ✗ شغّل: $env:ADMIN_PASSWORD="كلمة_المرور"; node scripts/set-adsense.mjs\n');
    process.exit(1);
  }
  const cookie = await login();
  const cur = await fetch(`${SITE_URL}/api/admin/settings`, { headers: { Cookie: cookie } });
  const s = await cur.json();

  const res = await fetch(`${SITE_URL}/api/admin/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      adsense: {
        ...(s.adsense || {}),
        clientId: CLIENT,
        verification: VERIFICATION,
      },
      analyticsId: s.analyticsId || "",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.status);

  const home = await fetch(`${SITE_URL}/`);
  const html = await home.text();
  const adsTxt = await (await fetch(`${SITE_URL}/ads.txt`)).text();

  console.log("\n  ✓ تم حفظ إعدادات AdSense على الموقع المباشر");
  console.log(`  Publisher ID: ${data.adsense.clientId}`);
  console.log(`  الكود في الصفحة الرئيسية: ${html.includes(CLIENT) ? "نعم ✓" : "لا ✗"}`);
  console.log(`  ads.txt:\n${adsTxt}`);
  console.log("\n  يمكنك الآن الضغط على «تم» في AdSense للتحقق من الملكية.\n");
})();
