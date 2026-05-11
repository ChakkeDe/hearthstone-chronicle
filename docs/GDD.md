# Hearthstone Chronicles — Game Design Document (GDD)

## Project Overview

**Project Name:** Hearthstone Chronicles  
**Genre:** Fantasy Kingdom Idle / Incremental Strategy Game  
**Platform:** Mobile-first Web PWA  
**Technology Stack:** Vanilla HTML, CSS, JavaScript  
**Current Architecture:** Single-page application with modular data files and centralized game state  
**Target Experience:** Long-term progression, satisfying growth, strategic kingdom management, lightweight asynchronous play

---

# Core Vision

Hearthstone Chronicles should feel like:

- A living fantasy kingdom
- A long-term progression game players return to daily
- A strategic idle game rather than a clicker spam game
- A premium-feeling mobile experience despite being browser-based
- A game where progression feels earned, not explosive
- A world with history, factions, heroes, dynasties, and legacy

The strongest aspect of the project currently is:

- The foundation for layered progression
- Strong kingdom fantasy theme
- Surprisingly deep systems for a browser game
- Mobile/PWA support
- Offline progression architecture
- Prestige/dynasty concepts

The biggest risk is:

- System bloat without clarity
- Overengineering before stabilization
- Feature creep
- Lack of modular structure
- UI overwhelm
- Poor balancing from adding too many mechanics too quickly

---

# Current State Assessment

## What Is Already Strong

### Kingdom Identity
The game already has:

- Resources
- Buildings
- Heroes
- Combat
- Research
- Prestige systems
- Seasonal progression
- Dynasty mechanics
- Relics
- Offline progression
- Village governance
- PWA installation

This is already beyond prototype stage.

### Mobile Direction
The project is correctly optimized toward:

- Portrait mode
- Large tap targets
- Persistent navigation
- PWA installability
- Lightweight rendering

This is the correct direction.

### Technical Direction
Vanilla JS is currently the correct choice because:

- Faster iteration
- No build pipeline overhead
- Easier Codex assistance
- Easy hosting
- Excellent PWA compatibility
- Lower complexity

Do NOT switch engines right now.

---

# What The Game SHOULD Become

## Target Experience

The ideal player loop should become:

1. Open game
2. Collect offline gains
3. Upgrade kingdom
4. Start research
5. Train troops
6. Send heroes/raids
7. Unlock new systems
8. Push seasonal progression
9. Prestige into stronger dynasties
10. Return later

The game should create:

- anticipation
- optimization
- kingdom attachment
- long-term goals
- strategic planning
- “one more upgrade” psychology

NOT:

- endless clicking
- confusing UI
- stat overload
- meaningless systems
- 50 currencies
- artificial grind

---

# Technology Direction

# KEEP

## Keep HTML/CSS/JS

This project is ideal for:

- DOM-based UI
- incremental systems
- lightweight rendering
- static hosting
- mobile PWA deployment

Do NOT migrate to:

- Unity
- Unreal
- Phaser
- React
- Electron
- Godot

Unless:

- You later build a fully animated tactical world map
- Real-time combat becomes core gameplay
- You move to Steam/mobile stores commercially

Right now, migration would slow development dramatically.

---

# Architecture Rules

# SHOULD DO

## 1. Modularize Carefully

Current risk:

`src/game.js` is becoming a god-file.

Target structure:

```text
src/
  game.js
  state.js
  ui.js
  save.js
  offline.js
  combat.js
  research.js
  buildings.js
  heroes.js
  prestige.js
  map.js
  audio.js
```

Keep:

- simple script loading
- no bundlers initially
- no framework dependencies

## 2. Keep Global State Predictable

Centralized state is fine.

But:

- document every field
- separate persistent vs runtime state
- avoid random flags everywhere

## 3. Add Strict Naming Conventions

Use:

- nouns for state
- verbs for actions
- constants for balancing
- predictable prefixes

Example:

```js
trainTroops()
startResearch()
applyOfflineProgress()
```

Avoid:

```js
runThing()
doUpdate2()
calcStuff()
```

## 4. Create Balancing Tables

All balancing should move into:

```text
src/data/
```

Never hardcode balancing in gameplay logic.

---

# Things You SHOULD NOT Do

## 1. Do Not Add Systems Too Fast

This is the biggest danger.

You already have:

- combat
- research
- prestige
- villages
- relics
- seasons
- heroes
- raids

That is enough for a long time.

Do NOT suddenly add:

- pets
- crafting
- guilds
- multiplayer
- diplomacy trees
- card mechanics
- trading markets
- equipment rarity systems
- 20 new resources

Until:

- current systems are balanced
- UI is clean
- progression feels smooth

## 2. Do Not Overcomplicate Combat

Combat should support kingdom progression.

Combat should NOT become:

- an RTS
- an autobattler clone
- tactical hex combat
- animation-heavy

Keep it lightweight.

## 3. Do Not Chase AAA Graphics

Your strength is:

- atmosphere
- progression
- fantasy identity
- UI feel

Not:

- 3D rendering
- cinematic visuals

Stylized minimalism is correct.

## 4. Do Not Add Frameworks Without Need

Avoid:

- React
- Vue
- Redux
- TypeScript migration
- huge NPM dependency chains

Until the project genuinely requires them.

Right now simplicity is an advantage.

## 5. Do Not Let Codex Rewrite Everything

Codex should:

- refactor carefully
- improve modules
- add contained features
- improve documentation

Codex should NOT:

- redesign the entire architecture suddenly
- replace systems wholesale
- introduce giant dependency stacks
- rewrite gameplay loops randomly

---

# Gameplay Pillars

## Pillar 1 — Kingdom Growth

The player must constantly feel:

- expansion
- increasing influence
- stronger infrastructure
- visible progress

Everything should support this.

## Pillar 2 — Meaningful Choices

Choices should matter.

Examples:

- economic focus
- military focus
- prestige path
- hero specialization
- village governance

Avoid fake choices.

## Pillar 3 — Long-Term Progression

Dynasty progression is one of your strongest ideas.

Lean into:

- legacy
- relics
- seasonal resets
- kingdom evolution
- permanent advancement

## Pillar 4 — Mobile Comfort

The game must remain:

- readable
- touch-friendly
- battery-light
- quick to resume
- stable offline

---

# UI/UX Direction

## SHOULD DO

### Prioritize Clarity

Every screen should answer:

- What do I have?
- What should I do next?
- What is blocked?
- What improved?

### Use Progressive Disclosure

Do NOT show all systems immediately.

Unlock systems gradually.

### Create Strong Visual Hierarchy

Most important:

1. resources
2. actions
3. timers
4. progression
5. lore flavor

### Use Consistent Color Logic

Examples:

- gold = economy
- red = combat
- blue = arcane
- green = growth

## SHOULD NOT DO

### Avoid Tiny Text

Especially on mobile.

### Avoid Too Many Popups

Popups should feel important.

### Avoid Excessive Animation

Subtle animation > constant movement.

---

# Audio Direction

## SHOULD DO

Eventually add:

- ambient music
- subtle kingdom sounds
- UI clicks
- battle stingers

## SHOULD NOT DO

Do NOT:

- autoplay loud music
- add noisy effects everywhere
- use low-quality fantasy sounds

Audio should feel atmospheric.

---

# Save System Rules

## CRITICAL

Your save system is one of the most important systems.

You already have good foundations.

## SHOULD DO

### Multiple Save Slots Eventually

Future goal:

- seasonal save
- experimental save
- hardcore mode

### Export/Import Saves

Very important for browser games.

### Maintain Backward Compatibility

When updating saves:

- migrate old saves
- never silently destroy progress

### Add Save Versioning

Each save should contain:

```json
{
  "saveVersion": 5
}
```

## SHOULD NOT DO

### Never Break Saves Casually

Players quit incremental games permanently when saves break.

---

# Offline Progression Rules

Offline progression is one of the core strengths.

## SHOULD DO

- cap offline gains
- prevent time exploits
- show clear summaries
- make offline progression meaningful

## SHOULD NOT DO

- give infinite offline scaling
- allow clock abuse
- hide what happened offline

---

# PWA Direction

Your PWA direction is correct.

## SHOULD DO

- maintain installability
- keep offline support
- maintain cache version discipline
- support resume-from-background

## SHOULD NOT DO

- aggressively cache stale builds
- break update flow
- make updates confusing

---

# Deployment Strategy

## Immediate

Use:

- GitHub Pages

This is perfect for the current game.

## Future

Potential future deployment:

- Cloudflare Pages
- Netlify
- mobile wrappers later if needed

---

# Content Expansion Priorities

# PRIORITY ORDER

## Priority 1 — Stabilization

Do first:

- bug fixing
- code cleanup
- balancing
- readability
- performance
- save stability
- UI clarity

## Priority 2 — Core Loop Polish

Improve:

- progression pacing
- combat pacing
- hero usefulness
- village identity
- prestige rewards

## Priority 3 — Worldbuilding

Expand:

- factions
- lore
- kingdom events
- seasonal storytelling

## Priority 4 — Retention Features

Later add:

- achievements
- challenge runs
- unique dynasty modifiers
- seasonal mutators

---

# Things To Avoid Completely

## Avoid Multiplayer

At least for a very long time.

Multiplayer introduces:

- cheating problems
- server complexity
- balancing nightmares
- support burden
- synchronization issues

Your game is currently ideal as a single-player experience.

## Avoid Live-Service Thinking

Do not design around:

- daily chores
- manipulative timers
- battle passes
- excessive monetization

Focus on a good game first.

## Avoid Endless Resources

Incremental games die when resources lose meaning.

Keep the economy understandable.

---

# Recommended Immediate Roadmap

# PHASE 1 — FOUNDATION

## Goals

- stabilize
- organize
- document

## Tasks

- improve README
- create AGENTS.md
- modularize game.js
- clean encoding issues
- add save versioning
- improve balancing documentation

---

# PHASE 2 — POLISH

## Goals

- improve retention
- improve usability

## Tasks

- improve mobile UI
- improve overlays
- improve progression feedback
- add ambient audio
- improve kingdom map visuals

---

# PHASE 3 — DEPTH

## Goals

- deepen strategic identity

## Tasks

- kingdom events
- meaningful faction paths
- hero specialization
- seasonal modifiers
- relic combinations

---

# PHASE 4 — LONG-TERM CONTENT

## Goals

- replayability
- longevity

## Tasks

- challenge dynasties
- alternate starts
- rare world events
- deeper lore systems

---

# Codex Usage Rules

## GOOD Codex Tasks

```text
Refactor without changing gameplay.
```

```text
Improve mobile responsiveness.
```

```text
Add documentation.
```

```text
Extract combat logic into modules.
```

```text
Audit save stability.
```

## BAD Codex Tasks

```text
Rewrite the entire game.
```

```text
Convert everything to React.
```

```text
Add multiplayer.
```

```text
Replace all systems.
```

---

# Final Strategic Advice

Your biggest opportunity is NOT becoming a massive AAA game.

Your opportunity is becoming:

- a polished kingdom incremental game
- with excellent mobile usability
- deep progression
- satisfying resets
- atmospheric presentation
- stable long-term gameplay

You already have enough systems.

The next stage is:

- refinement
- balancing
- organization
- polish
- clarity

Not uncontrolled expansion.

That discipline is what separates promising projects from abandoned ones.

