import express from "express";
import pg from "pg";
import jwt from "jsonwebtoken";
import { CITIES, JOBS, FOODS, NEED_DRAIN, TRAVEL_COST } from "../gameData.js";

const { Pool } = pg;
const router = express.Router();

const DATABASE_URL = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL && (DATABASE_URL.includes("render.com") || DATABASE_URL.includes("railway"))
    ? { rejectUnauthorized: false }
    : false
});

const JWT_SECRET = process.env.JWT_SECRET || "kogi_lifestyle_secret_2026";

function authMiddleware(req, res, next) {
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

// ==========================================================
// HELPERS
// ==========================================================
function sameDay(d1, d2) {
  if (!d1 || !d2) return false;
  const a = new Date(d1), b = new Date(d2);
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
}

function computeDrain(player) {
  const now = Date.now();
  const last = new Date(player.last_tick || new Date()).getTime();
  const hoursPassed = (now - last) / (1000 * 60 * 60);
  if (hoursPassed <= 0) return player;

  const drain = {
    hunger: Math.floor(hoursPassed * NEED_DRAIN.hunger),
    energy: Math.floor(hoursPassed * NEED_DRAIN.energy),
    fun: Math.floor(hoursPassed * NEED_DRAIN.fun),
    social: Math.floor(hoursPassed * NEED_DRAIN.social),
    hygiene: Math.floor(hoursPassed * NEED_DRAIN.hygiene)
  };

  return {
    ...player,
    hunger: Math.max(0, (player.hunger ?? 100) - drain.hunger),
    energy: Math.max(0, (player.energy ?? 100) - drain.energy),
    fun: Math.max(0, (player.fun ?? 100) - drain.fun),
    social: Math.max(0, (player.social ?? 100) - drain.social),
    hygiene: Math.max(0, (player.hygiene ?? 100) - drain.hygiene),
    last_tick: new Date().toISOString()
  };
}

async function persistStats(player) {
  await pool.query(
    `UPDATE players SET hunger=$1, energy=$2, fun=$3, social=$4, hygiene=$5, last_tick=$6 WHERE id=$7`,
    [player.hunger, player.energy, player.fun, player.social, player.hygiene, player.last_tick, player.id]
  );
}

// ==========================================================
// ROUTES
// ==========================================================

// GET /state
router.get("/state", authMiddleware, async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM players WHERE user_id = $1", [req.userId]);
    if (!r.rows.length) return res.status(404).json({ error: "No life. Create one." });

    const fresh = computeDrain(r.rows[0]);
    await persistStats(fresh);

    res.json({
      player: fresh,
      cities: CITIES,
      jobs: JOBS,
      foods: FOODS
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /work — one per real day
router.post("/work", authMiddleware, async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM players WHERE user_id = $1", [req.userId]);
    if (!r.rows.length) return res.status(404).json({ error: "No life" });
    let player = computeDrain(r.rows[0]);

    if (!player.job_id) return res.status(400).json({ error: "You never get job. Find work first." });

    // Worked today already?
    if (player.last_work_at && sameDay(player.last_work_at, new Date())) {
      return res.status(400).json({ error: "You don work today. Come back tomorrow." });
    }

    if (player.energy < 15) return res.status(400).json({ error: "You too tired. Rest or chop something." });

    const job = JOBS[player.job_id];
    if (!job) return res.status(400).json({ error: "Job no dey exist" });

    const earnings = job.pay;
    const energyCost = job.energyCost;
    const riskRoll = Math.random();
    let mishap = null;
    let finalEarnings = earnings;

    if (riskRoll < job.risk) {
      const mishaps = [
        { text: "Small accident happen. You spend money on treatment.", penalty: 0.5 },
        { text: "Customer refused to pay. Half pay only.", penalty: 0.5 },
        { text: "Boss deducted 'tax'. Small money only.", penalty: 0.7 },
        { text: "You got robbed on the way. Lost this shift pay.", penalty: 0 }
      ];
      const m = mishaps[Math.floor(Math.random() * mishaps.length)];
      mishap = m.text;
      finalEarnings = Math.floor(earnings * m.penalty);
    }

    player.money = Number(player.money) + finalEarnings;
    player.energy = Math.max(0, player.energy - energyCost);
    player.cred = player.cred + job.cred;
    player.last_work_at = new Date().toISOString();

    await pool.query(
      `UPDATE players SET money=$1, energy=$2, cred=$3, hunger=$4, fun=$5, social=$6, hygiene=$7, last_tick=$8, last_work_at=$9 WHERE id=$10`,
      [player.money, player.energy, player.cred, player.hunger, player.fun, player.social, player.hygiene, player.last_tick, player.last_work_at, player.id]
    );

    res.json({ ok: true, earned: finalEarnings, mishap, player });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /apply
router.post("/apply", authMiddleware, async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId || !JOBS[jobId]) return res.status(400).json({ error: "Job no dey" });

    const r = await pool.query("SELECT * FROM players WHERE user_id = $1", [req.userId]);
    if (!r.rows.length) return res.status(404).json({ error: "No life" });
    const player = r.rows[0];

    const city = CITIES[player.city];
    if (!city.jobs.includes(jobId)) {
      return res.status(400).json({ error: `This job no dey ${player.city}. Travel go find am.` });
    }

    await pool.query("UPDATE players SET job_id=$1 WHERE id=$2", [jobId, player.id]);
    res.json({ ok: true, jobId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /quit
router.post("/quit", authMiddleware, async (req, res) => {
  try {
    await pool.query("UPDATE players SET job_id=NULL WHERE user_id=$1", [req.userId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /eat
router.post("/eat", authMiddleware, async (req, res) => {
  try {
    const { foodId } = req.body;
    if (!foodId || !FOODS[foodId]) return res.status(400).json({ error: "Food no dey" });

    const r = await pool.query("SELECT * FROM players WHERE user_id = $1", [req.userId]);
    if (!r.rows.length) return res.status(404).json({ error: "No life" });
    let player = computeDrain(r.rows[0]);

    const food = FOODS[foodId];
    if (Number(player.money) < food.cost) return res.status(400).json({ error: "Money no dey reach" });

    player.money = Number(player.money) - food.cost;
    player.hunger = Math.min(100, player.hunger + food.hunger);
    player.energy = Math.min(100, player.energy + food.energy);

    await pool.query(
      `UPDATE players SET money=$1, hunger=$2, energy=$3, last_tick=$4 WHERE id=$5`,
      [player.money, player.hunger, player.energy, player.last_tick, player.id]
    );

    res.json({ ok: true, player, food });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /travel
router.post("/travel", authMiddleware, async (req, res) => {
  try {
    const { city } = req.body;
    if (!city || !CITIES[city]) return res.status(400).json({ error: "City no dey" });

    const r = await pool.query("SELECT * FROM players WHERE user_id = $1", [req.userId]);
    if (!r.rows.length) return res.status(404).json({ error: "No life" });
    let player = computeDrain(r.rows[0]);

    if (player.city === city) return res.status(400).json({ error: "You already dey there" });
    if (Number(player.money) < TRAVEL_COST.base) return res.status(400).json({ error: "Transport money no reach" });
    if (player.energy < TRAVEL_COST.energyCost) return res.status(400).json({ error: "You too tired to travel" });

    player.money = Number(player.money) - TRAVEL_COST.base;
    player.energy = Math.max(0, player.energy - TRAVEL_COST.energyCost);

    const targetCity = CITIES[city];
    const isNepo = player.class === "nepo";
    const newZone = isNepo ? targetCity.richZone : targetCity.poorZone;

    await pool.query(
      `UPDATE players SET city=$1, zone=$2, money=$3, energy=$4, last_tick=$5 WHERE id=$6`,
      [city, newZone, player.money, player.energy, player.last_tick, player.id]
    );

    player.city = city;
    player.zone = newZone;

    res.json({ ok: true, player });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /sleep
router.post("/sleep", authMiddleware, async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM players WHERE user_id = $1", [req.userId]);
    if (!r.rows.length) return res.status(404).json({ error: "No life" });
    let player = computeDrain(r.rows[0]);

    if (player.energy > 90) return res.status(400).json({ error: "You no dey tired" });

    player.energy = Math.min(100, player.energy + 40);
    player.hunger = Math.max(0, player.hunger - 5);
    player.fun = Math.max(0, player.fun + 10);

    await pool.query(
      `UPDATE players SET energy=$1, hunger=$2, fun=$3, last_tick=$4 WHERE id=$5`,
      [player.energy, player.hunger, player.fun, player.last_tick, player.id]
    );

    res.json({ ok: true, player });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /avatar — save avatar customization
router.post("/avatar", authMiddleware, async (req, res) => {
  try {
    const { gender, skin, hair, hairstyle, topColor, bottomColor, outfit } = req.body;
    await pool.query(
      `UPDATE players SET
        avatar_gender=$1, avatar_skin=$2, avatar_hair_color=$3, avatar_hairstyle=$4,
        avatar_top_color=$5, avatar_bottom_color=$6, avatar_outfit=$7
       WHERE user_id=$8`,
      [gender, skin, hair, hairstyle, topColor, bottomColor, outfit, req.userId]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
