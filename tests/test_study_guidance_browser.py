"""Optional guidance DOM controls, reload persistence, localization and mobile fit."""
import os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
def run():
 proc=subprocess.Popen(['node','scripts/dev_server.cjs'],cwd=ROOT,env={**os.environ,'PORT':'0'},stdout=subprocess.PIPE,text=True)
 url=proc.stdout.readline().strip().split('Eumo: ')[1]
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   page=browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.route(url+'/__guidance-fixture__',lambda route:route.fulfill(content_type='text/html',body='<html><head><meta name=viewport content="width=device-width,initial-scale=1"><link rel=stylesheet href="/style.css"><link rel=stylesheet href="/woodland.css"><script defer src="/locale.js"></script></head><body></body></html>'))
   page.goto(url+'/__guidance-fixture__',wait_until='networkidle')
   page.add_script_tag(url=url+'/study-guidance.js');page.add_style_tag(url=url+'/study-guidance.css')
   page.evaluate("""()=>{
    document.body.innerHTML='<main style="padding:16px;max-width:700px;margin:auto"><div id="guideFixture"></div><dialog id="chatFixture"><textarea id="chatDraft"></textarea></dialog></main>';
    window.guideNow=1000000;window.guideStart=0;window.guideHelp=0;
    window.guideSnapshot={userId:'guidance-test',profileConfigured:true,canControl:true,focusVisible:true,task:'Read one chapter',taskPreparedAt:1000000,session:null};
    window.mountGuidance=()=>window.guide=StudyGuidance.init({mount:'#guideFixture',now:()=>guideNow,getSnapshot:()=>guideSnapshot,start:()=>{guideStart++;guideSnapshot.session={id:'s1',status:'running'};return true;},resume:()=>true,openTaskHelp:task=>{guideHelp++;document.querySelector('#chatDraft').value=task;document.querySelector('#chatFixture').showModal();}});
    mountGuidance();
   }""")
   expect(page.locator('.study-guidance-cue')).not_to_be_visible()
   page.evaluate('guideNow+=120000;guide.refresh()')
   expect(page.locator('.study-guidance-message')).to_have_text('Ready for your first small step?')
   page.locator('[data-guidance-action="later"]').click();expect(page.locator('.study-guidance-cue')).not_to_be_visible()
   page.evaluate('mountGuidance();guideNow+=299999;guide.refresh()');expect(page.locator('.study-guidance-cue')).not_to_be_visible()
   page.evaluate('guideNow++;guide.refresh()');expect(page.locator('.study-guidance-cue')).to_be_visible()
   # A second snooze in the same page must re-open the same event, not just
   # update content inside a still-hidden popover.
   page.locator('[data-guidance-action="later"]').click();expect(page.locator('.study-guidance-popover')).not_to_be_visible()
   page.evaluate('guideNow+=300000;guide.refresh()');expect(page.locator('.study-guidance-popover')).to_be_visible()
   page.evaluate("EumoI18n.set('zh')")
   expect(page.locator('.study-guidance-message')).to_have_text('准备好开始第一个小步骤了吗？')
   for width in [360,390,768,1366]:
    page.set_viewport_size({'width':width,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   assert page.locator('.study-guidance-cue').evaluate('e=>getComputedStyle(e).animationName')=='none'
   page.locator('[data-guidance-action="dismiss"]').click();page.evaluate('mountGuidance()');expect(page.locator('.study-guidance-cue')).not_to_be_visible()
   page.locator('.study-guidance-trigger').click();page.locator('#studyGuidanceEnabled').uncheck();page.evaluate('mountGuidance()');expect(page.locator('#studyGuidanceEnabled')).not_to_be_checked();page.locator('.study-guidance-trigger').click()
   page.locator('.study-guidance-help').click();assert page.evaluate('guideHelp')==1
   expect(page.locator('#chatDraft')).to_have_value('Read one chapter');page.keyboard.press('Escape')
   page.locator('#studyGuidanceEnabled').check();page.evaluate("guideSnapshot.task='Read section two';guideSnapshot.taskPreparedAt=guideNow;guide.refresh();guideNow+=120000;guide.refresh()")
   page.locator('[data-guidance-action="primary"]').click();assert page.evaluate('guideStart')==1;expect(page.locator('.study-guidance-cue')).not_to_be_visible()
   assert not errors,errors
   browser.close();print('PASS guidance: deferred prompt, snooze/dismiss persistence, off preference, user-initiated help, start, Chinese, reduced motion, four widths')
 finally:proc.terminate();proc.wait(timeout=10)
if __name__=='__main__':run()
