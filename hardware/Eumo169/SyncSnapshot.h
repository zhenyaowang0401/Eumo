#pragma once
#include "Game.h"
// Device-to-web protocol: transmit settled records; never roll rewards on receipt.
inline void fillDigSnapshot(Game &game, JsonObject s){
  s["version"]=3;s["reportDays"]=game.state["reportDays"];
  s["sessionElapsed"]=game.active()?game.state["session"]["elapsed"].as<double>():game.state["history"][0]["seconds"].as<double>();
  s["depth"]=game.liveDepth();s["seconds"]=game.state["totalSeconds"].as<double>()+(game.active()&&game.formal(game.state["session"])?game.state["session"]["elapsed"].as<double>():0);
  s["status"]=game.running()&&game.eligible(game.state["session"])?"digging":game.active()?"paused":"idle";
  s["name"]=game.state["profile"]["name"];s["color"]=game.state["profile"]["color"];s["equipped"]=game.state["equipped"];s["tool"]=game.state["tool"];
  auto earned=s["earned"].to<JsonObject>();earned["stars"]=0;earned["sessions"]=0;
  auto finds=earned["finds"].to<JsonArray>();for(int i=0;i<4;i++)finds.add(0);
  auto golden=earned["golden"].to<JsonObject>();auto records=s["records"].to<JsonArray>();
  for(JsonVariantConst h:game.state["history"].as<JsonArrayConst>()){
   if(h["sourceDevice"].is<const char*>())continue; // Don't echo imported device records back to the web.
   auto r=records.add<JsonObject>();
   for(const char *key:{"id","at","startedAt","seconds","depth","stars","mode","outcome","demo","finds","golden","daySeconds"})r[key]=h[key];
   if(r["startedAt"].isNull())r["startedAt"]=h["at"];if(r["depth"].isNull())r["depth"]=0;
   if(r["golden"].isNull())r["golden"].to<JsonArray>();
   if(r["daySeconds"].isNull())r["daySeconds"].to<JsonObject>();
   earned["stars"]=earned["stars"].as<unsigned>()+h["stars"].as<unsigned>();
   if(h["outcome"]=="complete")earned["sessions"]=earned["sessions"].as<unsigned>()+1;
   for(int i=0;i<4;i++)finds[i]=finds[i].as<unsigned>()+h["finds"][i].as<unsigned>();
   for(JsonVariantConst id:h["golden"].as<JsonArrayConst>()){String key=id.as<String>();golden[key]=golden[key].as<unsigned>()+1;}
  }
}
