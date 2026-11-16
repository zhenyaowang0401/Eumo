#ifndef EUMO_NETWORK_H
#define EUMO_NETWORK_H
#include <WiFi.h>
#include <HTTPClient.h>
#include <NetworkClientSecure.h>
#include <Preferences.h>
#include <WebServer.h>
#include "Game.h"
#include "SyncSnapshot.h"
#include "TextLayout.h"
#include <vector>
#include <algorithm>
extern const uint8_t certBundleStart[] asm("_binary_x509_crt_bundle_start");
extern const uint8_t certBundleEnd[] asm("_binary_x509_crt_bundle_end");
struct NetJob{String path,body,cookie,bearer;};
struct NetResult{String path,body,cookie;int code;};
class EumoNetwork {
public:
 Preferences prefs;WebServer server{80};Game *game=nullptr;JsonDocument friends,chat;
 String ssid,password,setupPassword,token,cookie,error,pairCode;bool busy=false,portal=false,paired=false,shareChat=false;uint32_t lastSync=0;
 String screenCode,screenRequest,screenLabel,screenPairError;bool screenLinked=false,pairStarting=false,pairActive=false;uint32_t lastPairPoll=0,codeStarted=0;
 String syncWriter,syncViewer,syncError;bool syncEnabled=false;uint64_t syncSequence=0,syncLimit=0;uint32_t lastPublish=0;
 struct NearbyWiFi {String name;int rssi;int auth;};
 std::vector<NearbyWiFi> nearby;bool scanning=false,connecting=false;String wifiNote;uint32_t scanStarted=0,connectStarted=0;
 QueueHandle_t requests=nullptr,results=nullptr;
 static constexpr const char *ORIGIN="https://1111-phi-ten.vercel.app";
 static void worker(void *arg){auto *self=static_cast<EumoNetwork*>(arg);for(;;){NetJob *job=nullptr;if(xQueueReceive(self->requests,&job,portMAX_DELAY)!=pdTRUE)continue;
   auto *result=new NetResult;result->path=job->path;NetworkClientSecure client;client.setCACertBundle(certBundleStart,certBundleEnd-certBundleStart);HTTPClient http;
   http.setConnectTimeout(8000);http.setTimeout(15000);http.setFollowRedirects(HTTPC_DISABLE_FOLLOW_REDIRECTS);
   if(http.begin(client,String(ORIGIN)+job->path)){const char *headers[]={"Set-Cookie"};http.collectHeaders(headers,1);http.addHeader("Content-Type","application/json");if(job->cookie.length())http.addHeader("Cookie",job->cookie);if(job->bearer.length())http.addHeader("Authorization","Bearer "+job->bearer);result->code=http.POST(job->body);if(result->code>0){if(http.getSize()>65536){result->code=-100;}else result->body=http.getString();result->cookie=http.header("Set-Cookie");}http.end();}else result->code=-101;
   delete job;xQueueSend(self->results,&result,portMAX_DELAY);
  }}
 bool authorized(){if(server.method()==HTTP_POST&&server.hasHeader("Origin")&&server.header("Origin")!=String("http://")+server.hostHeader()){server.send(403,"text/plain","Wrong origin");return false;}if(server.authenticate("eumo",setupPassword.c_str()))return true;server.requestAuthentication();return false;}
 void begin(Game &g){game=&g;prefs.begin("eumo169net",false);ssid=prefs.getString("ssid","");password=prefs.getString("pass","");cookie=prefs.getString("friend","");token=prefs.getString("device","");paired=prefs.getBool("paired",false);char secret[17];snprintf(secret,sizeof(secret),"%08lx%08lx",(unsigned long)esp_random(),(unsigned long)esp_random());setupPassword=secret;
  syncWriter=prefs.getString("syncWriter","");syncViewer=prefs.getString("syncViewer","");syncEnabled=prefs.getBool("syncOn",false);syncSequence=prefs.getULong64("syncSeq",0);syncLimit=syncSequence;
  screenLinked=prefs.getBool("digLinked",false);
  WiFi.mode(WIFI_STA);WiFi.setAutoReconnect(true);if(ssid.length())WiFi.begin(ssid.c_str(),password.c_str());
  shareChat=prefs.getBool("shareChat",false);
  String tz=prefs.getString("tz","EST5EDT,M3.2.0,M11.1.0");configTzTime(tz.c_str(),"pool.ntp.org","time.nist.gov");
  requests=xQueueCreate(1,sizeof(NetJob*));results=xQueueCreate(1,sizeof(NetResult*));xTaskCreate(worker,"eumo-http",16384,this,1,nullptr);
  if(g.mounted){File f=FFat.open("/chat.json","r");if(f&&f.size()<65536){deserializeJson(chat,f);f.close();}}if(!chat.is<JsonArray>())chat.to<JsonArray>();
  const char *requestHeaders[]={"Origin"};server.collectHeaders(requestHeaders,1);
  server.on("/",HTTP_GET,[this]{if(!authorized())return;server.send(200,"text/html",R"html(<!doctype html><meta name="viewport" content="width=device-width"><title>Eumo setup</title><style>body{font:16px system-ui;max-width:600px;margin:24px}input,button,textarea{font:inherit;padding:12px;max-width:100%;margin:6px 0}label{display:block}</style><h1>Eumo device setup</h1><p>The device runs independently after Wi-Fi setup. This page is optional for long text and backups.</p><form method="post" action="/wifi"><label>Wi-Fi SSID<input name="ssid" required maxlength="32"></label><label>Password<input name="pass" type="password" maxlength="63"></label><label>POSIX timezone<input name="tz" value="EST5EDT,M3.2.0,M11.1.0"></label><button>Save Wi-Fi</button></form><h2>Progress transfer</h2><p>Export a backup first. Finish the current device session before importing. Friend login is separate from game progress.</p><a href="/backup">Download device backup</a><form method="post" action="/import"><label>Paste original Eumo progress JSON<textarea name="backup" rows="6" required></textarea></label><label><input type="checkbox" name="confirm" value="yes" required>Replace this device's progress with this backup</label><button>Import backup</button></form>)html");});
  server.on("/wifi",HTTP_POST,[this]{if(!authorized())return;String s=server.arg("ssid"),p=server.arg("pass"),tz=server.arg("tz");if(s.length()<1||s.length()>32||p.length()>63||tz.length()>100){server.send(400,"text/plain","Invalid Wi-Fi settings");return;}ssid=s;password=p;prefs.putString("ssid",s);prefs.putString("pass",p);prefs.putString("tz",tz);server.send(200,"text/plain","Saved. Check Wi-Fi status on the screen.");WiFi.begin(s.c_str(),p.c_str());configTzTime(tz.c_str(),"pool.ntp.org","time.nist.gov");});
  server.on("/backup",HTTP_GET,[this]{if(!authorized())return;server.sendHeader("Content-Disposition","attachment; filename=Eumo-progress.json");server.send(200,"application/json",game->exportSave());});
  server.on("/import",HTTP_POST,[this]{if(!authorized())return;if(server.arg("confirm")!="yes"||server.arg("backup").length()>Game::MAX_SAVE){server.send(400,"text/plain","Confirmation required or backup too large");return;}bool ok=game->importSave(server.arg("backup"));server.send(ok?200:400,"text/plain",ok?"Imported successfully":game->notice);});
  server.on("/text",HTTP_GET,[this]{if(!authorized())return;server.send(200,"text/html",R"html(<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Eumo text input</title><style>body{font:18px system-ui;max-width:500px;margin:24px}input,textarea,button{display:block;font:inherit;padding:12px;max-width:95%;margin:10px 0}</style><h1>中文 / 长文本输入</h1><form method="post" action="/text"><label>名称<input name="name" maxlength="32"></label><label>下次学习任务<textarea name="task" maxlength="160"></textarea></label><label>发送给鼹鼠的消息<textarea name="message" maxlength="2000"></textarea></label><p>只修改填写的字段；发送消息会调用原网站聊天服务。</p><button>保存 / 发送</button></form><a href="/">配网与备份</a>)html");});
  server.on("/text",HTTP_POST,[this]{if(!authorized())return;String name=server.arg("name"),task=server.arg("task"),message=server.arg("message");if(name.length()>128||task.length()>640||message.length()>8000){server.send(400,"text/plain","Text too long");return;}if(task.length()&&game->active()){server.send(409,"text/plain","Finish the current session before changing its task.");return;}if(name.length())game->state["profile"]["name"]=name;if(task.length()&&!game->active())game->state["lastTask"]=task;bool saved=game->save(),sent=!message.length()||ask(message);server.send(saved&&sent?200:400,"text/plain",!saved?game->notice:!sent?error:"Saved / message queued. Check the device screen.");});
  server.on("/sync",HTTP_GET,[this]{if(!authorized())return;String link=String(ORIGIN)+"/device-live.html#"+syncViewer;server.send(200,"text/html",String("<!doctype html><meta charset=utf-8><meta name=viewport content=width=device-width><title>Eumo live digging</title><h1>Device progress</h1><p>Enable sync on the screen first. This private link allows viewing only. Anyone with the link can see your depth and mole appearance.</p>")+(syncEnabled?"<p><a href='"+link+"' rel='noreferrer'>Watch this mole</a></p><textarea rows=4 cols=40 readonly>"+link+"</textarea>":"<p>Sync is off.</p>"));});
  server.begin();
 }
 void startPortal(){WiFi.mode(WIFI_AP_STA);WiFi.softAP("Eumo-Setup",setupPassword.c_str());portal=true;}
 void stopPortal(){WiFi.softAPdisconnect(true);WiFi.mode(WIFI_STA);portal=false;}
 void connect(const String &s,const String &p){
  if(s.length()<1||s.length()>32||p.length()>63){wifiNote="Invalid network or password";return;}
  ssid=s;password=p;connecting=true;connectStarted=millis();wifiNote="Connecting...";WiFi.setAutoReconnect(true);WiFi.begin(s.c_str(),p.c_str());
 }
 void scanWiFi(){
  if(scanning||connecting)return;nearby.clear();wifiNote="Scanning...";WiFi.scanDelete();
  // Async scan keeps the touch screen and digging timer responsive.
  if(WiFi.status()!=WL_CONNECTED)WiFi.disconnect(false,false);
  scanStarted=millis();int result=WiFi.scanNetworks(true,false);scanning=result>=0||result==WIFI_SCAN_RUNNING;
  if(!scanning)wifiNote="Scan failed. Tap Rescan.";
 }
 void pollWiFi(){
  if(scanning){int count=WiFi.scanComplete();if(count>=0){
   for(int i=0;i<count;i++){String name=WiFi.SSID(i);if(!name.length())continue;int auth=WiFi.encryptionType(i),rssi=WiFi.RSSI(i);bool duplicate=false;
    for(auto &n:nearby)if(n.name==name&&n.auth==auth){n.rssi=max(n.rssi,rssi);duplicate=true;break;}
    if(!duplicate)nearby.push_back({name,rssi,auth});
   }
   std::sort(nearby.begin(),nearby.end(),[](const NearbyWiFi&a,const NearbyWiFi&b){return a.rssi>b.rssi;});if(nearby.size()>24)nearby.resize(24);WiFi.scanDelete();scanning=false;wifiNote=nearby.empty()?"No networks. Tap Rescan.":"Choose a network";
  }else if(count==WIFI_SCAN_FAILED||uint32_t(millis()-scanStarted)>20000){scanning=false;WiFi.scanDelete();wifiNote="Scan failed. Tap Rescan.";}}
  if(connecting){if(WiFi.status()==WL_CONNECTED&&WiFi.SSID()==ssid){connecting=false;prefs.putString("ssid",ssid);prefs.putString("pass",password);wifiNote="Connected";}
   else if(uint32_t(millis()-connectStarted)>30000){connecting=false;WiFi.disconnect(false,false);wifiNote="Failed: check password / retry";}}
 }

 bool send(const char *path,JsonDocument &body){
  if(busy){error="Please wait for current request";return false;}if(WiFi.status()!=WL_CONNECTED){error="Wi-Fi is offline";return false;}if(!game->clockReady()){error="Waiting for internet clock";return false;}
  auto *job=new NetJob;job->path=path;serializeJson(body,job->body);if(job->path=="/api/friends"){if(paired)job->bearer=token;else job->cookie=cookie;}if(job->path=="/api/device")job->bearer=token;if(job->path=="/api/dig-sync"||job->path=="/api/dig-pair")job->bearer=syncWriter;
  if(xQueueSend(requests,&job,0)!=pdTRUE){delete job;return false;}busy=true;error="";lastSync=millis();return true;
 }
 void snapshot(JsonObject s){auto &st=game->state;auto t=st["session"];String date=Game::day(time(nullptr));s["name"]=st["profile"]["name"];s["color"]=st["profile"]["color"];
  s["status"]=!game->active()?"idle":!game->running()?"paused":t["demo"].as<bool>()?"demo":t["mode"]=="rest"?"break":t["mode"]=="work"?"working":"studying";
  s["localDate"]=date;s["studySeconds"]=st["reportDays"][date]["seconds"]|0;s["workSeconds"]=st["reportDays"][date]["workSeconds"]|0;s["goalMinutes"]=120;s["depth"]=st["depth"];s["mineDepth"]=max(0.0,game->liveDepth()-st["surfaceDepth"].as<double>());
  s["equipped"]=st["equipped"];s["tool"]=st["tool"];s["inventory"]=st["inventory"];s["home"]=st["home"];
 }
 bool friendAction(const String &action,const String &value=""){
  JsonDocument req;req["action"]=action;if(action=="connect"||action=="sync"||action=="resume"){snapshot(req["snapshot"].to<JsonObject>());req["visible"]=true;}if(action=="request")req["code"]=value;else if(value.length())req["linkId"]=value;
  return send("/api/friends",req);
 }
 bool pairAction(const String &action){JsonDocument req;req["action"]=action;return send("/api/device",req);}
 bool ask(const String &message){error="Chat is disabled on this device";return false;}
 String randomSecret(){String out;for(int i=0;i<8;i++){char b[9];snprintf(b,sizeof(b),"%08lx",(unsigned long)esp_random());out+=b;}return out;}
 void toggleSync(){syncEnabled=!syncEnabled;if(syncEnabled&&!syncWriter.length()){syncWriter=randomSecret();syncViewer=randomSecret();prefs.putString("syncWriter",syncWriter);prefs.putString("syncViewer",syncViewer);}prefs.putBool("syncOn",syncEnabled);lastPublish=millis()-5000;}
 bool screenPairAction(const String &action){JsonDocument req;req["action"]=action;if(action=="confirm")req["requestId"]=screenRequest;lastPairPoll=millis();bool ok=send("/api/dig-pair",req);if(!ok)screenPairError=error;return ok;}
 void startScreenPair(){
  if(busy){screenPairError="Please wait and try again";return;}
  if(!syncEnabled)toggleSync();
  screenCode="";screenRequest="";screenLabel="";screenPairError="";pairActive=false;pairStarting=true;
  if(!publishProgress()){pairStarting=false;screenPairError=error.length()?error:syncError;}
 }
 bool publishProgress(){
  if(syncSequence>=syncLimit){syncLimit=syncSequence+1024;if(prefs.putULong64("syncSeq",syncLimit)!=8){syncError="Cannot save sync counter";return false;}}
  JsonDocument req;req["action"]="publish";req["viewerToken"]=syncViewer;req["sequence"]=++syncSequence;
  if(!fillDigSnapshot(*game,req["snapshot"].to<JsonObject>(),&syncError)){lastPublish=millis();return false;}
  lastPublish=millis();if(game->state["reportDays"].size()>366||req["snapshot"]["records"].size()>2000||req.overflowed()||measureJson(req)>900000){syncError="Sync history exceeds size limit";return false;}
  return send("/api/dig-sync",req);
 }
 void poll(){pollWiFi();server.handleClient();NetResult *r=nullptr;if(xQueueReceive(results,&r,0)==pdTRUE){busy=false;JsonDocument doc;auto err=deserializeJson(doc,r->body);
   if(r->path=="/api/dig-sync"){
    bool ok=r->code==200&&!err&&doc["accepted"]==true;syncError=ok?"":r->code==503?"Deploy sync service first":"Sync failed; retrying";
    if(pairStarting){pairStarting=false;if(ok)screenPairAction("start");else screenPairError=syncError;}
   }
   else if(r->path=="/api/dig-pair"){
    if(r->code!=200||err||!doc["error"].isNull()){screenPairError=doc["error"]|"Pairing service unavailable";if(screenPairError=="PAIRING_EXPIRED"){pairActive=false;screenCode="";screenRequest="";}}
    else if(doc["code"].is<const char*>()){screenCode=doc["code"].as<String>();codeStarted=millis();pairActive=true;screenPairError="";}
    else if(doc["revoked"]==true){screenLinked=false;pairActive=false;screenCode="";screenRequest="";prefs.putBool("digLinked",false);screenPairError="Pairs revoked";}
    else if(doc["paired"]==true){screenLinked=true;pairActive=false;screenCode="";screenRequest="";screenPairError="";prefs.putBool("digLinked",true);}
    else {screenRequest=doc["requestId"]|"";screenLabel=doc["label"]|"";screenPairError="";}
   }
   else if(r->code!=200||err||!doc["error"].isNull()){error=doc["error"].as<String>();if(!error.length())error="Connection failed ("+String(r->code)+")";if(r->code==401){cookie="";prefs.remove("friend");friends.clear();token="";paired=false;prefs.remove("device");prefs.putBool("paired",false);}}
   else if(r->path=="/api/device"){
    if(doc["deviceToken"].is<const char*>()){String candidate=doc["deviceToken"].as<String>();bool valid=candidate.length()==64;for(char ch:candidate)if(!isxdigit(ch))valid=false;if(valid){token=candidate;paired=false;pairCode=doc["code"].as<String>();prefs.putString("device",token);prefs.putBool("paired",false);}}
    else if(doc["paired"]==true){paired=true;pairCode="";prefs.putBool("paired",true);friendAction("state");}else error="Approve code on original website";
   }
   else if(r->path=="/api/friends"){
    if(!doc["self"].is<JsonObject>()||!doc["friends"].is<JsonArray>())error="Invalid friend response";
    else {friends.set(doc);String prefix="eumo_friend_session=";int pos=r->cookie.indexOf(prefix);if(pos>=0){String candidate=r->cookie.substring(pos+prefix.length(),pos+prefix.length()+64);bool valid=candidate.length()==64;for(char ch:candidate)if(!isxdigit(ch))valid=false;if(valid){cookie=prefix+candidate;prefs.putString("friend",cookie);}}}
   }else {auto m=chat.as<JsonArray>().add<JsonObject>();m["role"]="assistant";m["content"]=doc["reply"];while(chat.size()>24)chat.as<JsonArray>().remove(0);saveChat();}
   delete r;
  }
  if(pairActive&&uint32_t(millis()-codeStarted)>=300000){pairActive=false;screenCode="";screenRequest="";screenPairError="Code expired. Tap New code.";}
  if(pairActive&&!busy&&uint32_t(millis()-lastPairPoll)>2500)screenPairAction("poll-device");
  if(syncEnabled&&!busy&&WiFi.status()==WL_CONNECTED&&game->clockReady()&&uint32_t(millis()-lastPublish)>5000)publishProgress();
 }
 void saveChat(){while(chat.size()>1&&measureJson(chat)>60000)chat.as<JsonArray>().remove(0);if(!game->mounted)return;File f=FFat.open("/chat.tmp","w");if(!f)return;size_t n=serializeJson(chat,f);f.flush();f.close();if(n==measureJson(chat)){FFat.remove("/chat.json");FFat.rename("/chat.tmp","/chat.json");}}
};
#endif
