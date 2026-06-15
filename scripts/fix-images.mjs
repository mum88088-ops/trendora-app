/**
 * يصلح صور كل المقالات: يمنح كل مقال صورة فريدة وذات صلة بقسمه.
 * يعتمد على LoremFlickr (صور حقيقية حسب الكلمات المفتاحية + معرّف فريد لكل مقال).
 * الاستخدام: $env:ADMIN_PASSWORD="كلمة_المرور"; node scripts/fix-images.mjs
 * اختياري: $env:DRY_RUN="1"   لمعاينة دون تعديل
 *          $env:ONLY_CATEGORY="الرياضة"
 */
import { SITE_URL, ADMIN_USER, ADMIN_PASSWORD, ONLY_CATEGORY, DRY_RUN } from "./_helpers.mjs";

/** كلمات مفتاحية إنجليزية ذات صلة لكل قسم (تتناوب لزيادة التنوّع) */
const KEYWORDS = {
  "التعليم": ["school,classroom", "students,study", "library,books", "graduation,university", "exam,education", "teacher,lesson"],
  "المرتبات والأجور": ["money,salary", "cash,banknotes", "payroll,office", "wages,finance", "egyptian,money", "calculator,money"],
  "المعاشات": ["retirement,pension", "elderly,savings", "senior,finance", "retirement,money", "old,couple", "savings,jar"],
  "أسعار الذهب والعملات": ["gold,bars", "gold,jewelry", "currency,exchange", "coins,gold", "dollar,money", "bullion,gold"],
  "الاقتصاد والأسواق": ["economy,finance", "stockmarket,trading", "business,chart", "bank,building", "graph,market", "investment,money"],
  "الصحة": ["doctor,health", "hospital,medicine", "healthy,food", "wellness,fitness", "stethoscope,clinic", "pharmacy,medical"],
  "التقنية": ["technology,laptop", "smartphone,gadget", "computer,code", "artificial,intelligence", "internet,network", "circuit,digital"],
  "آخر الأخبار": ["news,newspaper", "city,cairo", "world,globe", "press,media", "microphone,broadcast", "breaking,news"],
  "الوظائف والتوظيف": ["office,work", "jobinterview,career", "business,meeting", "resume,desk", "handshake,office", "workplace,team"],
  "الخدمات الحكومية": ["passport,document", "government,building", "paperwork,office", "identitycard,document", "onlineservice,laptop", "stamp,papers"],
  "الرياضة": ["football,soccer", "stadium,sport", "running,fitness", "gym,workout", "athlete,sport", "basketball,game", "tennis,court", "swimming,pool", "cycling,sport", "yoga,fitness"],
  "الفن والمشاهير": ["cinema,movie", "music,concert", "theater,stage", "art,culture", "studio,microphone", "camera,film", "festival,lights", "guitar,music"],
  "السيارات": ["car,automobile", "highway,road", "electriccar,charging", "engine,motor", "traffic,street", "sportscar,vehicle"],
  "الطقس": ["sky,clouds", "rain,weather", "sunny,summer", "storm,clouds", "desert,heat", "snow,winter", "wind,nature"],
  "أسلوب حياة": ["lifestyle,home", "coffee,morning", "travel,nature", "family,home", "relax,wellness", "interior,cozy"],
  "عام": ["city,life", "people,crowd", "nature,landscape", "abstract,background", "street,urban"],
};
const FALLBACK = ["news,information", "background,abstract", "city,life"];

function imageFor(category, indexInCat, globalLock) {
  const pool = KEYWORDS[category] || FALLBACK;
  const kw = pool[indexInCat % pool.length];
  return `https://loremflickr.com/1280/720/${kw}?lock=${globalLock}`;
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
  if (!ADMIN_PASSWORD && !DRY_RUN) {
    console.error('\n  ✗ شغّل: $env:ADMIN_PASSWORD="كلمة_المرور"; node scripts/fix-images.mjs\n');
    process.exit(1);
  }
  const cookie = await login();
  const res = await fetch(`${SITE_URL}/api/admin/articles`, { headers: { Cookie: cookie } });
  const { articles } = await res.json();
  console.log(`\n  إجمالي المقالات: ${articles.length}${DRY_RUN ? "  (معاينة)" : ""}\n`);

  // ترتيب ثابت داخل كل قسم حسب تاريخ الإنشاء
  const byCat = {};
  for (const a of articles) (byCat[a.category || "عام"] = byCat[a.category || "عام"] || []).push(a);
  for (const arr of Object.values(byCat)) arr.sort((x, y) => new Date(x.createdAt) - new Date(y.createdAt));

  let lock = 1000;
  let ok = 0, fail = 0, skipped = 0;
  for (const [cat, arr] of Object.entries(byCat)) {
    if (ONLY_CATEGORY && cat !== ONLY_CATEGORY) { skipped += arr.length; continue; }
    for (let i = 0; i < arr.length; i++) {
      const a = arr[i];
      const label = String(a.title || a.id || "?").slice(0, 40);
      lock++;
      const image = imageFor(cat, i, lock);
      if (DRY_RUN) { console.log(`  [${cat}] ${i + 1}. ${label} -> ${image}`); ok++; continue; }
      try {
        const r = await fetch(`${SITE_URL}/api/admin/articles/${a.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Cookie: cookie },
          body: JSON.stringify({ image }),
        });
        if (!r.ok) throw new Error(`(${r.status})`);
        ok++;
        if (ok % 20 === 0) console.log(`  ... حُدّث ${ok} مقالاً`);
      } catch (err) {
        fail++;
        console.error(`  ✗ فشل [${cat}] ${label}: ${err.message}`);
      }
    }
  }
  console.log(`\n  انتهى. حُدّث ${ok}${fail ? `، فشل ${fail}` : ""}${skipped ? `، تخطّى ${skipped}` : ""}.\n`);
})();
