# Presentation v2 verification

Checked November 16, 2026 in local Chromium. V2 is a ten-chapter PM case study with a six-minute live demo. The checks use isolated browser contexts and illustrative screenshots; no owner's save is accessed or changed.

## Entry and coverage

Run `python3 tests/presentation_site_check.py` from the repository root. It starts the repository's Node development server on an available port and tests `/present/index.html`. The server does not resolve the `/present/` directory index automatically.

- Ten chapters at 1440×900, 1366×768, 1280×720, 768×1024, 390×844 and 320×568.
- Horizontal overflow, chapter boundaries, desktop fit and footer reachability. Mobile chapters may scroll vertically.
- Research, walkthrough, feedback, roadmap and physical-product tabs; active state, keyboard navigation and panel labels.
- All seven walkthrough selections at three desktop sizes, including longer cues and differently sized screenshots.
- Orange default; six distinct labeled color selections; square sprite proportions; keychain/handheld selection.
- Latest rapid color selection wins, overlay cleanup, reduced-motion immediate updates, one-time entrance and library-failure fallbacks.
- Chapter arrows, index menu, deep links and old aliases including `#thankyou` → `#business`, `#beyond` → `#extensions` and `#hello` → `#overview`.
- Native dialogs, Escape, focus restoration and background inertness. Native modality may move focus to browser chrome at a traversal edge; that is not background page focus.
- Demo clock start, pause, resume and reset; fullscreen; local link success; actual image decoding; script/font/image requests and JavaScript errors.
- No game-save or other localStorage mutations.

## Results

The final full suite ran **200 checks: 194 passed**. Six cases were the same short-desktop walkthrough issue: longer selected-step cues wrapped and increased the section height by 21.9px at 1280×720. The cues were shortened to clearer key points, and all seven selections were rechecked at both affected/adjacent laptop sizes: **14/14 targeted checks passed**.

All **200 regression cases therefore have passing results across the full run and targeted verification**. This is not claimed as a second full 200-check run.

Earlier corrections included the SVG namespace needed for externally loaded mushroom/material icons, small-phone Persona overflow, and screenshot/render sizing that previously hid the bottom controls. Those fixes were included in the full run.

| Final targeted fit | Chapter height | Available area |
| --- | --- | --- |
| Every demo step, 1280×720 | 614px | 614px |
| Every demo step, 1366×768 | 662px | 662px |

No JavaScript errors or failed local resources were recorded. All images decoded. Visual review covered the initial setup screen, actual Focus/Home/Wardrobe/Music screens, orange and blue/orange colorways, the handheld, and mobile layout. Contrast was improved for small status text on sage panels and for selected handheld-tab hover.

Reports and screenshots remain outside the deliverable at `/workspace/scratch/presentation-v2-qa/` and `/workspace/scratch/present-v2-visual/`.

## Requested skill checks

All three requested repositories were downloaded at pinned revisions; see [third-party provenance](../present/THIRD_PARTY.md). GSAP was bundled locally, and a small React Bits-inspired pixel transition was integrated into the static site.

The unmodified Taste copy checker returned **0 failures and 2 warnings** (numbered steps and eyebrow labels). Its full gate returned **ERROR** because its Chromium subprocess could not start in this environment. The gate was stopped without modified checkers, waivers or forced passes. Independent Playwright tests above use the environment's supported Chromium launch configuration; they do not imply that the Taste gate passed.

## External limits

Direct scholarly-source and Vercel requests are blocked by this environment's network proxy. Research candidates remain labeled pending verification, with no invented statistics. Local browser success and GitHub source publication do not establish production deployment status; Vercel must be verified separately from an accessible network.
