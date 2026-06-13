import express from "express";
import session from "express-session";
import multer from "multer";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createStore } from "./lib/store.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "trendora2026";
const SESSION_SECRET = process.env.SESSION_SECRET || "trendora-secret-change-me";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const MONGODB_URI = process.env.MONGODB_URI || "";
const SITE_URL = (process.env.SITE_URL || "https://trendora1.com").replace(/\/$/, "");

const DATA_FILE = path.join(__dirname, "data", "articles.json");
const UPLOAD_DIR = path.join(__dirname, "public", "uploads");

/* ---------- seed data (used by MongoDB on first run) ---------- */
function loadSeed() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")).articles || [];
  } catch {
    return [];
  }
}

/* ---------- store (JSON locally, MongoDB in production) ---------- */
const store = await createStore({
  dataFile: DATA_FILE,
  uploadDir: UPLOAD_DIR,
  mongoUri: MONGODB_URI,
  seed: loadSeed(),
});

/* ---------- app ---------- */
const app = express();
const isProduction =
  process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);

app.set("trust proxy", 1); // يعمل خلف reverse proxy في الاستضافات (Railway/Render/Nginx)
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true, // ضروري لعمل الكوكيز خلف HTTPS على Render
    name: "trendora.sid",
    cookie: {
      httpOnly: true,
      secure: isProduction, // Secure cookie على HTTPS
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

/* ---------- uploads (multer, in-memory so store decides where to save) ---------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error("الملف يجب أن يكون صورة"));
  },
});

/* ---------- auth middleware ---------- */
function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: "غير مصرح. يرجى تسجيل الدخول." });
}

/* ---------- async route wrapper ---------- */
const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error(err);
    if (err && err.status) {
      return res.status(err.status).json({ error: err.message || "خطأ" });
    }
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  });

/* ============================================================
   PUBLIC API
   ============================================================ */
app.get(
  "/api/articles",
  wrap(async (req, res) => {
    const { category, q } = req.query;
    const articles = await store.listPublished({ category, q });
    res.json({ articles });
  })
);

app.get(
  "/api/articles/:idOrSlug",
  wrap(async (req, res) => {
    const article = await store.getPublic(req.params.idOrSlug);
    if (!article) return res.status(404).json({ error: "المقال غير موجود" });
    res.json({ article });
  })
);

/* ============================================================
   AUTH API
   ============================================================ */
app.post("/api/login", (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: "كلمة المرور غير صحيحة" });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/me", (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

/* ============================================================
   ADMIN API (protected)
   ============================================================ */
app.get(
  "/api/admin/articles",
  requireAuth,
  wrap(async (req, res) => {
    res.json({ articles: await store.listAll() });
  })
);

app.get(
  "/api/admin/articles/:id",
  requireAuth,
  wrap(async (req, res) => {
    const article = await store.getById(req.params.id);
    if (!article) return res.status(404).json({ error: "المقال غير موجود" });
    res.json({ article });
  })
);

app.post(
  "/api/admin/articles",
  requireAuth,
  wrap(async (req, res) => {
    const b = req.body || {};
    if (!b.title || !b.content) {
      return res.status(400).json({ error: "العنوان والمحتوى مطلوبان" });
    }
    const article = await store.create(b);
    res.json({ article });
  })
);

app.put(
  "/api/admin/articles/:id",
  requireAuth,
  wrap(async (req, res) => {
    const article = await store.update(req.params.id, req.body || {});
    if (!article) return res.status(404).json({ error: "المقال غير موجود" });
    res.json({ article });
  })
);

app.patch(
  "/api/admin/articles/:id/status",
  requireAuth,
  wrap(async (req, res) => {
    const { status } = req.body || {};
    if (!["published", "hidden", "draft"].includes(status)) {
      return res.status(400).json({ error: "حالة غير صالحة" });
    }
    const article = await store.setStatus(req.params.id, status);
    if (!article) return res.status(404).json({ error: "المقال غير موجود" });
    res.json({ article });
  })
);

app.delete(
  "/api/admin/articles/:id",
  requireAuth,
  wrap(async (req, res) => {
    const removed = await store.remove(req.params.id);
    if (!removed) return res.status(404).json({ error: "المقال غير موجود" });
    res.json({ ok: true });
  })
);

app.post(
  "/api/admin/upload",
  requireAuth,
  upload.single("image"),
  wrap(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "لم يتم رفع أي صورة" });
    const url = await store.saveImage({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
    });
    res.json({ url });
  })
);

/* ============================================================
   AI GENERATION (protected) — يدعم OpenAI + Google Gemini
   ============================================================ */

const AI_SYSTEM_PROMPT =
  "أنت كاتب محتوى عربي محترف لموقع إخباري اسمه Trendora. " +
  "تكتب مقالات أصلية عالية الجودة ومنسّقة بـ HTML نظيف وجاهزة للنشر ومتوافقة مع سياسات Google AdSense (محتوى أصلي ومفيد، بدون حشو كلمات مفتاحية، بدون محتوى منسوخ).";

function buildUserPrompt({ topic, category, length }) {
  const wordTarget =
    length === "short" ? "400-600" : length === "long" ? "1100-1500" : "700-900";
  return `اكتب مقالاً عربياً كاملاً عن الموضوع التالي: "${topic}".
${category ? `التصنيف: ${category}.` : ""}
الطول المستهدف: ${wordTarget} كلمة تقريباً.

أعد الناتج بصيغة JSON فقط دون أي نص إضافي، بهذا الشكل بالضبط:
{
  "title": "عنوان جذاب ومحسّن لمحركات البحث",
  "excerpt": "وصف موجز من جملة إلى جملتين (ميتا ديسكربشن)",
  "tags": ["وسم1", "وسم2", "وسم3"],
  "content": "محتوى المقال بصيغة HTML باستخدام وسوم <h2> و<h3> و<p> و<ul><li> و<blockquote> فقط. قسّم المقال إلى أقسام واضحة بعناوين فرعية، وابدأ بفقرة تمهيدية، واختم بخلاصة. لا تضع وسم <h1> ولا <html> أو <body>."
}`;
}

function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text).match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function generateWithOpenAI({ userPrompt, model }) {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: model || OPENAI_MODEL,
      messages: [
        { role: "system", content: AI_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    const e = new Error(`خطأ من OpenAI: ${resp.status} ${errText.slice(0, 300)}`);
    e.status = 502;
    throw e;
  }
  const json = await resp.json();
  return json.choices?.[0]?.message?.content || "{}";
}

async function generateWithGemini({ userPrompt, model }) {
  const useModel = model || GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    useModel
  )}:generateContent?key=${GEMINI_API_KEY}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: AI_SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.8, responseMimeType: "application/json" },
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    const e = new Error(`خطأ من Gemini: ${resp.status} ${errText.slice(0, 300)}`);
    e.status = 502;
    throw e;
  }
  const json = await resp.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
}

// المزوّدات المتاحة (لإظهارها في لوحة التحكم)
app.get("/api/admin/ai/providers", requireAuth, (req, res) => {
  res.json({
    providers: [
      { id: "gemini", name: "Google Gemini (مجاني)", available: Boolean(GEMINI_API_KEY), defaultModel: GEMINI_MODEL },
      { id: "openai", name: "OpenAI", available: Boolean(OPENAI_API_KEY), defaultModel: OPENAI_MODEL },
    ],
  });
});

app.post(
  "/api/admin/ai/generate",
  requireAuth,
  wrap(async (req, res) => {
    const { topic, category, length, model } = req.body || {};
    let { provider } = req.body || {};
    if (!topic) return res.status(400).json({ error: "يرجى إدخال موضوع المقال" });

    if (!provider) provider = GEMINI_API_KEY ? "gemini" : "openai";
    if (provider === "openai" && !OPENAI_API_KEY) {
      return res.status(400).json({
        error: "مفتاح OpenAI غير مضبوط. أضف OPENAI_API_KEY في الإعدادات أو اختر Gemini.",
      });
    }
    if (provider === "gemini" && !GEMINI_API_KEY) {
      return res.status(400).json({
        error: "مفتاح Gemini غير مضبوط. أضف GEMINI_API_KEY في الإعدادات أو اختر OpenAI.",
      });
    }

    const userPrompt = buildUserPrompt({ topic, category, length });
    const raw =
      provider === "gemini"
        ? await generateWithGemini({ userPrompt, model })
        : await generateWithOpenAI({ userPrompt, model });

    const parsed = extractJson(raw);
    if (!parsed) {
      return res.status(502).json({ error: "تعذّر تحليل ناتج الذكاء الاصطناعي" });
    }
    res.json({
      title: parsed.title || topic,
      excerpt: parsed.excerpt || "",
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      content: parsed.content || "",
      category: category || "عام",
      provider,
    });
  })
);

/* ---------- serve DB-stored images (MongoDB / Firestore modes) ---------- */
if (store.servesImages) {
  app.get(
    "/uploads/:id",
    wrap(async (req, res) => {
      const img = await store.getImage(req.params.id);
      if (!img) return res.status(404).send("Not found");
      res.set("Content-Type", img.contentType);
      res.set("Cache-Control", "public, max-age=31536000, immutable");
      res.send(img.buffer);
    })
  );
}

/* ---------- dynamic sitemap (includes articles) ---------- */
app.get(
  "/sitemap.xml",
  wrap(async (req, res) => {
    const pages = ["", "about.html", "contact.html", "privacy.html", "terms.html"];
    const published = await store.listPublished({});
    const urls = [
      ...pages.map(
        (p) =>
          `  <url><loc>${SITE_URL}/${p}</loc><changefreq>${p ? "monthly" : "daily"}</changefreq><priority>${p ? "0.6" : "1.0"}</priority></url>`
      ),
      ...published.map(
        (a) =>
          `  <url><loc>${SITE_URL}/article/${encodeURIComponent(a.slug)}</loc><lastmod>${(a.updatedAt || a.createdAt).slice(0, 10)}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`
      ),
    ];
    res.type("application/xml");
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join(
        "\n"
      )}\n</urlset>\n`
    );
  })
);

/* ---------- static files ---------- */
app.use(express.static(path.join(__dirname, "public")));

// nice URL for single article: /article/:slug
app.get("/article/:slug", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "article.html"));
});

app.listen(PORT, () => {
  console.log(`\n  ✅ Trendora يعمل الآن على: http://localhost:${PORT}`);
  console.log(`  🛠️  لوحة التحكم: http://localhost:${PORT}/admin.html`);
  console.log(`  💾 التخزين: ${store.backend}`);
  if (!OPENAI_API_KEY) {
    console.log("  ⚠️  لتفعيل توليد المقالات بالذكاء الاصطناعي أضف OPENAI_API_KEY\n");
  }
});
