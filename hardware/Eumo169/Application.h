#pragma once
#ifdef EUMO_HOST_UI
#include "../tests/host/UIPlatform.h"
#else
#include <Arduino.h>
#include "src/eumo_gfx/EumoDisplay.h"
#include <Wire.h>
#include "EumoNetwork.h"
#endif
#include <vector>
#include "Sprites.h"
#include "MoleGlyph.h"
#include "TextLayout.h"
#include "UiFont.h"

// Waveshare ESP32-S3-Touch-LCD-1.69: internal wiring, no external LCD jumpers.
Arduino_DataBus *displayBus=new Arduino_ESP32SPI(4,5,6,7);
Arduino_GFX *lcd=new Arduino_ST7789(displayBus,8,0,true,240,280,0,20,0,20);
Arduino_Canvas *screen=new Arduino_Canvas(240,280,lcd);
Game game;EumoNetwork network;
struct TapTarget {int x,y,w,h;String command;};
TapTarget targets[64];int targetCount=0;
String page="focus",backPage="menu",selected="",selectedGroup="items",input="",inputPurpose="",keyboardPage="abc",pendingSsid="",selectedSlot="left",confirmation="",dialogText="";
int listPage=0,chatOffset=0,weekOffset=0;bool touchOK=false,pressed=false;volatile bool touchIRQ=false;uint32_t lastPaint=0,lastTouch=0;
bool appReady=false;
std::vector<String> pageHistory;
uint32_t idleSince=0,petUntil=0;
String mood(){return game.active()?(game.running()&&game.state["session"]["mode"]!="rest"?"awake":"rest"):uint32_t(millis()-idleSince)>=300000?"asleep":uint32_t(millis()-idleSince)>=90000?"drowsy":"awake";}
constexpr uint32_t BG=0x202B2B,PAPER=0xEEE4C9,INK=0x2C3938,GREEN=0x738B65,GOLD=0xE8C67D;
uint16_t rgb(uint32_t c){return ((c>>8)&0xf800)|((c>>5)&0x7e0)|((c>>3)&31);}
uint32_t hex(const String &s){return strtoul(s.c_str()+(s.startsWith("#")?1:0),nullptr,16);}
double artAngle=0,artCX=0,artCY=0;float artSquash=1;
void rect(int x,int y,int w,int h,uint32_t c){
 if(fabs(artAngle)<.00001){screen->fillRect(x,y,w,h,rgb(c));return;}
 int px[4],py[4];for(int i=0;i<4;i++){double a=x+((i==1||i==2)?w:0)-artCX,b=y+(i>=2?h:0)-artCY;px[i]=lround(artCX+a*cos(artAngle)-b*sin(artAngle));py[i]=lround(artCY+a*sin(artAngle)+b*cos(artAngle));}
 screen->fillTriangle(px[0],py[0],px[1],py[1],px[2],py[2],rgb(c));screen->fillTriangle(px[0],py[0],px[2],py[2],px[3],py[3],rgb(c));
}
void alphaRect(int x,int y,int w,int h,uint32_t color,double alpha){
#ifdef EUMO_HOST_UI
 screen->alphaRect(x,y,w,h,rgb(color),alpha);
#else
 uint16_t *pixels=screen->getFramebuffer();for(int yy=max(0,y);yy<min(280,y+h);yy++)for(int xx=max(0,x);xx<min(240,x+w);xx++){uint16_t old=pixels[yy*240+xx];uint32_t r=lround(((old>>11)*255/31)*(1-alpha)+((color>>16)&255)*alpha),g=lround((((old>>5)&63)*255/63)*(1-alpha)+((color>>8)&255)*alpha),b=lround(((old&31)*255/31)*(1-alpha)+(color&255)*alpha);pixels[yy*240+xx]=rgb((r<<16)|(g<<8)|b);}
#endif
}
bool unicodeText(const String &s){for(unsigned char c:s)if(c>=128)return true;return false;}
int glyphBytes(uint8_t c){return c<128?1:c<224?2:c<240?3:4;}
String utfTail(const String &s,int from){from=constrain(from,0,int(s.length()));while(from>0&&from<int(s.length())&&(uint8_t(s[from])&0xc0)==0x80)from--;return s.substring(from);}
int fitBytes(const String &s,int pixels,bool unicode){int n=0,w=0;while(n<int(s.length())){int count=glyphBytes(uint8_t(s[n])),width=unicode?(count>1?16:8):uiGlyph(uint8_t(s[n])).advance;if(w+width>pixels||n+count>int(s.length()))break;w+=width;n+=count;}return n;}
int textWidth(const String &s,int fontSize=12){bool u=unicodeText(s);int n=0,w=0;while(n<int(s.length())){int count=glyphBytes(uint8_t(s[n]));w+=u?(count>1?16:8):uiGlyph(uint8_t(s[n]),fontSize).advance;n+=count;}return w;}
void latinLabel(int x,int y,const String &value,int fontSize,uint32_t color){
#ifdef EUMO_HOST_UI
 screen->drawing<<"<g aria-label='"<<escaped(value)<<"'>";
#endif
 const unsigned char *bits=fontSize==20?UI_BITS_20:UI_BITS_12;
 for(unsigned char ch:value){const auto &g=uiGlyph(ch,fontSize);
  for(int yy=0;yy<g.height;yy++)for(int xx=0;xx<g.width;){int at=yy*g.width+xx;auto coverage=[&](int i){int b=bits[g.offset+i/2];return i%2?b&15:b>>4;};int a=coverage(at),run=1;
   while(xx+run<g.width&&coverage(at+run)==a)run++;
   if(a)alphaRect(x+g.x+xx,y+g.y+yy,run,1,color,a/15.0);xx+=run;
  }x+=g.advance;
 }
#ifdef EUMO_HOST_UI
 screen->drawing<<"</g>";
#endif
}
bool displayHasGlyph(uint32_t cp){
 if(cp==0x9f39)return true;
 const uint8_t *font=u8g2_font_unifont_h_chinese4,*p=font+23;
 auto readFontWord=[](const uint8_t *v){return uint16_t((uint16_t(v[0])<<8)|v[1]);};
 if(cp<=255){while(p[1]){if(p[0]==cp)return true;p+=p[1];}return false;}
 p+=readFontWord(font+21);const uint8_t *lookup=p;uint16_t limit;
 do{p+=readFontWord(lookup);limit=readFontWord(lookup+2);lookup+=4;}while(limit<cp);
 while(readFontWord(p)){if(readFontWord(p)==cp)return true;if(!p[2])break;p+=p[2];}return false;
}
void label(int x,int y,String value,int size=1,uint32_t color=PAPER,bool uniform=false){
 value=displayText(value);bool u=uniform||unicodeText(value);screen->setTextColor(rgb(color));screen->setTextSize(u?1:size);
 if(u){screen->setUTF8Print(true);for(int n=0;n<int(value.length());){int start=n;uint32_t cp=nextCodePoint(value,n);String glyph=value.substring(start,n);int width=cp>255?16:8;
  screen->setCursor(x,y+13);screen->setFont(cp==0x9f39?MOLE_GLYPH_FONT:u8g2_font_unifont_h_chinese4);
  if(displayHasGlyph(cp))screen->print(glyph);else{rect(x+2,y+2,width-4,1,color);rect(x+2,y+12,width-4,1,color);rect(x+2,y+2,1,11,color);rect(x+width-3,y+2,1,11,color);}x+=width;
 }}else{latinLabel(x,y,value,size==1?12:20,color);}
}
void wrap(int x,int y,String value,int chars=35,int lines=6,uint32_t color=PAPER){bool u=unicodeText(value);for(int i=0;i<lines&&value.length();i++){int n=fitBytes(value,min(chars*6,230-x),u);if(n<=0)break;int newline=value.indexOf('\n');if(newline>=0&&newline<=n)n=newline;else if(n<int(value.length())&&value[n]!=' '){int space=n-1;while(space>0&&value[space]!=' ')space--;if(space>0)n=space;}label(x,y,value.substring(0,n),1,color,u);value=value.substring(n+(newline==n?1:0));value.trim();y+=u?18:13;}}
void button(int x,int y,int w,int h,const String &title,const String &cmd,uint32_t color=GREEN){rect(x,y,w,h,color);bool u=unicodeText(title);String text=title.substring(0,fitBytes(title,w-8,u));label(x+(w-textWidth(text))/2,y+(h-(u?16:12))/2,text);if(targetCount<64)targets[targetCount++]={x,y,w,h,cmd};}
String duration(double seconds){unsigned s=max(0.0,seconds);char out[24];snprintf(out,sizeof(out),"%02u:%02u:%02u",s/3600,s/60%60,s%60);return out;}
const Sprite *findSprite(const String &id){for(auto &s:SPRITES)if(id==s.id)return &s;return nullptr;}
void sprite(const String &id,int x,int y,float scale=1,uint32_t coat=0){const Sprite *s=findSprite(id);if(!s)return;for(unsigned i=0;i<s->count;i++){auto &r=s->data[i];uint32_t c=r.color;if(coat){if(c==0xa9b4c6)c=coat;else if(c==0xbac3d1){uint32_t z=0;for(int shift=0;shift<24;shift+=8)z|=uint32_t(lround(((coat>>shift)&255)*.8+51))<<shift;c=z;}else if(c==0x8b94a2){uint32_t z=0;for(int shift=0;shift<24;shift+=8)z|=uint32_t(lround(((coat>>shift)&255)*.82))<<shift;c=z;}}
 int top=lround(27+(r.y-27)*artSquash),bottom=lround(27+(r.y+r.h-27)*artSquash);rect(x+lround(r.x*scale),y+lround(top*scale),max(1,int(lround(r.w*scale))),max(1,int(lround(max(1,bottom-top)*scale))),c);}}
void mole(int x,int y,float scale=2,JsonVariantConst profile=JsonVariantConst(),JsonVariantConst equipped=JsonVariantConst(),String tool=""){
 if(profile.isNull()){profile=game.state["profile"];equipped=game.state["equipped"];tool=game.state["tool"]|"basic";}unsigned frame=millis()/120,phase=frame%6;bool dig=game.running()&&game.state["session"]["mode"]!="rest";String m=mood();
 bool closed=!dig&&(m=="asleep"||m=="rest"||(m=="drowsy"&&frame%30>8)||frame%42>=39);
 artSquash=m=="asleep"?.78+lround((sin(frame*.18)+1)*1.5)*.025:1;
 if(dig)y+=(frame%2)*scale;
 sprite(dig?String("body")+String(phase%2):closed?"idle_rest":"idle_awake",x,y,scale,hex(profile["color"]|"#a9b4c6"));if(dig)sprite(tool+"_"+String(phase),x,y,scale);
 for(JsonVariantConst id:equipped.as<JsonArrayConst>())sprite(id.as<String>()+"_0",x,y,scale);
 artSquash=1;
 if(m=="asleep"){
  int z=scale,pulse=lround((sin(frame*.18)+1)*1.2),bx=x+22*z,by=y+(12-pulse)*z,size=(5+pulse)*z;
  rect(x+18*z,y+16*z,3*z,z,0xa9d4dc);
  for(int row=0;row<size;row+=z){double ny=(row+z/2.0-size/2.0)/(size/2.0);int half=lround(sqrt(max(0.0,1-ny*ny))*size/2/z)*z;alphaRect(bx-half,by-size/2+row,half*2,z,0xb4e0e7,119.0/255);}
  rect(bx-size/2+z,by-size/2,size-2*z,z,0xc6eced);rect(bx-size/2+z,by+size/2-z,size-2*z,z,0x8bbcc9);rect(bx-size/2,by-size/2+z,z,size-2*z,0xb3dbe1);rect(bx+size/2-z,by-size/2+z,z,size-2*z,0xb3dbe1);rect(bx-z,by-size/2+z,z,z,0xf3ffff);
  uint32_t coat=hex(profile["color"]|"#a9b4c6"),light=0;for(int shift=0;shift<24;shift+=8){unsigned n=(coat>>shift)&255;light|=uint32_t(lround(n+(255-n)*.32))<<shift;}
  for(int i=0;i<3;i++){int xx=x+(16+i*6)*z,yy=y+(-4-i*5-int((frame/8+i)%4))*z;double alpha=1-i*.2;alphaRect(xx,yy,4*z,z,light,alpha);alphaRect(xx+2*z,yy+z,z,z,light,alpha);alphaRect(xx+z,yy+2*z,z,z,light,alpha);alphaRect(xx,yy+3*z,4*z,z,light,alpha);}
 }
 if(!game.active()&&!game.state["heldItem"].isNull())sprite("find_"+game.state["heldItem"].as<String>(),x+8,y-20,scale*.5);
}
void header(const String &title){label(14,9,title.substring(0,fitBytes(title,170,unicodeText(title))),1);label(192,12,WiFi.status()==WL_CONNECTED?"WiFi":"OFF",1,GOLD);rect(8,29,224,1,0x59675A);}
void footer(){button(12,242,216,28,"<","go:focus");}
void navList(int count){int pages=max(1,(count+2)/3);listPage=constrain(listPage,0,pages-1);button(12,205,60,29,"Prev","prev");label(99,216,String(listPage+1)+"/"+String(pages));button(169,205,60,29,"Next","next");}
void go(const String &next){if(next=="menu"||next=="focus")pageHistory.clear();else if(next!=page){if(pageHistory.size()>=12)pageHistory.erase(pageHistory.begin());pageHistory.push_back(page);}backPage=page;page=next;listPage=0;game.notice="";network.error="";}
void edit(const String &purpose,const String &value=""){inputPurpose=purpose;input=value;backPage=page;page="keyboard";keyboardPage="abc";}
#include "Appearance.h"
void mineView(){double maximum=page=="mine"?game.liveDepth():game.worldDepth();double depth=game.running()?maximum:game.visit;depth=constrain(depth,0.0,maximum);
 uint32_t soil=depth>=720?0x484459:depth>=600?0x77648F:depth>=480?0xA47C8A:depth>=360?0x6E7F9D:depth>=300?0xD5B590:depth>=240?0x949C8B:0x9B875D;
 rect(8,78,224,118,soil);if(depth<5){auto sky=skyPalette();rect(8,78,224,59,sky.sky);rect(8,135,224,4,sky.grass);rect(185,89,15,15,sky.sun);if(sky.night){rect(192,85,12,14,sky.sky);rect(51,88,2,2,0xfff8df);rect(128,90,2,2,0xfff8df);}rect(32,107,2,29,0x81634B);rect(34,107,16,10,0xDB99B4);}
 else {rect(57,78,125,118,0x353538);for(int y=78;y<196;y+=12){rect(65,y,12,2,0xBC9D75);}rect(64,78,2,118,0xBC9D75);rect(77,78,2,118,0xBC9D75);}
 if(game.state["simpleView"].as<bool>())rect(8,78,224,118,BG);
 int mx=95+game.lateral;int my=depth<5?94:126;mole(mx,my,1.65);
 if(!game.active())targets[targetCount++]={mx,my,46,50,"pet"};
 label(15,181,String(depth,1)+"m / "+String(game.liveDepth(),1)+"m",1,PAPER);
}
void drawHome(JsonVariantConst home=JsonVariantConst(),JsonVariantConst friendState=JsonVariantConst()){
 if(home.isNull())home=game.state["home"];auto theme=game.homeItem(home["theme"]|"cave",true);
 rect(10,43,220,145,hex(theme["wall"]|"#a7956b"));rect(10,167,220,21,hex(theme["floor"]|"#b69b65"));
 for(JsonPairConst s:home["slots"].as<JsonObjectConst>()){if(s.value().isNull())continue;auto spot=game.catalog["home"]["slots"][s.key()];int x=16+spot["x"].as<int>()*200/640,y=48+spot["y"].as<int>()*128/360;String id=s.value().as<String>();sprite(id.startsWith("find:")?"find_"+id.substring(5):"home_"+id,x-10,y-20,.7);}
 if(friendState.isNull()){mole(93,115,1.7);if(!game.active())targets[targetCount++]={93,115,50,51,"pet"};}else mole(93,115,1.7,friendState["profile"],friendState["equipped"],friendState["tool"]|"basic");
 if(friendState.isNull()&&!game.state["displayedTreasure"].isNull())sprite("rare_"+game.state["displayedTreasure"].as<String>(),179,140,1);
}
#include "ShopUI.h"
void drawDetail(){auto i=selectedGroup=="items"||selectedGroup=="tools"||selectedGroup=="treasures"?game.item(selectedGroup.c_str(),selected):game.homeItem(selected,selectedGroup=="themes");
 wrap(14,40,i["name"].as<String>(),30,2);String art=selectedGroup=="items"||selectedGroup=="tools"?selected+"_0":selectedGroup=="treasures"?"rare_"+selected:"home_"+selected;if(selectedGroup=="items"||selectedGroup=="tools")outfitPreview();else sprite(art,84,72,2);
 if(selectedGroup=="treasures"){label(15,151,"Owned: "+game.state["rareInventory"][selected].as<String>());button(12,170,104,30,"Sell +99","confirm:sell");button(124,170,104,30,"Display","display");}
 else if(selectedGroup=="items"||selectedGroup=="tools"){bool owned=Game::contains(game.state[selectedGroup=="tools"?"ownedTools":"owned"],selected);label(15,151,owned?"Owned":String(i["cost"].as<int>())+" stars");button(12,174,216,34,owned?"Equip / remove":"Buy and equip",owned?"buy":"confirm:buy");}
 else {bool theme=selectedGroup=="themes",owned=Game::contains(game.state["home"][theme?"ownedThemes":"owned"],selected);
  if(!i["recipe"].isNull()){String recipe;for(JsonPairConst p:i["recipe"].as<JsonObjectConst>())recipe+=String(p.key().c_str())+" x"+p.value().as<String>()+" ";wrap(12,143,recipe,35,2);}else label(12,148,String(i["cost"].as<int>())+" stars");
  button(12,175,216,30,theme?(owned?"Use theme":"Buy theme"):owned?"Place furniture":i["recipe"].isNull()?"Buy furniture":"Craft furniture",owned?"homebuy":"confirm:homebuy");}
}
void drawReports(){JsonObjectConst days=game.state["reportDays"];
 if(page=="reports"){String today=Game::day(time(nullptr));double sum=0;for(JsonPairConst p:days)sum+=p.value()["seconds"].as<double>()+p.value()["workSeconds"].as<double>();
 label(12,40,today);label(12,61,"Study  "+duration(days[today]["seconds"].as<double>()));label(12,80,"Work   "+duration(days[today]["workSeconds"].as<double>()));label(12,104,"All recorded focus");label(12,123,duration(sum),2);
 button(12,158,104,32,"Calendar","go:calendar");button(124,158,104,32,"Trends","go:trend");button(12,199,104,32,"History","go:history");button(124,199,104,32,"Finish day","confirm:finishday");
 }else if(page=="days"){navList(days.size());int i=0;for(JsonPairConst p:days){int row=i++-listPage*3;if(row<0||row>=3)continue;int y=40+row*53;label(14,y,p.key().c_str());label(14,y+16,"Study "+duration(p.value()["seconds"].as<double>()));label(14,y+29,"Work  "+duration(p.value()["workSeconds"].as<double>()));}}
 else {JsonArrayConst history=game.state["history"];navList(history.size());for(int row=0;row<3;row++){int i=listPage*3+row;if(i>=int(history.size()))break;auto h=history[i];int y=39+row*54;label(12,y,h["mode"].as<String>()+" "+duration(h["seconds"].as<double>())+(h["demo"].as<bool>()?" DEMO":""));String task=h["task"].as<String>();label(12,y+13,task.substring(0,fitBytes(task,210,unicodeText(task))));label(12,y+33,h["outcome"].as<String>());targets[targetCount++]={12,y,216,50,"history:"+String(i)};}}
}
void weekChart(){time_t now=time(nullptr);tm t{};localtime_r(&now,&t);t.tm_hour=12;t.tm_min=0;t.tm_sec=0;t.tm_mday-=(t.tm_wday+6)%7+weekOffset*7;t.tm_isdst=-1;double values[7],maximum=60,total=0;String keys[7];
 for(int i=0;i<7;i++){tm d=t;d.tm_mday+=i;keys[i]=Game::day(mktime(&d));auto r=game.state["reportDays"][keys[i]];values[i]=r["seconds"].as<double>()+r["workSeconds"].as<double>();maximum=max(maximum,values[i]);total+=values[i];}
 label(12,40,"Week of "+keys[0]);label(12,59,"Focus "+duration(total));const char *names[]={"M","T","W","T","F","S","S"};for(int i=0;i<7;i++){int x=16+i*30,h=values[i]*96/maximum;rect(x,180-h,20,max(1,h),GREEN);label(x+6,188,names[i]);}button(12,205,68,29,"Earlier","weekprev");button(86,205,68,29,"Today","weeknow");button(160,205,68,29,"Later","weeknext");
}
#include "CalendarUI.h"
void drawFriends(){auto &f=network.friends;
 if(page=="friends"){label(12,40,network.busy?"Connecting...":network.error.length()?network.error.substring(0,35):"Online friends");String code=f["self"]["code"]|"Not connected";label(12,59,code,2);
 button(12,88,216,30,f["self"].isNull()?"Pair original account":"Refresh friends",f["self"].isNull()?"go:pair":"friend:sync");
 button(12,125,104,30,"Friend list","go:friendlist");button(124,125,104,30,"Add friend","addfriend");button(12,163,104,30,"Incoming","go:incoming");button(124,163,104,30,"Outgoing","go:outgoing");
 button(12,201,216,30,f["self"]["sharing"].as<bool>()?"Pause sharing":"Resume sharing",f["self"]["sharing"].as<bool>()?"friend:pause":"friend:resume");}
 else {String key=page=="friendlist"?"friends":page;JsonArrayConst entries=f[key];navList(entries.size());if(entries.size()==0)label(14,64,"No entries / refresh first");for(int row=0;row<3;row++){int i=listPage*3+row;if(i>=int(entries.size()))break;auto e=entries[i];int y=40+row*54;label(12,y,(page=="friendlist"?e["snapshot"]["name"]:e["profile"]["name"]).as<String>().substring(0,32));String link=e["linkId"];
 if(page=="incoming"){button(12,y+15,103,28,"Accept","friend:accept:"+link);button(124,y+15,104,28,"Decline","friend:decline:"+link);}
 else if(page=="outgoing")button(12,y+15,216,28,"Cancel request","friend:cancel:"+link);
 else {targets[targetCount++]={12,y-2,216,16,"friendinfo:"+String(i)};button(12,y+15,104,28,"Visit","visit:"+String(i));button(124,y+15,104,28,"Remove","confirm:remove:"+link);}}}
}
void renderLegacy(){targetCount=0;screen->fillScreen(rgb(BG));header(page=="focus"?game.state["profile"]["name"]|"Eumo":page);
 if(page=="focus"){label(14,40,duration(game.remaining()),2);label(14,62,game.state["mode"].as<String>()+" | "+(game.running()?"Digging":game.active()?"Paused":"Ready"));targets[targetCount++]={12,35,216,40,"go:timer"};mineView();button(12,202,104,31,game.running()?"Pause":game.active()?"Resume":"Start","start");button(124,202,104,31,game.active()?"End & save":"Timer settings",game.active()?"confirm:finish":"go:timer");}
 else if(page=="menu"){const char *names[]={"Focus","Home","Shop","Tools","Friends","Reports","Backpack","Chat","Settings"};const char *pages[]={"focus","home","items","tools","friends","reports","backpack","chat","settings"};for(int i=0;i<9;i++)button(12+(i%2)*112,37+(i/2)*38,i==8?216:104,32,names[i],String("go:")+pages[i]);}
 else if(page=="timer"){label(12,42,"Mode: "+game.state["mode"].as<String>());for(int i=0;i<3;i++)button(12+i*74,63,68,30,i==0?"Study":i==1?"Work":"Break",String("mode:")+(i==0?"study":i==1?"work":"rest"));label(76,109,game.state["minutes"].as<String>()+" min",2);button(12,102,48,32,"-5","minus");button(180,102,48,32,"+5","plus");button(12,145,216,30,"Task: "+game.state["lastTask"].as<String>(),"task");button(12,185,104,34,"15s demo","demo");button(124,185,104,34,"Browse mine","go:mine");}
 else if(page=="mine"){label(12,42,"Exploring existing depth");label(12,59,"Paused progress is retained");mineView();button(12,202,49,32,"Left","left");button(67,202,49,32,"Up","up");button(122,202,49,32,"Down","down");button(177,202,51,32,"Right","right");}
 else if(page=="home"){drawHome();button(12,201,82,31,"Furniture","go:furniture");button(100,201,61,31,"Themes","go:themes");button(167,201,61,31,"Clear","clearSlot");}
 else if(page=="items"||page=="tools"||page=="furniture"||page=="themes"||page=="treasures")collection(page=="furniture"?"furniture":page);
 else if(page=="detail")drawDetail();
 else if(page=="slots"){auto slots=game.catalog["home"]["slots"].as<JsonObjectConst>();navList(slots.size());int n=0;for(JsonPairConst slot:slots){int row=n++-listPage*3;if(row<0||row>=3)continue;button(12,40+row*54,216,43,slot.value()["label"].as<String>(),"place:"+String(slot.key().c_str()));}}
 else if(page=="backpack"){for(int i=0;i<4;i++){int y=37+i*39;String id=game.catalog["home"]["materials"][i]["id"];sprite("find_"+id,12,y,.9);button(50,y,178,32,id+" x"+game.state["inventory"][i].as<String>(),"material:"+id);}button(12,201,104,31,"Golden finds","go:treasures");button(124,201,104,31,"Put down","hold:");}
 else if(page=="material"){label(12,42,selected);sprite("find_"+selected,85,75,2);button(12,151,216,31,"Hold above mole","hold:"+selected);button(12,195,216,31,"Place in home","placeFind");}
 else if(page=="reports"||page=="days"||page=="history")drawReports();
 else if(page=="week")weekChart();
 else if(page=="calendar")calendarView();
 else if(page=="trend")trendView();
 else if(page=="daylog")dayLog();
 else if(page=="historydetail"){auto h=game.state["history"][selected.toInt()];label(12,41,h["mode"].as<String>()+" "+duration(h["seconds"].as<double>()));wrap(12,65,"Task: "+h["task"].as<String>(),35,3);wrap(12,126,"Note: "+h["note"].as<String>(),35,3);button(12,201,216,30,"Edit outcome note","note");}
 else if(page=="friends"||page=="friendlist"||page=="incoming"||page=="outgoing")drawFriends();
 else if(page=="pair"){wrap(12,39,"Use your original website browser to approve this screen.",35,3);label(12,89,network.pairCode.length()?network.pairCode:"No code yet",2);wrap(12,122,"1111-phi-ten.vercel.app/device.html",35,2);button(12,163,216,30,"Get pairing code","pair:start");button(12,201,216,30,"Check pairing","pair:poll");}
 else if(page=="friendinfo"){auto f=network.friends["friends"][selected.toInt()];auto s=f["snapshot"];wrap(12,40,s["name"].as<String>(),35,2);if(!f["sharing"].as<bool>())wrap(12,86,"This friend has paused activity sharing. Shared home is still available.",35,5);else{label(12,83,s["status"].as<String>()+(f["visible"].as<bool>()?" | online":" | last shared"));label(12,108,s["localDate"].as<String>());label(12,130,"Study "+duration(s["studySeconds"].as<double>()));label(12,151,"Work  "+duration(s["workSeconds"].as<double>()));label(12,174,"Depth "+String(s["depth"].as<double>(),1)+"m");}button(12,207,216,28,"Visit shared home","visit:"+selected);}
 else if(page=="visit"){int i=selected.toInt();JsonVariantConst f=network.friends["friends"][i];JsonDocument s;s["profile"]["name"]=f["snapshot"]["name"];s["profile"]["color"]=f["snapshot"]["color"];s["equipped"]=f["snapshot"]["equipped"];s["tool"]=f["snapshot"]["tool"];if(f["home"].isNull())label(12,57,"Home has not been shared");else drawHome(f["home"],s.as<JsonVariantConst>());label(12,203,"Last shared home (view only)");}
 else if(page=="chat"){String conversation;for(JsonVariantConst m:network.chat.as<JsonArrayConst>())conversation+=(m["role"]=="user"?"You: ":"Mole: ")+m["content"].as<String>()+"  ";wrap(12,40,utfTail(conversation,chatOffset),35,unicodeText(conversation)?7:10);button(12,181,65,27,"Up","chatup");button(85,181,65,27,"Down","chatdown");button(158,181,70,27,"Options","go:chatoptions");button(12,212,216,25,network.busy?"Waiting...":"Write message","chatinput");}
 else if(page=="settings"){button(12,38,216,29,"Wi-Fi and setup","go:wifi");button(12,74,216,29,"Name: "+game.state["profile"]["name"].as<String>(),"name");button(12,110,104,29,"Coat color","color");button(124,110,104,29,"Touch test","go:touchtest");button(12,146,216,29,game.mounted?"Save progress now":"Initialize storage",game.mounted?"save":"confirm:format");button(12,182,216,29,"Backup / import","go:backup");button(12,214,216,24,"Appearance / simple view","go:appearance");}
 else if(page=="appearance"){label(12,40,"Surface sky / original palette");button(12,65,68,31,"Auto","appearance:auto");button(86,65,68,31,"Day","appearance:day");button(160,65,68,31,"Night","appearance:night");label(12,112,"Selected: "+String(game.state["_deviceStorage"]["eumo-appearance"]|"auto"));button(12,143,216,32,game.state["simpleView"].as<bool>()?"Show mine scenery":"Simple pet view","simpleview");wrap(12,193,"Auto follows your configured device timezone.",35,3);}
 else if(page=="chatoptions"){wrap(12,42,"Messages go to the original website's AI service. Sharing task / focus details is optional.",35,6);button(12,132,216,30,network.shareChat?"Task sharing: ON":"Task sharing: OFF","shareChat");button(12,170,216,30,"Clear conversation","confirm:clearChat");wrap(12,207,"Chinese input: open device IP/text on your phone.",35,2);}
 else if(page=="wifi"||page=="backup"){label(12,40,WiFi.status()==WL_CONNECTED?"Connected: "+network.ssid:"Wi-Fi offline");label(12,58,"IP "+(network.portal?WiFi.softAPIP():WiFi.localIP()).toString());label(12,78,"Setup user: eumo");wrap(12,94,"Setup password: "+network.setupPassword,34,2);button(12,127,216,30,network.portal?"Stop setup hotspot":"Start setup hotspot",network.portal?"stopAP":"startAP");button(12,165,216,30,"Enter Wi-Fi on screen","ssid");wrap(12,204,"Open the IP on your phone for backup/import. No PC needed.",35,2);}
 else if(page=="touchtest"){for(int x:{30,210})for(int y:{50,210}){screen->drawCircle(x,y,12,rgb(GOLD));}label(45,112,"Tap corners to test");button(50,143,140,35,"Return","go:settings");}
 else if(page=="confirm"){wrap(14,43,dialogText,33,10);button(12,193,104,38,"Cancel","cancel");button(124,193,104,38,"Confirm","yes");}
 else if(page=="keyboard"){label(12,39,inputPurpose=="password"?pendingSsid.substring(0,fitBytes(pendingSsid,210,unicodeText(pendingSsid))):inputPurpose);wrap(12,57,inputPurpose=="password"?String('*')+String(input.length())+" characters":utfTail(input,max(0,int(input.length())-56)),34,2);String chars=keyboardPage=="abc"?"abcdefghijklmnopqrstuvwxyz .,?!-":keyboardPage=="ABC"?"ABCDEFGHIJKLMNOPQRSTUVWXYZ @#_:/":"0123456789!@#$%^&*()_+-=/:;.,?[]";
  for(unsigned i=0;i<chars.length();i++)button(12+(i%6)*36,91+(i/6)*22,33,20,String(chars[i]),"char:"+String(chars[i]));button(12,225,68,24,keyboardPage=="abc"?"ABC":keyboardPage=="ABC"?"123":"abc","keys");button(86,225,68,24,"Delete","delete");button(160,225,68,24,"Done","inputdone");button(12,253,216,19,"Cancel","cancelinput");}
 if(page!="keyboard")footer();String notice=game.notice.length()?game.notice:network.error;if(notice.length()){rect(8,225,224,14,0x713F38);label(10,228,notice.substring(0,36));}
 screen->flush();
}
void commandLegacy(String cmd){
 if(cmd=="trend7"||cmd=="trend30"){trendRange=cmd=="trend7"?7:30;trendPoint=trendRange-1;return;}if(cmd=="trendprev"){trendPoint=max(0,trendPoint-1);return;}if(cmd=="trendnext"){trendPoint=min(trendRange-1,trendPoint+1);return;}
 if(cmd=="simpleview"){game.state["simpleView"]=!game.state["simpleView"].as<bool>();game.save();return;}if(cmd.startsWith("appearance:")){game.state["_deviceStorage"]["eumo-appearance"]=cmd.substring(11);game.save();return;}
 if(cmd=="shopowned"){ownedOnly=!ownedOnly;listPage=0;return;}if(cmd=="shopcategory"){const char *categories[]={"all","hats","glasses","scarves","extras"};for(int i=0;i<5;i++)if(shopCategory==categories[i]){shopCategory=categories[(i+1)%5];break;}listPage=0;return;}
 if(cmd=="monthprev"){monthBack++;return;}if(cmd=="monthnext"){monthBack=max(0,monthBack-1);return;}if(cmd=="monthnow"){monthBack=0;return;}if(cmd.startsWith("day:")){reportDay=cmd.substring(4);go("daylog");return;}
 if(cmd=="weekprev"){weekOffset++;return;}if(cmd=="weeknext"){weekOffset=max(0,weekOffset-1);return;}if(cmd=="weeknow"){weekOffset=0;return;}
 if(cmd=="pet"){if(!game.active()){idleSince=millis();petUntil=millis()+1100;}return;}
 if(cmd.startsWith("go:")){go(cmd.substring(3));return;}if(cmd=="back"){if(pageHistory.empty())go("menu");else{page=pageHistory.back();pageHistory.pop_back();listPage=0;game.notice="";network.error="";}return;}if(cmd=="prev"){listPage=max(0,listPage-1);return;}if(cmd=="next"){listPage++;return;}
 if(cmd.startsWith("confirm:")){confirmation=cmd.substring(8);backPage=page;page="confirm";dialogText=confirmation=="format"?"Initialize the device data partition? This erases files in that partition. It does not erase the website's save.":confirmation=="finish"?"End this session? Earned depth, time and rewards will be saved.":confirmation=="finishday"?"Finish today and end the current session? Recorded time and all-time depth remain saved.":confirmation=="clearChat"?"Delete this device's saved conversation? Your game progress stays saved.":confirmation.startsWith("remove:")?"Remove this friend?":confirmation=="sell"?"Sell one unused golden treasure for 99 stars?":"Confirm this purchase or craft? It uses your stars or materials.";return;}
 if(cmd=="cancel"){page=backPage;return;}if(cmd=="yes"){page=backPage;cmd=confirmation;}
 if(cmd=="start"){idleSince=millis();game.start();return;}if(cmd=="finish"){game.finish();idleSince=millis();game.visit=0;return;}if(cmd=="finishday"){game.finish();game.state["surfaceDepth"]=game.state["depth"];game.state["digDay"]=Game::day(time(nullptr));game.visit=0;game.save();go("reports");return;}if(cmd=="demo"){if(!game.active()){game.start(true);go("focus");}return;}
 if(cmd.startsWith("mode:")){if(!game.active()){game.state["mode"]=cmd.substring(5);game.save();}else game.notice="Finish current session first";return;}
 if(cmd=="plus"||cmd=="minus"){if(!game.active()){game.state["minutes"]=constrain((game.state["minutes"]|25)+(cmd=="plus"?5:-5),5,120);game.save();}else if(cmd=="plus"&&!game.state["session"]["demo"].as<bool>()){game.state["session"]["plannedSeconds"]=min(7200,game.state["session"]["plannedSeconds"].as<int>()+300);game.state["session"]["remaining"]=game.remaining();game.save();}return;}
 if(cmd=="task"){if(!game.active())edit("task",game.state["lastTask"]|"");return;}if(cmd=="name"){edit("name",game.state["profile"]["name"]|"Momo");return;}
 if(cmd=="color"){edit("color",game.state["profile"]["color"]|"#a9b4c6");return;}
 if(cmd.startsWith("history:")){selected=cmd.substring(8);go("historydetail");return;}if(cmd=="note"){edit("note",game.state["history"][selected.toInt()]["note"]|"");return;}
 if(cmd=="left"||cmd=="right"||cmd=="up"||cmd=="down"){if(game.running()){game.notice="Pause before exploring";return;}if(cmd=="left")game.lateral=max(-30,game.lateral-10);if(cmd=="right")game.lateral=min(30,game.lateral+10);if(cmd=="up")game.visit=max(0.0,game.visit-3);if(cmd=="down")game.visit=min(game.liveDepth(),game.visit+3);return;}
 if(cmd.startsWith("detail:")){int colon=cmd.indexOf(':',7);selectedGroup=cmd.substring(7,colon);selected=cmd.substring(colon+1);go("detail");return;}
 if(cmd=="buy"){game.buy(selected,selectedGroup=="tools");return;}if(cmd=="homebuy"){if(game.homeBuy(selected,selectedGroup=="themes")&&selectedGroup!="themes")go("slots");return;}
 if(cmd=="clearSlot"){selected="";go("slots");return;}if(cmd=="resettool"){game.state["tool"]=nullptr;game.save();return;}
 if(cmd.startsWith("material:")){selected=cmd.substring(9);go("material");return;}if(cmd=="placeFind"){selected="find:"+selected;go("slots");return;}
 if(cmd.startsWith("place:")){if(game.place(selected,cmd.substring(6)))go("home");else game.notice="No spare item / incompatible slot";return;}
 if(cmd=="sell"){game.sell(selected);return;}if(cmd=="display"){if(game.state["displayedTreasure"]==selected)game.state["displayedTreasure"]=nullptr;else if(game.state["rareInventory"][selected].as<int>()>0)game.state["displayedTreasure"]=selected;game.save();return;}
 if(cmd.startsWith("hold:")){String id=cmd.substring(5);if(game.active()){game.notice="Finish session before holding";return;}if(!id.length())game.state["heldItem"]=nullptr;else for(int i=0;i<4;i++)if(game.catalog["home"]["materials"][i]["id"]==id&&game.spare(i)>0)game.state["heldItem"]=id;game.save();return;}
 if(cmd.startsWith("friend:")){String rest=cmd.substring(7);int colon=rest.indexOf(':');network.friendAction(colon<0?rest:rest.substring(0,colon),colon<0?"":rest.substring(colon+1));return;}
 if(cmd.startsWith("pair:")){network.pairAction(cmd.substring(5));return;}
 if(cmd.startsWith("remove:")){network.friendAction("remove",cmd.substring(7));return;}if(cmd=="addfriend"){edit("friend code");return;}if(cmd.startsWith("friendinfo:")){selected=cmd.substring(11);go("friendinfo");return;}if(cmd.startsWith("visit:")){selected=cmd.substring(6);go("visit");return;}
 if(cmd=="ssid"){edit("ssid",network.ssid);return;}if(cmd=="startAP"){network.startPortal();return;}if(cmd=="stopAP"){network.stopPortal();return;}
 if(cmd=="shareChat"){network.shareChat=!network.shareChat;network.prefs.putBool("shareChat",network.shareChat);return;}
 if(cmd=="format"){screen->fillScreen(rgb(BG));label(20,110,"Preparing storage...");screen->flush();bool ok=game.initializeStorage();Serial.printf("EUMO_STORAGE init=%d mounted=%d\n",ok,game.mounted);return;}if(cmd=="save"){game.save();return;}
 if(cmd=="chatinput"){if(!network.busy)edit("message");return;}if(cmd=="chatup"){chatOffset=max(0,chatOffset-175);return;}if(cmd=="chatdown"){chatOffset+=175;return;}if(cmd=="clearChat"){network.chat.clear();network.chat.to<JsonArray>();network.saveChat();chatOffset=0;return;}
 if(cmd.startsWith("char:")){if(input.length()<200)input+=cmd.substring(5);return;}if(cmd=="delete"){if(input.length()){int n=input.length()-1;while(n>0&&(uint8_t(input[n])&0xc0)==0x80)n--;input.remove(n);}return;}if(cmd=="keys"){keyboardPage=keyboardPage=="abc"?"ABC":keyboardPage=="ABC"?"123":"abc";return;}if(cmd=="cancelinput"){page=backPage;return;}
 if(cmd=="inputdone"){
  String purpose=inputPurpose;page=backPage;
  if(purpose=="ssid"){pendingSsid=input;edit("password");return;}
  if(purpose=="password"){network.connect(pendingSsid,input);go("wifi");return;}
  if(purpose=="friend code"){network.friendAction("request",input);return;}
  if(purpose=="message"){go("chat");network.ask(input);return;}
  if(purpose=="name"&&input.length())game.state["profile"]["name"]=input.substring(0,32);
  if(purpose=="task")game.state["lastTask"]=input.substring(0,160);
  if(purpose=="note")game.state["history"][selected.toInt()]["note"]=input.substring(0,160);
  if(purpose=="color"){bool valid=input.length()==7&&input[0]=='#';for(int i=1;i<int(input.length());i++)if(!isxdigit(input[i]))valid=false;if(valid)game.state["profile"]["color"]=input;else game.notice="Use # plus six hex digits";}
  game.save();return;
 }
}
#include "ChatUI.h"
#include "MinimalUI.h"
void IRAM_ATTR touched(){touchIRQ=true;}
uint32_t lastAcceptedTouch=0;
void pollTouch(){
 // Poll release as well as interrupts: CST816 release IRQs can be missed while
 // transferring a frame. Do not discard every tap within a 300ms window.
 bool irq=touchIRQ;uint32_t now=millis();if(!irq&&uint32_t(now-lastTouch)<20)return;touchIRQ=false;lastTouch=now;
 Wire.beginTransmission(0x15);Wire.write(2);if(Wire.endTransmission(false)!=0||Wire.requestFrom(uint8_t(0x15),uint8_t(5))!=5)return;
 uint8_t b[5];for(int i=0;i<5;i++)b[i]=Wire.read();int event=(b[1]>>6)&3;bool down=(b[0]&15)>0&&event!=1;
 int x=((b[1]&15)<<8)|b[2],y=((b[3]&15)<<8)|b[4];
 if(!down){
  pressed=false;
  if(mineGesture){String tap=mineTapCommand;bool dragged=mineDragged;mineGesture=false;mineTapCommand="";
   if(page=="focus"&&!dragged&&tap.length())command(tap);
  }return;
 }
 bool freshPress=irq&&event==0&&uint32_t(now-lastAcceptedTouch)>=60;
 if(mineGesture&&page=="focus"&&!freshPress){
  if(x>=240||y>=280)return;
  if(abs(y-mineStartY)>=8||abs(x-mineStartX)>=8)mineDragged=true;
  if(mineDragged)dragMineTo(y);return;
 }
 if(pressed&&!freshPress)return;pressed=true;lastAcceptedTouch=now;if(x>=240||y>=280)return;idleSince=now;
 mineGesture=false;mineTapCommand="";
 if(page=="focus"&&y>=38&&y<228){
  String hit;for(int i=0;i<targetCount;i++){auto t=targets[i];if(x>=t.x&&x<t.x+t.w&&y>=t.y&&y<t.y+t.h){hit=t.command;break;}}
  if(!hit.length()||hit=="moleJump"){
   mineGesture=true;mineDragged=false;mineStartX=x;mineStartY=y;mineStartCamera=sceneCamera();mineTapCommand=hit;return;
  }
 }
 if(page=="touchtest")game.notice="Touch "+String(x)+", "+String(y);
 for(int i=0;i<targetCount;i++){auto t=targets[i];if(x>=t.x&&x<t.x+t.w&&y>=t.y&&y<t.y+t.h){command(t.command);render();lastPaint=millis();return;}}
}

void appSetup(){Serial.begin(115200);pinMode(15,OUTPUT);digitalWrite(15,LOW);
 if(!screen->begin(20000000)){Serial.println("Display allocation failed; enable PSRAM");return;}screen->setTextWrap(false);digitalWrite(15,HIGH);
 Wire.begin(11,10,400000);Wire.setTimeOut(25);pinMode(13,OUTPUT);digitalWrite(13,LOW);delay(20);digitalWrite(13,HIGH);delay(100);pinMode(14,INPUT_PULLUP);attachInterrupt(digitalPinToInterrupt(14),touched,FALLING);Wire.beginTransmission(0x15);Wire.write(0xfa);Wire.write(0x60);touchOK=Wire.endTransmission()==0;
 game.begin();network.chat.to<JsonArray>();network.begin(game);if(!game.mounted)page="settings";appReady=true;render();Serial.println("EUMO169 native port READY; no website data overwritten.");
}
void diagnosticSerial(){
 static char line[32];static uint8_t n=0;
 while(Serial.available()){char c=Serial.read();if(c=='\n'){
  line[n]=0;String cmd=line;n=0;
  if(cmd=="status")Serial.printf("EUMO_STATUS storage=%d clock=%d wifi=%d active=%d running=%d depth=%.2f elapsed=%.1f\n",game.mounted,game.clockReady(),WiFi.status()==WL_CONNECTED,game.active(),game.running(),game.liveDepth(),game.state["session"]["elapsed"].as<double>());
  if(cmd=="storage-init"){
#ifndef EUMO_HOST_UI
   Serial.printf("EUMO_HEAP free=%u largest=%u\n",ESP.getFreeHeap(),ESP.getMaxAllocHeap());
#endif
   bool ok=game.mounted?game.save():game.initializeStorage();
   Serial.printf("EUMO_STORAGE init=%d mounted=%d note=%s\n",ok,game.mounted,game.notice.c_str());page="startHelp";render();
  }
 }else if(c!='\r'){if(n<31)line[n++]=c;else n=0;}}
}

void appLoop(){if(!appReady){delay(100);return;}diagnosticSerial();bool wasActive=game.active();game.tick(millis());if(wasActive&&!game.active()){idleSince=millis();clearPetMotion();followMole();}network.poll();pollTouch();if(millis()-lastPaint>125){lastPaint=millis();render();}delay(2);}
