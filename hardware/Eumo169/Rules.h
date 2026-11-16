#pragma once
#include <stdint.h>
// Port of journey.js / treasures.js. Integer milliseconds avoid rounding drift.
namespace Rules {
constexpr uint32_t hash(const char *s){uint32_t n=2166136261u;while(*s)n=(n^uint8_t(*s++))*16777619u;return n;}
constexpr uint32_t rareHash(const char *s){uint32_t n=hash(s);n^=n>>16;n*=0x7feb352du;n^=n>>15;n*=0x846ca68bu;return n^(n>>16);}
constexpr uint32_t crossed(uint64_t base,uint64_t elapsed,uint32_t step){return (base+elapsed)/step-base/step;}
constexpr double depth(uint64_t elapsed,bool eligible,bool demo){return eligible?double(elapsed)/(demo?3000:30000):0;}
constexpr uint32_t stars(uint64_t base,uint64_t elapsed,bool eligible,bool demo){return !eligible?0:demo?(elapsed>=15000):crossed(base,elapsed,300000);}
constexpr bool golden(uint32_t h){return double(h)/4294967296.0<.03;}
static_assert(crossed(299000,1000,300000)==1,"carry rewards between sessions");
static_assert(stars(0,15000,true,true)==1,"demo star");
static_assert(depth(60000,true,false)==2,"original digging rate");
static_assert(stars(0,900000,false,false)==0,"break earns no rewards");
}
