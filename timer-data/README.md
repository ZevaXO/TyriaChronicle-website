# Web timer data export

Schema version 1; schedule snapshot 2026-11-10, reviewed export 2026-11-16.

`catalog.json` is an explicit data-only export of the Tyria Chronicle offline catalog. It contains 88 events, their stable identifiers, names, map/category, original descriptions, waypoint codes, UTC slot minutes and durations, bounded seasonal dates and reviewed gemstone reward-choice notes. It contains no user settings, credentials, account information, private source files, artwork references or addon-only list templates.

The schedule is derived from pinned qjv/event-timers data, copyright 2025 qjv, MIT. The full notice is in `../licenses/qjv-schedule-data.txt`. Project corrections include the upstream UTC-3 anchor conversion, which has **already** been applied; do not shift the UTC slot minutes again. Unverified Shackles starts remain empty. Dated festival entries do not authorize automatic annual extrapolation.

`parity-fixtures.json` contains C++-generated schedule/fishing test expectations, not user activity. `node --test scripts/timer.test.mjs` checks the JavaScript implementation against them.

Schedule updates are reviewed exports, not live API polling. Browser code does not access the private addon repository. A future data update must preserve stable IDs, explicitly review dates/sources, regenerate parity fixtures and pass the tests before deployment.

Reward-choice metadata was checked against the Guild Wars 2 Wiki on 2026-11-15, including individual reward chest pages, rather than assuming all events in a map have the same reward. Own factual summaries only; no third-party guide prose or game images are bundled. Sources include:

- https://wiki.guildwars2.com/wiki/Amalgamated_Gemstone
- https://wiki.guildwars2.com/wiki/Junundu_Rising
- https://wiki.guildwars2.com/wiki/Domain_of_Vabbi%3A_Hero%27s_Choice_Chest
- https://wiki.guildwars2.com/wiki/Echovald_Wilds%3A_Hero%27s_Choice_Chest
- https://wiki.guildwars2.com/wiki/Convergence%3A_Mount_Balrior_Commander%27s_Choice_Chest
- https://wiki.guildwars2.com/wiki/Bava_Nisos%3A_Commander%27s_Choice_Chest
- https://wiki.guildwars2.com/wiki/Leyspring_Hollows%3A_Hero%27s_Choice_Chest

The gemstone marker means a reviewed **choice**, not random-drop coverage or a live claim tracker. Desolation and Vabbi alternatives share daily chest limits. Untimed Gyala/Inner Nayos sources are not given invented schedules; chance-only evidence for Nexus convergence is not labelled a verified choice. No fixed total daily gemstone yield is promised.
