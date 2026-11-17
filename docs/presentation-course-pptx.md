# Eumo final presentation — course PPTX reading notes

Reviewed on November 16, 2026. These notes apply the course frameworks to Eumo; they do not reproduce the teacher's slide decks or treat classroom examples as Eumo research.

## Reading coverage and method

All **nine successfully transferred PPTX files** were reviewed: **162 slides** in total. Slide text and available speaker notes were extracted, SmartArt data was read separately, and the embedded lifecycle diagrams and selected key visual references were inspected. Raster media in the AI-industry deck was also checked with OCR; it mostly consists of illustrative photographs and icons. Coaching-deck typography, color, and card hierarchy were checked in the slide XML.

**Not reviewed:** `Healthcare  Use Cases - Short.pptx`. The attachment exceeds the execution tool's 32 MiB transfer limit. This is the tenth uploaded PPTX, and it must remain marked unavailable rather than included in a claim that all 21 course files were read.

Extraction directory: `/workspace/scratch/eumo-course/`. Original document locations are recorded in `manifest.json`. Initial plain slide extraction alone misses important SmartArt in three decks; those diagrams were inspected during this review.

## 1. Persona_Use_Case_Student.pptx — 14 slides

The deck teaches personas through Uber, Airbnb, and Spotify. A useful persona identifies **goal, context, current behavior, pain/constraints, and success**. It explicitly warns against assuming that everyone in an age group has the same needs or inventing research findings. A use case includes **actor, trigger, precondition, main flow, alternate flow, and success**. A feature is not the same as a successful user outcome.

**Apply to Eumo:** Introduce a provisional young-adult student persona through a situation: an evening assignment at a laptop, difficulty starting, dislike of guilt after interruptions, and a desire for gentle company. Mark it a **working persona based on qualitative feedback**, not a statistically validated segment. A companion screen or collectible is a feature; making progress on the chosen task is the desired outcome.

Show one short journey: choose a real task → start a focus session → work while the mole digs → pause or finish → reflect on task progress → personalize the home. Include the alternate path: an interruption happens; the user pauses and can return without losing already recorded progress. The user should not need to read a long persona biography during the talk.

**Visual pattern to adapt:** Small section label, strong sentence headline, two clear persona panels or four numbered steps, and a short highlighted takeaway. A consistent footer identifies the section and progress. Keep Eumo's art and palette rather than copying the course's blue/teal colors.

## 2. Persona and Journey Map - Hospital.pptx — 49 slides

This research example connects a documented sample to concrete role personas, then maps each person's work across time. Persona pages contain responsibilities, constraints, needs, mobility, and technology context; paired journey pages align actions, feelings, and system opportunities. The final recommendations connect mobility and work style to device choice, app model, ownership, and cost. The diagrams describe research → persona definition → wireframes, with stakeholder feedback between stages.

**Apply to Eumo:** The useful lesson is traceability: **observed friction → design decision → testable outcome**. The user's feedback that a phone is inconvenient or drains its battery is a device-context insight. It supports testing a desktop-first experience; it does not establish measured battery savings. Present laptop study, desktop work, and optional mobile access as contexts, not a blanket claim that one platform is superior.

The long hospital personas and their numeric attribute bars should not be copied into Eumo. Eumo has no established sample size or validated psychographic percentages. Instead, use a compact journey with three layers: user action, friction, and Eumo response. For example: “Starting alone / delay” → “one task + companion”; “Interrupted / guilt” → “pause and resume”; “Finishing / effort feels invisible” → “recorded progress + collection.” These emotional labels remain hypotheses unless specifically reported by participants.

**Visual pattern to adapt:** Paired persona-and-journey view; horizontal sequence with aligned rows; callout cards attached to specific moments. Hide the full analysis behind an optional detail panel so the main presentation stays readable.

**Caution:** The deck's web/native cost, security, and offline comparisons are context-specific historical recommendations, not universal technical facts. Do not import them as evidence about Eumo.

## 3. PM Documentation Basics.pptx — 1 slide

The apparent near-empty text extraction was incomplete: the main content is SmartArt. It distinguishes:

- **One-pager:** A quick product/service overview that earns attention and a next action.
- **PRD/business requirements:** What and why; needs, goals, priorities, and constraints.
- **Functional specification:** Exactly what the product does; behavior, interaction, inputs, outputs, and business rules in testable terms.
- **Technical specification:** How the product is designed, built, integrated, tested, and deployed.

**Apply to Eumo:** The presentation website is primarily a product story with PM reasoning. It should not become a source-code walkthrough. Keep implementation and evidence notes in expandable sections or linked project documentation. The live demo proves behavior; the main narrative explains the customer value and decisions.

**Visual pattern to adapt:** Four compact, consistently framed definitions. Translate this to a small “Problem → Decision → Experience → Validation” structure, not a page filled with development details.

## 4. Product Life Cycle.pptx — 3 slides

All three embedded diagrams were inspected: (1) market lifecycle from development through introduction, growth, maturity, and decline; (2) a six-step product process from ideation and definition through prototyping, detailed design, validation/testing, and commercialization; (3) software lifecycle from planning and requirements through design, development, testing, deployment, and maintenance.

The six-step diagram makes customer acceptance and **financial viability** separate from prototype functionality, and shows exit criteria and iteration. A working prototype does not mean product-market fit or commercial success.

**Apply to Eumo:** Position the product as a working multi-platform product with ongoing validation and refinement. The December roadmap should show learning gates: usability/reward-loop testing, reliability and compatibility, subscription/skin willingness-to-pay research, and hardware refinement. Keep **available**, **working prototype**, and **planned** labels visibly distinct. NFC link opening and the timer/digging handheld are functioning prototypes; commercial hardware production, pricing, and subscriptions remain future work.

**Visual pattern to adapt:** A short staged roadmap with visible “Now” and “Next” points and an explicit validation checkpoint. Avoid reproducing a smooth sales curve as though Eumo has actual revenue data.

## 5. Product_One_Pager_Coaching_Student.pptx — 8 slides

The framework has seven elements: product name/tagline, target audience, problem, solution, benefits, competitive advantage, and call to action. It recommends writing in thinking order: **who → pain → value → how → why us → next action**, then refining the headline. QuickBooks and Calendly examples distinguish customer outcomes from feature dumps. The exercise numbers and copy are illustrative.

**Apply to Eumo:** Opening message: “A little world built through focus.” Immediately establish the audience and desired benefit before showing the wardrobe, music, AI, or hardware. The closing CTA is concrete: **Open Eumo** for the live demonstration. Describe differentiation as the connected experience of focusing, discovering, personalizing, and returning; avoid unsupported “first,” “best,” or performance superiority claims.

**Visual pattern to adapt:** One large promise, a simple product screenshot, small supporting cards, and one clear CTA. Use progressive detail instead of showing all seven elements as dense text at once.

## 6. Zen_of_PM_PM-101 -  Student.pptx — 21 slides

The deck frames PM work as planning, design, and execution across customer, market, technology, and business constraints. Four recurring behaviors are **diagnose, align, translate, and validate**. Airbnb's listing photographs illustrate diagnosing the bottleneck; Xbox illustrates difficult quality/trust tradeoffs; Amazon illustrates clarity of thought; Burbn/Instagram illustrates removing features to sharpen value. The deck itself identifies classroom exercises as fictional and historical accounts as summarized.

**Apply to Eumo:** Show two or three decisions with reasons, not a chronological feature list. Good examples are reducing text and crowded headers, separating Shop from Owned, placing the home and inventory side by side, and introducing direct drag placement/removal. The key PM question is whether playful features help people start and return or become a distraction. Present that tradeoff candidly and pair it with a test.

Keep feedback separate from a requested solution: wanting outfits suggests a desire for ownership and visible progress, but does not prove that adding more cosmetics improves study outcomes. Paid skins and subscriptions should be framed as revenue hypotheses requiring willingness-to-pay and retention validation.

**Visual pattern to adapt:** Before/after contrast, one strong takeaway per screen, four short decision cards, and occasional audience interaction. Preserve the course's hierarchy and clear framing while using Eumo's cream, moss, terracotta, and pixel imagery.

## 7. AI Use Cases - in Different Industries.pptx — 8 slides

This is a June 2022 APAC industry overview. It groups use cases by industry and ties AI capability to a business or workflow result. Examples include customer service, risk analysis, personalized learning, scheduling, and administrative work. Its cited spending forecasts, banking figures, and radiology survey figures concern their stated industries and periods.

**Apply to Eumo:** Explain the specific job of optional AI companionship: conversational help with planning, questions, and light company around a focus session. Explain its limits and retain a complete core focus experience without AI. Do not make “AI” the value proposition by itself.

**Do not reuse:** The deck's APAC spending, executive adoption, radiologist expectations, and 2025 forecast as Eumo market size or evidence that young adults want AI companions. Eumo companionship demand needs a suitable primary source and direct user validation. The presentation's academic evidence cards must identify population, method, finding, and limitation separately.

**Visual pattern to adapt:** Group capabilities by real use case, then state the user benefit. Avoid a long catalogue of AI features or unrelated market statistics.

## 8. All about PM.pptx — 24 slides

The deck places PM at the intersection of customer, UX/technology, and business. It asks why the product matters, for whom, what it competes with, what success means, and what to measure after launch. SmartArt covers **Vision → Spec → Build → Operate**, while listening, metrics, iteration, and communicating impact remain ongoing. The career-stage and internal role sections are course context, not presentation content.

**Apply to Eumo:** Make the narrative answer the teacher's likely questions: Which specific customer? Which problem? Why this design? What has feedback changed? What works now? What remains uncertain? How will success and commercial viability be tested? More features are not automatically progress; the technical-debt visual reinforces the need for reliability and refinement.

Use a success model centered on **task progress and voluntary return**, with supporting measures such as time to first session, ability to pause/resume, clarity of reward rules, and return after interruption. A completed timer or large wardrobe alone does not demonstrate learning.

**Visual pattern to adapt:** A few simple diagrams or contrasting examples, with story and customer decisions ahead of implementation. Avoid importing the internal organization or role expectations.

## 9. Functional_Spec_Coaching_Student.pptx — 34 slides

This deck teaches writing requirements that are clear, specific, concise, and observable. Its structure is **why → what → experiences/flows → quality**. It covers scope/non-goals, actors and triggers, priorities, acceptance criteria, main/alternate/error paths, privacy/accessibility/performance, dependencies, and visible open decisions. Notion, Google Calendar, and Slack examples are explicitly illustrative rather than the companies' internal specifications. Sample thresholds are proposals, not measured outcomes.

**Apply to Eumo:** Describe current behavior precisely. For example: “Pausing stops reward accrual”; “Ending the session saves earned progress”; “Dragging placed furniture outside the home returns it to inventory.” Do not present full-timer completion as an anti-farming guarantee if code does not implement it. If the user wants to trial a completion bonus or alternative reward rule later, mark it as a design experiment.

The demo should include one recovery path—pause/resume or move/put away furniture—not just a perfect happy path. Optional microphone/AI features need graceful permission or network failure behavior and should not be the sole live-demo centerpiece. Browser/desktop compatibility, saves, and update differences belong in a concise technical appendix.

**Visual pattern to adapt:** “Observation → decision → behavior → verification” rows; state diagrams; a small current/planned distinction; appendix rather than dense requirements on the main stage.

## Recommended main-story application

The course material supports a short, evidence-conscious product story with **roughly 6–8 minutes of explanation**, then **5–6 minutes of live product use**:

1. **Promise:** a focus companion that turns recorded effort into a world to personalize.
2. **Person and context:** one working persona, one concrete desk-study scenario.
3. **Problem and inspiration:** motivation, company, and environment; separate direct feedback from external evidence and hypotheses.
4. **Alternatives and choice:** time-structuring tools, reward/companion products, and co-study; Pomodoro itself is not inherently punitive.
5. **Core loop:** focus → discover → personalize → return; show the actual product.
6. **Iteration and learning:** three qualitative observations and the concrete UI/product changes they motivated.
7. **Validation and business:** task progress/return, reward distraction risks, planned subscription/cosmetic model, and December learning gates.
8. **Ecosystem:** app, NFC keychain, functioning timer/digging handheld; status labels and colorway interaction.
9. **Live demo:** a clear entry point and return control, with detailed sources and technical scope available outside the main path.

This is a presentation outline, **not a speaker script**. The user explicitly deferred the script.

## Design translation for the website

Use the coaching decks' **section eyebrow → sentence headline → framed visual/cards → short takeaway** hierarchy. Use one principal interaction per screen. Keep large product imagery, short labels, generous space, clear next/previous navigation, and an optional evidence drawer. Eumo's flower background should remain low contrast behind cream reading surfaces. Moss/terracotta accents can identify selected controls; do not rely on color alone. Keyboard navigation, reduced-motion support, and a print/fallback view make a presentation safer to deliver.

Use larger body text than the source slides' 8–18 pt teaching detail. Copying their dense hospital layout directly would conflict with the user's low-text, image-led brief. Keep real product screenshots, clearly labeled generated hardware visualizations, and original prototype photographs distinct.
