"""Browser regression checks for Eumo's twelve-chapter presentation.

Runs the repository server on an ephemeral port. Writes screenshots and a JSON
report outside the app. The game save is never created or changed by this test.
"""
import json
import os
from pathlib import Path
import shutil
import subprocess
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT.parent / 'scratch' / 'presentation-v5-qa'
OUTPUT.mkdir(parents=True, exist_ok=True)
REPORT = {'checks': [], 'viewports': [], 'errors': [], 'bad_responses': []}
CHAPTERS = ['cover', 'overview', 'inspiration', 'research', 'persona', 'landscape',
            'demo', 'testing', 'roadmap', 'extensions', 'business', 'thankyou']


def need(condition, message='Assertion failed'):
    assert condition, message


def check(name, callback):
    try:
        callback()
        REPORT['checks'].append({'name': name, 'pass': True})
    except Exception as error:
        REPORT['checks'].append({'name': name, 'pass': False, 'error': str(error)[:3000]})


proc = subprocess.Popen(['node', 'scripts/dev_server.cjs'], cwd=ROOT,
                        env={**os.environ, 'PORT': '0'},
                        stdout=subprocess.PIPE, text=True)
base = proc.stdout.readline().strip().split('Eumo: ')[1]
url = base + '/present/index.html'

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=shutil.which('chromium'),
                                    args=['--no-sandbox'])
        context = browser.new_context(viewport={'width': 1440, 'height': 900},
                                      reduced_motion='reduce')
        context.add_init_script("localStorage.setItem('eumo-qa-sentinel', 'unchanged')")
        page = context.new_page()
        page.on('pageerror', lambda error: REPORT['errors'].append(str(error)))
        page.on('response', lambda r: REPORT['bad_responses'].append({'url': r.url, 'status': r.status})
                if r.status >= 400 and r.url.startswith(base) else None)
        page.goto(url)
        page.evaluate('document.fonts.ready')
        page.wait_for_timeout(150)
        check('Twelve chapters in approved order', lambda: need(
            page.locator('.chapter').evaluate_all('els => els.map(e => e.id)') == CHAPTERS))

        check('Default entry opens cover',lambda:(need(page.evaluate('location.hash')=='#cover'),need(page.locator('#chapterNumber').inner_text()=='01'),need(page.locator('#chapterTotal').inner_text()=='12')))
        check('Chapter index includes all 12 screens',lambda:need(page.locator('#chapterLinks button').count()==12))
        check('Presentation timing totals 13 minutes',lambda:need(page.locator('.chapter').evaluate_all('els=>els.reduce((sum,e)=>{const [m,s]=e.dataset.time.split(":").map(Number);return sum+m*60+s},0)')==780))
        check('Chapter dialog timing label',lambda:need('13:00' in page.locator('.dialog-note').inner_text()))
        for end in ['cover','thankyou']:
            check(end+' credits',lambda end=end:(need(page.locator('#'+end+' .bookend-credit strong').all_inner_texts()==['Zhenyao Wang','Yun Ye'])))
            check(end+' floral backdrop',lambda end=end:need(page.locator('#'+end).evaluate('e=>getComputedStyle(e,"::before").backgroundImage.includes("flower-meadow.png")')))
        check('Cover designer credit',lambda:need(page.locator('#cover .bookend-credit>span').inner_text()=='design by'))
        check('Closing heading',lambda:need(page.locator('#thankyou-title').inner_text()=='Thank you.'))
        check('All cover SVG use references resolve',lambda:need(page.locator('.cover-mark use').evaluate_all('els=>els.every(e=>document.getElementById(e.getAttribute("href").slice(1)))')))
        original=page.evaluate('''async()=>{const source=new DOMParser().parseFromString(await(await fetch('../index.html')).text(),'text/html');const a=source.querySelector('.startup-mark'),b=document.querySelector('.cover-mark');const shape=e=>e?[...e.querySelectorAll('path')].map(p=>[p.getAttribute('d'),p.getAttribute('fill')]):null;return {found:!!a,same:JSON.stringify(shape(a))===JSON.stringify(shape(b))}}''')
        check('Cover retains original app startup artwork',lambda:need(original['found'] and original['same'],str(original)))
        check('Reduced motion cover animation disabled',lambda:need(page.locator('.cover-mark').evaluate('e=>getComputedStyle(e).animationName')=='none'))
        page.wait_for_timeout(2100)
        check('Reduced motion cover persists beyond startup duration',lambda:(need(page.evaluate('location.hash')=='#cover'),need(page.locator('.cover-mark').is_visible()),need(page.locator('.cover-mark').evaluate('e=>getComputedStyle(e).opacity')=='1')))

        check('Body uses local DM Sans at weight 400', lambda: need(page.evaluate('''()=>{const s=getComputedStyle(document.body);return s.fontFamily.includes('DM Sans')&&s.fontWeight==='400'&&document.fonts.check('400 18px "DM Sans"')}''')))
        check('Section heading DM Sans at weight 650', lambda: need(page.locator('#inspiration-title').evaluate('''e=>{const s=getComputedStyle(e);return s.fontFamily.includes('DM Sans')&&s.fontWeight==='650'&&document.fonts.check('650 36px "DM Sans"')}''')))
        check('DM Sans font fetched locally', lambda:need(page.evaluate('performance.getEntriesByType("resource").some(e=>e.name.includes("/present/assets/fonts/dm-sans.ttf"))')))
        decoded = page.evaluate('''async()=>{const paths=['assets/co-study-pixels.png','assets/digital-pet-illustration.png','assets/competitor-reference-illustrations.png','../docs/images/eumo-friends-live.png','assets/persona-avatar.png'];return await Promise.all(paths.map(async src=>{const i=new Image();i.src=src;try{await i.decode();return {src,width:i.naturalWidth,height:i.naturalHeight,ok:true}}catch{return{src,ok:false}}}))}''')
        REPORT['independent_assets']=decoded
        check('All new reference images independently decode', lambda:need(all(i['ok'] for i in decoded),str(decoded)))
        check('Reference illustration status visible',lambda:need(page.locator('.reference-caption').all_inner_texts().count('Reference illustration')==2))
        check('Inspiration has both co-study and digital pet', lambda:need(page.locator('.inspiration-source').count()==2))

        def goto(chapter):
            page.evaluate('(id) => { location.hash = id; }', chapter)
            page.wait_for_timeout(120)
            # The same hash may not fire on a second visit, so explicitly align.
            page.locator('#' + chapter).evaluate('e => e.scrollIntoView({behavior:"instant",block:"start"})')
            page.wait_for_timeout(60)

        for width, height in [(1440,900), (1366,768), (1280,720), (768,1024), (390,844), (320,568)]:
            page.set_viewport_size({'width':width, 'height':height})
            page.wait_for_timeout(160)
            for chapter in CHAPTERS:
                goto(chapter)
                bounds = page.evaluate('''id => {
                  const c=document.getElementById(id), cr=c.getBoundingClientRect(), story=document.querySelector('#story');
                  const visible=e=>!!e.getClientRects().length && getComputedStyle(e).visibility!=='hidden' && e.getBoundingClientRect().width>0;
                  const data=e=>{const r=e.getBoundingClientRect();return {tag:e.tagName,id:e.id,cls:typeof e.className==='string'?e.className:'svg',text:e.textContent.trim().slice(0,70),x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
                  const els=[...c.querySelectorAll('h1,h2,h3,p,button,a,span,img,dd,dt,li,figure,svg')].filter(visible);
                  return {chapter:id,width:innerWidth,height:innerHeight,chapterHeight:cr.height,storyHeight:story.clientHeight,
                    horizontal:els.filter(e=>{const r=e.getBoundingClientRect();return r.left < -2 || r.right > innerWidth+2}).map(data),
                    bottom:els.filter(e=>e.getBoundingClientRect().bottom>cr.bottom+2).map(data),
                    documentOverflow:document.documentElement.scrollWidth>innerWidth,
                    storyOverflow:story.scrollWidth>story.clientWidth,
                    footerBottom:document.querySelector('footer').getBoundingClientRect().bottom};
                }''', chapter)
                if chapter in ['cover','thankyou']:
                    bookend=page.evaluate('''id=>{const root=document.getElementById(id),credit=root.querySelector('.bookend-credit').getBoundingClientRect(),main=root.querySelector(id==='cover'?'.cover-mark':'h2').getBoundingClientRect();return {overlap:Math.min(credit.right,main.right)>Math.max(credit.left,main.left)&&Math.min(credit.bottom,main.bottom)>Math.max(credit.top,main.top),creditBottom:credit.bottom,chapterBottom:root.getBoundingClientRect().bottom}}''',chapter)
                    check(f'Bookend credits clear {width}x{height} {chapter}',lambda data=bookend:need(not data['overlap'] and data['creditBottom']<=data['chapterBottom'],str(data)))
                REPORT['viewports'].append(bounds)
                check(f'Layout {width}x{height} {chapter}', lambda b=bounds: (
                    need(not b['horizontal'], str(b['horizontal'])),
                    need(not b['bottom'], str(b['bottom'])),
                    need(not b['documentOverflow'], 'Document horizontally overflows'),
                    need(not b['storyOverflow'], 'Story horizontally overflows'),
                    need(b['footerBottom']<=height+1, 'Footer outside viewport')))
                if width>=1000:
                    check(f'Fits desktop {width}x{height} {chapter}', lambda b=bounds: need(
                        b['chapterHeight']<=b['storyHeight']+2, str(b)))
                if width==1366 or (width==390 and chapter in ['cover','overview','extensions','demo','persona','thankyou']) or bounds['horizontal'] or bounds['bottom']:
                    page.screenshot(path=str(OUTPUT/f'{width}x{height}-{chapter}.png'))

        (OUTPUT/'initial-layout-report.json').write_text(json.dumps(REPORT,indent=2))

        page.set_viewport_size({'width':1366,'height':768})
        page.wait_for_timeout(150)
        goto('cover')
        page.locator('#story').focus()
        page.keyboard.press('ArrowRight');page.wait_for_timeout(120)
        check('Next chapter keyboard', lambda: need(page.locator('#chapterNumber').inner_text()=='02'))
        page.keyboard.press('End');page.wait_for_timeout(120)
        check('End jumps to thank you', lambda: need(page.locator('#chapterNumber').inner_text()=='12'))
        check('Final chapter disables next', lambda:need(page.locator('#nextChapter').is_disabled()))
        page.keyboard.press('Home');page.wait_for_timeout(120)
        check('Home jumps to cover', lambda: need(page.locator('#chapterNumber').inner_text()=='01'))
        check('First chapter disables previous', lambda: need(page.locator('#prevChapter').is_disabled()))
        page.locator('#nextChapter').click();page.wait_for_timeout(120)
        check('Next button', lambda: need(page.locator('#chapterNumber').inner_text()=='02'))
        page.locator('#prevChapter').click();page.wait_for_timeout(120)
        check('Previous button', lambda: need(page.locator('#chapterNumber').inner_text()=='01'))

        page.locator('#contentsButton').click()
        check('Chapter dialog focus', lambda: need(page.evaluate('document.activeElement.id')=='closeContents'))
        page.keyboard.press('Shift+Tab')
        # Native dialogs may send focus to browser chrome (activeElement=body)
        # at the tab boundary; they must still keep background controls inert.
        page.locator('#sourcesButton').evaluate('e=>e.focus()')
        check('Chapter dialog keeps background inert', lambda: need(page.evaluate('document.querySelector(":modal").id==="contentsDialog" && (document.activeElement===document.body || !!document.activeElement.closest("#contentsDialog"))')))
        page.keyboard.press('Escape')
        check('Chapter dialog restores focus', lambda: need(page.evaluate('document.activeElement.id')=='contentsButton'))
        page.locator('#contentsButton').click()
        page.locator('#chapterLinks button').nth(CHAPTERS.index('extensions')).click();page.wait_for_timeout(120)
        check('Chapter index jumps to extensions', lambda: need(page.locator('#chapterNumber').inner_text()=='10'))

        keys=page.locator('[data-detail]').evaluate_all('els=>[...new Set(els.map(e=>e.dataset.detail))]')
        for key in keys:
            button=page.locator(f'[data-detail="{key}"]').first
            button.evaluate('e=>e.scrollIntoView({behavior:"instant",block:"center"})')
            button.click()
            check('Details '+key, lambda: (
                need(page.locator('#detailDialog').is_visible()),
                need(page.locator('#detailBody').inner_text().strip()!=''),
                need(page.evaluate('document.activeElement.id')=='closeDetail')))
            page.keyboard.press('Escape')
            check('Detail focus restores '+key, lambda button=button: need(button.evaluate('e=>document.activeElement===e')))
        page.locator('#sourcesButton').click()
        check('Research notes disclose status', lambda: need('pending' in page.locator('#detailBody').inner_text().lower()))
        page.keyboard.press('Escape')

        goto('research');page.locator('#research-presence').focus();page.keyboard.press('ArrowDown')
        check('Vertical research keyboard tab', lambda: (
            need(page.locator('#research-motivation').get_attribute('aria-selected')=='true'),
            need('personalize' in page.locator('#researchResponse').inner_text()),
            need(page.locator('#researchPanel').get_attribute('aria-labelledby')=='research-motivation')))
        page.keyboard.press('End')
        check('Research End tab', lambda: need(page.locator('#research-companion').get_attribute('aria-selected')=='true'))
        page.keyboard.press('Home')
        check('Research Home tab', lambda: need(page.locator('#research-presence').get_attribute('aria-selected')=='true'))
        check('Tab keys do not navigate chapter', lambda: need(page.locator('#chapterNumber').inner_text()=='04'))

        goto('demo')
        for name in ['focus','discover','home','friends','music','review','setup']:
            page.locator(f'[data-demo="{name}"]').click()
            page.wait_for_function('document.querySelector("#demoShot").complete && document.querySelector("#demoShot").naturalWidth > 0')
            check('Walkthrough '+name,lambda name=name: (
                need(page.locator(f'[data-demo="{name}"]').get_attribute('aria-selected')=='true'),
                need(bool(page.locator('#demoCue').inner_text())),
                need(page.locator('#demoShot').evaluate('e=>e.complete&&e.naturalWidth>0'))))
        page.locator('#demo-setup').focus();page.keyboard.press('ArrowDown')
        check('Walkthrough keyboard',lambda:need(page.locator('#demo-focus').get_attribute('aria-selected')=='true'))

        # Different screenshot aspect ratios must all fit a classroom display.
        for width,height in [(1440,900),(1366,768),(1280,720)]:
            page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(160)
            goto('demo')
            for name in ['setup','focus','discover','home','friends','music','review']:
                page.locator(f'[data-demo="{name}"]').click()
                page.wait_for_function('document.querySelector("#demoShot").complete && document.querySelector("#demoShot").naturalWidth > 0')
                sizes=page.evaluate('''()=>({chapter:document.querySelector('#demo').getBoundingClientRect().height,available:document.querySelector('#story').clientHeight})''')
                check(f'Demo selected step fits {width}x{height} {name}',lambda sizes=sizes:need(sizes['chapter']<=sizes['available']+2,str(sizes)))
                if sizes['chapter']>sizes['available']+2:
                    page.screenshot(path=str(OUTPUT/f'{width}x{height}-demo-{name}-overflow.png'))
        page.set_viewport_size({'width':1366,'height':768});page.wait_for_timeout(160)

        goto('testing')
        for name, expected in [('desktop','focus.png'),('social','eumo-friends-live.png'),('friction','home.png'),('outfits','wardrobe.png')]:
            page.locator(f'[data-feedback="{name}"]').click()
            page.wait_for_function('document.querySelector("#feedbackShot").complete && document.querySelector("#feedbackShot").naturalWidth>0')
            check('Feedback '+name,lambda expected=expected:need(expected in page.locator('#feedbackShot').get_attribute('src')))
        page.locator('#feedback-outfits').focus();page.keyboard.press('ArrowDown')
        check('Feedback keyboard',lambda:need(page.locator('#feedback-desktop').get_attribute('aria-selected')=='true'))

        goto('roadmap');page.locator('#road-ui').focus();page.keyboard.press('ArrowRight')
        check('Roadmap horizontal keyboard',lambda:(need(page.locator('#road-rewards').get_attribute('aria-selected')=='true'),need('rewards support' in page.locator('#roadmapTitle').inner_text())))
        page.keyboard.press('ArrowRight')
        check('Physical roadmap workstream',lambda:need('physical products' in page.locator('#roadmapTitle').inner_text()))
        page.keyboard.press('ArrowRight')
        check('Roadmap wraps keyboard',lambda:need(page.locator('#road-ui').get_attribute('aria-selected')=='true'))

        # Revised content panels must fit after every selection, not only defaults.
        states=[('research','[data-research]'),('testing','[data-feedback]'),('roadmap','[data-roadmap]'),('extensions','[data-family]')]
        for width,height in [(1440,900),(1366,768),(1280,720),(768,1024),(390,844),(320,568)]:
            page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(160)
            for chapter,selector in states:
                goto(chapter)
                for button in page.locator(selector).all():
                    button.click()
                    page.wait_for_function('Array.from(document.querySelectorAll("img")).every(e=>e.complete&&e.naturalWidth>0)')
                    data=page.evaluate('''id=>{const c=document.getElementById(id),cr=c.getBoundingClientRect(),story=document.querySelector('#story');const horizontal=[...c.querySelectorAll('*')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(e=>({id:e.id,tag:e.tagName,text:e.textContent.slice(0,50),left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right})).filter(e=>e.left < -2||e.right>innerWidth+2);return {chapter:cr.height,available:story.clientHeight,horizontal,storyOverflow:story.scrollWidth>story.clientWidth}}''',chapter)
                    title=button.get_attribute('id')
                    check(f'Selected panel layout {width}x{height} {title}',lambda data=data,width=width:(need(not data['horizontal'],str(data)),need(not data['storyOverflow'],str(data)),need(width<1000 or data['chapter']<=data['available']+2,str(data))))
                    if data['horizontal'] or data['storyOverflow'] or width>=1000 and data['chapter']>data['available']+2:
                        page.screenshot(path=str(OUTPUT/f'{width}x{height}-{title}-overflow.png'))
        page.set_viewport_size({'width':1366,'height':768});page.wait_for_timeout(160)
        goto('extensions');page.locator('#family-keychain').click()

        goto('extensions')
        check('Orange default',lambda:(need(page.locator('#colorName').inner_text()=='Orange'),need(page.locator('[data-color="5"]').get_attribute('aria-pressed')=='true'),need(page.locator('#keychainSprite').get_attribute('data-variant')=='5')))
        sprites=[]
        for i,name in enumerate(['Sunflower','Mint','Lavender','Charcoal','Blue & Orange','Orange']):
            page.locator(f'[data-color="{i}"]').click()
            sprites.append(page.locator('#keychainSprite').evaluate('e=>[getComputedStyle(e).backgroundImage,getComputedStyle(e).backgroundPosition]'))
            check('Color '+name,lambda i=i,name=name:(
                need(page.locator('#colorName').inner_text()==name),
                need(page.locator(f'[data-color="{i}"]').get_attribute('aria-pressed')=='true'),
                need(page.locator('[data-color][aria-pressed="true"]').count()==1),
                need(page.locator('#keychainSprite').get_attribute('aria-label').startswith(name)),
                need(page.locator('[data-pixel-wipe]').count()==0,'Reduced motion created overlay')))
        check('Six distinct color sprite cells',lambda:need(len(set(map(str,sprites)))==6,str(sprites)))
        check('Two new colors use extra sprite',lambda:need(all('keychains-extra.png' in s[0] for s in sprites[4:])))
        check('Four original colors use original sprite',lambda:need(all('keychains.png' in s[0] for s in sprites[:4])))
        sources=[]
        for index in range(6):
            path=ROOT/'present/assets'/('keychains.png' if index<4 else 'keychains-extra.png')
            sheet=Image.open(path).convert('RGBA');cell=627 if index<4 else 887
            col=index%2 if index<4 else index-4;row=index//2 if index<4 else 0
            alpha=sheet.crop((col*cell,row*cell,(col+1)*cell,(row+1)*cell)).getchannel('A')
            bounds=alpha.point(lambda a:255 if a>64 else 0).getbbox()
            sources.append({'sheet':sheet.size,'bounds':(bounds[0]+col*cell,bounds[1]+row*cell,bounds[2]+col*cell,bounds[3]+row*cell)})
        REPORT['keychain_bounds']=[]
        for width,height in [(1440,900),(1366,768),(1280,720),(768,1024),(390,844),(320,568)]:
            page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(160);goto('extensions')
            for index in range(6):
                page.locator(f'[data-color="{index}"]').click()
                style=page.locator('#keychainSprite').evaluate('''e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{w:r.width,h:r.height,size:s.backgroundSize.split(' ').map(parseFloat),pos:s.backgroundPosition.split(' ').map(parseFloat),variant:e.dataset.variant}}''')
                src=sources[index];bw=style['w']*style['size'][0]/100;bh=style['h']*style['size'][1]/100
                sx=bw/src['sheet'][0];sy=bh/src['sheet'][1];ox=(style['w']-bw)*style['pos'][0]/100;oy=(style['h']-bh)*style['pos'][1]/100
                x1,y1,x2,y2=src['bounds'];box={'left':ox+x1*sx,'right':ox+x2*sx,'top':oy+y1*sy,'bottom':oy+y2*sy}
                box.update({'visibleHeight':box['bottom']-box['top'],'width':width,'height':height,'variant':index,'spriteWidth':style['w'],'spriteHeight':style['h']});REPORT['keychain_bounds'].append(box)
                check(f'Keychain visible bounds {width}x{height} color {index}',lambda box=box,style=style,index=index,sx=sx,sy=sy:(need(style['variant']==str(index)),need(abs(style['w']-style['h'])<1),need(abs(sx-sy)<.001),need(box['left']>=-1 and box['top']>=-1 and box['right']<=style['w']+1 and box['bottom']<=style['h']+1,str(box)),need(abs(box['visibleHeight']/style['w']-833/887)<.005,str(box)),need(abs((box['left']+box['right'])/2-style['w']/2)<1.5,str(box))))
            if width in [1366,390]:page.screenshot(path=str(OUTPUT/f'{width}x{height}-normalized-orange.png'))
        page.set_viewport_size({'width':1366,'height':768});page.wait_for_timeout(160);goto('extensions')

        page.locator('#family-keychain').focus();page.keyboard.press('ArrowRight')
        check('Handheld tab and scope',lambda:(need(page.locator('#handheldRender').is_visible()),need(not page.locator('#keychainSprite').is_visible()),need(not page.locator('#colorPicker').is_visible()),need(page.locator('#familyTitle').inner_text()=='Timer + digging.')))
        page.keyboard.press('ArrowLeft')
        check('Return keychain preserves selected color',lambda:(need(page.locator('#keychainSprite').is_visible()),need(page.locator('#colorName').inner_text()=='Orange')))

        goto('demo');page.locator('#startDemoClock').click();page.wait_for_timeout(1250)
        check('Demo clock starts',lambda:need(page.locator('#demoTimer').inner_text()!='00:00'))
        page.locator('#startDemoClock').click();value=page.locator('#demoTimer').inner_text();page.wait_for_timeout(1100)
        check('Demo clock pauses',lambda:need(page.locator('#demoTimer').inner_text()==value))
        page.locator('#startDemoClock').click();page.wait_for_timeout(1100)
        check('Demo clock resumes',lambda:need(page.locator('#demoTimer').inner_text()!=value))
        page.locator('#resetDemoClock').click()
        check('Demo clock resets',lambda:(need(page.locator('#demoTimer').inner_text()=='00:00'),need(page.locator('#startDemoClock').get_attribute('aria-pressed')=='false')))

        for old,new in [('thankyou','thankyou'),('beyond','extensions'),('hello','overview'),('loop','demo'),('people','persona'),('iterations','testing'),('next','roadmap')]:
            page.evaluate('hash=>location.hash=hash',old);page.wait_for_timeout(150)
            check('Legacy hash '+old,lambda new=new:need(page.evaluate('location.hash')=='#'+new))
        page.goto(url+'#extensions');page.evaluate('document.fonts.ready');page.wait_for_timeout(180)
        check('Direct deep link',lambda:need(page.locator('#chapterNumber').inner_text()=='10'))
        page.locator('#fullscreenButton').click();page.wait_for_timeout(150)
        check('Enter fullscreen',lambda:need(page.evaluate('!!document.fullscreenElement')))
        page.locator('#fullscreenButton').click();page.wait_for_timeout(150)
        check('Exit fullscreen',lambda:need(page.evaluate('!document.fullscreenElement')))
        check('Game save untouched',lambda:need(page.evaluate("localStorage.getItem('eumo-qa-sentinel')==='unchanged'&&localStorage.getItem('loop-pet-soft-universe-v1')===null")))
        link=page.locator('a.primary').first
        check('Open Eumo new-tab link',lambda:need(link.get_attribute('target')=='_blank' and 'noopener' in link.get_attribute('rel')))
        response=context.request.get(link.evaluate('e=>e.href'))
        check('Open Eumo resolves',lambda:need(response.status==200,str(response.status)))
        check('All loaded images decode', lambda:need(page.locator('img').evaluate_all('els=>els.every(e=>e.complete&&e.naturalWidth>0)')))
        check('No JS errors',lambda:need(not REPORT['errors'],str(REPORT['errors'])))
        check('No failed local requests',lambda:need(not REPORT['bad_responses'],str(REPORT['bad_responses'])))

        normal=browser.new_context(viewport={'width':1366,'height':768})
        np=normal.new_page();normal_errors=[];np.on('pageerror',lambda e:normal_errors.append(str(e)))
        np.goto(url+'#extensions');np.evaluate('document.fonts.ready');np.wait_for_timeout(200)
        np.locator('[data-color="0"]').click()
        check('Normal-motion pixel cover',lambda:need(np.locator('[data-pixel-wipe] span').count()==80))
        np.evaluate('''()=>{for(const i of [2,4,1,3,5])document.querySelector(`[data-color="${i}"]`).click()}''')
        np.wait_for_timeout(750)
        check('Rapid color changes latest wins',lambda:(need(np.locator('#colorName').inner_text()=='Orange'),need(np.locator('#keychainSprite').get_attribute('aria-label').startswith('Orange')),need(np.locator('[data-pixel-wipe]').count()==0)))
        np.locator('#family-handheld').click();np.locator('#family-keychain').click();np.wait_for_timeout(750)
        check('Rapid family switches settle',lambda:(need(np.locator('#keychainSprite').is_visible()),need(not np.locator('#handheldRender').is_visible()),need(np.locator('[data-pixel-wipe]').count()==0)))
        np.locator('#nextChapter').click();np.wait_for_timeout(1000)
        check('Smooth navigation settles',lambda:need(np.locator('#chapterNumber').inner_text()=='11'))
        np.goto(url+'#overview');np.evaluate('document.fonts.ready');np.wait_for_timeout(850)
        check('Hero entrance restores visibility',lambda:need(np.locator('[data-enter-item]').evaluate_all('els=>els.every(e=>getComputedStyle(e).opacity==="1"&&getComputedStyle(e).visibility!=="hidden")')))
        np.goto(url);np.evaluate('document.fonts.ready');np.wait_for_timeout(2100)
        check('Animated cover persists after two seconds',lambda:(need(np.evaluate('location.hash')=='#cover'),need(np.locator('.cover-mark').is_visible()),need(np.locator('.cover-mark').evaluate('e=>getComputedStyle(e).opacity')=='1')))
        np.locator('#nextChapter').click();np.wait_for_timeout(1000)
        check('Opening advances to product overview',lambda:need(np.evaluate('location.hash')=='#overview'))
        np.locator('#story').focus();np.keyboard.press('End');np.wait_for_timeout(1000)
        check('End reaches real thank-you chapter',lambda:(need(np.evaluate('location.hash')=='#thankyou'),need(np.locator('#chapterNumber').inner_text()=='12'),need(np.locator('#nextChapter').is_disabled())))
        check('Normal motion no JS errors',lambda:need(not normal_errors,str(normal_errors)))
        normal.close();context.close();browser.close()
finally:
    proc.terminate();proc.wait()
    (OUTPUT/'report.json').write_text(json.dumps(REPORT,indent=2))
    failures=[c for c in REPORT['checks'] if not c['pass']]
    print(json.dumps({'checks':len(REPORT['checks']),'failures':failures,'errors':REPORT['errors'],'bad_responses':REPORT['bad_responses']},indent=2))

assert not failures, failures
