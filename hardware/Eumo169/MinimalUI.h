#pragma once
// Only these pages are reachable on the simplified device. The saved original
// game data stays intact so existing web equipment and progress are not lost.
bool minimalPage(const String &p){return p=="pairScreen"||p=="records"||p=="displaytest"||p=="startHelp"||p=="wifiDetails"||p=="sync"||p=="focus"||p=="settings"||p=="wifi"||p=="keyboard"||p=="confirm";}
void iconTarget(int x,int y,int w,int h,const String &cmd){if(targetCount<64)targets[targetCount++]={x,y,w,h,cmd};}
#include "PetMotion.h"
#include "TerrainArt.h"
// Camera only: browsing never edits depth, elapsed time, or the running session.
int discoveryPage=0;
bool mineBrowsing=false,mineGesture=false,mineDragged=false;
int mineCamera=0,mineStartY=0,mineStartX=0,mineStartCamera=0;
String mineTapCommand;
int mineMaximum(){return max(-70,76+int(game.worldDepth()*6)-200);}
int sceneCamera(){return mineBrowsing?constrain(mineCamera,-70,mineMaximum()):mineMaximum();}
void followMole(){mineBrowsing=false;mineGesture=false;mineDragged=false;}
void dragMineTo(int y){
 mineCamera=constrain(mineStartCamera-(y-mineStartY),-70,mineMaximum());
 mineBrowsing=mineCamera<mineMaximum();
}
void diggingScene(){
 double depth=game.liveDepth(),world=game.worldDepth();auto sky=skyPalette();unsigned frame=millis()/120;
 int end=76+int(world*6),camera=sceneCamera(),ground=87-camera;
 screen->fillScreen(rgb(sky.sky));
 for(int y=0;y<min(280,ground);y++){double t=constrain((y+camera)/160.0,0.0,1.0);uint32_t color=0;for(int shift=0;shift<24;shift+=8)color|=uint32_t(lround(((sky.sky>>shift)&255)*(1-t)+((sky.skyLow>>shift)&255)*t))<<shift;rect(0,y,240,1,color);}
 if(ground>0){
  auto cloud=[](int x,int y,uint32_t color){rect(x+8,y,18,6,color);rect(x+3,y+6,33,7,color);rect(x,y+13,42,7,color);};
  if(!sky.night){cloud(8,31-camera,sky.cloud);cloud(176,15-camera,sky.cloudBack);}
  rect(181,28-camera,16,16,sky.sun);if(sky.night){rect(187,24-camera,13,15,sky.sky);for(int i=0;i<16;i++)rect(int(terrainRandom(i,1)*240),int(terrainRandom(i,6)*80)-camera,1,1,0xa7c4ad);}
  for(int x=0;x<240;x+=8){int hh=10+int(floor(sin((x+72)*.04)*8+cos((x+72)*.083)*5));rect(x,ground-hh,8,hh,sky.mountain);}
  rect(0,ground-5,240,5,sky.grass);rect(0,ground,240,4,sky.grassShadow);
 }
 paintTerrain(camera,frame,world);
 for(int wy=max(87,87+int(floor((camera-95)/4.0))*4);wy<min(end+7,camera+288);wy+=4){double d=(wy-131)/6.0;int cx=120+int(lround(sin(max(0.0,d)*.13)*3))*4,sy=wy-camera;rect(cx-37,sy,74,5,0x344d43);rect(cx-32,sy,64,5,0x243a35);rect(cx-39,sy,3,5,0x96a26c);rect(cx+36,sy,3,5,0x536244);rect(cx-22,sy,2,4,0xad8a7e);rect(cx-10,sy,2,4,0xad8a7e);if(wy%16==7)rect(cx-23,sy,15,2,0xe0b490);}
 if(ground>-35){rect(22,ground-31,2,26,0xb58a91);rect(24,ground-32,28,14,0xfa9ccc);rect(28,ground-28,15,2,0xfff0d7);rect(41,ground-26,4,4,0xfff0d7);rect(57,ground-12,24,12,0xbc8e79);rect(59,ground-15,20,3,0xe7b79a);rect(66,ground-13,4,13,0x4c395b);}
 int cx=120+int(lround(sin(max(0.0,world)*.13)*3))*4,my=end-camera-43-petLift();
 rect(cx-22,end-camera+7,48,4,0x13162d);
 artCX=cx-25+27;artCY=my+32;artAngle=petAngle();mole(cx-25,my,2);artAngle=0;
 if(my+70>36&&my-14<228)iconTarget(cx-32,max(36,my-14),80,min(100,228-max(36,my-14)),"moleJump");
 if(game.running())for(int i=0;i<5;i++){int k=(frame+i*3)%12,dir=i%2?1:-1;rect(cx+dir*(14+k*3),end-camera-5-int(floor(sin(k/12.0*3.141592653589793)*18)),3+(i%2)*2,3,0xc1a16e);}
 // Elapsed session time stays visible, including after pausing/finishing.
 double elapsed=game.active()?game.state["session"]["elapsed"].as<double>():game.state["history"][0]["seconds"].as<double>();
 String clock=duration(elapsed);int clockW=textWidth(clock,20);rect(224-clockW-6,8,clockW+12,28,0x302E39);label(224-clockW,10,clock,2);
 // Keep depth visible after removing Chat.
 String value=String(depth,1)+"m";int fontSize=textWidth(value,20)>100?12:20,w=textWidth(value,fontSize)+12;
 rect(230-w,242,w,26,0x302E39);label(224-textWidth(value,fontSize),243,value,fontSize==20?2:1);
 iconTarget(230-w,238,w,34,"followMole");
 rect(12,232,40,36,0x302E39);
 if(game.running()){rect(23,242,5,17,PAPER);rect(34,242,5,17,PAPER);}else for(int i=0;i<12;i++)rect(24+i,240+i/2,1,20-i,PAPER);
 iconTarget(8,228,48,44,"start");
 if(game.active()){rect(64,232,48,36,0x713F38);label(73,242,"END",1,PAPER);iconTarget(60,228,52,44,"confirm:finish");}
 // Discreet setup target; setup is never mixed into the digging scene.
 for(int y:{14,20,26})rect(17,y,3,3,PAPER);iconTarget(4,4,36,36,"go:settings");
 // Surface and discoveries: separate from returning to the live mole.
 rect(51,13,3,13,PAPER);for(int i=0;i<6;i++)rect(47+i,12-i,11-2*i,1,PAPER);iconTarget(42,4,30,32,"surface");
 rect(84,11,18,15,0x302E39);for(int i=0;i<3;i++)rect(87,14+i*4,12,1,PAPER);iconTarget(78,4,32,32,"go:records");
 if(mineBrowsing){ // Down arrow: return to the active mole without scrolling back.
  rect(12,46,32,30,0x302E39);rect(26,52,4,12,PAPER);
  for(int i=0;i<7;i++)rect(21+i,62+i,14-2*i,1,PAPER);
  iconTarget(8,42,40,38,"followMole");
 }
 if(game.notice.length()){rect(8,45,224,42,0x713F38);wrap(13,49,game.notice,34,2);}
}
void wifiScreen(){
 targetCount=0;screen->fillScreen(rgb(BG));header("Wi-Fi");
 label(12,36,network.connecting?"Connecting...":WiFi.status()==WL_CONNECTED?"Connected":"Choose nearby Wi-Fi",1,GOLD);
 if(WiFi.status()==WL_CONNECTED)label(12,50,network.ssid.substring(0,fitBytes(network.ssid,210,unicodeText(network.ssid))));
 int pages=max(1,(int(network.nearby.size())+2)/3);listPage=constrain(listPage,0,pages-1);
 if(network.scanning)label(12,86,"Scanning nearby networks...");
 else for(int row=0;row<3;row++){int i=listPage*3+row;if(i>=int(network.nearby.size()))break;auto &n=network.nearby[i];int y=70+row*41;button(12,y,216,38,"","wifiPick:"+String(i));label(18,y+3,n.name.substring(0,fitBytes(n.name,202,unicodeText(n.name))));label(18,y+23,String(n.rssi)+" dBm  "+(n.auth==0?"Open":"Password"));}
 if(!network.scanning&&!network.connecting&&WiFi.status()!=WL_CONNECTED)label(12,196,network.wifiNote.substring(0,36),1,GOLD);
 button(12,210,60,26,"<","wifiPrev");button(78,210,84,26,"Rescan","wifiScan");button(168,210,60,26,">","wifiNext");
 button(12,244,104,28,"Back","go:settings");button(124,244,104,28,"More","go:wifiDetails");screen->flush();
}
bool revealPassword=false;
String keyboardCharacters(){
 if(keyboardPage=="abc")return "abcdefghijklmnopqrstuvwxyz ";
 if(keyboardPage=="ABC")return "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";
 if(keyboardPage=="123")return "0123456789!@#$%^&*()-_=+.,/?";
 return R"keys([]{}\|;:'"<>`~)keys";
}
void inputKeyboard(){
 targetCount=0;screen->fillScreen(rgb(BG));bool password=inputPurpose=="password";header(password?"Wi-Fi password":inputPurpose);
 String title=password?pendingSsid:"Type your message";label(12,36,title.substring(0,fitBytes(title,password?156:212,unicodeText(title))));
 if(password)button(177,33,51,25,revealPassword?"Hide":"Show","showPassword");
 rect(12,62,216,17,0x40514C);String value=input;
 if(password&&!revealPassword){value="";for(unsigned i=0;i<input.length();i++)value+="*";}
 value=utfTail(value,max(0,int(value.length())-32));label(16,66,value.length()?value:"Tap keys below",1,PAPER);
 String chars=keyboardCharacters();for(unsigned i=0;i<chars.length();i++)button(12+(i%6)*36,83+(i/6)*27,33,25,chars[i]==' '?"SP":String(chars[i]),"char:"+String(chars[i]));
 button(12,222,68,25,keyboardPage=="abc"?"ABC":keyboardPage=="ABC"?"123":keyboardPage=="123"?"#+=":"abc","keys");button(86,222,68,25,"Delete","delete");button(160,222,68,25,password?"Connect":"Done","inputdone");button(12,251,216,25,"Cancel","cancelinput");screen->flush();
}
void render(){
 if(!minimalPage(page))page="focus";
 if(page=="pairScreen"){
  targetCount=0;screen->fillScreen(rgb(BG));header("Pair screen");
  if(network.screenRequest.length()){
   label(12,43,"Allow this computer?",1,GOLD);wrap(12,67,network.screenLabel,35,3);
   wrap(12,116,"Share study time, depth and discoveries with this browser.",35,4);
   button(12,175,216,32,"Confirm pairing","screenPairConfirm");button(12,214,216,28,"Reject / new code","screenPairStart");
  }else{
   label(12,42,network.screenLinked?"Paired":"Enter on website / app");
   if(network.screenCode.length()){label(82,69,network.screenCode,2,GOLD);label(12,104,"Expires in "+String(max(0,300-int(uint32_t(millis()-network.codeStarted)/1000)))+"s");}
   else label(12,78,network.busy?"Connecting...":"Tap New code to pair");
   wrap(12,128,network.screenPairError.length()?network.screenPairError:"Website: Connect little mole",35,3);
   button(12,175,216,32,"New code","screenPairStart");button(12,214,216,28,"Revoke paired browsers","screenPairRevoke");
  }button(12,247,216,28,"Back","go:settings");screen->flush();return;
 }
 if(page=="confirm"&&confirmation=="finish"){
  targetCount=0;screen->fillScreen(rgb(BG));header("End this session?");
  label(12,48,"Time "+duration(game.state["session"]["elapsed"].as<double>()));label(12,71,"Depth "+String(game.liveDepth(),1)+"m");
  wrap(12,103,"End and save this session. Your time, depth and discoveries stay saved. Next Start begins a new session.",35,6);
  button(12,201,216,32,"End and save","yes",0x713F38);button(12,242,216,30,"Keep session","cancel");screen->flush();return;
 }
 if(page=="records"){
  targetCount=0;screen->fillScreen(rgb(BG));header("Discovery records");int count=game.state["history"].size();
  if(!count)wrap(12,65,"Finish a study session to see its time and discoveries here.",35,5);
  else{
   discoveryPage=constrain(discoveryPage,0,count-1);auto h=game.state["history"][discoveryPage];
   label(12,40,"Record "+String(discoveryPage+1)+" / "+String(count));label(12,58,duration(h["seconds"].as<double>())+"  +"+String(h["depth"].as<double>(),1)+"m");
   for(int i=0;i<4;i++){int x=12+(i%2)*112,y=88+(i/2)*45;String id=game.catalog["home"]["materials"][i]["id"]|"";sprite("find_"+id,x,y,1);label(x+42,y+7,"x"+String(h["finds"][i].as<int>()));}
   label(12,184,"Rare finds: "+String(h["golden"].size()));
   button(12,211,104,28,"Newer","recordPrev");button(124,211,104,28,"Older","recordNext");
  }button(12,247,216,28,"Back to mole","go:focus");screen->flush();return;
 }
 if(page=="displaytest"){
  targetCount=0;screen->fillScreen(rgb(0x267D8C));rect(0,0,240,2,0xFFFFFF);rect(0,278,240,2,0xFFFFFF);rect(0,0,2,280,0xFFFFFF);rect(238,0,2,280,0xFFFFFF);
  rect(35,2,170,5,0xF4DA65);rect(35,273,170,5,0xF4DA65);rect(2,35,5,210,0xF4DA65);rect(233,35,5,210,0xF4DA65);
  label(48,85,"240 x 280",2);label(36,124,"Full active area");label(36,145,"Top / bottom markers");button(48,198,144,34,"Back","go:settings");screen->flush();return;
 }
 if(page=="startHelp"){
  targetCount=0;screen->fillScreen(rgb(BG));header("Start digging");
  label(12,43,game.mounted?"Storage: ready":"Storage: setup needed",1,game.mounted?PAPER:GOLD);
  label(12,65,game.clockReady()?"Clock: ready":"Clock: waiting for internet",1,game.clockReady()?PAPER:GOLD);
  label(12,87,WiFi.status()==WL_CONNECTED?"Wi-Fi: connected":"Wi-Fi: offline");
  wrap(12,112,!game.mounted?"Initialize storage once to save your digging progress.":!game.clockReady()?"Wi-Fi alone is not enough. Waiting for network time; then tap Start.":game.notice.length()?game.notice:"Ready. Tap Start below.",35,4);
  button(12,174,216,29,!game.mounted?"Initialize storage":"Wi-Fi settings",!game.mounted?"confirm:format":"go:wifi");
  button(12,212,216,28,"Start","start");button(12,247,216,28,"Back","go:focus");screen->flush();return;
 }
 if(page=="keyboard"){inputKeyboard();return;}
 if(page=="wifi"){wifiScreen();return;}
 if(page=="wifiDetails"){page="wifi";renderLegacy();page="wifiDetails";return;}
 if(page=="sync"){targetCount=0;screen->fillScreen(rgb(BG));header("Live sync");button(12,43,216,32,network.syncEnabled?"Sync: ON":"Sync: OFF","syncToggle");wrap(12,87,"Read-only viewing link:",35,2);wrap(12,121,"http://"+(network.portal?WiFi.softAPIP():WiFi.localIP()).toString()+"/sync",35,3);wrap(12,176,network.syncError.length()?network.syncError:"Open on your phone. Setup login is shown in Wi-Fi.",35,4);footer();screen->flush();return;}
 if(page!="focus"&&page!="settings"){renderLegacy();return;}
 targetCount=0;
 if(page=="focus")diggingScene();
 else {screen->fillScreen(rgb(BG));header("Setup");button(12,45,216,32,"Wi-Fi","go:wifi");button(12,87,216,32,game.mounted?"Save progress":"Initialize storage",game.mounted?"save":"confirm:format");button(12,129,104,32,"Pair screen","go:pairScreen");button(124,129,104,32,"Display test","go:displaytest");if(game.active())button(12,171,216,32,"End session","confirm:finish");footer();}
 screen->flush();
}
void command(String cmd){
 if(cmd=="surface"){mineBrowsing=true;mineCamera=-70;mineGesture=false;return;}
 if(cmd=="recordPrev"){discoveryPage=max(0,discoveryPage-1);return;}if(cmd=="recordNext"){discoveryPage++;return;}
 if(cmd=="screenPairStart"){network.startScreenPair();return;}
 if(cmd=="screenPairConfirm"){network.screenPairAction("confirm");return;}
 if(cmd=="screenPairRevoke"){network.screenPairAction("revoke");return;}
 if(cmd=="followMole"){followMole();return;}
 if(cmd=="chatinput"||cmd=="chatup"||cmd=="chatdown"||cmd=="shareChat"||cmd=="confirm:clearChat"||(cmd=="inputdone"&&inputPurpose=="message"))return;
 if(cmd=="chatup"){chatOffset=max(0,chatOffset-CHAT_ROWS);return;}if(cmd=="chatdown"){chatOffset+=CHAT_ROWS;return;}
 if(cmd=="inputdone"&&inputPurpose=="message")chatOffset=1000000;
 if(cmd=="moleJump"){tapMole();return;}
 if(cmd=="start"){
  bool wasRunning=game.running();game.notice="";
  if(!game.active()&&game.state["mode"]!="study"&&game.state["mode"]!="work")game.state["mode"]="study";
  game.start();idleSince=millis();clearPetMotion();
  if(!wasRunning&&!game.running()){page="startHelp";return;}
  go("focus");return;
 }

 if(cmd=="showPassword"&&page=="keyboard"){revealPassword=!revealPassword;return;}
 if(cmd=="keys"&&page=="keyboard"){keyboardPage=keyboardPage=="abc"?"ABC":keyboardPage=="ABC"?"123":keyboardPage=="123"?"symbols":"abc";return;}
 if(cmd=="inputdone"&&page=="keyboard"&&inputPurpose=="password"&&input.length()==0)return;
 if(cmd.startsWith("char:")&&page=="keyboard"&&inputPurpose=="password"&&input.length()>=63)return;
 if(cmd=="cancelinput")revealPassword=false;

 if(cmd=="wifiScan"){listPage=0;network.scanWiFi();return;}
 if(cmd=="wifiPrev"){listPage=max(0,listPage-1);return;}if(cmd=="wifiNext"){listPage++;return;}
 if(cmd.startsWith("wifiPick:")){
  int i=cmd.substring(9).toInt();if(network.scanning||network.connecting||i<0||i>=int(network.nearby.size()))return;
  auto n=network.nearby[i];pendingSsid=n.name;
  if(n.auth==5){network.wifiNote="Enterprise login unsupported";return;}
  if(n.auth==0)network.connect(pendingSsid,"");else {revealPassword=false;edit("password");}return;
 }

 if(cmd=="syncToggle"){network.toggleSync();return;}
 if(cmd.startsWith("go:")){String next=cmd.substring(3);if(minimalPage(next)){go(next);if(next=="wifi")network.scanWiFi();}return;}
 if(cmd=="back"){go("focus");return;}
 if(cmd.startsWith("confirm:")&&cmd!="confirm:format"&&cmd!="confirm:finish"&&cmd!="confirm:clearChat")return;
 bool allowed=cmd=="start"||cmd=="save"||cmd=="ssid"||cmd=="startAP"||cmd=="stopAP"||cmd=="shareChat"||cmd=="chatinput"||cmd=="chatup"||cmd=="chatdown"||cmd=="yes"||cmd=="cancel"||cmd=="delete"||cmd=="keys"||cmd=="cancelinput"||cmd=="inputdone"||cmd.startsWith("char:")||cmd.startsWith("confirm:");
 bool initialized=cmd=="yes"&&page=="confirm"&&confirmation=="format";
 bool ending=cmd=="yes"&&page=="confirm"&&confirmation=="finish";
 bool wasActive=game.active();if(allowed)commandLegacy(cmd);if(wasActive&&!game.active()){idleSince=millis();clearPetMotion();}
 if(ending&&!game.active()){discoveryPage=0;page=game.dirty?"startHelp":"records";}
 if(initialized){page="startHelp";if(!game.mounted)game.notice="Storage setup failed. Try again.";}
 if(!minimalPage(page))page="focus";
}
