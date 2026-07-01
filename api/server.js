import "dotenv/config";
import express from "express";
import compression from "compression";
import path from "path";
import fs from "fs";

const DB_FILE = "/tmp/data.json";
const DB_KEY = "family_planning_db";

// --- Storage backends ---
// Priority: Vercel KV > JSONBin.io > local file (fallback)

// 1. Vercel KV (Upstash Redis)
const KV_REST_API_URL = process.env.KV_REST_API_URL || "";
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN || "";

async function readFromKV() {
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) return null;
  try {
    const res = await fetch(`${KV_REST_API_URL}/get/${DB_KEY}`, {
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.result) return null;
    return JSON.parse(json.result);
  } catch (e) {
    console.error("KV read error:", e.message);
    return null;
  }
}

async function writeToKV(data) {
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) return false;
  try {
    const res = await fetch(`${KV_REST_API_URL}/set/${DB_KEY}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KV_REST_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch (e) {
    console.error("KV write error:", e.message);
    return false;
  }
}

// 2. JSONBin.io
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY || "";
const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID || "";
const JSONBIN_BASE = "https://api.jsonbin.io/v3/b";

async function readFromJsonBin() {
  if (!JSONBIN_API_KEY || !JSONBIN_BIN_ID) return null;
  try {
    const res = await fetch(`${JSONBIN_BASE}/${JSONBIN_BIN_ID}`, {
      headers: { "X-Master-Key": JSONBIN_API_KEY },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.record;
  } catch (e) {
    console.error("JSONBin read error:", e.message);
    return null;
  }
}

async function writeToJsonBin(data) {
  if (!JSONBIN_API_KEY || !JSONBIN_BIN_ID) return false;
  try {
    const res = await fetch(`${JSONBIN_BASE}/${JSONBIN_BIN_ID}`, {
      method: "PUT",
      headers: {
        "X-Master-Key": JSONBIN_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch (e) {
    console.error("JSONBin write error:", e.message);
    return false;
  }
}

const DEFAULT_CENTERS = [
  { id: "1", name: "الزهراء", username: "ز", password: "ز" },
  { id: "2", name: "بابل", username: "ل", password: "ل" },
  { id: "3", name: "الهادي", username: "ه", password: "ه" },
  { id: "4", name: "مرجان", username: "م", password: "م" },
  { id: "5", name: "الخالصة", username: "خ", password: "خ" },
  { id: "6", name: "الباقر", username: "ب", password: "ب" },
  { id: "7", name: "النهضة", username: "ن", password: "ن" },
  { id: "8", name: "القاضية", username: "ق", password: "ق" },
  { id: "9", name: "نادر", username: "د", password: "د" },
  { id: "10", name: "الكوثر", username: "ك", password: "ك" },
  { id: "11", name: "الوردية", username: "و", password: "و" }
];

const AGE_RANGES = ["under_20", "age_20_24", "age_25_29", "age_30_34", "over_35"];

function createEmptyAgeRecord(v) {
  return { under_20: v, age_20_24: v, age_25_29: v, age_30_34: v, over_35: v };
}

function createEmptySection1() {
  return {
    new_client: createEmptyAgeRecord(0), secondary_client: createEmptyAgeRecord(0),
    repeat_client: createEmptyAgeRecord(0), get_method: createEmptyAgeRecord(0),
    change_method: createEmptyAgeRecord(0), followup: createEmptyAgeRecord(0),
    maintenance: createEmptyAgeRecord(0), remove_loop: createEmptyAgeRecord(0),
    consultation: createEmptyAgeRecord(0), nullipara: createEmptyAgeRecord(0),
    single_child: createEmptyAgeRecord(0), two_children: createEmptyAgeRecord(0),
    three_children: createEmptyAgeRecord(0), four_plus: createEmptyAgeRecord(0),
  };
}

function createEmptySection2() {
  const base = () => ({ clients: 0, quantity: 0 });
  const all = () => ({ under_20: base(), age_20_24: base(), age_25_29: base(), age_30_34: base(), over_35: base() });
  return {
    pills_mini: all(), pills_combined: all(), iud_loop: all(), condom: all(),
    injection_mini: all(), vaginal_cream: all(), others: all(), consultation_only: all(),
  };
}

let DB_CACHE = null;
let DB_LOADING = null;

async function readDb() {
  if (DB_LOADING) return DB_LOADING;
  DB_LOADING = (async () => {
    // Priority 1: Vercel KV
    if (KV_REST_API_URL) {
      const kv = await readFromKV();
      if (kv) {
        if (!kv.centers) kv.centers = [...DEFAULT_CENTERS];
        if (!kv.records) kv.records = [];
        DB_CACHE = kv;
        try { fs.writeFileSync(DB_FILE, JSON.stringify(kv, null, 2)); } catch {}
        return kv;
      }
    }
    // Priority 2: JSONBin.io
    if (JSONBIN_API_KEY) {
      const jb = await readFromJsonBin();
      if (jb) {
        if (!jb.centers) jb.centers = [...DEFAULT_CENTERS];
        if (!jb.records) jb.records = [];
        DB_CACHE = jb;
        try { fs.writeFileSync(DB_FILE, JSON.stringify(jb, null, 2)); } catch {}
        return jb;
      }
    }
    // Priority 3: Local file (fallback)
    try {
      if (fs.existsSync(DB_FILE)) {
        const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
        if (!db.centers) db.centers = [...DEFAULT_CENTERS];
        if (!db.records) db.records = [];
        DB_CACHE = db;
        return db;
      }
    } catch (e) { console.error("Local DB error", e); }
    const db = { centers: [...DEFAULT_CENTERS], records: [] };
    try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); } catch {}
    DB_CACHE = db;
    return db;
  })();
  const result = await DB_LOADING;
  DB_LOADING = null;
  return result;
}

const LOCK_KEY = "family_planning_db_lock";

async function acquireLock() {
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) return true;
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch(`${KV_REST_API_URL}/set/${LOCK_KEY}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}`, "Content-Type": "application/json" },
        body: "1",
      });
      if (res.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

async function releaseLock() {
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) return;
  try {
    await fetch(`${KV_REST_API_URL}/del/${LOCK_KEY}`, {
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
    });
  } catch {}
}

async function writeDb(db) {
  DB_CACHE = db;
  const tasks = [];
  if (KV_REST_API_URL) tasks.push(writeToKV(db));
  if (JSONBIN_API_KEY) tasks.push(writeToJsonBin(db));
  tasks.push((async () => {
    try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); } catch (e) { console.error("Local write error", e); }
  })());
  await Promise.allSettled(tasks);
}

const app = express();
app.use(compression());
app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.sendStatus(200); return; }
  next();
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "مطلوب" });
  if (username === "1" && password === "1") return res.json({ user: { id: "master", name: "إدارة النظام (الماستر)", role: "master" } });
  const db = await readDb();
  const center = db.centers.find(c => c.username.trim() === username.trim() && c.password.trim() === password.trim());
  if (center) return res.json({ user: { id: center.id, name: center.name, role: "center" } });
  res.status(401).json({ error: "بيانات غير صحيحة" });
});

app.get("/api/centers", async (req, res) => {
  const db = await readDb();
  res.json(db.centers);
});

app.post("/api/centers", async (req, res) => {
  const { name, username, password } = req.body;
  if (!name || !username || !password) return res.status(400).json({ error: "جميع الحقول مطلوبة" });
  const db = await readDb();
  if (db.centers.some(c => c.name === name || c.username === username)) return res.status(400).json({ error: "مكرر" });
  const c = { id: String(Date.now()), name, username, password };
  db.centers.push(c); await writeDb(db);
  res.json(c);
});

app.put("/api/centers/:id", async (req, res) => {
  const db = await readDb();
  const i = db.centers.findIndex(c => c.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: "غير موجود" });
  db.centers[i] = { ...db.centers[i], ...req.body };
  await writeDb(db);
  res.json(db.centers[i]);
});

app.delete("/api/centers/:id", async (req, res) => {
  const db = await readDb();
  db.centers = db.centers.filter(c => c.id !== req.params.id);
  db.records = db.records.filter(r => r.centerId !== req.params.id);
  await writeDb(db);
  res.json({ success: true });
});

app.get("/api/records", async (req, res) => {
  const db = await readDb();
  let f = db.records;
  if (req.query.centerId) f = f.filter(r => r.centerId === req.query.centerId);
  if (req.query.month) f = f.filter(r => r.month === Number(req.query.month));
  if (req.query.year) f = f.filter(r => r.year === Number(req.query.year));
  res.json(f);
});

app.post("/api/records", async (req, res) => {
  const { centerId, month, year, section1, section2, advisorName, programManager, directorName } = req.body;
  if (!centerId || !month || !year || !section1 || !section2) return res.status(400).json({ error: "بيانات غير مكتملة" });
  const locked2 = await acquireLock();
  if (!locked2) return res.status(503).json({ error: "الخادم مشغول، حاول مرة أخرى" });
  try {
    const db = await readDb();
    const ei = db.records.findIndex(r => r.centerId === centerId && r.month === Number(month) && r.year === Number(year));
    if (ei !== -1 && db.records[ei].locked) { releaseLock(); return res.status(403).json({ error: "مقفلة" }); }
    const p = { centerId, month: Number(month), year: Number(year), dateCreated: ei === -1 ? new Date().toISOString() : db.records[ei].dateCreated, section1, section2, advisorName, programManager, directorName, locked: true };
    if (ei !== -1) db.records[ei] = p; else db.records.push(p);
    await writeDb(db);
    res.json({ success: true, record: p });
  } finally { releaseLock(); }
});

app.delete("/api/records/:centerId/:month/:year", async (req, res) => {
  const { centerId, month, year } = req.params;
  const db = await readDb();
  const idx = db.records.findIndex(r => r.centerId === centerId && r.month === Number(month) && r.year === Number(year));
  if (idx === -1) return res.status(404).json({ error: "غير موجود" });
  db.records.splice(idx, 1);
  await writeDb(db);
  res.json({ success: true });
});

app.patch("/api/records/request-unlock", async (req, res) => {
  const { centerId, month, year, message } = req.body;
  if (!centerId || !month || !year) return res.status(400).json({ error: "بيانات غير مكتملة" });
  const db = await readDb();
  const rec = db.records.find(r => r.centerId === centerId && r.month === Number(month) && r.year === Number(year));
  if (!rec) return res.status(404).json({ error: "غير موجود" });
  if (!rec.locked) return res.json({ success: true, message: "مفتوح" });
  rec.unlockRequested = true; rec.unlockMessage = message || "";
  await writeDb(db);
  res.json({ success: true });
});

app.patch("/api/records/unlock", async (req, res) => {
  const { centerId, month, year } = req.body;
  if (!centerId || !month || !year) return res.status(400).json({ error: "بيانات غير مكتملة" });
  const db = await readDb();
  const rec = db.records.find(r => r.centerId === centerId && r.month === Number(month) && r.year === Number(year));
  if (!rec) return res.status(404).json({ error: "غير موجود" });
  rec.locked = false; rec.unlockRequested = false; rec.unlockMessage = "";
  await writeDb(db);
  res.json({ success: true });
});

app.get("/api/records/unlock-requests", async (req, res) => {
  const db = await readDb();
  res.json(db.records.filter(r => r.unlockRequested));
});

app.get("/api/records/annual", async (req, res) => {
  const db = await readDb();
  let f = db.records;
  if (req.query.centerId && req.query.centerId !== "all") f = f.filter(r => r.centerId === req.query.centerId);
  if (req.query.year) f = f.filter(r => r.year === Number(req.query.year));
  const lbm = {}, mf = [];
  for (let m = 1; m <= 12; m++) {
    const mr = f.filter(r => r.month === m);
    if (mr.length) { mr.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()); lbm[m] = mr[0]; mf.push(m); }
  }
  const ts1 = createEmptySection1();
  mf.forEach(m => Object.keys(lbm[m].section1).forEach(k => Object.keys(lbm[m].section1[k]).forEach(a => ts1[k][a] = (ts1[k][a] || 0) + (lbm[m].section1[k][a] || 0))));
  const ts2 = createEmptySection2();
  mf.forEach(m => Object.keys(lbm[m].section2).forEach(k => Object.keys(lbm[m].section2[k]).forEach(a => {
    ts2[k][a].clients = (ts2[k][a].clients || 0) + (lbm[m].section2[k][a].clients || 0);
    ts2[k][a].quantity = (ts2[k][a].quantity || 0) + (lbm[m].section2[k][a].quantity || 0);
  })));
  res.json({ monthsFound: mf, total: { section1: ts1, section2: ts2 } });
});

const BACKUP_DIR = process.env.BACKUP_DIR || "D:\\الصيانة والخزن";

// Backup endpoint - download all data
app.get("/api/backup", async (req, res) => {
  const db = await readDb();
  res.json(db);
});

// Save backup to local folder
app.post("/api/backup/save-local", async (req, res) => {
  try {
    const db = await readDb();
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const now = new Date();
    const ds = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;
    const filePath = path.join(BACKUP_DIR, `family-planning-backup-${ds}.json`);
    fs.writeFileSync(filePath, JSON.stringify(db, null, 2), "utf-8");
    res.json({ success: true, path: filePath });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Restore endpoint - upload full backup
app.post("/api/restore", async (req, res) => {
  const { data, overwrite } = req.body;
  if (!data) return res.status(400).json({ error: "لا توجد بيانات" });
  if (!data.centers || !data.records) return res.status(400).json({ error: "بيانات غير صالحة" });
  const locked2 = await acquireLock();
  if (!locked2) return res.status(503).json({ error: "الخادم مشغول" });
  try {
    const db = await readDb();
    if (overwrite) {
      await writeDb(data);
    } else {
      data.centers.forEach(c => { if (!db.centers.find(x => x.id === c.id)) db.centers.push(c); });
      data.records.forEach(r => { if (!db.records.find(x => x.centerId === r.centerId && x.month === r.month && x.year === r.year)) db.records.push(r); });
      await writeDb(db);
    }
    res.json({ success: true, message: "تمت الاستعادة بنجاح" });
  } finally { releaseLock(); }
});

const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => { if (!req.path.startsWith("/api")) res.sendFile(path.join(distPath, "index.html")); });

export default app;
