# Lee's Business With Your Business

An incremental game about cleaning toilets. Then all of them. Then the ones in space.

Open `index.html` in a browser. No build step. Saves go to the browser's localStorage.

## How it plays

Toilets make **messes**. Cleaning a mess earns **pennies**. Income is whichever is smaller:
how fast messes appear, or how fast you can clean them. The panel under the toilet tells you
which side is the bottleneck.

- **Staff** add cleaning capacity.
- **Contracts** add toilets, up to every toilet on Earth (4.2 billion, Lee's estimate).
- **Milestones** mark how far you've got (a flat, an apartment block, a neighbourhood, a town,
  a city, a country, a continent, Earth; then orbit to the universe). Each one unlocks something
  or gives a permanent boost.
- **Diet** and **Footfall** upgrades make each toilet get dirty faster.
- **The door price** (from the Coin Slots project) charges visitors to get in: fewer come, each pays.
  **Pay-Per-Poo** lets it go below zero: you pay them, and more come. The sweet spot is where
  visitors match what your staff can clean, so it moves with every purchase. Watch the backlog:
  full means charge more, empty means charge less.
- **Uncle Steve** turns up with the Gary Dimensions. Each Steve brings his own toilet and makes
  messes in it. Only Garys may clean Steve's toilets, and they do them first. Steve's toilets
  aren't on any map, so they don't count toward Earth, but each one is room for one more Gary to
  work. Follow him to the shed (25 Steves) and **Steve Dimensions** open: sheds make Steves.
- Once Earth is done, and there's a free Gary at every toilet on it (Garys busy with Steve
  don't count), you **hand Earth over to Gary**. Steve stays on Earth with him. He keeps the till and sends you a quarter
  of Earth's income. You go to space with your staff and start again with one toilet.
  Gary is already on the Moon. The game ends at the last toilet in the universe, and the
  Great Flush restarts with a permanent bonus.
- **Gary Dimensions** open after auditing your 75th Gary. Cupboards make cupboards make Garys.
  Each Gary needs a toilet to work, and cupboard Garys ignore Supplies upgrades.
- A **Golden Throne** floats past now and then. Click it.

## Files

- `js/data.js`: all content and numbers: staff, contracts, upgrades, memos, headlines.
- `js/engine.js`: the rules, no DOM.
- `js/ui.js`: rendering, input, saving.
- `tools/sim.js`: a greedy bot that plays headless and prints milestone times.
  Run `node tools/sim.js [hours] [clicksPerSecond]` after changing numbers.
  Env switches: `EVERY=1800` logs every 30 min, `NOGARY=1` skips Gary Dimensions, `GARYFAN=1` buys them greedily,
  `DUMP=1` prints the bot's top choices in space, `PROBE=1` checks claimed vs actual income,
  `NOSTEVE=1` never hires Steve, `STEVEFAN=1` keeps buying Steve Dimensions even when the Garys
  can't keep up, `SAVEAT=9000` prints the game state at that second as a `SAVE {...}` line.
  Every run ends with how long space took and the longest stretch in space with nothing bought.
  `SPACE_PRICE` in `data.js` scales every space price at once. It is sensitive: ×3 doubles space.
