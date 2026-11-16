# Eumo product story

An English interactive presentation for a product-management final, styled with Eumo's day palette, floral background, actual pixel artwork and current product UI.

**Entry:** [`index.html`](index.html) · **Web:** [Open the presentation](https://1111-phi-ten.vercel.app/present/index.html)

## Presenting

- Use the left/right arrows, bottom controls or Chapters menu to navigate 13 chapters.
- Allow approximately 8 minutes for the story and 5–6 minutes for the live demonstration. Chapter timing suggestions total 13 minutes 15 seconds, including the demo and closing.
- Field notes and underlined links open supporting detail. Escape closes the panel.
- Product-loop tabs show current app screenshots. Keychain swatches select six colorway visualizations. The product-family tabs distinguish the NFC keychain, working timer/digging handheld and app.
- Open Eumo launches the real product in another tab. The presentation remains in place; its optional demo clock tracks elapsed presentation time only.
- Fullscreen is optional. Reduced-motion preferences are respected. No music starts automatically.

The requested speaker script is intentionally not included yet.

## Local preview and verification

From the repository root:

```sh
npm run dev
```

Open the server's printed URL followed by `/present/index.html`. The custom development server does not resolve `/present/` to an index automatically. No new package dependencies are required.

Browser verification uses the current Chromium installation and Python Playwright:

```sh
python3 tests/presentation_site_check.py
```

## Content and evidence status

- Reviewed all 11 transferred DOCX documents and 9 transferred PPTX decks (162 slides). See [DOCX notes](../docs/presentation-course-docx.md) and [PPTX notes](../docs/presentation-course-pptx.md).
- `Healthcare  Use Cases - Short.pptx` exceeds the attachment transfer limit of 32 MiB and has not been read. It is excluded from the review count.
- External scholarly sources and reference sites were blocked by the environment's network proxy. [The evidence ledger](../docs/presentation-evidence.md) and `evidence.json` explicitly label reading as pending. No study percentages, efficacy figures, market size, conversion or revenue have been invented.
- User feedback is qualitative and reported by the founder. Participant counts and study protocol were not provided. The existing user-test plan is a plan, not completed study results.
- [The product audit](../docs/presentation-product-audit.md) verifies current code behavior. Ending a session early retains earned progress. A timer is not evidence of attention or learning.
- Hardware functions are founder-confirmed: the NFC keychain opens its programmed link; the working handheld prototype has digging and timekeeping only.
- Subscriptions, real-money cosmetics and physical-product economics are future validation topics.

## Asset provenance

`assets/screenshots/` contains fresh product screenshots from the current code, using an isolated illustrative demo save rather than participant data. Mole PNGs and material SVGs come from the game's renderer. Fonts and floral backgrounds are reused from `../assets/`.

`handheld.png`, `keychains.png` and `keychains-extra.png` are generated visualizations based on the supplied physical product references. They are labeled as visualizations and do not prove electronics, battery performance or manufacturing readiness. The handheld rendering leaves its screen blank rather than inventing a device interface. The original photographs are not bundled in this site.

No gameplay logic, balances, saves, native packaging or update configuration is changed by this presentation.
