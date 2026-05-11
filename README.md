# Hearthstone Chronicles

Hearthstone Chronicles is a mobile-first fantasy kingdom idle and incremental strategy game built as a static web app. The game blends passive economy growth with research, troop training, hero quests, raids, village control, seasonal progression, and dynasty-level long-term goals.

The project stays intentionally simple on the tech side: vanilla HTML, CSS, and JavaScript, static hosting, and installable PWA support.

## Game Overview

Players grow a kingdom over repeated sessions by balancing:

- resource production and storage
- building upgrades and unlock chains
- research queues and long-term economy planning
- troop recruitment, raiding, and defence
- hero progression, questing, and army utility
- dynasty progression, governed villages, and seasonal goals

The design goal is a strategic idle game that feels readable on mobile, rewards regular check-ins, and supports long-term progression without requiring a heavyweight engine or backend.

## Features

- Mobile-first single-page kingdom management UI
- Installable PWA with offline-aware update flow
- Persistent save/load with offline progress support
- Resource economy, storage, and building progression
- Research trees with multiple progression lanes
- Hero quests, army assignment, and progression systems
- Combat, raid targets, governed villages, and tribute
- Seasonal progression and dynasty-style long-term advancement
- Static deployment on GitHub Pages

## Documentation

- [Development Rules](AGENTS.md)
- [Game Design Document](docs/GDD.md)
- [QA Checklist](docs/QA.md)
- [Release Process](docs/RELEASE.md)

## Local Setup

This repo has no build step and no package dependencies.

### Quick open

For a fast visual check, open `index.html` directly in a browser.

### Recommended local server

For service worker, cache, and PWA behavior, run a simple static server instead:

```bash
python -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

### Basic verification

Use syntax checks before testing in a browser:

```bash
node --check src/game.js
node --check src/save.js
```

Then verify the app still:

- loads without console errors
- restores saves correctly
- applies offline progress correctly
- updates cleanly through the service worker flow

## GitHub Pages Deployment

The app is designed for static hosting and works well on GitHub Pages.

### Setup

1. Push the desired changes to `main`
2. Open the repository **Settings**
3. Go to **Pages**
4. Choose **Deploy from a branch**
5. Select `main` and the repository root
6. Save and wait for the deployment to complete

### Deployment notes

- `index.html` is the app entry point
- `manifest.json` controls install metadata
- `sw.js` and `version.json` drive update behavior
- Player-visible updates should bump the version metadata and the service worker cache key together

After deployment, give GitHub Pages a minute or two to publish before testing on mobile or in a PWA install.

## Project Structure

```text
hearthstone-chronicle/
  AGENTS.md
  README.md
  docs/
    GDD.md
    QA.md
  assets/
  styles/
    main.css
  src/
    game.js
    save.js
    pwa.js
    data/
      buildings.js
      combat.js
      heroes.js
      map.js
      progression.js
      research.js
  index.html
  manifest.json
  sw.js
  version.json
  test.html
```

### Structure notes

- `src/game.js` holds the main game loop, rendering, and orchestration
- `src/save.js` holds save/load and cloud persistence helpers
- `src/data/` contains balance and definition tables for major systems
- `styles/main.css` contains the mobile-first UI styling
- `docs/` contains project-facing design and QA documentation

## Development Workflow

The intended workflow is small, reviewable, low-risk iteration.

1. Read [AGENTS.md](AGENTS.md) before large changes
2. Check [docs/GDD.md](docs/GDD.md) when a change affects design direction or progression
3. Keep gameplay edits scoped and incremental
4. Preserve save compatibility unless a migration is deliberately added
5. Run syntax checks for touched scripts
6. Test the app in a browser, especially on mobile-sized layouts
7. If the update affects caching or deployment behavior, verify the PWA refresh flow

### Release workflow

Use the dedicated [Release Process](docs/RELEASE.md) document for:

- before-release checks
- version bump steps
- PWA cache bump steps
- GitHub Pages deployment steps
- post-release smoke testing

## Contributing Notes

- Preserve vanilla script loading
- Avoid architecture rewrites unless explicitly approved
- Keep balancing data in `src/data/`
- Prefer clarity and maintainability over clever abstractions
- Do not change unrelated files while working on scoped tasks
