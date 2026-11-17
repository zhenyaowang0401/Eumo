#pragma once
#include "StartupArt.h"
// Website timing: mark rises in five steps over 200 ms, leaves at 1200 ms
// with a 240 ms ease-out. This overlay never stops the game/network loop.
bool startupShown=false;uint32_t startupAt=0;
bool startupActive(){return startupShown&&uint32_t(millis()-startupAt)<1440;}
void startupBegin(){startupShown=true;startupAt=millis();}
uint32_t startupRGB(uint16_t c){return (((c>>11)*255/31)<<16)|((((c>>5)&63)*255/63)<<8)|((c&31)*255/31);}
void startupBitmap(const uint16_t *data,const uint8_t *mask,int x,int y,int w,int h,double opacity){
 for(int yy=0;yy<h;yy++)for(int xx=0;xx<w;){
  int at=yy*w+xx,run=1;uint16_t color=data[at];uint8_t a=mask?mask[at]:255;
  while(xx+run<w&&data[at+run]==color&&(!mask||mask[at+run]==a))run++;
  if(a){if(a==255&&opacity>=1)screen->fillRect(x+xx,y+yy,run,1,color);
   else alphaRect(x+xx,y+yy,run,1,startupRGB(color),opacity*a/255.0);}
  xx+=run;
 }
}
double startupFade(double x){
 // CSS ease-out = cubic-bezier(0,0,.58,1). Invert its x coordinate.
 double lo=0,hi=1;for(int i=0;i<12;i++){double t=(lo+hi)/2,u=1-t;if(3*u*t*t*.58+t*t*t<x)lo=t;else hi=t;}
 double t=(lo+hi)/2;return 3*(1-t)*t*t+t*t*t;
}
void drawStartupOverlay(){
 if(!startupActive())return;
 uint32_t age=millis()-startupAt;double opacity=age<1200?1:1-startupFade((age-1200)/240.0);
 startupBitmap(STARTUP_BACKGROUND,nullptr,0,0,240,280,opacity);
 double step=min(uint32_t(5),uint32_t(age/40))/5.0;
 startupBitmap(STARTUP_LOGO,STARTUP_ALPHA,14,88+int(lround(6*(1-step))),212,104,opacity*(.3+.7*step));
}
void flushScreen(){drawStartupOverlay();screen->flush();}
