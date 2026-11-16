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
