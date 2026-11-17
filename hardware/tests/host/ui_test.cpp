#define EUMO_HOST_UI
#include <cassert>
#include <iostream>
#include "../../Eumo169/Application.h"
#undef time
void dump(const String &name){render();for(int i=0;i<targetCount;i++){auto t=targets[i];assert(t.w>0&&t.h>0&&t.x>=0&&t.y>=0&&t.x+t.w<=240&&t.y+t.h<=280);}std::ofstream f("ui-output/"+std::string(name)+".svg");f<<screen->svg();}
int main(){setTestTimezone();std::filesystem::create_directories("ui-output");game.defaults();deserializeJson(game.catalog,CATALOG_JSON);game.mounted=true;FFat.begin();
page="focus";dump("surface");assert(targetCount==6);
command("go:items");assert(page=="focus");command("go:friends");assert(page=="focus");command("buy");assert(game.state["balance"]==0);
game.state["depth"]=123.4;game.start();assert(game.running());dump("digging");command("start");assert(!game.running());double depth=game.liveDepth();dump("paused");command("go:chat");assert(page=="focus"&&game.liveDepth()==depth);command("chatinput");assert(page=="focus");command("go:chatoptions");assert(page=="focus");command("go:settings");dump("setup");command("confirm:finish");command("yes");assert(!game.active());assert(game.liveDepth()==depth);
for(auto p:{"wifi","confirm"}){page=p;dump(p);}page="items";render();assert(page=="focus");
command("go:wifi");assert(network.scanning);dump("wifi-scanning");network.scanning=false;network.nearby={{"Home 2.4GHz",-42,3},{"Guest",-60,0},{"School",-70,5},{"More network",-80,3}};dump("wifi-list");command("wifiNext");dump("wifi-next");command("wifiPrev");command("wifiPick:0");assert(page=="keyboard"&&pendingSsid=="Home 2.4GHz"&&inputPurpose=="password");input="example-password";command("inputdone");assert(network.connectedName=="Home 2.4GHz"&&network.connectedPassword==input&&page=="wifi");network.connecting=false;command("wifiPick:1");assert(network.connectedName=="Guest"&&network.connectedPassword=="");network.connecting=false;command("wifiPick:2");assert(network.wifiNote=="Enterprise login unsupported");command("go:wifiDetails");dump("wifi-details");
// Exercise the actual I2C-to-key route, not only command() calls.
network.connecting=false;network.scanning=false;page="wifi";render();pressed=false;testMillis+=100;
Wire.touch(25,80,0,1);touchIRQ=true;pollTouch();assert(page=="keyboard");
testMillis+=25;Wire.touch(25,80,1,0);touchIRQ=false;pollTouch();assert(!pressed);
for(int i=0;i<3;i++){testMillis+=75;Wire.touch(25,95,0,1);touchIRQ=true;pollTouch();testMillis+=25;Wire.touch(25,95,1,0);touchIRQ=false;pollTouch();}
assert(input=="aaa");
// Holding a key/contact report must not type repeatedly.
testMillis+=80;Wire.touch(60,95,0,1);touchIRQ=true;pollTouch();for(int i=0;i<5;i++){testMillis+=80;Wire.touch(60,95,2,1);touchIRQ=true;pollTouch();}assert(input=="aaab");
// A new down IRQ still works even when the up report was missed entirely.
testMillis+=80;Wire.touch(25,95,0,1);touchIRQ=true;pollTouch();assert(input=="aaaba");
String all;for(const char *p:{"abc","ABC","123","symbols"}){keyboardPage=p;all+=keyboardCharacters();dump(String("password-")+p);}for(int c=32;c<=126;c++)assert(all.find(char(c))!=std::string::npos);
keyboardPage="abc";command("showPassword");assert(revealPassword);dump("password-visible");command("showPassword");input="Aa123!";command("inputdone");assert(network.connectedPassword=="Aa123!");
game.finish();page="focus";game.mounted=false;command("start");assert(!game.running()&&page=="startHelp");dump("start-storage-needed");command("confirm:format");command("cancel");assert(!game.mounted&&!game.running());
game.mounted=true;auto epoch=testEpoch;testEpoch=0;command("start");assert(!game.running()&&page=="startHelp");dump("start-clock-needed");testEpoch=epoch;game.state["mode"]="rest";command("start");assert(game.running()&&game.state["session"]["mode"]=="study"&&page=="focus");double d0=game.liveDepth();testMillis+=10000;testEpoch+=10000;game.tick(testMillis);assert(game.liveDepth()>d0);command("start");assert(!game.running()&&page=="focus");
command("start");assert(game.running());render();bool endFound=false;for(int i=0;i<targetCount;i++)if(targets[i].command=="confirm:finish")endFound=true;assert(endFound);
double oldDepth=game.liveDepth(),oldElapsed=game.state["session"]["elapsed"].as<double>();command("moleJump");assert(!jumping);testMillis+=250;dump("jump");assert(game.liveDepth()==oldDepth&&game.state["session"]["elapsed"].as<double>()==oldElapsed);testMillis+=400;render();assert(!jumping);
command("confirm:finish");command("cancel");assert(game.active());command("confirm:finish");command("yes");assert(!game.active()&&game.liveDepth()==oldDepth);assert(game.state["history"][0]["seconds"].as<double>()==oldElapsed);page="focus";dump("finished");assert(screen->svg().find(duration(oldElapsed))!=std::string::npos);
game.notice="";clearPetMotion();idleSince=testMillis;testMillis+=89999;assert(mood()=="awake");testMillis++;assert(mood()=="drowsy");dump("drowsy");testMillis+=210000;assert(mood()=="asleep");dump("sleeping");
command("moleJump");assert(jumping&&!spinning&&mood()=="awake");testMillis+=250;dump("single-jump");command("moleJump");testMillis+=250;command("moleJump");assert(spinning);testMillis+=250;dump("spin");testMillis+=1200;render();assert(!jumping&&!spinning);
clearPetMotion();command("moleJump");testMillis+=600;command("moleJump");testMillis+=600;command("moleJump");assert(!spinning);clearPetMotion();
for(int i=0;i<7;i++){assert(layerAt(STRATA[i].from)==i);if(i)assert(layerAt(STRATA[i].from-.001)==i-1);game.state["depth"]=STRATA[i].from+10;game.state["surfaceDepth"]=0;dump(String("layer-")+String(i));}
for(int i=0;i<7;i++){screen->fillScreen(0);paintTerrain(int(STRATA[i].from*6),37,STRATA[i].from+1);std::ofstream f("ui-output/terrain-"+std::to_string(i)+".svg");f<<screen->svg();}
// Regressions for the photographed mixed-font / supplementary-Unicode corruption.
assert(displayText("Hi \xF0\x9F\x98\x82!")=="Hi [emoji]!");
assert(displayText("I\xE2\x80\x99m here")=="I'm here");
assert(!containsChinese("caf\xC3\xA9 \xF0\x9F\x98\x82"));assert(containsChinese("你好"));
assert(displayText(String("\xF0\x80\x80\x80"))=="?");assert(displayText(String("\xED\xA0\x80"))=="?");
std::vector<String> lines;eachTextLine("One small step at a time. 你好，一起挖洞吧！ [emoji]",208,[&](const String &line){assert(chatTextWidth(line)<=208);lines.push_back(line);});assert(lines.size()>1);assert(lines[0]=="One small step at a time.");
page="chat";render();assert(page=="focus");for(int i=0;i<targetCount;i++)assert(targets[i].command!="go:chat");
command("go:settings");command("go:displaytest");assert(page=="displaytest");dump("display-edges");assert(screen->svg().find("y='278' width='240' height='2'")!=std::string::npos);command("go:focus");assert(page=="focus");
// Actual touch packets: dragging the scene changes camera only, even while digging.
game.notice="";game.state["depth"]=140;game.state["surfaceDepth"]=0;game.start();assert(game.running());followMole();render();
auto packet=[](int x,int y,int event,int count){testMillis+=80;Wire.touch(x,y,event,count);touchIRQ=true;pollTouch();};
double progress=game.liveDepth(),elapsed=game.state["session"]["elapsed"].as<double>();int initialCamera=sceneCamera();
packet(70,90,0,1);packet(70,180,2,1);packet(70,180,1,0);
assert(mineBrowsing&&sceneCamera()==initialCamera-int(lround(90/SCENE_ZOOM)));assert(game.running());assert(game.liveDepth()==progress&&game.state["session"]["elapsed"].as<double>()==elapsed);assert(!jumping&&!spinning);dump("browse-running");
for(int i=0;i<12;i++){packet(70,80,0,1);packet(70,220,2,1);packet(70,220,1,0);}
assert(sceneCamera()==-70);dump("browse-surface");
// Holding the view does not freeze actual progress or jump back on redraw.
testMillis+=30000;testEpoch+=30;game.tick(testMillis);assert(game.liveDepth()>progress);render();assert(sceneCamera()==-70);
// Bottom-right depth tap resumes following. Pause/end remain separate targets.
TapTarget follow{};for(int i=0;i<targetCount;i++)if(targets[i].command=="followMole"&&targets[i].y>230)follow=targets[i];
assert(follow.w>0&&follow.x>=112&&follow.y+follow.h<=280);
packet(follow.x+follow.w/2,255,0,1);packet(follow.x+follow.w/2,255,1,0);assert(!mineBrowsing&&sceneCamera()==mineMaximum());
game.finish();clearPetMotion();render();
TapTarget pet{};for(int i=0;i<targetCount;i++)if(targets[i].command=="moleJump")pet=targets[i];
assert(pet.w>0);packet(pet.x+20,pet.y+30,0,1);packet(pet.x+20,pet.y+60,2,1);packet(pet.x+20,pet.y+60,1,0);assert(!jumping);
followMole();render();for(int i=0;i<targetCount;i++)if(targets[i].command=="moleJump")pet=targets[i];
packet(pet.x+20,pet.y+20,0,1);packet(pet.x+20,pet.y+20,1,0);assert(jumping);
// Readable device font uses proportional metrics; four digits fit at 40 px.
assert(textWidth("WWW")>textWidth("iii"));assert(textWidth("140.0m",20)<=100);
assert(textWidth("0000",40)+30<208&&textWidth("8888",40)+30<208);
command("surface");assert(mineBrowsing&&sceneCamera()==-70);command("followMole");assert(!mineBrowsing);
command("go:pairScreen");command("screenPairStart");assert(network.screenCode=="0372");dump("pair-code");network.screenRequest="test";network.screenLabel="Computer 1234";dump("pair-confirm");command("screenPairConfirm");assert(network.screenLinked);
// Actual END touches settle once and return both the camera and mole to ground.
command("go:focus");command("start");testMillis+=600000;testEpoch+=600000;game.tick(testMillis);render();
double ended=game.liveDepth(),endingSeconds=game.state["session"]["elapsed"].as<double>();
double totalBefore=game.state["totalSeconds"].as<double>();int historyBefore=game.state["history"].size();
packet(80,246,0,1);packet(80,246,1,0);assert(page=="confirm"&&confirmation=="finish");dump("end-confirm");
packet(110,216,0,1);packet(110,216,1,0);
assert(!game.active()&&!game.dirty&&page=="focus"&&!mineBrowsing&&sceneCamera()==-70);
assert(game.liveDepth()==ended&&game.state["history"].size()==historyBefore+1);
assert(game.state["totalSeconds"].as<double>()==totalBefore+endingSeconds);
dump("ended-at-surface");bool surfacePet=false;for(int i=0;i<targetCount;i++)if(targets[i].command=="moleJump")surfacePet=true;assert(surfacePet);
// Browsing an old tunnel while idle must stay there, even at its deepest point.
mineStartCamera=sceneCamera();mineStartY=0;dragMineTo(-20000);render();assert(mineBrowsing&&sceneCamera()==mineMaximum());
assert(game.liveDepth()==ended&&!game.active());dump("ended-tunnel-preserved");command("followMole");assert(sceneCamera()==-70);
command("go:records");dump("discoveries");command("go:focus");command("start");assert(game.state["session"]["elapsed"].as<double>()==0&&game.liveDepth()==ended);
assert(!mineBrowsing&&sceneCamera()==mineMaximum());command("start");assert(game.active()&&!game.running()&&sceneCamera()==mineMaximum());
// Timed completion also returns the idle mole to the surface.
command("start");mineBrowsing=true;mineCamera=0;testMillis+=1500000;testEpoch+=1500000;appReady=true;appLoop();
assert(!game.active()&&!mineBrowsing&&sceneCamera()==-70);
// Startup is display-only: same 1.44 s timeline as the web, then the existing UI.
double bootDepth=game.liveDepth(),bootSeconds=game.state["totalSeconds"].as<double>();
startupBegin();dump("startup-enter");assert(startupActive());
testMillis+=200;dump("startup-hold");testMillis+=1120;dump("startup-fade");
testMillis+=120;assert(!startupActive());dump("startup-finished");
assert(game.liveDepth()==bootDepth&&game.state["totalSeconds"].as<double>()==bootSeconds);
std::cout<<"PASS: minimal screen routes, bounded touch targets, start/pause, chat return, retained depth and session finish\n";
}
