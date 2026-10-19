# ATLAS-DOC — Italy Test

**The Unification of Italy, 1815–1871** — a short historical map documentary built with Remotion 4.0.230.

## Pipeline
- `src/` — Remotion composition, animated globe, labels, flags, archival cards, timeline, and music/SFX.
- `public/data/italy_1815.json` and `italy_1871.json` — historical boundaries from Natural Earth 10m admin-1 unions.
- `public/data/earth_*.jpg`, `bump_*.jpg`, `clouds_*.png` — NASA Blue Marble / Natural Earth relief / NASA cloud textures.
- `public/audio/vo/` — six narration files plus Whisper word-level timing.
- `public/archive/` — sourced public-domain images and one 1896 Lumière-era Venice film; provenance is in `public/archive/credits.json`.
- `.github/workflows/stills.yml` — still-image preview; `.github/workflows/render_parallel.yml` — chunked video/audio render.

## Local checks
```bash
npm ci
npx tsc --noEmit -p .
npx tsx scripts/label_fit.ts
npx tsx scripts/qa_check.ts 0.1
```

The final render is not launched until the preview stills have been reviewed and the user explicitly approves it. Full credits and delivery notes: `CREDITS_AND_LICENSES.md`.
