# Asset provenance and regeneration notes — Italy benchmark

The benchmark's required earth/globe assets are included under `public/data/`:
- Blue Marble region/world textures: NASA Earth Observatory, public domain.
- Relief bump maps: Natural Earth 10m GRAY_HR_SR_OB, public domain.
- Cloud overlays: NASA cloud-combined global raster, public domain.

Regenerate with `python3 scripts/make_earth_v6.py` after placing the downloaded source rasters in `/var/tmp/ne/`. The script uses memory-conscious region crops and strip processing. Update the matching bounds in `src/components/EarthGlobe.tsx` if the test region changes.

Historical boundaries: `python3 scripts/build_italy_data.py`, then `npx tsx scripts/geo2topo_italy.ts`, then `npx tsx scripts/label_fit.ts`. The generated TopoJSON files are committed so a render does not need shapefile processing.

Narration alignment can be rebuilt with `python3 scripts/align_vo.py` after installing `faster-whisper`, `mutagen`, and `imageio-ffmpeg`. SFX can be regenerated with `python3 scripts/make_sfx.py`.
