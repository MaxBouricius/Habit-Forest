@AGENTS.md

# Forest of Habits (Habit-Forest)

Expo / React Native, Android-first, local-only SQLite. Each habit is a pixel-art tree that grows when the habit is done (watering). Personal use first; friends via APK; portfolio; maybe free Play Store later; iOS maybe much later.

## Working rules (from the owner, Max)
- NEVER create art assets (pixel art, sprites, icons, tiles) without asking first. Max draws all art himself. Give specs, not art. Code-drawn placeholders (plain colored Views) are fine when he asks for them.
- Before editing any file, say which files will change and how, then wait for Max's approval. Reading files and running tests/typechecks needs no approval.
- One change at a time; do not paste a wall of changes.
- Short commit messages (TL;DR style).
- Prefer editing the real files in the repo over describing edits.
- Pixel art is exported at 16x; images are sized as fileWidth / PixelRatio.get() so 1 art pixel = a whole number of physical pixels. Keep zoom stops at k/16.

## Rules of the game (src/game/treeRules.ts + tests)
- Never store tree stage/health; derive everything from the watering log.
- Day runs 05:00 to 05:00; 00:00-05:00 is a grace window counting for the day that is ending.
- Growth: 21 periods (day trees), 6 (week), 3 (month). A missed period costs 1 progress; the planting period is never punished.
- Maintenance: after a miss a grown tree enters withering stage 1 after 3 days, stage 2 after 3 more; each stage needs 2 met periods to recover; trees never die.
- Week/month trees: one watering per day. Droplet shows in the last 5 hours of a period if not met.

## Code map
- src/game/treeRules.ts, treeSprites.ts, grid.ts (+ tests)
- src/db/schema.ts (DATABASE_VERSION 3: trees incl. grid_x/grid_y, waterings, settings), useForest.ts, useParkName.ts, backup.ts, backupFormat.ts
- src/components: TreeSprite, Droplet, BorderUi (PixelFrame), PopupFrame, Panel, ParkPlaque, Btn, PixelText (Alagard font), WaterBar, SettingsButton, SettingsPanel, WelcomePanel, TreePanel, ScreenFrame, WorldMap
- src/app: index.tsx (forest list), plant.tsx, world.tsx (test screen), _layout.tsx
- example/ is the leftover Expo template; its tsc errors are expected and can be ignored.

## World view (in progress)
Done: grid.ts (MAP_COLS x MAP_ROWS, firstFreeCell, assignMissing), schema v3 migration with auto-placement, useForest exposes gridX/gridY and move(id,x,y), WorldMap.tsx (square 32x32-art-pixel cells, code-drawn green placeholder ground with darker borders, one-finger pan, pinch zoom snapping to k/16, ground always fills the screen, tap tree to pick up / tap lit tile to drop), world.tsx test screen.

Still to do:
1. Wire the Move button in TreePanel (currently disabled) to start move mode in the world.
2. Make the world the main screen instead of the forest list (tap tree opens the tree popup).
3. Call placeUnplacedTrees(db) after a backup restore (backups have no positions yet); consider adding positions to the backup format.
4. Expandable land later.
5. Real ground tiles are drawn by Max later; ask before making any art.

## Other backlog
Reminders, earlier warning for week/month trees, rollover/week-start settings, edit/delete tree, archived trees list, rename park, more tree species, watering feedback, release test-tool switch, Alagard credit, README with screenshots, Play Store release, iOS. See FEATURES.md.

## Build notes (Windows)
Local builds: `npx expo run:android [--variant release]`, `npx expo prebuild --platform android --clean`. JDK 17 (Temurin) via JAVA_HOME. Project lives in C:\dev\habit-forest (short path). Do not press `w` in Expo (expo-sqlite web worker error is expected).
