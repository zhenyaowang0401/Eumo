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
OUTPUT = ROOT.parent / 'scratch' / 'presentation-v8-qa'
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
        check('MADE project masthead', lambda: need(page.locator('.masthead-label').inner_text()=='MADE PROJECT'))
        check('Overview pairs the audience with the original mole and burrow scene', lambda: (
            need('8–35' in page.locator('.product-facts').inner_text()),
            need(page.locator('#overview .hero-frame,.overview-stat,.overview-mark').count()==0),
            need(page.locator('.overview-burrow').inner_text().strip()==''),
            need(page.locator('.overview-burrow img').get_attribute('src')=='assets/overview-burrow.png'),
            need(page.locator('.overview-burrow img').evaluate('e=>e.complete&&e.naturalWidth>0&&e.naturalHeight>0')),
            need('underground home' in page.locator('.overview-burrow img').get_attribute('alt'))))
        check('SVG ids stay unique and every local use resolves', lambda: need(page.evaluate('''()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return new Set(ids).size===ids.length&&[...document.querySelectorAll('svg use')].every(e=>document.getElementById(e.getAttribute('href').slice(1)))}''')))
        check('Persona identity stays concise', lambda: (
            need(page.locator('.persona-profile h2').inner_text()=='Alex, 20'),
            need(page.locator('.persona-profile img').count()==1),
            need(page.locator('.persona-profile .status,.profile-context,.persona-job').count()==0),
            need('Proto-persona' not in page.locator('#persona').inner_text())))
        check('Competitors show functions and distinct limitations', lambda: (
            need(page.locator('.comparison-v6 article').count()==3),
            need(page.locator('.competitor-limit').count()==2),
            need('AI chat' in page.locator('.competitor-edge').inner_text()),
            need(page.locator('.competitor-limit').first.evaluate('e=>getComputedStyle(e).fontFamily.includes("Georgia")')),
            need(page.locator('.reference-caption').count()==0)))
        check('Removed feedback and roadmap banners', lambda: need(page.locator('.open-question,.feedback-method,.workstream-detail,.roadmap-scope').count()==0))
        check('Roadmap has four concrete priorities', lambda: need(page.locator('.next-grid h3').all_inner_texts()==['App UI','Enclosure design','Device interface','Commercial launch']))
        check('Business model exposes commercial structure', lambda: (
            need(page.locator('.revenue-grid article').count()==3),
            need(page.locator('.business-operations h4').all_inner_texts()==['Acquisition','Distribution','Cost structure']),
            need(page.locator('#business img,#business .closing').count()==0),
            need('flower-meadow.png' in page.locator('#business').evaluate('e=>getComputedStyle(e,"::before").backgroundImage'))))
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
                    footerBottom:document.querySelector('footer').getBoundingClientRect().bottom,
                    chromeClipped:['header','.wordmark','.masthead nav','footer'].filter(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return r.top < -1 || r.bottom > innerHeight+1}),
                    windowScrollY:window.scrollY};
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
                    need(b['footerBottom']<=height+1, 'Footer outside viewport'),
                    need(not b['chromeClipped'], 'Clipped presentation chrome: '+str(b['chromeClipped'])),
                    need(abs(b['windowScrollY'])<1, 'Outer page scrolled')))
                if width>=1000:
                    check(f'Fits desktop {width}x{height} {chapter}', lambda b=bounds: need(
                        b['chapterHeight']<=b['storyHeight']+2, str(b)))
                if width==1366 or (width==390) or bounds['horizontal'] or bounds['bottom']:
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
        check('Research notes contain cited sources', lambda: need(all(name in page.locator('#detailBody').inner_text() for name in ['Harkin','Kestin','Ta','Sailer'])))
        page.keyboard.press('Escape')

        goto('research');page.locator('#research-presence').focus();page.keyboard.press('ArrowDown')
        check('Vertical research keyboard tab', lambda: (
            need(page.locator('#research-learning').get_attribute('aria-selected')=='true'),
            need('a structured AI tutor produced' in page.locator('#researchHeadline').inner_text()),
            need('nature.com' in page.locator('#researchSource').get_attribute('href')),
            need(page.locator('#researchPanel').get_attribute('aria-labelledby')=='research-learning')))
        page.keyboard.press('End')
        check('Research End tab', lambda: need(page.locator('#research-motivation').get_attribute('aria-selected')=='true'))
        page.keyboard.press('Home')
        check('Research Home tab', lambda: need(page.locator('#research-presence').get_attribute('aria-selected')=='true'))
        check('Tab keys do not navigate chapter', lambda: need(page.locator('#chapterNumber').inner_text()=='04'))
        for name, conclusion, source in [('presence','found that tracking progress','doi.org'),('learning','a structured AI tutor produced','nature.com'),('companion','identified companionship and emotional support','jmir.org'),('motivation','had a small positive effect on motivation','springer.com')]:
            page.locator(f'[data-research="{name}"]').click()
            check('Research evidence sentence '+name, lambda name=name,conclusion=conclusion,source=source: (
                need(conclusion in page.locator('#researchHeadline').inner_text()),
                need(page.locator('#researchHeadline').inner_text().endswith('.')),
                need(page.locator('#researchHeadline strong').count()>=2),
                need(source in page.locator('#researchSource').get_attribute('href')),
                need(page.locator('#researchPanel').get_attribute('aria-labelledby')=='research-'+name),
                need(page.locator('#researchMetric,#researchMetricLabel,#researchResponse').count()==0),
                need('g =' not in page.locator('#researchPanel').inner_text() and 'd =' not in page.locator('#researchPanel').inner_text()),
                need(bool(page.locator('#researchFinding').inner_text())),
                need(bool(page.locator('#researchApplication').inner_text()))))

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

        # Revised content panels must fit after every selection, not only defaults.
        states=[('research','[data-research]'),('testing','[data-feedback]'),('extensions','[data-family]')]
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
                    if width in [1366,390] and chapter=='research':
                        page.screenshot(path=str(OUTPUT/f'{width}x{height}-{title}.png'))
                    if data['horizontal'] or data['storyOverflow'] or width>=1000 and data['chapter']>data['available']+2:
                        page.screenshot(path=str(OUTPUT/f'{width}x{height}-{title}-overflow.png'))
        page.set_viewport_size({'width':1366,'height':768});page.wait_for_timeout(160)
        goto('extensions');page.locator('#family-keychain').click()

        goto('extensions')
        check('Orange default',lambda:(need(page.locator('#colorName').inner_text()=='Orange'),need(page.locator('[data-color="5"]').get_attribute('aria-pressed')=='true'),need(page.locator('#keychainSprite').get_attribute('data-variant')=='5')))
        photos=[]
        color_files=[f'assets/keychains/{name}.png' for name in ['sunflower','teal','lavender','charcoal','blue-orange']]+['assets/keychains-extra.png']
        for i,name in enumerate(['Sunflower','Teal','Lavender','Charcoal','Blue & Orange','Orange']):
            page.locator(f'[data-color="{i}"]').click()
            page.locator('#keychainPhoto').evaluate('e=>e.decode()')
            photos.append(page.locator('#keychainPhoto').get_attribute('src'))
            check('Color '+name,lambda i=i,name=name:(
                need(page.locator('#colorName').inner_text()==name),
                need(page.locator(f'[data-color="{i}"]').get_attribute('aria-pressed')=='true'),
                need(page.locator('[data-color][aria-pressed="true"]').count()==1),
                need(page.locator('#keychainSprite').get_attribute('aria-label').startswith(name)),
                need(page.locator('#keychainPhoto').get_attribute('src')==color_files[i]),
                need(page.locator('[data-pixel-wipe]').count()==0,'Reduced motion created overlay')))
        check('Six distinct available color sources',lambda:need(len(set(photos))==6,str(photos)))
        check('Legacy sprite background is absent',lambda:need(page.locator('#keychainSprite').evaluate('e=>getComputedStyle(e).backgroundImage')=='none'))
        sources=[]
        for filename in color_files:
            image=Image.open(ROOT/'present'/filename).convert('RGBA')
            alpha=image.getchannel('A').point(lambda a:255 if a>160 else 0)
            # The retained orange artwork is the right cell of the existing sheet.
            source_left=image.width//2 if filename.endswith('keychains-extra.png') else 0
            bounds=alpha.crop((source_left,0,image.width,image.height)).getbbox()
            bounds=(bounds[0]+source_left,bounds[1],bounds[2]+source_left,bounds[3])
            # Below the clasp, measure the mole body rather than attachment height.
            body_start=round(image.height*.45)
            body=alpha.crop((source_left,body_start,image.width,image.height)).getbbox()
            sources.append({'size':image.size,'bounds':bounds,'body':(body[0]+source_left,body[1]+body_start,body[2]+source_left,body[3]+body_start)})
        REPORT['keychain_bounds']=[]
        for width,height in [(1440,900),(1366,768),(1280,720),(768,1024),(390,844),(320,568)]:
            page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(160);goto('extensions')
            color_bounds=[]
            for index in range(6):
                page.locator(f'[data-color="{index}"]').click()
                page.locator('#keychainPhoto').evaluate('e=>e.decode()')
                style=page.locator('#keychainSprite').evaluate('''e=>{const r=e.getBoundingClientRect(),i=e.querySelector('img').getBoundingClientRect();return{w:r.width,h:r.height,image:{w:i.width,h:i.height,x:i.left-r.left,y:i.top-r.top},variant:e.dataset.variant}}''')
                src=sources[index];sx=style['image']['w']/src['size'][0];sy=style['image']['h']/src['size'][1];ox=style['image']['x'];oy=style['image']['y']
                x1,y1,x2,y2=src['bounds'];body=src['body']
                box={'left':ox+x1*sx,'right':ox+x2*sx,'top':oy+y1*sy,'bottom':oy+y2*sy,'bodyWidth':(body[2]-body[0])*sx,'feetBaseline':oy+body[3]*sy,'bodyCenter':ox+(body[0]+body[2])*sx/2}
                box.update({'width':width,'height':height,'variant':index,'spriteWidth':style['w'],'spriteHeight':style['h']});REPORT['keychain_bounds'].append(box);color_bounds.append(box)
                check(f'Keychain photograph bounds {width}x{height} color {index}',lambda box=box,style=style,index=index,sx=sx,sy=sy:(need(style['variant']==str(index)),need(abs(style['w']-style['h'])<1),need(abs(sx-sy)<.001),need(box['left']>=-2 and box['top']>=-2 and box['right']<=style['w']+2 and box['bottom']<=style['h']+2,str(box)),need(abs(box['bodyCenter']-style['w']/2)<2,str(box))))
            check(f'Equal mole size and foot baseline {width}x{height}',lambda boxes=color_bounds:(need(max(b['bodyWidth'] for b in boxes)-min(b['bodyWidth'] for b in boxes)<=2,str(boxes)),need(max(b['feetBaseline'] for b in boxes)-min(b['feetBaseline'] for b in boxes)<=2,str(boxes))))
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
