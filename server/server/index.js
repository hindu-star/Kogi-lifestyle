import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pg from "pg";

const { Pool } = pg;
const app = express();
app.use(cors());
app.use(express.json());

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || "kogi_lifestyle_secret_2026";
const PORT = process.env.PORT || 4000;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL && DATABASE_URL.includes("railway")
    ? { rejectUnauthorized: false }
    : false
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(32) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      class VARCHAR(16) NOT NULL,
      city VARCHAR(32) NOT NULL,
      zone VARCHAR(32) NOT NULL,
      money BIGINT NOT NULL,
      bank_debt BIGINT NOT NULL DEFAULT 0,
      energy INTEGER NOT NULL DEFAULT 100,
      cred INTEGER NOT NULL DEFAULT 20,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log("DB tables ready");
}

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });
  try {
    const payload = jwt.verify(header.replace("Bearer ", ""), JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

const NEPO = [
  { city: "Lokoja", zone: "GRA" },
  { city: "Anyigba", zone: "Staff Quarters" },
  { city: "Okene", zone: "Government Layout" },
  { city: "Idah", zone: "Riverside Estates" },
  { city: "Kabba", zone: "Commissioner's Quarter" },
  { city: "Ajaokuta", zone: "Steel Estate" }
];
const LAPO = [
  { city: "Lokoja", zone: "Ganaja" },
  { city: "Anyigba", zone: "Student Village" },
  { city: "Okene", zone: "Central Area" },
  { city: "Idah", zone: "Fisherman Quarters" },
  { city: "Kabba", zone: "Farm Belt" },
  { city: "Ajaokuta", zone: "Workers Camp" }
];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

app.get("/", (req, res) => res.json({ ok: true, game: "Kogi Lifestyle API", version: "1.0" }));

app.post("/api/auth/signup", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });
  if (username.length < 3) return res.status(400).json({ error: "Username too short" });
  if (password.length < 6) return res.status(400).json({ error: "Password 6+ chars" });
  try {
    const exists = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
    if (exists.rows.length) return res.status(400).json({ error: "Username taken" });
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1,$2) RETURNING id",
      [username, hash]
    );
    const token = signToken(r.rows[0].id);
    res.json({ token, userId: r.rows[0].id, username });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const r = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (!r.rows.length) return res.status(400).json({ error: "Invalid credentials" });
    const user = r.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });
    const token = signToken(user.id);
    res.json({ token, userId: user.id, username: user.username });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/player/create", auth, async (req, res) => {
  try {
    const existing = await pool.query("SELECT id FROM players WHERE user_id = $1", [req.userId]);
    if (existing.rows.length) return res.status(400).json({ error: "You already get a life. Delete am first." });

    const isNepo = Math.random() < 0.4;
    const cls = isNepo ? "nepo" : "lapo";
    const loc = pick(isNepo ? NEPO : LAPO);
    const money = isNepo ? 2000000 : 80000;
    const debt = isNepo ? 0 : 60000;
    const energy = isNepo ? 80 : 100;
    const cred = isNepo ? 20 : 40;

    const r = await pool.query(
      `INSERT INTO players (user_id, class, city, zone, money, bank_debt, energy, cred)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.userId, cls, loc.city, loc.zone, money, debt, energy, cred]
    );
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/player/me", auth, async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM players WHERE user_id = $1", [req.userId]);
    res.json({ player: r.rows[0] || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/player/me", auth, async (req, res) => {
  try {
    await pool.query("DELETE FROM players WHERE user_id = $1", [req.userId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

initDb()
  .then(() => app.listen(PORT, () => console.log("Kogi Lifestyle on port " + PORT)))
  .catch((e) => {
    console.error("DB init failed:", e);
    process.exit(1);
  });
