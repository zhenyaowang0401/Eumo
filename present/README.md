# Eumo product case study — v3

An English presentation for a product-management final. The main screens use short points, actual product UI and Eumo's floral/pixel visual system; supporting methods and evidence sit in optional detail panels. V3 uses local DM Sans for readable text and a clear weight/size hierarchy, retaining the pixel Eumo mark and artwork. Terracotta emphasizes the key idea in each title.

**Entry:** [`index.html`](index.html) · **Web:** [Open the presentation](https://1111-phi-ten.vercel.app/present/index.html#overview)

## Presentation structure

| Chapter | Time |
| --- | --- |
| Product Overview | 0:30 |
| Project Inspiration | 0:40 |
| Research Insights | 0:50 |
| Persona | 0:40 |
| Competitive Landscape | 0:50 |
| Product Walkthrough | 6:00 |
| User Testing & Iteration | 1:00 |
| Next Steps | 0:45 |
| Product Extensions | 0:50 |
| Business Model | 0:35 |

Total: **12:40**, including a six-minute live demonstration. No speaker script is included yet.

- Navigate with the bottom controls, left/right arrows, PageUp/PageDown, Home/End or Chapters menu. Older deep links such as `#thankyou`, `#beyond` and `#hello` still work.
- Research themes, four feedback examples, three development workstreams and walkthrough steps change manually. Arrow keys move within tab groups; vertical groups use up/down.
- Inspiration connects illustrated pixel co-study with traditional electronic pets. Competitive Landscape gives each approach a visual reference and one short mechanism statement.
- Feedback pairs reported themes with implemented responses: apparel, desktop access, friend visibility and simpler interactions. Reward timing and idle farming remain an open design question.
- Next Steps covers **UI optimization**, **reward-mechanism refinement** and **physical-product optimization**, each with an evaluation criterion.
- Details open in native dialogs. Escape closes a dialog and restores trigger focus.
- **Orange** is the default keychain. Six named swatches include the new **Blue & Orange** and **Orange** designs. The handheld has its own tab.
- Open Eumo launches the actual application in another tab. The optional demo clock tracks presentation time only.
- A brief entrance plays once; physical-product swaps use a GSAP pixel transition adapted from React Bits. Reduced motion uses immediate changes. There are no timed carousels, autoplay music or scroll-triggered reveals.

## Local preview

From the repository root, run `npm run dev` and open its printed address followed by `/present/index.html`. The development server does not automatically resolve `/present/` to the index file. Runtime dependencies are bundled locally; no additional npm installation is needed for this page.

Run browser checks with `python3 tests/presentation_site_check.py`. See [QA notes](../docs/presentation-qa.md) and [third-party provenance](THIRD_PARTY.md).

## Content and evidence status

- Reviewed 11 DOCX documents and nine PPTX decks (162 slides): [DOCX notes](../docs/presentation-course-docx.md), [PPTX notes](../docs/presentation-course-pptx.md). `Healthcare  Use Cases - Short.pptx` exceeded the 32 MiB transfer limit and is excluded from that count.
- Alex, 20, is explicitly a **proto-persona**, not an interviewed participant.
- Feedback is qualitative and founder-reported. No participant count or protocol was supplied; the structured user-test plan is not completed study evidence.
- Scholarly sources and competitor pages remain pending direct verification because external retrieval was blocked. The [evidence ledger](../docs/presentation-evidence.md), `evidence.json` and detail panels do not claim unverified study statistics, market size or causal effects.
- [The product audit](../docs/presentation-product-audit.md) checks current code behavior: early-ending sessions retain earned rewards. Timer time is not evidence of attention or learning. Pomodoro is not inherently a punishment mechanism.
- Founder-confirmed hardware scope: NFC opens a programmed URL; the working electronic handheld supports timekeeping and digging.
- Subscriptions, paid cosmetics and physical-product economics are planned hypotheses, not established revenue.

## Assets and isolation

Most product screenshots come from the current code in an isolated illustrative context, not participant data. The Friends feedback example reuses an earlier development capture with sample profiles; its caption explicitly states this. Mole PNGs and material SVGs come from the game's renderer. Shared fonts and floral backgrounds are under `../assets/`; the new licensed DM Sans font is in `assets/fonts/`.

The co-study scene and Tamagotchi-style device are generated illustrations. Competitor visuals are reference illustrations recreated from the presenter's supplied images, not original app screenshots; this is disclosed in the page and detail notes. See [asset provenance](THIRD_PARTY.md).

`handheld.png`, `keychains.png` and `keychains-extra.png` are generated visualizations based on the supplied physical references. Original photographs are not bundled. The handheld screen is blank, avoiding an invented device interface.

This revision changes only the presentation and its verification/documentation. Gameplay, balances, saves, native packaging and update configuration are unchanged. GitHub source publication and production deployment are separate checks; do not treat a successful push as proof that Vercel has served the revision.
