# Presentation dependencies and requested repositories

Downloaded November 16, 2026 to `/workspace/skill-repos/` without installing executables or replacing the application's framework.

| Requested source | Pinned revision | Use |
| --- | --- | --- |
| [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | `aed9cfd3277740755f6bfc1155c7aa645403b760` | Core, timeline and performance guidance: transforms/opacity, interrupted-animation cleanup, reduced motion. |
| [DavidHDev/react-bits](https://github.com/DavidHDev/react-bits) | `d01aa914dcbe76da8b2923ebf872b5c8b1066e4c` | Component library, not a SKILL.md package. PixelTransition's cover/swap/reveal idea adapted to a small vanilla helper. No React migration. |
| [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | `f6b76575f949707b4e3c37cd86cb44b0b98643e8` | Plain copy, visual hierarchy, equal edges, real product imagery and restrained interaction guidance. |

## Runtime

`vendor/gsap.min.js` is the unmodified GSAP **3.14.2** distribution from the npm package. Its copyright and license header is retained. Copyright 2025 GreenSock. Subject to the [GSAP standard license](https://gsap.com/standard-license/). The package does not include a separate full license text file; the upstream license link is authoritative.

`interactions.js` credits React Bits PixelTransition at the pinned revision. The exact upstream MIT + Commons Clause notice is retained in [`vendor/react-bits-LICENSE.txt`](vendor/react-bits-LICENSE.txt). This is an integrated application interaction, not a standalone component resale.

## Applying Taste to the requested brief

The user's explicit requirements take priority over generic commercial-site defaults: keep Eumo's existing pixel/floral palette, ten academic chapters, fewer words and truthful labels such as Proto-persona, Planned and Visualization. Random palette/layout selection, a marketing funnel and the kit's 60–80-word target were not applied. The page uses working custom interactions rather than dummy kit annotations.

Unmodified Taste copy lint: no failures; warnings for numbered steps and eyebrow labels. The full gate could not launch Chromium in this environment and returned **ERROR**, so it was stopped without waivers or retries. Independent Playwright Chromium checks use the environment's supported launch configuration; results are recorded separately in [QA notes](../docs/presentation-qa.md).

## V3 typography

`assets/fonts/dm-sans.ttf` is the variable DM Sans font downloaded from the [Google Fonts repository](https://github.com/google/fonts/tree/main/ofl/dmsans) on November 16, 2026. The unmodified SIL Open Font License is bundled as `assets/fonts/dm-sans-OFL.txt`. It is served locally; the presentation makes no Google Fonts API request. Pixelify remains the existing Eumo brand font.

## V3 illustration provenance

| Asset | Origin and use |
| --- | --- |
| `assets/co-study-pixels.png` | Generated pixel illustration of four human students in a co-study call. It illustrates the founder's inspiration; it is not a participant photograph, a Zoom screenshot or study evidence. |
| `assets/persona-alex.png` | Generated pixel illustration of a 20-year-old student with glasses, a notebook and pencil. Alex is an illustrative profile informed by project feedback, not a real interviewee. |
| `assets/persona-avatar.png` | Head-and-shoulders avatar edited from the Alex illustration using the image-generation tool. This replaces the full-body character on the Persona page. |
| `assets/digital-pet-illustration.png` | Generated Tamagotchi-style electronic-pet illustration. It is not an authentic Bandai product photograph or a representation of the Eumo handheld. |
| `assets/competitor-reference-illustrations.png` | Generated reference sheet based on the presenter's supplied Cat On Chair promotional picture and red tomato timer icon. The original inline image bytes were unavailable in the workspace. These are visibly labeled **Reference illustration**, not represented as original or verified current app screenshots. |
| `../docs/images/eumo-friends-live.png` | Existing repository development capture containing sample friend profiles. The Feedback panel identifies it as an earlier development UI with sample profiles, not live users. |

The supplied references identify the comparison; they do not establish efficacy, current feature parity or permission to imply endorsement. These illustrations and the avatar edit were produced with the image-generation tool. Existing keychain/handheld source images remain unchanged; CSS normalizes the six keychains' transparent margins for consistent display size.

## Opening and closing

The cover's EUMO mark is copied directly from the application's own `startup-mark` SVG in the root `index.html`, with IDs prefixed to avoid collisions. `bookends.css` reuses the application's 200 ms stepped entrance from `woodland.css`, while keeping the presentation page visible afterward. Both cover and Thank You use the existing `assets/backgrounds/flower-meadow.png`. No new logo or floral background was generated.

## V8 product imagery

`assets/overview-burrow.png` is exported from the application's actual `PixelArt.drawHomePreview` renderer using an isolated, deterministic scene. It includes the existing home, furniture and clothed mole; no user account, saved home or interface is captured. CSS frames the left rooms and entrance ladder for the overview.

The five individual keychains in `assets/keychains/` are AI-retouched product images based on the new photographs supplied on November 17, 2026. The editing tool removed the wood background, adjusted lighting and, at the user's request, repositioned the metal hardware with its opening hook above its closed ring. These are edited images, not untouched photographs. Original inline photograph files are not bundled. CSS preserves each output's aspect ratio and aligns bead-body width and foot baseline across colors; it does not stretch the photos.

Orange retains its existing visualization from the right half of `assets/keychains-extra.png`; CSS frames that cell and matches the new images’ body width and foot baseline. Its opening hook is already above the closed ring. This existing artwork is intentionally used for release because the new orange photograph is not yet available to the image editor. The page makes no request for a missing `orange.png`.
