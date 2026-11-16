# Eumo presentation: product audit

Audited on November 16, 2026 against repository commit `c338d11` (package version 3.7.4). This is a source-code and local UI review, not a user-study result or verification that every production service is currently available. The game's files were not changed.

## The most important correction

**Eumo does not currently require finishing the entire planned timer to receive earned rewards.**

[app.js, lines 104–118](../app.js#L104) explicitly offers “End and save.” Both completed and stopped-early sessions pass through `finishSession`, which calls `Journey.rewards` and credits depth, stars and materials. Full completion increments the completed-session counter; it is not a prerequisite for saving already-earned rewards. The “claim” button closes the result dialog after rewards have already been applied ([app.js, line 122](../app.js#L122)).

[Journey](../journey.js#L4) derives rewards from eligible elapsed time: one metre per 30 active seconds, one star per 300 active seconds, and a 40% material chance at each 600-second checkpoint for new-version sessions. Partial eligible time carries across sessions. Pause and Break do not accrue formal focus rewards. Finds enter the permanent inventory when the session ends; a visible pending find is not immediately a spendable item.

**Safe presentation wording:** “Rewards grow with recorded focus time. Pause when you need to; ending a session saves what you have earned.”

**Do not say:** “Users cannot get rewards unless they complete their task,” “we can prove they studied,” or “completion-only rewards stop farming.” Timer activity is not attention or learning. Even an eventual completion gate would not prove task completion.

The repeatable, explicitly labeled 15-second developer demo currently gives one spendable star and five metres, but no new-version materials, and is excluded from formal focus reports. That is a demo convenience, not a production anti-abuse guarantee. Isolating demo currency is an appropriate **future validation/release-hardening question**, not an already-shipped control.

## Capability ledger

| Area | Verified implementation | Presentation boundary | Primary source |
| --- | --- | --- | --- |
| Focus | Adjustable Study/Work/Break timer; optional task; pause/resume/end; local reports and optional outcome note | Logged time and self-reported outcome are not proof of attention or knowledge | [app.js](../app.js#L61) |
| Companion | Mole digs while eligible timer runs, stops while paused, rests; petting and local reactions | Local event messages are authored responses, not necessarily AI generations | [pixel-art.js](../pixel-art.js), [chat.js](../chat.js#L66) |
| Discoveries | Same timed route drives visible pickups and settlement; materials and golden items have separate rules | Do not promise a material appears in a 15-second demo | [journey.js](../journey.js), [treasures.js](../treasures.js) |
| Wardrobe | Shop contains unowned pieces; Owned contains equip/remove actions; hats, scarves, glasses, tools and extras; material-exclusive Relic set | Current in-game purchase uses earned stars/materials. Real-money skins are a proposed business model | [app.js](../app.js#L78), [wardrobe.js](../wardrobe.js) |
| Home | Owned furniture drag/place/move; drag outside returns placed item to inventory; keyboard alternatives; animated rare backgrounds | Putting away does not destroy ownership. Layout is saved locally and shared through friends backend | [home-editor.js](../home-editor.js#L7), [home.js](../home.js) |
| Home movement | Click/tap destinations; pathfinding through rooms and ladder; side and climbing animation | Walking is local interaction; it does not generate focus rewards | [home-walk.js](../home-walk.js) |
| Friends | Accepted connections; shared online/away/offline and studying/working/paused states; daily Study/Work duration and goals; sharing can be paused | Updates every 15–30 seconds, not continuous live surveillance. Presence and time do not prove studying | [friends.js](../friends.js#L15), [api/friends.js](../api/friends.js) |
| Friend visits | Last-synced home layout; your own visitor mole can walk alongside host | Not simultaneous multiplayer movement; host is not moved or edited by visitor | [friends.js](../friends.js#L50), [home-walk.js](../home-walk.js#L8) |
| Music | User-started soft music, groove and ambient/white-noise category; volume, seek, playback modes and rotating vinyl | Audio preference is a user choice; no concentration-effect measurement in the app | [music.js](../music.js), [docs/MUSIC.md](MUSIC.md) |
| Chat | Optional server-provided AI response to explicit messages; optional task/focus context; local chat history | AI provider configuration and internet are required. This is prompt/context design, not a newly trained model; no efficacy result | [chat.js](../chat.js#L45), [docs/AI_SETUP.md](AI_SETUP.md) |
| Voice | Permission-gated microphone; up to 45 seconds; transcript into editable draft before Send | Online transcription is required. Do not imply all speech is processed on-device | [voice-input.js](../voice-input.js#L24), [api/transcribe.js](../api/transcribe.js) |
| Platforms | Shared game on web, Windows and macOS; native frameless desktop floating window; browser floating mode where supported | Browser retains browser-controlled chrome. Platform support is not automatic save synchronization | [desktop/main.cjs](../desktop/main.cjs), [docs/DESKTOP.md](DESKTOP.md) |
| Updates | Installed apps check periodically. Windows downloads/restarts to install with progress saved; Mac opens correct DMG | Do not claim automatic in-place installation on Mac while builds lack required Developer ID signing | [desktop/updates.cjs](../desktop/updates.cjs#L28), [desktop/main.cjs](../desktop/main.cjs#L69) |
| Saves | Game progress local; explicit export/import backup; import replaces destination after confirmation | No automatic web/desktop cloud sync. Chat and friend credentials are excluded from backup | [save-transfer.js](../save-transfer.js#L4) |
| Physical products | User confirms NFC keychain opens its programmed link; working handheld prototype has timer and digging | User-confirmed prototype facts, not independently hardware-tested here; generated imagery is enclosure/colorway visualization | Conversation and supplied photos |

## Development story grounded in the repository

These are implementation milestones, not measured success metrics. Dates/version labels should follow release history if dates are needed.

1. **Core relationship:** real-world timer paired with mole digging and discoveries.
2. **From reward to ownership:** category-based wardrobe, home, material crafting and collections.
3. **From solo to optional company:** real accepted friend connections, shared summaries and home visits; AI chat as an optional layer.
4. **From phone/tab to desktop routine:** floating companion, native Windows/macOS, backups and updates.
5. **Reducing interaction friction:** simpler navigation, separated Shop/Owned, side-by-side decorating, direct furniture manipulation, visual/font consistency, shorter labels and responsive home.
6. **More expressive ownership:** fitted material hats/accessories, animated wallpaper, round walking/climbing sprites.

Sources: [CHANGELOG](../CHANGELOG.md), [README](../README.md), [historical research](research/LOOP_PET_RESEARCH.zh-CN.md), creator-provided companion reference brief (kept local).

The historical LOOP PET research is explicitly marked as partly unverified external research. It distinguishes screenshots, code and hypotheses. Do not convert the old competitor screenshots or general-reference sections into fresh representative market data. The untracked companion-reference brief was read and left unchanged.

## User feedback and study status

The user reports qualitative feedback: outfits/rewards are desirable; phone battery/availability makes desktop use attractive to some people; less text and direct interaction help; social awareness was added. No sample size, verbatim interview record or quantified outcome was supplied. Present these as **early qualitative feedback**, paraphrases rather than invented quotations.

`/workspace/deliverables/Eumo_User_Test_Plan.txt` is a **plan**: two pilots and six main participants, usual devices, moderated task observation, a quiet focus interval and three-day diary. It does not document completed participants or results. Its old native-client “concept” wording predates the now-shipped desktop versions and should be updated in any current study proposal. Its target of five of six unaided task completions is a proposed criterion, not an achieved result.

A presentation-ready next test: start/pause/end; interpret rewards; equip an owned item; move/put away furniture; identify a friend's last-updated status. Observe unaided completion, errors, restart after interruption, perceived distraction/social pressure, and self-reported progress on the chosen task. Retention and willingness to pay remain unvalidated.

## Current presentation assets

Fresh local captures use the current renderer and an **illustrative demo save** in an isolated browser context. They are product screenshots, not study participants' data. All pages were captured after font load and splash removal; browser reported no JavaScript errors during capture.

- [Focus](../present/assets/screenshots/focus.png): current day floral UI, task entry, timer, mine and music.
- [Home](../present/assets/screenshots/home.png): current forest theme, furniture, full controls.
- [Owned wardrobe](../present/assets/screenshots/wardrobe.png): current preview and ownership separation.
- [Music room](../present/assets/screenshots/music.png): actual player and categories.
- [Default mole](../present/assets/mole-default.png) and [equipped mole](../present/assets/mole-starhat.png): transparent 128px PNGs exported from the actual `PixelArt.drawPortrait` renderer. Display with `image-rendering: pixelated`.
- Material SVGs `present/assets/{star,mushroom,crystal,fossil}.svg` exported from the actual icon renderer.

Use an expandable evidence/caption area stating “Product screenshots · illustrative demo save.” Captures show existing functionality without inventing analytics or online friends. Existing `docs/images/eumo-focus-clean.png` and `eumo-friends-live.png` are older purple UI; the first has an empty mine, the latter includes explicit sample players. Do not use them as current hero screenshots or proof of a live audience.

## Authentic 5–6 minute demo

| Segment | Time | Show |
| --- | --- | --- |
| Intention and companion | 0:00–0:45 | Enter task; start; pause/resume; state what the mole mirrors |
| A short demonstration cycle | 0:45–1:25 | Explicitly label the built-in 15-second developer demo; do not call it real learning |
| Ownership | 1:25–2:15 | Show already-owned outfits and switch one; explain star/material distinction |
| Make a home | 2:15–3:35 | Walk/climb; Decorate; drag a placed item to another room and outside to put away |
| Optional company | 3:35–4:25 | With a consenting preconnected account and working service, show status/time and visit; otherwise use a labeled feature screenshot, never simulate a live person |
| Calm workspace | 4:25–5:10 | Music and native floating window, or supported browser floating view |
| Return to presentation | 5:10–5:30 | Return via original tab; close on next validation priority |

Use a separate demonstration profile/browser context or backup before changing the owner's own home. AI/voice can be a brief optional extension; do not let permissions or network delays consume the core demo. A prepared screenshot fallback can show the feature, labeled honestly, if the live backend fails.

## Reference-site access and proposed interaction lessons

On November 16, direct HTTPS retrievals of `https://lilguy.net/`, `https://www.apple.com/airpods-pro/`, and the official Steam page for Rusty's Retirement each returned a proxy-tunnel **403 Forbidden**. No visual site inspection was possible; do not state that these pages were studied successfully.

Suggested presentation interactions based on the user's brief, not purported observations of inaccessible sites:

- One focused product/story per screen, with a persistent progress control and keyboard navigation.
- Let the actual mole and current UI lead; keep evidence one click away.
- Keychain swatches switch the corresponding colorway, with a textual selected-color label.
- Physical prototype card enlarges faithful enclosure imagery; “Timer” and “Digging” describe current functions without invented hardware UI.
- Explicit Open Eumo action opens the product in a separate tab so the presentation position is preserved.
- Motion respects reduced-motion preference and never blocks reading or navigation.
