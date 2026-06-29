// Refreshes data.json from the football API (API-Football / api-sports.io).
// Counts NORMAL-TIME goals only (score.fulltime = score after 90 mins, excludes
// extra time and penalties), skips the third-place play-off, and lists eliminated
// teams. Run by .github/workflows/update.yml on a schedule.
//
// Env: API_FOOTBALL_KEY  (free key from dashboard.api-football.com)
// Optional env: WC_LEAGUE_ID (default 1 = FIFA World Cup), WC_SEASON (default 2026)

import { readFileSync, writeFileSync } from "node:fs";

const KEY = process.env.API_FOOTBALL_KEY;
const LEAGUE = process.env.WC_LEAGUE_ID || "1";
const SEASON = process.env.WC_SEASON || "2026";
if (!KEY) { console.error("Missing API_FOOTBALL_KEY"); process.exit(1); }

const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FINISHED = new Set(["FT", "AET", "PEN"]);

// API round name -> { label shown on the dashboard, counts toward the goal total, sort order }
const ROUND_META = {
  "Round of 32":     { label: "Round of 32",          counts: true,  order: 1 },
  "Round of 16":     { label: "Round of 16",          counts: true,  order: 2 },
  "Quarter-finals":  { label: "Quarter-finals",       counts: true,  order: 3 },
  "Quarterfinals":   { label: "Quarter-finals",       counts: true,  order: 3 },
  "Semi-finals":     { label: "Semi-finals",          counts: true,  order: 4 },
  "Semifinals":      { label: "Semi-finals",          counts: true,  order: 4 },
  "3rd Place Final": { label: "Third-place play-off", counts: false, order: 5 },
  "Final":           { label: "Final",                counts: true,  order: 6 }
};

// Normalise API team names to the names used in the sweepstake (index.html players[].teams).
const ALIAS = {
  "United States": "USA",
  "Congo DR": "DR Congo", "Congo": "DR Congo",
  "Cote D'Ivoire": "Ivory Coast", "Côte d'Ivoire": "Ivory Coast",
  "Cabo Verde": "Cape Verde",
  "Bosnia and Herzegovina": "Bosnia",
  "Holland": "Netherlands"
};
const norm = n => (n == null ? n : (ALIAS[n] || n));
const num = v => (typeof v === "number" ? v : 0);

function fmtDate(iso) {
  const d = new Date(iso);
  return d.getUTCDate() + " " + MON[d.getUTCMonth()];
}

async function main() {
  const url = `https://v3.football.api-sports.io/fixtures?league=${LEAGUE}&season=${SEASON}`;
  const res = await fetch(url, { headers: { "x-apisports-key": KEY } });
  if (!res.ok) { console.error("API HTTP " + res.status); process.exit(1); }
  const body = await res.json();
  if (body.errors && (Array.isArray(body.errors) ? body.errors.length : Object.keys(body.errors).length)) {
    console.error("API errors:", JSON.stringify(body.errors)); process.exit(1);
  }
  const fixtures = Array.isArray(body.response) ? body.response : [];

  const knockout = fixtures.filter(f => ROUND_META[f.league?.round]);
  if (!knockout.length) {
    console.error("No knockout fixtures found yet — leaving data.json unchanged.");
    process.exit(0);
  }

  const eliminated = new Set();
  const matches = knockout.map(f => {
    const meta = ROUND_META[f.league.round];
    const st = f.fixture?.status?.short;
    const done = FINISHED.has(st);
    const ft = f.score?.fulltime || {};
    const home = norm(f.teams?.home?.name) || "TBD";
    const away = norm(f.teams?.away?.name) || "TBD";
    const ng = done ? (num(ft.home) + num(ft.away)) : null;

    if (done) {
      if (f.teams?.home?.winner === false) eliminated.add(norm(f.teams.home.name));
      else if (f.teams?.away?.winner === false) eliminated.add(norm(f.teams.away.name));
    }

    let det = null;
    if (done) {
      det = `${num(ft.home)}–${num(ft.away)}` +
            (st === "AET" ? " (a.e.t.)" : st === "PEN" ? " (pens)" : "");
    }

    return {
      id: String(f.fixture.id),
      rnd: meta.label,
      date: fmtDate(f.fixture.date),
      home, away,
      ng,
      counts: meta.counts,
      ...(det ? { det } : {}),
      _order: meta.order,
      _ts: new Date(f.fixture.date).getTime()
    };
  });

  matches.sort((a, b) => (a._order - b._order) || (a._ts - b._ts));
  matches.forEach(m => { delete m._order; delete m._ts; });

  const now = new Date();
  const asOf = `${now.getUTCDate()} ${MON[now.getUTCMonth()]} ${now.getUTCFullYear()}, ` +
               `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")} UTC`;

  const out = { asOf, eliminated: [...eliminated].sort(), matches };

  // Don't overwrite good data with a clearly-broken (goalless, no eliminations) pull.
  const goals = matches.reduce((s, m) => s + (m.counts && m.ng != null ? m.ng : 0), 0);
  const played = matches.filter(m => m.counts && m.ng != null).length;
  if (played === 0 && out.eliminated.length === 0) {
    console.error("Pull has no completed games — leaving data.json unchanged.");
    process.exit(0);
  }

  writeFileSync(new URL("../data.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote data.json: ${played} games, ${goals} normal-time goals, ${out.eliminated.length} teams out (${asOf}).`);
}

main().catch(e => { console.error(e); process.exit(1); });
