# The atlas basemap

How the map under the atlas was made, and how to make it again. Read this before touching anything in `public/basemap/`, `scripts/basemap/`, or `src/config/basemap.ts`.

## What it is

The basemap is a Protomaps vector basemap cut from the daily planet build into two PMTiles files, plus the label glyphs, all in one folder:

```
public/basemap/
  overview.pmtiles      North Atlantic, zooms 0 to 6
  detail.pmtiles        North and Mid Wales + Sudbury Basin to the Kawarthas, zooms 6 to 10
  fonts/
    Noto Sans Regular/  0-255.pbf, 256-511.pbf, 8192-8447.pbf
    Noto Sans Italic/   0-255.pbf, 256-511.pbf, 8192-8447.pbf
```

The style that draws it is `src/lib/map-style.ts`. The folder's location comes from `PUBLIC_BASEMAP_URL` (default `/basemap`), read in `src/config/basemap.ts`.

### Why two files

The atlas covers two areas about 5,000 km apart: North Wales and central Ontario. One bounding box over both at zoom 10 would cover most of the North Atlantic coastline at full detail, roughly ten times the size limit below. So:

- **Overview** is coarse and wide. It draws underneath at every zoom, overzoomed past 6, so land never vanishes when you pan away from the regions. Its boundaries and labels stop at zoom 7.
- **Detail** is fine and narrow. It only draws from zoom 6 and paints over the overview inside its two boxes. Its boundaries and labels take over at zoom 7.

Outside the two detail boxes, above zoom 7 you get land and water from overzoomed overview tiles but no labels or boundaries. That is deliberate: the map is a plate for the places in the atlas, not a navigation tool.

### Why maxzoom 10

This is a drawn plate showing where a place sits in its landscape. Zoom 10 already shows the small upland lakes of Snowdonia and the Kawarthas, the river network, and village names. The atlas opens at about zoom 3.4, fitted to both regions. Each extra zoom level roughly doubles the detail file. Do not raise it unless the map genuinely reads as too coarse.

## The current extract

|       | Overview                                       | Detail                                  |
| ----- | ---------------------------------------------- | --------------------------------------- |
| File  | `public/basemap/overview.pmtiles`              | `public/basemap/detail.pmtiles`         |
| Area  | bbox `-95,35,10,62` (west, south, east, north) | `scripts/basemap/detail-region.geojson` |
| Zooms | 0 to 6                                         | 6 to 10                                 |
| Size  | 6,897,857 bytes (6.9 MB, 6.6 MiB)              | 15,763,022 bytes (15.8 MB, 15.0 MiB)    |

The detail region is a MultiPolygon of two boxes:

- North and Mid Wales: `-5.0,51.9,-2.9,53.5` (Anglesey to Llanidloes, Cardigan Bay to the English border), about 4.0 MB on its own
- Sudbury Basin to the Kawarthas: `-81.9,44.1,-78.1,47.2`, about 12 MB on its own

Glyphs come to 532 KB on disk. A visitor fetches only the ranges their labels use, normally just `0-255` (about 76 KB per font).

Provenance:

- Planet build: `https://build.protomaps.com/20261015.pmtiles` (basemap schema 4.15.2, OSM data as of 2026-10-15 04:00 UTC)
- pmtiles CLI: go-pmtiles v1.31.2
- Glyphs: `protomaps/basemaps-assets` at commit `028c18f713baecad011301ff7a69acc39bcc2ae7`
- Extracted on 2026-10-15

### Where it lives, and the size rule

Each file must stay under about 20 MB so it can be a plain static asset in `public/` on any host. Cloudflare Workers static assets refuse any single file over 25 MiB, so that limit is hard, not a guideline.

Both files are currently in `public/` and committed to the repository. That added about 23 MB to the repository, which was 6.5 MB before. Every regeneration adds another ~23 MB to git history permanently, because PMTiles tiles are already compressed and do not delta. Regenerate deliberately, when the map needs it, never on a schedule.

How the boxes were sized (dry-run estimates from the same planet build):

| Variant                                                                         | Size                  |
| ------------------------------------------------------------------------------- | --------------------- |
| Detail, Wales `-5.6,51.3,-2.6,53.5` + Ontario `-82.2,43.6,-77.6,47.3`, z6 to 10 | 24 MB, over the limit |
| Ontario alone, south edge 43.6 (includes Toronto)                               | 16 MB                 |
| Ontario alone, south edge 44.1                                                  | 14 MB                 |
| Ontario alone, south edge 44.1, maxzoom 9                                       | 6.3 MB                |
| Wales alone, all of Wales `-5.6,51.3,-2.6,53.5`                                 | 8.1 MB                |

Ontario is heavy because of the lakes: every one is a polygon. If the detail file has to shrink, take Toronto and southern Wales out first (already done), then tighten Ontario, and only then drop to maxzoom 9.

## Regenerating from scratch

Do this when the atlas gains a place outside both detail boxes, when OSM data in the regions has changed enough to matter, or when the Protomaps schema version changes (check the style still renders, see below).

### 1. Get the pmtiles CLI

Download the release for your platform from https://github.com/protomaps/go-pmtiles/releases (`go-pmtiles_<version>_Windows_x86_64.zip`, `_Darwin_arm64.zip`, `_Linux_x86_64.tar.gz`, ...) and unpack the single `pmtiles` binary somewhere outside the repository. On macOS `brew install pmtiles` also works. Check it with `pmtiles version`.

### 2. Pick a planet build

Daily builds are listed at https://build-metadata.protomaps.dev/builds.json. Take the newest `key`, for example `20261015.pmtiles`. Old daily builds are deleted after a while, so the date above is provenance, not something you can rely on refetching. Note the `version` field: if its major number has moved on from 4, read the Protomaps changelog for layer and property renames before trusting the style.

```sh
PLANET=https://build.protomaps.com/20261015.pmtiles   # use the newest
```

### 3. Dry-run, then extract

Run from the repository root. `--dry-run` downloads nothing and prints the archive size it would produce, so size the extract before committing to it:

```sh
pmtiles extract $PLANET public/basemap/overview.pmtiles --bbox=-95,35,10,62 --maxzoom=6 --dry-run
pmtiles extract $PLANET public/basemap/detail.pmtiles --region=scripts/basemap/detail-region.geojson --minzoom=6 --maxzoom=10 --dry-run
```

If both are under 20 MB, run the same two commands without `--dry-run`. Each takes a few seconds; the CLI fetches only the byte ranges it needs from the 139 GB planet. Then check them:

```sh
pmtiles show public/basemap/overview.pmtiles
pmtiles show public/basemap/detail.pmtiles
```

If you change a zoom range, change it in `src/config/basemap.ts` as well (`overviewMaxZoom`, `detailMinZoom`, `detailMaxZoom`) and in this file. If you change the overview bbox, update `overviewBounds` there too.

### 4. Glyphs

Only needed if the fonts folder is lost or the style starts using another font or Unicode range. MapLibre requests `{fontstack}/{start}-{end}.pbf` in blocks of 256 code points. These three ranges cover Latin, Latin Extended-A (Welsh ŵ and ŷ), and typographic punctuation:

```sh
SHA=028c18f713baecad011301ff7a69acc39bcc2ae7   # or the current commit of protomaps/basemaps-assets
for stack in "Noto Sans Regular" "Noto Sans Italic"; do
  mkdir -p "public/basemap/fonts/$stack"
  for range in 0-255 256-511 8192-8447; do
    curl -fL -o "public/basemap/fonts/$stack/$range.pbf" \
      "https://raw.githubusercontent.com/protomaps/basemaps-assets/$SHA/fonts/${stack// /%20}/$range.pbf"
  done
done
```

A label with a character outside these ranges renders without that character and logs a warning in the browser console. Add the range here rather than pointing the style at a third-party glyph host.

### 5. Verify

1. `npm test`. `src/lib/map-style.test.ts` checks the style's colours still match `app.css`, and that every file and font stack the style names exists in `public/basemap/`.
2. Look at it in both themes. The atlas page does this once the island exists. Until then, use a scratch page outside the repository: load `maplibre-gl` 5.x and the `pmtiles` script, call `maplibregl.addProtocol('pmtiles', new pmtiles.Protocol().tile)`, and pass it `createMapStyle({ basemapUrl: 'http://localhost:<port>/basemap', theme })`. Serve it with any static server that answers range requests. Check the opening view fitted to both regions, Wales around zoom 9, Sudbury around zoom 8, and a view just outside a detail box at zoom 7.
3. Watch the network panel while panning: every request to a `.pmtiles` file should be a `206 Partial Content`. A `200` for the whole file means the host is ignoring `Range`, and PMTiles is pointless there.
4. Update the tables and provenance in this file, and put the new sizes and planet date in the commit body.

### Widening a region

When an atlas entry lands outside both boxes, either grow the nearest box in `scripts/basemap/detail-region.geojson` or add a third polygon to the MultiPolygon. Dry-run first: the size rule applies to the whole detail file. If a new region pushes it over, split detail into one file per region with a source each in `map-style.ts`, or move to object storage as below. Do not raise the limit.

## Moving it off the site host

If a file has to exceed 20 MB, or Phase 4 hosting prefers it, move the whole `public/basemap/` folder to object storage that supports HTTP range requests (Cloudflare R2, or any S3-compatible bucket):

1. Upload the folder's contents unchanged, keeping the `fonts/<stack>/<range>.pbf` layout.
2. Allow CORS for `GET` and `HEAD` from the site origin, allow the `Range` request header, and expose `Content-Range`, `Content-Length`, and `ETag`.
3. Set `PUBLIC_BASEMAP_URL` to the folder's public URL (no trailing slash needed) in the build environment.
4. Remove `public/basemap/` from the repository and the `/basemap/*` rule from `public/_headers`.

No code changes. If you find yourself editing `map-style.ts` to move the files, something has gone wrong.
