# 04b — Rebrand packaging, configs and static files

Branch: `rebrand/packaging`. Protocol: `docs/tasks/README.md` (gates: svelte-check ≤ 177 errors, unit ≤ 1 failure).
Mechanical task: every change is an exact text replacement in a non-TypeScript file. **Do not edit any
`.ts`/`.svelte` file and nothing under `docs/`.** Icons are already replaced; do not touch image files.

## Identity (use exactly these values)
- Product name: `Meeting Control Center`; short name where space is tight: `MCC`
- Package / slug: `meeting-control-center`; app id: `app.meetingcontrolcenter`
- Repository: `https://github.com/zerokurns/meeting-control-center`; author: `Eric Kearns`
- Description: `Meeting Control Center: a presenter for virtual and hybrid meetings (FreeShow fork)`

## Edits
1. `package.json`: `name`, add `"productName": "Meeting Control Center"` right after `name`, `description`,
   `repository` (https URL above), `author`, add `"homepage"` with the repository URL. Leave `version`, scripts,
   dependencies and `allowScripts` untouched. Keep 4-space indentation.
2. `config/building/electron-builder.yaml` and `electron-builder-lnxarm.yaml`: `appId`, `productName`,
   `artifactName: MeetingControlCenter-${version}-${arch}.${ext}`; delete the whole `azureSignOptions` block
   (it names the upstream publisher's certificate).
3. `config/building/snapcraft.yaml`: `name: meeting-control-center`, `title`, `summary`/`description` if they
   mention FreeShow, contact/issues/source/website → the repository URL (issues: `…/issues`), and the `apps:` /
   `parts:` keys `freeshow:` → `meeting-control-center:`. `scripts/snap/command.sh`: the `$SNAP/freeshow`
   executable path → `$SNAP/meeting-control-center`. `git mv scripts/snap/gui/freeshow.desktop
   scripts/snap/gui/meeting-control-center.desktop` and update `Name`, `Exec`, `StartupWMClass`, `Icon` inside.
4. `scripts/macos/notarize.js` `appBundleId`; `config/building/rollup.config.mjs` `name: "freeshow"`;
   `scripts/start.js` console line; `.github/workflows/*.yml` wherever `FreeShow`/`freeshow` appears in artifact
   names or paths (not in `uses:` action references).
5. `public/index.html` `<title>`, `public/loading.html` `<title>` and `<h1>`; `src/server/{remote,stage,controller,output_stream,cam}/index.html`
   titles; `src/server/*/manifest.json` `name`/`short_name`: RemoteShow → `MCC Remote`, StageShow → `MCC Stage`,
   ControlShow → `MCC Controller`, OutputShow → `MCC Output`, the cam one → `MCC Camera` (keep other fields).
6. `public/lang/*.json` (all 31): replace the exact token `FreeShow` with `Meeting Control Center` in **values
   only** with `sed -i 's/FreeShow/Meeting Control Center/g' public/lang/*.json` (keys never contain the brand;
   sed keeps formatting). Then `node -e` a JSON.parse over all 31 files to prove they still parse.
7. `config/testing/start.test.ts`: only the comment "…for FreeShow to start up…" (another worker removes the
   `context.route` lines in the same file; do not touch those).
8. Verify with `grep -rniE "freeshow|churchapps|livecs|live church" package.json config scripts public/*.html public/lang src/server/*/index.html src/server/*/manifest.json .github`
   and report every remaining hit (expected: none except `docs/`, the `(FreeShow fork)` wording in the
   description, and `public/import-logos/freeshow.webp` which 04c handles).

## Definition of done
Protocol steps 2–7. Additionally `npm run pack` is **not** required; just confirm `npx electron-builder
--config config/building/electron-builder.yaml --help` is not needed either — a YAML parse check is enough:
`node -e 'require("js-yaml")'` is unavailable, so use `python3 -c 'import yaml,sys; [yaml.safe_load(open(f)) for f in sys.argv[1:]]' config/building/*.yaml`.
One commit: `chore(brand): rename packaging, configs and static files to Meeting Control Center`.
