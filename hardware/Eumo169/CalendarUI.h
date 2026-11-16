#pragma once
// Same daySeconds allocation and demo exclusion used by the original reports.
int monthBack=0;
String reportDay;
int trendRange=7,trendPoint=6;
void trendView(){
 button(12,38,68,27,"7 days","trend7");button(86,38,68,27,"30 days","trend30");button(160,38,68,27,"Weeks","go:week");
 time_t now=time(nullptr);tm base{};localtime_r(&now,&base);base.tm_hour=12;base.tm_min=base.tm_sec=0;base.tm_isdst=-1;double values[30],peak=1200,total=0;String dates[30];
 for(int i=0;i<trendRange;i++){tm d=base;d.tm_mday-=trendRange-1-i;dates[i]=Game::day(mktime(&d));auto r=game.state["reportDays"][dates[i]];values[i]=r["seconds"].as<double>()+r["workSeconds"].as<double>();total+=values[i];peak=max(peak,values[i]);}
 label(12,74,"Total "+duration(total));for(int i=0;i<trendRange;i++){int x=14+i*210/trendRange,w=max(2,210/trendRange-2),h=values[i]*82/peak;rect(x,172-h,w,max(1,h),i==trendPoint?GOLD:GREEN);}
 label(12,183,dates[trendPoint]+"  "+duration(values[trendPoint]));button(12,206,44,28,"<","trendprev");button(62,206,116,28,"View tasks","day:"+dates[trendPoint]);button(184,206,44,28,">","trendnext");
}
void calendarView(){
 time_t now=time(nullptr);tm base{};localtime_r(&now,&base);base.tm_mday=1;base.tm_mon-=monthBack;base.tm_hour=12;base.tm_min=base.tm_sec=0;base.tm_isdst=-1;mktime(&base);
 char title[20];strftime(title,sizeof(title),"%B %Y",&base);
 button(12,38,68,26,"Earlier","monthprev");button(86,38,68,26,"Today","monthnow");button(160,38,68,26,"Later","monthnext");label(45,72,title);
 const char *names[]={"M","T","W","T","F","S","S"};for(int i=0;i<7;i++)label(24+30*i,90,names[i]);
 int offset=(base.tm_wday+6)%7;String today=Game::day(now);
 for(int n=1;n<=31;n++){tm d=base;d.tm_mday=n;time_t at=mktime(&d);if(d.tm_mon!=base.tm_mon)break;String key=Game::day(at);int col=(offset+n-1)%7,row=(offset+n-1)/7;auto r=game.state["reportDays"][key];double seconds=r["seconds"].as<double>()+r["workSeconds"].as<double>();uint32_t color=seconds>=3600?0x627E4F:seconds>=1500?0x526947:seconds>0?0x42543F:0x35423A;
  if(key<=today)button(13+30*col,104+19*row,27,17,String(n),"day:"+key,color);else label(20+30*col,109+19*row,String(n),1,0x768277);
 }
 label(12,225,"Tap a date for its tasks");
}
void dayLog(){
 if(!reportDay.length())reportDay=Game::day(time(nullptr));auto total=game.state["reportDays"][reportDay];label(12,38,reportDay);label(12,55,"Study "+duration(total["seconds"].as<double>())+" Work "+duration(total["workSeconds"].as<double>()));
 std::vector<int> indices;auto session=game.state["session"];if(game.formal(session)&&session["daySeconds"][reportDay].as<double>()>0)indices.push_back(-1);
 auto history=game.state["history"].as<JsonArrayConst>();for(int i=0;i<int(history.size());i++){auto h=history[i];if(!game.formal(h))continue;bool belongs=h["daySeconds"].size()?h["daySeconds"][reportDay].as<double>()>0:Game::day(h["at"].as<uint64_t>()/1000)==reportDay;if(belongs)indices.push_back(i);}
 navList(indices.size());if(indices.empty())wrap(12,90,"No task entries for this date. Recorded totals, if any, are retained.",35,5);
 for(int row=0;row<3;row++){int at=listPage*3+row;if(at>=int(indices.size()))break;int index=indices[at];JsonVariantConst h=index<0?game.state["session"].as<JsonVariantConst>():history[index];int y=77+row*41;String task=h["task"]|"";if(!task.length())task=h["mode"].as<String>();label(12,y,task.substring(0,fitBytes(task,210,unicodeText(task))));double seconds=h["daySeconds"][reportDay].isNull()?h["seconds"].as<double>():h["daySeconds"][reportDay].as<double>();label(12,y+19,duration(seconds)+" "+(index<0?"In progress":h["outcome"].as<String>()),1,GOLD);targets[targetCount++]={12,y,216,38,index<0?"go:focus":"history:"+String(index)};}
}
