import express from "express";
import { pool } from "../db.js";
import { authMiddleware } from "../auth.js";
import { CITIES, JOBS, FOODS, NEED_DRAIN, WORK_COOLDOWN_MIN, TRAVEL_COST } from "../gameData.js";

const router = express.Router();

// ---------- HELPER: Compute real-time need drain ----------
// Called every time we read player stats.
// Compares last_tick to now, applies drain per hour passed.
function computeDrain(player) {
  const now = Date.now();
  const last = new Date(player.last_tick).getTime();
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
    hunger: Math.max(0, (player.hunger || 100) - drain.hunger),
    energy: Math.max(0, (player.energy || 100) - drain.energy),
    fun: Math.max(0, (player.fun || 100) - drain.fun),
    social: Math.max(0, (player.social || 100) - drain.social),
    hygiene: Math.max(0, (player.hygiene || 100) - drain.hygiene),
    last_tick: new Date().toISOString()
  };
}

// ---------- HELPER: Save computed stats to DB ----------
async function persistStats(player) {
  await pool.query(
    `UPDATE players SET hunger=$1, energy=$2, fun=$3, social=$4, hygiene=$5, last_tick=$6 WHERE id=$7`,
    [player.hunger, player.energy, player.fun, player.social, player.hygiene, player.last_tick, player.id]
  );
}

// ---------- GET /state — full player state (with fresh drain applied) ----------
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

// ---------- POST /work — do a shift at current job ----------
router.post("/work", authMiddleware, async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM players WHERE user_id = $1", [req.userId]);
    if (!r.rows.length) return res.status(404).json({ error: "No life" });
    let player = computeDrain(r.rows[0]);

    if (!player.job_id) return res.status(400).json({ error: "You never get job. Find work first." });
    if (player.energy < 15) return res.status(400).json({ error: "You too tired. Rest or chop something." });

    // Cooldown check
    if (player.last_work_at) {
      const minsSince = (Date.now() - new Date(player.last_work_at).getTime()) / 60000;
      if (minsSince < WORK_COOLDOWN_MIN) {
        const wait = Math.ceil(WORK_COOLDOWN_MIN - minsSince);
        return res.status(400).json({ error: `Calm down. Next work dey ${wait} mins time.` });
      }
    }

    const job = JOBS[player.job_id];
    if (!job) return res.status(400).json({ error: "Job no dey exist" });

    // Apply work
    const earnings = job.pay;
    const energyCost = job.energyCost;
    const riskRoll = Math.random();
    let mishap = null;
    let finalEarnings = earnings;

    if (riskRoll < job.risk) {
      // Something went wrong
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

    res.json({
      ok: true,
      earned: finalEarnings,
      mishap,
      player
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- POST /apply — apply for a job ----------
router.post("/apply", authMiddleware, async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId || !JOBS[jobId]) return res.status(400).json({ error: "Job no dey" });

    const r = await pool.query("SELECT * FROM players WHERE user_id = $1", [req.userId]);
    if (!r.rows.length) return res.status(404).json({ error: "No life" });
    const player = r.rows[0];

    // Check job exists in current city
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

// ---------- POST /eat — buy and eat food ----------
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

// ---------- POST /travel — move to another city ----------
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

    // Move to same-tier zone (rich→rich, poor→poor)
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

// ---------- POST /sleep — restore energy (costs nothing, but time passes) ----------
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

export default router;
