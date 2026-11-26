/* Scoped PostgREST transport for real PostgreSQL wave tests, never production. */
'use strict';

const columns = 'actor_id,request_id,fingerprint,room_id,created_at';

async function requestRest(db, url, method = 'GET', body = {}) {
  const q = new URL(url, 'http://fixture').searchParams;
  if (method === 'POST') {
    if (q.get('on_conflict') !== 'actor_id,request_id') throw Error('Expected request conflict key');
    const args = [body.actor_id, body.request_id, body.fingerprint, body.room_id, body.created_at];
    return (await db.query('insert into public.eumo_study_requests (' + columns +
      ') values ($1,$2,$3,$4,$5::timestamptz) on conflict (actor_id,request_id) do nothing returning ' + columns, args)).rows;
  }
  if (method !== 'GET') throw Error('Unsupported test request REST operation');
  const where = [], args = [];
  for (const column of ['actor_id', 'request_id', 'fingerprint', 'room_id']) {
    const value = q.get(column);
    if (!value) continue;
    if (value.startsWith('eq.')) {
      args.push(value.slice(3)); where.push(column + '=$' + args.length);
    } else if (column === 'actor_id' && value.startsWith('in.(') && value.endsWith(')')) {
      args.push(value.slice(4, -1).split(',')); where.push(column + '=any($' + args.length + '::uuid[])');
    } else throw Error('Unsupported scoped request filter');
  }
  if (!q.get('actor_id') && !q.get('room_id')) throw Error('Scoped request query required');
  const created = q.get('created_at');
  if (created) {
    const match = /^(gt|gte)\.(.+)$/.exec(created);
    if (!match) throw Error('Unsupported timestamp filter');
    args.push(match[2]); where.push('created_at' + (match[1] === 'gt' ? '>' : '>=') + '$' + args.length + '::timestamptz');
  }
  if (q.has('order') && q.get('order') !== 'created_at.desc') throw Error('Unsupported request order');
  const limit = Number(q.get('limit') || 24);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw Error('Invalid request limit');
  args.push(limit);
  return (await db.query('select ' + columns + ' from public.eumo_study_requests where ' + where.join(' and ') +
    (q.has('order') ? ' order by created_at desc' : '') + ' limit $' + args.length, args)).rows;
}

async function friendLinkRest(db, url, method = 'GET') {
  const q = new URL(url, 'http://fixture').searchParams;
  const pair = q.get('pair_key'), status = q.get('status');
  if (method !== 'GET' || !pair?.startsWith('eq.') || status !== 'eq.accepted') throw Error('Scoped accepted-friend query required');
  return (await db.query('select id from public.eumo_friend_links where pair_key=$1 and status=$2 limit 1',
    [pair.slice(3), 'accepted'])).rows;
}

module.exports = {requestRest, friendLinkRest};
