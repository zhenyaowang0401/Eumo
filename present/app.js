'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const story = $('#story');
  const chapters = $$('.chapter');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const contents = $('#contentsDialog');
  const details = $('#detailDialog');
  const aliases = {hello:'overview',why:'inspiration',people:'persona',loop:'demo',iterations:'testing',validation:'testing',beyond:'extensions',next:'roadmap'};
  let current = 0;
  let settlingTarget = null;
  let settleTimer = 0;
  let ready = false;
  const stageChange = (stage, fn) => window.EumoMotion ? EumoMotion.stageChange(stage, fn) : fn();
  const pixelSwap = (stage, fn) => window.EumoMotion ? EumoMotion.pixelSwap(stage, fn) : fn();

  function paintNavigation(index, writeHash = true) {
    current = index;
    if (chapters[index].id === 'cover') chapters[index].classList.add('is-introduced');
    $('#chapterNumber').textContent = String(index + 1).padStart(2, '0');
    $('#chapterTotal').textContent = String(chapters.length).padStart(2, '0');
    $('#chapterLabel').textContent = chapters[index].dataset.title;
    $('#progressFill').style.width = `${(index + 1) / chapters.length * 100}%`;
    $('#prevChapter').disabled = index === 0;
    $('#nextChapter').disabled = index === chapters.length - 1;
    $$('#chapterLinks button').forEach((button, i) => button.setAttribute('aria-current', String(i === index)));
    if (writeHash && location.hash !== '#' + chapters[index].id) history.replaceState(null, '', '#' + chapters[index].id);
  }
  function chapterAtScroll() {
    const top = story.getBoundingClientRect().top;
    // Keep a tall mobile chapter active until the next chapter reaches the top.
    let index = 0;
    chapters.forEach((chapter, i) => { if (chapter.getBoundingClientRect().top <= top + 8) index = i; });
    return index;
  }
  function goTo(index, instant = false) {
    index = Math.max(0, Math.min(chapters.length - 1, index));
    // Distant chapter jumps should not scroll through the whole presentation.
    // Native long-distance scrolling can outlast the adjacent-slide settle time.
    const immediate = instant || reduced.matches || Math.abs(index - current) > 1;
    settlingTarget = index;
    paintNavigation(index);
    const top = chapters[index].getBoundingClientRect().top - story.getBoundingClientRect().top + story.scrollTop;
    story.scrollTo({top, behavior: immediate ? 'instant' : 'smooth'});
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {settlingTarget = null;paintNavigation(chapterAtScroll());}, immediate ? 40 : 850);
  }
  let scrollPending = false;
  story.addEventListener('scroll', () => {
    if (!ready || scrollPending || settlingTarget !== null) return;
    scrollPending = true;
    requestAnimationFrame(() => {paintNavigation(chapterAtScroll());scrollPending = false;});
  }, {passive:true});
  for (const event of ['wheel','touchstart']) story.addEventListener(event, () => {settlingTarget = null;clearTimeout(settleTimer);}, {passive:true});
  $('#prevChapter').addEventListener('click', () => goTo(current - 1));
  $('#nextChapter').addEventListener('click', () => goTo(current + 1));
  chapters.forEach((chapter, index) => {
    const button = document.createElement('button');
    const n = document.createElement('span');n.textContent = String(index + 1).padStart(2,'0');
    const t = document.createTextNode(chapter.dataset.title);
    const time = document.createElement('small');time.textContent = chapter.dataset.time;
    button.append(n,t,time);
    button.addEventListener('click', () => {contents.close();goTo(index);});
    $('#chapterLinks').append(button);
  });
  $('#contentsButton').addEventListener('click', () => contents.showModal());
  $('#closeContents').addEventListener('click', () => contents.close());
  $('#closeDetail').addEventListener('click', () => details.close());
  for (const dialog of [contents,details]) dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  $$('[data-detail]').forEach(button => button.addEventListener('click', () => openDetail(button.dataset.detail)));
  function openDetail(key) {
    const note = window.EumoNotes && EumoNotes[key];
    $('#detailTitle').textContent = note ? note.title : 'Details unavailable';
    $('#detailBody').innerHTML = note ? note.html : '<p>Please reload to read the supporting notes.</p>';
    details.showModal();details.scrollTop = 0;
  }
  $('#fullscreenButton').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else openDetail('fullscreen');
    } catch {openDetail('fullscreen');}
  });
  document.addEventListener('fullscreenchange', () => $('#fullscreenButton').setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen'));
  document.addEventListener('keydown', event => {
    if (contents.open || details.open || event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input,textarea,select,[role="tablist"]')) return;
    if (['ArrowRight','PageDown'].includes(event.key)) {event.preventDefault();goTo(current + 1);}
    if (['ArrowLeft','PageUp'].includes(event.key)) {event.preventDefault();goTo(current - 1);}
    if (event.key === 'Home') {event.preventDefault();goTo(0);}
    if (event.key === 'End') {event.preventDefault();goTo(chapters.length - 1);}
  });
  function hashNavigate() {
    const raw = location.hash.slice(1);
    const id = aliases[raw] || raw;
    const index = chapters.findIndex(chapter => chapter.id === id);
    if (index >= 0) goTo(index, true);
    else if (raw !== 'story') goTo(0, true);
  }
  window.addEventListener('hashchange', hashNavigate);
  let resizeTimer;
  window.addEventListener('resize', () => {clearTimeout(resizeTimer);resizeTimer = setTimeout(() => goTo(current,true),120);});
  document.fonts.ready.then(() => {
    ready = true;hashNavigate();
    if (chapters[current].id === 'overview' && window.EumoMotion) EumoMotion.enterOverview($('#overview'));
  });

  function tabs(selector, panel, select) {
    const buttons = $$(selector);
    function activate(button) {
      buttons.forEach(tab => {const selected = tab === button;tab.setAttribute('aria-selected',String(selected));tab.tabIndex = selected ? 0 : -1;});
      $(panel).setAttribute('aria-labelledby',button.id);
      select(button);
    }
    buttons.forEach(button => {
      button.addEventListener('click', () => activate(button));
      button.addEventListener('keydown', event => {
        const vertical = button.closest('[role="tablist"]').getAttribute('aria-orientation') === 'vertical';
        const keys = vertical ? ['ArrowUp','ArrowDown'] : ['ArrowLeft','ArrowRight'];
        if (![...keys,'Home','End'].includes(event.key)) return;
        event.preventDefault();event.stopPropagation();
        const i = buttons.indexOf(button);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (i + (event.key === keys[1] ? 1 : -1) + buttons.length) % buttons.length;
        activate(buttons[next]);buttons[next].focus();
      });
    });
  }
  const research = {
    presence: {
      headline:'A review of <strong>138 randomized studies</strong> found that tracking progress <strong>helped people achieve their goals.</strong>',
      finding:'The review included 19,951 participants. Benefits were greater when progress was reported or made public.',
      application:'Eumo: optional friend visibility and shared study time.',
      source:'Harkin et al. · 2016 · Psychological Bulletin', url:'https://doi.org/10.1037/bul0000025'
    },
    learning: {
      headline:'In a <strong>194-student physics trial</strong>, a structured AI tutor produced <strong>more than twice the median learning gains</strong> of active classroom learning.',
      finding:'University students completed two physics lessons with a purpose-built AI tutor or in an active-learning class.',
      application:'Eumo: explore task-focused AI support alongside the timer.',
      source:'Kestin et al. · 2025 · Scientific Reports', url:'https://www.nature.com/articles/s41598-025-97652-6'
    },
    companion: {
      headline:'An analysis of <strong>1,854 reviews</strong> and responses from <strong>66 Replika users</strong> identified <strong>companionship and emotional support.</strong>',
      finding:'Users described their experiences with a companion chatbot in app reviews and open-ended responses.',
      application:'Eumo: optional conversation during independent study.',
      source:'Ta et al. · 2020 · JMIR', url:'https://www.jmir.org/2020/3/e16235/'
    },
    motivation: {
      headline:'Across <strong>16 studies involving 2,246 learners</strong>, gamified learning had a <strong>small positive effect on motivation.</strong>',
      finding:'Results varied by context and study quality. The studies examined combinations of game elements, including rewards.',
      application:'Eumo: earned cosmetics make progress visible.',
      source:'Sailer & Homner · 2020 · Educational Psychology Review', url:'https://link.springer.com/article/10.1007/s10648-019-09498-w'
    }
  };
  tabs('[data-research]','#researchPanel', button => stageChange($('#researchPanel'), () => {
    const item = research[button.dataset.research];
    // Headline markup is static presentation copy; no external or user HTML is used.
    $('#researchHeadline').innerHTML=item.headline;
    $('#researchFinding').textContent=item.finding;
    $('#researchApplication').textContent=item.application;
    $('#researchSource').textContent=item.source+' ↗';
    $('#researchSource').href=item.url;
  }));
  const demo = {
    setup:['setup','Name & color','0:00–0:30','SETUP'],
    focus:['focus','Start / pause','0:30–1:25','FOCUS'],
    discover:['wardrobe','Redeem & equip','1:25–2:15','WARDROBE'],
    home:['home','Walk & decorate','2:15–3:35','HOME'],
    friends:['home','Presence & visits','3:35–4:20','HOME PREVIEW'],
    music:['music','Sound & floating','4:20–5:05','MUSIC'],
    review:['focus','Reports & AI','5:05–5:40','FOCUS PREVIEW']
  };
  tabs('[data-demo]','#demoPanel', button => stageChange($('.demo-frame'), () => {
    const [shot,cue,time,label] = demo[button.dataset.demo];
    $('#demoShot').src=`assets/screenshots/${shot}.png`;$('#demoShot').alt=`Eumo ${shot} screen`;
    $('#demoScreenLabel').textContent='EUMO / '+label;$('#demoCue').textContent=cue;$('#demoStepTime').textContent=time;
  }));
  const feedback = {
    outfits:['assets/screenshots/wardrobe.png','WARDROBE','Discoveries can be exchanged for apparel.'],
    desktop:['assets/screenshots/focus.png','FOCUS','The same focus workflow is available on web and desktop.'],
    social:['../docs/images/eumo-friends-live.png','FRIENDS / DEVELOPMENT CAPTURE','Earlier development UI · sample profiles, not live users.'],
    friction:['assets/screenshots/home.png','HOME','Shorter labels, Shop / Owned and direct furniture placement.']
  };
  tabs('[data-feedback]','#feedbackPanel', button => stageChange($('#feedbackPanel'), () => {
    const [shot,label,caption] = feedback[button.dataset.feedback];
    $('#feedbackShot').src=shot;$('#feedbackShot').alt=`Eumo ${label.toLowerCase()} interface; illustrative development context`;
    $('#feedbackLabel').textContent='EUMO / '+label;$('#feedbackCaption').textContent=caption;
  }));
  const colors=['Sunflower','Mint','Lavender','Charcoal','Blue & Orange','Orange'];
  let color = 5;
  let family = 'keychain';
  function drawProduct() {
    const keychain = family === 'keychain';
    $('#keychainSprite').hidden = !keychain;$('#handheldRender').hidden=keychain;
    $('#keychainSprite').classList.toggle('extra',color>=4);
    $('#keychainSprite').dataset.variant=String(color);
    $('#keychainSprite').style.backgroundPosition=color<4 ? `${color%2*100}% ${Math.floor(color/2)*100}%` : `${(color-4)*100}% 50%`;
    $('#keychainSprite').setAttribute('aria-label',`${colors[color]} Eumo keychain visualization`);
  }
  $$('[data-color]').forEach(button => button.addEventListener('click', () => {
    color=Number(button.dataset.color);$('#colorName').textContent=colors[color];
    $$('[data-color]').forEach(tab=>tab.setAttribute('aria-pressed',String(Number(tab.dataset.color)===color)));
    pixelSwap($('#renderStage'),drawProduct);
  }));
  tabs('[data-family]','#familyPanel', button => {
    family=button.dataset.family;const keychain=family==='keychain';
    $('#familyStatus').textContent=keychain ? 'WORKING NFC PROTOTYPE' : 'WORKING ELECTRONIC PROTOTYPE';
    $('#familyTitle').textContent=keychain ? 'Tap to open a link.' : 'Timer + digging.';
    $('#familyDescription').textContent=keychain ? 'A physical entry point to Eumo.' : 'A compact, standalone companion.';
    $('#renderCaption').textContent=keychain ? 'Colorway visualization' : 'Enclosure visualization';
    $('#colorPicker').hidden=!keychain;$('#handheldFunctions').hidden=keychain;
    pixelSwap($('#renderStage'),drawProduct);
  });
  // Preload both sprite sheets before a user chooses a color.
  for(const src of ['assets/keychains.png','assets/keychains-extra.png','assets/handheld.png']) {const img=new Image();img.src=src;}

  let accumulated=0, started=0, ticker=null;
  function renderClock() {
    const seconds=Math.floor((accumulated+(ticker ? performance.now()-started : 0))/1000);
    $('#demoTimer').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  }
  $('#startDemoClock').addEventListener('click', () => {
    if(ticker) {accumulated+=performance.now()-started;clearInterval(ticker);ticker=null;}
    else {started=performance.now();ticker=setInterval(renderClock,250);}
    $('#startDemoClock').textContent=ticker ? 'Pause clock' : accumulated ? 'Resume clock' : 'Start clock';
    $('#startDemoClock').setAttribute('aria-pressed',String(!!ticker));renderClock();
  });
  $('#resetDemoClock').addEventListener('click', () => {clearInterval(ticker);ticker=null;accumulated=0;started=0;$('#startDemoClock').textContent='Start clock';$('#startDemoClock').setAttribute('aria-pressed','false');renderClock();});
  window.addEventListener('pagehide', () => {if(ticker){accumulated+=performance.now()-started;clearInterval(ticker);ticker=null;$('#startDemoClock').textContent='Resume clock';$('#startDemoClock').setAttribute('aria-pressed','false');}});
})();
