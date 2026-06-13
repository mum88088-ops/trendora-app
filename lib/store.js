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

/* ---------------- JSON (local) backend ---------------- */
class JsonStore {
  constructor({ dataFile, uploadDir }) {
    this.dataFile = dataFile;
    this.uploadDir = uploadDir;
    this.isMongo = false;
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
  async seedIfEmpty() {
    /* JSON file already seeded from data/articles.json */
  }
}

/* ---------------- MongoDB (production) backend ---------------- */
class MongoStore {
  constructor({ mongoUri, seed }) {
    this.isMongo = true;
    this.uri = mongoUri;
    this.seed = seed || [];
  }
  async connect() {
    this.client = new MongoClient(this.uri);
    await this.client.connect();
    const db = this.client.db(process.env.MONGODB_DB || "trendora");
    this.articles = db.collection("articles");
    this.images = db.collection("images");
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
}

export async function createStore({ dataFile, uploadDir, mongoUri, seed }) {
  if (mongoUri) {
    const store = new MongoStore({ mongoUri, seed });
    await store.connect();
    return store;
  }
  return new JsonStore({ dataFile, uploadDir });
}

export { slugify, readingTime };
