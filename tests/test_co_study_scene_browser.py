"""Shared scene and ephemeral waves through two browsers, real API and PostgreSQL.

Run: python3 tests/test_co_study_scene_browser.py
Optional screenshots: EUMO_QA_DIR=/tmp/eumo-scene-qa
Only the local test fixture creates identities; no production account is used.
"""
import json
import os
from pathlib import Path
import shutil
import subprocess
import uuid

from playwright.sync_api import sync_playwright, expect

from test_co_study_browser import seed, refresh, member, room, mutate

ROOT = Path(__file__).resolve().parents[1]
VIEWPORTS = [(320, 568), (390, 844), (844, 390), (390, 430)]


def api(context, origin, action, **payload):
    body = {'action': action, **payload}
    if action not in ('state', 'signal-state'):
        body.setdefault('requestId', str(uuid.uuid4()))
    response = context.request.post(origin + '/api/co-study', data=body)
    result = response.json()
    assert response.status == 200, (action, response.status, result)
    return result


def scene_member(page, identity):
    return page.evaluate('(id)=>window.__sceneModel.members.find(m=>m.id===id)', identity)


def screenshot(page, name):
    target = os.environ.get('EUMO_QA_DIR')
    if target:
        Path(target).mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(Path(target) / (name + '.png')))


def check_layout(page, phase, button):
    for width, height in VIEWPORTS:
        page.set_viewport_size({'width': width, 'height': height})
        page.wait_for_timeout(100)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (phase, width, height)
        dialog = page.locator('#coStudyDialog').bounding_box()
        assert dialog and 0 <= dialog['x'] and dialog['x'] + dialog['width'] <= width + 1
        assert 0 <= dialog['y'] and dialog['y'] + dialog['height'] <= height + 1
        page.locator('#coStudyScene').scroll_into_view_if_needed()
        canvas = page.locator('#coStudyScene').bounding_box()
        assert canvas and canvas['width'] > 180 and canvas['height'] > 80
        assert canvas['x'] >= 0 and canvas['x'] + canvas['width'] <= width + 1
        screenshot(page, f'scene-{phase}-{width}x{height}')
        control = page.locator(button)
        # The timer replaces its action row every second. Resolve and scroll in
        # one browser task instead of holding a handle over a stability wait.
        control.evaluate('(e)=>e.scrollIntoView({block:"nearest",inline:"nearest"})')
        box = control.bounding_box()
        assert box and box['height'] >= 44 and box['y'] >= 0 and box['y'] + box['height'] <= height + 1, (phase, button, box)
        # The visible control must be hittable, not just present under a canvas.
        assert control.evaluate('(e)=>{const r=e.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===e||e.contains(hit)}')
    page.set_viewport_size({'width': 390, 'height': 844})


def run():
    fixture = subprocess.Popen(['node', 'tests/co_study_browser_fixture.cjs', '--real-time'], cwd=ROOT,
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    try:
        line = fixture.stdout.readline().strip()
        assert line.startswith('Co-study fixture: '), line
        origin = line.split(': ', 1)[1]
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE') or shutil.which('chromium'), args=['--no-sandbox'])
            try:
                contexts = [browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True) for _ in range(2)]
                identities = []
                for context, name, color in zip(contexts, ['Yami', 'Momo'], ['#b784cf', '#7dcbb4']):
                    response = context.request.post(origin + '/api/friends', data={'action': 'connect', 'snapshot': {'name': name, 'color': color}})
                    assert response.status == 200
                    identities.append(response.json()['self'])
                request = contexts[0].request.post(origin + '/api/friends', data={'action': 'request', 'code': identities[1]['code']})
                assert request.status == 200
                incoming = contexts[1].request.post(origin + '/api/friends', data={'action': 'state'}).json()['incoming']
                accepted = contexts[1].request.post(origin + '/api/friends', data={'action': 'accept', 'linkId': incoming[0]['linkId']})
                assert accepted.status == 200

                pages, errors = [], []
                for context, name, color in zip(contexts, ['Yami', 'Momo'], ['#b784cf', '#7dcbb4']):
                    page = context.new_page()
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    page.add_init_script(seed(name, color))
                    page.add_init_script("localStorage.setItem('eumo-friends-preferences-v1',JSON.stringify({enabled:true,goal:120}));localStorage.setItem('eumo-tour-v1','seen');")
                    page.goto(origin + '/#focus')
                    page.locator('#startupSplash').wait_for(state='hidden')
                    page.wait_for_function('FriendsClient.getPlayers().length===1 && !!window.CoStudyScene')
                    # Observe the actual renderer inputs without substituting room state.
                    page.evaluate('''()=>{const update=CoStudyScene.update;CoStudyScene.update=(canvas,model)=>{
                      window.__sceneModel=JSON.parse(JSON.stringify(model));
                      return update(canvas,model);
                    }}''')
                    page.locator('#coStudyToggle').click()
                    refresh(page)
                    pages.append(page)
                host, guest = pages
                host_id, guest_id = [identity['id'] for identity in identities]
                created = api(contexts[0], origin, 'create', friendId=guest_id, mode='together')
                room_id = created['room']['id']
                api(contexts[1], origin, 'accept', roomId=room_id)
                for page in pages:
                    refresh(page)
                    expect(page.locator('#coStudyScene')).to_be_visible()
                    expect(page.locator('.co-study-room-roster .co-member')).to_have_count(2)
                    assert {m['id'] for m in page.evaluate('window.__sceneModel.members')} == {host_id, guest_id}
                    assert page.evaluate('window.__sceneModel.members.filter(m=>m.own).length') == 1
                    assert page.locator('#coStudyScene').evaluate('(c)=>c.getContext("2d").getImageData(0,0,c.width,c.height).data.some(v=>v!==0)')
                    page.evaluate('window.__originalScene=document.getElementById("coStudyScene")')
                    page.locator('#coStudyTask').fill('Read one paragraph')
                    page.locator('#coStudyConsent').check()
                    mutate(page, 'ready', lambda page=page: page.locator('#coStudyReady').click())
                refresh(host)
                refresh(guest)
                assert host.evaluate('state.session') is None and guest.evaluate('state.session') is None
                expect(host.locator('#coStudyStart')).to_be_enabled()
                check_layout(host, 'ready', '#coStudyStart')

                mutate(host, 'start', lambda: host.locator('#coStudyStart').click())
                refresh(guest)
                for page in pages:
                    page.wait_for_function('state.session?.status==="running"', timeout=10000)
                    assert page.evaluate('state.session.id') == member(page)['sourceSessionId']
                    refresh(page)
                for page in pages:
                    page.wait_for_function('window.__sceneModel.members.every(m=>m.state==="studying")')
                    assert page.evaluate('window.__originalScene===document.getElementById("coStudyScene")')
                    expect(page.locator('#coStudyScene')).to_have_attribute('data-scene-running', 'true')

                frame = int(host.locator('#coStudyScene').get_attribute('data-scene-frame'))
                host.wait_for_timeout(1400)
                assert int(host.locator('#coStudyScene').get_attribute('data-scene-frame')) > frame
                assert host.evaluate('window.__originalScene===document.getElementById("coStudyScene")'), 'Timer ticks replaced canvas'

                mutate(host, 'pause', lambda: host.locator('#coStudyPause').click())
                refresh(guest)
                guest.wait_for_function('(id)=>window.__sceneModel.members.find(m=>m.id===id).state==="paused"', arg=host_id)
                assert scene_member(host, host_id)['state'] == 'paused'
                assert scene_member(guest, guest_id)['state'] == 'studying'
                assert guest.evaluate('state.session.status') == 'running'
                screenshot(guest, 'scene-peer-paused')
                mutate(host, 'resume', lambda: host.locator('#coStudyPause').click())
                refresh(guest)
                guest.wait_for_function('(id)=>window.__sceneModel.members.find(m=>m.id===id).state==="studying"', arg=host_id)

                host.emulate_media(reduced_motion='reduce')
                expect(host.locator('#coStudyScene')).to_have_attribute('data-scene-running', 'false')
                host.wait_for_timeout(150)
                pixels = host.locator('#coStudyScene').evaluate('(c)=>c.toDataURL()')
                host.wait_for_timeout(1300)
                assert host.locator('#coStudyScene').evaluate('(c)=>c.toDataURL()') == pixels, 'Reduced motion still changes scene pixels'
                host.emulate_media(reduced_motion='no-preference')
                expect(host.locator('#coStudyScene')).to_have_attribute('data-scene-running', 'true')

                # One real POST by Host must produce a visible reaction in Guest's
                # independently polling browser; no optimistic fake peer signals.
                before = host.evaluate('({source:state.session.id,balance:state.balance,history:state.history.length,inventory:JSON.stringify(state.inventory)})')
                with host.expect_response(lambda r: r.url.endswith('/api/co-study') and r.request.post_data_json.get('action') == 'wave') as waved:
                    host.locator('#coStudyWave').click()
                assert waved.value.status == 200, waved.value.json()
                payload = waved.value.json()
                assert payload['self']['id'] == host_id and payload['roomId'] == room_id
                assert any(signal['userId'] == host_id and signal['type'] == 'wave' for signal in payload['signals'])
                guest.wait_for_function('(id)=>window.__sceneModel.members.some(m=>m.id===id&&m.reaction==="wave")', arg=host_id, timeout=6000)
                expect(guest.locator('#coStudyReactionStatus')).to_contain_text('Yami')
                screenshot(guest, 'scene-peer-wave')
                assert host.evaluate('({source:state.session.id,balance:state.balance,history:state.history.length,inventory:JSON.stringify(state.inventory)})') == before
                assert guest.evaluate('state.session.status') == 'running'
                guest.wait_for_function('window.__sceneModel.members.every(m=>m.reaction!=="wave")', timeout=8000)

                check_layout(host, 'studying', '#coStudyPause')
                host.locator('#coStudyClose').click()
                expect(host.locator('#coStudyDialog')).not_to_be_visible()
                expect(host.locator('#coStudyScene')).to_have_attribute('data-scene-running', 'false')
                frame = host.locator('#coStudyScene').get_attribute('data-scene-frame')
                host.wait_for_timeout(1300)
                assert host.locator('#coStudyScene').get_attribute('data-scene-frame') == frame, 'Closed dialog keeps animating'
                host.locator('#coStudyToggle').click()
                expect(host.locator('#coStudyScene')).to_have_attribute('data-scene-running', 'true')
                assert host.evaluate('window.__originalScene===document.getElementById("coStudyScene")')

                # An offline signal must not invent remote studying or stop the
                # local owned timer. This is an actual browser offline transition.
                contexts[1].set_offline(True)
                guest.wait_for_function('(id)=>window.__sceneModel.members.find(m=>m.id===id).state==="offline"', arg=host_id)
                assert scene_member(guest, guest_id)['state'] == 'studying'
                assert guest.evaluate('state.session.status') == 'running'
                contexts[1].set_offline(False)
                refresh(guest)
                assert not errors, errors
                print('PASS: two real shared-scene participants; actual ready/start/pause/resume state; persistent canvas across ticks; real peer wave and expiry without rewards/timer mutation; reduced-motion and close stop animation; mobile/short-landscape controls; offline peer state keeps local study running.')
            finally:
                browser.close()
    finally:
        fixture.terminate()
        try:
            fixture.wait(timeout=8)
        except subprocess.TimeoutExpired:
            fixture.kill()
            fixture.wait()
        error = fixture.stderr.read()
        if error:
            print(error)


if __name__ == '__main__':
    run()
