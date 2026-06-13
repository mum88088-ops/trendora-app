import fs from "fs";
import path from "path";
import crypto from "crypto";
import { MongoClient, Binary } from "mongodb";

/* ============================================================
   طبقة تخزين موحّدة:
   - محلياً (بدون MONGODB_URI): تستخدم ملف JSON + صور على القرص
   - عند النشر (مع MONGODB_URI): تستخدم MongoDB Atlas للمقالات والصور
   ============================================================ */

function slugify(text) {
  const base = String(text)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "article";
}

function readingTime(html) {
  const text = String(html).replace(/<[^>]+>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function normalize(b, prev = {}) {
  const now = new Date().toISOString();
  const content = b.content ?? prev.content ?? "";
  return {
    id: prev.id || crypto.randomUUID(),
    title: b.title ?? prev.title ?? "",
    excerpt: b.excerpt ?? prev.excerpt ?? "",
    category: b.category ?? prev.category ?? "عام",
    image: b.image ?? prev.image ?? "",
    content,
    tags: Array.isArray(b.tags) ? b.tags : prev.tags ?? [],
    author: b.author ?? prev.author ?? "فريق التحرير",
    status: ["published", "hidden", "draft"].includes(b.status)
      ? b.status
      : prev.status ?? "draft",
    readingTime: readingTime(content),
    createdAt: prev.createdAt || now,
    updatedAt: now,
  };
}

function stripContent(a) {
  const { content, _id, ...rest } = a;
  return rest;
}

/* ---------------- default site settings ---------------- */
const DEFAULT_SETTINGS = {
  categories: [
    { name: "آخر الأخبار", icon: "📰" },
    { name: "التعليم", icon: "🎓" },
    { name: "المعاشات", icon: "👴" },
    { name: "المرتبات والأجور", icon: "💰" },
    { name: "الوظائف والتوظيف", icon: "💼" },
    { name: "الاقتصاد والأسواق", icon: "📈" },
    { name: "أسعار الذهب والعملات", icon: "🪙" },
    { name: "الخدمات الحكومية", icon: "🏛️" },
    { name: "الصحة", icon: "🩺" },
    { name: "التقنية", icon: "💻" },
    { name: "الرياضة", icon: "⚽" },
    { name: "الفن والمشاهير", icon: "🎬" },
    { name: "السيارات", icon: "🚗" },
    { name: "الطقس", icon: "☀️" },
    { name: "أسلوب حياة", icon: "🌿" },
    { name: "عام", icon: "📌" },
  ],
  homepageCount: 4,
  adsense: { clientId: "", verification: "", headCode: "", inArticleCode: "" },
  passwordHash: "",
  passwordSalt: "",
};

function mergeSettings(saved = {}) {
  return {
    categories:
      Array.isArray(saved.categories) && saved.categories.length
        ? saved.categories
        : DEFAULT_SETTINGS.categories,
    homepageCount: Number(saved.homepageCount) || DEFAULT_SETTINGS.homepageCount,
    adsense: { ...DEFAULT_SETTINGS.adsense, ...(saved.adsense || {}) },
    passwordHash: saved.passwordHash || "",
    passwordSalt: saved.passwordSalt || "",
  };
}

/* ---------------- JSON (local) backend ---------------- */
class JsonStore {
  constructor({ dataFile, uploadDir }) {
    this.dataFile = dataFile;
    this.uploadDir = uploadDir;
    this.isMongo = false;
    this.servesImages = false; // الصور تُقدَّم عبر express.static محلياً
    this.backend = "ملف JSON محلي";
    const dir = path.dirname(dataFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    if (!fs.existsSync(dataFile)) {
      fs.writeFileSync(dataFile, JSON.stringify({ articles: [] }, null, 2));
    }
  }
  _read() {
    try {
      return JSON.parse(fs.readFileSync(this.dataFile, "utf-8"));
    } catch {
      return { articles: [] };
    }
  }
  _write(data) {
    fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
  }
  _uniqueSlug(title, currentId = null) {
    const { articles } = this._read();
    const slug = slugify(title);
    let candidate = slug;
    let i = 2;
    while (articles.some((a) => a.slug === candidate && a.id !== currentId)) {
      candidate = `${slug}-${i++}`;
    }
    return candidate;
  }

  async listAll() {
    const { articles } = this._read();
    return articles
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(stripContent);
  }
  async listPublished({ category, q } = {}) {
    let list = this._read().articles.filter((a) => a.status === "published");
    if (category && category !== "all") list = list.filter((a) => a.category === category);
    if (q) {
      const t = String(q).toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(t) ||
          (a.excerpt || "").toLowerCase().includes(t)
      );
    }
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list.map(stripContent);
  }
  async getPublic(idOrSlug) {
    const a = this._read().articles.find(
      (x) => x.id === idOrSlug || x.slug === idOrSlug
    );
    return a && a.status === "published" ? a : null;
  }
  async getById(id) {
    return this._read().articles.find((x) => x.id === id) || null;
  }
  async create(body) {
    const data = this._read();
    const a = normalize(body);
    a.slug = this._uniqueSlug(a.title);
    data.articles.push(a);
    this._write(data);
    return a;
  }
  async update(id, body) {
    const data = this._read();
    const idx = data.articles.findIndex((x) => x.id === id);
    if (idx === -1) return null;
    const prev = data.articles[idx];
    const updated = normalize(body, prev);
    updated.slug =
      body.title && body.title !== prev.title
        ? this._uniqueSlug(updated.title, id)
        : prev.slug;
    data.articles[idx] = updated;
    this._write(data);
    return updated;
  }
  async setStatus(id, status) {
    const data = this._read();
    const idx = data.articles.findIndex((x) => x.id === id);
    if (idx === -1) return null;
    data.articles[idx].status = status;
    data.articles[idx].updatedAt = new Date().toISOString();
    this._write(data);
    return data.articles[idx];
  }
  async remove(id) {
    const data = this._read();
    const idx = data.articles.findIndex((x) => x.id === id);
    if (idx === -1) return null;
    const [removed] = data.articles.splice(idx, 1);
    this._write(data);
    if (removed.image && removed.image.startsWith("/uploads/")) {
      const f = path.join(this.uploadDir, path.basename(removed.image));
      fs.existsSync(f) && fs.unlink(f, () => {});
    }
    return removed;
  }
  async saveImage({ buffer, originalname }) {
    const ext = (path.extname(originalname) || ".jpg").toLowerCase();
    const name = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    fs.writeFileSync(path.join(this.uploadDir, name), buffer);
    return `/uploads/${name}`;
  }
  async getImage() {
    return null; // disk images are served by express.static
  }
  async getSettings() {
    return mergeSettings(this._read().settings || {});
  }
  async saveSettings(partial) {
    const data = this._read();
    const current = mergeSettings(data.settings || {});
    data.settings = { ...current, ...partial };
    this._write(data);
    return data.settings;
  }
  async seedIfEmpty() {
    /* JSON file already seeded from data/articles.json */
  }
}

/* ---------------- MongoDB (production) backend ---------------- */
class MongoStore {
  constructor({ mongoUri, seed }) {
    this.isMongo = true;
    this.servesImages = true; // الصور تُخزَّن في القاعدة وتُقدَّم عبر /uploads/:id
    this.backend = "MongoDB";
    this.uri = mongoUri;
    this.seed = seed || [];
  }
  async connect() {
    this.client = new MongoClient(this.uri);
    await this.client.connect();
    const db = this.client.db(process.env.MONGODB_DB || "trendora");
    this.articles = db.collection("articles");
    this.images = db.collection("images");
    this.settings = db.collection("settings");
    await this.articles.createIndex({ id: 1 }, { unique: true });
    await this.articles.createIndex({ slug: 1 });
    await this.images.createIndex({ id: 1 }, { unique: true });
    await this.seedIfEmpty();
  }
  async seedIfEmpty() {
    const count = await this.articles.countDocuments();
    if (count === 0 && this.seed.length) {
      await this.articles.insertMany(this.seed.map((a) => ({ ...a })));
    }
  }
  async _uniqueSlug(title, currentId = null) {
    const base = slugify(title);
    let candidate = base;
    let i = 2;
    while (
      await this.articles.findOne({ slug: candidate, id: { $ne: currentId } })
    ) {
      candidate = `${base}-${i++}`;
    }
    return candidate;
  }
  async listAll() {
    const docs = await this.articles
      .find({}, { projection: { content: 0, _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    return docs;
  }
  async listPublished({ category, q } = {}) {
    const query = { status: "published" };
    if (category && category !== "all") query.category = category;
    if (q) {
      const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ title: rx }, { excerpt: rx }];
    }
    return this.articles
      .find(query, { projection: { content: 0, _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
  }
  async getPublic(idOrSlug) {
    return this.articles.findOne(
      { $or: [{ id: idOrSlug }, { slug: idOrSlug }], status: "published" },
      { projection: { _id: 0 } }
    );
  }
  async getById(id) {
    return this.articles.findOne({ id }, { projection: { _id: 0 } });
  }
  async create(body) {
    const a = normalize(body);
    a.slug = await this._uniqueSlug(a.title);
    await this.articles.insertOne({ ...a });
    return a;
  }
  async update(id, body) {
    const prev = await this.getById(id);
    if (!prev) return null;
    const updated = normalize(body, prev);
    updated.slug =
      body.title && body.title !== prev.title
        ? await this._uniqueSlug(updated.title, id)
        : prev.slug;
    await this.articles.replaceOne({ id }, { ...updated });
    return updated;
  }
  async setStatus(id, status) {
    const r = await this.articles.findOneAndUpdate(
      { id },
      { $set: { status, updatedAt: new Date().toISOString() } },
      { returnDocument: "after", projection: { _id: 0 } }
    );
    return r || (await this.getById(id));
  }
  async remove(id) {
    const prev = await this.getById(id);
    if (!prev) return null;
    await this.articles.deleteOne({ id });
    if (prev.image && prev.image.startsWith("/uploads/")) {
      await this.images.deleteOne({ id: path.basename(prev.image) });
    }
    return prev;
  }
  async saveImage({ buffer, mimetype }) {
    const id = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
    await this.images.insertOne({
      id,
      data: new Binary(buffer),
      contentType: mimetype || "image/jpeg",
      createdAt: new Date(),
    });
    return `/uploads/${id}`;
  }
  async getImage(id) {
    const doc = await this.images.findOne({ id });
    if (!doc) return null;
    return { buffer: doc.data.buffer, contentType: doc.contentType };
  }
  async getSettings() {
    const doc = await this.settings.findOne({ _id: "site" });
    return mergeSettings(doc || {});
  }
  async saveSettings(partial) {
    const current = await this.getSettings();
    const merged = { ...current, ...partial };
    await this.settings.updateOne(
      { _id: "site" },
      { $set: merged },
      { upsert: true }
    );
    return merged;
  }
}

/* ---------------- Firebase Firestore (production) backend ---------------- */
class FirestoreStore {
  constructor({ serviceAccount, storageBucket, seed }) {
    this.isMongo = false;
    this.servesImages = true; // الصور في Firebase Storage وتُقدَّم عبر /uploads/:id
    this.backend = "Firebase Firestore";
    this.serviceAccount = serviceAccount;
    this.storageBucket = storageBucket;
    this.seed = seed || [];
  }
  async connect() {
    const { initializeApp, cert, getApps } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");
    const { getStorage } = await import("firebase-admin/storage");

    if (!getApps().length) {
      initializeApp({
        credential: cert(this.serviceAccount),
        storageBucket: this.storageBucket,
      });
    }
    this.db = getFirestore();
    this.col = this.db.collection("articles");
    this.settingsDoc = this.db.collection("settings").doc("site");
    this.bucket = getStorage().bucket();
    await this.seedIfEmpty();
  }
  async seedIfEmpty() {
    const snap = await this.col.limit(1).get();
    if (snap.empty && this.seed.length) {
      const batch = this.db.batch();
      for (const a of this.seed) batch.set(this.col.doc(a.id), { ...a });
      await batch.commit();
    }
  }
  async _all() {
    const snap = await this.col.get();
    return snap.docs.map((d) => d.data());
  }
  async _uniqueSlug(title, currentId = null) {
    const base = slugify(title);
    let candidate = base;
    let i = 2;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const snap = await this.col.where("slug", "==", candidate).get();
      const clash = snap.docs.some((d) => d.data().id !== currentId);
      if (!clash) return candidate;
      candidate = `${base}-${i++}`;
    }
  }
  async listAll() {
    const all = await this._all();
    return all
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(stripContent);
  }
  async listPublished({ category, q } = {}) {
    let list = (await this._all()).filter((a) => a.status === "published");
    if (category && category !== "all") list = list.filter((a) => a.category === category);
    if (q) {
      const t = String(q).toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(t) ||
          (a.excerpt || "").toLowerCase().includes(t)
      );
    }
    return list
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(stripContent);
  }
  async getPublic(idOrSlug) {
    const doc = await this.col.doc(idOrSlug).get();
    let a = doc.exists ? doc.data() : null;
    if (!a) {
      const snap = await this.col.where("slug", "==", idOrSlug).limit(1).get();
      a = snap.empty ? null : snap.docs[0].data();
    }
    return a && a.status === "published" ? a : null;
  }
  async getById(id) {
    const doc = await this.col.doc(id).get();
    return doc.exists ? doc.data() : null;
  }
  async create(body) {
    const a = normalize(body);
    a.slug = await this._uniqueSlug(a.title);
    await this.col.doc(a.id).set({ ...a });
    return a;
  }
  async update(id, body) {
    const prev = await this.getById(id);
    if (!prev) return null;
    const updated = normalize(body, prev);
    updated.slug =
      body.title && body.title !== prev.title
        ? await this._uniqueSlug(updated.title, id)
        : prev.slug;
    await this.col.doc(id).set({ ...updated });
    return updated;
  }
  async setStatus(id, status) {
    const prev = await this.getById(id);
    if (!prev) return null;
    const updatedAt = new Date().toISOString();
    await this.col.doc(id).update({ status, updatedAt });
    return { ...prev, status, updatedAt };
  }
  async remove(id) {
    const prev = await this.getById(id);
    if (!prev) return null;
    await this.col.doc(id).delete();
    if (prev.image && prev.image.startsWith("/uploads/")) {
      await this.bucket
        .file(`uploads/${path.basename(prev.image)}`)
        .delete()
        .catch(() => {});
    }
    return prev;
  }
  async saveImage({ buffer, mimetype, originalname }) {
    const ext = (path.extname(originalname || "") || ".jpg").toLowerCase();
    const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
    await this.bucket.file(`uploads/${name}`).save(buffer, {
      contentType: mimetype || "image/jpeg",
      resumable: false,
    });
    return `/uploads/${name}`;
  }
  async getImage(id) {
    const file = this.bucket.file(`uploads/${id}`);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [meta] = await file.getMetadata();
    const [buffer] = await file.download();
    return { buffer, contentType: meta.contentType || "image/jpeg" };
  }
  async getSettings() {
    const doc = await this.settingsDoc.get();
    return mergeSettings(doc.exists ? doc.data() : {});
  }
  async saveSettings(partial) {
    const current = await this.getSettings();
    const merged = { ...current, ...partial };
    await this.settingsDoc.set(merged, { merge: true });
    return merged;
  }
}

function loadServiceAccount() {
  // 1) base64-encoded JSON (الأنسب لمتغيرات بيئة Render)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
    return JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, "base64").toString("utf-8")
    );
  }
  // 2) raw JSON string
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }
  // 3) path to a JSON file
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    return JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf-8"));
  }
  return null;
}

export async function createStore({ dataFile, uploadDir, mongoUri, seed }) {
  // الأولوية: Firebase Firestore ← MongoDB ← ملف JSON محلي
  const serviceAccount = loadServiceAccount();
  if (serviceAccount) {
    const projectId = serviceAccount.project_id;
    const storageBucket =
      process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;
    const store = new FirestoreStore({ serviceAccount, storageBucket, seed });
    await store.connect();
    return store;
  }
  if (mongoUri) {
    const store = new MongoStore({ mongoUri, seed });
    await store.connect();
    return store;
  }
  return new JsonStore({ dataFile, uploadDir });
}

export { slugify, readingTime };
