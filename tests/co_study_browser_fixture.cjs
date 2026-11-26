/* Test-only HTTP app and Supabase transport using the real API and PostgreSQL SQL.
 * No production files import this fixture. The clock is controlled here so a
 * browser test can complete a genuine 20-minute round without a 20-minute wait.
 */
'use strict';
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {createDatabase} = require('./friends_database.cjs');
const {profileRest} = require('./friends_rest_transport.cjs');
const {requestRest, friendLinkRest} = require('./co_study_signal_transport.cjs');
const root = path.resolve(__dirname, '..');
const key = 'fixture-service-role-key';
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff': 'font/woff', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.wav': 'audio/wav'};
const json = (res, status, value) => res.writeHead(status, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}).end(JSON.stringify(value));
async function body(req) {
  const chunks = [];
  for await (const part of req) chunks.push(part);
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
}

(async () => {
  const {db, rpc} = await createDatabase();
  await db.exec(fs.readFileSync(path.join(root, 'database/co_study.sql'), 'utf8'));
  let clock = Date.now(), friends, coStudy;
  // Scene tests exercise animation and short-lived signals in wall-clock time.
  // The original browser flow keeps its controllable clock for full rounds.
  const now = process.argv.includes('--real-time') ? Date.now : () => clock;
  const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    try {
      if (pathname === '/__fixture/clock') {
        if (req.method === 'POST') {
          const input = await body(req);
          if (!Number.isSafeInteger(input.advanceMs) || input.advanceMs < 0) return json(res, 400, {error: 'INVALID_CLOCK'});
          clock += input.advanceMs;
        }
        return json(res, 200, {now: now()});
      }
      if (pathname === '/api/friends') return friends(req, res);
      if (pathname === '/api/co-study') return coStudy(req, res);
      if (pathname.startsWith('/rest/v1/')) {
        if (req.headers.apikey !== key || req.headers.authorization !== 'Bearer ' + key) return json(res, 403, {error: 'FORBIDDEN'});
        const input = await body(req);
        if (pathname === '/rest/v1/rpc/eumo_friends_action') return json(res, 200, await rpc(input.p_token_hash, input.p_action, input.p_payload));
        if (pathname === '/rest/v1/rpc/eumo_co_study_action') {
          const result = await db.transaction(async tx => {
            await tx.exec('set local role service_role');
            const rows = await tx.query('select public.eumo_co_study_action($1,$2,$3::jsonb,$4::timestamptz) as result', [input.p_token_hash, input.p_action, JSON.stringify(input.p_payload || {}), input.p_now]);
            return rows.rows[0].result;
          });
          return json(res, 200, result);
        }
        if (pathname === '/rest/v1/eumo_friend_profiles') return json(res, 200, await profileRest(db, req.url, req.method, input));
        if (pathname === '/rest/v1/eumo_study_requests') return json(res, 200, await requestRest(db, req.url, req.method, input));
        if (pathname === '/rest/v1/eumo_friend_links') return json(res, 200, await friendLinkRest(db, req.url, req.method));
        return json(res, 404, {error: 'NOT_FOUND'});
      }
      if (!['GET', 'HEAD'].includes(req.method) || pathname.split('/').some(p => p.startsWith('.')) || /^\/(ai|api|database|scripts|tests)(\/|$)/.test(pathname)) return json(res, 404, {error: 'NOT_FOUND'});
      const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!filename.startsWith(root + path.sep)) return json(res, 404, {error: 'NOT_FOUND'});
      let stat;
      try { stat = fs.statSync(filename); } catch { return json(res, 404, {error: 'NOT_FOUND'}); }
      if (!stat.isFile()) return json(res, 404, {error: 'NOT_FOUND'});
      res.writeHead(200, {'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control': 'no-cache'});
      if (req.method === 'HEAD') res.end(); else fs.createReadStream(filename).pipe(res);
    } catch (error) {
      console.error(error.stack || error.message);
      if (!res.headersSent) json(res, 500, {error: 'FIXTURE_ERROR'}); else res.end();
    }
  });
  server.listen(0, '127.0.0.1', () => {
    const url = 'http://127.0.0.1:' + server.address().port;
    const env = {SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key};
    friends = require('../api/friends.js').createHandler({env, now});
    coStudy = require('../api/co-study.js').createHandler({env, now});
    console.log('Co-study fixture: ' + url);
  });
  process.on('SIGTERM', () => server.close(() => db.close().then(() => process.exit(0))));
})().catch(error => { console.error(error); process.exit(1); });
