#pragma once
// Host harness: use the actual Game.h and ArduinoJson with deterministic clocks.
#include <string>
#include <sstream>
#include <fstream>
#include <filesystem>
#include <algorithm>
#include <cmath>
#include <ctime>
#include <cstdint>
#include <ArduinoJson.h>
using std::min;using std::max;using std::round;using std::isfinite;
constexpr int HEX=16;
class String:public std::string {
public:
 using std::string::string;
 String(const std::string &s):std::string(s){}
 String(unsigned long long n):std::string(std::to_string(n)){}
 String(unsigned n,int base=10){std::ostringstream s;if(base==16)s<<std::hex;s<<n;assign(s.str());}
 String(int n):std::string(std::to_string(n)){}
 String(double n,int precision){std::ostringstream s;s.setf(std::ios::fixed);s.precision(precision);s<<n;assign(s.str());}
 String(char c):std::string(1,c){}
 bool startsWith(const String &s)const{return rfind(s,0)==0;}
 String substring(size_t start)const{return substr(std::min(start,size()));}
 String substring(size_t start,size_t end)const{return substr(std::min(start,size()),end>start?end-start:0);}
 int indexOf(char c,size_t from=0)const{auto n=find(c,from);return n==npos?-1:int(n);}
 int lastIndexOf(char c,size_t from=npos)const{auto n=rfind(c,from);return n==npos?-1:int(n);}
 int toInt()const{return std::atoi(c_str());}
 void remove(size_t i){if(i<size())erase(i);}
 void trim(){auto first=find_first_not_of(" \t\r\n");if(first==npos){clear();return;}assign(substr(first,find_last_not_of(" \t\r\n")-first+1));}
 size_t write(uint8_t c){push_back(char(c));return 1;}
 size_t write(const uint8_t *p,size_t n){append(reinterpret_cast<const char*>(p),n);return n;}
};
inline void convertToJson(const String &s,JsonVariant d){d.set(static_cast<const std::string&>(s));}
inline void convertFromJson(JsonVariantConst s,String &d){d=s.as<std::string>();}
inline bool canConvertFromJson(JsonVariantConst s,const String &){return s.is<const char*>();}
inline uint32_t testMillis=0;
inline uint64_t testEpoch=1794398400000ULL;
inline uint32_t millis(){return testMillis;}
inline uint32_t esp_random(){return 1234567;}
inline time_t fakeTime(time_t *out){time_t v=testEpoch/1000;if(out)*out=v;return v;}
inline tm *localtime_r(const time_t *v,tm *out){localtime_s(out,v);return out;}
inline int gettimeofday(timeval *v,void *){v->tv_sec=testEpoch/1000;v->tv_usec=(testEpoch%1000)*1000;return 0;}
class File {
 std::shared_ptr<std::fstream> stream;
 std::string path;
public:
 File()=default;
 File(std::string p,bool write):path(p){stream=std::make_shared<std::fstream>(p,write?std::ios::out|std::ios::binary|std::ios::trunc:std::ios::in|std::ios::binary);}
 operator bool()const{return stream&&stream->is_open();}
 size_t size()const{return std::filesystem::exists(path)?std::filesystem::file_size(path):0;}
 int read(){return stream->get();}
 size_t readBytes(char *p,size_t n){stream->read(p,n);return stream->gcount();}
 size_t write(uint8_t c){stream->put(c);return stream->good()?1:0;}
 size_t write(const uint8_t *p,size_t n){stream->write(reinterpret_cast<const char*>(p),n);return stream->good()?n:0;}
 void flush(){stream->flush();}void close(){if(stream)stream->close();}
};
struct FakeFat {
 std::string root="test-storage";bool fail=false;
 bool begin(bool=false,const char* ="/ffat",uint8_t=3){std::filesystem::create_directories(root);return true;}
 File open(const char *p,const char *mode){return fail?File():File(root+p,*mode=='w');}
 bool exists(const char *p){return std::filesystem::exists(root+p);}
 bool remove(const char *p){return std::filesystem::remove(root+p);}
 bool rename(const char *a,const char *b){std::error_code e;std::filesystem::rename(root+a,root+b,e);return !e;}
} inline FFat;
#define time fakeTime
