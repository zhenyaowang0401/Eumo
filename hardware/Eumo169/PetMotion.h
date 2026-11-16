#pragma once
// app.js pet() and pixel-art.js jump()/playerMole(), original commit in SOURCE.json.
uint32_t jumpStarted=0,spinStarted=0,tapTimes[3]={};
unsigned tapCount=0;
bool jumping=false,spinning=false;
void clearPetMotion(){jumping=false;spinning=false;tapCount=0;}
void tapMole(){
 if(game.active())return;
 uint32_t now=millis();if(spinning&&uint32_t(now-spinStarted)<1400)return;
 unsigned kept=0;for(unsigned i=0;i<tapCount;i++)if(uint32_t(now-tapTimes[i])<=1100)tapTimes[kept++]=tapTimes[i];
 tapCount=kept;tapTimes[tapCount++]=now;bool spin=tapCount>=3;
 if(!spin&&jumping&&uint32_t(now-jumpStarted)<1000)return;
 idleSince=now;jumpStarted=now;jumping=true;spinning=spin;
 if(spin){spinStarted=now;tapCount=0;}petUntil=now+(spin?1400:1100);
}
int petLift(){
 if(game.active()){clearPetMotion();return 0;}
 if(!jumping)return 0;
 uint32_t elapsed=millis()-jumpStarted;unsigned duration=spinning?1200:850;
 if(elapsed>=(spinning?1400u:1100u)){jumping=false;spinning=false;return 0;}
 if(elapsed>=duration)return 0;
 return min(spinning?20:18,int(lround(sin(elapsed*3.141592653589793/duration)*(spinning?28:18))));
}
double petAngle(){if(!spinning||game.active())return 0;double p=min(1.0,double(uint32_t(millis()-spinStarted))/1200);return 6.283185307179586*(1-(1-p)*(1-p));}
