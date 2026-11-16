import json,os,shutil,subprocess,time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
root=Path(__file__).resolve().parents[1]; output=root.parent/'scratch/presentation-qa'; output.mkdir(parents=True,exist_ok=True)
proc=subprocess.Popen(['node','scripts/dev_server.cjs'],cwd=root,env={**os.environ,'PORT':'0'},stdout=subprocess.PIPE,text=True)
base=proc.stdout.readline().strip().split('Eumo: ')[1]; url=base+'/present/index.html'
report={'viewport_checks':[],'checks':[],'errors':[],'bad_responses':[],'links':[]}
def check(name,func):
 try: func(); report['checks'].append({'name':name,'pass':True})
 except Exception as e:report['checks'].append({'name':name,'pass':False,'error':str(e)[:1000]})
def need(value,message='assertion failed'):
 assert value,message
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
  context=browser.new_context(viewport={'width':1440,'height':900},reduced_motion='reduce')
  context.add_init_script("localStorage.setItem('eumo-presentation-qa-sentinel','unchanged');")
  page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.on('response',lambda r:report['bad_responses'].append({'status':r.status,'url':r.url}) if r.status>=400 and r.url.startswith(base) else None)
  page.goto(url);page.evaluate('document.fonts.ready');page.wait_for_timeout(100)
  ids=page.locator('.chapter').evaluate_all('els=>els.map(e=>e.id)')
  report['chapters']=ids
  def goto(id):
   page.evaluate('(id)=>document.getElementById(id).scrollIntoView({behavior:"instant",block:"start"})',id);page.wait_for_timeout(80)
  for w,h in [(1440,900),(1366,768),(1280,720),(390,844),(320,568)]:
   page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100)
   for id in ids:
    goto(id)
    data=page.evaluate('''(id)=>{const chapter=document.getElementById(id), s=document.querySelector('#story'), cr=chapter.getBoundingClientRect();
     const visible=e=>{const st=getComputedStyle(e);return st.visibility!=="hidden"&&st.display!=="none"&&e.getClientRects().length&&e.offsetWidth>0};
     const out=[...chapter.querySelectorAll('h1,h2,h3,p,button,a,span,img')].filter(visible).filter(e=>{const r=e.getBoundingClientRect();return r.left< -2||r.right>innerWidth+2}).map(e=>({tag:e.tagName,id:e.id,cl:e.className,text:e.textContent.slice(0,60),left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}));
     const clipped=[...chapter.querySelectorAll('h1,h2,h3,p,button,a')].filter(visible).filter(e=>e.getBoundingClientRect().bottom>cr.bottom+2).map(e=>({tag:e.tagName,text:e.textContent.slice(0,80)}));
     return {id,width:innerWidth,height:innerHeight,documentOverflow:document.documentElement.scrollWidth>innerWidth,storyOverflow:s.scrollWidth>s.clientWidth,chapterHeight:cr.height,storyHeight:s.clientHeight,horizontal:out,clippedBottom:clipped,footerBottom:document.querySelector('footer').getBoundingClientRect().bottom};}''',id)
    report['viewport_checks'].append(data)
    check(f'Viewport {w}x{h} / {id}',lambda data=data:(need(not data['horizontal'],str(data['horizontal'])),need(not data['clippedBottom'],str(data['clippedBottom'])),need(not data['documentOverflow']),need(not data['storyOverflow']),need(data['footerBottom']<=h+1)))
    if w>=1280 and id!='hello':check(f'Desktop chapter fits {w}x{h} / {id}',lambda data=data:need(data['chapterHeight']<=data['storyHeight']+2,str(data)))
    if id in ['hello','beyond','loop'] or data['horizontal'] or data['clippedBottom']:page.screenshot(path=str(output/f'{w}x{h}-{id}.png'))
  for w,h in [(390,844),(320,568)]:
   page.set_viewport_size({'width':w,'height':h});goto('hello')
   overlap=page.evaluate('''()=>{const a=document.querySelector('.hero-mole').getBoundingClientRect();return ['.hero .primary','.hero-bottom p'].filter(s=>{const b=document.querySelector(s).getBoundingClientRect();return Math.max(a.left,b.left)<Math.min(a.right,b.right)&&Math.max(a.top,b.top)<Math.min(a.bottom,b.bottom)})}''')
   check(f'Hero controls clear {w}',lambda overlap=overlap:need(not overlap,str(overlap)))
  page.set_viewport_size({'width':1440,'height':900});goto('beyond')
  colors=['Sunflower','Mint','Lavender','Charcoal','Blue & orange','Tangerine'];positions=[]
  for i,name in enumerate(colors):
   page.locator(f'[data-color="{i}"]').click()
   check('color '+name,lambda name=name,i=i:(need(page.locator('#colorName').inner_text()==name),need(page.locator('[data-color][aria-pressed="true"]').count()==1),need(page.locator(f'[data-color="{i}"]').get_attribute('aria-pressed')=='true'),need(name in page.locator('#keychainSprite').get_attribute('aria-label'))))
   positions.append(page.locator('#keychainSprite').evaluate('e=>[getComputedStyle(e).backgroundImage,getComputedStyle(e).backgroundPosition]'))
  check('Six unique image selections',lambda:need(len(set(map(str,positions)))==6));report['color_positions']=positions
  for key,target in [('handheld','#handheldRender'),('app','#familyAppImage'),('keychain','#keychainSprite')]:
   page.locator(f'[data-family="{key}"]').click()
   check('Family '+key,lambda key=key,target=target:(need(page.locator(target).is_visible()),need(page.locator('[data-family][aria-selected="true"]').count()==1),need(page.locator('#familyPanel').get_attribute('aria-labelledby')=='family-'+key)))
   page.locator('#familyMore').click();check('Family '+key+' details',lambda:need(page.locator('#detailDialog').is_visible()));page.keyboard.press('Escape')
  page.locator('#family-keychain').focus();page.keyboard.press('ArrowRight');check('Family keyboard next',lambda:need(page.locator('#family-handheld').get_attribute('aria-selected')=='true'))
  page.keyboard.press('End');check('Family keyboard End',lambda:need(page.locator('#family-app').get_attribute('aria-selected')=='true'))
  page.keyboard.press('Home');check('Family keyboard Home',lambda:need(page.locator('#family-keychain').get_attribute('aria-selected')=='true'))
  page.keyboard.press('ArrowLeft');check('Family keyboard wrap',lambda:need(page.locator('#family-app').get_attribute('aria-selected')=='true'))
  goto('loop')
  for key in ['focus','discover','dress','home']:
   page.locator(f'[data-product="{key}"]').click();check('Product '+key,lambda key=key:(need(page.locator('#productPanel').get_attribute('aria-labelledby')=='tab-'+key),need(page.locator('#productShot').evaluate('e=>e.complete&&e.naturalWidth>0')),need(page.locator('[data-product][aria-selected="true"]').count()==1)))
  page.locator('#tab-home').focus();page.keyboard.press('ArrowRight');check('Product keyboard wrap',lambda:need(page.locator('#tab-focus').get_attribute('aria-selected')=='true'))
  page.keyboard.press('End');check('Product keyboard End',lambda:need(page.locator('#tab-home').get_attribute('aria-selected')=='true'))
  page.keyboard.press('Home');check('Product keyboard Home',lambda:need(page.locator('#tab-focus').get_attribute('aria-selected')=='true'))
  goto('hello');page.locator('#story').focus()
  page.keyboard.press('ArrowRight');page.wait_for_timeout(100);check('Chapter ArrowRight',lambda:need(page.locator('#chapterNumber').inner_text()=='02'))
  page.keyboard.press('PageDown');page.wait_for_timeout(100);check('Chapter PageDown',lambda:need(page.locator('#chapterNumber').inner_text()=='03'))
  page.keyboard.press('ArrowLeft');page.wait_for_timeout(100);check('Chapter ArrowLeft',lambda:need(page.locator('#chapterNumber').inner_text()=='02'))
  page.keyboard.press('Home');page.wait_for_timeout(100);check('Chapter Home',lambda:need(page.locator('#chapterNumber').inner_text()=='01'))
  page.keyboard.press('End');page.wait_for_timeout(100);check('Chapter End',lambda:need(page.locator('#chapterNumber').inner_text()==str(len(ids))))
  check('End disabled',lambda:need(page.locator('#nextChapter').is_disabled()))
  page.locator('#contentsButton').click();check('Contents visible/focus',lambda:(need(page.locator('#contentsDialog').is_visible()),need(page.evaluate('document.activeElement.id')=='closeContents')))
  page.keyboard.press('Shift+Tab');check('Contents focus trap',lambda:need(page.evaluate('document.activeElement===document.body||document.activeElement.closest("#contentsDialog")!==null')))
  page.keyboard.press('Escape');check('Escape restores contents trigger',lambda:(need(not page.locator('#contentsDialog').is_visible()),need(page.evaluate('document.activeElement.id')=='contentsButton')))
  page.locator('#contentsButton').click();page.locator('#chapterLinks button').nth(8).click();page.wait_for_timeout(100);check('Contents jump family',lambda:need(page.locator('#chapterNumber').inner_text()=='09'))
  page.locator('#sourcesButton').click();check('Detail visible/focus',lambda:(need(page.locator('#detailDialog').is_visible()),need(page.evaluate('document.activeElement.id')=='closeDetail')))
  page.keyboard.press('Shift+Tab');check('Detail focus trap',lambda:need(page.evaluate('document.activeElement.closest("#detailDialog")!==null')))
  page.keyboard.press('Escape');check('Escape restores details trigger',lambda:(need(not page.locator('#detailDialog').is_visible()),need(page.evaluate('document.activeElement.id')=='sourcesButton')))
  # All notes buttons must open content; reset clock is handled below.
  detailkeys=page.locator('[data-detail]').evaluate_all('els=>[...new Set(els.map(e=>e.dataset.detail))]')
  for key in detailkeys:
   el=page.locator(f'[data-detail="{key}"]').first;el.evaluate('e=>e.scrollIntoView({behavior:"instant",block:"center"})');el.click();check('Note '+key,lambda:(need(page.locator('#detailBody').inner_text().strip()!=''),need(page.locator('#detailTitle').inner_text().strip()!='')));page.keyboard.press('Escape')
  goto('demo');page.locator('#startDemoClock').click();page.wait_for_timeout(3200);check('Demo clock advances',lambda:need(page.locator('#demoTimer').inner_text().startswith(('00:02','00:03'))))
  page.locator('#startDemoClock').click();value=page.locator('#demoTimer').inner_text();page.wait_for_timeout(2100);check('Demo clock pauses',lambda:need(page.locator('#demoTimer').inner_text()==value))
  page.locator('#startDemoClock').click();page.wait_for_timeout(2300);check('Demo clock resumes',lambda:need(page.locator('#demoTimer').inner_text().startswith(('00:04','00:05'))))
  page.locator('[data-detail="demo"]').click();page.locator('#resetDemoClock').click();check('Demo clock reset',lambda:(need(page.locator('#demoTimer').inner_text().startswith('00:00')),need('Start' in page.locator('#startDemoClock').inner_text())));page.keyboard.press('Escape')
  # All static local links resolve. External URLs are inspected but network retrieval remains constrained.
  links=page.locator('a[href]').evaluate_all('els=>els.map(e=>({href:e.href,target:e.target,rel:e.rel}))')
  for link in links:
   if link['href'].startswith(base):
    response=context.request.get(link['href'].split('#')[0]);report['links'].append({**link,'status':response.status})
   else:report['links'].append(link)
  check('Local links resolve',lambda:need(all(link.get('status',200)<400 for link in report['links'])))
  goto('hello');page.locator('#petMole').click();check('Mole reacts',lambda:need(page.locator('#moleSpeech').inner_text()!='One little step?'))
  check('Reduced motion disables hop',lambda:need(page.locator('#petMole img').evaluate('e=>getComputedStyle(e).animationName')=='none'))
  check('Game save untouched',lambda:need(page.evaluate("localStorage.getItem('loop-pet-soft-universe-v1')===null && localStorage.getItem('eumo-presentation-qa-sentinel')==='unchanged'")))
  check('No JavaScript errors',lambda:need(not report['errors'],str(report['errors'])))
  check('No failed local resources',lambda:need(not report['bad_responses'],str(report['bad_responses'])))
  normal=browser.new_context(viewport={'width':1366,'height':768})
  normal_page=normal.new_page(); normal_page.goto(url+'#beyond');normal_page.evaluate('document.fonts.ready');normal_page.wait_for_timeout(150)
  check('Deep link preserved',lambda:need(normal_page.locator('#chapterNumber').inner_text()=='09'))
  normal_page.locator('#nextChapter').click();normal_page.wait_for_timeout(800)
  check('Animated chapter navigation',lambda:need(normal_page.locator('#chapterNumber').inner_text()=='10'))
  normal_page.locator('#fullscreenButton').click();normal_page.wait_for_timeout(200)
  check('Fullscreen entry',lambda:need(normal_page.evaluate('!!document.fullscreenElement')))
  normal_page.locator('#fullscreenButton').click();normal_page.wait_for_timeout(200)
  check('Fullscreen exit',lambda:need(normal_page.evaluate('!document.fullscreenElement')))
  normal.close()
  browser.close()
finally:
 proc.terminate();proc.wait();(output/'report.json').write_text(json.dumps(report,indent=2));print(json.dumps({'checks':len(report['checks']),'failed':[x for x in report['checks'] if not x['pass']],'overflow':[x for x in report['viewport_checks'] if x['horizontal'] or x['clippedBottom'] or x['documentOverflow'] or x['storyOverflow']],'errors':report['errors'],'bad_responses':report['bad_responses']},indent=2))

failures=[x for x in report['checks'] if not x['pass']]
assert not failures, failures
