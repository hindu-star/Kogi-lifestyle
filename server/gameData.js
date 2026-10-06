// ==========================================================
// KOGI LIFESTYLE — GAME DATA
// Cities, jobs, food, needs, prices
// ==========================================================

export const CITIES = {
  Lokoja: {
    name: "Lokoja",
    tagline: "State Capital — Confluence City",
    richZone: "GRA",
    poorZone: "Ganaja",
    jobs: ["civil_servant", "banker", "okada_rider", "trader", "teacher", "content_creator"]
  },
  Anyigba: {
    name: "Anyigba",
    tagline: "University Town — KSU Home",
    richZone: "Staff Quarters",
    poorZone: "Student Village",
    jobs: ["lecturer", "student_hustler", "food_vendor", "tailor", "phone_repairer", "content_creator"]
  },
  Okene: {
    name: "Okene",
    tagline: "Ebira Heartland — Trade & Mining",
    richZone: "Government Layout",
    poorZone: "Central Area",
    jobs: ["market_trader", "miner", "okada_rider", "tailor", "food_vendor", "crypto_hustler"]
  },
  Idah: {
    name: "Idah",
    tagline: "River Port — Igala Land",
    richZone: "Riverside Estates",
    poorZone: "Fisherman Quarters",
    jobs: ["fisherman", "trader", "boat_operator", "farmer", "teacher", "smuggler"]
  },
  Kabba: {
    name: "Kabba",
    tagline: "Okun Land — Western Gateway",
    richZone: "Commissioner's Quarter",
    poorZone: "Farm Belt",
    jobs: ["farmer", "teacher", "trader", "cashew_buyer", "okada_rider", "civil_servant"]
  },
  Ajaokuta: {
    name: "Ajaokuta",
    tagline: "Steel Town — The Ghost City",
    richZone: "Steel Estate",
    poorZone: "Workers Camp",
    jobs: ["scrap_dealer", "okada_rider", "factory_worker", "trader", "mechanic", "content_creator"]
  }
};

// ---- JOBS ----
// pay: per work session (in naira)
// energyCost: how much energy drained per work
// cred: street cred gain per work
// risk: 0-1, chance of a bad event (accident, arrest, etc.)
export const JOBS = {
  civil_servant:    { name: "Civil Servant",     pay: 12000, energyCost: 15, cred: 1, risk: 0.01, emoji: "🏛️" },
  banker:           { name: "Banker",            pay: 25000, energyCost: 20, cred: 3, risk: 0.02, emoji: "🏦" },
  okada_rider:      { name: "Okada Rider",       pay: 8000,  energyCost: 25, cred: 5, risk: 0.08, emoji: "🛵" },
  trader:           { name: "Trader",            pay: 10000, energyCost: 18, cred: 4, risk: 0.03, emoji: "🧺" },
  teacher:          { name: "Teacher",           pay: 7000,  energyCost: 12, cred: 6, risk: 0.01, emoji: "📚" },
  content_creator:  { name: "Content Creator",   pay: 6000,  energyCost: 10, cred: 8, risk: 0.02, emoji: "📱" },
  lecturer:         { name: "Lecturer",          pay: 20000, energyCost: 15, cred: 5, risk: 0.01, emoji: "🎓" },
  student_hustler:  { name: "Student Hustler",   pay: 5000,  energyCost: 12, cred: 6, risk: 0.02, emoji: "📖" },
  food_vendor:      { name: "Food Vendor",       pay: 9000,  energyCost: 20, cred: 4, risk: 0.02, emoji: "🍲" },
  tailor:           { name: "Tailor",            pay: 11000, energyCost: 14, cred: 3, risk: 0.01, emoji: "✂️" },
  phone_repairer:   { name: "Phone Repairer",    pay: 13000, energyCost: 14, cred: 4, risk: 0.02, emoji: "🔧" },
  market_trader:    { name: "Market Trader",     pay: 15000, energyCost: 20, cred: 5, risk: 0.04, emoji: "🏪" },
  miner:            { name: "Miner",             pay: 22000, energyCost: 30, cred: 4, risk: 0.15, emoji: "⛏️" },
  crypto_hustler:   { name: "Crypto Hustler",    pay: 18000, energyCost: 15, cred: 3, risk: 0.12, emoji: "💻" },
  fisherman:        { name: "Fisherman",         pay: 9000,  energyCost: 22, cred: 4, risk: 0.05, emoji: "🎣" },
  boat_operator:    { name: "Boat Operator",     pay: 12000, energyCost: 20, cred: 4, risk: 0.08, emoji: "⛵" },
  farmer:           { name: "Farmer",            pay: 8000,  energyCost: 25, cred: 5, risk: 0.03, emoji: "🌾" },
  smuggler:         { name: "Smuggler",          pay: 30000, energyCost: 25, cred: 6, risk: 0.25, emoji: "📦" },
  cashew_buyer:     { name: "Cashew Buyer",      pay: 14000, energyCost: 16, cred: 4, risk: 0.03, emoji: "🥜" },
  scrap_dealer:     { name: "Scrap Dealer",      pay: 10000, energyCost: 22, cred: 4, risk: 0.06, emoji: "🔩" },
  factory_worker:   { name: "Factory Worker",    pay: 11000, energyCost: 24, cred: 3, risk: 0.08, emoji: "🏭" },
  mechanic:         { name: "Mechanic",          pay: 12000, energyCost: 22, cred: 4, risk: 0.05, emoji: "🔧" }
};

// ---- FOOD / SHOP ITEMS ----
// Restores needs. Cost in naira.
export const FOODS = {
  akara:         { name: "Akara & Pap",       cost: 500,   hunger: 20, energy: 5,  emoji: "🍩" },
  rice_stew:     { name: "Rice & Stew",       cost: 1500,  hunger: 40, energy: 10, emoji: "🍛" },
  eba_soup:      { name: "Eba & Egusi",       cost: 1200,  hunger: 35, energy: 8,  emoji: "🥣" },
  pounded_yam:   { name: "Pounded Yam & Efo", cost: 2000,  hunger: 50, energy: 12, emoji: "🍲" },
  suya:          { name: "Suya",              cost: 800,   hunger: 15, energy: 5,  emoji: "🍢" },
  okpa:          { name: "Okpa (Igala)",      cost: 600,   hunger: 25, energy: 8,  emoji: "🥟" },
  bottled_water: { name: "Bottled Water",     cost: 200,   hunger: 5,  energy: 5,  emoji: "💧" },
  soft_drink:    { name: "Soft Drink",        cost: 400,   hunger: 8,  energy: 10, emoji: "🥤" },
  energy_drink:  { name: "Energy Drink",      cost: 1000,  hunger: 5,  energy: 25, emoji: "⚡" },
  beer:          { name: "Cold Beer",         cost: 1500,  hunger: 5,  energy: -5, emoji: "🍺" }
};

// ---- NEED DRAIN RATES (per real-time hour) ----
export const NEED_DRAIN = {
  hunger: 4,      // hungry gets hungry every hour
  energy: 2,      // tires slowly
  fun: 3,         // bored faster
  social: 2,      // lonely
  hygiene: 3      // dirty
};

// ---- WORK COOLDOWN ----
// How many minutes between work sessions (real time)
export const WORK_COOLDOWN_MIN = 30;

// ---- TRAVEL COST ----
export const TRAVEL_COST = {
  base: 3000,       // base cost
  energyCost: 15    // energy drained
};
