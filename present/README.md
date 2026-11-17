# Eumo product presentation — v6

An English presentation for a product-management final. The main screens use short points, actual product UI and Eumo's floral/pixel visual system; supporting methods and evidence sit in optional detail panels. The page uses local DM Sans for readable text and a clear weight/size hierarchy, retaining the pixel Eumo mark and artwork. Terracotta emphasizes the key idea in each title.

**Entry:** [`index.html`](index.html) · **Web:** [Open the presentation](https://1111-phi-ten.vercel.app/present/index.html?v=6#cover)

## Presentation structure

| Chapter | Time |
| --- | --- |
| Opening | 0:10 |
| Product Overview | 0:30 |
| Project Inspiration | 0:40 |
| Research Insights | 0:50 |
| Persona | 0:40 |
| Competitive Analysis | 0:50 |
| Product Walkthrough | 6:00 |
| User Feedback & Iteration | 1:00 |
| Next Steps | 0:45 |
| Product Extensions | 0:50 |
| Business Model | 0:35 |
| Thank You | 0:10 |

Total: **13:00**, including a six-minute live demonstration. No speaker script is included yet.

- Navigate with the bottom controls, left/right arrows, PageUp/PageDown, Home/End or Chapters menu. The new `#cover` and `#thankyou` links target the opening and closing pages. Older aliases such as `#beyond` and `#hello` still work.
- Four research tabs show checked findings on accountability, AI learning, AI companionship and gamification, with study context and clickable citations.
- Overview gives WHO / PROBLEM / HOW one sentence each. A small logo and the OECD PISA 2022 distraction statistic replace the large interface screenshot.
- Inspiration retains pixel co-study and electronic-pet illustrations.
- Persona shows Alex, 20, and one avatar beside study context, goals, pain points and needs. The profile's illustrative basis is available in the detail panel.
- Competitive Analysis separates each tool's function from its limitation. Cat On Chair's rewards/decorating and the Pomodoro method's non-punitive nature are represented accurately.
- Feedback pairs four reported themes with implemented responses. The bottom warning banner is removed; supporting context is available in the detail panel.
- Next Steps lists app UI, enclosure design, device interface and commercial launch preparation, without a deadline or bottom criterion panel.
- Business Model presents a proposed free core, three revenue streams, acquisition, distribution and cost structure. Eumo's floral artwork replaces mascot decoration.
- Details open in native dialogs. Escape closes a dialog and restores trigger focus.
- The opening reuses the application’s actual EUMO startup SVG and short pixel entrance over its floral background. It stays visible as a presentation cover. The final Thank You page uses the same background; both carry Zhenyao Wang and Yun Ye’s names.
- **Orange** is the default keychain. Six named swatches include the new **Blue & Orange** and **Orange** designs. The handheld has its own tab. Six keychain images have their visible bounds normalized to the Blue & Orange reference, preserving each source’s aspect ratio.
- Open Eumo launches the actual application in another tab. The optional demo clock tracks presentation time only.
- A brief entrance plays once; physical-product swaps use a GSAP pixel transition adapted from React Bits. Reduced motion uses immediate changes. There are no timed carousels, autoplay music or scroll-triggered reveals.

## Local preview

From the repository root, run `npm run dev` and open its printed address followed by `/present/index.html`. The development server does not automatically resolve `/present/` to the index file. Runtime dependencies are bundled locally; no additional npm installation is needed for this page.

Run browser checks with `python3 tests/presentation_site_check.py`. See [QA notes](../docs/presentation-qa.md) and [third-party provenance](THIRD_PARTY.md).

## Content and evidence status

- Reviewed 11 DOCX documents and nine PPTX decks (162 slides): [DOCX notes](../docs/presentation-course-docx.md), [PPTX notes](../docs/presentation-course-pptx.md). `Healthcare  Use Cases - Short.pptx` exceeded the 32 MiB transfer limit and is excluded from that count.
- Alex, 20, is an illustrative profile informed by project feedback, not an interviewed participant.
- Feedback is qualitative and project-owner-reported. No participant count or formal protocol was supplied.
- Selected primary sources were retrieved on 17 November 2026: OECD PISA 2022, Harkin et al. (2016), Kestin et al. (2025), Ta et al. (2020), and Sailer & Homner (2020). See the [evidence ledger](../docs/presentation-evidence.md) for exact findings, populations and verification scope.
- Research describes other interventions, not measured Eumo outcomes. The 8–35 product target is not a population validated by all cited studies. Standardized effects are not percentage improvements.
- Official Pomodoro, Forest and Cat On Chair descriptions were checked. Penalties occur in specific products; Pomodoro itself is not inherently punitive.
- Active Study / Work time earns progress. Early-ending sessions retain earned rewards; timer time is not proof of attention or learning.
- NFC opens a programmed URL. Canele cloud pairing and device-to-web import are deployed; physical firmware update and live hardware verification remain with the connected computer.
- Subscriptions, digital collections and physical sales are a proposed commercial model, with pricing and margins still to validate.

## Assets and isolation

Most product screenshots come from the current code in an isolated illustrative context, not participant data. The Friends feedback example reuses an earlier development capture with sample profiles; its caption explicitly states this. Mole PNGs and material SVGs come from the game's renderer. Shared fonts and floral backgrounds are under `../assets/`; the new licensed DM Sans font is in `assets/fonts/`.

The co-study scene and Tamagotchi-style device are generated illustrations. Competitor visuals are reference illustrations recreated from the presenter's supplied images, not original app screenshots; this is disclosed in the page and detail notes. See [asset provenance](THIRD_PARTY.md).

`handheld.png`, `keychains.png` and `keychains-extra.png` are generated visualizations based on the supplied physical references. Original photographs are not bundled. The handheld screen is blank, avoiding an invented device interface.

This revision changes only the presentation and its verification/documentation. Gameplay, balances, saves, native packaging and update configuration are unchanged. GitHub source publication and production deployment are separate checks; do not treat a successful push as proof that Vercel has served the revision.
