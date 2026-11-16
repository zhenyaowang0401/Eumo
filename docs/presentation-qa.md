# Presentation website QA

Checked November 16, 2026 in local Chromium using the current `present/index.html`. The presentation uses only illustrative product assets; the checks do not access or change an owner's game save.

## Entry point

Use `/present/index.html` with the repository's Node development server. That server does not resolve `/present/` to the directory index and returns 404. This is documented rather than changing the game server for a presentation page. Python's static server and deployment hosts may resolve directory indexes differently; production behavior requires separate verification.

## Automated coverage

`python3 tests/presentation_site_check.py`

- Thirteen chapters at 1440×900, 1366×768, 1280×720, 390×844 and 320×568.
- Horizontal overflow, footer reachability and text/control clipping; desktop chapter height.
- Six keychain colors, corresponding accessible labels, selected state and distinct image/position choices.
- Keychain / handheld / app family tabs, panel semantics, detail actions, arrow/Home/End keyboard behavior.
- All four product-loop tabs, images and keyboard navigation.
- Chapter arrows, PageUp/PageDown, Home/End, index selection and deep links.
- Dialog opening, Escape, restoration of trigger focus and containment of DOM focus. Native dialogs may hand focus to browser chrome at an edge; they do not focus background page controls.
- Every detail note, current local links, image/font/script/network failures and JavaScript errors.
- Demonstration clock start, pause, resume and reset. Tests use real elapsed time: a display updated once per second can trail elapsed wall time by less than a second.
- Reduced motion, mole reaction, fullscreen entry/exit, smooth-navigation mode and no game-save writes.

Screenshots and structured results are saved outside the deliverable at `/workspace/scratch/presentation-qa/`.

## Final results

The full browser pass ran **169 checks: 167 passed**, with two failures limited to the core-loop chapter height on short desktop screens. After the screenshot-height CSS was adjusted, both affected checks passed in a targeted rerun:

| Viewport | Core-loop chapter | Available story area | Result |
| --- | --- | --- | --- |
| 1366×768 | 656px | 656px | Fits |
| 1280×720 | 608px | 608px | Fits |

The targeted rerun also checked the core-loop at 320×568 (vertical scrolling remains intentional on this small screen), with no horizontal overflow, and reconfirmed that the mobile hero mole no longer intersects its action or paragraph.

All 169 assertions therefore have passing results across the full run and the targeted correction check; this is **not** described as a second full-suite run. The complete checks remain reproducible with the command above.

- No horizontal overflow or content outside its chapter in the 65 chapter/viewport combinations.
- All non-hero chapters fit the tested desktop story area after correction. Small-screen chapters scroll vertically within the story pane and keep navigation reachable.
- Six distinct color selections; family/product tabs and keyboard navigation; chapter controls; all detail notes and local links; demo clock; reduced motion; fullscreen; deep links; and game-save isolation passed.
- No JavaScript errors or failed local image/font/script/evidence resources were detected.
- Screenshots were visually reviewed for the current focus/home artwork, desktop product loop and mobile hero. The assets are illustrative demo-save screenshots, not user-study evidence.

External scholarly/product-reference URLs could not be retrieved through the environment's network proxy. Local links were checked for HTTP success; external service availability is not represented as verified.
