#include <cassert>
#include <iostream>
#include "../../Eumo169/Game.h"
#include "../../Eumo169/SyncSnapshot.h"
#undef time
void init(Game &g){g.defaults();deserializeJson(g.catalog,CATALOG_JSON);g.mounted=true;g.previous=testMillis;}
void advance(Game &g,uint32_t ms){testMillis+=ms;testEpoch+=ms;g.tick(testMillis);}
void testDurationControls(){
 Game timer;init(timer);assert(timer.remainingSeconds()==1500);
 assert(timer.adjustMinutes(5)&&timer.state["minutes"]==30&&timer.remainingSeconds()==1800);
 assert(timer.adjustMinutes(-5)&&timer.state["minutes"]==25);
 assert(!timer.adjustMinutes(1)&&timer.state["minutes"]==25);
 timer.state["minutes"]=5;assert(!timer.canAdjustMinutes(-5)&&!timer.adjustMinutes(-5));
 timer.state["minutes"]=120;assert(!timer.canAdjustMinutes(5)&&!timer.adjustMinutes(5));
 assert(timer.adjustMinutes(-5));Game idleReload;idleReload.begin();assert(!idleReload.active()&&idleReload.state["minutes"]==115);
 timer.state["minutes"]=5;timer.start();timer.tick(testMillis);assert(timer.running()&&timer.remainingSeconds()==300);
 advance(timer,1250);assert(timer.remainingSeconds()==299);
 String id=timer.state["session"]["id"].as<String>();double elapsed=timer.state["session"]["elapsed"].as<double>(),depth=timer.liveDepth();
 assert(timer.adjustMinutes(5)&&timer.running()&&timer.remainingSeconds()==599);
 assert(timer.state["session"]["plannedSeconds"]==600&&timer.state["session"]["elapsed"].as<double>()==elapsed);
 assert(timer.state["session"]["id"]==id&&timer.liveDepth()==depth&&timer.state["balance"]==0&&timer.state["history"].size()==0);
 assert(!timer.canAdjustMinutes(-5)&&!timer.adjustMinutes(-5)&&timer.remainingSeconds()==599);
 timer.start();assert(timer.active()&&!timer.running());advance(timer,20000);
 assert(timer.adjustMinutes(5)&&!timer.running()&&timer.remainingSeconds()==899);
 assert(!timer.adjustMinutes(-5)&&timer.state["session"]["elapsed"].as<double>()==elapsed&&timer.liveDepth()==depth);
 Game reloaded;reloaded.begin();assert(reloaded.active()&&!reloaded.running());
 assert(reloaded.state["session"]["id"]==id&&reloaded.state["session"]["plannedSeconds"]==900);
 assert(reloaded.remainingSeconds()==899&&reloaded.state["session"]["elapsed"].as<double>()==elapsed);
 timer.state["session"]["plannedSeconds"]=7190;assert(timer.adjustMinutes(5)&&timer.state["session"]["plannedSeconds"]==7200);
 assert(!timer.canAdjustMinutes(5)&&!timer.adjustMinutes(5));
 Game demo;init(demo);demo.start(true);assert(!demo.canAdjustMinutes(5)&&!demo.adjustMinutes(5));assert(demo.remainingSeconds()==15);
 // Time since the last frame is accounted before a plus tap; completion still
 // credits exactly once and cannot be extended after its original deadline.
 Game edge;init(edge);edge.state["minutes"]=5;edge.start();testMillis+=300000;testEpoch+=300000;
 assert(!edge.adjustMinutes(5)&&!edge.active());assert(edge.state["minutes"]==5);
 assert(edge.state["history"].size()==1&&edge.state["history"][0]["seconds"]==300&&edge.state["history"][0]["outcome"]=="complete");
 auto stars=edge.state["balance"].as<int>();edge.tick(testMillis);edge.finish();assert(edge.state["history"].size()==1&&edge.state["balance"]==stars);
}
int main(){
 std::cerr.precision(17);
 setTestTimezone();FFat.begin();
 testDurationControls();
 Game g;init(g);g.start();advance(g,300000);assert(g.state["session"]["elapsed"]==300);assert(g.liveDepth()==10);g.finish();assert(g.state["balance"]==1);assert(g.state["depth"]==10);assert(g.state["eligibleSeconds"]==300);
 g.finish();assert(g.state["balance"]==1);assert(g.state["history"].size()==1);
 g.start();assert(g.state["session"]["rewardVersion"]==2);g.state["session"]["rewardVersion"]=1;advance(g,300000);g.finish();assert(g.state["balance"]==2);int finds=0;for(auto x:g.state["inventory"].as<JsonArray>())finds+=x.as<int>();assert(finds==1);
 g.state["mode"]="rest";g.start();advance(g,60000);g.finish();assert(g.state["balance"]==2);assert(g.state["depth"]==20);assert(g.state["totalSeconds"]==600);
 g.start(true);advance(g,15000);assert(!g.active());assert(g.state["balance"]==3);assert(g.state["totalSeconds"]==600);assert(g.state["depth"]==25);
 g.state["mode"]="study";g.start();advance(g,10000);g.start();double before=g.liveDepth();advance(g,60000);assert(g.liveDepth()==before);g.start();advance(g,10000);g.finish();assert(g.state["eligibleSeconds"]==620);
 g.state["balance"]=100;assert(g.buy("hat",false));assert(g.state["balance"]==97);assert(g.buy("hat",false));assert(g.state["balance"]==97);assert(!Game::contains(g.state["equipped"],"hat"));assert(g.buy("sunhat",false));assert(g.buy("hat",false));assert(g.state["equipped"].size()==1);assert(!g.buy("unknown",false));
 g.state["balance"]=0;assert(!g.buy("crown",false));assert(!Game::contains(g.state["owned"],"crown"));
 g.state["inventory"][1]=2;g.state["home"]["slots"]["left"]="find:mushroom";assert(!g.homeBuy("mushroomLamp"));g.state["home"]["slots"]["left"]=nullptr;assert(g.homeBuy("mushroomLamp"));assert(g.state["inventory"][1]==0);assert(g.homeBuy("mushroomLamp"));assert(g.place("mushroomLamp","left"));assert(!g.place("mushroomLamp","wall"));assert(g.place("mushroomLamp","right"));assert(g.state["home"]["slots"]["left"].isNull());
 g.state["rareInventory"]["gold-camera"]=1;g.state["displayedTreasure"]="gold-camera";assert(!g.sell("gold-camera"));g.state["displayedTreasure"]=nullptr;assert(g.sell("gold-camera"));assert(g.state["balance"]==99);assert(!g.sell("gold-camera"));
 String backup=g.exportSave();Game imported;init(imported);assert(imported.importSave(backup));assert(std::abs(imported.state["depth"].as<double>()-g.state["depth"].as<double>())<1e-6);assert(imported.state["balance"]==99);assert(!imported.importSave("{}"));assert(imported.state["balance"]==99);
 FFat.fail=true;g.state["balance"]=120;assert(!imported.importSave(g.exportSave()));assert(imported.state["balance"]==99);FFat.fail=false;
 Game rollover;init(rollover);testMillis=UINT32_MAX-500;rollover.start();advance(rollover,1000);assert(rollover.state["session"]["elapsed"]==1);
 Game midnight;init(midnight);testEpoch=1794527999000ULL;midnight.start();advance(midnight,2000);assert(midnight.state["reportDays"].size()==2);for(auto d:midnight.state["reportDays"].as<JsonObject>())assert(d.value()["seconds"]==1);
 assert(midnight.save());Game loaded;loaded.begin();assert(loaded.active());assert(!loaded.running());assert(loaded.state["session"]["elapsed"]==2);
 assert(loaded.state["session"]["remaining"]==loaded.remaining());
 Game legacy;init(legacy);legacy.state.remove("ownedTools");legacy.state.remove("equipped");legacy.state.remove("foundDiscoveries");legacy.state["_deviceStorage"]["eumo-language"]="zh";legacy.state["_deviceStorage"]["eumo-appearance"]="night";Game restored;init(restored);assert(restored.importSave(legacy.exportSave()));assert(restored.state["ownedTools"].is<JsonArray>());JsonDocument roundtrip;deserializeJson(roundtrip,restored.exportSave());assert(roundtrip["storage"]["eumo-language"]=="zh");assert(roundtrip["storage"]["eumo-appearance"]=="night");
 assert(g.state["history"][0]["seconds"]==20);assert(g.state["foundDiscoveries"].size()>0);
 double allDepth=g.liveDepth();g.state["surfaceDepth"]=allDepth;assert(g.worldDepth()==0);assert(g.liveDepth()==allDepth);g.start();advance(g,30000);assert(std::abs(g.worldDepth()-1)<1e-9);g.finish();assert(std::abs(g.liveDepth()-allDepth-1)<1e-9);
 JsonDocument fixtures;std::ifstream input("reference.json");assert(!deserializeJson(fixtures,input));unsigned cases=0;
 for(auto row:fixtures.as<JsonArray>()){
  Game actual;init(actual);actual.state["session"]=row["s"];actual.state["session"]["status"]="paused";actual.state["session"]["startedAt"]=testEpoch;actual.state["session"]["daySeconds"].to<JsonObject>();actual.finish();
  double expectedDepth=std::stod(row["depth"].as<std::string>()); // preserve JavaScript double precision through JSON parsing
  assert(actual.state["balance"]==row["stars"]);assert(std::abs(actual.state["depth"].as<double>()-expectedDepth)<1e-10);
  for(int i=0;i<4;i++)assert(actual.state["inventory"][i]==row["finds"][i]);
  int gold=0;for(JsonPair p:actual.state["rareInventory"].as<JsonObject>())gold+=p.value().as<int>();assert(gold==int(row["golden"].size()));
  for(auto id:row["golden"].as<JsonArray>())assert(actual.state["rareInventory"][id.as<String>()].as<int>()>0);cases++;
 }
 Game sync;init(sync);sync.state["rareSeed"]="seed0";sync.start();advance(sync,600000);sync.finish();JsonDocument payload;assert(fillDigSnapshot(sync,payload.to<JsonObject>()));
 assert(payload["version"]==3);assert(payload["status"]=="idle");assert(payload["depth"]==20);assert(payload["seconds"]==600);assert(payload["records"].size()==1);assert(payload["earned"]["stars"]==2);assert(payload["earned"]["sessions"]==0);assert(payload["records"][0]["daySeconds"].size()>0);
 std::ofstream protocol("device-snapshot.json");serializeJson(payload,protocol);protocol.close();
 String settledBackup=sync.exportSave(),originalId=sync.state["history"][0]["id"].as<String>();
 Game deviceImport;init(deviceImport);assert(deviceImport.importSave(settledBackup));
 assert(fillDigSnapshot(deviceImport,payload.to<JsonObject>()));assert(payload["records"][0]["id"]==originalId);assert(payload["depth"]==20&&payload["seconds"]==600);
 const String sourceDevice="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
 deviceImport.state["history"][0]["id"]="device:"+sourceDevice+":"+originalId;deviceImport.state["history"][0]["sourceDevice"]=sourceDevice;
 // Old browser imports had the wrapper only; new imports also retain the ID.
 assert(fillDigSnapshot(deviceImport,payload.to<JsonObject>()));assert(payload["records"][0]["id"]==originalId);
 deviceImport.state["history"][0]["sourceSessionId"]=originalId;
 assert(fillDigSnapshot(deviceImport,payload.to<JsonObject>()));assert(payload["earned"]["stars"]==2);
 // Keep the original local history and recognize an identical backup copy.
 deviceImport.state["history"].as<JsonArray>().add(sync.state["history"][0]);
 assert(fillDigSnapshot(deviceImport,payload.to<JsonObject>()));assert(payload["records"].size()==1);assert(deviceImport.state["history"].size()==2);
 String syncError;deviceImport.state["history"][1]["stars"]=99;
 assert(!fillDigSnapshot(deviceImport,payload.to<JsonObject>(),&syncError));assert(syncError=="Backup history conflicts; sync paused");assert(deviceImport.state["balance"]==2);
 deviceImport.state["history"].as<JsonArray>().remove(1);deviceImport.state["depth"]=30;
 assert(!fillDigSnapshot(deviceImport,payload.to<JsonObject>(),&syncError));assert(syncError=="Backup history incomplete; sync paused");assert(deviceImport.state["depth"]==30);
 deviceImport.state["depth"]=20;deviceImport.start();advance(deviceImport,30000);deviceImport.finish();
 assert(fillDigSnapshot(deviceImport,payload.to<JsonObject>()));assert(payload["records"].size()==2);assert(payload["depth"]==21&&payload["seconds"]==630);
 Game completion;init(completion);completion.state["minutes"]=5;completion.start();advance(completion,300000);
 String completedDay=Game::day(testEpoch/1000);assert(completion.state["history"][0]["completedDay"]==completedDay);assert(completion.state["reportDays"][completedDay]["completed"]==1);
 assert(fillDigSnapshot(completion,payload.to<JsonObject>()));assert(payload["records"][0]["completedDay"]==completedDay);
 sync.start();advance(sync,30000);assert(fillDigSnapshot(sync,payload.to<JsonObject>()));assert(payload["depth"]==21&&payload["seconds"]==630&&payload["status"]=="digging");
 std::cout<<"PASS: "<<cases<<" original-JavaScript reward fixtures; countdown bounds, live/paused extension, zero-delta ticks, deadline settlement once, demo exclusion, pause, rollover, midnight, purchases, craft reservations, slots, sale reservations, import rollback, reboot checkpoint, original-ID backup round trips, ambiguous-history sync guard, completed-day provenance, actual device protocol snapshot\n";
}
