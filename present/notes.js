'use strict';

// Supporting PM detail. Main-stage copy lives in index.html.
window.EumoNotes = Object.freeze({
  scope: {
    title: 'Product Scope',
    html: `<p>Eumo combines a task timer, a virtual companion, collections and a customizable home. Optional music, friends and AI support the core experience.</p>
      <h3>Current implementation</h3>
      <ul><li>Shared gameplay on web, Windows and macOS.</li><li>Native floating companion on desktop; browser support varies.</li><li>Device-local progress, with export/import for transfer.</li></ul>
      <p>Friends, AI chat and voice transcription require online services. Automatic cross-device save synchronization is not implemented.</p>
      <p class="note">Product screenshots use an illustrative demo save. They are not participant data or user-study results.</p>`
  },
  inspiration: {
    title: 'Project Inspiration',
    html: `<p>The founder’s starting point was pandemic-era livestream study sessions and co-study on Discord or Zoom: people created a shared setting for work, even when physically apart.</p>
      <h3>Design hypothesis</h3>
      <p>A lightweight desktop companion could provide some sense of presence without requiring a scheduled call. Optional friend visibility adds a social layer.</p>
      <p class="note">This is the project’s inspiration. It does not establish that a virtual character has the same effects as a human study partner.</p>`
  },
  research: {
    title: 'Evidence & Research Questions',
    html: `<p><strong>Review status:</strong> the references below are candidates for review. Findings, sample sizes and effect sizes have not yet been independently verified for this report.</p>
      <h3>Questions that inform the design</h3>
      <ul><li><strong>Co-presence:</strong> does optional visibility support starting and returning, or create comparison pressure?</li><li><strong>Motivation:</strong> do collections support the user’s chosen task, or become a distraction?</li><li><strong>Companionship:</strong> does a persistent character remain useful after its novelty fades?</li></ul>
      <p>Goal monitoring, remote co-study and virtual companionship are different mechanisms. Music and ambient sound also depend on the person and task. None establishes Eumo’s effectiveness without product testing.</p>
      <h3>Candidate reading list</h3>
      <div class="source"><a href="https://doi.org/10.1037/bul0000025" target="_blank" rel="noopener">Harkin et al. (2016) — Does monitoring goal progress promote goal attainment?</a><p>Goal-progress monitoring; a meta-analysis of experimental evidence. Reading pending.</p></div>
      <div class="source"><a href="https://doi.org/10.1037/0033-2909.125.6.627" target="_blank" rel="noopener">Deci, Koestner &amp; Ryan (1999) — Extrinsic rewards and intrinsic motivation</a><p>Reward type and contingency require careful interpretation. Reading pending.</p></div>
      <div class="source"><a href="https://doi.org/10.1037/a0035661" target="_blank" rel="noopener">Cerasoli, Nicklin &amp; Ford (2014) — Intrinsic motivation and extrinsic incentives jointly predict performance</a><p>A 40-year meta-analysis; not a blanket endorsement of game rewards. Reading pending.</p></div>
      <div class="source"><a href="https://www.jmir.org/2020/3/e16235/" target="_blank" rel="noopener">Ta et al. (2020) — User Experiences of Social Support From Companion Chatbots in Everyday Contexts</a><p>Qualitative experiences; not population prevalence, causal efficacy or purchase demand. Reading pending.</p></div>
      <div class="source"><a href="https://scholar.google.com/scholar?q=The+impact+of+background+music+on+adult+listeners+A+meta-analysis" target="_blank" rel="noopener">Kämpfe, Sedlmeier &amp; Renkewitz (2011) — The impact of background music on adult listeners</a><p>Check task, population and outcome differences. Bibliographic search; reading pending.</p></div>
      <div class="source"><a href="https://scholar.google.com/scholar?q=Lesiuk+The+effect+of+music+on+work+performance+2005" target="_blank" rel="noopener">Lesiuk (2005) — The effect of music on work performance</a><p>Work-context findings require verification before applying them to studying. Bibliographic search; reading pending.</p></div>
      <div class="source"><a href="https://arxiv.org/abs/2407.19096" target="_blank" rel="noopener">AI Companions Reduce Loneliness — research lead</a><p>Bibliographic details, current version, participants and duration require verification. No learning or long-term benefit is inferred.</p></div>
      <p class="note">No numerical effectiveness, demand or market-size claim is used in this presentation. The product hypotheses remain to be tested.</p>`
  },
  persona: {
    title: 'Persona & Jobs to Be Done',
    html: `<p><strong>Alex, 20:</strong> an undergraduate doing independent reading, coursework and project work on a laptop.</p>
      <p><strong>JTBD:</strong> when starting a task alone feels difficult, begin a manageable session, make progress and recover from interruptions.</p>
      <p><strong>Context:</strong> a library, dorm or home desk. Relevant needs include low setup effort, optional company and flexible pauses.</p>
      <p class="note">Alex is a proto-persona synthesized for design and testing, not an interviewed individual. Age alone does not define this segment; the context and needs require validation.</p>`
  },
  landscape: {
    title: 'Competitive Landscape',
    html: `<p>This is a comparison of product mechanisms, not a scored ranking of effectiveness.</p>
      <table><thead><tr><th>Reference</th><th>Comparison lens</th></tr></thead><tbody>
      <tr><td>Pomodoro tools</td><td>Time structure and a work/break rhythm.</td></tr>
      <tr><td>Cat On Chair</td><td>The founder’s named reference for a character-based focus experience.</td></tr>
      <tr><td>Eumo</td><td>A connected focus, discovery, wardrobe and home experience.</td></tr>
      </tbody></table>
      <p class="note">Pomodoro itself is not inherently punitive. A claim about punishment must identify a specific product rule. Current competitor features, pricing and user preferences still need direct verification.</p>
      <p>Eumo’s intended positioning is flexible focus with persistent personalization. Preference, differentiation and sustained value require user testing.</p>`
  },
  demo: {
    title: 'Live Demo Route',
    html: `<table><thead><tr><th>Time</th><th>Show</th></tr></thead><tbody>
      <tr><td>0:00–0:30</td><td>Setup: name, color and entry.</td></tr>
      <tr><td>0:30–1:25</td><td>Task, duration, start, pause and resume.</td></tr>
      <tr><td>1:25–2:15</td><td>Discoveries; Shop / Owned; equip an outfit.</td></tr>
      <tr><td>2:15–3:35</td><td>Home movement; place, move and put away furniture.</td></tr>
      <tr><td>3:35–4:20</td><td>Friend presence, shared time and Visit Home.</td></tr>
      <tr><td>4:20–5:05</td><td>Music and the floating companion.</td></tr>
      <tr><td>5:05–5:40</td><td>Reports and the optional AI entrance.</td></tr>
      <tr><td>5:40–6:00</td><td>Return to the presentation.</td></tr>
      </tbody></table>
      <h3>Explain the actual reward rule</h3>
      <p>Active Study / Work timer time earns progress. Paused time and Break do not. Ending a session saves earned rewards, including when it ends early; completing the full planned duration is not required.</p>
      <p class="note">Timer activity does not prove attention or learning. If using the existing 15-second developer demo, identify it as a time-compressed demonstration. It is excluded from formal focus reports.</p>
      <p>Friends and AI need their configured online services. Home visits show saved layouts with local visitor movement, not simultaneous multiplayer.</p>`
  },
  testing: {
    title: 'User Testing & Iteration',
    html: `<p><strong>Available input:</strong> qualitative feedback reported by the founder about outfit appeal, phone constraints and interaction friction. Participant count and study protocol were not provided.</p>
      <h3>Next study</h3>
      <p>Observe starting and resuming a session, interpreting rewards, equipping an owned item, and moving or putting away furniture. Follow with a short diary study during real tasks.</p>
      <ul><li><strong>Usability:</strong> task success, errors and recovery.</li><li><strong>Task value:</strong> self-reported progress alongside timer data.</li><li><strong>Retention:</strong> voluntary return, including after interruptions.</li><li><strong>Counter-signals:</strong> collection distraction and social comparison pressure.</li></ul>
      <p class="note">The existing structured user-test document is a plan, not completed results. No sample size, improvement percentage or retention outcome is claimed.</p>`
  },
  roadmap: {
    title: 'Product Roadmap',
    html: `<table><thead><tr><th>Phase</th><th>Decision evidence</th></tr></thead><tbody>
      <tr><td>Now</td><td>Current functionality, compatibility and clear product rules.</td></tr>
      <tr><td>Next</td><td>Observed usability and reward-loop behavior during real tasks.</td></tr>
      <tr><td>Through December</td><td>Repeat use, task value, reliability and feasibility of paid or physical extensions.</td></tr>
      </tbody></table>
      <p>Prioritize session starts, understandable rewards, recoverable decorating and accurate friend visibility. Evaluate reward-timing changes as experiments.</p>
      <p class="note">A working feature, customer acceptance and financial viability are separate milestones. This is a learning roadmap, not a guaranteed launch schedule.</p>`
  },
  extensions: {
    title: 'Physical Product Extensions',
    html: `<h3>Current capability</h3>
      <ul><li><strong>NFC keychain:</strong> opens its programmed link on a compatible phone.</li><li><strong>Handheld:</strong> a working electronic prototype with digging and timekeeping.</li></ul>
      <p>These capabilities are confirmed by the founder. The six keychain colors and canelé-shaped enclosure are visualizations based on supplied product references.</p>
      <h3>Next validation</h3>
      <p>Everyday use, controls, legibility, comfort, charging and the reason to carry a separate object.</p>
      <p class="note">No account pairing, cloud sync, full app parity, battery-life result or manufacturing readiness is implied. Color selection previews a design; it is not a checkout or stock indicator.</p>`
  },
  business: {
    title: 'Business Model & Validation',
    html: `<p><strong>Initial segment:</strong> young-adult students and independent desk workers who prefer flexible focus support. This segment hypothesis needs validation.</p>
      <h3>Proposed revenue streams</h3>
      <ul><li>Subscriptions for recurring optional value.</li><li>Cosmetic skins and themed worlds.</li><li>Keychains and a handheld, subject to demand and feasibility.</li></ul>
      <h3>Decision criteria</h3>
      <p>Test repeat use and willingness to pay after real product use. Assess acquisition through campus, study and indie-product communities. Consider art, support, hosting, optional AI and physical production/fulfillment costs.</p>
      <p class="note">No price, conversion, revenue, market-size or margin figure has been established. Interest in free outfits is not evidence of willingness to pay.</p>`
  },
  fullscreen: {
    title: 'Presentation Controls',
    html: `<p>Use the left/right arrows or chapter menu to move through the report. Escape closes a detail panel. The demo opens Eumo in another tab, preserving this presentation’s position.</p>
      <p>If page fullscreen is unavailable, use your browser’s fullscreen command. Reduced-motion preferences are respected.</p>`
  }
});
