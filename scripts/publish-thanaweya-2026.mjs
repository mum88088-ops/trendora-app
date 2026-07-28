/**
 * مقال: نتيجة الثانوية العامة 2026 نظام حديث + بحث برقم الجلوس.
 * الاستخدام: $env:ADMIN_PASSWORD="كلمة_المرور"; node scripts/publish-thanaweya-2026.mjs
 */
import { run, SITE_URL } from "./_helpers.mjs";

const updated = new Date().toLocaleDateString("ar-EG", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

function searchWidget() {
  return `
<section id="thanaweya-result-search" class="thanaweya-search" aria-label="البحث عن نتيجة الثانوية برقم الجلوس">
  <div class="thanaweya-search-inner">
    <h2 class="thanaweya-search-title">ابحث عن نتيجتك برقم الجلوس</h2>
    <p class="thanaweya-search-hint">أدخل رقم الجلوس كما هو مدون في استمارة الامتحان (نظام حديث).</p>
    <form class="thanaweya-search-form" autocomplete="off">
      <label class="sr-only" for="thanaweyaSeatInput">رقم الجلوس</label>
      <input id="thanaweyaSeatInput" name="seat" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="10" placeholder="مثال: 2001970" required />
      <button type="submit">عرض النتيجة</button>
    </form>
    <div class="thanaweya-search-result" hidden></div>
    <p style="margin-top:12px;text-align:center;font-size:0.92rem;color:#64748b">
      رابط بديل للاستعلام:
      <a class="thanaweya-fallback-link" href="https://moe-gov-eg.pages.dev/?fbclid=IwY2xjawTWB5FleHRuA2FlbQIxMABicmlkETFSNXpFNHNhUEtPTkkxajFmc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHhZU0kSDDpNMlXpfGc2HaWlyc0O8i95HEL5dz9jk-ALxrogKmMX5XTMvfQ9l_aem_iZGEilnL_SUWNanYZFudvA" target="_blank" rel="noopener noreferrer">moe-gov-eg.pages.dev</a>
    </p>
  </div>
</section>`.trim();
}

function articleContent() {
  return `
<p>أعلنّا على ترندورا إمكانية الاستعلام الفوري عن <strong>نتيجة الثانوية العامة 2026 — نظام حديث</strong> عبر رقم الجلوس، مباشرة من داخل هذا المقال. أدخل رقم جلوسك في خانة البحث بالأسفل لمعرفة الاسم والمجموع الكلي وحالة النتيجة.</p>
<p><em>آخر تحديث: ${updated}</em></p>

${searchWidget()}

<h2>ماذا تشمل قاعدة النتائج؟</h2>
<p>تم اعتماد ملف النتيجة الكاملة لنظام الحديث، ويضم أكثر من <strong>919 ألف طالب وطالبة</strong>، مع الحقول التالية لكل رقم جلوس:</p>
<ul>
  <li><strong>رقم الجلوس</strong></li>
  <li><strong>الاسم</strong></li>
  <li><strong>المجموع الكلي</strong></li>
  <li><strong>حالة الطالب</strong> (ناجح دور أول / دور ثان / راسب دور أول / غياب كلي دور أول)</li>
</ul>

<h2>ملخص حالات النتيجة</h2>
<p>حسب البيانات المعتمدة في المصدر:</p>
<ul>
  <li><strong>ناجح دور أول:</strong> 650,909</li>
  <li><strong>دور ثان:</strong> 210,511</li>
  <li><strong>راسب دور أول:</strong> 53,525</li>
  <li><strong>غياب كلي دور أول:</strong> 4,451</li>
</ul>

<h2>كيف تستعلم عن نتيجتك؟</h2>
<ol>
  <li>جهّز <strong>رقم الجلوس</strong> من استمارة الامتحان.</li>
  <li>اكتبه في خانة البحث أعلى المقال.</li>
  <li>اضغط <strong>عرض النتيجة</strong> لترى الاسم والمجموع والحالة فوراً.</li>
</ol>
<p>إذا لم تظهر نتيجة لرقم الجلوس، تأكد من صحة الرقم وأنه ضمن نظام الحديث. يمكنك أيضاً مراجعة مدرستك أو الكنترول المختص.</p>

<h2>ملاحظات مهمة</h2>
<ul>
  <li>الخدمة للاستعلام السريع بالمعلومات الأساسية (الاسم / المجموع / الحالة).</li>
  <li>لا تشارك رقم جلوسك على روابط غير موثوقة.</li>
  <li>ترندورا تعرض البيانات كما وردت في المصدر المعتمد دون تعديل على الدرجات.</li>
</ul>

<blockquote>رقم الجلوس هو مفتاحك للنتيجة — احتفظ به، وابحث من هنا في ثوانٍ.</blockquote>

<h2>الخلاصة</h2>
<p>نتيجة الثانوية العامة 2026 نظام حديث أصبحت متاحة للبحث برقم الجلوس عبر ترندورا. استخدم خانة البحث في أعلى المقال، وتابعنا لأي تحديثات لاحقة حول الدور الثاني والتنسيق.</p>
<p class="thanaweya-source-note">المصدر: ملف نتيجة الثانوية العامة نظام حديث (البيانات الكاملة).</p>
`.trim();
}

const ARTICLES = [
  {
    title: "نتيجة الثانوية العامة 2026 نظام حديث: ابحث برقم الجلوس الآن",
    image: "https://loremflickr.com/1280/720/exam,student,egypt?lock=72026",
    excerpt:
      "استعلم فوراً عن نتيجة الثانوية العامة 2026 نظام حديث برقم الجلوس: الاسم، المجموع الكلي، وحالة النجاح أو الدور الثاني — من داخل ترندورا.",
    tags: [
      "نتيجة الثانوية العامة 2026",
      "نظام حديث",
      "رقم الجلوس",
      "الثانوية العامة",
      "التعليم",
    ],
    keywords: [
      "نتيجة الثانوية العامة 2026",
      "نتيجة الثانوية برقم الجلوس",
      "نتيجة ثانوية عامة نظام حديث",
      "بحث نتيجة الثانوية",
      "مجموع الثانوية العامة 2026",
      "ناجح دور أول الثانوية",
      "دور ثان ثانوية عامة",
    ],
    content: articleContent(),
    category: "التعليم",
  },
];

console.log(`سيتم النشر على: ${SITE_URL}`);
run(ARTICLES, "نتيجة الثانوية 2026 — ");