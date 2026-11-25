'use strict';
const fs=require('node:fs'),path=require('node:path');
const {createDatabase}=require('./friends_database.cjs');
async function createCoStudyDatabase(){
 const base=await createDatabase();await base.db.exec(fs.readFileSync(path.join(__dirname,'../database/co_study.sql'),'utf8'));
 const coStudy=async(hash,action,payload={},at=Date.now())=>base.db.transaction(async tx=>{await tx.exec('set local role service_role');const r=await tx.query('select public.eumo_co_study_action($1,$2,$3::jsonb,$4::timestamptz) result',[hash,action,JSON.stringify(payload),new Date(at).toISOString()]);return r.rows[0].result;});
 return {...base,coStudy};
}
module.exports={createCoStudyDatabase};
