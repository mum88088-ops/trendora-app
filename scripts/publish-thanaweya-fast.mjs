import { run, SITE_URL } from "./_helpers.mjs";

const SEARCH_URL = "https://moe-gov-eg.pages.dev/?fbclid=IwY2xjawTWB5FleHRuA2FlbQIxMABicmlkETFSNXpFNHNhUEtPTkkxajFmc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHhZU0kSDDpNMlXpfGc2HaWlyc0O8i95HEL5dz9jk-ALxrogKmMX5XTMvfQ9l_aem_iZGEilnL_SUWNanYZFudvA";

const updated = new Date().toLocaleDateString("ar-EG", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

function searchBox() {
  return `
<section class="thanaweya-search" id="thanaweya-result-search" aria-label="الاستعلام عن نتيجة الثانوية العامة 2026">
  <div class="thanaweya-search-inner">
    <h2 class="thanaweya-search-title">نتيجة الثانوية العامة 2026 بالاسم ورقم الجلوس</h2>
    <p class="thanaweya-search-hint">اضغط الزر بالأسفل للانتقال مباشرة إلى صفحة الاستعلام برقم الجلوس أو الاسم.</p>
    <p style="margin:18px 0 0;text-align:center">
      <a href="${SEARCH_URL}" target="_blank" rel="noopener noreferrer"
         style="display:inline-block;background:#1e3a8a;color:#fff;font-weight:800;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:1.15rem">
        استعلم الآن عن نتيجتك
      </a>
    </p>
    <p style="margin-top:12px;text-align:center;font-size:0.95rem;color:#64748b">
      أو افتح الرابط المباشر:
      <a href="${SEARCH_URL}" target="_blank" rel="noopener noreferrer">moe-gov-eg.pages.dev</a>
    </p>
  </div>
</section>`.trim();
}

function content() {
  const base = SEARCH_URL.split("?")[0];
  return `
<p><strong>نتيجة الثانوية العامة 2026</strong> متاحة الآن للاستعلام <strong>بالاسم ورقم الجلوس</strong>. من خلال ترندورا يمكنك الانتقال فوراً إلى واجهة البحث ومعرفة نتيجتك خلال ثوانٍ.</p>
<p><em>آخر تحديث: ${updated}</em></p>

${searchBox()}

<h2>رابط نتيجة الثانوية العامة 2026 برقم الجلوس</h2>
<p>إذا كنت تبحث عن <strong>نتيجة الثانوية العامة 2026 برقم الجلوس</strong> أو <strong>بالاسم</strong>، استخدم زر الاستعلام أعلاه، أو افتح الرابط المباشر هنا:</p>
<p><a href="${SEARCH_URL}" target="_blank" rel="noopener noreferrer"><strong>${base}</strong></a></p>

<h2>كيف تستعلم عن نتيجة الثانوية 2026؟</h2>
<ol>
  <li>اضغط زر <strong>استعلم الآن عن نتيجتك</strong>.</li>
  <li>أدخل <strong>رقم الجلوس</strong> أو <strong>الاسم</strong> كما هو مسجل في استمارة الامتحان.</li>
  <li>اضغط بحث لعرض <strong>المجموع الكلي</strong> وحالة النجاح أو الدور الثاني.</li>
</ol>

<h2>نتيجة الثانوية العامة 2026 بالاسم</h2>
<p>تتيح صفحة الاستعلام البحث أيضاً <strong>بالاسم</strong> لمن نسي رقم الجلوس مؤقتاً. تأكد من كتابة الاسم بالكامل وبشكل صحيح لتجنب النتائج المتشابهة.</p>

<h2>لماذا هذا المقال مهم الآن؟</h2>
<p>مع ضغط البحث الكبير على نتائج الثانوية، يحتاج الطلاب وأولياء الأمور إلى <strong>رابط استعلام مباشر وسريع</strong> بدون تشتيت. جمعنا لك العنوان والكلمات المفتاحية وطريقة الاستعلام في مكان واحد لتصل للنتيجة في أسرع وقت.</p>

<h2>نصائح سريعة بعد ظهور النتيجة</h2>
<ul>
  <li>احتفظ بصورة أو لقطة شاشة من النتيجة.</li>
  <li>راجع المجموع جيداً قبل التفكير في التنسيق.</li>
  <li>إذا ظهرت لك رسالة خطأ، أعد المحاولة بعد دقائق أو راجع المدرسة.</li>
  <li>اعتمد فقط على رابط الاستعلام الموثوق المنشور هنا.</li>
</ul>

<blockquote>أسرع طريقة لمعرفة نتيجتك الآن: رقم الجلوس أو الاسم + زر الاستعلام المباشر من ترندورا.</blockquote>

<h2>الخلاصة</h2>
<p><strong>نتيجة الثانوية العامة 2026 بالاسم ورقم الجلوس</strong> متاحة عبر رابط الاستعلام المباشر. اضغط زر البحث أعلاه الآن، وشارك المقال مع زملائك ليصلوا للنتيجة بسرعة.</p>
`.trim();
}

const ARTICLES = [
  {
    title: "نتيجة الثانوية العامة 2026 بالاسم ورقم الجلوس 2026",
    image: "https://loremflickr.com/1280/720/exam,egypt,students?lock=20260629",
    excerpt:
      "نتيجة الثانوية العامة 2026 بالاسم ورقم الجلوس: رابط استعلام مباشر وسريع لمعرفة المجموع وحالة النجاح خلال ثوانٍ.",
    tags: [
      "نتيجة الثانوية العامة 2026",
      "نتيجة الثانوية برقم الجلوس",
      "نتيجة الثانوية بالاسم",
      "الثانوية العامة 2026",
      "استعلام نتيجة الثانوية",
    ],
    keywords: [
      "نتيجة الثانوية العامة 2026",
      "نتيجة الثانوية العامة 2026 بالاسم ورقم الجلوس",
      "نتيجة الثانوية العامة 2026 برقم الجلوس",
      "نتيجة الثانوية بالاسم 2026",
      "رابط نتيجة الثانوية العامة 2026",
      "استعلام نتيجة الثانوية 2026",
      "ناجح دور أول الثانوية 2026",
      "دور ثان ثانوية عامة 2026",
      "مجموع الثانوية العامة 2026",
      "نتيجة ثانوية عامة نظام حديث",
    ],
    content: content(),
    category: "التعليم",
  },
];

console.log("نشر على:", SITE_URL);
run(ARTICLES, "ثانوية 2026 سريع — ");
