/**
 * نشر مقال «رابط التقديم لرياض الأطفال والصف الأول الابتدائي 2026».
 * البيانات من مصادر رسمية منشورة (المصري اليوم + وزارة التربية والتعليم) يونيو 2026.
 *
 * الاستخدام (PowerShell):
 *   $env:ADMIN_PASSWORD="كلمة_المرور"; node scripts/publish-tansik.mjs
 */

const SITE_URL = (process.env.SITE_URL || "https://trendora1.com").replace(/\/$/, "");
const ADMIN_USER = process.env.ADMIN_USER || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

if (!ADMIN_PASSWORD) {
  console.error('\n  ✗ حدّد كلمة المرور: $env:ADMIN_PASSWORD="..."; node scripts/publish-tansik.mjs\n');
  process.exit(1);
}

const T = 'style="width:100%;border-collapse:collapse;margin:8px 0 24px;font-size:1rem"';
const TH = 'style="border:1px solid #e2e8f0;padding:10px 12px;background:#f1f5f9;font-weight:700;text-align:right"';
const TD = 'style="border:1px solid #e2e8f0;padding:10px 12px;text-align:right"';
const LINK = "https://tansikgprim.emis.gov.eg/#/pages/login";

const content = `
<p>أعلنت وزارة التربية والتعليم عن فتح باب التقديم الإلكتروني لرياض الأطفال (KG1) والصف الأول الابتدائي للعام الدراسي 2026/2027 عبر بوابة مركز معلومات الوزارة. في هذا الدليل نوضّح رابط التقديم الرسمي، والمواعيد، وشروط السن، والمستندات المطلوبة، وخطوات التسجيل بالتفصيل.</p>

<h2>رابط التقديم الرسمي</h2>
<p>يتم التسجيل إلكترونياً فقط عبر البوابة الرسمية لوزارة التربية والتعليم. اضغط على الرابط التالي للانتقال مباشرةً إلى صفحة التقديم:</p>
<p><a href="${LINK}" target="_blank" rel="noopener">رابط التقديم لرياض الأطفال والصف الأول الابتدائي 2026</a></p>
<p>ننصح بالدخول من متصفح حديث وتسجيل البيانات بدقة، وعدم التوجه إلى المدرسة قبل استكمال التسجيل الإلكتروني.</p>

<h2>مواعيد التقديم 2026</h2>
<table ${T}>
<thead><tr><th ${TH}>نوع المدارس</th><th ${TH}>بداية التقديم</th><th ${TH}>نهاية التقديم</th></tr></thead>
<tbody>
<tr><td ${TD}>الحكومية والرسمية لغات</td><td ${TD}>1 يونيو 2026</td><td ${TD}>30 يونيو 2026</td></tr>
<tr><td ${TD}>الخاصة والدولية واليابانية</td><td ${TD}>4 يونيو 2026</td><td ${TD}>9 يوليو 2026</td></tr>
</tbody>
</table>

<h2>شروط السن (تُحتسب في 1 أكتوبر 2026)</h2>
<ul>
<li><strong>رياض الأطفال KG1:</strong> ألا يقل عمر الطفل عن 4 سنوات، وألا يزيد على 6 سنوات إلا يوماً واحداً.</li>
<li><strong>الصف الأول الابتدائي:</strong> ألا يقل عمر الطفل عن 6 سنوات، وألا يزيد على 9 سنوات.</li>
<li>الالتزام بالتوزيع الجغرافي ومحل سكن ولي الأمر وفقاً لبطاقة الرقم القومي.</li>
</ul>

<h2>المستندات المطلوبة</h2>
<p>بعد القبول المبدئي إلكترونياً، يُجهّز ولي الأمر المستندات التالية لاستكمال الإجراءات بالمدرسة:</p>
<ul>
<li>أصل شهادة ميلاد الطفل المميكنة + 5 صور منها.</li>
<li>4 صور شخصية حديثة للطفل.</li>
<li>صورة سارية من بطاقة الرقم القومي لولي الأمر.</li>
<li>طابع نقابة المهن التعليمية وطابع دعم وتمويل المشروعات.</li>
<li>البطاقة الصحية للطفل.</li>
<li>ملف تقديم بلاستيكي.</li>
</ul>

<h2>خطوات التسجيل الإلكتروني</h2>
<ul>
<li>الدخول إلى رابط التقديم الرسمي الموضّح أعلاه.</li>
<li>إنشاء حساب أو تسجيل الدخول بالرقم القومي لولي الأمر.</li>
<li>إدخال بيانات الطفل والرقم القومي بدقة.</li>
<li>اختيار المرحلة (رياض أطفال أو الصف الأول) والمدرسة ضمن النطاق الجغرافي.</li>
<li>مراجعة البيانات وتأكيد الطلب وحفظ رقم التقديم.</li>
</ul>
<blockquote>التسجيل الإلكتروني خطوة إلزامية قبل التوجه إلى المدرسة؛ احرص على دقة البيانات والالتزام بالمواعيد لتجنب رفض الطلب.</blockquote>

<h2>فيديو: طريقة التقديم لرياض الأطفال والصف الأول الابتدائي 2026 خطوة بخطوة</h2>
<p>لمزيد من التوضيح، يشرح الفيديو التالي خطوات التقديم والتسجيل الإلكتروني بالتفصيل:</p>
<div class="video-embed"><iframe src="https://www.youtube.com/embed/JZKx2cw6UNE" title="طريقة التقديم لرياض الأطفال والصف الأول الابتدائي 2026 خطوة بخطوة" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>

<h2>الخلاصة</h2>
<p>يبدأ التقديم لرياض الأطفال والصف الأول الابتدائي للمدارس الحكومية من 1 وحتى 30 يونيو 2026 عبر البوابة الرسمية لوزارة التربية والتعليم. جهّز المستندات مبكراً وسجّل عبر الرابط الرسمي، وتابع موقع الوزارة لأي تحديثات. علماً بأن المواعيد والشروط قد تخضع لتعديلات رسمية، لذا يُرجى تأكيدها من المصدر الرسمي.</p>
`.trim();

const article = {
  title: "رابط التقديم لرياض الأطفال والصف الأول الابتدائي 2026.. الموعد والشروط والمستندات",
  category: "التعليم",
  image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1280&q=75&auto=format&fit=crop",
  excerpt:
    "رابط التقديم الرسمي لرياض الأطفال والصف الأول الابتدائي 2026، ومواعيد التسجيل الإلكتروني وشروط السن والمستندات المطلوبة وخطوات التقديم عبر بوابة وزارة التربية والتعليم.",
  tags: ["رياض الأطفال", "الصف الأول الابتدائي", "التقديم 2026", "وزارة التربية والتعليم"],
  keywords: [
    "رابط التقديم لرياض الأطفال 2026",
    "تقديم الصف الأول الابتدائي 2026",
    "تنسيق رياض الأطفال 2026",
    "موعد التقديم للمدارس 2026",
    "المستندات المطلوبة للتقديم رياض الأطفال",
    "شروط سن القبول بالصف الأول الابتدائي",
    "بوابة مركز معلومات وزارة التربية والتعليم",
    "tansikgprim emis gov eg",
  ],
  status: "published",
  author: "فريق التحرير",
  content,
};

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

  const res = await fetch(`${SITE_URL}/api/admin/articles`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(article),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`(${res.status}) ${data.error || "خطأ"}`);
  console.log(`  ✓ نُشر المقال: ${data.article.title}`);
  console.log(`        ${SITE_URL}/article/${encodeURIComponent(data.article.slug)}\n`);
})().catch((err) => {
  console.error(`\n  ✗ ${err.message}\n`);
  process.exit(1);
});
