"""Two real browsers -> real API -> PostgreSQL, without co-study route mocks.

Run: python tests/test_co_study_browser.py
Optional screenshots: EUMO_QA_DIR=/tmp/eumo-co-study-qa
The fixture clock is private to tests; production still requires 20 real minutes.
"""
import datetime
import json
import os
from pathlib import Path
import shutil
import subprocess
import time
import urllib.request
import uuid

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
SAVE = 'loop-pet-soft-universe-v1'


def seed(name, color):
    old = {'profile': {'name': name, 'color': color, 'configured': True},
           'balance': 100, 'owned': ['hat', 'scarf'], 'equipped': ['scarf'],
           'ownedTools': ['spoon'], 'tool': 'spoon', 'depth': 90,
           'inventory': [1, 2, 3, 0], 'progressVersion': 2}
    return f"if(!localStorage.getItem('{SAVE}'))localStorage.setItem('{SAVE}',{json.dumps(json.dumps(old))});"


def post_fixture(url, advance=0):
    req = urllib.request.Request(url + '/__fixture/clock',
          data=json.dumps({'advanceMs': advance}).encode(),
          headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as response:
        return json.load(response)['now']


def api(context, url, action, **payload):
    body = {'action': action, **payload}
    if action != 'state':
        body.setdefault('requestId', str(uuid.uuid4()))
    response = context.request.post(url + '/api/co-study', data=body)
    return response.status, response.json()


def refresh(page):
    """Let a real in-flight request finish before asking for fresh room state."""
    for _ in range(100):
        data = page.evaluate('CoStudy.refresh()')
        if data:
            return data
        time.sleep(.02)
    raise AssertionError('Shared study did not become available: ' + page.locator('#coStudyPanel').inner_text())


def room(page):
    return page.evaluate('CoStudy.getRoom()')


def wait_js(page, expression):
    for _ in range(200):
        if page.evaluate(expression):
            return
        time.sleep(.02)
    raise AssertionError(expression)


def member(page, identity=None):
    data = page.evaluate('CoStudy.getState()')
    identity = identity or data['self']['id']
    return next(m for m in room(page)['members'] if m['id'] == identity)


def mutate(page, action, click):
    with page.expect_response(lambda response: response.url.endswith('/api/co-study')
            and response.request.post_data_json.get('action') == action) as response:
        click()
    result = response.value.json()
    assert response.value.status == 200, (action, result)
    refresh(page)
    return result


def connect(page, url, name, color):
    page.clock.install(time=datetime.datetime.fromtimestamp(post_fixture(url) / 1000, datetime.timezone.utc))
    page.add_init_script(seed(name, color))
    page.goto(url + '/#companions')
    page.locator('#startupSplash').wait_for(state='hidden')
    page.locator('#openFriends').click()
    expect(page.locator('#enableFriends')).to_be_enabled()
    page.locator('#enableFriends').click()
    expect(page.locator('#myFriendCode')).not_to_have_value('')
    expect(page.locator('#friendsRetry')).to_be_enabled()
    return page.locator('#myFriendCode').input_value()


def run():
    fixture = subprocess.Popen(['node', 'tests/co_study_browser_fixture.cjs'], cwd=ROOT,
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    try:
        line = fixture.stdout.readline().strip()
        assert line.startswith('Co-study fixture: '), (line, fixture.stderr.read())
        url = line.split('Co-study fixture: ')[1]
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE') or shutil.which('chromium'), args=['--no-sandbox'])
            contexts = [browser.new_context(viewport={'width': 1440, 'height': 1000}) for _ in range(2)]
            a, b = [context.new_page() for context in contexts]
            errors = []
            for page in [a, b]:
                page.on('pageerror', lambda error: errors.append(str(error)))
            connect(a, url, 'Yami', '#b784cf')
            code_b = connect(b, url, 'Momo', '#7dcbb4')
            a.locator('#friendCodeInput').fill(code_b)
            a.locator('#sendFriendRequest').click()
            expect(a.locator('#outgoingFriendRequests .friend-request-row')).to_have_count(1)
            b.locator('#refreshFriendRequests').click()
            expect(b.locator('[data-friend-action="accept"]')).to_be_visible()
            b.locator('[data-friend-action="accept"]').click()
            expect(b.locator('#onlineFriendList .friend-card')).to_have_count(1)
            a.locator('#refreshFriendRequests').click()
            expect(a.locator('#onlineFriendList .friend-card')).to_have_count(1)
            for page in [a, b]:
                page.locator('#closeFriends').click()
                page.locator('[data-page="focus"]').click()
                page.locator('#coStudyToggle').click()
                refresh(page)
            a_id = a.evaluate('CoStudy.getState().self.id')
            b_id = b.evaluate('CoStudy.getState().self.id')
            assert a_id != b_id
            assert 'eumo_friend_session' not in a.evaluate('document.cookie')
            assert 'fixture-service-role-key' not in a.content()
            a.locator('#coStudyFriend').select_option(b_id)
            a.locator('#coStudyMode').select_option('challenge')
            mutate(a, 'create', lambda: a.locator('#coStudyInvite').click())
            room_id = room(a)['id']
            refresh(b)
            mutate(b, 'accept', lambda: b.locator('[data-co-action="accept"]').click())
            refresh(a)
            # Neither a selected friend nor opening the panel silently starts study.
            assert a.evaluate('state.session') is None and b.evaluate('state.session') is None
            expect(a.locator('#coStudyStart')).to_be_disabled()
            for page, task in [(a, 'PRIVATE: read my medical notes'), (b, 'Read one chapter')]:
                refresh(page)
                page.locator('#coStudyTask').fill(task)
                page.locator('#coStudyConsent').check()
                mutate(page, 'ready', lambda page=page: page.locator('#coStudyReady').click())
            refresh(a)
            refresh(b)
            assert 'PRIVATE:' not in b.locator('#coStudyPanel').inner_text()
            assert not member(b, a_id)['task']

            # The fixture and both browser clocks now advance in ten-second slices.
            # Normal UI heartbeats and API writes remain real throughout the test.
            base = post_fixture(url)
            target = max(base, a.evaluate('Date.now()'), b.evaluate('Date.now()')) + 1000
            for page in [a, b]:
                page.clock.pause_at(datetime.datetime.fromtimestamp(target / 1000, datetime.timezone.utc))
            post_fixture(url, target - base)

            def advance(milliseconds, pages=(a, b)):
                at = post_fixture(url, milliseconds)
                for page in pages:
                    page.clock.fast_forward(milliseconds)
                for page in pages:
                    refresh(page)
                return at

            mutate(a, 'start', lambda: a.locator('#coStudyStart').click())
            refresh(b)
            advance(4000)
            advance(200)
            for page in [a, b]:
                assert page.evaluate('state.session.status') == 'running'
                assert page.evaluate('state.session.id') == member(page)['sourceSessionId']
            advance(10000)
            mutate(a, 'pause', lambda: a.locator('#coStudyPause').click())
            refresh(b)
            assert member(b, a_id)['status'] == 'paused'
            assert b.evaluate('state.session.status') == 'running'
            paused = a.evaluate('state.session.elapsed')
            advance(10000)
            assert a.evaluate('state.session.elapsed') == paused
            mutate(a, 'resume', lambda: a.locator('#coStudyPause').click())
            refresh(b)
            assert member(b, a_id)['status'] == 'studying', {'remote': member(b, a_id), 'local': a.evaluate('state.session')}

            # A third authenticated browser may not read, start or score this room.
            outsider = browser.new_context()
            response = outsider.request.post(url + '/api/friends', data={'action': 'connect', 'snapshot': {'name': 'Outsider'}})
            assert response.status == 200
            for action, payload in [('state', {}), ('start', {}), ('review', {'roundId': room(a)['roundId'], 'outcome': 'complete'})]:
                status, result = api(outsider, url, action, roomId=room_id, **payload)
                assert status == 404 and result['error'] == 'ROOM_NOT_FOUND', (action, status, result)
            unauthenticated = browser.new_context()
            assert api(unauthenticated, url, 'state')[0] == 401

            # Finish the real planned duration with uninterrupted verified heartbeat gaps.
            for _ in range(122):
                advance(10000)
                if all(member(page)['status'] in ('review_pending', 'completed', 'stopped') and page.evaluate('state.session===null') for page in [a, b]):
                    break
            for page in [a, b]:
                refresh(page)
                assert member(page)['status'] == 'review_pending', member(page)
                assert member(page)['verification'] == 'verified', member(page)
                if page.locator('#finishDialog').is_visible():
                    page.locator('#claimButton').click()
                page.locator('#coStudyReviewOutcome').select_option('partial')
                page.locator('#coStudyReviewNote').fill('Made progress; continue next round.')
                mutate(page, 'review', lambda page=page: page.locator('#coStudyReviewSubmit').click())
            refresh(a)
            refresh(b)
            assert room(a)['status'] == 'between_rounds'
            assert [m['points'] for m in room(a)['members']] == [1, 1]
            first_round = room(a)['roundId']
            first_source = member(a)['sourceSessionId']
            before = a.evaluate('({history:state.history.filter(h=>h.id===CoStudy.getRoom().members.find(m=>m.id===CoStudy.getState().self.id).sourceSessionId),balance:state.balance,inventory:state.inventory})')
            assert len(before['history']) == 1
            # Repeated and new-id retries cannot mint another completion or reward.
            request_id = str(uuid.uuid4())
            for _ in range(2):
                status, result = api(contexts[0], url, 'review', roomId=room_id, roundId=first_round, outcome='partial', requestId=request_id)
                assert status == 200, result
            refresh(a)
            assert member(a)['points'] == 1
            assert a.evaluate('state.history.filter(h=>h.id===' + json.dumps(first_source) + ').length') == 1
            assert a.evaluate('state.balance') == before['balance']

            # Reload keeps the authenticated room, the reviewed round and old save.
            a.reload()
            advance(2000)
            refresh(a)
            assert room(a)['id'] == room_id and member(a)['points'] == 1
            assert a.evaluate('state.owned.includes("hat") && state.owned.includes("scarf")')
            assert a.evaluate('state.history.filter(h=>h.id===' + json.dumps(first_source) + ').length') == 1

            # A planned-break prompt returns to shared preparation; it cannot
            # silently create a personal timer while the friend is still waiting.
            if not a.locator('#coStudyDialog').is_visible():
                a.locator('#coStudyToggle').click()
            a.locator('#coStudyBreak').click()
            a.locator('#coStudyClose').click()
            advance(300001)
            expect(a.locator('.study-guidance-message')).to_have_text('Your planned break has ended. Ready to return?')
            a.locator('[data-guidance-action="primary"]').click()
            expect(a.locator('#coStudyDialog')).to_be_visible()
            assert a.evaluate('state.session') is None and b.evaluate('state.session') is None

            # Both participants explicitly prepare again for the second round.
            for page in [a, b]:
                if not page.locator('#coStudyDialog').is_visible():
                    page.locator('#coStudyToggle').click()
                refresh(page)
                page.locator('#coStudyTask').fill('Continue the next section')
                page.locator('#coStudyConsent').check()
                mutate(page, 'ready', lambda page=page: page.locator('#coStudyReady').click())
            refresh(a)
            mutate(a, 'start', lambda: a.locator('#coStudyStart').click())
            refresh(b)
            assert room(a)['roundIndex'] == 2 and room(a)['roundId'] != first_round
            assert member(a)['sourceSessionId'] != first_source
            advance(4000)
            advance(200)
            for page in [a, b]:
                refresh(page)
                assert page.evaluate('state.session.status') == 'running'
            # Ending early is neutral; it grants no extra challenge point.
            mutate(a, 'finish', lambda: a.locator('#coStudyEnd').click())
            refresh(b)
            assert b.evaluate('state.session.status') == 'running'
            assert member(a)['points'] == 1
            mutate(b, 'finish', lambda: b.locator('#coStudyEnd').click())
            refresh(a)
            assert room(a)['status'] == 'finished'
            assert all(m['points'] == 1 for m in room(a)['members'])

            # A separate room isolates network uncertainty from the verified round.
            a.locator('#coStudyNew').click()
            a.locator('#coStudyFriend').select_option(b_id)
            a.locator('#coStudyMode').select_option('challenge')
            mutate(a, 'create', lambda: a.locator('#coStudyInvite').click())
            offline_room_id = room(a)['id']
            refresh(b)
            mutate(b, 'accept', lambda: b.locator('[data-co-action="accept"]').click())
            for page in [a, b]:
                refresh(page)
                page.locator('#coStudyTask').fill('A small task during reconnection')
                page.locator('#coStudyConsent').check()
                mutate(page, 'ready', lambda page=page: page.locator('#coStudyReady').click())
            refresh(a)
            mutate(a, 'start', lambda: a.locator('#coStudyStart').click())
            refresh(b)
            advance(4000)
            advance(200)
            saved_inventory = a.evaluate('JSON.stringify(state.inventory)')
            contexts[0].set_offline(True)
            expect(a.locator('#coStudyPanel')).to_contain_text('Connection interrupted')
            a.locator('#coStudyPause').click()
            wait_js(a, "state.session.status==='paused' && !CoStudy.getState().ui.busy")
            expect(a.locator('#coStudyPause')).to_be_enabled()
            a.locator('#coStudyPause').click()
            wait_js(a, "state.session.status==='running' && !CoStudy.getState().ui.busy")
            advance(10000, pages=(b,))
            a.clock.fast_forward(10000)
            assert a.evaluate('state.session.status') == 'running'
            assert a.evaluate('JSON.stringify(state.inventory)') == saved_inventory
            contexts[0].set_offline(False)
            refresh(a)
            advance(10000)
            assert room(a)['id'] == offline_room_id
            assert member(a)['verification'] == 'pending_verification', member(a)
            assert member(a)['points'] == 0
            assert member(b)['verification'] == 'verified'
            mutate(a, 'finish', lambda: a.locator('#coStudyEnd').click())
            assert b.evaluate('state.session.status') == 'running'
            refresh(b)
            mutate(b, 'finish', lambda: b.locator('#coStudyEnd').click())
            refresh(a)
            a.locator('#coStudyReviewOutcome').select_option('complete')
            mutate(a, 'review', lambda: a.locator('#coStudyReviewSubmit').click())
            assert member(a)['points'] == 0
            assert not a.evaluate('state.session')

            artifacts = os.environ.get('EUMO_QA_DIR')
            if artifacts:
                Path(artifacts).mkdir(parents=True, exist_ok=True)
            for width in [1440, 768, 390, 320]:
                a.set_viewport_size({'width': width, 'height': 1000 if width == 1440 else 844})
                a.clock.fast_forward(100)
                assert a.evaluate('document.documentElement.scrollWidth<=innerWidth'), width
                panel = a.locator('#coStudyPanel').bounding_box()
                assert panel['x'] >= 0 and panel['x'] + panel['width'] <= width + 1, (width, panel)
                dialog = a.locator('#coStudyDialog').bounding_box()
                assert dialog['x'] >= 0 and dialog['x'] + dialog['width'] <= width + 1, (width, dialog)
                if artifacts:
                    a.screenshot(path=str(Path(artifacts) / f'co-study-{width}.png'), full_page=True)
            assert not errors, errors
            browser.close()
        print('PASS: two authenticated browsers, actual API/PostgreSQL, accepted-friend invite, consent, automatic shared start, independent pause, private task, unauthorized/non-member denial, verified completion/review, idempotent points/history, reload, planned-break return without solo start, second round, offline pause/resume with pending verification/no point, and narrow layouts. Production Supabase is not verified.')
    finally:
        fixture.terminate()
        try:
            fixture.wait(timeout=5)
        except subprocess.TimeoutExpired:
            fixture.kill()
            fixture.wait()
        error = fixture.stderr.read()
        if error:
            print(error)


if __name__ == '__main__':
    run()
