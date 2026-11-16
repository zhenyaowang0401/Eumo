#include <cassert>
#include <iostream>
#include "../../Eumo169/Game.h"
#include "../../Eumo169/SyncSnapshot.h"
#undef time
void init(Game &g){g.defaults();deserializeJson(g.catalog,CATALOG_JSON);g.mounted=true;g.previous=testMillis;}
void advance(Game &g,uint32_t ms){testMillis+=ms;testEpoch+=ms;g.tick(testMillis);}
int main(){
 std::cerr.precision(17);
 _putenv_s("TZ","UTC0");_tzset();FFat.begin();
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
 Game sync;init(sync);sync.state["rareSeed"]="seed0";sync.start();advance(sync,600000);sync.finish();JsonDocument payload;fillDigSnapshot(sync,payload.to<JsonObject>());
 assert(payload["version"]==3);assert(payload["status"]=="idle");assert(payload["depth"]==20);assert(payload["seconds"]==600);assert(payload["records"].size()==1);assert(payload["earned"]["stars"]==2);assert(payload["earned"]["sessions"]==0);assert(payload["records"][0]["daySeconds"].size()>0);
 std::ofstream protocol("device-snapshot.json");serializeJson(payload,protocol);protocol.close();
 sync.start();advance(sync,30000);fillDigSnapshot(sync,payload.to<JsonObject>());assert(payload["depth"]==21&&payload["seconds"]==630&&payload["status"]=="digging");
 std::cout<<"PASS: "<<cases<<" original-JavaScript reward fixtures; settlement once, demo exclusion, pause, rollover, midnight, purchases, craft reservations, slots, sale reservations, import rollback, reboot checkpoint, actual device protocol snapshot\n";
}
