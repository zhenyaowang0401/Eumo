"use strict";
const http=require("node:http"),fs=require("node:fs"),path=require("node:path");
const root=__dirname;
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".png":"image/png",".svg":"image/svg+xml",".woff":"font/woff",".ttf":"font/ttf",".json":"application/json",".md":"text/plain; charset=utf-8",".txt":"text/plain; charset=utf-8"};
const server=http.createServer((req,res)=>{
 if(!["GET","HEAD"].includes(req.method)){res.writeHead(405);res.end();return;}
 try{
  const url=new URL(req.url,"http://localhost");
  let file=path.resolve(root,"."+decodeURIComponent(url.pathname));
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  if(fs.statSync(file).isDirectory())file=path.join(file,"index.html");
  const data=fs.readFileSync(file);res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream","Cache-Control":"no-cache","X-Content-Type-Options":"nosniff"});res.end(req.method==="HEAD"?undefined:data);
 }catch{res.writeHead(404,{"Content-Type":"text/plain"});res.end("Not found");}
});
server.on("error",error=>{console.error("Cannot start preview:",error.message);process.exitCode=1;});
server.listen(Number(process.env.EUMO_PRESENTATION_PORT||8766),"127.0.0.1",()=>console.log(`Open: http://127.0.0.1:${server.address().port}/present/index.html#cover`));
