/**
 * تحديث/إضافة مقالات على موقع Trendora:
 *   1) تعديل مقال «القنوات الناقلة لكأس العالم» (قنوات ومواعيد لكل دولة + كلمات مفتاحية).
 *   2) إنشاء مقال إنجليزي منفصل عن جدول ومواعيد وقنوات كأس العالم.
 *   3) تعديل مقال «أسعار الذهب» (أسعار اليوم في مصر والخليج + تعديل العنوان).
 *
 * الاستخدام (PowerShell):
 *   $env:ADMIN_PASSWORD="كلمة_المرور"; node scripts/update-articles.mjs
 *
 * ملاحظة: البيانات (أسعار الذهب والقنوات) مأخوذة من مصادر منشورة بتاريخ 14 يونيو 2026
 * وقد تتغيّر؛ المقالات تتضمن تنبيهاً للقارئ بمراجعة المصادر الرسمية.
 */

const SITE_URL = (process.env.SITE_URL || "https://trendora1.com").replace(/\/$/, "");
const ADMIN_USER = process.env.ADMIN_USER || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

if (!ADMIN_PASSWORD) {
  console.error(
    "\n  ✗ حدّد كلمة المرور:\n" +
      '    $env:ADMIN_PASSWORD="كلمة_المرور"; node scripts/update-articles.mjs\n'
  );
  process.exit(1);
}

/* ---------- أنماط مضمّنة للجداول (تعمل فوراً دون تعديل CSS) ---------- */
const T = 'style="width:100%;border-collapse:collapse;margin:8px 0 24px;font-size:1rem"';
const TH =
  'style="border:1px solid #e2e8f0;padding:10px 12px;background:#f1f5f9;font-weight:700;text-align:right"';
const TD = 'style="border:1px solid #e2e8f0;padding:10px 12px;text-align:right"';
const THC =
  'style="border:1px solid #e2e8f0;padding:10px 12px;background:#f1f5f9;font-weight:700;text-align:left"';
const TDC = 'style="border:1px solid #e2e8f0;padding:10px 12px;text-align:left"';

/* ============================================================
   1) مقال القنوات الناقلة (عربي) — محتوى محدّث
   ============================================================ */
const TV_TITLE_MATCH = "القنوات الناقلة لكأس العالم";
const tvContent = `
<p>مع انطلاق منافسات كأس العالم 2026 المقامة في الولايات المتحدة وكندا والمكسيك، يبحث ملايين المشجعين عن القنوات الناقلة ومواعيد المباريات في كل دولة. في هذا الدليل المحدّث نوضّح القناة الرسمية الناقلة في مصر والمغرب والجزائر وأمريكا وقطر والسعودية، مع جدول بأبرز مواعيد مباريات المنتخبات العربية.</p>

<h2>من يملك حقوق بث كأس العالم 2026؟</h2>
<p>تُوزَّع حقوق البث جغرافياً عبر اتفاقيات رسمية مع الاتحاد الدولي لكرة القدم (فيفا). وفي منطقة الشرق الأوسط وشمال أفريقيا، تُعد شبكة <strong>beIN Sports</strong> هي الناقل الرسمي الحصري للبطولة منذ عام 2014، وتغطي جميع المباريات الـ104 عبر ثماني قنوات مخصصة بثلاث لغات (العربية والإنجليزية والفرنسية). أما في الولايات المتحدة فتتقاسم الحقوق شبكتا FOX (بالإنجليزية) وTelemundo (بالإسبانية).</p>

<h2>القنوات الناقلة حسب الدولة</h2>
<table ${T}>
<thead><tr><th ${TH}>الدولة</th><th ${TH}>القناة الناقلة الرسمية</th><th ${TH}>ملاحظات</th></tr></thead>
<tbody>
<tr><td ${TD}>مصر</td><td ${TD}>beIN Sports MAX (مشفّرة)</td><td ${TD}>الناقل الحصري لجميع المباريات في المنطقة</td></tr>
<tr><td ${TD}>المغرب</td><td ${TD}>beIN Sports + القناة الرياضية المغربية (SNRT)</td><td ${TD}>SNRT تنقل عادةً مباريات منتخب المغرب مجاناً</td></tr>
<tr><td ${TD}>الجزائر</td><td ${TD}>beIN Sports + التلفزيون الجزائري</td><td ${TD}>جرت العادة أن ينقل التلفزيون الجزائري بعض مباريات الخضر مجاناً</td></tr>
<tr><td ${TD}>قطر</td><td ${TD}>beIN Sports (المقر الرئيسي في الدوحة)</td><td ${TD}>تغطية كاملة بالعربية والإنجليزية والفرنسية</td></tr>
<tr><td ${TD}>السعودية</td><td ${TD}>beIN Sports</td><td ${TD}>جميع المباريات عبر باقات beIN SPORTS MAX</td></tr>
<tr><td ${TD}>الولايات المتحدة</td><td ${TD}>FOX و FS1 (إنجليزي) — Telemundo و Universo و Peacock (إسباني)</td><td ${TD}>جميع المباريات الـ104 متاحة عبر الشبكتين</td></tr>
</tbody>
</table>

<h2>مواعيد أبرز مباريات المنتخبات العربية</h2>
<p>فيما يلي أبرز المباريات القادمة لأصحاب المنتخبات العربية، بتوقيت القاهرة ومكة المكرمة (وهما متطابقان). المواعيد قابلة للتعديل، ويُرجى تأكيدها عبر beIN Sports قبل كل مباراة:</p>
<table ${T}>
<thead><tr><th ${TH}>اليوم والتاريخ</th><th ${TH}>المباراة</th><th ${TH}>التوقيت (القاهرة/مكة)</th><th ${TH}>القناة</th></tr></thead>
<tbody>
<tr><td ${TD}>الاثنين 15 يونيو</td><td ${TD}>بلجيكا × مصر</td><td ${TD}>10:00 مساءً</td><td ${TD}>beIN Sports MAX</td></tr>
<tr><td ${TD}>الثلاثاء 16 يونيو</td><td ${TD}>السعودية × أوروغواي</td><td ${TD}>1:00 صباحاً</td><td ${TD}>beIN Sports MAX</td></tr>
<tr><td ${TD}>الأحد 21 يونيو</td><td ${TD}>إسبانيا × السعودية</td><td ${TD}>7:00 مساءً</td><td ${TD}>beIN Sports MAX</td></tr>
<tr><td ${TD}>السبت 27 يونيو</td><td ${TD}>مصر × إيران</td><td ${TD}>6:00 صباحاً</td><td ${TD}>beIN Sports MAX</td></tr>
</tbody>
</table>
<p>أما مباريات منتخبي المغرب والجزائر فتُعرض كاملةً عبر beIN Sports، وتُتاح مواعيدها الرسمية تباعاً على شاشة الشبكة وموقعها.</p>

<h2>كيف تتابع المباريات؟</h2>
<ul>
<li>الاشتراك في باقات beIN SPORTS عبر القمر الصناعي أو تطبيق beIN CONNECT في الدول العربية.</li>
<li>في أمريكا: قنوات FOX وFS1 على شبكات الكابل، أو تطبيق FOX Sports وخدمة Peacock للبث الإسباني.</li>
<li>متابعة القنوات المفتوحة (مثل SNRT في المغرب) لمباريات المنتخب الوطني عند توفرها.</li>
</ul>
<blockquote>الاعتماد على المصادر الرسمية يضمن جودة عالية ومتابعة قانونية وآمنة دون مخاطر.</blockquote>

<h2>تحذير من المصادر غير الموثوقة</h2>
<p>تنتشر مواقع وتطبيقات تدّعي بث المباريات مجاناً، لكنها قد تعرّض جهازك للاختراق أو تقدّم بثاً متقطعاً ومنخفض الجودة. ننصح دائماً بالابتعاد عنها والاعتماد على القنوات والمنصات الرسمية المرخّصة.</p>

<h2>الخلاصة</h2>
<p>تبقى beIN Sports الناقل الرسمي لكأس العالم 2026 في مصر والمغرب والجزائر وقطر والسعودية، بينما تتولى FOX وTelemundo التغطية في الولايات المتحدة. تابع جدول المواعيد أعلاه وراجع القناة الرسمية في بلدك لتأكيد التوقيت الدقيق لكل مباراة.</p>
`.trim();

const tvPatch = {
  title: "القنوات الناقلة لكأس العالم 2026 ومواعيد المباريات في مصر والمغرب والجزائر وأمريكا والخليج",
  excerpt:
    "دليل محدّث للقنوات الناقلة لكأس العالم 2026 ومواعيد المباريات في مصر والمغرب والجزائر وأمريكا وقطر والسعودية، مع جدول مباريات المنتخبات العربية والقنوات الرسمية.",
  category: "الرياضة",
  content: tvContent,
  tags: ["القنوات الناقلة", "كأس العالم 2026", "beIN Sports", "مواعيد المباريات"],
  keywords: [
    "القنوات الناقلة لكأس العالم 2026",
    "مواعيد مباريات كأس العالم 2026",
    "beIN Sports كأس العالم",
    "موعد مباراة مصر اليوم",
    "بث مباشر كأس العالم",
    "قنوات كأس العالم المفتوحة",
    "تردد beIN Sports MAX",
    "كأس العالم 2026 المغرب الجزائر السعودية",
  ],
  status: "published",
};

/* ============================================================
   2) مقال إنجليزي جديد — جدول ومواعيد وقنوات كأس العالم
   ============================================================ */
const enArticle = {
  title: "FIFA World Cup 2026 Schedule and TV Channels: How to Watch in the USA and Around the World",
  category: "الرياضة",
  image:
    "https://images.unsplash.com/photo-1731870881782-1948058d9ce1?w=1280&q=75&auto=format&fit=crop",
  excerpt:
    "Your complete guide to the FIFA World Cup 2026 schedule and TV channels: how to watch in the USA on FOX and Telemundo, plus official broadcasters worldwide and key fixtures.",
  tags: ["World Cup 2026", "TV channels", "schedule"],
  keywords: [
    "FIFA World Cup 2026 schedule",
    "World Cup 2026 TV channels",
    "how to watch World Cup 2026 in USA",
    "FOX Sports World Cup 2026",
    "Telemundo World Cup 2026",
    "World Cup 2026 fixtures and times",
    "World Cup 2026 broadcasters list",
  ],
  status: "published",
  author: "Trendora Team",
  content: `
<p>The FIFA World Cup 2026, hosted across the United States, Canada and Mexico, is the biggest edition in history with 48 teams and 104 matches. This guide breaks down the official TV channels and how to watch every match live in the USA and around the world, along with key upcoming fixtures and kickoff times.</p>

<h2>How to watch the World Cup 2026 in the USA</h2>
<p>In the United States, broadcast rights are split between two networks. FOX Sports holds the English-language rights and airs all 104 matches across <strong>FOX</strong> (70 matches) and <strong>FS1</strong> (34 matches), with live streaming on the FOX Sports App and FOX One. Telemundo provides the Spanish-language coverage across <strong>Telemundo</strong>, <strong>Universo</strong> and the <strong>Peacock</strong> streaming service.</p>
<ul>
<li><strong>English:</strong> FOX, FS1, FOX Sports App, FOX One (4K available).</li>
<li><strong>Spanish:</strong> Telemundo, Universo, Peacock and the Telemundo App.</li>
</ul>

<h2>Official broadcasters around the world</h2>
<p>Each region has its own rights holder. Here is a quick reference for major markets:</p>
<table ${T}>
<thead><tr><th ${THC}>Country / Region</th><th ${THC}>Official Broadcaster</th></tr></thead>
<tbody>
<tr><td ${TDC}>United States</td><td ${TDC}>FOX & FS1 (English), Telemundo / Universo / Peacock (Spanish)</td></tr>
<tr><td ${TDC}>MENA (Egypt, Saudi Arabia, Qatar, Morocco, Algeria, etc.)</td><td ${TDC}>beIN Sports</td></tr>
<tr><td ${TDC}>United Kingdom</td><td ${TDC}>BBC & ITV</td></tr>
<tr><td ${TDC}>Mexico</td><td ${TDC}>TelevisaUnivision & TV Azteca</td></tr>
<tr><td ${TDC}>France</td><td ${TDC}>M6 & beIN Sports</td></tr>
<tr><td ${TDC}>Canada</td><td ${TDC}>TSN / CTV (English), RDS (French)</td></tr>
<tr><td ${TDC}>India</td><td ${TDC}>Zee Network</td></tr>
</tbody>
</table>

<h2>Key upcoming fixtures (Eastern Time)</h2>
<p>Below are some of the most anticipated upcoming group-stage matches. All times are U.S. Eastern Time (ET) and may be subject to change, so always confirm with the official broadcaster:</p>
<table ${T}>
<thead><tr><th ${THC}>Date</th><th ${THC}>Match</th><th ${THC}>Time (ET)</th><th ${THC}>USA Channel</th></tr></thead>
<tbody>
<tr><td ${TDC}>Mon, Jun 15</td><td ${TDC}>Belgium vs. Egypt</td><td ${TDC}>3:00 PM</td><td ${TDC}>Telemundo / Peacock</td></tr>
<tr><td ${TDC}>Mon, Jun 15</td><td ${TDC}>Saudi Arabia vs. Uruguay</td><td ${TDC}>6:00 PM</td><td ${TDC}>Telemundo / Peacock</td></tr>
<tr><td ${TDC}>Sun, Jun 21</td><td ${TDC}>Spain vs. Saudi Arabia</td><td ${TDC}>12:00 PM</td><td ${TDC}>Telemundo / Peacock</td></tr>
<tr><td ${TDC}>Fri, Jun 26</td><td ${TDC}>Egypt vs. Iran</td><td ${TDC}>11:00 PM</td><td ${TDC}>Universo / Peacock</td></tr>
</tbody>
</table>

<h2>Tips for the best viewing experience</h2>
<ul>
<li>Check your local listings, as kickoff times shift with venues across U.S., Canadian and Mexican host cities.</li>
<li>Use the official streaming apps (FOX Sports, Peacock, beIN CONNECT) for on-the-go viewing.</li>
<li>Avoid illegal streams; they are low quality and pose security risks.</li>
</ul>
<blockquote>Sticking to official broadcasters guarantees high quality, reliable streams and a safe, legal viewing experience.</blockquote>

<h2>Conclusion</h2>
<p>Whether you are watching in the USA on FOX and Telemundo, in the MENA region on beIN Sports, or anywhere else in the world, the FIFA World Cup 2026 is more accessible than ever. Bookmark this guide and check the fixtures table to never miss a match.</p>
`.trim(),
};

/* ============================================================
   3) مقال أسعار الذهب (عربي) — محتوى محدّث + عنوان جديد
   ============================================================ */
const GOLD_TITLE_MATCH = "أسعار الذهب";
const goldContent = `
<p>يترقب المستثمرون والمقبلون على الزواج أسعار الذهب اليوم الأحد 14 يونيو 2026 في مصر ودول الخليج، وسط تذبذب في الأسواق العالمية. في هذا التقرير نرصد أحدث الأسعار للأعيرة المختلفة، ونوضّح العوامل المؤثرة ونصائح ذكية قبل الشراء.</p>

<h2>أسعار الذهب اليوم في مصر</h2>
<p>جاءت أسعار الذهب في سوق الصاغة المصرية اليوم (بدون احتساب المصنعية) على النحو التالي:</p>
<table ${T}>
<thead><tr><th ${TH}>العيار</th><th ${TH}>السعر (جنيه مصري / جرام)</th></tr></thead>
<tbody>
<tr><td ${TD}>عيار 24</td><td ${TD}>نحو 7171 جنيهاً</td></tr>
<tr><td ${TD}>عيار 21 (الأكثر تداولاً)</td><td ${TD}>نحو 6275 جنيهاً</td></tr>
<tr><td ${TD}>عيار 18</td><td ${TD}>نحو 5379 جنيهاً</td></tr>
<tr><td ${TD}>الجنيه الذهب (8 جرامات)</td><td ${TD}>نحو 50240 جنيهاً</td></tr>
</tbody>
</table>
<p>تُضاف المصنعية (غالباً بين 120 و250 جنيهاً للجرام في عيار 21) إلى السعر عند شراء المشغولات، وتختلف باختلاف التاجر والمحافظة.</p>

<h2>أسعار الذهب اليوم في دول الخليج</h2>
<p>فيما يلي متوسط أسعار جرام الذهب في أبرز دول الخليج بحسب أحدث البيانات المتاحة (الأسعار تقريبية وقابلة للتغيّر خلال اليوم):</p>
<table ${T}>
<thead><tr><th ${TH}>الدولة</th><th ${TH}>عيار 24</th><th ${TH}>عيار 22</th><th ${TH}>عيار 21</th></tr></thead>
<tbody>
<tr><td ${TD}>السعودية (ريال)</td><td ${TD}>≈ 534</td><td ${TD}>≈ 488</td><td ${TD}>≈ 466</td></tr>
<tr><td ${TD}>الإمارات (درهم)</td><td ${TD}>≈ 505</td><td ${TD}>≈ 469</td><td ${TD}>≈ 450</td></tr>
<tr><td ${TD}>قطر (ريال)</td><td ${TD}>≈ 517.5</td><td ${TD}>≈ 477</td><td ${TD}>≈ 452.5</td></tr>
</tbody>
</table>
<p>تتأثر الأسعار في الخليج بسعر الأونصة عالمياً مباشرةً، مع فروقات بسيطة بين الدول بسبب ضريبة القيمة المضافة وهوامش التجار.</p>

<h2>ما الذي يحرّك أسعار الذهب؟</h2>
<p>لا يتحرك سعر الذهب بشكل عشوائي، بل يخضع لمجموعة من العوامل المتداخلة، أبرزها:</p>
<ul>
<li>سعر الأونصة عالمياً وحركة الدولار الأمريكي مقابل العملات.</li>
<li>قرارات أسعار الفائدة من البنوك المركزية الكبرى.</li>
<li>معدلات التضخم والأوضاع الجيوسياسية حول العالم.</li>
<li>العرض والطلب المحلي وسعر صرف العملة في كل دولة.</li>
</ul>

<h2>نصائح قبل شراء الذهب اليوم</h2>
<ul>
<li>قارن الأسعار بين أكثر من محل موثوق قبل الشراء.</li>
<li>اطلب فاتورة رسمية توضّح الوزن والعيار وقيمة المصنعية.</li>
<li>فرّق بين شراء الذهب للزينة وشرائه بهدف الاستثمار والادخار.</li>
<li>راجع تحديث الأسعار اللحظي، فهي تتغيّر أكثر من مرة خلال اليوم.</li>
</ul>
<blockquote>الذهب أداة ادخار طويلة الأمد؛ القرارات المتسرعة وقت تقلّب الأسعار غالباً ما تكون الأقل ربحاً.</blockquote>

<h2>الخلاصة</h2>
<p>استقرّ سعر عيار 21 في مصر اليوم عند نحو 6275 جنيهاً، بينما تراوحت أسعار الخليج وفق حركة الأونصة عالمياً. تبقى متابعة الأسعار اللحظية من مصادر موثوقة هي الأساس قبل أي عملية شراء أو بيع. علماً بأن الأسعار الواردة استرشادية وقد تتغيّر.</p>
`.trim();

const goldPatch = {
  title: "أسعار الذهب اليوم الأحد 14 يونيو 2026 في مصر ودول الخليج",
  excerpt:
    "أسعار الذهب اليوم الأحد 14 يونيو 2026 في مصر ودول الخليج لجميع الأعيرة (24 و21 و18)، مع العوامل المؤثرة ونصائح قبل الشراء.",
  category: "أسعار الذهب والعملات",
  content: goldContent,
  tags: ["أسعار الذهب", "الذهب اليوم", "مصر", "الخليج"],
  keywords: [
    "أسعار الذهب اليوم",
    "سعر الذهب اليوم في مصر",
    "سعر الذهب عيار 21",
    "أسعار الذهب في السعودية",
    "سعر جرام الذهب اليوم",
    "أسعار الذهب في الإمارات وقطر",
    "سعر الذهب 14 يونيو 2026",
  ],
  status: "published",
};

/* ---------- أدوات الشبكة ---------- */
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

async function listAll(cookie) {
  const res = await fetch(`${SITE_URL}/api/admin/articles`, { headers: { Cookie: cookie } });
  if (!res.ok) throw new Error(`تعذّر جلب المقالات (${res.status})`);
  return (await res.json()).articles || [];
}

async function updateArticle(cookie, id, patch) {
  const res = await fetch(`${SITE_URL}/api/admin/articles/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(patch),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`(${res.status}) ${data.error || "خطأ"}`);
  return data.article;
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

/* ---------- التشغيل ---------- */
(async () => {
  console.log(`\n  الموقع: ${SITE_URL}\n`);
  const cookie = await login();
  console.log("  ✓ تم تسجيل الدخول.\n");

  const all = await listAll(cookie);
  const findBy = (s) => all.find((a) => (a.title || "").includes(s));

  // 1) تعديل مقال القنوات الناقلة
  const tv = findBy(TV_TITLE_MATCH);
  if (tv) {
    const u = await updateArticle(cookie, tv.id, tvPatch);
    console.log(`  ✓ تم تعديل مقال القنوات الناقلة: ${u.title}`);
    console.log(`        ${SITE_URL}/article/${encodeURIComponent(u.slug)}`);
  } else {
    console.error("  ✗ لم يُعثر على مقال القنوات الناقلة.");
  }

  // 2) إنشاء المقال الإنجليزي
  const en = await createArticle(cookie, enArticle);
  console.log(`  ✓ تم إنشاء المقال الإنجليزي: ${en.title}`);
  console.log(`        ${SITE_URL}/article/${encodeURIComponent(en.slug)}`);

  // 3) تعديل مقال الذهب
  const gold = findBy(GOLD_TITLE_MATCH);
  if (gold) {
    const u = await updateArticle(cookie, gold.id, goldPatch);
    console.log(`  ✓ تم تعديل مقال الذهب: ${u.title}`);
    console.log(`        ${SITE_URL}/article/${encodeURIComponent(u.slug)}`);
  } else {
    console.error("  ✗ لم يُعثر على مقال أسعار الذهب.");
  }

  console.log(`\n  انتهى. خريطة الموقع: ${SITE_URL}/sitemap.xml\n`);
})().catch((err) => {
  console.error(`\n  ✗ ${err.message}\n`);
  process.exit(1);
});
