'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const story = $('#story');
  const chapters = $$('.chapter');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const details = $('#detailDialog');
  const contents = $('#contentsDialog');
  let current = 0;
  let evidence = null;
  let detailKey = '';
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function updateChapter() {
    const top = story.getBoundingClientRect().top;
    let best = 0;
    chapters.forEach((chapter, index) => {
      if (Math.abs(chapter.getBoundingClientRect().top - top) < Math.abs(chapters[best].getBoundingClientRect().top - top)) best = index;
    });
    current = best;
    $('#chapterNumber').textContent = String(current + 1).padStart(2, '0');
    $('#chapterTotal').textContent = String(chapters.length).padStart(2, '0');
    $('#chapterLabel').textContent = chapters[current].dataset.title;
    $('#progressFill').style.width = `${(current + 1) / chapters.length * 100}%`;
    $('#prevChapter').disabled = current === 0;
    $('#nextChapter').disabled = current === chapters.length - 1;
    if (location.hash !== '#' + chapters[current].id) history.replaceState(null, '', '#' + chapters[current].id);
    $$('#chapterLinks button').forEach((button, index) => button.setAttribute('aria-current', String(index === current)));
  }
  function goTo(index, instant = false) {
    index = Math.min(chapters.length - 1, Math.max(0, index));
    chapters[index].scrollIntoView({behavior: instant || reduced.matches ? 'instant' : 'smooth', block: 'start'});
    current = index;
  }
  let scrollPending = false;
  story.addEventListener('scroll', () => {
    if (scrollPending) return;
    scrollPending = true;
    requestAnimationFrame(() => {updateChapter(); scrollPending = false;});
  }, {passive: true});
  $('#prevChapter').addEventListener('click', () => goTo(current - 1));
  $('#nextChapter').addEventListener('click', () => goTo(current + 1));
  $$('[data-next]').forEach(button => button.addEventListener('click', () => goTo(current + 1)));
  chapters.forEach((chapter, index) => {
    const button = document.createElement('button');
    button.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span>${escape(chapter.dataset.title)}<small>${escape(chapter.dataset.time)}</small>`;
    button.addEventListener('click', () => {contents.close(); goTo(index);});
    $('#chapterLinks').append(button);
  });
  $('#contentsButton').addEventListener('click', () => contents.showModal());
  $('#closeContents').addEventListener('click', () => contents.close());
  $('#closeDetail').addEventListener('click', () => details.close());
  for (const dialog of [details, contents]) dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  $('#fullscreenButton').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else openDetail('fullscreen');
    } catch { openDetail('fullscreen'); }
  });
  document.addEventListener('fullscreenchange', () => $('#fullscreenButton').setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen'));
  document.addEventListener('keydown', event => {
    if (details.open || contents.open || event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, textarea, select, [role="tablist"]')) return;
    if (['ArrowRight', 'PageDown'].includes(event.key)) {event.preventDefault(); goTo(current + 1);}
    if (['ArrowLeft', 'PageUp'].includes(event.key)) {event.preventDefault(); goTo(current - 1);}
    if (event.key === 'Home') {event.preventDefault(); goTo(0);}
    if (event.key === 'End') {event.preventDefault(); goTo(chapters.length - 1);}
  });
  function hashNavigate() {
    const index = chapters.findIndex(c => '#' + c.id === location.hash);
    if (index >= 0) goTo(index, true);
  }
  window.addEventListener('hashchange', hashNavigate);
  window.addEventListener('resize', () => requestAnimationFrame(updateChapter));
  document.fonts.ready.then(() => {hashNavigate(); updateChapter();});

  let helloCount = 0;
  const greetings = ['One little step?', 'I’m right here.', 'We can take our time.', 'Let’s dig into it.'];
  $('#petMole').addEventListener('click', () => {
    $('#moleSpeech').textContent = greetings[++helloCount % greetings.length];
    $('#petMole').classList.remove('bounce');
    void $('#petMole').offsetWidth;
    $('#petMole').classList.add('bounce');
  });

  const product = {
    focus: ['focus.png','FOCUS','Choose a task. Start a session. Your mole works alongside you.','Eumo focus timer and digging mole'],
    discover: ['focus.png','DISCOVER','Active timer time earns progress and discoveries. A timer records time, not attention.','Eumo digging scene, with discoveries earned through active timer time'],
    dress: ['wardrobe.png','MAKE IT YOURS','Trade stars or collected materials for outfits. Shop and Owned keep the choices clear.','Eumo wardrobe, with separate Shop and Owned views'],
    home: ['home.png','COME BACK','Drag furniture into place. Walk through your rooms. Keep a little world that feels like yours.','Eumo decorated underground home']
  };
  function setProduct(key) {
    const [image,label,description,alt] = product[key];
    $('#productShot').src = 'assets/screenshots/' + image;
    $('#productShot').alt = alt;
    $('#productWindowLabel').textContent = 'EUMO / ' + label;
    $('#productDescription').textContent = description;
    $('#productPanel').setAttribute('aria-labelledby', 'tab-' + key);
    $$('[data-product]').forEach(button => {const selected = button.dataset.product === key;button.setAttribute('aria-selected', String(selected));button.tabIndex = selected ? 0 : -1;});
  }
  $$('[data-product]').forEach(button => button.addEventListener('click', () => setProduct(button.dataset.product)));
  function keyboardTabs(selector) {
    $$(selector).forEach(button => button.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();event.stopPropagation();
      const tabs = $$(selector), index = tabs.indexOf(button);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].click();tabs[next].focus();
    }));
  }
  keyboardTabs('[data-product]');

  const colors = ['Sunflower','Mint','Lavender','Charcoal','Blue & orange','Tangerine'];
  function setColor(index) {
    $('#colorName').textContent = colors[index];
    $('#keychainSprite').setAttribute('aria-label', colors[index] + ' Eumo keychain visualization');
    $('#keychainSprite').classList.toggle('extra', index >= 4);
    $('#keychainSprite').style.backgroundPosition = index < 4 ? `${index % 2 * 100}% ${Math.floor(index / 2) * 100}%` : `${(index - 4) * 100}% 50%`;
    $$('[data-color]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.color) === index)));
  }
  $$('[data-color]').forEach(button => button.addEventListener('click', () => setColor(Number(button.dataset.color))));
  const family = {
    keychain: {status:'WORKING NFC PROTOTYPE',title:'A little company.<br>Anywhere you go.',description:'Tap the keychain with a compatible phone to open its programmed link.',caption:'Colorway visualization',more:'How the NFC link works ↗',detail:'nfc'},
    handheld: {status:'WORKING ELECTRONIC PROTOTYPE',title:'Focus,<br>made physical.',description:'A small handheld companion. Its current prototype supports digging and timekeeping.',caption:'Enclosure visualization · not a device screenshot',more:'What works today ↗',detail:'handheld'},
    app: {status:'WEB · WINDOWS · MAC',title:'Your world.<br>Your everyday desk.',description:'Focus, collect, dress up and decorate. Keep Eumo nearby while you do your own thing.',caption:'Current product · illustrative demo save',more:'Platforms & progress ↗',detail:'platforms'}
  };
  function setFamily(key) {
    const item = family[key];
    $('#familyStatus').textContent = item.status;
    $('#familyTitle').innerHTML = item.title;
    $('#familyDescription').textContent = item.description;
    $('#visualizationLabel').textContent = item.caption;
    $('#familyMore').textContent = item.more;
    $('#familyMore').dataset.detail = item.detail;
    $('#keychainSprite').hidden = $('#colorPicker').hidden = key !== 'keychain';
    $('#handheldRender').hidden = $('#handheldFunctions').hidden = key !== 'handheld';
    $('#familyAppImage').hidden = $('#appPlatforms').hidden = key !== 'app';
    $('#familyPanel').setAttribute('aria-labelledby', 'family-' + key);
    $$('[data-family]').forEach(button => {const selected = button.dataset.family === key;button.setAttribute('aria-selected', String(selected));button.tabIndex = selected ? 0 : -1;});
  }
  $$('[data-family]').forEach(button => button.addEventListener('click', () => setFamily(button.dataset.family)));
  keyboardTabs('[data-family]');

  let demoStart = null;
  let demoElapsed = 0;
  function drawDemoTime() {
    const seconds = Math.floor((demoElapsed + (demoStart === null ? 0 : Date.now() - demoStart)) / 1000);
    $('#demoTimer').innerHTML = `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')} <span>/ 05:30</span>`;
  }
  $('#startDemoClock').addEventListener('click', () => {
    if (demoStart === null) {demoStart = Date.now();$('#startDemoClock').textContent = 'Pause demo clock ◷';}
    else {demoElapsed += Date.now() - demoStart;demoStart = null;$('#startDemoClock').textContent = 'Resume demo clock ◷';}
    drawDemoTime();
  });
  setInterval(() => {if (demoStart !== null) drawDemoTime();}, 1000);

  const notes = {
    persona: ['A working persona, not a stereotype.', `<p><strong>Who:</strong> a young-adult student or early-career worker doing self-directed desk work. Age alone does not define the need.</p><p><strong>When / where:</strong> an essay, reading session, coding task or project at a library, dorm or home desk.</p><p><strong>Job to be done:</strong> “When I find it hard to begin a task alone, help me start a manageable session and see that my effort counted.”</p><p><strong>Needs:</strong> low setup effort, quiet company, flexible pauses and personally meaningful progress.</p><p><strong>Alternatives:</strong> a basic timer, music playlist, Discord / Zoom study room, or working beside a friend.</p><div class="note">This is a synthesis for testing, not a validated persona or a verbatim participant quote. Children would require separate research and age-appropriate product design.</div><h3>Journey, including interruptions</h3><p>Open → choose a task → focus → pause if needed → resume or end → reflect / personalize → return later. Pauses and early endings should remain understandable.</p>`],
    research: ['What informs the direction.', `<p>We distinguish the founder’s development feedback, hypotheses from behavioral research, and Eumo’s own future validation.</p><div class="note">External papers could not be retrieved in this environment. The reading list below is awaiting verification; no research percentages or claims of proven effectiveness are used in this presentation.</div><h3>Four questions</h3><ul><li>Which sound environments help which people and tasks?</li><li>When does shared presence support follow-through?</li><li>Can collection encourage return without becoming the goal?</li><li>Does a familiar character add value beyond a timer?</li></ul><div id="sourceList"></div><h3>Course material coverage</h3><p>Reviewed 11 DOCX files and 9 PPTX decks (162 slides), including examples, templates, personas, journeys, lifecycle, PM documentation, AI use cases and specifications.</p><p><em>Healthcare Use Cases – Short.pptx</em> could not be transferred because it exceeds the 32 MiB limit. It is not counted as reviewed.</p><p><a href="../docs/presentation-course-docx.md" target="_blank" rel="noopener">DOCX reading notes</a> · <a href="../docs/presentation-course-pptx.md" target="_blank" rel="noopener">PPTX reading notes</a> · <a href="../docs/presentation-product-audit.md" target="_blank" rel="noopener">Current feature audit</a></p><h3>Visual references</h3><p>The requested lilguy.net reference, Apple and an indie game page were blocked by the network proxy. Their interaction designs have not been described as inspected. This website uses Eumo’s own palette, artwork and actual UI.</p>`],
    sound: ['An atmosphere you can choose.', `<p><strong>Inspiration:</strong> people already create study environments with music, ambient sound or silence.</p><p><strong>Design:</strong> optional soft music, groove and white noise, with volume and playback control. No automatic audio when entering this presentation.</p><p><strong>Research question:</strong> how do music, lyrics, noise level, individual preference and task type change the experience?</p><div class="note">Background sound does not help everyone. Evidence in one task or population cannot establish better studying for every Eumo user.</div><h3>Reading to verify</h3><p>Kämpfe, Sedlmeier & Renkewitz (2011), <em>The impact of background music on adult listeners: A meta-analysis.</em></p><p>Lesiuk (2005), <em>The effect of music on work performance.</em></p><p class="small-label">Full-source reading is pending network access. No effect size is claimed here.</p><h3>Test in Eumo</h3><p>Let participants choose sound or silence; collect comfort, distraction and task-progress feedback. Sound preference is not a learning outcome.</p>`],
    peers: ['A sense of doing it together.', `<p><strong>Inspiration:</strong> shared study rooms on Discord or Zoom, a library desk, and a friend who knows you have started.</p><p><strong>Current design:</strong> optional friend presence, shared study/work time, and visits to a saved home.</p><p><strong>Research question:</strong> does low-pressure visibility make it easier to begin and return?</p><div class="note">Goal monitoring, social presence, remote co-study and “body doubling” are distinct. None proves that an online status means someone is attentive. Eumo makes no clinical or ADHD-treatment claim.</div><h3>Reading to verify</h3><p>Harkin et al. (2016), <em>Does monitoring goal progress promote goal attainment? A meta-analysis of the experimental evidence.</em></p><p>Bond & Titus (1983), <em>Social facilitation: A meta-analysis of 241 studies.</em></p><h3>Tradeoff to test</h3><p>Support versus comparison pressure. People should be able to use Eumo alone without losing the core experience.</p>`],
    rewards: ['Encouragement with room for choice.', `<p><strong>Design intent:</strong> make effort visible through discoveries, personal outfits and a home. Let people pause and return.</p><p><strong>Research question:</strong> do these rewards support a person’s own goal, or displace it?</p><div class="note">“Rewards are always better than punishment” is not a defensible research conclusion. Effects depend on reward type, timing, task and whether it feels controlling.</div><h3>Reading to verify</h3><p>Deci, Koestner & Ryan (1999), <em>A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation.</em></p><p>Cerasoli, Nicklin & Ford (2014), <em>Intrinsic motivation and extrinsic incentives jointly predict performance: A 40-year meta-analysis.</em></p><h3>Eumo’s next question</h3><p>Do people return for the task and companionship when a new outfit is not immediately available? Compare task progress, distraction and motivation—not just session length.</p>`],
    companion: ['A character first. AI, by choice.', `<p><strong>Inspiration:</strong> the continuity of a virtual pet and the comfort of a familiar presence. Eumo digs while you focus and rests with you.</p><p><strong>Current design:</strong> the character works without AI. Optional chat can support planning, questions and casual conversation; it uses an online provider.</p><div class="note">Demand for companionship, chatbot usage, reduced loneliness and willingness to pay are different questions. This project has not measured them in its target audience.</div><h3>Reading to verify</h3><p>Ta et al. (2020), <em>User Experiences of Social Support From Companion Chatbots in Everyday Contexts: Thematic Analysis.</em></p><p>Additional AI-companion research needs review for age group, duration and limitations before numerical claims are added.</p><h3>Test the added value</h3><p>Compare the companion experience with and without optional chat. Track usefulness, dependency concerns, interruptions and whether the real task advances.</p>`],
    competitors: ['A landscape, not a leaderboard.', `<p>The main comparison describes product categories and positioning. Current product pages and feature details await verification; it is not a scored efficacy comparison.</p><table><thead><tr><th>Reference</th><th>Lens for Eumo</th></tr></thead><tbody><tr><td>Pomodoro</td><td>Time structure. The method itself is not inherently punitive.</td></tr><tr><td><a href="https://www.forestapp.cc/" target="_blank" rel="noopener">Forest</a></td><td>Visible growth and accumulated focus.</td></tr><tr><td><a href="https://www.focusmate.com/" target="_blank" rel="noopener">Focusmate</a></td><td>Shared work and accountability.</td></tr><tr><td><a href="https://finchcare.com/" target="_blank" rel="noopener">Finch</a></td><td>A personal character and gentle routines.</td></tr><tr><td>Spirit City: Lofi Sessions</td><td>Desktop atmosphere and customization.</td></tr><tr><td>Tamagotchi</td><td>A small persistent character, including physical form.</td></tr></tbody></table><h3>Eumo’s intended place</h3><p>Desktop-friendly, flexible focus with a mole that builds a persistent underground world. The hypothesis is that quiet company plus personal expression can help people return.</p><p>No claim is made that this combination is unique, superior, clinically effective or already commercially validated.</p>`],
    'iteration-rewards': ['Appeal creates a second problem.', `<p>Reported feedback: users like rewards and want outfits. That supports investigating collection appeal, not claiming improved studying.</p><p>Implemented responses include material-exclusive outfits, clearer Shop / Owned views, refined artwork and a furniture collection.</p><h3>The risk</h3><p>Learning may become a route to cosmetics—or the timer may run while no work happens.</p><h3>Next test</h3><p>Ask what people intended to do and what they actually progressed on. Observe collection browsing during a focus task. Test reward timing without making breaks feel like failure.</p>`],
    'iteration-desktop': ['Keep the phone available.', `<p>Reported feedback: some users prefer keeping Eumo on a computer because leaving a phone open occupies it and raises battery concerns. Mobile still matters to some users.</p><p>The product now has web, Windows and macOS versions, plus a small floating companion where supported.</p><div class="note">This is a reported device preference. No comparative CPU, energy or battery-life benchmark has been completed.</div><h3>Next test</h3><p>Observe a real desk task and measure resource usage separately. Confirm that the floating companion remains helpful without covering important work.</p>`],
    'iteration-ui': ['Let people act directly.', `<p>Feedback described too much text and too many steps. Development simplified labels, separated Shop / Owned and added direct interaction.</p><ul><li>Drag owned furniture into a room.</li><li>Move it again, or drag it outside the frame to put it away.</li><li>Click a destination to walk; the mole takes the passages and ladder.</li><li>Explore a friend’s saved home with your own mole.</li></ul><h3>Next usability tasks</h3><p>Place a lamp, correct its position, put it away, equip an owned hat, and visit a home without guidance. Record errors, recovery and points of confusion.</p><p class="small-label">The supplied user-test document describes a future study. It is not evidence that all these tasks have passed a completed study.</p>`],
    'reward-rules': ['What the current build actually does.', `<p><strong>Active Study / Work time</strong> earns depth, stars and material-find opportunities. Paused time and Break do not earn those rewards.</p><p><strong>Ending a session</strong> saves recorded progress and earnings. Ending before the planned duration also retains already-earned rewards.</p><div class="note">The current implementation is not a completion-only reward gate. Completing a timer would not prove attention, self-discipline or learning anyway.</div><h3>Known limitations</h3><p>The timer can run while a user is away. A clearly labeled 15-second developer demo can grant a small repeatable reward and is excluded from formal reports; it must not be counted as real study.</p><h3>Proposed safeguards to evaluate</h3><ul><li>A chosen task and an optional progress reflection.</li><li>Reward-timing experiments that preserve flexible breaks.</li><li>Track distraction and reward chasing as negative outcomes.</li><li>Separate demo activity from production economy in future validation.</li></ul><p><a href="../docs/presentation-product-audit.md" target="_blank" rel="noopener">Code-audited behavior and limitations ↗</a></p>`],
    nfc: ['Tap → open the link.', `<p>The founder confirms that the physical keychain has working NFC functionality: a compatible phone reads the tag and opens its programmed URL.</p><p>The six color buttons show product colorways. They do not change an NFC tag, show inventory, or represent a purchase flow.</p><div class="note">No account pairing, progress synchronization or in-game unlock is implied. The exact URL stored on each physical tag has not been inspected.</div><p>Product imagery here is a visualization based on the supplied photographs. It is separate from the real working NFC capability reported by the founder.</p>`],
    handheld: ['Working prototype. Focused scope.', `<p>The founder confirms that the handheld is a working electronic prototype with two current functions: <strong>digging and timekeeping</strong>.</p><p>The canelé-shaped enclosure is visualized from the supplied design reference. Its screen is left blank here so the rendering does not invent a device interface or additional features.</p><div class="note">Full app parity, wireless pairing, cloud sync, manufacturing readiness, battery life and pricing have not been established.</div><h3>Next learning milestone</h3><p>Use the real device for a short focus task. Validate controls, legibility, charging, comfort and the reason to carry it alongside a phone or laptop.</p>`],
    platforms: ['Same little world. Different formats.', `<p><strong>Web / Windows / macOS:</strong> shared gameplay and artwork. Desktop provides a native floating companion. Supported web browsers can provide a browser-controlled picture-in-picture window.</p><p><strong>Updates:</strong> current Windows clients support in-app update download and restart. Mac currently opens the matching installer; automatic replacement is a separate signing requirement.</p><p><strong>Progress:</strong> saves are device-local. Export / import moves progress; automatic cross-device sync is not implemented.</p><p><strong>Optional online features:</strong> AI chat, transcription and friends need their configured services. Friend visits are locally controlled views of saved homes, not live multiplayer.</p>`],
    business: ['Test paid value, not assumed revenue.', `<h3>Beachhead</h3><p>Begin with young-adult students and independent desk workers who want gentle structure and already use a computer for their task. This is an initial segment hypothesis, not a measured market size.</p><h3>Acquisition hypotheses</h3><p>Campus and study communities, creator demonstrations, and small indie-game / productivity communities. Test qualified trial and repeat use rather than judging demand from likes alone.</p><h3>Revenue hypotheses</h3><ul><li>A useful free focus core.</li><li>Optional subscription benefits and cosmetic skins / worlds.</li><li>Physical keychains and a handheld if demand and unit economics justify them.</li></ul><h3>Costs and decision criteria</h3><p>Art/content production, support, hosting and optional AI inference; physical bill of materials, assembly, packaging and fulfillment. No price or gross margin is claimed yet.</p><h3>Next experiments</h3><p>Value interviews → a clear concept offer → price sensitivity / willingness-to-pay test → a small opt-in pilot. Separate subscriptions, one-off cosmetics and hardware interest.</p><div class="note">No paid conversion, revenue, market-share or TAM figure has been established. Do not infer willingness to pay from enthusiasm for free outfits.</div>`],
    roadmap: ['Ship less uncertainty.', `<table><thead><tr><th>Stage</th><th>Question</th><th>Decision evidence</th></tr></thead><tbody><tr><td>Now</td><td>Does the current product behave consistently?</td><td>Code audit, current UI captures and observed usability tasks.</td></tr><tr><td>Next</td><td>Does it support real tasks?</td><td>A pilot usability study, then a short diary study with task-progress and distraction measures.</td></tr><tr><td>Through December</td><td>What deserves more development?</td><td>Repeat use, qualitative value, willingness to pay, and hardware feasibility.</td></tr></tbody></table><p>Priority: reliable starts, clear rewards, low distraction, recoverable editing and understandable friend visibility.</p><p>Defer broad hardware promises, child-focused positioning and automatic sync claims until separately scoped and tested.</p><div class="note">Targets and dates are planning assumptions. Feature completion, customer acceptance and financial viability are separate milestones.</div>`],
    demo: ['A 5½-minute route through Eumo.', `<ol><li><strong>0:00–0:45:</strong> choose a task and start; show the mole and timer.</li><li><strong>0:45–1:30:</strong> pause / resume. If time compression is needed, explicitly identify the existing 15-second developer demo.</li><li><strong>1:30–2:15:</strong> explain discoveries and the actual reward rules; show Shop / Owned.</li><li><strong>2:15–3:45:</strong> decorate, move an item, drag it out to put it away; walk and climb at home.</li><li><strong>3:45–5:00:</strong> choose music; show the floating companion and friend features if online services are available.</li><li><strong>5:00–5:30:</strong> return to this presentation and close on the next validation step.</li></ol><h3>Fallback</h3><p>If a live feature is unavailable, return to the core-loop chapter to show the current product screenshots. They use an illustrative demo save, not participant data.</p><p>Optional chat and microphone input depend on network services and permission; they are not required for the core demo.</p><button class="primary" id="resetDemoClock">Reset demo clock ↶</button>`],
    fullscreen: ['Presenting in your browser.', `<p>Use the browser’s fullscreen or presentation command if this browser does not allow the page to enter fullscreen.</p><p>Left / right arrows move between chapters. Chapter links let you jump directly to questions, the prototype showcase or the live demo. Escape closes a detail panel.</p>`]
  };
  function renderSourceList() {
    const target = $('#sourceList');
    if (!target) return;
    if (!evidence) {target.innerHTML = '<p class="small-label">The reading list is available in the accompanying <a href="../docs/presentation-evidence.md" target="_blank" rel="noopener">evidence ledger</a>. Direct source verification is pending.</p>';return;}
    target.innerHTML = '<h3>Reading list · verification pending</h3>' + evidence.sources.map(source => `<div class="source">${escape(source.citation)}<small>${escape(source.scope || '')}</small><a href="${escape(source.url)}" target="_blank" rel="noopener">Open source ↗</a><small>Candidate reference · not yet read in this environment</small></div>`).join('');
  }
  function openDetail(key) {
    const item = notes[key] || notes.research;
    detailKey = key;
    $('#detailTitle').textContent = item[0];
    $('#detailBody').innerHTML = item[1];
    if (key === 'research') renderSourceList();
    if (!details.open) details.showModal();
    details.scrollTop = 0;
    $('#resetDemoClock')?.addEventListener('click', () => {demoStart = null;demoElapsed = 0;drawDemoTime();$('#startDemoClock').textContent = 'Start demo clock ◷';});
  }
  document.addEventListener('click', event => {const button = event.target.closest('[data-detail]');if (button) openDetail(button.dataset.detail);});
  $('#sourcesButton').addEventListener('click', () => openDetail('research'));
  fetch('evidence.json').then(response => {if (!response.ok) throw new Error('Unavailable');return response.json();}).then(data => {evidence = data;if (details.open && detailKey === 'research') renderSourceList();}).catch(() => {});
  hashNavigate();updateChapter();
})();
