#pragma once
#include <sstream>
#include <iomanip>
#include "../../Eumo169/Game.h"
// Host renderer records the real firmware drawing calls, no second UI implementation.
#define IRAM_ATTR
constexpr int OUTPUT=1,INPUT_PULLUP=2,HIGH=1,LOW=0,FALLING=3,WL_CONNECTED=3;
template<class T>T constrain(T v,T lo,T hi){return min(hi,max(lo,v));}
inline void pinMode(int,int){}inline void digitalWrite(int,int){}inline void delay(int){}
inline int digitalPinToInterrupt(int v){return v;}inline void attachInterrupt(int,void(*)(),int){}
struct SerialMock {int available(){return 0;}int read(){return -1;}template<class... A>void printf(const char*,A...){}void begin(int){}void println(const char*){}} inline Serial;
struct WireMock {uint8_t packet[5]={};int pos=0;void touch(int x,int y,int event,int count){packet[0]=count;packet[1]=(event<<6)|(x>>8);packet[2]=x&255;packet[3]=y>>8;packet[4]=y&255;}void begin(int,int,int){}void setTimeOut(int){}void beginTransmission(int){}void write(int){}int endTransmission(bool=true){return 0;}int requestFrom(uint8_t,uint8_t n){pos=0;return n;}int read(){return packet[pos++%5];}} inline Wire;
struct IPMock {String toString(){return "192.168.1.20";}};
struct WiFiMock {int status(){return WL_CONNECTED;}IPMock softAPIP(){return {};}IPMock localIP(){return {};}} inline WiFi;
struct PrefMock {void putBool(const char*,bool){}};
class EumoNetwork {public:
struct NearbyWiFi{String name;int rssi;int auth;};std::vector<NearbyWiFi> nearby;bool scanning=false,connecting=false;String wifiNote,connectedName,connectedPassword;void scanWiFi(){scanning=true;}
String screenCode,screenRequest,screenLabel,screenPairError;bool screenLinked=false;uint32_t codeStarted=0;void startScreenPair(){screenCode="0372";codeStarted=millis();}bool screenPairAction(String action){if(action=="confirm")screenLinked=true;return true;}
bool syncEnabled=false;String syncError;void toggleSync(){syncEnabled=!syncEnabled;}JsonDocument friends,chat;String ssid="Home Wi-Fi",setupPassword="demo-only-password",pairCode,error;bool busy=false,portal=false,shareChat=false;PrefMock prefs;
void begin(Game&){}void poll(){}void startPortal(){portal=true;}void stopPortal(){portal=false;}void connect(String s,String p){connectedName=s;connectedPassword=p;connecting=true;}void saveChat(){}bool ask(String){return true;}bool pairAction(String){return true;}bool friendAction(String,String=""){return true;}};
struct GFXfont{};
#define U8G2_USE_LARGE_FONTS
#define U8G2_FONT_SECTION(name)
#include "../../Eumo169/src/eumo_gfx/font/u8g2_font_unifont_h_chinese4.h"
#undef U8G2_FONT_SECTION
inline String escaped(String s){String out;for(char c:s){if(c=='&')out+="&amp;";else if(c=='<')out+="&lt;";else if(c=='>')out+="&gt;";else if(c=='\"')out+="&quot;";else out+=c;}return out;}
inline String css(uint16_t c){unsigned r=((c>>11)&31)*255/31,g=((c>>5)&63)*255/63,b=(c&31)*255/31;std::ostringstream s;s<<'#'<<std::hex<<std::setw(2)<<std::setfill('0')<<r<<std::setw(2)<<g<<std::setw(2)<<b;return s.str();}
struct Arduino_DataBus{virtual ~Arduino_DataBus()=default;};struct Arduino_ESP32SPI:Arduino_DataBus{template<class...A>Arduino_ESP32SPI(A...){} };
class Arduino_GFX {public:std::ostringstream drawing;int x=0,y=0,size=1;uint16_t color=0xffff;bool unicode=false;
virtual ~Arduino_GFX()=default;bool begin(int){return true;}void setTextWrap(bool){}
void fillScreen(uint16_t c){drawing.str("");drawing.clear();drawing<<"<svg xmlns='http://www.w3.org/2000/svg' width='240' height='280' viewBox='0 0 240 280'><rect width='240' height='280' fill='"<<css(c)<<"'/>";}
void fillRect(int x,int y,int w,int h,uint16_t c){if(w>0&&h>0)drawing<<"<rect x='"<<x<<"' y='"<<y<<"' width='"<<w<<"' height='"<<h<<"' fill='"<<css(c)<<"'/>";}
void fillTriangle(int x1,int y1,int x2,int y2,int x3,int y3,uint16_t c){drawing<<"<polygon points='"<<x1<<","<<y1<<" "<<x2<<","<<y2<<" "<<x3<<","<<y3<<"' fill='"<<css(c)<<"'/>";}
void alphaRect(int x,int y,int w,int h,uint16_t c,double a){drawing<<"<rect x='"<<x<<"' y='"<<y<<"' width='"<<w<<"' height='"<<h<<"' fill='"<<css(c)<<"' opacity='"<<a<<"'/>";}
void drawCircle(int x,int y,int r,uint16_t c){drawing<<"<circle cx='"<<x<<"' cy='"<<y<<"' r='"<<r<<"' fill='none' stroke='"<<css(c)<<"'/>";}
void setCursor(int a,int b){x=a;y=b;}void setTextSize(int s){size=s;}void setTextColor(uint16_t c){color=c;}void setFont(const GFXfont*){unicode=false;}void setFont(const uint8_t*){unicode=true;}void setUTF8Print(bool u){unicode=u;}
void print(String s){drawing<<"<text x='"<<x<<"' y='"<<y+(unicode?0:8*size)<<"' font-family='Consolas,Microsoft YaHei,monospace' font-size='"<<(unicode?16:10*size)<<"' fill='"<<css(color)<<"'>"<<escaped(s)<<"</text>";if(unicode){for(unsigned char c:s)if((c&0xc0)!=0x80)x+=c<128?8:16;}else x+=s.length()*6*size;}
void flush(){}String svg(){return drawing.str()+"</svg>";}
};
class Arduino_ST7789:public Arduino_GFX {public:template<class...A>Arduino_ST7789(A...){} };
class Arduino_Canvas:public Arduino_GFX {public:template<class...A>Arduino_Canvas(A...){} };
