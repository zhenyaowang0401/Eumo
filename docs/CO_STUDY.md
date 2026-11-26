# Shared study — incremental development build

This build extends the existing Focus screen. It retains the original pixel assets,
scene, personal timer, saved progress, wardrobe, home and reward calculation.
The presentation under `present/` is outside this change. The shared room keeps
people, statuses and actions prominent; longer rules are collapsed, and saved
reviews appear as a short summary with an Edit action.

## Try the local version

Use Node.js 22, run `npm ci`, then `npm run dev:local`. Open the address printed
by the server on the computer running it. No cloud credentials are required for
friends or shared study in this mode.

The local server starts with no people or friends. Open two separate browser
profiles (or a normal and private window), create each mole, then use the existing
Friends page to exchange a friend code and accept the request. Return to Focus,
choose **Study together**, invite that friend, and accept in the other browser.
Each person writes a task, confirms room-status sharing and selects **Ready**.
The host can then choose **Start together**.

Readiness is separate from starting the round. Two people can select Ready
without waiting for the next room refresh: a stale request is retried once only
when the room mode, round and that person's prior state are unchanged. Changing
the mode still requires a fresh explicit Ready decision. A missing task or sharing
confirmation focuses the required field. Separate browser profiles or devices
are required for two identities; two tabs in the same browser share an identity.

Local identities, friendships and shared sessions persist in `.eumo-local-db/`.
Game progress stays in each browser's original local save. These local accounts
are separate from hosted accounts. Do not delete either storage to update the app.
Back up the database directory only after stopping the server. Never commit it.
`HOST=0.0.0.0 PORT=3000 npm run dev:local` can serve an authenticated Cloud HTTP
preview when that port is configured in the environment. Cloud localhost is not
an externally accessible link.

An offline `dist/Eumo.html` remains available for personal study. Shared study
requires the running API and database; opening that file alone is not an online
multiplayer deployment. Native installers have not been published by this change.

## Product decisions and limits

- Two existing friends, private invitation, five-minute invitation expiry.
- Up to two rounds of twenty minutes of personal running time. A pause affects
  only that person's timer. A five-minute break between rounds is optional.
- Tasks stay private unless their owner chooses to share. Joining a round requires
  explicit room-status consent. Chat and private review notes are not shared.
- Together mode uses the existing timer and rewards. Challenge mode additionally
  awards one participation point for a completed, confirmed round plus a review;
  the maximum is two. Complete, partial and adjusted-goal reviews all count.
  These points do not buy items or measure knowledge, attention or task difficulty.
- A connection gap over 45 seconds, or an unconfirmed pause/resume even during a
  shorter interruption, leaves unconfirmed challenge time pending.
  Local time, saved history and ordinary rewards continue. There is no fabricated
  winner or automatic retroactive award for that interval. Manual verification of
  a pending interval is not implemented in this pilot.
- New prompts respond to intentional task preparation, paused-session return or an
  explicit break. Dismissal, snooze and preference persist. No keyboard inactivity,
  camera, screen monitoring, repeated flashing, forced sound or automatic AI call.
- Canele remains an independent device integration. When it owns the browser timer,
  this build cannot start a second browser timer or remotely start the hardware.
  Device participation in shared-study points and hardware changes are deferred.

## Implementation and data compatibility

`co-study.js` and `.css` add a compact Focus entry and room dialog. The app adapter
starts the existing session with a server-issued `sourceSessionId`; it does not
create another ordinary reward ledger. `session.coStudy` and matching history
metadata are optional additions to the existing save shape. Active shared rounds
lock duration changes. Original single-tab progress ownership remains in force.
The room shows the local person first, with two adjacent mole tiles, an explicit
ready count and the host's start action. During a round, the local timer advances
normally; the partner's time is labeled as its last confirmed synchronization.
This build has no voice or video calls.

On phones, the existing task and timer panel appears before the mine and chat,
so Start is available on the first screen. Short landscape views place the timer
beside the mine. Mobile navigation and main controls have 44px touch targets;
editable fields use at least 16px text. Desktop layout and saved progress remain
compatible. Reduced-height browser checks approximate available keyboard space,
but do not substitute for a physical iOS or Android keyboard test.

`study-guidance.js` and `.css` provide a small optional prompt popover, reusing the
current language and style tokens. The existing four-step tour has revised copy.

`api/co-study.js` reuses the existing friends authentication cookie and origin/body
checks. `database/co_study.sql` adds three isolated tables: `eumo_study_rooms`,
`eumo_study_requests` and `eumo_study_awards`. A server-only SQL RPC serializes room
transitions, authenticates membership and friendship, checks round/control
versions and enforces unique participation awards. Browser roles have no direct
table or RPC access. This is a small two-person pilot, not a high-scale matchmaker.

`dev:local` runs the same API handlers and SQL against persistent embedded
PostgreSQL. It does not seed demonstration friends or replace permission checks.
Device endpoints are explicitly unavailable in this isolated account environment.
Chat/transcription require their normal server configuration.

## Hosted migration and rollback

Website publishing and database installation are separate steps. A Git-triggered
Vercel release does not execute this migration. On a new installation, shared
study reports unavailable until the migration is applied. The production project
was installed through Supabase SQL Editor and verified through its hosted API
and two real browser contexts. The existing GitHub integration publishes the
website. The separate management-token connection is not required for normal
users to join a room.

Before hosted deployment, back up the relevant database and apply
`database/co_study.sql` **after** the existing `database/friends.sql` on the intended
environment. This migration does not rewrite personal game saves or device data.
Use existing server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; never put
these in browser scripts. Validate two actual identities and a complete round on
the deployed origin before describing the feature as live.

For rollback, restore the earlier frontend/API deployment and leave the additive
co-study tables intact. Do not drop tables, reset friends or clear browser storage.
Keep an exported game save before switching versions. Retain the database for a
later forward fix and inspection rather than erasing incomplete sessions.

## Verification

Use `npm run test:co-study` for the real PostgreSQL/API tests and prompt-controller
tests. `python3 tests/test_co_study_browser.py` drives two real browser contexts
through the existing app, actual APIs and PostgreSQL, using test-only clocks for
twenty-minute rounds. It does not mock successful room responses. Browser
screenshots and results are recorded outside the source tree.
`python3 tests/test_co_study_ready_browser.py` reproduces two Ready clicks without
an intervening room refresh and verifies the bounded retry and changed-mode guard.

Existing reward, friend, save-ownership and device-progress regressions are also
run. `python3 tests/test_viewport.py` checks the original desktop viewport fit and
mobile/offline layout. Rebuild portable and desktop web assets with
`python3 scripts/build_standalone.py` and `npm run desktop:prepare`.

Automated checks do not establish learning effectiveness. The planned six-person
comparison of solo, together and challenge modes remains a future user study.
Real hardware pairing, the device's earlier backup-integrity error, Steam,
TestFlight and native release publishing have not been completed by this change.

### Recorded checks for this build (2026-11-25)

- 27 shared-study SQL/API and guidance-controller checks passed.
- 22 existing friends, save-ownership and device-record/progress checks passed;
  existing reward-boundary and split/continuous equivalence checks also passed.
- Two-browser integration passed: authenticated friendship, invite/accept/consent,
  automatic shared start, independent pause/resume, task privacy, access denial,
  twenty-minute confirmed completion, unique reviews/points/history, reload,
  next round and early end. A separate interrupted round retained local progress
  and earned no unverified point. Expired break guidance reopened the room without
  silently starting a solo session.
- All 13 desktop viewport/DPI combinations passed in English and Chinese,
  including 1280×600. Shared-dialog widths 320, 390, 768 and 1440 also passed.
- Existing optional onboarding passed, including skip/replay, keyboard, unchanged
  game state, both languages and offline operation. Prompt browser checks passed.
- Standalone HTML and desktop web assets rebuilt. Persistent local server checked
  across restart. Native installers and actual hardware remain outside these checks.
- Hosted Supabase and two browser identities verified invite, join, ready, start,
  independent pause/resume, early ending, private tasks and saved reviews. Early
  endings earned no challenge point. A full twenty-minute production award has
  not yet been tested; full-round rules are covered by the local test clock.
