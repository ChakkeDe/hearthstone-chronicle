# Hearthstone Chronicles - Development Rules

## Project Direction

- Mobile-first fantasy kingdom idle game
- Vanilla HTML/CSS/JavaScript only
- PWA-compatible
- Single-player focused

## Technical Constraints

- Do not add React, Vue, TypeScript, or bundlers
- Do not introduce unnecessary dependencies
- Preserve save compatibility
- Preserve gameplay unless explicitly requested
- Keep script loading simple
- Prioritize maintainability over cleverness

## Architecture Rules

- Refactor incrementally
- Prefer modular files over large monolithic files
- Keep balancing data in `src/data/`
- Avoid hidden side effects
- Do not rewrite systems without approval

## Gameplay Rules

- Prioritize kingdom progression
- Avoid feature creep
- Avoid excessive currencies/resources
- Keep combat lightweight
- Focus on long-term progression and replayability

## UI/UX Rules

- Mobile readability first
- Large touch targets
- Minimal popup spam
- Clear progression feedback
- Avoid cluttered interfaces

## Codex Expectations

- Make small reviewable changes
- Summarize changed files
- Explain architectural decisions
- Do not make unrelated changes
- Do not change formatting unnecessarily

## Verification

- Run `node --check src/game.js`
- Run `node --check src/save.js`
- Run `node --check src/pwa.js`
- Run `node --check sw.js`
- Do a manual save/load check after gameplay or save changes
- Do a manual offline progress check after timer or save changes
- Do a manual PWA update check after release or cache changes
