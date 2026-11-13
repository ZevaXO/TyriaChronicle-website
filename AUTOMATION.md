# Automatic release synchronization

Authorized 13 November 2026. Scope: website only. The public beta repository is read, never modified.

Every 15 minutes at UTC minutes 7, 22, 37 and 52, and on a manual workflow run, `.github/workflows/sync-releases.yml` reads published releases from `ZevaXO/TyriaChronicle-beta`. It includes prereleases and selects the newest numeric version with the exact uploaded Windows x64 ZIP on the expected GitHub URL. It does not use `/releases/latest`, which may omit betas. Changes to the workflow, scripts or release configuration also trigger a run.

The script replaces only named release-information blocks: homepage version, ZIP link, release date, important notices, guide release-status box and changelog. It commits only index.html, guide.html and releases.json. All release text is escaped as text, not evaluated as HTML or shell input. Missing or invalid responses fail the run before writing; the last published website remains available. The browser also makes one credential-free public GitHub Releases API request on page opening. It updates release labels, ZIP link and release notes with text-only DOM operations. If offline or rate-limited, the saved snapshot remains. No cookies or local storage are used; privacy text discloses GitHub connection metadata.

`## Important upgrade note` (or an Important update/notice/installation heading) in the newest release becomes a prominent message. `release-config.json` also contains persistent advisories, including the manual-upgrade requirement for users on 0.2.15/0.2.16. Review and explicitly remove an advisory when it is no longer needed; absence of a warning in a newer release does not silently remove pinned advice.

Feature guides and screenshots remain manually maintained. Change manualVersion/manualReviewed or installationVersion/installationReviewed only after actually reviewing those parts. The current feature guide review is 0.2.15 (12 November); installation/update review is 0.2.17 (13 November).

The workflow uses the temporary repository GITHUB_TOKEN with contents:write and pages:write; no personal access token or beta-repository write credential is required. It explicitly requests a Pages build after a changed snapshot (and on manual/push runs), since a GITHUB_TOKEN push does not itself start another workflow. Existing main/root branch-based Pages settings are retained. No source-setting switch is needed.

GitHub schedules can be delayed under load and scheduled workflows in inactive public repositories can be disabled after 60 days. Check Actions for failures or run manually when needed. GitHub scheduled delivery is not guaranteed: the first two expected hourly runs did not start on 13 November. The browser check provides an independent fallback while the server snapshot follows the 15-minute schedule. This is not a guaranteed instant release webhook. To stop it, disable the workflow; the last website remains online.

## Verification and dependencies

`node --test scripts/*.test.mjs` covers prerelease selection, numeric ordering, invalid/foreign assets, hostile release HTML, persistent warnings, unchanged manual text, idempotence and no partial writes for bad templates. `node scripts/sync-releases.mjs` fetches live release information. `--input file.json` provides an offline raw GitHub release fixture.

No added images or game behavior. Original synchronization code uses Node built-ins only. Official actions/checkout v4.2.2 is pinned to 11bd71901bbe5b1630ceea73d27597364c9af683; MIT licence, copyright GitHub, retained by the upstream action. Source/licence: https://github.com/actions/checkout/tree/v4.2.2 and https://github.com/actions/checkout/blob/v4.2.2/LICENSE (checked 13 November 2026). GitHub Pages/Actions remain the existing hosting provider; no new analytics, cookies, browser storage or visitor tracking.

Primary references checked 13 November 2026:
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow
- https://docs.github.com/en/rest/pages/pages#request-a-github-pages-build

Release sources: https://github.com/ZevaXO/TyriaChronicle-beta/releases and its public README. Notices remain separate from the manual; no third-party artwork is added and no official endorsement is claimed.

Repair verified 13 November 2026: workflow state active; successful push-triggered runs but no schedule-triggered runs existed as of 11:24 UTC. Cause of GitHub scheduler non-delivery was not established. The repair adds a live browser fallback, shortens the polling interval, retains frozen manual review metadata and keeps upgrade warnings collapsed in the guide only. No beta-repository changes.

