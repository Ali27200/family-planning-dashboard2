import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import { createServer as createViteServer } from "vite";
import { HealthCenter, SubmissionRecord, createEmptySection1, createEmptySection2 } from "./src/types";

// Database file path
const DB_FILE = path.join(process.cwd(), "data.json");

// Default health centers setup
const DEFAULT_CENTERS: HealthCenter[] = [
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

interface DatabaseSchema {
  centers: HealthCenter[];
  records: SubmissionRecord[];
}

// Helper to read database
function readDb(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      const db = JSON.parse(content) as DatabaseSchema;
      if (!db.centers) {
        db.centers = [...DEFAULT_CENTERS];
      } else {
        const babil = db.centers.find(c => c.name === "بابل" || c.id === "2");
        if (babil && babil.username === "بابل") {
          babil.username = "ل";
          babil.password = "ل";
          fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
        }
      }
      if (!db.records) db.records = [];
      let migrated = false;
      db.records.forEach(r => {
        if (r.locked === undefined) {
          r.locked = true;
          migrated = true;
        }
      });
      if (migrated) writeDb(db);
      return db;
    }
  } catch (err) {
    console.error("Error reading DB file, recreating default.", err);
  }

  const defaultDb: DatabaseSchema = {
    centers: [...DEFAULT_CENTERS],
    records: []
  };
  writeDb(defaultDb);
  return defaultDb;
}

// Helper to write database
function writeDb(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing DB file", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);
  const HOST = process.env.HOST || "0.0.0.0";

  app.use(express.json());

  // CORS
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Login endpoint
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
       res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبة" });
       return;
    }
    if (username === "1" && password === "1") {
       res.json({
        user: {
          id: "master",
          name: "إدارة النظام (الماستر)",
          role: "master",
        }
      });
      return;
    }
    const db = readDb();
    const center = db.centers.find(
      (c) => c.username.trim() === username.trim() && c.password.trim() === password.trim()
    );
    if (center) {
       res.json({
        user: {
          id: center.id,
          name: center.name,
          role: "center",
        }
      });
      return;
    }
    if (username.trim() === "ل" && password.trim() === "ل") {
      const babil = db.centers.find((c) => c.name === "بابل");
      if (babil) {
         res.json({
          user: {
            id: babil.id,
            name: babil.name,
            role: "center"
          }
        });
        return;
      }
    }
     res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
  });

  // GET Centers
  app.get("/api/centers", (req, res) => {
    const db = readDb();
    res.json(db.centers);
  });

  // POST Create Center
  app.post("/api/centers", (req, res) => {
    const { name, username, password } = req.body;
    if (!name || !username || !password) {
       res.status(400).json({ error: "جميع الحقول مطلوبة للمركز الجديد" });
       return;
    }
    const db = readDb();
    const exists = db.centers.some((c) => c.name === name || c.username === username);
    if (exists) {
       res.status(400).json({ error: "خطأ: اسم المركز أو اسم المستخدم مكرر بالفعل" });
       return;
    }
    const newCenter: HealthCenter = {
      id: String(Date.now()),
      name,
      username,
      password,
    };
    db.centers.push(newCenter);
    writeDb(db);
    res.json(newCenter);
  });

  // PUT Update Center
  app.put("/api/centers/:id", (req, res) => {
    const { id } = req.params;
    const { name, username, password } = req.body;
    const db = readDb();
    const centerIndex = db.centers.findIndex((c) => c.id === id);
    if (centerIndex === -1) {
       res.status(404).json({ error: "المركز غير موجود" });
       return;
    }
    db.centers[centerIndex] = {
      ...db.centers[centerIndex],
      name: name || db.centers[centerIndex].name,
      username: username || db.centers[centerIndex].username,
      password: password || db.centers[centerIndex].password,
    };
    writeDb(db);
    res.json(db.centers[centerIndex]);
  });

  // DELETE Center
  app.delete("/api/centers/:id", (req, res) => {
    const { id } = req.params;
    const db = readDb();
    db.centers = db.centers.filter((c) => c.id !== id);
    db.records = db.records.filter((r) => r.centerId !== id);
    writeDb(db);
    res.json({ success: true, message: "تم حذف المركز والبيانات التابعة له بنجاح" });
  });

  // GET Records
  app.get("/api/records", (req, res) => {
    const { centerId, month, year, fromDate, toDate } = req.query;
    const db = readDb();
    let filtered = db.records;
    if (centerId) filtered = filtered.filter((r) => r.centerId === centerId);
    if (month) filtered = filtered.filter((r) => r.month === Number(month));
    if (year) filtered = filtered.filter((r) => r.year === Number(year));
    if (fromDate && toDate) {
      const fDate = new Date(fromDate as string);
      const tDate = new Date(toDate as string);
      filtered = filtered.filter((r) => {
        const rDate = new Date(r.dateCreated);
        return rDate >= fDate && rDate <= tDate;
      });
    }
    res.json(filtered);
  });

  // POST Submit/Update record
  app.post("/api/records", (req, res) => {
    const { centerId, month, year, section1, section2, advisorName, programManager, directorName } = req.body;
    if (!centerId || !month || !year || !section1 || !section2) {
       res.status(400).json({ error: "بيانات الإحصائية غير مكتملة" });
       return;
    }
    const db = readDb();
    const existingIndex = db.records.findIndex(
      (r) => r.centerId === centerId && r.month === Number(month) && r.year === Number(year)
    );
    if (existingIndex !== -1 && db.records[existingIndex].locked) {
       res.status(403).json({ error: "الإحصائية مقفلة ولا يمكن تعديلها. يرجى طلب فتحها من الماستر." });
       return;
    }
    const isNew = existingIndex === -1;
    const recordPayload: SubmissionRecord = {
      centerId,
      month: Number(month),
      year: Number(year),
      dateCreated: isNew ? new Date().toISOString() : db.records[existingIndex].dateCreated,
      section1,
      section2,
      advisorName,
      programManager,
      directorName,
      locked: true
    };
    if (!isNew) {
      db.records[existingIndex] = recordPayload;
    } else {
      db.records.push(recordPayload);
    }
    writeDb(db);
    res.json({ success: true, record: recordPayload });
  });

  // DELETE Record
  app.delete("/api/records/:centerId/:month/:year", (req, res) => {
    const { centerId, month, year } = req.params;
    const db = readDb();
    const idx = db.records.findIndex(r => r.centerId === centerId && r.month === Number(month) && r.year === Number(year));
    if (idx === -1) { res.status(404).json({ error: "غير موجود" }); return; }
    db.records.splice(idx, 1);
    writeDb(db);
    res.json({ success: true });
  });

  // PATCH Request unlock
  app.patch("/api/records/request-unlock", (req, res) => {
    const { centerId, month, year, message } = req.body;
    if (!centerId || !month || !year) {
       res.status(400).json({ error: "بيانات غير مكتملة" });
       return;
    }
    const db = readDb();
    const existing = db.records.find(
      (r) => r.centerId === centerId && r.month === Number(month) && r.year === Number(year)
    );
    if (!existing) {
       res.status(404).json({ error: "السجل غير موجود" });
       return;
    }
    if (!existing.locked) {
       res.json({ success: true, message: "السجل مفتوح أصلاً" });
       return;
    }
    existing.unlockRequested = true;
    existing.unlockMessage = message || "";
    writeDb(db);
    res.json({ success: true, message: "تم إرسال طلب فتح السجل إلى الماستر" });
  });

  // PATCH Unlock
  app.patch("/api/records/unlock", (req, res) => {
    const { centerId, month, year } = req.body;
    if (!centerId || !month || !year) {
       res.status(400).json({ error: "بيانات غير مكتملة" });
       return;
    }
    const db = readDb();
    const existing = db.records.find(
      (r) => r.centerId === centerId && r.month === Number(month) && r.year === Number(year)
    );
    if (!existing) {
       res.status(404).json({ error: "السجل غير موجود" });
       return;
    }
    existing.locked = false;
    existing.unlockRequested = false;
    existing.unlockMessage = "";
    writeDb(db);
    res.json({ success: true, message: "تم فتح السجل للتعديل" });
  });

  // GET all unlock requests
  app.get("/api/records/unlock-requests", (req, res) => {
    const db = readDb();
    const pending = db.records.filter(r => r.unlockRequested);
    res.json(pending);
  });

  // Annual report
  app.get("/api/records/annual", (req, res) => {
    const { centerId, year } = req.query;
    const db = readDb();
    let filtered = db.records;
    if (centerId && centerId !== "all") filtered = filtered.filter(r => r.centerId === centerId);
    if (year) filtered = filtered.filter(r => r.year === Number(year));
    const latestByMonth: Record<number, SubmissionRecord> = {};
    const monthsFound: number[] = [];
    for (let m = 1; m <= 12; m++) {
      const monthRecords = filtered.filter(r => r.month === m);
      if (monthRecords.length > 0) {
        monthRecords.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
        latestByMonth[m] = monthRecords[0];
        monthsFound.push(m);
      }
    }
    const totalSection1 = createEmptySection1();
    monthsFound.forEach(m => {
      const rec = latestByMonth[m];
      Object.keys(rec.section1).forEach(key => {
        Object.keys(rec.section1[key]).forEach(age => {
          totalSection1[key][age] = (totalSection1[key][age] || 0) + (rec.section1[key][age] || 0);
        });
      });
    });
    const totalSection2 = createEmptySection2();
    monthsFound.forEach(m => {
      const rec = latestByMonth[m];
      Object.keys(rec.section2).forEach(key => {
        Object.keys(rec.section2[key]).forEach(age => {
          totalSection2[key][age].clients = (totalSection2[key][age].clients || 0) + (rec.section2[key][age].clients || 0);
          totalSection2[key][age].quantity = (totalSection2[key][age].quantity || 0) + (rec.section2[key][age].quantity || 0);
        });
      });
    });
    res.json({ monthsFound, total: { section1: totalSection1, section2: totalSection2 } });
  });

  // Vite integration middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    const addresses: string[] = [];
    const ifaces = os.networkInterfaces();
    Object.keys(ifaces).forEach((ifname) => {
      (ifaces[ifname] || []).forEach((iface: any) => {
        if (iface.family === "IPv4" && !iface.internal) {
          addresses.push(`http://${iface.address}:${PORT}`);
        }
      });
    });
    console.log(`\n  ✅ Server running on network:`);
    addresses.forEach((addr) => console.log(`     ${addr}`));
    console.log(`     http://localhost:${PORT} (local)\n`);
  });
}

startServer();
