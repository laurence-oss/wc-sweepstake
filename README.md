# World Cup 2026 — Knockout Goals Sweepstake (auto-updating dashboard)

A self-hosting, self-updating version of Darren's knockout goals tracker. Once set up,
it lives at a web link you can share in WhatsApp, and refreshes itself every ~20 minutes
during the knockouts — no input needed from anyone.

## What's in here

| File | What it does |
|------|--------------|
| `index.html` | The dashboard. Reads live numbers from `data.json` (falls back to built-in data if offline). |
| `data.json` | The live data (goals per game, eliminated teams, "as of" time). The scheduler rewrites this. |
| `scripts/generate.mjs` | Pulls results from the football API, counts **normal-time** goals only, skips the third-place game, writes `data.json`. |
| `.github/workflows/update.yml` | Runs the generator every ~20 min and commits any change. |

## One-time setup (~10 minutes)

### 1. Create a GitHub account (free)
Go to https://github.com → Sign up. (Skip if you already have one.)

### 2. Create a repository
- Click **+** (top-right) → **New repository**.
- Name it e.g. `wc-sweepstake`. Set it to **Public**. Click **Create repository**.

### 3. Upload these files
- On the new repo page: **Add file → Upload files**.
- Drag in `index.html`, `data.json`, the `scripts` folder, and the `.github` folder
  (drag the whole `wc2026-dashboard` contents — folders keep their structure).
- Click **Commit changes**.

### 4. Get a free football-data API key
- Go to https://dashboard.api-football.com → sign up (free plan: 100 requests/day; we use ~72).
- Copy your **API key** from the dashboard.

### 5. Add the key as a repo secret
- In your repo: **Settings → Secrets and variables → Actions → New repository secret**.
- Name: `API_FOOTBALL_KEY`  ·  Value: *(paste your key)* → **Add secret**.

### 6. Turn on hosting (GitHub Pages)
- **Settings → Pages**.
- Under **Build and deployment → Source**, choose **Deploy from a branch**.
- Branch: **main**, folder: **/ (root)** → **Save**.
- After ~1 minute your link appears at the top: `https://YOUR-USERNAME.github.io/wc-sweepstake/`
- **That link is what you share in the WhatsApp group.**

### 7. Kick off the first auto-update (optional)
- **Actions** tab → **Update dashboard** → **Run workflow**. (Otherwise it runs on the schedule.)

## How updating works
- The scheduler runs every ~20 minutes. After a game finishes, the dashboard updates within ~30 min.
- It counts only goals scored in normal time (the API's 90-minute score); extra-time and penalty
  goals, and the third-place play-off, are excluded — matching the sweepstake rules.
- Eliminated teams are struck through automatically in the "Teams drawn" section.

## If something looks off
- **Numbers not updating:** Actions tab → open the latest run → read the log. The most common
  causes are a wrong/expired API key, or the API using a different league id/season.
- **Wrong World Cup data:** the generator defaults to league id `1` (FIFA World Cup), season `2026`.
  If your API plan numbers them differently, add repo variables `WC_LEAGUE_ID` / `WC_SEASON`
  (Settings → Secrets and variables → Actions → Variables) and reference them, or tell Claude to adjust.
- **A team name doesn't strike through:** the API may spell it differently. Add it to the `ALIAS`
  map in `scripts/generate.mjs` (e.g. `"Cabo Verde": "Cape Verde"`).

## Predictions / players
These are fixed and live in `index.html` (the `players` array). Steve is out of the goals
prediction but still in the teams competition. To change a prediction, edit that array and commit.
