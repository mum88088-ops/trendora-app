# ترندورا Trendora

منصة إخبارية عربية كاملة مع لوحة تحكم وذكاء اصطناعي — جاهزة للتقديم على Google AdSense.

## التشغيل المحلي

```bash
npm install
npm start
```

- **الموقع:** http://localhost:3000
- **لوحة التحكم:** http://localhost:3000/admin.html
- **كلمة المرور الافتراضية:** `trendora2026` (غيّرها في ملف `.env`)

## الإعدادات (ملف `.env`)

| المتغير | الوصف |
|---------|--------|
| `PORT` | منفذ الخادم (افتراضي 3000) |
| `ADMIN_PASSWORD` | كلمة مرور لوحة التحكم |
| `SESSION_SECRET` | سر الجلسات (نص عشوائي طويل) |
| `OPENAI_API_KEY` | مفتاح OpenAI لتوليد المقالات بالذكاء الاصطناعي |
| `SITE_URL` | رابط موقعك النهائي (مثل `https://www.trendora.com`) |

## التخزين: كيف يعمل؟

- **محلياً (على جهازك):** يُحفظ كل شيء في ملف `data/articles.json` والصور في `public/uploads/`. لا حاجة لأي إعداد.
- **عند النشر:** ضع رابط `MONGODB_URI`، فيتحول الموقع تلقائياً لحفظ المقالات والصور في **MongoDB Atlas** بشكل دائم لا يُمسح أبداً.

> لا حاجة لتغيير أي كود — فقط وجود `MONGODB_URI` يبدّل وضع التخزين تلقائياً.

## النشر على الإنترنت (Render + MongoDB Atlas — مجاني)

### الخطوة 1: أنشئ قاعدة بيانات MongoDB Atlas (مجانية)

1. أنشئ حساباً على [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. أنشئ **Cluster** مجانياً (نوع M0).
3. من **Database Access**: أنشئ مستخدماً بكلمة مرور.
4. من **Network Access**: أضف `0.0.0.0/0` (السماح من أي مكان).
5. اضغط **Connect ➝ Drivers** وانسخ رابط الاتصال (Connection String)، وضع فيه كلمة مرور المستخدم. سيبدأ بـ `mongodb+srv://...`.

### الخطوة 2: ارفع المشروع على GitHub

```bash
git init
git add .
git commit -m "Trendora ready for deploy"
git branch -M main
git remote add origin https://github.com/USERNAME/trendora.git
git push -u origin main
```

### الخطوة 3: انشر على Render

1. أنشئ حساباً على [render.com](https://render.com).
2. **New ➝ Web Service** واربط مستودع GitHub.
3. الإعدادات:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. في **Environment** أضف المتغيرات التالية:

   | المتغير | القيمة |
   |---------|--------|
   | `ADMIN_PASSWORD` | كلمة مرور قوية للوحة التحكم |
   | `SESSION_SECRET` | نص عشوائي طويل |
   | `MONGODB_URI` | رابط الاتصال من Atlas |
   | `OPENAI_API_KEY` | مفتاح OpenAI (اختياري) |
   | `SITE_URL` | رابط موقعك النهائي |

5. اضغط **Deploy**. بعد دقائق سيعمل موقعك على رابط مثل `https://trendora.onrender.com`.

### الخطوة 4: اربط الدومين المخصص

1. في Render: **Settings ➝ Custom Domains ➝ Add**، وأدخل دومينك.
2. في لوحة الدومين (Namecheap / GoDaddy / Cloudflare) أضف السجل (CNAME) الذي يعطيك إياه Render.
3. سيفعّل Render شهادة **SSL (HTTPS)** تلقائياً ومجاناً.
4. حدّث متغير `SITE_URL` إلى رابط دومينك الحقيقي.

### بديل: VPS خاص (تحكم كامل)

ارفع المشروع، ثبّت Node.js، شغّل عبر **PM2** (`pm2 start server.js`)، وضع **Nginx** كـ reverse proxy مع شهادة Let's Encrypt. يمكنك حينها استخدام التخزين بملف JSON مباشرة أو MongoDB.

### بعد ربط الدومين

1. أرسل `https://yourdomain.com/sitemap.xml` إلى [Google Search Console](https://search.google.com/search-console).
2. بعد قبول AdSense، حدّث `public/ads.txt` بمعرّف الناشر.

## Google AdSense

1. تأكد من وجود: من نحن، اتصل بنا، سياسة الخصوصية، شروط الاستخدام.
2. انشر **15+ مقالاً أصلياً** عبر لوحة التحكم.
3. فعّل سكربت AdSense في `index.html` و `article.html` (أزل التعليق).
4. حدّث `public/ads.txt` بمعرّف الناشر `pub-XXXXXXXX`.
5. قدّم الموقع من [Google AdSense](https://www.google.com/adsense/).

## هيكل المشروع

```
trendora/
├── server.js          # الخادم الرئيسي + API
├── lib/store.js       # طبقة التخزين (JSON محلياً / MongoDB عند النشر)
├── data/articles.json # المقالات (محلياً) + بيانات أولية تُزرع في MongoDB
├── public/            # الملفات العامة (الموقع)
│   ├── index.html
│   ├── article.html
│   ├── admin.html
│   ├── about.html / contact.html / privacy.html / terms.html
│   └── assets/        # css / js / img + الصور المرفوعة (uploads)
├── Procfile / .nvmrc  # إعدادات النشر
└── .env               # الإعدادات السرية
```

## لوحة التحكم

- إنشاء / تحرير / حذف / إخفاء / نشر المقالات
- رفع صور للمقالات
- توليد مقالات بالذكاء الاصطناعي (يتطلب `OPENAI_API_KEY`)
