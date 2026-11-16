#ifndef EUMO_GAME_H
#define EUMO_GAME_H
#include <ArduinoJson.h>
#include <FFat.h>
#include <time.h>
#include "Rules.h"
#include "Catalog.h"

class Game {
public:
 JsonDocument state,catalog;
 String notice;
 bool mounted=false,dirty=false;
 uint32_t previous=0,lastSave=0;
 double visit=0;int lateral=0;
 static constexpr size_t MAX_SAVE=1024*1024;
 static bool contains(JsonArrayConst a,const String &id){for(JsonVariantConst v:a)if(v.as<String>()==id)return true;return false;}
 static void remove(JsonArray a,const String &id){for(size_t i=0;i<a.size();i++)if(a[i].as<String>()==id){a.remove(i);return;}}
 static String day(time_t seconds){tm t{};localtime_r(&seconds,&t);char out[16];strftime(out,sizeof(out),"%Y-%m-%d",&t);return out;}
 static uint64_t nowMs(){timeval t;gettimeofday(&t,nullptr);return uint64_t(t.tv_sec)*1000+t.tv_usec/1000;}
 bool clockReady()const{return time(nullptr)>1700000000;}
 void defaults(){
  deserializeJson(state,R"({"profile":{"name":"Momo","color":"#a9b4c6","configured":true},"depth":0,"surfaceDepth":0,"inventory":[0,0,0,0],"balance":0,"owned":[],"equipped":[],"ownedTools":[],"tool":null,"sessions":0,"totalSeconds":0,"eligibleSeconds":0,"history":[],"session":null,"minutes":25,"mode":"study","reportDays":{},"lastTask":"","home":{"theme":"cave","ownedThemes":["cave"],"owned":["rug"],"slots":{"floor":"rug"}},"rareInventory":{},"rareClaimed":0,"foundDiscoveries":[],"heldItem":null,"displayedTreasure":null,"progressVersion":1})");
  state["rareSeed"]=String(esp_random(),HEX)+String(esp_random(),HEX);
 }
 bool readFile(const char *path,JsonDocument &doc){File f=FFat.open(path,"r");if(!f||f.size()>MAX_SAVE)return false;auto err=deserializeJson(doc,f);f.close();return !err&&valid(doc.as<JsonVariantConst>());}
 static bool valid(JsonVariantConst s){
  if(!s.is<JsonObjectConst>()||!s["profile"]["name"].is<const char*>()||!s["home"]["slots"].is<JsonObjectConst>()||!s["owned"].is<JsonArrayConst>())return false;
  for(const char *key:{"depth","balance"})if(!s[key].is<double>()||!isfinite(s[key].as<double>())||s[key].as<double>()<0)return false;
  JsonArrayConst inv=s["inventory"];if(inv.size()!=4)return false;for(auto v:inv)if(!v.is<double>()||!isfinite(v.as<double>())||v.as<double>()<0)return false;
  for(const char *key:{"equipped","ownedTools","history","foundDiscoveries"})if(!s[key].isNull()&&!s[key].is<JsonArrayConst>())return false;
  if(!s["reportDays"].isNull()&&!s["reportDays"].is<JsonObjectConst>())return false;
  for(const char *key:{"owned","ownedThemes"})if(!s["home"][key].isNull()&&!s["home"][key].is<JsonArrayConst>())return false;
  auto t=s["session"];if(!t.isNull()&&(!t.is<JsonObjectConst>()||t["status"]!="paused"||(t["mode"]!="study"&&t["mode"]!="work"&&t["mode"]!="rest")||!t["plannedSeconds"].is<double>()||t["plannedSeconds"].as<double>()<=0||t["plannedSeconds"].as<double>()>7200||!t["elapsed"].is<double>()||t["elapsed"].as<double>()<0||t["elapsed"].as<double>()>t["plannedSeconds"].as<double>()))return false;
  return true;
 }
 static void normalize(JsonDocument &s){
  for(const char *key:{"equipped","ownedTools","history","foundDiscoveries"})if(s[key].isNull())s[key].to<JsonArray>();
  if(s["reportDays"].isNull())s["reportDays"].to<JsonObject>();
  if(s["home"]["owned"].isNull())s["home"]["owned"].to<JsonArray>().add("rug");
  if(s["home"]["ownedThemes"].isNull())s["home"]["ownedThemes"].to<JsonArray>().add("cave");
  if(s["home"]["theme"].isNull())s["home"]["theme"]="cave";
  if(s["mode"]!="study"&&s["mode"]!="work"&&s["mode"]!="rest")s["mode"]="study";
  if(s["minutes"].isNull())s["minutes"]=25;
  for(const char *key:{"totalSeconds","eligibleSeconds","surfaceDepth","sessions","rareClaimed"})if(s[key].isNull())s[key]=0;
  if(s["rareInventory"].isNull())s["rareInventory"].to<JsonObject>();
  if(s["rareSeed"].isNull())s["rareSeed"]=String(esp_random(),HEX)+String(esp_random(),HEX);
  if(s["profile"]["color"].isNull())s["profile"]["color"]="#a9b4c6";
 }
 void begin(){deserializeJson(catalog,CATALOG_JSON);defaults();mounted=FFat.begin(false,"/ffat",3);if(mounted){JsonDocument tmp;if(readFile("/game.json",tmp)||readFile("/game.bak",tmp)){normalize(tmp);state.set(tmp);}}
  // A reset never silently counts unobserved power-off time as studying.
  if(!state["session"].isNull())state["session"]["status"]="paused";
  previous=millis();lastSave=previous;
 }
 bool initializeStorage(){
  notice="";
  if(!mounted)mounted=FFat.begin(true,"/ffat",3);
  if(!mounted){notice="Storage mount failed";return false;}
  if(!save())return false;
  notice="Storage ready";return true;
 }
 bool save(){
  dirty=true;if(!mounted){notice="Storage not initialized";return false;}
  // Persist a recoverable paused checkpoint, without pausing the live session.
  JsonDocument snapshot;snapshot.set(state);if(!snapshot["session"].isNull()){snapshot["session"]["status"]="paused";snapshot["session"]["remaining"]=remaining();snapshot["session"]["trackedAt"]=nowMs();}
  if(snapshot.overflowed()||measureJson(snapshot)>MAX_SAVE){notice="Storage limit: export backup";return false;}
  File f=FFat.open("/game.tmp","w");if(!f){notice="Cannot write save";return false;}size_t n=serializeJson(snapshot,f);f.flush();f.close();
  JsonDocument check;if(n!=measureJson(snapshot)||!readFile("/game.tmp",check)){notice="Save verification failed";return false;}
  if(FFat.exists("/game.json")){FFat.remove("/game.bak");if(!FFat.rename("/game.json","/game.bak")){notice="Save backup failed";return false;}}
  if(!FFat.rename("/game.tmp","/game.json")){notice="Save commit failed";return false;}
  dirty=false;lastSave=millis();return true;
 }
 bool active()const{return !state["session"].isNull();}
 bool running()const{return state["session"]["status"]=="running";}
 bool eligible(JsonVariantConst t)const{return !t.isNull()&&(t["demo"].as<bool>()||t["mode"]=="study"||t["mode"]=="work");}
 bool formal(JsonVariantConst t)const{return eligible(t)&&!t["demo"].as<bool>();}
 double liveDepth()const{auto t=state["session"];return state["depth"].as<double>()+Rules::depth(uint64_t(t["elapsed"].as<double>()*1000+.5),eligible(t),t["demo"]|false);}
 double worldDepth()const{return max(0.0,liveDepth()-state["surfaceDepth"].as<double>());}
 double remaining()const{return active()?max(0.0,state["session"]["plannedSeconds"].as<double>()-state["session"]["elapsed"].as<double>()):state["minutes"].as<int>()*60;}
 void start(bool demo=false){
  if(running()){state["session"]["status"]="paused";save();return;}
  if(!clockReady()&&!demo){notice="Set clock / connect Wi-Fi first";return;}
  if(!mounted){notice="Initialize storage in Settings";return;}
  if(active()){state["session"]["status"]="running";previous=millis();save();return;}
  JsonObject t=state["session"].to<JsonObject>();uint64_t at=nowMs();
  t["id"]=String((unsigned long long)at)+"-"+String(esp_random(),HEX);t["status"]="running";t["mode"]=state["mode"];t["demo"]=demo;t["rewardVersion"]=2;
  t["plannedSeconds"]=demo?15:(state["minutes"]|25)*60;t["remaining"]=t["plannedSeconds"];t["elapsed"]=0;t["startedAt"]=at;t["baseEligible"]=state["eligibleSeconds"]|0.0;
  t["baseDepth"]=state["depth"];t["rareSeed"]=state["rareSeed"];t["task"]=state["lastTask"];t["daySeconds"].to<JsonObject>();previous=millis();save();
 }
 void tick(uint32_t mono){uint32_t delta=mono-previous;previous=mono;if(!running())return;
  JsonObject t=state["session"];double ms=min(double(delta),remaining()*1000);if(ms<=0){finish(true);return;}
  t["elapsed"]=round((t["elapsed"].as<double>()+ms/1000)*1000)/1000;t["remaining"]=remaining();
  if(formal(t)&&clockReady()){
   uint64_t until=nowMs(),cursor=until-uint64_t(ms);
   while(cursor<until){time_t secs=cursor/1000;tm local{};localtime_r(&secs,&local);local.tm_hour=0;local.tm_min=0;local.tm_sec=0;local.tm_mday++;local.tm_isdst=-1;
    uint64_t midnight=uint64_t(mktime(&local))*1000,end=min(until,midnight);if(end<=cursor)break;String key=day(secs);const char *field=t["mode"]=="work"?"workSeconds":"seconds";
    state["reportDays"][key][field]=state["reportDays"][key][field].as<double>()+(end-cursor)/1000.0;
    t["daySeconds"][key]=t["daySeconds"][key].as<double>()+(end-cursor)/1000.0;cursor=end;
   }
  }
  visit=liveDepth();dirty=true;if(remaining()<=.0001)finish(true);else if(uint32_t(mono-lastSave)>=30000)save();
 }
 void finish(bool complete=false){
  if(!active())return;JsonDocument session;session.set(state["session"]);auto t=session.as<JsonVariantConst>();
  uint64_t elapsed=uint64_t(t["elapsed"].as<double>()*1000+.5),base=uint64_t(t["baseEligible"].as<double>()*1000+.5);
  bool demo=t["demo"]|false,canDig=eligible(t);uint32_t stars=Rules::stars(base,elapsed,canDig,demo),finds[4]={};
  const String completedDay=formal(t)&&complete?day(time(nullptr)):"";
  JsonDocument gold;gold.to<JsonArray>();
  if(canDig){
   if(demo){if(elapsed>=9000&&t["rewardVersion"]!=2)finds[Rules::hash(t["id"].as<const char*>())%4]++;}
   else for(uint64_t n=base/600000+1;n<=(base+elapsed)/600000;n++){
    String ordinal=String((unsigned long long)n),key=ordinal+":loop-pet";
    String materialSeed=t["rareSeed"]|"eumo";if(!materialSeed.length())materialSeed="eumo";
    String materialRoll=materialSeed+":material:"+ordinal;
    if(t["rewardVersion"]!=2||double(Rules::hash(materialRoll.c_str()))/4294967296.0<.4)finds[Rules::hash(key.c_str())%4]++;
    String seed=t["rareSeed"]|"";if(seed.length()&&n>state["rareClaimed"].as<uint64_t>()){
     String roll=seed+":gold-roll:"+String((unsigned long long)n);
     if(Rules::golden(Rules::rareHash(roll.c_str()))){String item=seed+":gold-item:"+String((unsigned long long)n);const char *id=catalog["treasures"][Rules::rareHash(item.c_str())%10]["id"];state["rareInventory"][id]=state["rareInventory"][id].as<int>()+1;gold.add(id);}
    }
   }
  }
  state["depth"]=liveDepth();state["balance"]=state["balance"].as<int>()+stars;
  for(int i=0;i<4;i++)state["inventory"][i]=state["inventory"][i].as<int>()+finds[i];rememberFinds();
  if(formal(t)){state["eligibleSeconds"]=state["eligibleSeconds"].as<double>()+elapsed/1000.0;state["totalSeconds"]=state["totalSeconds"].as<double>()+elapsed/1000.0;state["rareClaimed"]=max(state["rareClaimed"].as<uint64_t>(),(base+elapsed)/600000);}
  if(complete)state["sessions"]=state["sessions"].as<int>()+1;
  if(elapsed){JsonArray history=state["history"];int count=history.size();history.add(nullptr);for(int i=count;i>0;i--)history[i].set(history[i-1]);JsonObject h=history[0].to<JsonObject>();h["id"]=t["id"];h["at"]=nowMs();h["startedAt"]=t["startedAt"];h["seconds"]=elapsed/1000.0;h["mode"]=t["mode"];h["demo"]=demo;h["task"]=t["task"];h["note"]="";h["stars"]=stars;h["depth"]=Rules::depth(elapsed,canDig,demo);h["outcome"]=complete?"complete":"stopped";h["daySeconds"]=t["daySeconds"];for(int i=0;i<4;i++)h["finds"][i]=finds[i];h["golden"]=gold;
   if(completedDay.length())h["completedDay"]=completedDay;
   auto collected=h["collected"].to<JsonArray>();String id=t["id"]|"";if(canDig&&demo){if(elapsed>=9000)collected.add(id+":find");if(elapsed>=15000)collected.add(id+":star");}
   else if(canDig)for(uint64_t n=base/300000+1;n<=(base+elapsed)/300000;n++){if(n%2==0)collected.add(id+":find:"+String((unsigned long long)(n/2)));collected.add(id+":star:"+String((unsigned long long)n));}
  }
  if(completedDay.length()){const char *f=t["mode"]=="work"?"workCompleted":"completed";state["reportDays"][completedDay][f]=state["reportDays"][completedDay][f].as<int>()+1;}
  state["session"]=nullptr;state["idleAt"]=nowMs();visit=state["depth"].as<double>();notice="Saved +"+String(stars)+" stars";save();
 }
 JsonVariantConst item(const char *group,const String &id)const{for(JsonVariantConst i:catalog[group].as<JsonArrayConst>())if(i["id"]==id)return i;return JsonVariantConst();}
 void rememberFinds(){if(!state["foundDiscoveries"].is<JsonArray>())state["foundDiscoveries"].to<JsonArray>();for(int i=0;i<4;i++){String id=catalog["home"]["materials"][i]["id"];if(state["inventory"][i].as<int>()>0&&!contains(state["foundDiscoveries"],id))state["foundDiscoveries"].as<JsonArray>().add(id);}}
 bool buy(const String &id,bool tool){
  auto i=item(tool?"tools":"items",id);if(i.isNull())return false;const char *ownedKey=tool?"ownedTools":"owned";
  JsonArray owned=state[ownedKey].as<JsonArray>();if(!contains(owned,id)){int price=i["cost"];if(state["balance"].as<int>()<price){notice="Not enough stars";return false;}state["balance"]=state["balance"].as<int>()-price;owned.add(id);}
  if(tool)state["tool"]=id;else{JsonArray eq=state["equipped"].as<JsonArray>();if(contains(eq,id))remove(eq,id);else{for(int n=int(eq.size())-1;n>=0;n--)if(item("items",eq[n].as<String>())["category"]==i["category"])eq.remove(n);eq.add(id);}}
  save();return true;
 }
 int spare(int index)const{String id=String("find:")+catalog["home"]["materials"][index]["id"].as<String>();int n=state["inventory"][index];for(JsonPairConst p:state["home"]["slots"].as<JsonObjectConst>())if(p.value()==id)n--;if(state["heldItem"]==catalog["home"]["materials"][index]["id"])n--;return max(0,n);}
 JsonVariantConst homeItem(const String &id,bool theme=false)const{for(JsonVariantConst i:catalog["home"][theme?"themes":"items"].as<JsonArrayConst>())if(i["id"]==id)return i;return JsonVariantConst();}
 bool homeBuy(const String &id,bool theme=false){
  if(running()){notice="Pause before decorating";return false;}auto i=homeItem(id,theme);if(i.isNull())return false;JsonArray owned=state["home"][theme?"ownedThemes":"owned"].as<JsonArray>();
  if(!contains(owned,id)){if(!i["recipe"].isNull()){for(int k=0;k<4;k++){const char *m=catalog["home"]["materials"][k]["id"];if(spare(k)<i["recipe"][m].as<int>()){notice="Need more spare materials";return false;}}rememberFinds();for(int k=0;k<4;k++){const char *m=catalog["home"]["materials"][k]["id"];state["inventory"][k]=state["inventory"][k].as<int>()-i["recipe"][m].as<int>();}}
   else {int price=i["cost"]|0;if(state["balance"].as<int>()<price){notice="Not enough stars";return false;}state["balance"]=state["balance"].as<int>()-price;}owned.add(id);}
  if(theme)state["home"]["theme"]=id;save();return true;
 }
 bool place(const String &id,const String &slot){
  if(running()||catalog["home"]["slots"][slot].isNull())return false;
  if(id==""){state["home"]["slots"][slot]=nullptr;save();return true;}
  if(id.startsWith("find:")){int n=-1;for(int k=0;k<4;k++)if(catalog["home"]["materials"][k]["id"]==id.substring(5))n=k;if(n<0||slot=="floor"||spare(n)<1)return false;}
  else {auto i=homeItem(id);if(!contains(state["home"]["owned"],id)||!contains(i["slots"],slot))return false;for(JsonPair p:state["home"]["slots"].as<JsonObject>())if(p.value()==id)p.value().set(nullptr);}
  state["home"]["slots"][slot]=id;save();return true;
 }
 bool sell(const String &id){int n=state["rareInventory"][id]|0;if(n<=(state["displayedTreasure"]==id?1:0)){notice="Displayed treasure is reserved";return false;}state["rareInventory"][id]=n-1;state["balance"]=state["balance"].as<int>()+99;save();return true;}
 bool importSave(const String &text){
  if(active()){notice="Finish session before import";return false;}JsonDocument wrapper,tmp;if(deserializeJson(wrapper,text)){notice="Invalid backup";return false;}
  if(wrapper["format"]!="eumo-progress"||wrapper["version"]!=1||deserializeJson(tmp,wrapper["storage"]["loop-pet-soft-universe-v1"].as<String>())||!valid(tmp.as<JsonVariantConst>())){notice="Invalid / running backup";return false;}
  normalize(tmp);for(const char *key:{"eumo-language","eumo-appearance","eumo-tour-v1"})if(wrapper["storage"][key].is<const char*>())tmp["_deviceStorage"][key]=wrapper["storage"][key];
  JsonDocument before;before.set(state);state.set(tmp);if(!save()){state.set(before);return false;}visit=liveDepth();return true;
 }
 String exportSave(){JsonDocument copy;copy.set(state);if(active()){copy["session"]["status"]="paused";copy["session"]["remaining"]=remaining();copy["session"]["trackedAt"]=nowMs();}String inner;serializeJson(copy,inner);JsonDocument wrapper;wrapper["format"]="eumo-progress";wrapper["version"]=1;wrapper["storage"]["loop-pet-soft-universe-v1"]=inner;for(const char *key:{"eumo-language","eumo-appearance","eumo-tour-v1"})if(state["_deviceStorage"][key].is<const char*>())wrapper["storage"][key]=state["_deviceStorage"][key];String out;serializeJson(wrapper,out);return out;}
};
#endif
