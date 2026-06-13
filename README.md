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
| `GEMINI_API_KEY` | مفتاح Google Gemini المجاني لتوليد المقالات (من [AI Studio](https://aistudio.google.com/app/apikey)) |
| `OPENAI_API_KEY` | مفتاح OpenAI لتوليد المقالات (بديل مدفوع) |
| `SITE_URL` | رابط موقعك النهائي (مثل `https://trendora1.com`) |
| `FIREBASE_SERVICE_ACCOUNT_B64` | مفتاح Firebase Service Account مُرمّزاً Base64 (للنشر) |
| `FIREBASE_STORAGE_BUCKET` | حاوية تخزين صور Firebase |

## التخزين: كيف يعمل؟

الموقع يختار طبقة التخزين تلقائياً حسب المتغيرات الموجودة (لا حاجة لتغيير أي كود):

| الأولوية | الشرط | النتيجة |
|----------|--------|---------|
| 1 | وجود `FIREBASE_SERVICE_ACCOUNT_B64` | **Firebase Firestore** (المعتمد للنشر) |
| 2 | وجود `MONGODB_URI` | MongoDB Atlas |
| 3 | لا شيء (محلياً) | ملف `data/articles.json` + صور في `public/uploads/` |

> محلياً على جهازك، اترك المتغيرات فارغة فيعمل بملف JSON بدون أي إعداد. عند النشر، إضافة مفتاح Firebase وحده يحوّل التخزين إلى Firestore.

## النشر على الإنترنت (Render + Firebase Firestore — مجاني)

### الخطوة 1: احصل على مفتاح Firebase Service Account

1. افتح [Firebase Console](https://console.firebase.google.com/) ➝ مشروعك `trendora-data`.
2. اضغط ⚙️ **Project Settings ➝ Service accounts**.
3. اضغط **Generate new private key** ➝ سيُنزّل ملف JSON. **احتفظ به سرياً ولا ترفعه إلى GitHub.**
4. فعّل **Firestore Database** (Build ➝ Firestore Database ➝ Create database ➝ Production mode).
5. فعّل **Storage** (Build ➝ Storage ➝ Get started) لتخزين صور المقالات.

### الخطوة 2: رمّز المفتاح Base64 (سطر واحد)

شغّل في PowerShell (استبدل المسار بمسار ملفك):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\serviceAccount.json")) | Set-Clipboard
```

سيُنسخ الناتج تلقائياً إلى الحافظة — هذا ما ستضعه في `FIREBASE_SERVICE_ACCOUNT_B64`.

### الخطوة 3: ارفع المشروع على GitHub

```bash
git add .
git commit -m "Add Firebase Firestore backend"
git push
```

### الخطوة 4: انشر على Render

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
   | `FIREBASE_SERVICE_ACCOUNT_B64` | الناتج المُرمّز من الخطوة 2 |
   | `FIREBASE_STORAGE_BUCKET` | `trendora-data.firebasestorage.app` |
   | `OPENAI_API_KEY` | مفتاح OpenAI (اختياري) |
   | `SITE_URL` | `https://trendora1.com` |

5. اضغط **Deploy**. بعد دقائق سيعمل موقعك على رابط مثل `https://trendora-app.onrender.com`.

### الخطوة 5: اربط الدومين trendora1.com

1. في Render: **Settings ➝ Custom Domains ➝ Add**، وأدخل `trendora1.com` و`www.trendora1.com`.
2. في لوحة الدومين أضف السجلات التي يعطيك إياها Render (عادة سجل `A` أو `CNAME`).
3. سيفعّل Render شهادة **SSL (HTTPS)** تلقائياً ومجاناً.

### بديل: MongoDB Atlas أو VPS خاص

- **MongoDB:** بدل مفتاح Firebase، أضف `MONGODB_URI` من [MongoDB Atlas](https://www.mongodb.com/atlas) (Cluster مجاني M0، مستخدم بكلمة مرور، Network Access = `0.0.0.0/0`).
- **VPS:** ارفع المشروع، ثبّت Node.js، شغّل عبر **PM2**، وضع **Nginx** + شهادة Let's Encrypt.

### بعد ربط الدومين

1. أرسل `https://trendora1.com/sitemap.xml` إلى [Google Search Console](https://search.google.com/search-console).
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
├── lib/store.js       # طبقة التخزين (Firestore / MongoDB / JSON تلقائياً)
├── data/articles.json # المقالات محلياً + بيانات أولية تُزرع في قاعدة البيانات
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
- توليد مقالات بالذكاء الاصطناعي — يدعم **Google Gemini (مجاني)** و **OpenAI**، مع إمكانية اختيار الأداة عند التوليد (يتطلب `GEMINI_API_KEY` أو `OPENAI_API_KEY`)
