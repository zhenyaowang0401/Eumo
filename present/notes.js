'use strict';

// Supporting sources and product detail. Main-stage copy lives in index.html.
window.EumoNotes = Object.freeze({
  scope: {
    title: 'Product Scope',
    html: `<p>Eumo combines a focus timer, a virtual companion, collections and a customizable home for learners aged 8–35. Music, friend presence and AI chat are optional.</p>
      <ul><li>Web, Windows and macOS share the core focus experience.</li><li>The desktop app supports a floating companion.</li><li>Progress is stored locally, with backup export/import.</li><li>Canele cloud pairing and device-to-web progress import are deployed. Four-digit pairing requires confirmation on the device.</li></ul>
      <p>The physical device still needs a firmware update and live hardware verification. Device import is not general account-based synchronization between all browsers.</p>
      <p class="note">Product screenshots use an illustrative save. Friends, AI chat and transcription require online services.</p>`
  },
  inspiration: {
    title: 'Project Inspiration',
    html: `<ul><li><strong>Online co-study:</strong> pandemic-era livestreams, Discord and Zoom sessions inspired optional friend visibility and shared accountability.</li><li><strong>Electronic pets:</strong> Tamagotchi inspired a persistent character, personalization and a reason to return.</li></ul>
      <p>Eumo brings these ideas into an independent study routine: a digital companion, with optional human connection.</p>
      <p class="note">The study-call scene and electronic pet are illustrations of the design references.</p>`
  },
  research: {
    title: 'Research Sources',
    html: `<div class="source"><a href="https://www.oecd.org/en/publications/pisa-2022-results-volume-ii_a97db61c-en/full-report/component-5.html" target="_blank" rel="noopener">OECD (2023) — PISA 2022: digital distraction</a><p>On average across OECD countries, 30% of 15-year-old students reported distraction from using digital devices in most or every mathematics lesson. This is self-reported school-context evidence, not prevalence across the full 8–35 target range.</p></div>
      <div class="source"><a href="https://doi.org/10.1037/bul0000025" target="_blank" rel="noopener">Harkin et al. (2016) — Goal-progress monitoring</a><p>A meta-analysis of 138 randomized studies (19,951 participants) found improved goal attainment, d = 0.40, 95% CI [0.32, 0.48]. Effects were larger when progress was reported or made public and physically recorded.</p><p>Evidence for progress sharing and accountability; not a trial of Discord, body doubling or Eumo. The effect size is not a percentage.</p></div>
      <div class="source"><a href="https://www.nature.com/articles/s41598-025-97652-6" target="_blank" rel="noopener">Kestin et al. (2025) — AI tutoring and learning</a><p>In a counterbalanced randomized trial with 194 undergraduate physics students, a purpose-built AI tutor produced more than twice the median learning gains of an in-class active-learning lesson.</p><p>This tested structured educational tutoring over two lessons, not open-ended companion chat. It does not establish the same effect for Eumo or every age group.</p></div>
      <div class="source"><a href="https://www.jmir.org/2020/3/e16235/" target="_blank" rel="noopener">Ta et al. (2020) — Support from companion chatbots</a><p>Two qualitative studies analyzed 1,854 Replika reviews and responses from 66 users. Users described companionship, emotional support and a non-judgmental space.</p><p>These are separate datasets of reported experiences, not an efficacy rate or a measure of learning improvement.</p></div>
      <div class="source"><a href="https://link.springer.com/article/10.1007/s10648-019-09498-w" target="_blank" rel="noopener">Sailer &amp; Homner (2020) — Gamification of learning</a><p>Across 16 studies and 2,246 participants, gamified learning had a positive motivational effect: Hedges’ g = 0.36, 95% CI [0.18, 0.54].</p><p>The result concerns combinations of game elements, not rewards alone. It is not a 36% improvement or proof that rewards always outperform punishment; effects varied with study quality.</p></div>
      <p class="note">Sources were checked on 17 November 2026. These studies inform product design; they do not measure Eumo’s effectiveness. The requested 8–35 target range is a product direction, not a population validated by all four studies.</p>`
  },
  persona: {
    title: 'Alex, 20',
    html: `<p>Alex is an undergraduate studying on a laptop at home or in the library. Reading, coursework and projects compete for attention.</p>
      <p><strong>Goal:</strong> begin a manageable task, sustain effort and return after interruptions.</p>
      <p><strong>Needs:</strong> low setup effort, flexible pauses, optional company and meaningful progress.</p>
      <p class="note">Illustrative profile informed by project feedback, not an interviewed participant.</p>`
  },
  landscape: {
    title: 'Competitive Analysis',
    html: `<table><thead><tr><th>Product / method</th><th>Function</th><th>Limitation / distinction</th></tr></thead><tbody>
      <tr><td>Pomodoro tools</td><td>Structure work and breaks; support planning and reflection.</td><td>Interval structure alone does not provide conversation or peer presence. The method itself is not punitive.</td></tr>
      <tr><td>Cat On Chair</td><td>Cat companionship, Pomodoro/count-up sessions, rewards and room decoration.</td><td>No live peer-presence feature is described in its current listing. Failed sessions may produce trash instead of a gift.</td></tr>
      <tr><td>Eumo</td><td>AI chat, online friend visibility and rewards linked to personalization.</td><td>These are product mechanisms; comparative learning or retention outcomes have not been measured.</td></tr>
      </tbody></table>
      <p>Some timer apps add penalties: Forest’s official FAQ says leaving the app or using blocked apps during strict sessions may cause a tree to wither. Forest also offers group focus, so this is not a claim that all timer apps lack peer features.</p>
      <p><a href="https://www.forestapp.cc/" target="_blank" rel="noopener">Forest — official FAQ</a> · <a href="https://www.pomodorotechnique.com/" target="_blank" rel="noopener">Official Pomodoro method</a> · <a href="https://apps.apple.com/us/app/cat-on-chair-pomodoro-timer/id6746562271" target="_blank" rel="noopener">Cat On Chair — App Store listing</a></p>
      <p class="note">Official descriptions checked on 17 November 2026. Absence from a listing is not a complete feature audit. Competitor images are reference illustrations recreated from the presenter’s supplied images.</p>`
  },
  demo: {
    title: 'Product Walkthrough',
    html: `<table><thead><tr><th>Time</th><th>Show</th></tr></thead><tbody>
      <tr><td>0:00–0:30</td><td>Setup: name, color and entry.</td></tr>
      <tr><td>0:30–1:25</td><td>Task, duration, start, pause and resume.</td></tr>
      <tr><td>1:25–2:15</td><td>Discoveries; Shop / Owned; equip an outfit.</td></tr>
      <tr><td>2:15–3:35</td><td>Home: place, move and put away furniture.</td></tr>
      <tr><td>3:35–4:20</td><td>Friend presence, study time and Visit Home.</td></tr>
      <tr><td>4:20–5:05</td><td>Music and the floating companion.</td></tr>
      <tr><td>5:05–5:40</td><td>Reports and optional AI chat.</td></tr>
      <tr><td>5:40–6:00</td><td>Return to the presentation.</td></tr>
      </tbody></table>
      <p>Active Study / Work time earns progress; Pause and Break do not. Ending early preserves earned rewards. The 15-second demo compresses time and is excluded from formal focus reports.</p>
      <p class="note">A timer records activity, not verified learning. Home visits show saved layouts with local visitor movement, not simultaneous multiplayer.</p>`
  },
  testing: {
    title: 'User Feedback & Iteration',
    html: `<ul><li><strong>Outfits motivate use:</strong> material discoveries can be exchanged for apparel.</li><li><strong>Phone sessions feel inconvenient or battery-intensive:</strong> web and desktop access support computer-based study.</li><li><strong>Users want to see friends studying:</strong> online state and study duration are visible.</li><li><strong>Too much text and unclear controls:</strong> shorter labels, separate Shop / Owned views and direct placement simplify interaction.</li></ul>
      <p>Next evaluation should observe session starts, interruptions, reward interpretation and repeat use. Check whether collections support the chosen task and whether friend visibility helps without adding pressure.</p>
      <p class="note">These are project-owner summaries of qualitative feedback. Participant count and a formal protocol were not supplied; no measured battery advantage or improvement percentage is claimed.</p>`
  },
  roadmap: {
    title: 'Next Steps',
    html: `<ol><li><strong>App UI:</strong> refine hierarchy, responsive layouts and the clarity of core actions.</li><li><strong>Enclosure design:</strong> develop Canele’s form, materials, controls and everyday handling.</li><li><strong>Device UI:</strong> improve pairing, session controls and progress feedback; complete live hardware verification.</li><li><strong>Commercial launch:</strong> test pricing and paid offerings, then prepare app-store submissions.</li></ol>
      <p class="note">These are planned priorities, not a confirmed release date or store approval.</p>`
  },
  extensions: {
    title: 'Physical Product Extensions',
    html: `<ul><li><strong>NFC keychain:</strong> opens its programmed link on a compatible phone.</li><li><strong>Canele:</strong> a working electronic prototype for digging and timekeeping, with firmware for recording settled progress and rewards.</li><li><strong>Cloud connection:</strong> four-digit pairing and device-to-web import are deployed. Pairing requires confirmation on the device.</li></ul>
      <p>The physical screen needs the latest firmware and a live pairing / sync test. This is not full account-based save synchronization.</p>
      <p class="note">Keychain colors and the enclosure are visualizations based on supplied references. Manufacturing readiness and battery life remain to be evaluated.</p>`
  },
  business: {
    title: 'Business Model',
    html: `<p><strong>Planned model:</strong> a free focus timer and basic companion provide entry; optional paid experiences create revenue.</p>
      <ul><li><strong>Subscription:</strong> expanded AI access and premium personalization.</li><li><strong>Digital collections:</strong> original outfits, interiors and seasonal themes.</li><li><strong>Physical products:</strong> NFC keychains and the Canele focus device.</li></ul>
      <p><strong>Acquisition:</strong> study communities, digital storefronts and direct sales. <strong>Cost drivers:</strong> AI usage, hosting, original artwork and hardware production / fulfillment.</p>
      <p class="note">Pricing, conversion and margins need validation after product use. No revenue, market-size or profitability figures are claimed.</p>`
  },
  fullscreen: {
    title: 'Presentation Controls',
    html: `<p>Use the arrows or Chapters menu to navigate. Escape closes a detail panel. The demo opens Eumo in another tab.</p>
      <p>Use browser fullscreen if page fullscreen is unavailable. Reduced-motion preferences are respected.</p>`
  }
});
