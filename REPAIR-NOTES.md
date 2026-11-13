Release synchronization reliability review — 13 November 2026

Observed: public release v0.2.18 existed while the saved site was v0.2.17. Workflow was active but no scheduled run had started; push-triggered runs passed. No claim is made that the workflow code itself caused GitHub scheduler non-delivery.

Repair: 15-minute GitHub schedule plus one live browser request to the public Releases API. The live request is anonymous, omits credentials and uses textContent for remote notes. Visitor IP/connection metadata is disclosed in the privacy section. No storage or analytics added. Server and client both require an exact uploaded Windows x64 ZIP hosted under the beta repository, include prereleases, ignore drafts and choose numeric versions. API failure preserves the last snapshot.

Guide review metadata remains manual. Upgrade warnings remain in the existing-users guide, not on the landing page. The beta repository is read-only in this process.

Tests cover newest numeric prerelease, draft/foreign URL rejection, older-response protection, HTML escaping, pinned advisories, deterministic sync and no partial writes after bad templates. Sources and provider permission basis remain documented in AUTOMATION.md. No new images, game automation or external dependencies added.
