#pragma once
constexpr int CHAT_ROWS=7;
template<class Emit>void eachChatLine(Emit emit){
 for(JsonVariantConst message:network.chat.as<JsonArrayConst>()){
  emit(message["role"]=="user"?String("You"):String("Mole"),true);
  eachTextLine(message["content"].as<String>(),208,[&](const String &line){emit(line,false);});
 }
}
void chatScreen(){
 targetCount=0;screen->fillScreen(rgb(BG));header("Chat");
 int count=0;eachChatLine([&](const String&,bool){count++;});
 chatOffset=constrain(chatOffset,0,max(0,count-CHAT_ROWS));int row=0;
 eachChatLine([&](const String &line,bool heading){int visible=row++-chatOffset;if(visible>=0&&visible<CHAT_ROWS)label(16,37+visible*18,line,1,heading?GOLD:PAPER,true);});
 if(count==0)label(16,50,"Say hello to your mole.",1,PAPER,true);
 String status=network.busy?"Waiting for reply...":network.error.length()?network.error:WiFi.status()!=WL_CONNECTED?"Offline - connect Wi-Fi":"Original website AI";
 label(12,166,status.substring(0,35),1,network.error.length()?0xF0A08A:GOLD);
 button(12,181,65,27,"Up","chatup");button(85,181,65,27,"Down","chatdown");button(158,181,70,27,"Options","go:chatoptions");
 button(12,212,216,25,network.busy?"Waiting...":"Write message","chatinput");footer();screen->flush();
}
