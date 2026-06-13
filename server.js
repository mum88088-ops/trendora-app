import express from "express";
import session from "express-session";
import multer from "multer";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { createStore } from "./lib/store.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "trendora2026";
const SESSION_SECRET = process.env.SESSION_SECRET || "trendora-secret-change-me";
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();
const OPENAI_MODEL = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();
const GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-2.0-flash").trim();
const GEMINI_FALLBACK_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite"];
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

/* ---------- password hashing (scrypt) ---------- */
function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return { hash, salt };
}
function verifyPasswordHash(password, hash, salt) {
  if (!hash || !salt) return false;
  const candidate = crypto.scryptSync(String(password), salt, 64).toString("hex");
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** يتحقق من كلمة المرور: المخزّنة في الإعدادات لها الأولوية، وإلا متغيّر البيئة */
async function checkPassword(password) {
  const settings = await store.getSettings();
  if (settings.passwordHash && settings.passwordSalt) {
    return verifyPasswordHash(password, settings.passwordHash, settings.passwordSalt);
  }
  return password === ADMIN_PASSWORD;
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

/* الإعدادات العامة (أقسام + إعلانات) — تُستخدم في الواجهة */
app.get(
  "/api/settings",
  wrap(async (req, res) => {
    const s = await store.getSettings();
    res.set("Cache-Control", "no-store");
    res.json({
      categories: s.categories,
      homepageCount: s.homepageCount,
      adsense: {
        clientId: s.adsense.clientId || "",
        verification: s.adsense.verification || "",
        headCode: s.adsense.headCode || "",
        inArticleCode: s.adsense.inArticleCode || "",
      },
    });
  })
);

/* ============================================================
   AUTH API
   ============================================================ */
app.post(
  "/api/login",
  wrap(async (req, res) => {
    const { password } = req.body || {};
    if (await checkPassword(password)) {
      req.session.isAdmin = true;
      return res.json({ ok: true });
    }
    res.status(401).json({ error: "كلمة المرور غير صحيحة" });
  })
);

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

/* ---------- settings management (protected) ---------- */
app.get(
  "/api/admin/settings",
  requireAuth,
  wrap(async (req, res) => {
    const s = await store.getSettings();
    res.json({
      categories: s.categories,
      homepageCount: s.homepageCount,
      adsense: s.adsense,
      hasCustomPassword: Boolean(s.passwordHash),
    });
  })
);

app.put(
  "/api/admin/settings",
  requireAuth,
  wrap(async (req, res) => {
    const { categories, homepageCount, adsense } = req.body || {};
    const patch = {};

    if (Array.isArray(categories)) {
      const clean = categories
        .map((c) => ({
          name: String(c.name || "").trim(),
          icon: String(c.icon || "📌").trim().slice(0, 4) || "📌",
        }))
        .filter((c) => c.name);
      // إزالة التكرار حسب الاسم
      const seen = new Set();
      patch.categories = clean.filter((c) => {
        if (seen.has(c.name)) return false;
        seen.add(c.name);
        return true;
      });
      if (!patch.categories.length) {
        return res.status(400).json({ error: "يجب إبقاء قسم واحد على الأقل" });
      }
    }

    if (homepageCount !== undefined) {
      const n = Math.max(1, Math.min(12, Number(homepageCount) || 4));
      patch.homepageCount = n;
    }

    if (adsense && typeof adsense === "object") {
      patch.adsense = {
        clientId: String(adsense.clientId || "").trim(),
        verification: String(adsense.verification || "").trim(),
        headCode: String(adsense.headCode || ""),
        inArticleCode: String(adsense.inArticleCode || ""),
      };
    }

    const saved = await store.saveSettings(patch);
    res.json({
      categories: saved.categories,
      homepageCount: saved.homepageCount,
      adsense: saved.adsense,
    });
  })
);

app.post(
  "/api/admin/password",
  requireAuth,
  wrap(async (req, res) => {
    const { current, next } = req.body || {};
    if (!next || String(next).length < 6) {
      return res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" });
    }
    if (!(await checkPassword(current))) {
      return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
    }
    const { hash, salt } = hashPassword(next);
    await store.saveSettings({ passwordHash: hash, passwordSalt: salt });
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

const AI_FETCH_TIMEOUT_MS = 120_000;

function fetchWithTimeout(url, options = {}, ms = AI_FETCH_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

function friendlyAiError(provider, status, errText) {
  const lower = String(errText).toLowerCase();
  if (status === 429 || lower.includes("quota") || lower.includes("insufficient_quota")) {
    return provider === "openai"
      ? "رصيد OpenAI منتهٍ. استخدم Google Gemini (مجاني) أو أضف رصيداً من platform.openai.com/account/billing"
      : "تجاوزت حد استخدام Gemini المجاني. انتظر قليلاً أو جرّب لاحقاً.";
  }
  if (status === 401 || lower.includes("invalid api key") || lower.includes("api key not valid")) {
    return `مفتاح ${provider === "openai" ? "OpenAI" : "Gemini"} غير صالح. تحقق من المفتاح في إعدادات Render.`;
  }
  if (status === 404 || lower.includes("not found") || lower.includes("is not found")) {
    return `نموذج ${provider === "openai" ? "OpenAI" : "Gemini"} غير متاح. جرّب مزوّداً آخر أو حدّث GEMINI_MODEL.`;
  }
  try {
    const parsed = JSON.parse(errText);
    const msg = parsed?.error?.message || parsed?.error?.status;
    if (msg) return `خطأ من ${provider === "openai" ? "OpenAI" : "Gemini"}: ${msg}`;
  } catch {
    /* ignore */
  }
  return `خطأ من ${provider === "openai" ? "OpenAI" : "Gemini"} (${status}): ${String(errText).slice(0, 200)}`;
}

function buildUserPrompt({ topic, category, length }) {
  const wordTarget =
    length === "short" ? "350-500" : length === "long" ? "900-1200" : "550-750";
  return `اكتب مقالاً عربياً كاملاً عن الموضوع التالي: "${topic}".
${category ? `التصنيف: ${category}.` : ""}
الطول المستهدف: ${wordTarget} كلمة تقريباً (لا تتجاوز الحد).

أعد الناتج بصيغة JSON فقط دون أي نص إضافي، بهذا الشكل بالضبط:
{
  "title": "عنوان جذاب ومحسّن لمحركات البحث",
  "excerpt": "وصف موجز من جملة إلى جملتين (ميتا ديسكربشن)",
  "tags": ["وسم1", "وسم2", "وسم3"],
  "content": "محتوى المقال بصيغة HTML باستخدام وسوم <h2> و<h3> و<p> و<ul><li> و<blockquote> فقط. قسّم المقال إلى 4-5 أقسام بعناوين فرعية، وابدأ بفقرة تمهيدية، واختم بخلاصة. لا تضع وسم <h1> ولا <html> أو <body>."
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
  let resp;
  try {
    resp = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
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
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });
  } catch (err) {
    if (err.name === "AbortError") {
      const e = new Error("انتهت مهلة التوليد. جرّب الطول «قصير» أو استخدم Gemini.");
      e.status = 504;
      throw e;
    }
    throw err;
  }
  if (!resp.ok) {
    const errText = await resp.text();
    const e = new Error(friendlyAiError("openai", resp.status, errText));
    e.status = resp.status === 429 ? 402 : 502;
    throw e;
  }
  const json = await resp.json();
  return json.choices?.[0]?.message?.content || "{}";
}

async function generateWithGemini({ userPrompt, model }) {
  const models = [...new Set([model || GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS])];
  let lastErr = "";

  for (const useModel of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      useModel
    )}:generateContent?key=${GEMINI_API_KEY}`;
    try {
      const resp = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: AI_SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json",
            maxOutputTokens: 8192,
          },
        }),
      });
      if (!resp.ok) {
        lastErr = await resp.text();
        if (resp.status === 404) continue;
        const e = new Error(friendlyAiError("gemini", resp.status, lastErr));
        e.status = resp.status === 429 ? 402 : 502;
        throw e;
      }
      const json = await resp.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
      lastErr = JSON.stringify(json).slice(0, 300);
    } catch (err) {
      if (err.name === "AbortError") {
        const e = new Error("انتهت مهلة التوليد. جرّب الطول «قصير» أو انتظر قليلاً.");
        e.status = 504;
        throw e;
      }
      if (err.status) throw err;
      lastErr = err.message;
    }
  }
  const e = new Error(friendlyAiError("gemini", 502, lastErr || "فشل كل النماذج"));
  e.status = 502;
  throw e;
}

// المزوّدات المتاحة (لإظهارها في لوحة التحكم)
app.get("/api/admin/ai/providers", requireAuth, (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({
    providers: [
      { id: "gemini", name: "Google Gemini (مجاني)", available: Boolean(GEMINI_API_KEY), defaultModel: GEMINI_MODEL },
      { id: "openai", name: "OpenAI", available: Boolean(OPENAI_API_KEY), defaultModel: OPENAI_MODEL },
    ],
    // تشخيص آمن: يُظهر فقط هل وصل المفتاح للخادم وطوله (دون كشف القيمة)
    diagnostics: {
      geminiKeyLength: GEMINI_API_KEY.length,
      openaiKeyLength: OPENAI_API_KEY.length,
      envKeysSeen: Object.keys(process.env)
        .filter((k) => /API_KEY|GEMINI|OPENAI/i.test(k))
        .sort(),
    },
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

/* ---------- AI image generation ---------- */
async function imageWithOpenAI(prompt) {
  let resp;
  try {
    resp = await fetchWithTimeout(
    "https://api.openai.com/v1/images/generations",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1792x1024",
      }),
    },
    90_000
  );
  } catch (err) {
    if (err.name === "AbortError") {
      const e = new Error("انتهت مهلة توليد الصورة. جرّب مرة أخرى أو ارفع صورة من الجهاز.");
      e.status = 504;
      throw e;
    }
    throw err;
  }
  if (!resp.ok) {
    const errText = await resp.text();
    const e = new Error(friendlyAiError("openai", resp.status, errText));
    e.status = resp.status === 429 ? 402 : 502;
    throw e;
  }
  const json = await resp.json();
  const imageUrl = json.data?.[0]?.url;
  const b64 = json.data?.[0]?.b64_json;
  if (b64) {
    return { buffer: Buffer.from(b64, "base64"), mimetype: "image/png" };
  }
  if (!imageUrl) {
    const e = new Error("لم يُرجع OpenAI صورة");
    e.status = 502;
    throw e;
  }
  const imgResp = await fetchWithTimeout(imageUrl, {}, 60_000);
  if (!imgResp.ok) {
    const e = new Error("تعذّر تحميل الصورة من OpenAI");
    e.status = 502;
    throw e;
  }
  const buffer = Buffer.from(await imgResp.arrayBuffer());
  const mimetype = imgResp.headers.get("content-type") || "image/png";
  return { buffer, mimetype };
}

async function imageWithGemini(prompt) {
  const imageModels = [
    "gemini-2.0-flash-preview-image-generation",
    "gemini-2.0-flash-exp-image-generation",
  ];
  let lastErr = "";

  for (const model of imageModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${GEMINI_API_KEY}`;
    try {
      const resp = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
          }),
        },
        90_000
      );
      if (!resp.ok) {
        lastErr = await resp.text();
        continue;
      }
      const json = await resp.json();
      const parts = json.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          return {
            buffer: Buffer.from(part.inlineData.data, "base64"),
            mimetype: part.inlineData.mimeType || "image/png",
          };
        }
      }
      lastErr = "لم تُرجع استجابة صورة";
    } catch (err) {
      if (err.name === "AbortError") {
        const e = new Error("انتهت مهلة توليد الصورة. جرّب مرة أخرى أو ارفع صورة من الجهاز.");
        e.status = 504;
        throw e;
      }
      lastErr = err.message;
    }
  }

  const e = new Error(
    friendlyAiError("gemini", 502, lastErr) +
      " — يمكنك رفع صورة من الجهاز أو استخدام OpenAI بعد شحن الرصيد."
  );
  e.status = 502;
  throw e;
}

app.post(
  "/api/admin/ai/image",
  requireAuth,
  wrap(async (req, res) => {
    const { prompt } = req.body || {};
    let { provider } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "يرجى إدخال وصف الصورة" });

    if (!provider) provider = GEMINI_API_KEY ? "gemini" : "openai";
    if (provider === "openai" && !OPENAI_API_KEY) {
      return res.status(400).json({ error: "مفتاح OpenAI غير مضبوط لتوليد الصور." });
    }
    if (provider === "gemini" && !GEMINI_API_KEY) {
      return res.status(400).json({ error: "مفتاح Gemini غير مضبوط لتوليد الصور." });
    }

    const enriched = `${prompt}. صورة واقعية عالية الجودة مناسبة كصورة رئيسية لمقال إخباري، بدون أي نصوص أو حروف مكتوبة على الصورة.`;
    const img =
      provider === "gemini"
        ? await imageWithGemini(enriched)
        : await imageWithOpenAI(enriched);

    const url = await store.saveImage({
      buffer: img.buffer,
      mimetype: img.mimetype,
      originalname: "ai-image.png",
    });
    res.json({ url, provider });
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

/* ---------- HTML pages with AdSense injection ---------- */
const PUBLIC_DIR = path.join(__dirname, "public");
const INJECT_PAGES = new Set([
  "index.html",
  "article.html",
  "about.html",
  "contact.html",
  "privacy.html",
  "terms.html",
]);

async function sendInjectedHtml(res, fileName, next) {
  try {
    const filePath = path.join(PUBLIC_DIR, fileName);
    let html = await fs.promises.readFile(filePath, "utf-8");
    const s = await store.getSettings();
    const ads = s.adsense || {};
    const parts = [];
    if (ads.verification) parts.push(ads.verification);
    if (ads.clientId) {
      parts.push(
        `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads.clientId}" crossorigin="anonymous"></script>`
      );
    }
    if (ads.headCode) parts.push(ads.headCode);
    html = html.replace("<!--ADSENSE_HEAD-->", parts.join("\n"));
    res.type("html").send(html);
  } catch (err) {
    next ? next(err) : res.status(500).send("Error");
  }
}

app.get("/", (req, res, next) => sendInjectedHtml(res, "index.html", next));
app.get("/article/:slug", (req, res, next) =>
  sendInjectedHtml(res, "article.html", next)
);
app.get("/:page.html", (req, res, next) => {
  const file = `${req.params.page}.html`;
  if (INJECT_PAGES.has(file)) return sendInjectedHtml(res, file, next);
  next();
});

/* ---------- dynamic ads.txt (from AdSense client id) ---------- */
app.get("/ads.txt", (req, res, next) => {
  store
    .getSettings()
    .then((s) => {
      const pub = (s.adsense.clientId || "").replace(/^ca-/, "");
      if (pub) {
        res.type("text/plain").send(`google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`);
      } else {
        next();
      }
    })
    .catch(next);
});

/* ---------- static files ---------- */
app.use(express.static(PUBLIC_DIR));

app.listen(PORT, () => {
  console.log(`\n  ✅ Trendora يعمل الآن على: http://localhost:${PORT}`);
  console.log(`  🛠️  لوحة التحكم: http://localhost:${PORT}/admin.html`);
  console.log(`  💾 التخزين: ${store.backend}`);
  if (!OPENAI_API_KEY) {
    console.log("  ⚠️  لتفعيل توليد المقالات بالذكاء الاصطناعي أضف OPENAI_API_KEY\n");
  }
});
