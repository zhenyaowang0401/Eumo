#pragma once
// Direct native port of original-site/terrain.js. Coordinates remain world-space.
struct Stratum {int from;uint32_t soil[3],stone[2],moss;};
const Stratum STRATA[]={
 {0,{0x9b875d,0xab9669,0x8c7955},{0xc5b180,0x7d6c4a},0x93a55c},
 {240,{0x949c8b,0xa6ac98,0x838e80},{0xbdc2a8,0x738074},0xa1b29e},
 {300,{0xd5b590,0xe3c8a4,0xc7a783},{0xf2dfbb,0xb79b78},0xb0b38a},
 {360,{0x6e7f9d,0x7c8da7,0x62738f},{0xa1b7c6,0x53667f},0x8db8ac},
 {480,{0xa47c8a,0xb68d98,0x926f81},{0xdbc1b4,0x806472},0xbba496},
 {600,{0x77648f,0x86749f,0x695a82},{0xcfbbdf,0x9ed6d6},0xa4c5bd},
 {720,{0x484459,0x555168,0x3d3d52},{0x817e96,0xd6a78c},0x99b5b1}
};
int layerAt(double depth){int n=0;for(int i=1;i<7;i++)if(depth>=STRATA[i].from)n=i;return n;}
double terrainRandom(double a,double b){double z=sin(a*127.1+b*311.7)*43758.5453;return z-floor(z);}
void terrainBox(int x,int y,int w,int h,uint32_t c){rect(x-72,y,w,h,c);}
void paintTerrain(int camera,unsigned frame,double progress){
 auto box=terrainBox;auto rnd=terrainRandom;
 int first=max(0,int(floor((camera-87)/16.0))),last=int(ceil((camera+280-87)/16.0));
 for(int row=first;row<last;row++)for(int col=0;col<24;col++){
  int wy=87+row*16,y=wy-camera,x=col*16;double depth=(wy-87)/6.0,r=rnd(col,row),revealed=min(depth,progress);int index=layerAt(revealed);
  int id=index>0&&revealed<STRATA[index].from+2&&rnd(col+41,row)<.3?index-1:index;const auto &layer=STRATA[id];
  const uint32_t darkRoots[]={0x8d805c,0xa08d65,0x7e7053};const uint32_t *soil=id==0&&depth>=120?darkRoots:layer.soil;
  int patch=int(rnd(floor(col/3.0),floor(row/3.0))*3);box(x,y,16,16,soil[patch]);
  if(r>.55){int offset=int(rnd(col+3,row+7)*4)*2;box(x+offset,y+2,12,4,soil[(patch+1)%3]);box(x+offset+2,y+6,8,2,soil[(patch+1)%3]);}
  if(id==2){int sy=y+5+int(r*3);box(x,sy,8,1,layer.stone[1]);box(x+8,sy+1,8,1,layer.stone[1]);for(int k=0;k<4;k++)box(x+int(rnd(col+k,row+13)*14),y+int(rnd(col+k+7,row)*14),1+k%2,1,layer.stone[k%2]);}
  else if(id==1&&r<.28){int sx=x+2,sy=y+4;box(sx+2,sy,7,2,soil[1]);box(sx,sy+2,11,4,soil[1]);box(sx+2,sy+6,8,2,soil[1]);box(sx+3,sy+1,4,1,layer.stone[0]);if(r<.08)box(sx+6,sy+4,2,1,layer.stone[1]);}
  else if(id==3&&r<.4){box(x,y+4,11,1,layer.stone[1]);box(x+5,y+6,9,1,layer.stone[0]);box(x+4,y+10,10,1,layer.stone[1]);}
  else if(id==4){for(int k=0;k<2;k++)box(x+int(rnd(col+k,row+19)*14),y+int(rnd(col+k+31,row)*14),2,2,layer.stone[k%2]);}
  else if(id==6){if(r<.5){box(x+4,y,1,12,layer.stone[0]);box(x+5,y+12,7,1,layer.stone[0]);box(x+11,y+13,1,3,layer.stone[0]);}if(r>.94)box(x+8,y+5,3,2,layer.stone[1]);}
  else if(id==0&&r<.25){box(x+3,y+5,3,2,soil[1]);box(x+9,y+11,2,1,soil[2]);}
  if(id==5&&r>.81){box(x+4,y+3,3,10,layer.stone[0]);box(x+7,y+7,4,6,layer.stone[1]);box(x+5,y+2,1,3,0xe8d8ed);box(x+10,y+5,2,6,layer.stone[0]);}
  if(id==0&&r>.8){box(x+2,y+3,3,8,layer.moss);box(x+5,y+7,4,2,0xa6bb66);}
  if(depth<38&&r>.91&&r<.918){int n=frame/20%2;for(int k=0;k<5;k++)box(x+2+k*2,y+8+(k%2?1:-1)+n,3,2,0xc58b8c);box(x+11,y+7+n,2,2,0xe6b0a3);}
  if(depth<80&&r>.935&&r<.94){int n=frame/30%2;box(x+5,y+7+n,6,4,0x35463f);box(x+6,y+7+n,3,2,0xb6a178);box(x+3,y+6+n,2,1,0x35463f);box(x+11,y+11+n,2,1,0x35463f);}
 }
 for(int vine=0;vine<10;vine++){int base=12+vine*40,length=35+int(rnd(vine,51)*62);for(int d=0;d<length;d+=4){int x=base+int(lround(sin(d*.065+vine)*3))*2,y=87+d-camera;if(y<-8||y>280)continue;box(x,y,2,5,0x638345);if(d%12==0){int side=vine%2?1:-1;box(x+side*2,y+2,5,2,0x88a852);box(x+side*4,y,3,2,0xa4b965);}}}
 for(int root=0;root<7;root++){int base=30+root*54,length=55+int(rnd(root,12)*145);for(int wy=87;wy<87+length;wy+=5){int d=wy-87,x=base+int(lround(sin(d*.035+root)*5))*2,y=wy-camera;if(y<-8||y>280)continue;box(x,y,root%2?3:4,6,0x66503f);box(x,y,1,5,0xb18c66);if(d%25==0){int dir=root%2?1:-1;box(x+dir*3,y+3,7,2,0x66503f);box(x+dir*8,y+5,2,6,0x66503f);}}}
}
