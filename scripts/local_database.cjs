'use strict';
// Isolated, persistent PostgreSQL for local product trials. This adapter runs
// the same SQL/RPC and API authorization as the hosted app, with no seed users.
const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');

async function profileRest(db,url,method,body){
 const q=url.searchParams,where=[],args=[];
 const eq=(column,value)=>{args.push(value);where.push(column+'=$'+args.length);};
 const id=q.get('id'),hash=q.get('auth_hash');
 if(id?.startsWith('eq.'))eq('id',id.slice(3));
 else if(id?.startsWith('in.(')&&id.endsWith(')')){args.push(id.slice(4,-1).split(','));where.push('id=any($'+args.length+'::uuid[])');}
 if(hash?.startsWith('eq.'))eq('auth_hash',hash.slice(3));
 if(!where.length)throw Error('A scoped profile query is required');
 const snapshot=q.get('snapshot');
 if(snapshot?.startsWith('eq.')){args.push(snapshot.slice(3));where.push('snapshot=$'+args.length+'::jsonb');}
 if(method==='PATCH'){
  if(!body.snapshot||typeof body.snapshot!=='object'||Array.isArray(body.snapshot))throw Error('Invalid profile update');
  args.push(JSON.stringify(body.snapshot));
  return (await db.query('update public.eumo_friend_profiles set snapshot=$'+args.length+'::jsonb where '+where.join(' and ')+' returning id,snapshot',args)).rows;
 }
 if(method!=='GET')throw Error('Unsupported profile operation');
 return (await db.query('select id,snapshot from public.eumo_friend_profiles where '+where.join(' and '),args)).rows;
}

async function studyRequestRest(db,url,method,body){
 const q=url.searchParams,columns='actor_id,request_id,fingerprint,room_id,created_at';
 if(method==='POST'){
  if(q.get('on_conflict')!=='actor_id,request_id'||body.fingerprint!=='wave:v1')throw Error('Unsupported local signal receipt');
  return (await db.query('insert into public.eumo_study_requests ('+columns+') values ($1,$2,$3,$4,$5::timestamptz) on conflict (actor_id,request_id) do nothing returning '+columns,[body.actor_id,body.request_id,body.fingerprint,body.room_id,body.created_at])).rows;
 }
 if(method!=='GET')throw Error('Unsupported local signal operation');
 const where=[],args=[];
 for(const column of ['actor_id','request_id','fingerprint','room_id']){
  const value=q.get(column);if(!value)continue;
  if(value.startsWith('eq.')){args.push(value.slice(3));where.push(column+'=$'+args.length);}
  else if(column==='actor_id'&&value.startsWith('in.(')&&value.endsWith(')')){args.push(value.slice(4,-1).split(','));where.push(column+'=any($'+args.length+'::uuid[])');}
  else throw Error('Unsupported local signal filter');
 }
 if(!q.get('actor_id')&&!q.get('room_id'))throw Error('Scoped signal query required');
 const created=q.get('created_at');
 if(created){const match=/^(gt|gte)\.(.+)$/.exec(created);if(!match)throw Error('Unsupported local timestamp filter');args.push(match[2]);where.push('created_at'+(match[1]==='gt'?'>':'>=')+'$'+args.length+'::timestamptz');}
 if(q.has('order')&&q.get('order')!=='created_at.desc')throw Error('Unsupported local signal order');
 const limit=Number(q.get('limit')||24);if(!Number.isInteger(limit)||limit<1||limit>100)throw Error('Invalid local signal limit');
 args.push(limit);
 return (await db.query('select '+columns+' from public.eumo_study_requests where '+where.join(' and ')+(q.has('order')?' order by created_at desc':'')+' limit $'+args.length,args)).rows;
}

async function friendLinkRest(db,url,method){
 const pair=url.searchParams.get('pair_key'),status=url.searchParams.get('status');
 if(method!=='GET'||!pair?.startsWith('eq.')||status!=='eq.accepted')throw Error('Scoped accepted-friend query required');
 return (await db.query('select id from public.eumo_friend_links where pair_key=$1 and status=$2 limit 1',[pair.slice(3),'accepted'])).rows;
}

async function openLocalDatabase(directory){
 const db=new PGlite(directory);await db.waitReady;
 try{
  await db.exec(`do $$ begin
   if not exists(select from pg_roles where rolname='anon') then create role anon; end if;
   if not exists(select from pg_roles where rolname='authenticated') then create role authenticated; end if;
   if not exists(select from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
  end $$;`);
  await db.exec(fs.readFileSync(path.join(root,'database/friends.sql'),'utf8'));
  await db.exec(fs.readFileSync(path.join(root,'database/co_study.sql'),'utf8'));
 }catch(error){await db.close();throw error;}

 // This is an in-process server-only transport, never an exposed REST route.
 const origin='http://127.0.0.1',key='local-only-not-a-hosted-credential';
 async function fetchImpl(raw,options={}){
  const url=new URL(raw),method=options.method||'GET';
  if(url.origin!==origin||options.headers?.apikey!==key)return new Response('{}',{status:403});
  if(options.signal?.aborted)throw options.signal.reason||Error('Aborted');
  try{
   const body=options.body?JSON.parse(options.body):{};
   const result=await db.transaction(async tx=>{
    await tx.exec('set local role service_role');
    if(method==='POST'&&url.pathname==='/rest/v1/rpc/eumo_friends_action'){
     const r=await tx.query('select public.eumo_friends_action($1,$2,$3::jsonb) as result',[body.p_token_hash,body.p_action,JSON.stringify(body.p_payload||{})]);return r.rows[0].result;
    }
    if(method==='POST'&&url.pathname==='/rest/v1/rpc/eumo_co_study_action'){
     const r=await tx.query('select public.eumo_co_study_action($1,$2,$3::jsonb,$4::timestamptz) as result',[body.p_token_hash,body.p_action,JSON.stringify(body.p_payload||{}),body.p_now]);return r.rows[0].result;
    }
    if(url.pathname==='/rest/v1/eumo_friend_profiles')return profileRest(tx,url,method,body);
    if(url.pathname==='/rest/v1/eumo_friend_links')return friendLinkRest(tx,url,method);
    if(url.pathname==='/rest/v1/eumo_study_requests')return studyRequestRest(tx,url,method,body);
    throw Error('Unsupported local database operation');
   });
   return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}});
  }catch{return new Response('{"error":"LOCAL_DATABASE_UNAVAILABLE"}',{status:503,headers:{'Content-Type':'application/json'}});}
 }
 return {db,fetchImpl,env:{SUPABASE_URL:origin,SUPABASE_SERVICE_ROLE_KEY:key},close:()=>db.close()};
}
module.exports={openLocalDatabase};
