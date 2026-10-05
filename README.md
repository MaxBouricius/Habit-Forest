# Welcome to Forest of Habits






## Features
 
Effort of what is still to do: **(1)** short task **(2)** medium task **(3)** bigger task
 
### Done
 
**Habit and tree rules**
- [x] Plant a tree with a name, a schedule (day, week or month) and a number of required times watered
- [x] Growth takes 21 periods for a daily tree (6 for weekly, 3 for monthly); a missed period costs 1 progress, and the planting period is never punished
- [x] Maintenance: after a miss, a grown tree enters (after 3 days) withering stage 1 and stage 2 after another 3; each stage takes 2 met periods to recover, and trees never die
- [x] A day runs 05:00 to 05:00, with a grace window from 00:00 to 05:00 where a watering counts for the day that is ending
- [x] Weekly and monthly trees allow one watering per day
- [x] Streaks (current and best)
- [x] Droplet when a tree is thirsty
- [x] Dry, damp and wet ground under each tree, depending on whether it can still be watered
- [x] Test suite for the rules and the backup checker (29 tests)
**Screens and popups**
- [x] Forest screen with a two-column tree grid
- [x] Tree popup with the tree on its ground scene a Water button and four info tiles (streak, growth, period, status), rename by tapping the name, and archive with a confirmation
- [x] Welcome popup that asks you to name your park, and a name plaque at the top
- [x] Settings button and screen
**Look and feel**
- [x] Hand-drawn pixel art throughout: screen border, popup frame, name plaque, buttons, tree sprites(pine in its growth and wither stages) droplet, ground tiles, settings icon and pencil
- [x] Alagard pixel font, with sizes snapped to its pixel grid so it stays sharp
**Data and sharing**
- [x] Local-only storage with versioned migrations
- [x] Backup to a JSON file through the share sheet, and Restore with checks, a confirmation, and an all-or-nothing replace
- [x] Test tools for development builds only: a +3 days button per tree, and a simulated 00:30 clock
- [x] Standalone release APK that works away from the computer
### Still to do
 
**Habit tool**
- [ ] **(2)** Reminders: notifications at a chosen time
- [ ] **(1)** Earlier warning for week and month trees, since the droplet comes too late for them
- [ ] **(2)** Settings for the day rollover hour and the week's start day, which are fixed numbers now
- [ ] **(1)** More withering stages
- [ ] **(2)** A tuning pass over growth, recovery and decay after a week or two of real use
**Managing trees and the park**
- [ ] **(2)** Edit a tree: change its schedule or waterings or delete
- [ ] **(2)** Archived trees list: maybe a way to store logs from an archived tree to remember your hard work
- [ ] **(1)** Rename the park after the first naming
- [ ] **(1)** More tree types, with a species picker on the plant screen
**Polish**
- [ ] **(2)** Watering feedback: an animation, and maybe a sound
- [ ] **(1)** Parchment grain texture in the popups
- [ ] **(1)** App icon, splash screen and app name
- [ ] **(1)** README with screenshots
**The big feature**
- [ ] **(3)** World view with placing trees and a move mode (similar view to stardew valley)
- [ ] **(2)** Expandable land
**Publishing**
- [ ] **(2)** Play Store release
- [ ] **(3)** iOS version


## Credits

### Testers
Jowi,Goku,Son

### Font
Alagard by Hewett Tsoi

### Art inspiration
Stardew Valley by Eric Barone