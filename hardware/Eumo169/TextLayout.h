#pragma once
// Strict UTF-8 decoding: never pass a supplementary code point to the
// display library's 16-bit Unicode decoder (emoji could become a CJK glyph).
uint32_t nextCodePoint(const String &s,int &at){
 uint8_t first=uint8_t(s[at++]);if(first<128)return first;
 int n=first>=0xc2&&first<=0xdf?1:first>=0xe0&&first<=0xef?2:first>=0xf0&&first<=0xf4?3:0;
 if(!n)return 0xfffd;uint32_t cp=first&((1u<<(6-n))-1);int end=at+n;
 if(end>int(s.length()))return 0xfffd;
 for(int i=at;i<end;i++){uint8_t c=s[i];if((c&0xc0)!=0x80)return 0xfffd;cp=(cp<<6)|(c&63);}
 at=end;if(cp<(n==1?0x80u:n==2?0x800u:0x10000u)||cp>0x10ffff||(cp>=0xd800&&cp<=0xdfff))return 0xfffd;return cp;
}
bool containsChinese(const String &s){for(int i=0;i<int(s.length());){auto cp=nextCodePoint(s,i);if(cp>=0x3400&&cp<=0x9fff)return true;}return false;}
String displayText(const String &s){
 String out;bool emoji=false;
 for(int i=0;i<int(s.length());){int start=i;uint32_t cp=nextCodePoint(s,i);
  if(cp==0xfe0f||cp==0xfe0e||cp==0x200d)continue;
  if(cp>0xffff){if(!emoji)out+="[emoji]";emoji=true;continue;}emoji=false;
  if(cp==0xfffd){out+='?';continue;}
  if(cp==0x2018||cp==0x2019){out+='\'';continue;}
  if(cp==0x201c||cp==0x201d){out+='"';continue;}
  if(cp==0x2013||cp==0x2014){out+='-';continue;}
  if(cp==0x2026){out+="...";continue;}
  if(cp==0xa0||cp=='\t'){out+=' ';continue;}
  if(cp=='\r'||(cp<32&&cp!='\n')||cp==127)continue;
  out+=s.substring(start,i);
 }
 return out;
}
int chatTextWidth(const String &text){int width=0;for(int at=0;at<int(text.length());)width+=nextCodePoint(text,at)>255?16:8;return width;}
// Stream lines rather than allocating an unbounded copy of the chat history.
template<class Emit>void eachTextLine(const String &raw,int pixels,Emit emit){
 String text=displayText(raw);int start=0;
 while(start<int(text.length())){
  int end=start,width=0,space=-1;bool newline=false;
  while(end<int(text.length())){int next=end;uint32_t cp=nextCodePoint(text,next);if(cp=='\n'){newline=true;break;}int w=cp>255?16:8;if(width+w>pixels)break;if(cp==' ')space=end;width+=w;end=next;}
  int next=end;if(newline)next=end+1;
  else if(end<int(text.length())&&space>start){end=space;next=space+1;}
  if(end==start&&!newline){next=start;nextCodePoint(text,next);end=next;}
  String line=text.substring(start,end);while(line.length()&&line[line.length()-1]==' ')line.remove(line.length()-1);emit(line);
  start=next;while(start<int(text.length())&&text[start]==' ')start++;
 }
}
