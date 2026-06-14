/**
 * إنشاء مقال منفصل لكل مباراة من كأس العالم 2026:
 *   موعد المباراة (مصر/مكة، الإمارات، التوقيت الأمريكي ET) + القنوات الناقلة + رابط فيديو (بحث يوتيوب).
 *
 * المواعيد مأخوذة من الجدول الرسمي المنشور (Telemundo/FOX). التوقيت الأمريكي (ET) أصلي،
 * وتم تحويله إلى توقيت القاهرة/مكة (UTC+3 = ET+7) والإمارات (UTC+4 = ET+8).
 *
 * الاستخدام (PowerShell):
 *   $env:ADMIN_PASSWORD="كلمة_المرور"; node scripts/publish-matches.mjs
 *   (DRY_RUN=1 لعرض القائمة دون نشر)
 */

const SITE_URL = (process.env.SITE_URL || "https://trendora1.com").replace(/\/$/, "");
const ADMIN_USER = process.env.ADMIN_USER || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const DRY_RUN = process.env.DRY_RUN === "1";

if (!ADMIN_PASSWORD && !DRY_RUN) {
  console.error('\n  ✗ حدّد كلمة المرور: $env:ADMIN_PASSWORD="..."; node scripts/publish-matches.mjs\n');
  process.exit(1);
}

const IMAGES = [
  "https://images.unsplash.com/photo-1769859177914-f66488d71193?w=1280&q=75&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1762013315117-1c8005ad2b41?w=1280&q=75&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1777715328908-4152090366b0?w=1280&q=75&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1731870881782-1948058d9ce1?w=1280&q=75&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1759156207340-b9acde1cb905?w=1280&q=75&auto=format&fit=crop",
];

/* أنماط الجداول المضمّنة */
const T = 'style="width:100%;border-collapse:collapse;margin:8px 0 24px;font-size:1rem"';
const TH = 'style="border:1px solid #e2e8f0;padding:10px 12px;background:#f1f5f9;font-weight:700;text-align:right"';
const TD = 'style="border:1px solid #e2e8f0;padding:10px 12px;text-align:right"';

/* بيانات المباريات (التوقيت الأمريكي ET أصلي، والباقي محوّل) */
const MATCHES = [
  {
    a: "مصر", b: "بلجيكا",
    etDay: "الاثنين", etDate: "15 يونيو", etTime: "3:00 مساءً",
    mecca: { day: "الاثنين", date: "15 يونيو", time: "10:00 مساءً" },
    uae: { day: "الاثنين", date: "15 يونيو", time: "11:00 مساءً" },
    usEs: "Telemundo و Peacock",
    blurb:
      "مواجهة قوية في الجولة الأولى تجمع الفراعنة بأحد كبار المنتخبات الأوروبية. يطمح منتخب مصر إلى بداية إيجابية أمام بلجيكا صاحبة الجيل الموهوب والخبرة الواسعة في البطولات الكبرى.",
  },
  {
    a: "مصر", b: "نيوزيلندا",
    etDay: "الأحد", etDate: "21 يونيو", etTime: "9:00 مساءً",
    mecca: { day: "الاثنين", date: "22 يونيو", time: "4:00 صباحاً" },
    uae: { day: "الاثنين", date: "22 يونيو", time: "5:00 صباحاً" },
    usEs: "Telemundo و Peacock",
    blurb:
      "فرصة مهمة للفراعنة لحصد النقاط الثلاث أمام منتخب نيوزيلندا أحد ممثلي قارة أوقيانوسيا. قد تكون هذه المباراة مفصلية في حظوظ مصر للتأهل من دور المجموعات.",
  },
  {
    a: "مصر", b: "إيران",
    etDay: "الجمعة", etDate: "26 يونيو", etTime: "11:00 مساءً",
    mecca: { day: "السبت", date: "27 يونيو", time: "6:00 صباحاً" },
    uae: { day: "السبت", date: "27 يونيو", time: "7:00 صباحاً" },
    usEs: "Universo و Peacock",
    blurb:
      "قمة عربية آسيوية في الجولة الأخيرة قد تحدد مصير المنتخبين داخل المجموعة. يمتلك كلا الفريقين خبرة في كأس العالم ويسعى لحجز مقعد في الدور المقبل.",
  },
  {
    a: "الأرجنتين", b: "الجزائر",
    etDay: "الثلاثاء", etDate: "16 يونيو", etTime: "9:00 مساءً",
    mecca: { day: "الأربعاء", date: "17 يونيو", time: "4:00 صباحاً" },
    uae: { day: "الأربعاء", date: "17 يونيو", time: "5:00 صباحاً" },
    usEs: "Telemundo و Peacock",
    blurb:
      "اختبار صعب لمحاربي الصحراء أمام منتخب الأرجنتين أحد أبرز المرشحين للقب وصاحب النجوم العالميين. يأمل المنتخب الجزائري في تقديم مفاجأة أمام راقصي التانغو.",
  },
  {
    a: "فرنسا", b: "السنغال",
    etDay: "الثلاثاء", etDate: "16 يونيو", etTime: "3:00 مساءً",
    mecca: { day: "الثلاثاء", date: "16 يونيو", time: "10:00 مساءً" },
    uae: { day: "الثلاثاء", date: "16 يونيو", time: "11:00 مساءً" },
    usEs: "Telemundo و Peacock",
    blurb:
      "مواجهة تحمل نكهة خاصة بين منتخب الديوك الفرنسي بطموحاته الكبيرة وأسود التيرانغا أبطال أفريقيا السابقين. لقاء يجمع نجوماً يلمعون في الدوري الفرنسي على الجانبين.",
  },
  {
    a: "إنجلترا", b: "كرواتيا",
    etDay: "الأربعاء", etDate: "17 يونيو", etTime: "4:00 مساءً",
    mecca: { day: "الأربعاء", date: "17 يونيو", time: "11:00 مساءً" },
    uae: { day: "الخميس", date: "18 يونيو", time: "12:00 منتصف الليل" },
    usEs: "Telemundo و Peacock",
    blurb:
      "إعادة لذكريات نصف نهائي مونديال سابق، حيث يلتقي الأسود الثلاثة بالمنتخب الكرواتي المنظّم. مباراة كبيرة بين مدرستين أوروبيتين عريقتين تَعِد بالندّية.",
  },
  {
    a: "البرازيل", b: "المغرب",
    etDay: "السبت", etDate: "13 يونيو", etTime: "6:00 مساءً",
    mecca: { day: "الأحد", date: "14 يونيو", time: "1:00 صباحاً" },
    uae: { day: "الأحد", date: "14 يونيو", time: "2:00 صباحاً" },
    usEs: "Telemundo و Peacock",
    blurb:
      "مواجهة مثيرة بين السامبا البرازيلية وأسود الأطلس الذين فاجأوا العالم في النسخة الماضية. يسعى المغرب لتأكيد أنه قوة كروية صاعدة أمام أحد أعرق منتخبات العالم.",
  },
  {
    a: "ألمانيا", b: "الإكوادور",
    etDay: "الخميس", etDate: "25 يونيو", etTime: "4:00 مساءً",
    mecca: { day: "الخميس", date: "25 يونيو", time: "11:00 مساءً" },
    uae: { day: "الجمعة", date: "26 يونيو", time: "12:00 منتصف الليل" },
    usEs: "Telemundo و Peacock",
    blurb:
      "المانشافت الألماني صاحب الخبرة يواجه منتخب الإكوادور الطموح من أمريكا الجنوبية. تبحث ألمانيا عن استعادة هيبتها العالمية في مواجهة خصم لا يُستهان به.",
  },
  {
    a: "إسبانيا", b: "السعودية",
    etDay: "الأحد", etDate: "21 يونيو", etTime: "12:00 ظهراً",
    mecca: { day: "الأحد", date: "21 يونيو", time: "7:00 مساءً" },
    uae: { day: "الأحد", date: "21 يونيو", time: "8:00 مساءً" },
    usEs: "Telemundo و Peacock",
    blurb:
      "تحدٍّ كبير للأخضر السعودي أمام منتخب إسبانيا صاحب أحد أقوى أجيال كرة القدم الحالية. يأمل المنتخب السعودي في تكرار مفاجآته التاريخية أمام الكبار.",
  },
  {
    a: "البرتغال", b: "كولومبيا",
    etDay: "السبت", etDate: "27 يونيو", etTime: "7:30 مساءً",
    mecca: { day: "الأحد", date: "28 يونيو", time: "2:30 صباحاً" },
    uae: { day: "الأحد", date: "28 يونيو", time: "3:30 صباحاً" },
    usEs: "Telemundo و Peacock",
    blurb:
      "مواجهة هجومية واعدة بين البرتغال بقيادة نجومها وكولومبيا صاحبة الأسلوب الاستعراضي الجنوب أمريكي. لقاء يَعِد بالأهداف والإثارة من الطرفين.",
  },
];

function youtubeSearch(a, b) {
  const q = encodeURIComponent(`${a} ${b} كأس العالم 2026 ملخص أهداف`);
  return `https://www.youtube.com/results?search_query=${q}`;
}

function buildContent(m) {
  const yt = youtubeSearch(m.a, m.b);
  return `
<p>يبحث عشاق كرة القدم عن موعد مباراة <strong>${m.a} و${m.b}</strong> في كأس العالم 2026 والقنوات الناقلة لها. ${m.blurb} في هذا التقرير نستعرض الموعد بالتوقيت المحلي لكل من مصر ودول الخليج والولايات المتحدة، إلى جانب القنوات الناقلة ورابط متابعة الفيديو.</p>

<h2>موعد مباراة ${m.a} و${m.b}</h2>
<table ${T}>
<thead><tr><th ${TH}>التوقيت</th><th ${TH}>اليوم والتاريخ</th><th ${TH}>الساعة</th></tr></thead>
<tbody>
<tr><td ${TD}>القاهرة ومكة المكرمة (مصر/السعودية/قطر)</td><td ${TD}>${m.mecca.day} ${m.mecca.date}</td><td ${TD}>${m.mecca.time}</td></tr>
<tr><td ${TD}>الإمارات وعُمان</td><td ${TD}>${m.uae.day} ${m.uae.date}</td><td ${TD}>${m.uae.time}</td></tr>
<tr><td ${TD}>التوقيت الشرقي الأمريكي (ET)</td><td ${TD}>${m.etDay} ${m.etDate}</td><td ${TD}>${m.etTime}</td></tr>
</tbody>
</table>
<p>المواعيد قابلة للتعديل، ويُنصح بتأكيدها عبر القناة الرسمية قبل انطلاق المباراة.</p>

<h2>القنوات الناقلة لمباراة ${m.a} و${m.b}</h2>
<table ${T}>
<thead><tr><th ${TH}>المنطقة</th><th ${TH}>القناة الناقلة</th></tr></thead>
<tbody>
<tr><td ${TD}>مصر ودول الخليج والشرق الأوسط</td><td ${TD}>beIN Sports MAX</td></tr>
<tr><td ${TD}>الولايات المتحدة (إنجليزي)</td><td ${TD}>FOX أو FS1 + تطبيق FOX Sports</td></tr>
<tr><td ${TD}>الولايات المتحدة (إسباني)</td><td ${TD}>${m.usEs}</td></tr>
</tbody>
</table>

<h2>نظرة على المباراة</h2>
<p>${m.blurb} وتُعد هذه المواجهة من المباريات التي يترقبها الجمهور العربي ضمن منافسات دور المجموعات في النسخة الأضخم من تاريخ كأس العالم، المقامة في الولايات المتحدة وكندا والمكسيك بمشاركة 48 منتخباً.</p>

<h2>أين تشاهد ملخص وفيديو المباراة؟</h2>
<p>يمكنك متابعة أبرز اللقطات وأهداف وملخص مباراة ${m.a} و${m.b} عبر القنوات الرسمية الناقلة، أو من خلال <a href="${yt}" target="_blank" rel="noopener">البحث على يوتيوب</a> الذي يعرض مقاطع المعاينة قبل المباراة والملخص الكامل بعدها.</p>

<h2>الخلاصة</h2>
<p>تقام مباراة ${m.a} و${m.b} يوم ${m.mecca.day} ${m.mecca.date} في تمام الساعة ${m.mecca.time} بتوقيت القاهرة ومكة المكرمة، وتُنقل عبر شبكة beIN Sports في المنطقة العربية. تابعونا على ترندورا للحصول على آخر المستجدات والنتائج لحظة بلحظة.</p>
`.trim();
}

function buildArticle(m, i) {
  return {
    title: `موعد مباراة ${m.a} و${m.b} في كأس العالم 2026 والقنوات الناقلة`,
    category: "الرياضة",
    image: IMAGES[i % IMAGES.length],
    excerpt: `موعد مباراة ${m.a} و${m.b} في كأس العالم 2026 بتوقيت مصر ودول الخليج وأمريكا، والقنوات الناقلة لها، مع رابط متابعة ملخص وأهداف المباراة.`,
    tags: [m.a, m.b, "كأس العالم 2026", "مواعيد المباريات"],
    keywords: [
      `موعد مباراة ${m.a} و${m.b}`,
      `مباراة ${m.a} و${m.b} كأس العالم 2026`,
      `القنوات الناقلة لمباراة ${m.a}`,
      `ملخص مباراة ${m.a} و${m.b}`,
      `${m.a} ضد ${m.b}`,
      "كأس العالم 2026",
      "بث مباشر كأس العالم",
    ],
    status: "published",
    author: "فريق التحرير",
    content: buildContent(m),
  };
}

const ARTICLES = MATCHES.map(buildArticle);

/* ---------- شبكة ---------- */
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
  if (!res.ok) throw new Error(`فشل تسجيل الدخول (${res.status}): ${await res.text()}`);
  const cookie = cookieFromResponse(res);
  if (!cookie) throw new Error("لم يصل كوكي الجلسة.");
  return cookie;
}
async function createArticle(cookie, article) {
  const res = await fetch(`${SITE_URL}/api/admin/articles`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(article),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`(${res.status}) ${data.error || "خطأ"}`);
  return data.article;
}

(async () => {
  console.log(`\n  الموقع: ${SITE_URL}`);
  console.log(`  عدد المقالات: ${ARTICLES.length}${DRY_RUN ? "  (وضع التجربة)" : ""}\n`);
  if (DRY_RUN) {
    ARTICLES.forEach((a, i) => console.log(`  ${i + 1}. ${a.title}`));
    console.log("\n  ✓ وضع التجربة فقط.\n");
    return;
  }
  const cookie = await login();
  console.log("  ✓ تم تسجيل الدخول.\n");
  let ok = 0;
  for (const [i, article] of ARTICLES.entries()) {
    try {
      const c = await createArticle(cookie, article);
      ok++;
      console.log(`  ✓ (${i + 1}/${ARTICLES.length}) ${c.title}`);
    } catch (err) {
      console.error(`  ✗ (${i + 1}/${ARTICLES.length}) ${article.title}: ${err.message}`);
    }
  }
  console.log(`\n  انتهى. تم نشر ${ok} من ${ARTICLES.length} مقالاً.`);
  console.log(`  خريطة الموقع: ${SITE_URL}/sitemap.xml\n`);
})().catch((err) => {
  console.error(`\n  ✗ ${err.message}\n`);
  process.exit(1);
});
