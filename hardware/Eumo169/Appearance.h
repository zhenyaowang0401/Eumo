#pragma once
// Original WorldClock periods and palette. Uses the device's configured local timezone.
struct SkyPalette {uint32_t sky,grass,sun,skyLow,cloud,cloudBack,mountain,grassShadow;bool night;};
SkyPalette skyPalette(){
 String choice=game.state["_deviceStorage"]["eumo-appearance"]|"auto";time_t now=time(nullptr);tm t{};localtime_r(&now,&t);int hour=t.tm_hour;
 if(choice=="auto")choice=hour>=6&&hour<10?"morning":hour>=10&&hour<17?"day":hour>=17&&hour<19?"evening":"night";
 if(choice=="morning")return {0xb5d4cd,0xa6b954,0xf1c85c,0xe5e5b9,0xfff3d6,0xd6e3c7,0x8da373,0x617c41,false};if(choice=="day")return {0x88bdca,0x9fb94e,0xf7ce58,0xc8dfce,0xfff8df,0xd9e7d8,0x789a6d,0x587747,false};if(choice=="evening")return {0x557d80,0x8e9c54,0xe8b368,0xbec29d,0xdac8a0,0x91aa95,0x496e5b,0x405d48,false};return {0x526e91,0x9eafb4,0xf3e8ce,0xa7bdcf,0xe4e8e8,0xbccddd,0x617f98,0x627d91,true};
}
