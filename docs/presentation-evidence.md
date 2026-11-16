# Eumo presentation: evidence, claims and research gaps

Prepared 16 November 2026. This document supports an English PM presentation. It is **not a completed literature review**.

## Verification status

The research environment returned `Tunnel connection failed: 403 Forbidden` for every attempted external source below. Source titles are research candidates identified from prior knowledge; abstracts, methods, results, current versions and competitor pages were **not retrieved in this session**. The presentation must not display numerical research results or label these sources “verified.” No article is treated as proof of Eumo's effectiveness. Links are supplied for follow-up reading, not as a claim that the linked contents have been checked.

The project owner supplied qualitative feedback about rewards, clothing, desktop use, social features and UI. Sample size, recruitment, ages and study protocol were not supplied. Those observations may be called **early qualitative feedback**; they are not a market survey or controlled experiment. The local `Eumo_User_Test_Plan` is a plan, not completed test results.

## Presentation-ready claims

| Theme | Safe main-stage wording | Product decision | What remains to test |
| --- | --- | --- | --- |
| Sound | **Build your own focus atmosphere.** | Music and nature sounds are optional; silence is a valid choice. | Which sound, if any, helps each person and task? Preference and measured task performance are different outcomes. |
| Accountability | **A quiet sense of studying alongside someone.** | Friends can choose to share presence and focus-time summaries. | Does visibility help people start and return, or create pressure and comparison? |
| Motivation | **Turn time into something personal.** | Earn discoveries, outfits and a home while retaining the ability to pause. | Are users progressing on chosen tasks, or leaving the timer running to collect? |
| Companionship | **A companion that works and rests with you.** | A persistent mole and optional AI conversation provide different kinds of companionship. | Does this make starting feel easier? How do comfort, sustained use and willingness to pay differ? |

These are product intentions and hypotheses, not quantified scientific claims.

## Candidate literature and the boundaries of each claim

### 1. Background audio

- **Kämpfe, J., Sedlmeier, P., & Renkewitz, F. (2011).** *The impact of background music on adult listeners: A meta-analysis.* Psychology of Music. [Title search](https://scholar.google.com/scholar?q=The+impact+of+background+music+on+adult+listeners+A+meta-analysis).
- **Lesiuk, T. (2005).** *The effect of music on work performance.* Psychology of Music. [Title search](https://scholar.google.com/scholar?q=Lesiuk+The+effect+of+music+on+work+performance+2005).
- **Additional population-specific lead:** *Do White Noise and Pink Noise Help With Attention in Attention-Deficit/Hyperactivity Disorder? A Systematic Review and Meta-Analysis* (2024; exact bibliographic details require checking). [PubMed search](https://pubmed.ncbi.nlm.nih.gov/?term=white+noise+pink+noise+attention+2024+meta+analysis).

**Verification:** pending. Do not quote sample counts, effect sizes or study outcomes before reading the sources.

**Questions for reading:** What tasks and populations were included? Was the outcome subjective mood, speed, accuracy or sustained attention? Was audio chosen by the participant? Do lyrics or task difficulty alter results? ADHD-specific findings cannot be generalized to all young adults or used to claim treatment. Nature recordings in Eumo are not interchangeable with laboratory white or pink noise.

**Eumo implication:** offer choice and volume control; avoid “scientifically proven to improve focus.” A future within-person test can compare silence, preferred instrumental music and nature sounds on the same chosen task, without presenting preference as performance.

### 2. Goal monitoring and peer study

- **Harkin, B., et al. (2016).** *Does monitoring goal progress promote goal attainment? A meta-analysis of the experimental evidence.* Psychological Bulletin. [DOI](https://doi.org/10.1037/bul0000025).
- **Supplementary theoretical distinction:** Bond, C. F., & Titus, L. J. (1983). *Social facilitation: A meta-analysis of 241 studies.* Psychological Bulletin. [Title search](https://scholar.google.com/scholar?q=Bond+Titus+Social+facilitation+A+meta-analysis+of+241+studies).

**Verification:** pending. Harkin's methods/results and public-reporting moderators have not been checked here.

**Boundaries:** monitoring progress is not identical to being observed. General social facilitation does not establish that Discord, Zoom or “body doubling” improves learning. A video co-study room, a scheduled accountability partner and Eumo's asynchronous friend status are different interventions. Session time is not task completion.

**Eumo implication:** optional friend presence and time summaries, with private solo use remaining complete. Validate whether this improves starting or returning without increasing comparison pressure. Describe Discord/Zoom as **familiar co-study formats**, not as scientifically established benchmarks.

### 3. Rewards and autonomous motivation

- **Deci, E. L., Koestner, R., & Ryan, R. M. (1999).** *A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation.* Psychological Bulletin. [DOI](https://doi.org/10.1037/0033-2909.125.6.627).
- **Cerasoli, C. P., Nicklin, J. M., & Ford, M. T. (2014).** *Intrinsic motivation and extrinsic incentives jointly predict performance: A 40-year meta-analysis.* Psychological Bulletin. [DOI](https://doi.org/10.1037/a0035661).

**Verification:** pending. Do not quote pooled effects or claim a universal comparison between rewards and punishment.

**Boundaries:** reward type, expectation, contingency and task quality/quantity matter. A preference for cosmetics is not evidence of sustained learning. Pomodoro is a time-structuring technique; it is not inherently punitive. Some implementations introduce loss or blocking, but this must be checked at product/mode level.

**Eumo implication:** position the experience as gentle and customizable. Let users pause and rest. Track whether they return to a self-chosen task, not just time spent in the wardrobe. A timer cannot verify attention.

**Current mechanism, verified separately in code:** active timer time accrues earnings; ending early retains recorded time and rewards. Completion-only rewards are **not** the current implementation. Any stricter completion gate or reward-free evaluation build must be labeled a proposal, not an existing anti-cheat guarantee.

### 4. AI companionship and demand

- **Ta, V., et al. (2020).** *User Experiences of Social Support From Companion Chatbots in Everyday Contexts: Thematic Analysis.* Journal of Medical Internet Research. [Article](https://www.jmir.org/2020/3/e16235/).
- **AI Companions Reduce Loneliness** (2024 arXiv research lead; authors, version and publication status require verification). [arXiv record](https://arxiv.org/abs/2407.19096).

**Verification:** pending. No outcomes, prevalence numbers or market-size figures have been extracted.

**Boundaries:** qualitative reports cannot establish population prevalence or causal improvement. A short-term loneliness outcome does not prove sustained well-being, better studying, retention or willingness to pay. Teen survey data cannot estimate demand among adult students and young workers. A visual game companion is also different from conversational AI.

**Eumo implication:** AI is optional support for planning or conversation. The core focus loop works without chat. Avoid medical claims and promises of replacing human relationships. Validate adult users' actual choices and recurring use, including users who do not want AI.

## Competitor framework

Current official feature/price verification is **blocked**. The following are comparison lenses to verify, not audited current feature tables.

| Reference | Comparison lens | Question for Eumo | Official reference |
| --- | --- | --- | --- |
| Pomodoro technique | Time structure | Does a user need a fixed cycle or flexible focus duration? | [Pomodoro Technique](https://www.pomodorotechnique.com/) |
| Forest | A visible object that grows with focus | How should users retain a sense of progress when interrupted? | [Forest](https://www.forestapp.cc/) |
| Focusmate | Human accountability | What is gained and lost with live appointments versus optional presence? | [Focusmate](https://www.focusmate.com/) |
| Finch | Companion-led self-care and rewards | Can a gentle relationship encourage return without adding another obligation? | [Finch](https://finchcare.com/) |
| Spirit City: Lofi Sessions | Desktop atmosphere and collectible companion world | How can Eumo stay playful while requiring little attention during work? | [Steam](https://store.steampowered.com/app/2113850/Spirit_City_Lofi_Sessions/) |
| Tamagotchi | Attachment to a small persistent physical character | What makes carrying the character meaningful beyond launching a link? | [Tamagotchi](https://tamagotchi-official.com/) |

Do not say these competitors “failed,” assign unsupported prices/downloads, or call Eumo the only desktop focus companion.

## Market and validation plan

**Initial segment:** young-adult students and early-career desk workers who already spend long periods at a computer and prefer a gentle focus ritual. This is a proposed beachhead, not a measured market share. Children require a separate discovery and privacy/safety workstream.

**Demand signals supplied by the owner:** users expressed interest in outfits/rewards; some preferred computer use because leaving a phone running felt inconvenient or battery-intensive; social visibility and simpler interactions were requested. These are qualitative signals without a known denominator. No measured battery advantage is claimed.

**Next research:** recruit from the initial segment, document actual participant count and ages, observe first-session and decorating tasks, then run a repeat-use pilot. Capture chosen task, time-to-start, interruptions, self-reported task progress, return behavior, perceived pressure and distraction from collecting. Test sound and friend visibility as optional conditions. Ask about subscription/cosmetic value after use; stated interest is not purchasing evidence. A pilot sample is exploratory, not population-representative.

**Business:** subscriptions, cosmetics and physical products are revenue hypotheses. Report no fabricated TAM, conversion or revenue. Estimate a bottom-up reachable market only after identifying actual channels and testing activation, return use and willingness to pay.

## Access log

Attempt date: 16 November 2026. All returned proxy tunnel 403, before article/page content was obtained:

- PubMed search and NCBI PMC / E-utilities
- Europe PMC search
- Crossref Works API
- DOI resolver for Harkin et al.
- arXiv abstract and export API
- JMIR article
- Publisher link for background music (candidate URL)
- Forest, Focusmate, Finch, Moonloop, Steam and Pomodoro official pages

Tool discovery found no independent web-search or browser connector. Do not remove this limitation unless later verification is actually completed.
