#pragma once
#include "Game.h"
#include <map>
#include <string>
#include <cmath>
#include <cctype>

// Preserve the original settlement identity across web -> device -> web backups.
// Do not guess from totals or strip arbitrary prefixes from ordinary session IDs.
inline String digRecordId(JsonVariantConst h){
  String id=h["id"]|"",device=h["sourceDevice"]|"";
  if(device.length()!=64)return id;
  for(char ch:device)if(!isxdigit(static_cast<unsigned char>(ch)))return id;
  String prefix=String("device:")+device+":";
  if(!id.startsWith(prefix))return id;
  String original=h["sourceSessionId"]|"";
  return original.length()?original:id.substring(prefix.length());
}

// Protocol v3 keeps the original cumulative counters. Imported settlements are
// retained with stable IDs, so a browser can recognize ones already in its save.
// An incomplete/ambiguous backup is kept locally but must not mint cloud credit.
inline bool fillDigSnapshot(Game &game, JsonObject s, String *error=nullptr){
  auto fail=[&](const char *message){if(error)*error=message;return false;};
  if(error)*error="";
  s["version"]=3;s["reportDays"]=game.state["reportDays"];
  s["sessionElapsed"]=game.active()?game.state["session"]["elapsed"].as<double>():game.state["history"][0]["seconds"].as<double>();
  s["depth"]=game.liveDepth();s["seconds"]=game.state["totalSeconds"].as<double>()+(game.active()&&game.formal(game.state["session"])?game.state["session"]["elapsed"].as<double>():0);
  s["status"]=game.running()&&game.eligible(game.state["session"])?"digging":game.active()?"paused":"idle";
  s["name"]=game.state["profile"]["name"];s["color"]=game.state["profile"]["color"];s["equipped"]=game.state["equipped"];s["tool"]=game.state["tool"];
  auto earned=s["earned"].to<JsonObject>();earned["stars"]=0;earned["sessions"]=0;
  auto finds=earned["finds"].to<JsonArray>();for(int i=0;i<4;i++)finds.add(0);
  auto golden=earned["golden"].to<JsonObject>();auto records=s["records"].to<JsonArray>();
  std::map<std::string,size_t> recordIndex;
  double recordedDepth=0,recordedSeconds=0;
  for(JsonVariantConst h:game.state["history"].as<JsonArrayConst>()){
   JsonDocument row;auto r=row.to<JsonObject>();
   for(const char *key:{"at","startedAt","seconds","depth","stars","mode","outcome","demo","finds","golden","daySeconds"})r[key]=h[key];
   r["demo"]=h["demo"].as<bool>();
   String id=digRecordId(h);if(!id.length())return fail("Backup history has no session ID");r["id"]=id;
   if(h["completedDay"].is<const char*>())r["completedDay"]=h["completedDay"];
   if(r["startedAt"].isNull())r["startedAt"]=h["at"];if(r["depth"].isNull())r["depth"]=0;
   if(r["golden"].isNull())r["golden"].to<JsonArray>();
   if(r["daySeconds"].isNull())r["daySeconds"].to<JsonObject>();
   auto found=recordIndex.find(id.c_str());
   if(found!=recordIndex.end()){
    // Identical copies may occur in old round-trip backups. Conflicting records
    // with the same identity cannot be resolved safely by the device.
    if(records[found->second].as<JsonObjectConst>()!=JsonObjectConst(r))return fail("Backup history conflicts; sync paused");
    continue;
   }
   recordIndex.emplace(id.c_str(),records.size());records.add(r);
   recordedDepth+=r["depth"].as<double>();
   if(!r["demo"].as<bool>()&&(r["mode"]=="study"||r["mode"]=="work"))recordedSeconds+=r["seconds"].as<double>();
   earned["stars"]=earned["stars"].as<unsigned>()+r["stars"].as<unsigned>();
   if(r["outcome"]=="complete")earned["sessions"]=earned["sessions"].as<unsigned>()+1;
   for(int i=0;i<4;i++)finds[i]=finds[i].as<unsigned>()+r["finds"][i].as<unsigned>();
   for(JsonVariantConst item:r["golden"].as<JsonArrayConst>()){String key=item.as<String>();golden[key]=golden[key].as<unsigned>()+1;}
  }
  // Do not silently treat an imported aggregate with missing history as new
  // device activity. Keep the user's save untouched for backup/manual review.
  if(std::abs(recordedDepth-game.state["depth"].as<double>())>.000001||std::abs(recordedSeconds-game.state["totalSeconds"].as<double>())>.001)
   return fail("Backup history incomplete; sync paused");
  return true;
}
