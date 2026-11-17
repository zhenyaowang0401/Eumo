#pragma once
// Large touch targets for the 240 x 280 display. Letters and punctuation are
// selected in two taps; digits remain direct keys. No password is persisted here.
bool revealPassword=false,keyboardModes=false;
String keyboardSelection;

void resetLargeKeyboard(){keyboardPage="abc";keyboardSelection="";keyboardModes=false;revealPassword=false;}

String keyboardCharacters(){
 if(keyboardPage=="abc")return "abcdefghijklmnopqrstuvwxyz ";
 if(keyboardPage=="ABC")return "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";
 if(keyboardPage=="123")return "0123456789. ";
 return R"keys(!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~ )keys";
}

String keyboardGroup(int index){
 if(index<0||index>=8)return "";
 if(keyboardPage=="symbols")return keyboardCharacters().substring(index*4,index*4+4);
 const char *lower[]={"abc","def","ghi","jkl","mno","pqrs","tuv","wxyz"};
 const char *upper[]={"ABC","DEF","GHI","JKL","MNO","PQRS","TUV","WXYZ"};
 return keyboardPage=="ABC"?upper[index]:lower[index];
}

void keyboardKey(int x,int y,int w,int h,const String &title,const String &cmd,int size=2){
 button(x,y,w,h,"",cmd);
 if(textWidth(title,size==2?20:12)>w-8)size=1;
 label(x+(w-textWidth(title,size==2?20:12))/2,y+(h-(size==2?20:12))/2,title,size);
}

void inputKeyboard(){
 targetCount=0;screen->fillScreen(rgb(BG));bool password=inputPurpose=="password";
 keyboardKey(12,4,44,40,"<","keyboardBack");
 label(63,8,password?"Password":"Enter text");
 String subtitle=keyboardModes?"Choose keys":keyboardSelection.length()?"Choose a character":keyboardPage=="123"?"Numbers":keyboardPage=="symbols"?"Symbols":keyboardPage=="ABC"?"Capital letters":"Lowercase letters";
 label(63,27,subtitle.substring(0,fitBytes(subtitle,114,false)));
 if(password)button(184,4,44,40,revealPassword?"Hide":"Show","showPassword");
 rect(12,52,216,22,0x40514C);String value=input;
 if(password&&!revealPassword){value="";for(unsigned i=0;i<input.length();i++)value+="*";}
 while(value.length()&&textWidth(value)>200)value=value.substring(glyphBytes(uint8_t(value[0])));
 label(18,57,value.length()?value:"Tap keys below");

 if(keyboardModes){
  const char *titles[]={"abc","ABC","123","!@#"};
  const char *modes[]={"abc","ABC","123","symbols"};
  for(int i=0;i<4;i++)keyboardKey(12+(i%2)*112,80+(i/2)*72,104,64,titles[i],"keyboardMode:"+String(modes[i]));
 }else if(keyboardSelection.length()){
  for(unsigned i=0;i<keyboardSelection.length();i++){
   String ch=keyboardSelection.substring(i,i+1);
   keyboardKey(12+(i%2)*112,80+(i/2)*72,104,64,ch==" "?"Space":ch,"char:"+ch);
  }
 }else if(keyboardPage=="123"){
  // Four columns keep every digit available without another selection step.
  const String digits="123456789.0 ";
  for(unsigned i=0;i<digits.length();i++){
   String ch=digits.substring(i,i+1);
   keyboardKey(12+(i%4)*56,80+(i/4)*48,48,44,ch==" "?"SP":ch,"char:"+ch);
  }
 }else{
  for(int i=0;i<8;i++)keyboardKey(12+(i%3)*74,80+(i/3)*48,68,44,keyboardGroup(i),"keyboardGroup:"+String(i));
  keyboardKey(160,176,68,44,"Space","char: ",1);
 }
 button(12,228,68,44,keyboardModes||keyboardSelection.length()?"Back":"Keys",keyboardModes||keyboardSelection.length()?"keyboardBack":"keys");
 button(86,228,68,44,"Delete","delete");
 if(password&&input.length()==0){
  rect(160,228,68,44,0x40514C);label(182,244,"Join",1,0x9BA69D);
 }else button(160,228,68,44,password?"Join":"Done","inputdone");
 flushScreen();
}

// Call before legacy dispatch. Nonblank inputdone deliberately falls through:
// existing code owns Wi-Fi connection and saves credentials only on success.
bool handleLargeKeyboardCommand(const String &cmd){
 if(page!="keyboard")return false;
 if(cmd=="showPassword"){revealPassword=!revealPassword;return true;}
 if(cmd=="keys"){keyboardModes=true;keyboardSelection="";return true;}
 if(cmd.startsWith("keyboardMode:")){
  String mode=cmd.substring(13);
  if(mode=="abc"||mode=="ABC"||mode=="123"||mode=="symbols"){keyboardPage=mode;keyboardModes=false;keyboardSelection="";}
  return true;
 }
 if(cmd.startsWith("keyboardGroup:")){
  if(keyboardPage=="abc"||keyboardPage=="ABC"||keyboardPage=="symbols")keyboardSelection=keyboardGroup(cmd.substring(14).toInt());
  return true;
 }
 if(cmd=="keyboardBack"){
  if(keyboardModes||keyboardSelection.length()){keyboardModes=false;keyboardSelection="";}
  else {page=backPage;input="";resetLargeKeyboard();}
  return true;
 }
 if(cmd=="cancelinput"){page=backPage;input="";resetLargeKeyboard();return true;}
 if(cmd.startsWith("char:")){
  String ch=cmd.substring(5);unsigned limit=inputPurpose=="password"?63:200;
  if(ch.length()==1&&uint8_t(ch[0])>=32&&uint8_t(ch[0])<=126&&input.length()<limit)input+=ch;
  keyboardSelection="";return true;
 }
 if(cmd=="delete"){
  if(input.length()){int n=input.length()-1;while(n>0&&(uint8_t(input[n])&0xc0)==0x80)n--;input.remove(n);}
  return true;
 }
 if(cmd=="inputdone"){
  if(inputPurpose=="password"&&input.length()==0)return true;
  keyboardSelection="";keyboardModes=false;revealPassword=false;
 }
 return false;
}
