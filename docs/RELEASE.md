# Release Process

This document defines the permanent release flow for Hearthstone Chronicles.

## Before Release Checklist

1. Confirm the change still follows [AGENTS.md](../AGENTS.md).
2. Re-read any relevant design constraints in [GDD.md](GDD.md).
3. Verify no unnecessary dependencies or tooling were introduced.
4. Run the required syntax checks:
   - `node --check src/game.js`
   - `node --check src/save.js`
   - `node --check src/pwa.js`
   - `node --check sw.js`
5. Run a manual save/load check after gameplay or save changes.
6. Run a manual offline progress check after timer or save changes.
7. If the release touches the app shell, cached files, or deployment flow, run a manual PWA update check before and after deployment.

## Version Bump Checklist

When the release should present a new visible build to players:

1. Bump the app version in [../version.json](../version.json).
2. Bump the cache version in [../version.json](../version.json).
3. Update the visible version label if needed.
4. Confirm the app version shown in the UI still matches the intended release.

## PWA Cache Bump Checklist

When changing cached shell files or static assets:

1. Bump `CACHE` in [../sw.js](../sw.js).
2. Ensure the cache version in [../version.json](../version.json) matches `CACHE` exactly.
3. Ensure all required static assets are listed in the `ASSETS` array in [../sw.js](../sw.js).
4. Verify any new script loaded by [../index.html](../index.html) is also cached in [../sw.js](../sw.js).
5. Keep the caching strategy unchanged unless the release explicitly intends to alter update behavior.

## GitHub Pages Deployment Checklist

1. Merge or push the release-ready commit to `main`.
2. Wait for GitHub Pages to finish publishing the new build.
3. Open the live site once the deploy completes.
4. Confirm the live header version label matches the intended release.
5. Confirm [../version.json](../version.json) on the deployed site reflects the new app and cache values.

## Post-Release Smoke Test

1. Open the live app in a normal browser tab.
2. Verify the app loads without console errors.
3. Verify save/load still works.
4. Verify offline progress still applies correctly if the release touched save or timer behavior.
5. Verify the installed PWA receives the update:
   - use **Check for Update**
   - if needed, use **Reload Latest Version**
   - confirm the installed PWA moves to the new visible version
6. Confirm the new cache is active and stale shell assets are not still being served.
