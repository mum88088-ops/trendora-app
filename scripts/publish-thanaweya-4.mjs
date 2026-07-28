import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const SITE_URL = (process.env.SITE_URL || "https://trendora1.com").replace(/\/$/, "");
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

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
  if (!res.ok) throw new Error(`login ${res.status}: ${await res.text()}`);
  const cookie = cookieFromResponse(res);
  if (!cookie) throw new Error("no cookie");
  return cookie;
}

async function uploadImage(cookie, filePath) {
  const buf = fs.readFileSync(filePath);
  const form = new FormData();
  form.append("image", new Blob([buf], { type: "image/jpeg" }), path.basename(filePath));
  const res = await fetch(`${SITE_URL}/api/admin/upload`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`upload ${res.status}: ${data.error || ""}`);
  return data.url;
}

function searchWidget() {
  return `
<section id="thanaweya-result-search" class="thanaweya-search" aria-label="الاستعلام عن نتيجة الثانوية العامة 2026">
  <div class="thanaweya-search-inner">
    <h2 class="thanaweya-search-title">استعلم عن نتيجتك برقم الجلوس الآن</h2>
    <p class="thanaweya-search-hint">أدخل رقم الجلوس لعرض الاسم والمجموع والحالة فوراً — مجاناً وبدون رسوم.</p>
    <form class="thanaweya-search-form" autocomplete="off">
      <label class="sr-only" for="thanaweyaSeatInput">رقم الجلوس</label>
      <input id="thanaweyaSeatInput" name="seat" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="10" placeholder="أدخل رقم الجلوس هنا" required />
      <button type="submit">عرض النتيجة</button>
    </form>
    <div class="thanaweya-search-result" hidden></div>
  </div>
</section>`.trim();
}

function body(extraTitle) {
  const updated = new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
  return `
<p><strong>${extraTitle}</strong> متاحة الآن للاستعلام الفوري. أدخل رقم جلوسك في الخانة بالأسفل لمعرفة النتيجة خلال ثوانٍ.</p>
<p><em>آخر تحديث: ${updated}</em></p>
${searchWidget()}
<h2>كيف تستعلم عن نتيجة الثانوية العامة 2026؟</h2>
<ol>
  <li>اكتب <strong>رقم الجلوس</strong> في خانة البحث.</li>
  <li>اضغط <strong>عرض النتيجة</strong>.</li>
  <li>ستظهر لك الاسم والمجموع الكلي وحالة النجاح أو الدور الثاني.</li>
</ol>
<h2>نتيجة الثانوية العامة 2026 بالاسم ورقم الجلوس</h2>
<p>يمكنك الاستعلام بسهولة عن <strong>نتيجة الثانوية العامة 2026 برقم الجلوس</strong> مباشرة من هذه الصفحة، بدون تسجيل وبدون أي رسوم.</p>
<h2>ملاحظات مهمة</h2>
<ul>
  <li>الخدمة مجانية بالكامل.</li>
  <li>تأكد من صحة رقم الجلوس قبل البحث.</li>
  <li>إذا لم تظهر النتيجة، راجع الرقم أو حاول بعد دقائق.</li>
</ul>
<blockquote>أسرع استعلام: رقم الجلوس + زر عرض النتيجة.</blockquote>
<h2>الخلاصة</h2>
<p>استعلم الآن عن <strong>نتيجة الثانوية العامة 2026</strong> من ترندورا وشارك الرابط مع زملائك.</p>
`.trim();
}

const KEYWORDS = [
  "نتيجة الثانوية العامة 2026",
  "نتيجة الثانوية العامة 2026 برقم الجلوس",
  "نتيجة الثانوية العامة 2026 بالاسم",
  "رابط نتيجة الثانوية العامة 2026",
  "استعلام نتيجة الثانوية 2026",
  "نتيجة ثانوية عامة 2026 ظهرت الآن",
  "نتيجة الترمين ثانوية عامة 2026",
  "مجموع الثانوية العامة 2026",
  "ناجح دور أول الثانوية 2026",
  "دور ثان ثانوية عامة 2026",
  "نتيجة ثانوية عامة نظام حديث",
  "نتيجة الثانوية العامة وزارة التربية والتعليم",
  "نتيجة ثانوية عامة علمي علوم 2026",
  "نتيجة ثانوية عامة علمي رياضة 2026",
  "نتيجة ثانوية عامة أدبي 2026",
  "بوابة التعليم الثانوي نتيجة 2026",
  "استعلام نتيجة الثانوية برقم الجلوس والاسم",
  "نتيجة الثانوية العامة جميع المحافظات",
  "نتيجة ثالثة ثانوي 2026",
  "نتيجة الصف الثالث الثانوي 2026",
  "لينك نتيجة الثانوية 2026",
  "شوف نتيجتك ثانوية عامة 2026",
  "نتيجة الثانوية العامة اليوم",
  "نتيجة الثانوية العامة فور ظهورها",
  "نتيجة الثانوية العامة مجانا",
];

const ARTICLES = [
  {
    title: "نتيجة الثانوية العامة 2026 برقم الجلوس والاستعلام الفوري مجاناً",
    imageFile: "public/uploads/thanaweya-hero-user.jpg",
    excerpt: "نتيجة الثانوية العامة 2026 برقم الجلوس: استعلم الآن مجاناً واعرف الاسم والمجموع وحالة النجاح خلال ثوانٍ.",
    tags: ["نتيجة الثانوية العامة 2026", "برقم الجلوس", "استعلام فوري", "مجاناً", "التعليم"],
  },
  {
    title: "نتيجة الثانوية العامة 2026 بالاسم ورقم الجلوس ظهرت الآن",
    imageFile: "public/uploads/thanaweya-hero-name.jpg",
    excerpt: "نتيجة الثانوية العامة 2026 بالاسم ورقم الجلوس متاحة الآن. ابحث عن نتيجتك فوراً بدون رسوم.",
    tags: ["نتيجة الثانوية بالاسم", "رقم الجلوس", "ظهرت الآن", "ثانوية عامة 2026"],
  },
  {
    title: "رابط نتيجة الثانوية العامة 2026 وزارة التربية والتعليم استعلم من هنا",
    imageFile: "public/uploads/thanaweya-hero-link.jpg",
    excerpt: "رابط نتيجة الثانوية العامة 2026 للاستعلام السريع برقم الجلوس من ترندورا — مباشر ومجاني.",
    tags: ["رابط نتيجة الثانوية", "وزارة التربية والتعليم", "استعلام", "2026"],
  },
  {
    title: "نتيجة ثانوية عامة 2026 ظهرت الآن علمي وأدبي لجميع المحافظات",
    imageFile: "public/uploads/thanaweya-hero-now.jpg",
    excerpt: "نتيجة ثانوية عامة 2026 ظهرت الآن للشعب العلمية والأدبية. استعلم برقم الجلوس مجاناً.",
    tags: ["نتيجة ثانوية عامة", "علمي وأدبي", "جميع المحافظات", "ظهرت الآن"],
  },
];

async function createArticle(cookie, article) {
  const res = await fetch(`${SITE_URL}/api/admin/articles`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ ...article, status: "published", author: "فريق التحرير" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`(${res.status}) ${data.error || "error"}`);
  return data.article;
}

async function main() {
  if (!ADMIN_PASSWORD) throw new Error("ADMIN_PASSWORD required");
  console.log("SITE", SITE_URL);
  const cookie = await login();
  console.log("logged in");

  const userImg = path.join(ROOT, "public/uploads/thanaweya-hero-user.jpg");
  const hero1 = path.join(ROOT, "public/uploads/thanaweya-2026-hero-1.png");
  if (!fs.existsSync(userImg) && fs.existsSync(hero1)) fs.copyFileSync(hero1, userImg);

  for (const [i, meta] of ARTICLES.entries()) {
    const imgPath = path.join(ROOT, meta.imageFile);
    if (!fs.existsSync(imgPath)) throw new Error("missing image " + imgPath);
    let url;
    try {
      url = await uploadImage(cookie, imgPath);
      console.log(uploaded , url);
    } catch (err) {
      console.log('upload failed, using data url', err.message);
      url = 'data:image/jpeg;base64,' + fs.readFileSync(imgPath).toString('base64');
    }
    console.log(`uploaded ${i + 1}`, url);
    const created = await createArticle(cookie, {
      title: meta.title,
      image: url,
      excerpt: meta.excerpt,
      tags: meta.tags,
      keywords: KEYWORDS,
      content: body(meta.title),
      category: "التعليم",
    });
    console.log(`OK ${created.title}`);
    console.log(`URL ${SITE_URL}/article/${encodeURIComponent(created.slug)}`);
  }
}

main().catch((e) => {
  console.error("FAIL", e.message);
  process.exit(1);
});
