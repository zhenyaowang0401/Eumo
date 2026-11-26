"""Ready-button concurrency against the real local API and PostgreSQL fixture.

Run: python3 tests/test_co_study_ready_browser.py
Uses two isolated browser identities and no mocked successful API responses.
"""
import json
from pathlib import Path
import shutil
import subprocess
import uuid

from playwright.sync_api import sync_playwright, expect

from test_co_study_browser import seed, refresh, member, room

ROOT = Path(__file__).resolve().parents[1]


def api(context, origin, action, **payload):
    body = {'action': action, **payload}
    if action != 'state':
        body.setdefault('requestId', str(uuid.uuid4()))
    response = context.request.post(origin + '/api/co-study', data=body)
    result = response.json()
    assert response.status == 200, (action, response.status, result.get('error'))
    return result


def is_action(response, action):
    return (response.url.endswith('/api/co-study')
            and response.request.post_data_json.get('action') == action)


def run():
    fixture = subprocess.Popen(['node', 'tests/co_study_browser_fixture.cjs'], cwd=ROOT,
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    try:
        line = fixture.stdout.readline().strip()
        assert line.startswith('Co-study fixture: '), line
        origin = line.split(': ', 1)[1]
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=shutil.which('chromium'), args=['--no-sandbox'])
            try:
                contexts = [browser.new_context(viewport={'width': 390, 'height': 844}) for _ in range(2)]
                identities = []
                for index, context in enumerate(contexts):
                    response = context.request.post(origin + '/api/friends', data={
                        'action': 'connect', 'snapshot': {'name': f'Ready QA {index + 1}'}})
                    assert response.status == 200
                    identities.append(response.json()['self'])
                response = contexts[0].request.post(origin + '/api/friends', data={
                    'action': 'request', 'code': identities[1]['code']})
                assert response.status == 200
                incoming = contexts[1].request.post(origin + '/api/friends', data={'action': 'state'}).json()['incoming']
                response = contexts[1].request.post(origin + '/api/friends', data={
                    'action': 'accept', 'linkId': incoming[0]['linkId']})
                assert response.status == 200

                pages = []
                errors = []
                for index, context in enumerate(contexts):
                    page = context.new_page()
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    page.add_init_script(seed(f'Ready QA {index + 1}', '#b784cf'))
                    page.add_init_script("localStorage.setItem('eumo-friends-preferences-v1',JSON.stringify({enabled:true,goal:120}));localStorage.setItem('eumo-tour-v1','seen');")
                    page.goto(origin + '/#focus')
                    page.locator('#startupSplash').wait_for(state='hidden')
                    page.wait_for_function('FriendsClient.getPlayers().length===1')
                    page.locator('#coStudyToggle').click()
                    refresh(page)
                    pages.append(page)
                host, guest = pages
                created = api(contexts[0], origin, 'create', friendId=identities[1]['id'], mode='together')
                room_id = created['room']['id']
                api(contexts[1], origin, 'accept', roomId=room_id)
                for page in pages:
                    refresh(page)
                    page.locator('#coStudyTask').fill('Read one paragraph')
                    page.locator('#coStudyConsent').check()
                assert room(host)['version'] == room(guest)['version']

                guest_ready_requests = []
                guest_ready_responses = []

                def record_request(request):
                    if request.url.endswith('/api/co-study') and request.post_data_json.get('action') == 'ready':
                        guest_ready_requests.append(request.post_data_json)

                def record_response(response):
                    if is_action(response, 'ready'):
                        guest_ready_responses.append(response.status)

                guest.on('request', record_request)
                guest.on('response', record_response)
                # Deliberately no refresh of Guest between these two real clicks.
                # This is the ordinary case hidden by the general E2E helper's refresh.
                with host.expect_response(lambda response: is_action(response, 'ready')) as ready:
                    host.locator('#coStudyReady').click()
                assert ready.value.status == 200
                with guest.expect_response(lambda response: is_action(response, 'ready')) as stale:
                    guest.locator('#coStudyReady').click()
                assert stale.value.status == 409, 'The test must exercise the real stale-version response'
                assert stale.value.json()['error'] == 'STALE_VERSION'
                guest.wait_for_function('CoStudy.getRoom().members.find(m=>m.id===CoStudy.getState().self.id).ready===true', timeout=10000)
                refresh(host)
                assert member(host)['ready'] and member(guest)['ready']
                assert member(guest)['status'] == 'ready'
                assert guest_ready_responses == [409, 200], guest_ready_responses
                assert len(guest_ready_requests) == 2, guest_ready_requests
                first, retry = guest_ready_requests
                assert first['ready'] is True and retry['ready'] is True
                assert retry['requestId'] != first['requestId']
                assert retry['expectedVersion'] > first['expectedVersion']
                assert retry['task'] == first['task'] and retry['shareTask'] == first['shareTask']
                expect(host.locator('#coStudyStart')).to_be_enabled()
                assert host.evaluate('state.session') is None
                assert guest.evaluate('state.session') is None

                # Reset readiness through an actual host settings update, then let
                # the guest see the current mode before the host changes it again.
                api(contexts[0], origin, 'settings', roomId=room_id, mode='together')
                for page in pages:
                    refresh(page)
                assert not member(guest)['ready']
                before = len(guest_ready_requests)
                api(contexts[0], origin, 'settings', roomId=room_id, mode='challenge')
                # Guest still sees Together: silently readying them for a changed
                # mode would bypass their decision. A fresh click is required.
                assert room(guest)['mode'] == 'together'
                with guest.expect_response(lambda response: is_action(response, 'ready')) as changed:
                    guest.locator('#coStudyReady').click()
                assert changed.value.status == 409
                guest.wait_for_function('CoStudy.getRoom().mode==="challenge"', timeout=10000)
                guest.wait_for_timeout(250)
                assert len(guest_ready_requests) == before + 1, 'Changed mode must not auto-retry Ready'
                assert not member(guest)['ready']
                assert member(guest)['status'] == 'joined'
                with guest.expect_response(lambda response: is_action(response, 'ready')) as confirmed:
                    guest.locator('#coStudyReady').click()
                assert confirmed.value.status == 200
                assert member(guest)['ready']
                assert not errors, errors
                print('PASS: real two-browser stale Ready retries once with preserved intent; changed mode requires a new explicit Ready click; both-ready does not silently start timers.')
            finally:
                browser.close()
    finally:
        fixture.terminate()
        try:
            fixture.wait(timeout=8)
        except subprocess.TimeoutExpired:
            fixture.kill()
            fixture.wait()


if __name__ == '__main__':
    run()
