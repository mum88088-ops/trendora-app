/** يطبع عدد المقالات لكل قسم وحالة تكرار الصور */
import { SITE_URL, ADMIN_USER, ADMIN_PASSWORD } from "./_helpers.mjs";

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
  if (!res.ok) throw new Error(`login ${res.status}`);
  return cookieFromResponse(res);
}
const cookie = await login();
const res = await fetch(`${SITE_URL}/api/admin/articles`, { headers: { Cookie: cookie } });
const { articles } = await res.json();
console.log("إجمالي المقالات:", articles.length);
const byCat = {};
for (const a of articles) {
  (byCat[a.category] = byCat[a.category] || []).push(a);
}
for (const [cat, arr] of Object.entries(byCat)) {
  const imgs = arr.map((a) => a.image || "");
  const uniq = new Set(imgs);
  console.log(`\n[${cat}]  المقالات: ${arr.length}  صور فريدة: ${uniq.size}`);
}
