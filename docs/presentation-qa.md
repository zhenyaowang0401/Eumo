# Presentation verification

## V6: concise content and verified evidence

Checked 17 November 2026. The 12-page presentation now uses MADE PROJECT in the header, an editorial overview with the OECD distraction statistic, four cited research themes, a name-and-avatar persona, function/limitation competitor comparisons, four development priorities, and a commercial model with floral artwork. Removed explanatory badges and the feedback/roadmap/closing banners from the main slides.

The updated browser suite passed **356/356 checks**, with no JavaScript errors or failed local resources. Coverage includes all 12 chapters at 1440×900, 1366×768, 1280×720, 768×1024, 390×844 and 320×568; desktop slide fit, horizontal overflow, all four evidence tabs and source links, dialogs, navigation, demo timer, six keychain colors, motion and reduced-motion behavior. Mobile content scrolls vertically within the presentation stage.

Source verification checked OECD, Harkin, Kestin, Ta and Sailer/Homner, plus official competitor descriptions. Exact research populations and effect definitions remain in the visible copy and source panels; no study result is represented as an Eumo outcome.

Reports and screenshots: `/workspace/scratch/presentation-v6-qa/`. After final wording and comparison-baseline adjustments, **55/55 targeted checks passed** in fresh browser contexts at three desktop sizes and 390px mobile. These also check the complete masthead and footer, chapter navigation and research-tab citations. An initial screenshot artifact after repeated viewport resizing was not reproduced in fresh-context screenshots; DOM geometry and normal navigation remained correct. The 356-check result describes the full run, not a second full-suite run.

## V5: opening, closing, avatar and consistent keychain sizes

Checked November 16, 2026. The presentation now has **12 pages / 13:00**, including a new opening and Thank You page. The opening retains the application's original 16 SVG paths and stepped mark entrance, stays visible afterward, and uses the existing floral background. Both end pages carry the requested names. Persona uses a head-and-shoulders avatar. All six keychain colorways are normalized to the Blue & Orange reference's visible height without altering source images or their proportions.

The full browser suite ran **363 checks: 362 passed initially**. The one failure exposed a real navigation race: a long animated End jump outlasted the settling timer, briefly showing the preceding chapter number. Distant chapter jumps now move directly to their destination; neighboring pages retain smooth scrolling.

**17/17 targeted navigation checks passed** after that correction. Desktop and mobile End, Home and distant chapter-menu jumps remained on the intended destination during one second of sampling; adjacent Next / Previous still moved smoothly and settled correctly. All 363 regression cases have passing results across the full run and targeted verification, not a second full-suite run.

Coverage includes all 12 pages at six viewport sizes, designer credits, the persistent cover in both motion modes, original SVG references, avatar decoding, six keychains' visible bounds and equal heights, dialogs, navigation, swap races and existing interactions. No JavaScript errors or failed local resources were recorded. Reports and screenshots: `/workspace/scratch/presentation-v5-qa/`, with separate six-color visual review in `/workspace/scratch/keychain-size-qa/`.

## V3 regression history

Checked November 16, 2026 in local Chromium. V3 is a ten-chapter PM case study with a six-minute live demo. It adds a readable text hierarchy, co-study and electronic-pet illustrations, competitor reference images, explicit feedback responses and three refinement workstreams. The checks use isolated browser contexts and illustrative screenshots; no owner's save is accessed or changed.

## Entry and coverage

Run `python3 tests/presentation_site_check.py` from the repository root. It starts the repository's Node development server on an available port and tests `/present/index.html`. The server does not resolve the `/present/` directory index automatically.

- Ten chapters at 1440×900, 1366×768, 1280×720, 768×1024, 390×844 and 320×568.
- Horizontal overflow, chapter boundaries, desktop fit and footer reachability. Mobile chapters may scroll vertically.
- Research, walkthrough, four feedback examples, three development workstreams and physical-product tabs; active state, keyboard navigation and panel labels.
- Local DM Sans loading, body weight 400 and section-heading weight 650; independent decoding of the three new illustration files and the earlier Friends development capture.
- Both inspiration sources, visible competitor illustration labels, and every feedback/workstream tab state at all six viewport sizes.
- All seven walkthrough selections at three desktop sizes, including longer cues and differently sized screenshots.
- Orange default; six distinct labeled color selections; square sprite proportions; keychain/handheld selection.
- Latest rapid color selection wins, overlay cleanup, reduced-motion immediate updates, one-time entrance and library-failure fallbacks.
- Chapter arrows, index menu, deep links and old aliases including `#thankyou` → `#business`, `#beyond` → `#extensions` and `#hello` → `#overview`.
- Native dialogs, Escape, focus restoration and background inertness. Native modality may move focus to browser chrome at a traversal edge; that is not background page focus.
- Demo clock start, pause, resume and reset; fullscreen; local link success; actual image decoding; script/font/image requests and JavaScript errors.
- No game-save or other localStorage mutations.

## Results

The V3 full suite ran **279 checks: 262 passed initially**. Seventeen cases detected small vertical overflows: the walkthrough at 1440×900, Competitive Landscape at 1280×720, and Feedback states at 1366×768 / 1280×720. Image-height caps were reduced for the affected layouts. Feedback text was also enlarged for readability.

The affected states and adjacent sizes were rechecked: **48/48 targeted checks passed**. This covered all seven walkthrough steps, Competitive Landscape and all four feedback selections at three desktop sizes, plus all four feedback selections at tablet and both phone sizes.

All **279 regression cases therefore have passing results across the full run and targeted verification**. This is not claimed as a second full 279-check run. No JavaScript errors or failed local resources were recorded; all new images decoded and the local font loaded.

| Targeted desktop fit | Result | Available area |
| --- | --- | --- |
| Demo, comparison and all feedback states, 1440×900 | Fits | 786px |
| Demo, comparison and all feedback states, 1366×768 | Fits | 662px |
| Demo, comparison and all feedback states, 1280×720 | Fits | 614px |

Visual review covered the revised overview, pixel-student call, electronic-pet reference, competitor references, feedback table and open question, refinement workstreams, orange keychain, and short-desktop demo/feedback states. Competitor images are explicitly reference illustrations. The Friends example is explicitly an earlier development capture with sample profiles.

Reports and screenshots remain outside the deliverable at `/workspace/scratch/presentation-v3-qa/` (`report.json`, `targeted-recheck.json`, `fixed-*` captures) and `/workspace/scratch/presentation-v3-visual/`. The previous V2 results remain in their original scratch directories.

## Persona follow-up

The subsequent Persona-only revision replaces the monitor illustration with a generated human student and adds study context, goals, pain points, product needs and a concise job to be done. **50/50 targeted checks passed** across the same six viewports. Desktop Persona fits, mobile content does not overlap or overflow horizontally, the character decodes with its aspect ratio intact, and the detail dialog closes with focus restored. Adjacent Research and Competitive Landscape pages were checked for style leakage. No JavaScript errors or failed local resources were recorded. This is targeted verification, not another full-suite run. Reports and screenshots: `/workspace/scratch/persona-v4-qa/`.

## Requested skill checks

All three requested repositories were downloaded at pinned revisions; see [third-party provenance](../present/THIRD_PARTY.md). GSAP was bundled locally, and a small React Bits-inspired pixel transition was integrated into the static site.

The unmodified Taste copy checker returned **0 failures and 2 warnings** (numbered steps and eyebrow labels). Its full gate returned **ERROR** because its Chromium subprocess could not start in this environment. The gate was stopped without modified checkers, waivers or forced passes. Independent Playwright tests above use the environment's supported Chromium launch configuration; they do not imply that the Taste gate passed.

## External limits

During V3–V5, direct scholarly-source and Vercel requests were blocked by the network proxy. Those earlier versions therefore kept research candidates pending. In V6, selected primary sources were retrieved and checked; see the evidence ledger. Production verification is recorded separately from local browser checks.
