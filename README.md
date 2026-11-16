# Tyria Chronicle website

Independent website and English user guide by ZevaXO. Static HTML, CSS and JavaScript; no build required.

Enable GitHub Pages from main / (root).

Addon downloads remain separate: https://github.com/ZevaXO/TyriaChronicle-beta

## Local web timer

Open timers.html through an HTTP server. For a dependency-free loopback preview: node scripts/preview-timer.mjs, then http://127.0.0.1:4173/timers.html. Tests: node --test scripts/timer.test.mjs. Existing release tests remain in scripts/.

The timer uses one static catalog fetch and local clock calculations; no server runtime, Supabase, accounts or paid services. Favourites and Done today are browser-local; personal lists, templates and train planning remain addon-only. Optional open-tab browser reminders and a synthesized chime are available after explicit activation. New visits start paused; browser/OS settings, sleep and tab suspension can suppress alerts. Troubleshooting is beside the controls. No push service or offline service worker is used. See timer-notices.html and timer-data/README.md for data rights, dates and limitations.
